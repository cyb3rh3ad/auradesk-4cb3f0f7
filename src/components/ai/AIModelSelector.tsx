import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles, Cpu, Cloud, Lock, Check, Server, Wifi, WifiOff } from 'lucide-react';
import { AI_MODELS, getAvailableModels, type AIModel, type SubscriptionPlan, type ExecutionMode } from '@/lib/ai-models';
import { cn } from '@/lib/utils';
import { isElectron } from '@/lib/supabase-config';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface AIModelSelectorProps {
  selectedModel: string;
  executionMode: ExecutionMode;
  subscriptionPlan: SubscriptionPlan;
  onModelChange: (modelId: string) => void;
  onModeChange: (mode: ExecutionMode) => void;
  disabled?: boolean;
  ollamaConnected?: boolean;
}

export const AIModelSelector = ({
  selectedModel,
  executionMode,
  subscriptionPlan,
  onModelChange,
  onModeChange,
  disabled,
  ollamaConnected = false,
}: AIModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  
  const availableModels = getAvailableModels(subscriptionPlan);
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const inElectron = isElectron();
  const canUseLocal = subscriptionPlan !== 'free';
  const canUseOllama = inElectron;

  const getDisplayModels = () => {
    if (executionMode === 'ollama') {
      return AI_MODELS.filter(m => m.provider === 'ollama');
    }
    return AI_MODELS.filter(m => m.provider !== 'ollama');
  };

  const displayModels = getDisplayModels();
  const groupedModels = displayModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const getModelIcon = (model: AIModel) => {
    if (model.provider === 'ollama') return '🦙';
    if (model.capabilities.includes('image')) return '🎨';
    if (model.tier === 'professional') return '⚡';
    if (model.tier === 'advanced') return '✨';
    return '💫';
  };

  // Desktop: Update position when opening
  useEffect(() => {
    if (!isMobile && open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 320;
      const padding = 16;
      const viewportWidth = window.innerWidth;
      
      let leftPos = rect.right - menuWidth;
      if (leftPos < padding) {
        leftPos = padding;
      }
      if (leftPos + menuWidth > viewportWidth - padding) {
        leftPos = viewportWidth - menuWidth - padding;
      }
      
      setMenuPosition({
        top: rect.bottom + 8,
        left: leftPos,
      });
    }
  }, [open, isMobile]);

  // Desktop: Close on click outside
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

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setOpen(false);
  };

  const ExecutionModeToggle = () => (
    <div className="p-2 border-b border-border">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          className={cn(
            "flex-1 h-10 flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
            executionMode === 'cloud' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onModeChange('cloud')}
        >
          <Cloud className="h-4 w-4" />
          Cloud
        </button>
        {canUseOllama && (
          <button
            className={cn(
              "flex-1 h-10 flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
              executionMode === 'ollama' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onModeChange('ollama')}
          >
            <Server className="h-4 w-4" />
            Ollama
            {ollamaConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
        <button
          className={cn(
            "flex-1 h-10 flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
            executionMode === 'local' 
              ? "bg-background text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground",
            !canUseLocal && "opacity-50 cursor-not-allowed"
          )}
          disabled={!canUseLocal}
          onClick={() => canUseLocal && onModeChange('local')}
        >
          <Cpu className="h-4 w-4" />
          Local
          {!canUseLocal && <Lock className="h-3.5 w-3.5" />}
        </button>
      </div>
      {executionMode === 'ollama' && !ollamaConnected && (
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Start Ollama to use offline AI. <a href="https://ollama.ai" target="_blank" rel="noopener" className="text-primary underline">Download</a>
        </p>
      )}
    </div>
  );

  const ModelsList = () => (
    <div className="py-1">
      {Object.entries(groupedModels).map(([provider, models]) => (
        <div key={provider}>
          <div className="px-3 py-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
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
                  "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                  isSelected && "bg-accent/50",
                  isAvailable ? "hover:bg-accent/30 active:bg-accent/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
                )}
                onClick={() => isAvailable && handleModelSelect(model.id)}
              >
                <span className="text-lg">{getModelIcon(model)}</span>
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
                {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                {!isAvailable && <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm transition-all w-[200px]",
          "hover:bg-accent/30 active:bg-accent/50",
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

      {/* Mobile: Bottom Sheet Drawer */}
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border pb-0 mb-0">
              <DrawerTitle className="text-left">Select AI Model</DrawerTitle>
            </DrawerHeader>
            <ExecutionModeToggle />
            <div className="max-h-[50vh] overflow-y-auto">
              <ModelsList />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Desktop: Positioned Dropdown */}
      {!isMobile && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'fixed',
                top: menuPosition.top,
                left: menuPosition.left,
                zIndex: 99999,
                width: '320px',
              }}
              className="rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
            >
              <ExecutionModeToggle />
              <div className="max-h-[50vh] overflow-y-auto">
                <ModelsList />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
