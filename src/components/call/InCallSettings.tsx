import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, Volume2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { CallSettings } from "@/hooks/useCallSettings";

interface InCallSettingsProps {
  settings: CallSettings;
  onSettingsChange: (settings: Partial<CallSettings>) => void;
  isMobile?: boolean;
}

export function InCallSettings({
  settings,
  onSettingsChange,
  isMobile = false,
}: InCallSettingsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
          title="Call settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn(
        isMobile && "h-[85vh] rounded-t-2xl"
      )}>
        <SheetHeader>
          <SheetTitle>Call Settings</SheetTitle>
          <SheetDescription>
            Adjust audio settings for this call
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Master Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Call Volume
              </Label>
              <span className="text-sm text-muted-foreground">
                {settings.masterVolume}%
              </span>
            </div>
            <Slider
              value={[settings.masterVolume]}
              onValueChange={([v]) => onSettingsChange({ masterVolume: v })}
              max={150}
              min={0}
              step={5}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Adjust the overall volume of other participants
            </p>
          </div>

          {/* Mic Sensitivity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Mic Sensitivity
              </Label>
              <span className="text-sm text-muted-foreground">
                {settings.micSensitivity}%
              </span>
            </div>
            <Slider
              value={[settings.micSensitivity]}
              onValueChange={([v]) => onSettingsChange({ micSensitivity: v })}
              max={100}
              min={0}
              step={5}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Lower values require louder voice to activate mic
            </p>
          </div>

          {/* Audio Processing Toggles */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Noise Suppression</Label>
                <p className="text-xs text-muted-foreground">
                  Reduce background noise
                </p>
              </div>
              <Switch
                checked={settings.noiseSuppression}
                onCheckedChange={(checked) => 
                  onSettingsChange({ noiseSuppression: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Echo Cancellation</Label>
                <p className="text-xs text-muted-foreground">
                  Prevent audio feedback
                </p>
              </div>
              <Switch
                checked={settings.echoCancellation}
                onCheckedChange={(checked) => 
                  onSettingsChange({ echoCancellation: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Gain Control</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically adjust mic volume
                </p>
              </div>
              <Switch
                checked={settings.autoGainControl}
                onCheckedChange={(checked) => 
                  onSettingsChange({ autoGainControl: checked })
                }
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
