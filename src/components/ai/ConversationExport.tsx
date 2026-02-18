import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface ConversationExportProps {
  messages: Message[];
  sessionTitle?: string;
}

export const ConversationExport = ({ messages, sessionTitle = 'AI Chat' }: ConversationExportProps) => {
  const { toast } = useToast();

  const exportAsMarkdown = () => {
    if (messages.length === 0) {
      toast({ title: 'Nothing to export', description: 'Start a conversation first.', variant: 'destructive' });
      return;
    }

    const date = new Date().toLocaleDateString();
    let md = `# ${sessionTitle}\n\n_Exported on ${date}_\n\n---\n\n`;

    messages.forEach(msg => {
      const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const role = msg.role === 'user' ? '👤 **You**' : '🤖 **Aura**';
      md += `### ${role} _${time}_\n\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Exported!', description: 'Conversation saved as Markdown file.' });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={exportAsMarkdown}
      className="h-8 w-8 md:h-9 md:w-9 shrink-0"
      title="Export conversation"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
};
