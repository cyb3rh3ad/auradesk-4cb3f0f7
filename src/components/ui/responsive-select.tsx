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
import { Check } from 'lucide-react';

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
}

const ResponsiveSelectContext = React.createContext<ResponsiveSelectContextType | null>(null);

export function ResponsiveSelect({ value, onValueChange, children, disabled }: ResponsiveSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        {children}
      </Select>
    );
  }

  return (
    <ResponsiveSelectContext.Provider value={{ value, onValueChange, open, setOpen, isMobile }}>
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 opacity-50"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
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

  // Mobile mode - show current value or placeholder
  return (
    <span className={cn(!context.value && "text-muted-foreground")}>
      {context.value || placeholder || 'Select...'}
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
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-1">
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
        "flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm transition-colors",
        "hover:bg-muted focus:bg-muted focus:outline-none",
        isSelected && "bg-primary/10 text-primary",
        className
      )}
    >
      <span className="flex items-center gap-2">{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  );
}
