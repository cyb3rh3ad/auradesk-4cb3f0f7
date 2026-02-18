import { Mail, Code, FileText, Lightbulb, MessageCircle, Presentation, BookOpen, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const templates = [
  {
    icon: Mail,
    label: 'Draft Email',
    prompt: 'Help me write a professional email about: ',
    color: 'text-blue-500',
  },
  {
    icon: Code,
    label: 'Code Review',
    prompt: 'Review this code and suggest improvements:\n\n```\n\n```',
    color: 'text-green-500',
  },
  {
    icon: FileText,
    label: 'Meeting Summary',
    prompt: 'Summarize the following meeting notes into key points and action items:\n\n',
    color: 'text-orange-500',
  },
  {
    icon: Lightbulb,
    label: 'Brainstorm',
    prompt: 'Help me brainstorm creative solutions for: ',
    color: 'text-yellow-500',
  },
  {
    icon: MessageCircle,
    label: 'Reply Helper',
    prompt: 'Help me draft a thoughtful response to this message:\n\n',
    color: 'text-purple-500',
  },
  {
    icon: Presentation,
    label: 'Presentation',
    prompt: 'Create a presentation outline with key slides for: ',
    color: 'text-pink-500',
  },
  {
    icon: BookOpen,
    label: 'Explain Topic',
    prompt: 'Explain the following topic in simple terms: ',
    color: 'text-cyan-500',
  },
  {
    icon: Zap,
    label: 'Quick Task',
    prompt: 'Help me quickly accomplish this task: ',
    color: 'text-amber-500',
  },
];

interface PromptTemplatesProps {
  onSelect: (prompt: string) => void;
}

export const PromptTemplates = ({ onSelect }: PromptTemplatesProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {templates.map((t, i) => (
        <motion.button
          key={t.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelect(t.prompt)}
          className={cn(
            "flex items-center gap-2 p-2.5 rounded-xl text-left text-xs font-medium",
            "border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30",
            "transition-all duration-200 hover:shadow-md group"
          )}
        >
          <t.icon className={cn("w-4 h-4 shrink-0", t.color)} />
          <span className="truncate group-hover:text-foreground text-muted-foreground">{t.label}</span>
        </motion.button>
      ))}
    </div>
  );
};
