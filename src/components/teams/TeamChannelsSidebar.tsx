import { useState } from 'react';
import { useTeamChannels, TeamChannel, useVoiceChannel } from '@/hooks/useTeamChannels';
import { Team } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Hash,
  Volume2,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Trash2,
  Loader2,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamChannelsSidebarProps {
  team: Team;
  selectedChannel: TeamChannel | null;
  onSelectChannel: (channel: TeamChannel) => void;
  canManage: boolean;
}

export function TeamChannelsSidebar({
  team,
  selectedChannel,
  onSelectChannel,
  canManage,
}: TeamChannelsSidebarProps) {
  const { groupedChannels, loading, createChannel, deleteChannel } = useTeamChannels(team.id);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['General']));
  const [createOpen, setCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [newChannelCategory, setNewChannelCategory] = useState('General');
  const [creating, setCreating] = useState(false);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreating(true);
    
    const channel = await createChannel(
      newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      newChannelType,
      newChannelCategory
    );
    
    setCreating(false);
    if (channel) {
      setCreateOpen(false);
      setNewChannelName('');
      setNewChannelType('text');
      // Expand the category if not already
      setExpandedCategories((prev) => new Set([...prev, newChannelCategory]));
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    await deleteChannel(channelId);
    if (selectedChannel?.id === channelId) {
      onSelectChannel(null as any);
    }
  };

  const existingCategories = Object.keys(groupedChannels);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Team Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {team.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold truncate">{team.name}</span>
        </div>
        {canManage && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
                <DialogDescription>
                  Add a new text or voice channel to your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Channel Type</Label>
                  <Select
                    value={newChannelType}
                    onValueChange={(v) => setNewChannelType(v as 'text' | 'voice')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4" />
                          Text Channel
                        </div>
                      </SelectItem>
                      <SelectItem value="voice">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          Voice Channel
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel Name</Label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="channel-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newChannelCategory} onValueChange={setNewChannelCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateChannel}
                  disabled={creating || !newChannelName.trim()}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Channel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Channels List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {Object.entries(groupedChannels).map(([category, channels]) => (
            <div key={category}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-1 w-full px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {category}
              </button>

              {/* Channels */}
              {expandedCategories.has(category) && (
                <div className="ml-2 space-y-0.5">
                  {channels.map((channel) => (
                    <ChannelItem
                      key={channel.id}
                      channel={channel}
                      isSelected={selectedChannel?.id === channel.id}
                      onSelect={() => onSelectChannel(channel)}
                      onDelete={canManage ? () => handleDeleteChannel(channel.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {Object.keys(groupedChannels).length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No channels yet</p>
              {canManage && (
                <p className="text-xs mt-1">Click + to create one</p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ChannelItemProps {
  channel: TeamChannel;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

function ChannelItem({ channel, isSelected, onSelect, onDelete }: ChannelItemProps) {
  const { participants } = useVoiceChannel(channel.type === 'voice' ? channel.id : null);

  return (
    <div className="group relative">
      <button
        onClick={onSelect}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
          'hover:bg-muted/50',
          isSelected && 'bg-muted text-foreground'
        )}
      >
        {channel.type === 'text' ? (
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <span className="truncate">{channel.name}</span>
        
        {/* Show participant count for voice channels */}
        {channel.type === 'voice' && participants.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {participants.length}
          </span>
        )}
      </button>

      {/* Voice channel participants preview */}
      {channel.type === 'voice' && participants.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {participants.slice(0, 5).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={p.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(p.profile?.full_name || p.profile?.username || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {p.profile?.full_name || p.profile?.username || 'User'}
              </span>
            </div>
          ))}
          {participants.length > 5 && (
            <p className="px-2 text-xs text-muted-foreground">
              +{participants.length - 5} more
            </p>
          )}
        </div>
      )}

      {onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-[calc(50%-2px)] -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
