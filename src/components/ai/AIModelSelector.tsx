import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles, Cpu, Cloud, Lock, Check, Server, Wifi, WifiOff } from 'lucide-react';
import { AI_MODELS, getAvailableModels, type AIModel, type SubscriptionPlan, type ExecutionMode } from '@/lib/ai-models';
import { cn } from '@/lib/utils';
import { isElectron } from '@/lib/supabase-config';

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
  
  const availableModels = getAvailableModels(subscriptionPlan);
  const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];
  const inElectron = isElectron();
  // Local mode now works everywhere (uses WASM fallback in Electron)
  const canUseLocal = subscriptionPlan !== 'free';
  // Ollama is also available in Electron as an alternative
  const canUseOllama = inElectron;

  // Filter models based on execution mode
  const getDisplayModels = () => {
    if (executionMode === 'ollama') {
      return AI_MODELS.filter(m => m.provider === 'ollama');
    }
    // For cloud/local modes, filter out ollama models
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

  // Update position when opening with viewport-aware positioning
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 320;
      const padding = 16;
      
      // Calculate left position - try to align right edge with button, but don't overflow
      let leftPos = rect.right - menuWidth;
      
      // If would overflow left, align to left edge with padding
      if (leftPos < padding) {
        leftPos = padding;
      }
      
      // If would overflow right, align to right edge with padding
      if (leftPos + menuWidth > window.innerWidth - padding) {
        leftPos = window.innerWidth - menuWidth - padding;
      }
      
      setMenuPosition({
        top: rect.bottom + 8,
        left: leftPos,
      });
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
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
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm transition-all w-[200px]",
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

      {/* Dropdown Content - Portal to body */}
      {typeof document !== 'undefined' && createPortal(
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
                left: Math.max(menuPosition.left, 16),
                right: 'auto',
                zIndex: 99999,
                maxWidth: 'calc(100vw - 2rem)',
              }}
              className="w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background shadow-xl overflow-hidden"
            >
              {/* Execution Mode Toggle */}
              <div className="p-2 border-b border-border">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  <button
                    className={cn(
                      "flex-1 h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                      executionMode === 'cloud' 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => onModeChange('cloud')}
                  >
                    <Cloud className="h-3.5 w-3.5" />
                    Cloud
                  </button>
                  {canUseOllama && (
                    <button
                      className={cn(
                        "flex-1 h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                        executionMode === 'ollama' 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => onModeChange('ollama')}
                    >
                      <Server className="h-3.5 w-3.5" />
                      Ollama
                      {ollamaConnected ? (
                        <Wifi className="h-3 w-3 text-green-500" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  <button
                    className={cn(
                      "flex-1 h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
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
                {executionMode === 'ollama' && !ollamaConnected && (
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    Start Ollama to use offline AI. <a href="https://ollama.ai" target="_blank" rel="noopener" className="text-primary underline">Download</a>
                  </p>
                )}
              </div>

              {/* Models List */}
              <div className="py-1">
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
                            if (isAvailable) {
                              onModelChange(model.id);
                              setOpen(false);
                            }
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};