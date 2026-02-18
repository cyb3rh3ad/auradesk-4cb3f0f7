import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, Phone, Video, MoreVertical, Paperclip, X, FileIcon, Image as ImageIcon, Film, Music, FileText, Loader2, Reply as ReplyIcon, Palette, Pin } from 'lucide-react';
import { useKeyboardVisibility } from '@/hooks/useKeyboardVisibility';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useCall } from '@/contexts/CallContext';
import { useChatFileUpload } from '@/hooks/useChatFileUpload';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ChatOptionsMenu } from './ChatOptionsMenu';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { CameraCapture } from './CameraCapture';
import { MessageReactionMenu } from './MessageReactionMenu';
import { ScrollToBottomFAB } from './ScrollToBottomFAB';
import { WallpaperPicker, BubbleThemePicker, getWallpaper, getWallpaperClass, getBubbleTheme, getBubbleClasses, type WallpaperId, type BubbleThemeId } from './ChatWallpaper';
import { PinnedMessagesDrawer } from './PinnedMessagesDrawer';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';
import { LinkPreview } from './LinkPreview';
import { renderFormattedMessage, extractFirstUrl } from '@/utils/messageFormatting';
import { playSendSound, playReceiveSound } from '@/utils/chatSounds';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageAreaProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  conversationName: string;
  isGroup?: boolean;
  conversationId: string | null;
  otherUserId?: string | null;
}

// Detect if a message content is a file attachment
const FILE_MESSAGE_REGEX = /^\[file:(.+?)\]\((.+?)\)$/;
const isFileMessage = (content: string) => FILE_MESSAGE_REGEX.test(content);
const parseFileMessage = (content: string) => {
  const match = content.match(FILE_MESSAGE_REGEX);
  if (!match) return null;
  return { name: match[1], url: match[2] };
};

// Detect voice message
const VOICE_MESSAGE_REGEX = /^\[voice:(\d+)\]\((.+?)\)$/;
const parseVoiceMessage = (content: string) => {
  const match = content.match(VOICE_MESSAGE_REGEX);
  if (!match) return null;
  return { durationMs: parseInt(match[1]), url: match[2] };
};

const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) return ImageIcon;
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return Film;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return Music;
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return FileText;
  return FileIcon;
};

