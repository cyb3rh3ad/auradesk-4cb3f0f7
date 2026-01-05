import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, Sparkles, Cpu, Cloud, Lock, Image, Brain, Check } from "lucide-react";
import { AI_MODELS, getAvailableModels, type AIModel, type SubscriptionPlan } from "@/lib/ai-models";
import { cn } from "@/lib/utils";

interface AIModelSelectorProps {
  selectedModel: string;
  executionMode: "cloud" | "local";
  subscriptionPlan: SubscriptionPlan;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: "cloud" | "local") => void;
  disabled?: boolean;
}

export const AIModelSelector = ({
  selectedModel,
  executionMode,
  subscriptionPlan,
  onModelChange,
  onModeChange,
  disabled,
}: AIModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  const availableModels = getAvailableModels(subscriptionPlan);
  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];
  const canUseLocal = subscriptionPlan !== "free";

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "google":
        return "text-blue-500";
      case "openai":
        return "text-green-500";
      case "anthropic":
        return "text-orange-500";
      case "meta":
        return "text-purple-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "free":
        return (
          <Badge variant="secondary" className="text-xs">
            Free
          </Badge>
        );
      case "advanced":
        return <Badge className="text-xs bg-blue-500/20 text-blue-500 border-blue-500/30">Advanced</Badge>;
      case "professional":
        return <Badge className="text-xs bg-purple-500/20 text-purple-500 border-purple-500/30">Pro</Badge>;
      default:
        return null;
    }
  };

  const isModelAvailable = (model: AIModel) => {
    return availableModels.some((m) => m.id === model.id);
  };

  const groupedModels = AI_MODELS.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, AIModel[]>,
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9" disabled={disabled}>
          <Sparkles className="h-4 w-4" />
          <span className="max-w-[120px] truncate">{currentModel.name}</span>
          {executionMode === "local" && <Cpu className="h-3 w-3 text-muted-foreground" />}
          {executionMode === "cloud" && <Cloud className="h-3 w-3 text-muted-foreground" />}
          <ChevronUp className={cn("h-3 w-3 ml-1 transition-transform duration-200", open && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-72 max-h-[400px] overflow-y-auto z-[100] bg-popover border shadow-xl"
        >
          <div className="p-2 border-b">
            <p className="text-xs text-muted-foreground mb-2">Execution Mode</p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={executionMode === "cloud" ? "default" : "outline"}
                className="flex-1 h-8 text-xs"
                onClick={() => onModeChange("cloud")}
              >
                <Cloud className="h-3 w-3 mr-1" />
                Cloud
              </Button>
              <Button
                size="sm"
                variant={executionMode === "local" ? "default" : "outline"}
                className="flex-1 h-8 text-xs"
                disabled={!canUseLocal}
                onClick={() => canUseLocal && onModeChange("local")}
              >
                <Cpu className="h-3 w-3 mr-1" />
                Local
                {!canUseLocal && <Lock className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>

          <DropdownMenuSeparator />

          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <DropdownMenuLabel
                className={cn("text-[10px] uppercase tracking-wider mt-1", getProviderColor(provider))}
              >
                {provider}
              </DropdownMenuLabel>
              {models.map((model) => {
                const available = isModelAvailable(model);
                const showLocalOnly = executionMode === "local" && !model.supportsLocal;

                return (
                  <DropdownMenuItem
                    key={model.id}
                    disabled={!available || showLocalOnly}
                    className={cn(
                      "flex items-center justify-between cursor-pointer py-2",
                      selectedModel === model.id && "bg-accent",
                    )}
                    onClick={() => {
                      if (available && !showLocalOnly) {
                        onModelChange(model.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-4 flex justify-center">
                        {selectedModel === model.id && <Check className="h-3 w-3 text-primary" />}
                      </div>
                      <span className={cn("text-sm", !available && "text-muted-foreground")}>{model.name}</span>
                      <div className="flex gap-1">
                        {model.capabilities.includes("image") && <Image className="h-3 w-3 text-pink-500" />}
                        {model.capabilities.includes("reasoning") && <Brain className="h-3 w-3 text-yellow-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!available && <Lock className="h-3 w-3 opacity-50" />}
                      {getTierBadge(model.tier)}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}

          <DropdownMenuSeparator />
          <div className="p-2 text-[10px] text-muted-foreground bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Image className="h-3 w-3 text-pink-500" /> Image generation
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-3 w-3 text-yellow-500" /> Advanced reasoning
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
