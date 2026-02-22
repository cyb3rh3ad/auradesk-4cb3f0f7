import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles, Cpu, Cloud, Lock, Check } from 'lucide-react';
import { AI_MODELS, getAvailableModels, getModelsForPlatform, type AIModel, type SubscriptionPlan } from '@/lib/ai-models';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface AIModelSelectorProps {
  selectedModel: string;
  executionMode: 'cloud' | 'local';
  subscriptionPlan: SubscriptionPlan;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: 'cloud' | 'local') => void;
  disabled?: boolean;
}

const ModelList = ({
  groupedModels,
  availableModels,
  selectedModel,
  executionMode,
  canUseLocal,
  isCapacitor,
  onModelChange,
  onModeChange,
}: {
  groupedModels: Record<string, AIModel[]>;
  availableModels: AIModel[];
  selectedModel: string;
  executionMode: 'cloud' | 'local';
  canUseLocal: boolean;
  isCapacitor: boolean;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: 'cloud' | 'local') => void;
}) => {
  const getModelIcon = (model: AIModel) => {
    if (model.capabilities.includes('image')) return '🎨';
    if (model.tier === 'professional') return '⚡';
    if (model.tier === 'advanced') return '✨';
    return '💫';
  };

  return (
    <>
      {/* Execution Mode Toggle */}
      {!isCapacitor && (
        <div className="p-2 border-b border-border">
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
            <button
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                executionMode === 'cloud' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onModeChange('cloud')}
            >
              <Cloud className="h-3.5 w-3.5" />
              Cloud
            </button>
            <button
              className={cn(
                "flex-1 h-8 flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
                executionMode === 'local' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground",
                !canUseLocal && "opacity-50 cursor-not-allowed"
              )}
              disabled={!canUseLocal}
              onClick={() => canUseLocal && onModeChange('local')}
            >
              <Cpu className="h-3.5 w-3.5" />
              Local
              {!canUseLocal && <Lock className="h-3 w-3" />}
            </button>
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="py-1 max-h-[60vh] overflow-y-auto">
        {Object.entries(groupedModels).map(([provider, models]) => (
          <div key={provider}>
            <div className="px-3 py-1.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {provider}
            </div>
            {models.map((model) => {
              const isAvailable = availableModels.some(m => m.id === model.id);
              const isSelected = selectedModel === model.id;

              return (
                <button
                  key={model.id}
                  disabled={!isAvailable}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    isSelected && "bg-accent/50",
                    isAvailable ? "hover:bg-accent/30 cursor-pointer" : "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (isAvailable) onModelChange(model.id);
                  }}
                >
                  <span className="text-base">{getModelIcon(model)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate text-foreground">{model.name}</span>
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
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
};

export const AIModelSelector = ({
  selectedModel,
  executionMode,
  subscriptionPlan,
  onModelChange,
  onModeChange,
  disabled,
}: AIModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const availableModels = getAvailableModels(subscriptionPlan);
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const isElectron = typeof window !== 'undefined' && 
    ((window as any).electronAPI?.isElectron || window.location.protocol === 'file:');
  const isCapacitor = typeof window !== 'undefined' && 
    !!(window as any).Capacitor?.isNativePlatform?.();
  const canUseLocal = subscriptionPlan !== 'free' && !isElectron && !isCapacitor;

  const platformModels = getModelsForPlatform(AI_MODELS);
  
  const groupedModels = platformModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  // Update position when opening (desktop only)
  useEffect(() => {
    if (open && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 320;
      // Clamp so the menu stays on screen
      const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
      setMenuPosition({
        top: rect.bottom + 8,
        left,
      });
    }
  }, [open, isMobile]);

  // Close on click outside (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, isMobile]);

  const handleModelChange = (modelId: string) => {
    onModelChange(modelId);
    setOpen(false);
  };

  const listProps = {
    groupedModels,
    availableModels,
    selectedModel,
    executionMode,
    canUseLocal,
    isCapacitor,
    onModelChange: handleModelChange,
    onModeChange,
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm transition-all",
          isMobile ? "w-full" : "w-[200px]",
          "hover:bg-accent/30",
          open && "shadow-lg shadow-primary/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate flex-1 text-left">{currentModel.name}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      {/* Mobile: Bottom drawer */}
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Select AI Model</DrawerTitle>
              <DrawerDescription>Choose the model for your conversation</DrawerDescription>
            </DrawerHeader>
            <div className="pb-safe-area">
              <ModelList {...listProps} />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Desktop: Portal dropdown */}
      {!isMobile && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 99999,
              }}
              className="w-[320px] rounded-xl border border-border bg-background shadow-xl overflow-hidden"
            >
              <ModelList {...listProps} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};