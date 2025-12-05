import { useState } from 'react';
import { useTeams, Team } from '@/hooks/useTeams';
import { useFriends, Friend } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, UserPlus, Loader2, Check, MessageCircle, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { TeamChat } from '@/components/teams/TeamChat';

const Teams = () => {
  const { teams, loading, createTeam, addMember } = useTeams();
  const { friends, loading: friendsLoading } = useFriends();
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [memberUsername, setMemberUsername] = useState('');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    
    const team = await createTeam(teamName, teamDescription);
    
    // Add selected friends as members
    if (team && selectedFriends.size > 0) {
      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.id === friendId);
        if (friend?.username) {
          await addMember(team.id, friend.username);
        }
      }
    }
    
    setCreating(false);
    setCreateOpen(false);
    setTeamName('');
    setTeamDescription('');
    setSelectedFriends(new Set());
  };

  const handleAddMember = async () => {
    if (!memberUsername.trim() || !selectedTeamId) return;
    setAdding(true);
    await addMember(selectedTeamId, memberUsername);
    setAdding(false);
    setAddMemberOpen(false);
    setMemberUsername('');
  };

  const getInitials = (friend: Friend) => {
    if (friend.full_name) {
      return friend.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (friend.username) {
      return friend.username.slice(0, 2).toUpperCase();
    }
    return friend.email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show team chat view when a team is selected
  if (selectedTeam) {
    return (
      <div className="flex h-full">
        {/* Sidebar - hidden on mobile when in chat */}
        <div className="hidden md:flex md:w-80 lg:w-96 border-r flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Teams</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                    'hover:bg-muted/50',
                    selectedTeam?.id === team.id && 'bg-primary/10'
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {team.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <TeamChat team={selectedTeam} onBack={() => setSelectedTeam(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Teams</h2>
          <p className="text-sm md:text-base text-muted-foreground">Manage your teams and collaborate</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setTeamName('');
            setTeamDescription('');
            setSelectedFriends(new Set());
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Create a team and add members</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Enter team description"
                  rows={2}
                />
              </div>
              
              {/* Friends Selection */}
              <div className="space-y-2">
                <Label>Add Members</Label>
                {friendsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No friends to add. Add friends in Chat first.</p>
                ) : (
                  <ScrollArea className="h-[180px] border rounded-lg">
                    <div className="p-2 space-y-1">
                      {friends.map((friend) => {
                        const isSelected = selectedFriends.has(friend.id);
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => toggleFriend(friend.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                              'hover:bg-muted/50',
                              isSelected && 'bg-primary/10 hover:bg-primary/15'
                            )}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friend.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(friend)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-medium truncate">
                                {friend.full_name || friend.username || friend.email}
                              </p>
                              {friend.username && (
                                <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                              )}
                            </div>
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'border-muted-foreground/30'
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                {selectedFriends.size > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedFriends.size} member{selectedFriends.size > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()}>
                {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {teams.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center space-y-2">
              <Users className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">No teams yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first team to start collaborating
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card 
                key={team.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedTeam(team)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {team.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                      </CardDescription>
                    </div>
                    <MessageCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {team.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {team.user_role}
                    </span>
                    {(team.user_role === 'owner' || team.user_role === 'admin') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeamId(team.id);
                          setAddMemberOpen(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Enter the username to add to the team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="@username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={adding || !memberUsername.trim()}>
              {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;
