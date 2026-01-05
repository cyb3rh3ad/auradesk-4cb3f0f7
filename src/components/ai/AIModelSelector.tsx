import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, Sparkles, Cpu, Cloud, Lock, Check } from 'lucide-react';
import { AI_MODELS, getAvailableModels, type AIModel, type SubscriptionPlan } from '@/lib/ai-models';
import { cn } from '@/lib/utils';

interface AIModelSelectorProps {
  selectedModel: string;
  executionMode: 'cloud' | 'local';
  subscriptionPlan: SubscriptionPlan;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: 'cloud' | 'local') => void;
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
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const canUseLocal = subscriptionPlan !== 'free';

  const groupedModels = AI_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const getModelIcon = (model: AIModel) => {
    if (model.capabilities.includes('image')) return '🎨';
    if (model.tier === 'professional') return '⚡';
    if (model.tier === 'advanced') return '✨';
    return '💫';
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="ghost"
          className="h-auto px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        >
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          <span className="text-sm">{currentModel.name}</span>
          <ChevronUp className={cn("h-4 w-4 ml-2 transition-transform", open && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="start" 
        side="top"
        sideOffset={8}
        className="w-72 max-h-[400px] overflow-y-auto"
      >
        {/* Execution Mode Toggle */}
        <div className="p-2">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={executionMode === 'cloud' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-8 gap-2"
              onClick={() => onModeChange('cloud')}
            >
              <Cloud className="h-3.5 w-3.5" />
              Cloud
            </Button>
            <Button
              variant={executionMode === 'local' ? 'secondary' : 'ghost'}
              size="sm"
              className={cn("flex-1 h-8 gap-2", !canUseLocal && "opacity-50")}
              disabled={!canUseLocal}
              onClick={() => canUseLocal && onModeChange('local')}
            >
              <Cpu className="h-3.5 w-3.5" />
              Local
              {!canUseLocal && <Lock className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Models List */}
        <div className="py-1">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                {provider}
              </DropdownMenuLabel>
              {models.map((model) => {
                const isAvailable = availableModels.some(m => m.id === model.id);
                const isSelected = selectedModel === model.id;

                return (
                  <DropdownMenuItem
                    key={model.id}
                    disabled={!isAvailable}
                    className={cn(
                      "flex items-center gap-3 py-2.5 cursor-pointer",
                      isSelected && "bg-accent"
                    )}
                    onClick={() => {
                      if (isAvailable) {
                        onModelChange(model.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <span className="text-base">{getModelIcon(model)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{model.name}</span>
                        {model.tier === 'professional' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">PRO</Badge>
                        )}
                      </div>
                      {model.description && (
                        <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    {!isAvailable && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
