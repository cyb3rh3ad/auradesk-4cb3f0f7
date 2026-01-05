import { useState, useEffect } from 'react';
import { 
  UserX, 
  Flag, 
  UserMinus, 
  Edit3, 
  ShieldOff,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useChatActions } from '@/hooks/useChatActions';

interface ChatOptionsMenuProps {
  children: React.ReactNode;
  targetUserId: string;
  targetUserName: string;
  onActionComplete?: () => void;
}

type DialogType = 'nickname' | 'report' | 'block' | 'unfriend' | null;

const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'threats', label: 'Threats or violence' },
  { value: 'other', label: 'Other' },
];

export const ChatOptionsMenu = ({ 
  children, 
  targetUserId, 
  targetUserName,
  onActionComplete 
}: ChatOptionsMenuProps) => {
  const { 
    blockUser, 
    unblockUser, 
    reportUser, 
    unfriend, 
    setNickname, 
    removeNickname,
    getNickname,
    isUserBlocked,
    loading 
  } = useChatActions();

  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [nickname, setNicknameValue] = useState('');
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    const loadUserState = async () => {
      const [blocked, existingNickname] = await Promise.all([
        isUserBlocked(targetUserId),
        getNickname(targetUserId)
      ]);
      setIsBlocked(blocked);
      setCurrentNickname(existingNickname);
    };
    loadUserState();
  }, [targetUserId]);

  const handleBlock = async () => {
    const success = await blockUser(targetUserId);
    if (success) {
      setIsBlocked(true);
      setOpenDialog(null);
      onActionComplete?.();
    }
  };

  const handleUnblock = async () => {
    const success = await unblockUser(targetUserId);
    if (success) {
      setIsBlocked(false);
    }
  };

  const handleUnfriend = async () => {
    const success = await unfriend(targetUserId);
    if (success) {
      setOpenDialog(null);
      onActionComplete?.();
    }
  };

  const handleSetNickname = async () => {
    if (nickname.trim()) {
      const success = await setNickname(targetUserId, nickname.trim());
      if (success) {
        setCurrentNickname(nickname.trim());
        setOpenDialog(null);
      }
    }
  };

  const handleRemoveNickname = async () => {
    const success = await removeNickname(targetUserId);
    if (success) {
      setCurrentNickname(null);
      setNicknameValue('');
      setOpenDialog(null);
    }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    const success = await reportUser(targetUserId, reportReason, reportDetails);
    if (success) {
      setReportReason('');
      setReportDetails('');
      setOpenDialog(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => {
              setNicknameValue(currentNickname || '');
              setOpenDialog('nickname');
            }}
            className="py-2.5"
          >
            <Edit3 className="w-4 h-4 mr-3" />
            {currentNickname ? 'Edit nickname' : 'Set nickname'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {isBlocked ? (
            <DropdownMenuItem onClick={handleUnblock} className="py-2.5">
              <ShieldOff className="w-4 h-4 mr-3" />
              Unblock user
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => setOpenDialog('block')}
              className="py-2.5 text-orange-500 focus:text-orange-500"
            >
              <UserX className="w-4 h-4 mr-3" />
              Block user
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem 
            onClick={() => setOpenDialog('report')}
            className="py-2.5 text-yellow-500 focus:text-yellow-500"
          >
            <Flag className="w-4 h-4 mr-3" />
            Report user
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setOpenDialog('unfriend')}
            className="py-2.5 text-destructive focus:text-destructive"
          >
            <UserMinus className="w-4 h-4 mr-3" />
            Remove friend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Nickname Dialog */}
      <Dialog open={openDialog === 'nickname'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set nickname for {targetUserName}</DialogTitle>
            <DialogDescription>
              Give this person a custom name that only you will see.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNicknameValue(e.target.value)}
                placeholder="Enter a nickname"
                maxLength={50}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {currentNickname && (
              <Button variant="outline" onClick={handleRemoveNickname} disabled={loading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button onClick={handleSetNickname} disabled={loading || !nickname.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={openDialog === 'report'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-yellow-500" />
              Report {targetUserName}
            </DialogTitle>
            <DialogDescription>
              Help us understand what's happening. Your report is confidential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for report</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context about what happened..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReport} 
              disabled={loading || !reportReason}
              variant="destructive"
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <Dialog open={openDialog === 'block'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Block {targetUserName}?
            </DialogTitle>
            <DialogDescription>
              They won't be able to send you messages or see your online status. You can unblock them anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleBlock} disabled={loading} variant="destructive">
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfriend Confirmation Dialog */}
      <Dialog open={openDialog === 'unfriend'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-destructive" />
              Remove {targetUserName}?
            </DialogTitle>
            <DialogDescription>
              You'll no longer be friends. You can add them back later if you change your mind.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleUnfriend} disabled={loading} variant="destructive">
              Remove Friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};