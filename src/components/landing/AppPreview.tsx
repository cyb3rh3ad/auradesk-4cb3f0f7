import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  MessageSquare, 
  Video, 
  Brain, 
  Users, 
  FileText, 
  Bell,
  Search,
  Send,
  Mic,
  Sparkles,
  Play,
  Pause,
  Monitor,
  Calendar,
  Upload,
  FolderOpen,
  Plus,
  Settings,
  Hash,
  Volume2,
  Shield,
  Zap
} from 'lucide-react';

type ViewType = 'chat' | 'video' | 'teams' | 'ai' | 'files';

interface ViewConfig {
  icon: typeof MessageSquare;
  label: string;
  gradient: string;
}

const viewConfigs: Record<ViewType, ViewConfig> = {
  chat: { icon: MessageSquare, label: 'Messages', gradient: 'from-violet-500 to-blue-500' },
  video: { icon: Video, label: 'Meetings', gradient: 'from-purple-500 to-pink-500' },
  teams: { icon: Users, label: 'Teams', gradient: 'from-emerald-500 to-teal-500' },
  ai: { icon: Brain, label: 'AI Assistant', gradient: 'from-orange-500 to-red-500' },
  files: { icon: FileText, label: 'Files', gradient: 'from-indigo-500 to-blue-500' },
};

