import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhoneOff, Users } from "lucide-react";

interface EndCallDialogProps {
  open: boolean;
  onClose: () => void;
  onEndForSelf: () => void;
  onEndForEveryone: () => void;
  isHost: boolean;
  participantCount: number;
}

export function EndCallDialog({
  open,
  onClose,
  onEndForSelf,
  onEndForEveryone,
  isHost,
  participantCount,
}: EndCallDialogProps) {
  // Only show options if host and more than 2 people in call
  const showOptions = isHost && participantCount > 2;

  if (!showOptions) {
    // For non-hosts or 1-on-1 calls, just end for self
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOff className="h-5 w-5 text-destructive" />
            End Call
          </DialogTitle>
          <DialogDescription>
            Choose how to end this call
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto py-4 justify-start gap-3"
            onClick={onEndForSelf}
          >
            <PhoneOff className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Leave Call</div>
              <div className="text-xs text-muted-foreground">
                Exit the call, others can continue
              </div>
            </div>
          </Button>

          <Button
            variant="destructive"
            className="h-auto py-4 justify-start gap-3"
            onClick={onEndForEveryone}
          >
            <Users className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">End Call for Everyone</div>
              <div className="text-xs text-destructive-foreground/80">
                Disconnect all {participantCount} participants
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
