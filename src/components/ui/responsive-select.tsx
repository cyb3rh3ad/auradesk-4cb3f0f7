import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface ResponsiveSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface ResponsiveSelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  registerOption: (value: string, label: string) => void;
  getLabel: (value: string) => string | undefined;
}

const ResponsiveSelectContext = React.createContext<ResponsiveSelectContextType | null>(null);

export function ResponsiveSelect({ value, onValueChange, children, disabled }: ResponsiveSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const optionsRef = React.useRef<Map<string, string>>(new Map());

  const registerOption = React.useCallback((optValue: string, label: string) => {
    optionsRef.current.set(optValue, label);
  }, []);

  const getLabel = React.useCallback((optValue: string) => {
    return optionsRef.current.get(optValue);
  }, []);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        {children}
      </Select>
    );
  }

  return (
    <ResponsiveSelectContext.Provider value={{ value, onValueChange, open, setOpen, isMobile, registerOption, getLabel }}>
      {children}
    </ResponsiveSelectContext.Provider>
  );
}

interface ResponsiveSelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveSelectTrigger({ children, className }: ResponsiveSelectTriggerProps) {
  const context = React.useContext(ResponsiveSelectContext);
  
  if (!context) {
    // Desktop mode - render standard SelectTrigger
    return <SelectTrigger className={className}>{children}</SelectTrigger>;
  }

  // Mobile mode - render button that opens drawer
  return (
    <button
      type="button"
      onClick={() => context.setOpen(true)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );
}

interface ResponsiveSelectValueProps {
  placeholder?: string;
}

export function ResponsiveSelectValue({ placeholder }: ResponsiveSelectValueProps) {
  const context = React.useContext(ResponsiveSelectContext);
  
  if (!context) {
    // Desktop mode - render standard SelectValue
    return <SelectValue placeholder={placeholder} />;
  }

  // Mobile mode - show current label or placeholder
  const label = context.value ? context.getLabel(context.value) : undefined;
  const displayValue = label || context.value;
  
  return (
    <span className={cn("truncate", !context.value && "text-muted-foreground")}>
      {displayValue || placeholder || 'Select...'}
    </span>
  );
}

interface ResponsiveSelectContentProps {
  children: React.ReactNode;
  title?: string;
}

export function ResponsiveSelectContent({ children, title = "Select an option" }: ResponsiveSelectContentProps) {
  const context = React.useContext(ResponsiveSelectContext);
  
  if (!context) {
    // Desktop mode - render standard SelectContent
    return <SelectContent>{children}</SelectContent>;
  }

  // Mobile mode - render drawer
  return (
    <Drawer open={context.open} onOpenChange={context.setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left border-b border-border pb-3">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-2 py-2 pb-8 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface ResponsiveSelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveSelectItem({ value, children, className }: ResponsiveSelectItemProps) {
  const context = React.useContext(ResponsiveSelectContext);
  
  // Extract text content for label registration
  const labelText = React.useMemo(() => {
    if (typeof children === 'string') return children;
    if (React.isValidElement(children)) {
      // Try to extract text from children
      const extractText = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(extractText).join('');
        if (React.isValidElement(node) && node.props.children) {
          return extractText(node.props.children);
        }
        return '';
      };
      return extractText(children);
    }
    return String(children);
  }, [children]);
  
  // Register this option's value and label
  React.useEffect(() => {
    if (context) {
      context.registerOption(value, labelText);
    }
  }, [context, value, labelText]);
  
  if (!context) {
    // Desktop mode - render standard SelectItem
    return <SelectItem value={value} className={className}>{children}</SelectItem>;
  }

  // Mobile mode - render button
  const isSelected = context.value === value;
  
  return (
    <button
      type="button"
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-4 py-3.5 text-left text-sm transition-colors",
        "hover:bg-muted active:bg-muted/80 focus:bg-muted focus:outline-none",
        isSelected && "bg-primary/10 text-primary font-medium",
        className
      )}
    >
      <span className="flex items-center gap-2">{children}</span>
      {isSelected && <Check className="h-4 w-4 shrink-0" />}
    </button>
  );
}
