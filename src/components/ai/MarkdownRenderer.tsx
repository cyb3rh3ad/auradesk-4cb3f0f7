import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div className={cn('space-y-2 text-sm leading-relaxed', className)}>
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
};

interface Block {
  type: 'paragraph' | 'code' | 'heading' | 'list' | 'blockquote' | 'hr';
  content: string;
  language?: string;
  level?: number;
  items?: string[];
  ordered?: boolean;
}

function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: codeLines.join('\n'), language: lang || undefined });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length });
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push({ type: 'hr', content: '' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: quoteLines.join('\n') });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items, ordered: false });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items, ordered: true });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph - collect consecutive lines
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('```') && !lines[i].startsWith('#') && !lines[i].startsWith('> ') && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', content: paraLines.join(' ') });
  }

  return blocks;
}

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'code':
      return <CodeBlock code={block.content} language={block.language} />;
    case 'heading':
      if (block.level === 1) return <h3 className="text-base font-bold mt-3">{renderInline(block.content)}</h3>;
      if (block.level === 2) return <h4 className="text-sm font-bold mt-2">{renderInline(block.content)}</h4>;
      return <h5 className="text-sm font-semibold mt-1.5">{renderInline(block.content)}</h5>;
    case 'hr':
      return <hr className="border-border/50 my-3" />;
    case 'blockquote':
      return (
        <div className="border-l-2 border-primary/40 pl-3 py-1 text-muted-foreground italic">
          {renderInline(block.content)}
        </div>
      );
    case 'list':
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={cn('space-y-1 pl-4', block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items?.map((item, i) => (
            <li key={i} className="text-sm">{renderInline(item)}</li>
          ))}
        </ListTag>
      );
    case 'paragraph':
      return <p className="break-words">{renderInline(block.content)}</p>;
    default:
      return null;
  }
}

function renderInline(text: string): React.ReactNode {
  // Process inline: bold, italic, code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    let match = remaining.match(/^`([^`]+)`/);
    if (match) {
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
          {match[1]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Bold
    match = remaining.match(/^\*\*([^*]+)\*\*/);
    if (match) {
      parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic
    match = remaining.match(/^\*([^*]+)\*/);
    if (match) {
      parts.push(<em key={key++}>{match[1]}</em>);
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Link
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      parts.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
          {match[1]}
        </a>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Regular text - consume until next special char
    const nextSpecial = remaining.search(/[`*\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char that didn't match patterns, treat as text
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{parts}</>;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-border/50 bg-muted/50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 border-b border-border/30">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          {language || 'code'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      {/* Code */}
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs font-mono leading-relaxed whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
