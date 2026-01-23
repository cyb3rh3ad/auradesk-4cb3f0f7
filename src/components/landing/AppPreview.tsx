import { motion } from 'framer-motion';
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
  Camera,
  ScreenShare,
  Sparkles
} from 'lucide-react';

export const AppPreview = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto max-w-5xl mt-12 md:mt-16"
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
              AuraDesk
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="flex h-[350px] md:h-[400px]">
          {/* Sidebar */}
          <div className="w-16 md:w-20 bg-muted/30 border-r border-border/50 flex flex-col items-center py-4 gap-3">
            {[
              { icon: MessageSquare, active: true, delay: 0.5 },
              { icon: Video, active: false, delay: 0.6 },
              { icon: Users, active: false, delay: 0.7 },
              { icon: Brain, active: false, delay: 0.8 },
              { icon: FileText, active: false, delay: 0.9 },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: item.delay }}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${
                  item.active 
                    ? 'bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/30' 
                    : 'bg-background/50 text-muted-foreground hover:bg-background'
                }`}
              >
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </motion.div>
            ))}
          </div>

          {/* Chat list */}
          <div className="w-48 md:w-64 bg-background/30 border-r border-border/50 flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-border/50">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Search...</span>
              </motion.div>
            </div>

            {/* Chat items */}
            <div className="flex-1 overflow-hidden p-2 space-y-1">
              {[
                { name: 'Design Team', msg: 'New mockups ready!', unread: 3, delay: 0.7 },
                { name: 'Alex Chen', msg: 'Sounds good 👍', unread: 0, delay: 0.8 },
                { name: 'Product Team', msg: 'Meeting in 10 mins', unread: 1, delay: 0.9 },
                { name: 'Sarah Miller', msg: 'Can you review this?', unread: 0, delay: 1.0 },
              ].map((chat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: chat.delay }}
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
            {/* Chat header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
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

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
              {[
                { name: 'Sarah', msg: 'Just uploaded the new dashboard mockups! 🎨', time: '2:34 PM', delay: 1.0 },
                { name: 'You', msg: 'These look amazing! Love the color scheme.', time: '2:35 PM', isMe: true, delay: 1.2 },
                { name: 'Alex', msg: 'The AI summary feature is really clean', time: '2:36 PM', delay: 1.4 },
              ].map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: message.delay }}
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
                transition={{ delay: 1.8 }}
                className="flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="px-3 py-2 rounded-xl bg-muted/50">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">AI is summarizing...</span>
              </motion.div>
            </div>

            {/* Input area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
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
      </div>

      {/* Floating feature badges */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute -left-4 top-20 hidden lg:flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur border border-border/50 rounded-full shadow-lg"
      >
        <Video className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">HD Video Calls</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.7, duration: 0.5 }}
        className="absolute -right-4 top-32 hidden lg:flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur border border-border/50 rounded-full shadow-lg"
      >
        <Brain className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">AI Powered</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.5 }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-card/90 backdrop-blur border border-border/50 rounded-full shadow-lg"
      >
        <ScreenShare className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">Screen Sharing & Remote Support</span>
      </motion.div>
    </motion.div>
  );
};
