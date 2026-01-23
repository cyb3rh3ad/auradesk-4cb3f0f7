import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreVertical, Volume2, VolumeX, Mic, MicOff, 
  VideoOff, UserX, RotateCcw 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParticipantControlsProps {
  participantId: string;
  participantName: string;
  isHost: boolean;
  isLocal: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onResetVolume: () => void;
  onMuteParticipant?: () => void;
  onDisableCamera?: () => void;
  onKickParticipant?: () => void;
  isMobile?: boolean;
}

export function ParticipantControls({
  participantId,
  participantName,
  isHost,
  isLocal,
  volume,
  onVolumeChange,
  onResetVolume,
  onMuteParticipant,
  onDisableCamera,
  onKickParticipant,
  isMobile = false,
}: ParticipantControlsProps) {
  const [volumeOpen, setVolumeOpen] = useState(false);

  // Don't show controls for local participant
  if (isLocal) return null;

  return (
    <div className={cn(
      "absolute flex items-center gap-0.5",
      isMobile ? "bottom-1 right-1" : "bottom-2 right-2"
    )}>
      {/* Volume control popover */}
      <Popover open={volumeOpen} onOpenChange={setVolumeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "bg-background/70 backdrop-blur-sm hover:bg-background/90",
              isMobile ? "h-6 w-6" : "h-7 w-7"
            )}
            title="Adjust volume"
          >
            {volume === 0 ? (
              <VolumeX className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <Volume2 className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-48 p-3" 
          side={isMobile ? "top" : "left"}
          align="end"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate max-w-[100px]">
                {participantName}
              </span>
              <span className="text-xs text-muted-foreground">
                {volume}%
              </span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => onVolumeChange(v)}
              max={200}
              min={0}
              step={5}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
              <span>200%</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2"
              onClick={onResetVolume}
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Host controls dropdown */}
      {isHost && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "bg-background/70 backdrop-blur-sm hover:bg-background/90",
                isMobile ? "h-6 w-6" : "h-7 w-7"
              )}
            >
              <MoreVertical className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMuteParticipant} className="gap-2">
              <MicOff className="h-4 w-4" />
              Mute {participantName}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDisableCamera} className="gap-2">
              <VideoOff className="h-4 w-4" />
              Turn off camera
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onKickParticipant} 
              className="gap-2 text-destructive focus:text-destructive"
            >
              <UserX className="h-4 w-4" />
              Remove from call
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
