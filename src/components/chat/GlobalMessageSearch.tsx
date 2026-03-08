import { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessageSearch, SearchResult } from '@/hooks/useMessageSearch';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface GlobalMessageSearchProps {
  onSelectResult: (conversationId: string) => void;
  className?: string;
}

export const GlobalMessageSearch = ({ onSelectResult, className }: GlobalMessageSearchProps) => {
  const { results, loading, query, search, clearSearch } = useMessageSearch();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleInputChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    onSelectResult(result.conversation_id);
    setIsOpen(false);
    clearSearch();
  };

  const handleClose = () => {
    setIsOpen(false);
    clearSearch();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.length > 120 ? text.slice(0, 120) + '…' : text;
    
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 40);
    const before = (start > 0 ? '…' : '') + text.slice(start, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length, end) + (end < text.length ? '…' : '');
    
    return (
      <>
        {before}
        <mark className="bg-primary/30 text-foreground rounded-sm px-0.5">{match}</mark>
        {after}
      </>
    );
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={cn("h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground", className)}
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search messages..."
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-9 pr-9 h-9 bg-background/80 rounded-xl"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-xl shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <AnimatePresence>
        {(results.length > 0 || (query.length >= 2 && !loading)) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden"
          >
            <ScrollArea className="max-h-[400px]">
              {results.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No messages found for "{query}"
                </div>
              ) : (
                <div className="py-1">
                  <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </p>
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                        <AvatarImage src={result.sender_avatar || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {result.sender_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold truncate">{result.sender_name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(result.created_at)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          in {result.conversation_name}
                        </p>
                        <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">
                          {highlightMatch(result.content, query)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