const ChatView = () => (
  <div className="flex h-full">
    {/* Chat list */}
    <div className="w-48 md:w-64 bg-background/30 border-r border-border/50 flex flex-col">
      <div className="p-3 border-b border-border/50">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Search...</span>
        </motion.div>
      </div>
      <div className="flex-1 overflow-hidden p-2 space-y-1">
        {[
          { name: 'Design Team', msg: 'New mockups ready!', unread: 3 },
          { name: 'Alex Chen', msg: 'Sounds good 👍', unread: 0 },
          { name: 'Product Team', msg: 'Meeting in 10 mins', unread: 1 },
          { name: 'Sarah Miller', msg: 'Can you review this?', unread: 0 },
        ].map((chat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
              index === 0 ? 'bg-primary/10' : 'hover:bg-muted/50'
            }`}
          >
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
              {chat.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0 hidden md:block">
              <p className="text-xs font-medium truncate">{chat.name}</p>
              <p className="text-xs text-muted-foreground truncate">{chat.msg}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {chat.unread}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>

    {/* Main chat area */}
    <div className="flex-1 flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between px-4 py-3 border-b border-border/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
            DT
          </div>
          <div>
            <p className="text-sm font-medium">Design Team</p>
            <p className="text-xs text-muted-foreground">5 members online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer">
            <Video className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer">
            <Bell className="w-4 h-4" />
          </div>
        </div>
      </motion.div>

      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {[
          { name: 'Sarah', msg: 'Just uploaded the new dashboard mockups! 🎨', time: '2:34 PM' },
          { name: 'You', msg: 'These look amazing! Love the color scheme.', time: '2:35 PM', isMe: true },
          { name: 'Alex', msg: 'The AI summary feature is really clean', time: '2:36 PM' },
        ].map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`flex gap-2 ${message.isMe ? 'justify-end' : ''}`}
          >
            {!message.isMe && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                {message.name[0]}
              </div>
            )}
            <div className={`max-w-[70%] ${message.isMe ? 'order-first' : ''}`}>
              {!message.isMe && (
                <p className="text-xs text-muted-foreground mb-1">{message.name}</p>
              )}
              <div className={`px-3 py-2 rounded-xl text-sm ${
                message.isMe 
                  ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white' 
                  : 'bg-muted/50'
              }`}>
                {message.msg}
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">{message.time}</p>
            </div>
          </motion.div>
        ))}

        {/* AI typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="px-3 py-2 rounded-xl bg-muted/50">
            <div className="flex gap-1">
              {[0, 0.2, 0.4].map((delay, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">AI is summarizing...</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 border-t border-border/50"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            readOnly
          />
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-background/50 cursor-pointer">
              <Mic className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground cursor-pointer">
              <Send className="w-4 h-4" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const VideoView = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div>
        <p className="text-sm font-medium">Weekly Team Standup</p>
        <p className="text-xs text-muted-foreground">In progress • 00:15:32</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 cursor-pointer">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>
    </div>

    <div className="flex-1 p-4 grid grid-cols-2 gap-3">
      {[
        { name: 'You', speaking: true },
        { name: 'Alex Chen', speaking: false },
        { name: 'Sarah Miller', speaking: false },
        { name: 'James Wilson', speaking: true },
      ].map((participant, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`relative rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center ${
            participant.speaking ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-medium">
            {participant.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full truncate">{participant.name}</span>
            {participant.speaking && (
              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <Mic className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>

    <div className="p-3 border-t border-border/50 flex items-center justify-center gap-3">
      {[
        { icon: Mic, active: true },
        { icon: Video, active: true },
        { icon: Monitor, active: false },
      ].map((control, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
            control.active ? 'bg-muted/50 text-foreground' : 'bg-red-500/20 text-red-500'
          }`}
        >
          <control.icon className="w-5 h-5" />
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white cursor-pointer ml-2"
      >
        <Pause className="w-5 h-5" />
      </motion.div>
    </div>
  </div>
);

const TeamsView = () => (
  <div className="flex h-full">
    {/* Team channels sidebar */}
    <div className="w-48 md:w-56 bg-background/30 border-r border-border/50 flex flex-col">
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
            DT
          </div>
          <span className="text-sm font-medium">Design Team</span>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-3 overflow-hidden">
        <div>
          <p className="text-xs text-muted-foreground px-2 mb-1 uppercase tracking-wider">Text Channels</p>
          {['general', 'design-reviews', 'resources'].map((channel, index) => (
            <motion.div
              key={channel}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer ${
                index === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span className="text-sm">{channel}</span>
            </motion.div>
          ))}
        </div>
        <div>
          <p className="text-xs text-muted-foreground px-2 mb-1 uppercase tracking-wider">Voice Channels</p>
          {[{ name: 'Lounge', users: 2 }, { name: 'Meeting Room', users: 0 }].map((channel, index) => (
            <motion.div
              key={channel.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 3) * 0.1 }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-sm flex-1">{channel.name}</span>
              {channel.users > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{channel.users}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>

    {/* Channel content */}
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Hash className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">general</span>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-hidden">
        {[
          { user: 'Sarah', msg: 'Hey team! New brand guidelines are ready 📄' },
          { user: 'Alex', msg: 'Awesome! Will review them today' },
          { user: 'You', msg: 'Great work everyone!', isMe: true },
        ].map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className="flex gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs flex-shrink-0">
              {message.user[0]}
            </div>
            <div>
              <p className="text-xs font-medium">{message.user} <span className="text-muted-foreground font-normal">2:30 PM</span></p>
              <p className="text-sm">{message.msg}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

const AIView = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <span className="font-medium">AI Assistant</span>
      </div>
      <div className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs">Online</div>
    </div>

    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 justify-end"
      >
        <div className="max-w-[80%] px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm">
          Can you summarize the key points from today's meeting?
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="max-w-[80%] px-3 py-2 rounded-xl bg-muted/50 text-sm space-y-2">
          <p className="font-medium">📋 Meeting Summary:</p>
          <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
            <li>Q4 roadmap finalized</li>
            <li>New design system approved</li>
            <li>Launch date set for Dec 15</li>
            <li>Next review: Friday 3PM</li>
          </ul>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2 justify-end"
      >
        <div className="max-w-[80%] px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm">
          Generate action items for each team member
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-2"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        </div>
        <div className="px-3 py-2 rounded-xl bg-muted/50 flex items-center gap-2">
          <span className="text-sm">Generating...</span>
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((delay, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, delay }}
                className="w-1.5 h-1.5 rounded-full bg-orange-500"
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>

    <div className="p-3 border-t border-border/50">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
        <input
          type="text"
          placeholder="Ask AI anything..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          readOnly
        />
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white cursor-pointer">
          <Send className="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
);

const FilesView = () => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
      <div className="flex items-center gap-2">
        <FolderOpen className="w-5 h-5 text-primary" />
        <span className="font-medium">My Files</span>
      </div>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary cursor-pointer">
        <Upload className="w-4 h-4" />
      </div>
    </div>

    <div className="flex-1 p-4 space-y-2 overflow-hidden">
      {[
        { name: 'Q4_Presentation.pptx', size: '2.4 MB', icon: '📊', color: 'from-orange-500 to-red-500' },
        { name: 'Brand_Guidelines.pdf', size: '8.1 MB', icon: '📄', color: 'from-red-500 to-pink-500' },
        { name: 'Meeting_Notes.docx', size: '156 KB', icon: '📝', color: 'from-blue-500 to-indigo-500' },
        { name: 'Project_Assets.zip', size: '45.2 MB', icon: '📦', color: 'from-violet-500 to-purple-500' },
        { name: 'Team_Photo.jpg', size: '3.8 MB', icon: '🖼️', color: 'from-emerald-500 to-teal-500' },
      ].map((file, index) => (
        <motion.div
          key={file.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        >
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${file.color} flex items-center justify-center text-lg`}>
            {file.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{file.size}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <div className="p-3 border-t border-border/50">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>5 files • 59.7 MB used</span>
        <span className="text-primary cursor-pointer hover:underline">View all</span>
      </div>
    </div>
  </div>
);

// Simple mobile-friendly feature showcase
const MobileFeatureShowcase = () => {
  const features = [
    { icon: MessageSquare, label: 'Real-time Chat', gradient: 'from-violet-500 to-blue-500' },
    { icon: Video, label: 'HD Video Calls', gradient: 'from-purple-500 to-pink-500' },
    { icon: Users, label: 'Team Channels', gradient: 'from-emerald-500 to-teal-500' },
    { icon: Brain, label: 'AI Assistant', gradient: 'from-orange-500 to-red-500' },
    { icon: FileText, label: 'File Sharing', gradient: 'from-indigo-500 to-blue-500' },
    { icon: Shield, label: 'Secure & Private', gradient: 'from-rose-500 to-pink-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto max-w-md px-4"
    >
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-blue-500/10 blur-2xl rounded-3xl" />
      
      <div className="relative grid grid-cols-2 gap-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2 text-center"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium">{feature.label}</span>
          </motion.div>
        ))}
      </div>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-muted-foreground mt-4"
      >
        ✨ All features included in one platform
      </motion.p>
    </motion.div>
  );
};

export const AppPreview = () => {
  const isMobile = useIsMobile();
  const [activeView, setActiveView] = useState<ViewType>('chat');

  const views: { type: ViewType; icon: typeof MessageSquare }[] = [
    { type: 'chat', icon: MessageSquare },
    { type: 'video', icon: Video },
    { type: 'teams', icon: Users },
    { type: 'ai', icon: Brain },
    { type: 'files', icon: FileText },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'chat': return <ChatView />;
      case 'video': return <VideoView />;
      case 'teams': return <TeamsView />;
      case 'ai': return <AIView />;
      case 'files': return <FilesView />;
      default: return <ChatView />;
    }
  };

  // Show simplified feature grid on mobile instead of complex interactive preview
  if (isMobile) {
    return <MobileFeatureShowcase />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto max-w-5xl"
    >
      {/* Glow effect behind the preview */}
      <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-blue-500/20 blur-3xl rounded-3xl" />
      
      {/* Main app mockup container */}
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Window controls */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 bg-background/50 rounded-md text-xs text-muted-foreground">
              AuraDesk — {viewConfigs[activeView].label}
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="flex h-[400px]">
          {/* Sidebar */}
          <div className="w-20 bg-muted/30 border-r border-border/50 flex flex-col items-center py-4 gap-3">
            {views.map((view, index) => (
              <motion.button
                key={view.type}
                onClick={() => setActiveView(view.type)}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  activeView === view.type
                    ? `bg-gradient-to-br ${viewConfigs[view.type].gradient} text-white shadow-lg`
                    : 'bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                <view.icon className="w-6 h-6" />
              </motion.button>
            ))}
          </div>

          {/* Main content area with animation */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-muted-foreground mt-4"
      >
        👆 Click the sidebar icons to explore different features
      </motion.p>
    </motion.div>
  );
};
