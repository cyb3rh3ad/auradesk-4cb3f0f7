import { useState, useEffect } from 'react';
import { 
  UserX, 
  Flag, 
  UserMinus, 
  Edit3, 
  ShieldOff,
  AlertTriangle,
  Trash2,
  BellOff,
  Check,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useChatActions } from '@/hooks/useChatActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  const isMobile = useIsMobile();
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

  const [menuOpen, setMenuOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const [nickname, setNicknameValue] = useState('');
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reasonSelectorOpen, setReasonSelectorOpen] = useState(false);

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
      setMenuOpen(false);
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

  const openDialogAction = (type: DialogType) => {
    setMenuOpen(false);
    setOpenDialog(type);
  };

  const menuItems = [
    {
      icon: Edit3,
      label: currentNickname ? 'Edit nickname' : 'Set nickname',
      onClick: () => {
        setNicknameValue(currentNickname || '');
        openDialogAction('nickname');
      },
    },
    {
      icon: BellOff,
      label: 'Mute conversation',
      onClick: () => setMenuOpen(false),
    },
    {
      icon: UserMinus,
      label: 'Remove friend',
      onClick: () => openDialogAction('unfriend'),
      className: 'text-destructive',
    },
    {
      icon: Flag,
      label: 'Report user',
      onClick: () => openDialogAction('report'),
      className: 'text-yellow-500',
    },
    isBlocked ? {
      icon: ShieldOff,
      label: 'Unblock user',
      onClick: handleUnblock,
    } : {
      icon: UserX,
      label: 'Block user',
      onClick: () => openDialogAction('block'),
      className: 'text-orange-500',
    },
  ];

  const selectedReasonLabel = REPORT_REASONS.find(r => r.value === reportReason)?.label || 'Select a reason';

  return (
    <>
      {/* Mobile: Use Drawer for menu */}
      {isMobile ? (
        <>
          <div onClick={() => setMenuOpen(true)}>
            {children}
          </div>
          <Drawer open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerContent>
              <DrawerHeader className="border-b border-border">
                <DrawerTitle>Options for {targetUserName}</DrawerTitle>
              </DrawerHeader>
              <div className="py-2">
                {menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                      "hover:bg-accent/50 active:bg-accent",
                      item.className
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-base">{item.label}</span>
                  </button>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            {children}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-56 py-1">
            {menuItems.map((item, index) => (
              <DropdownMenuItem 
                key={index}
                onClick={item.onClick}
                className={cn("py-3", item.className)}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Nickname Dialog */}
      <ResponsiveDialog open={openDialog === 'nickname'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent
          title={`Set nickname for ${targetUserName}`}
          description="Give this person a custom name that only you will see."
        >
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
          <ResponsiveDialogFooter className="gap-2">
            {currentNickname && (
              <Button variant="outline" onClick={handleRemoveNickname} disabled={loading} className="flex-1 sm:flex-initial">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            <Button onClick={handleSetNickname} disabled={loading || !nickname.trim()} className="flex-1 sm:flex-initial">
              Save
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Report Dialog */}
      <ResponsiveDialog open={openDialog === 'report'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent
          title={`Report ${targetUserName}`}
          description="Help us understand what's happening. Your report is confidential."
        >
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for report</Label>
              {/* Custom select button for mobile-safe selection */}
              <button
                type="button"
                onClick={() => setReasonSelectorOpen(true)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
                  !reportReason && "text-muted-foreground"
                )}
              >
                <span>{selectedReasonLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              
              {/* Reason selector drawer */}
              <Drawer open={reasonSelectorOpen} onOpenChange={setReasonSelectorOpen}>
                <DrawerContent>
                  <DrawerHeader className="border-b border-border">
                    <DrawerTitle>Select reason</DrawerTitle>
                  </DrawerHeader>
                  <div className="py-2">
                    {REPORT_REASONS.map((reason) => (
                      <button
                        key={reason.value}
                        onClick={() => {
                          setReportReason(reason.value);
                          setReasonSelectorOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          "hover:bg-accent/50 active:bg-accent",
                          reportReason === reason.value && "bg-accent/30"
                        )}
                      >
                        <span className="flex-1">{reason.label}</span>
                        {reportReason === reason.value && <Check className="h-5 w-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                </DrawerContent>
              </Drawer>
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
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button 
              onClick={handleReport} 
              disabled={loading || !reportReason}
              variant="destructive"
              className="flex-1 sm:flex-initial"
            >
              Submit Report
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Block Confirmation Dialog */}
      <ResponsiveDialog open={openDialog === 'block'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent
          title={`Block ${targetUserName}?`}
          description="They won't be able to send you messages or see your online status. You can unblock them anytime."
        >
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleBlock} disabled={loading} variant="destructive" className="flex-1 sm:flex-initial">
              Block
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Unfriend Confirmation Dialog */}
      <ResponsiveDialog open={openDialog === 'unfriend'} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <ResponsiveDialogContent
          title={`Remove ${targetUserName}?`}
          description="You'll no longer be friends. You can add them back later if you change your mind."
        >
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(null)} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button onClick={handleUnfriend} disabled={loading} variant="destructive" className="flex-1 sm:flex-initial">
              Remove Friend
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};