const isImageFile = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const MessageArea = ({ messages, onSendMessage, conversationName, isGroup, conversationId, otherUserId }: MessageAreaProps) => {
  const { user } = useAuth();
  const { startCall: initiateCall } = useCall();
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [showScrollFAB, setShowScrollFAB] = useState(false);
  const [wallpaper, setWallpaper] = useState<WallpaperId>('none');
  const [bubbleTheme, setBubbleTheme] = useState<BubbleThemeId>('default');
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef(0);
  const { typingUsers, sendTypingEvent, stopTyping } = useTypingIndicator(conversationId);
  const { uploading, uploadFile, maxFileSizeLabel, plan } = useChatFileUpload(conversationId);
  const isKeyboardOpen = useKeyboardVisibility();

  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Someone';

  // Load wallpaper and bubble theme for this conversation
  useEffect(() => {
    if (conversationId) {
      setWallpaper(getWallpaper(conversationId));
    }
    setBubbleTheme(getBubbleTheme());
  }, [conversationId]);

  const getScrollContainer = useCallback(() => {
    return scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = getScrollContainer();
    if (el) el.scrollTop = el.scrollHeight;
  }, [getScrollContainer]);

  const isNearBottom = useCallback(() => {
    const el = getScrollContainer();
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, [getScrollContainer]);

  const handleStartCall = (withVideo: boolean) => {
    if (!conversationId) return;
    initiateCall(conversationId, conversationName, withVideo);
  };

  // Track scroll position for FAB
  useEffect(() => {
    const el = getScrollContainer();
    if (!el) return;
    const handleScroll = () => {
      setShowScrollFAB(!isNearBottom());
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [getScrollContainer, isNearBottom]);

  // Scroll to bottom on new messages + play sounds
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newCount = messages.length;
    prevMessageCountRef.current = newCount;

    if (newCount > prevCount && prevCount > 0) {
      const lastMsg = messages[newCount - 1];
      if (lastMsg?.sender_id === user?.id) {
        playSendSound();
      } else {
        playReceiveSound();
      }
    }

    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isNearBottom, user?.id]);

  // Scroll to bottom when chat input is focused (keyboard opens)
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const handleFocus = () => {
      scrollToBottom();
      const t1 = setTimeout(scrollToBottom, 150);
      const t2 = setTimeout(scrollToBottom, 350);
      const t3 = setTimeout(scrollToBottom, 600);
      
      const vp = window.visualViewport;
      const onResize = () => scrollToBottom();
      if (vp) {
        vp.addEventListener('resize', onResize);
        setTimeout(() => vp.removeEventListener('resize', onResize), 1000);
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        if (vp) vp.removeEventListener('resize', onResize);
      };
    };

    inputEl.addEventListener('focus', handleFocus);
    return () => inputEl.removeEventListener('focus', handleFocus);
  }, [scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.trim()) {
      sendTypingEvent(currentUserName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pendingFiles.length > 0) {
      for (const file of pendingFiles) {
        const url = await uploadFile(file);
        if (url) {
          onSendMessage(`[file:${file.name}](${url})`);
        }
      }
      setPendingFiles([]);
    }
    
    if (input.trim()) {
      stopTyping(currentUserName);
      const messageText = replyTo
        ? `> ${replyTo.senderName}: ${replyTo.content.slice(0, 80)}${replyTo.content.length > 80 ? '…' : ''}\n\n${input}`
        : input;
      onSendMessage(messageText);
      setInput('');
      setReplyTo(null);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
    setReactions(prev => {
      const existing = prev[messageId] || [];
      if (existing.includes(emoji)) {
        return { ...prev, [messageId]: existing.filter(e => e !== emoji) };
      }
      return { ...prev, [messageId]: [...existing, emoji] };
    });
  };

  const handleReply = (messageId: string, content: string, senderName: string) => {
    setReplyTo({ id: messageId, content, senderName });
    inputRef.current?.focus();
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
    e.target.value = '';
  };

  const handleCameraCapture = async (file: File) => {
    const url = await uploadFile(file);
    if (url) {
      onSendMessage(`[file:${file.name}](${url})`);
    }
  };

  const handleVoiceRecording = async (blob: Blob, durationMs: number) => {
    if (!conversationId || !user) return;
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type });
    const url = await uploadFile(file);
    if (url) {
      onSendMessage(`[voice:${durationMs}](${url})`);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    }
    return format(date, 'MMM d, HH:mm');
  };

  const groupedMessages = messages.reduce((acc: any[], message, index) => {
    const prevMessage = messages[index - 1];
    const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id;
    const isWithinTimeframe = prevMessage && 
      (new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()) < 60000;

    if (isSameSender && isWithinTimeframe) {
      acc[acc.length - 1].messages.push(message);
    } else {
      acc.push({
        sender: message.sender,
        sender_id: message.sender_id,
        messages: [message],
      });
    }
    return acc;
  }, []);

  const renderMessageContent = (message: Message, isOwn: boolean) => {
    const voiceInfo = parseVoiceMessage(message.content);
    if (voiceInfo) {
      return (
        <VoiceMessagePlayer
          url={voiceInfo.url}
          duration={voiceInfo.durationMs / 1000}
          isOwn={isOwn}
        />
      );
    }

    const fileInfo = parseFileMessage(message.content);
    
    if (fileInfo) {
      const Icon = getFileIcon(fileInfo.name);
      
      if (isImageFile(fileInfo.name)) {
        return (
          <a href={fileInfo.url} target="_blank" rel="noopener noreferrer" className="block">
            <img 
              src={fileInfo.url} 
              alt={fileInfo.name}
              className="max-w-[240px] md:max-w-[320px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <p className="text-[11px] mt-1 opacity-70 truncate">{fileInfo.name}</p>
          </a>
        );
      }
      
      return (
        <a 
          href={fileInfo.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg transition-colors",
            isOwn ? "hover:bg-white/10" : "hover:bg-muted/50"
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="text-sm truncate underline underline-offset-2">{fileInfo.name}</span>
        </a>
      );
    }
    
    // Render formatted text with markdown + link previews
    const firstUrl = extractFirstUrl(message.content);
    return (
      <div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {renderFormattedMessage(message.content)}
        </div>
        {firstUrl && <LinkPreview url={firstUrl} isOwn={isOwn} />}
      </div>
    );
  };

  const wallpaperClass = getWallpaperClass(wallpaper);
  const bubbleStyles = getBubbleClasses(bubbleTheme);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Conversation Header - Hidden on mobile since Chat.tsx shows its own */}
      <div className="h-16 px-4 md:px-6 hidden md:flex items-center justify-between border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className={cn(
              "text-sm font-medium",
              isGroup 
                ? "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
                : "bg-gradient-to-br from-primary to-accent text-primary-foreground"
            )}>
              {isGroup ? <Users className="w-5 h-5" /> : getInitials(conversationName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-foreground">{conversationName}</h2>
            <p className="text-xs text-muted-foreground">
              {isGroup ? 'Group conversation' : 'Direct message'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Wallpaper picker */}
          {conversationId && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Palette className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-xs" align="end">
                <div className="space-y-4">
                  <WallpaperPicker
                    conversationId={conversationId}
                    currentWallpaper={wallpaper}
                    onSelect={setWallpaper}
                  />
                  <BubbleThemePicker
                    currentTheme={bubbleTheme}
                    onSelect={setBubbleTheme}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}
          {conversationId && (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => setShowPinnedDrawer(true)}>
              <Pin className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleStartCall(false)}>
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleStartCall(true)}>
            <Video className="w-4 h-4" />
          </Button>
          {!isGroup && otherUserId && (
            <ChatOptionsMenu targetUserId={otherUserId} targetUserName={conversationName}>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </ChatOptionsMenu>
          )}
          {(isGroup || !otherUserId) && (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages with wallpaper */}
      <div className={cn('flex-1 min-h-0 relative', wallpaperClass)}>
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-3 md:p-6 space-y-4 md:space-y-6">
            {groupedMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center space-y-2">
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-muted-foreground/60 text-xs">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              groupedMessages.map((group, groupIndex) => {
                const isOwn = group.sender_id === user?.id;
                const senderName = group.sender?.full_name || group.sender?.email || 'Unknown';
                const firstMessage = group.messages[0];

                return (
                  <div key={`group-${groupIndex}`} className={cn('flex gap-2 md:gap-3', isOwn && 'flex-row-reverse')}>
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 mt-1 shrink-0">
                      <AvatarImage src={group.sender?.avatar_url} />
                      <AvatarFallback className={cn(
                        "text-xs font-medium",
                        isOwn 
                          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn('flex flex-col max-w-[80%] md:max-w-[75%] gap-0.5', isOwn && 'items-end')}>
                      <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
                        <span className="text-xs font-medium text-foreground/80">{isOwn ? 'You' : senderName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatMessageDate(new Date(firstMessage.created_at))}
                        </span>
                      </div>
                      {group.messages.map((message: Message) => {
                        const messageReactions = reactions[message.id] || [];
                        const hasQuote = message.content.startsWith('> ');
                        const quoteMatch = hasQuote ? message.content.match(/^> (.+?): (.+?)\n\n([\s\S]*)$/) : null;
                        
                        return (
                          <MessageReactionMenu
                            key={message.id}
                            messageId={message.id}
                            messageContent={message.content}
                            senderId={message.sender_id}
                            isOwn={isOwn}
                            onReact={handleReact}
                            onReply={handleReply}
                            onCopy={handleCopy}
                            senderName={senderName}
                          >
                            <div
                              className={cn(
                                'px-3 py-2 md:px-4 md:py-2.5 rounded-2xl select-none',
                                isOwn
                                  ? cn(bubbleStyles.own, 'rounded-tr-md')
                                  : cn(bubbleStyles.other, 'rounded-tl-md')
                              )}
                            >
                              {quoteMatch && (
                                <div className={cn(
                                  'mb-1.5 px-2 py-1 rounded-lg text-xs border-l-2',
                                  'bg-black/15 border-white/30 opacity-80'
                                )}>
                                  <span className="font-semibold">{quoteMatch[1]}</span>
                                  <p className="truncate">{quoteMatch[2]}</p>
                                </div>
                              )}
                              {quoteMatch 
                                ? <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{renderFormattedMessage(quoteMatch[3])}</div>
                                : renderMessageContent(message, isOwn)
                              }
                            </div>
                            {messageReactions.length > 0 && (
                              <div className={cn('flex gap-0.5 mt-0.5', isOwn ? 'justify-end' : 'justify-start')}>
                                {messageReactions.map((emoji, i) => (
                                  <span
                                    key={i}
                                    className="text-sm bg-card border border-border/50 rounded-full px-1.5 py-0.5 shadow-sm"
                                  >
                                    {emoji}
                                  </span>
                                ))}
                              </div>
                            )}
                          </MessageReactionMenu>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom FAB */}
        <ScrollToBottomFAB
          visible={showScrollFAB}
          onClick={scrollToBottom}
        />
      </div>

      {/* Pinned messages drawer */}
      {conversationId && (
        <PinnedMessagesDrawer
          conversationId={conversationId}
          open={showPinnedDrawer}
          onClose={() => setShowPinnedDrawer(false)}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Typing Indicator & Input */}
      <div className="relative border-t border-border/40 bg-card/80 backdrop-blur-xl shrink-0 chat-input-container">
        {/* Reply banner */}
        {replyTo && (
          <div className="px-3 md:px-4 pt-2 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-primary">
              <ReplyIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
                <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="shrink-0 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-3 md:px-4 pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-medium text-foreground/70">
                {typingUsers.map(u => u.username).join(', ')}
              </span>
              <span>is typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="px-3 md:px-4 pt-2 flex gap-2 flex-wrap">
            {pendingFiles.map((file, i) => {
              const Icon = getFileIcon(file.name);
              return (
                <div key={i} className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 text-xs max-w-[200px]">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                  <button onClick={() => removePendingFile(i)} className="shrink-0 hover:text-destructive ml-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-2 md:p-4 pb-3 md:pb-4 flex gap-1.5 md:gap-3 items-center safe-area-pb">
          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 text-muted-foreground hover:text-foreground touch-manipulation shrink-0 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>

          {/* Camera button */}
          <CameraCapture onCapture={handleCameraCapture} disabled={uploading} />

          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder={replyTo ? 'Type a reply...' : 'Message...'}
            className="flex-1 bg-background/80 border-border/50 focus-visible:ring-primary/30 h-10 md:h-11 text-base rounded-full px-4"
          />

          {/* Voice recorder, schedule, or Send button */}
          {input.trim() || pendingFiles.length > 0 ? (
            <div className="flex items-center gap-0.5">
              {conversationId && input.trim() && (
                <ScheduleMessageDialog
                  conversationId={conversationId}
                  messageContent={input}
                  onScheduled={() => setInput('')}
                />
              )}
              <Button 
                type="submit" 
                size="icon" 
                disabled={!input.trim() && pendingFiles.length === 0}
                className="shrink-0 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-10 w-10 md:h-11 md:w-11 touch-manipulation rounded-full"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={uploading} />
          )}
        </form>
      </div>
    </div>
  );
};
