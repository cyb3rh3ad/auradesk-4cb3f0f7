import { useNavigate } from 'react-router-dom';
import { MessageSquare, Video, Upload, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const actions = [
  { icon: MessageSquare, label: 'New Chat', path: '/chat', gradient: 'from-gradient-blue to-gradient-blue-end' },
  { icon: Video, label: 'Instant Meet', path: '/meetings', gradient: 'from-gradient-purple to-gradient-purple-end' },
  { icon: Upload, label: 'Upload File', path: '/files', gradient: 'from-gradient-orange to-gradient-orange-end' },
  { icon: Sparkles, label: 'Ask AI', path: '/ai', gradient: 'from-gradient-indigo to-gradient-indigo-end' },
];

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      {actions.map((action, i) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(action.path)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            "bg-gradient-to-r text-primary-foreground shadow-lg shrink-0",
            action.gradient,
            "hover:shadow-xl"
          )}
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </motion.button>
      ))}
    </div>
  );
};
