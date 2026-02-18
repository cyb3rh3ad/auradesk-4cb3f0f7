import React from 'react';

/**
 * Renders inline markdown-lite formatting:
 * **bold**, *italic*, ~~strikethrough~~, `code`, and ```code blocks```
 * Also auto-links URLs and renders link previews.
 */

const URL_REGEX = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/g;

// Inline formatting: bold, italic, strikethrough, inline code
function formatInline(text: string): React.ReactNode[] {
  // Process inline code first (highest precedence)
  const parts: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Split by inline code
  const codeSegments: { type: 'text' | 'code'; value: string }[] = [];
  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      codeSegments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    codeSegments.push({ type: 'code', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    codeSegments.push({ type: 'text', value: text.slice(lastIndex) });
  }
  if (codeSegments.length === 0) {
    codeSegments.push({ type: 'text', value: text });
  }

  codeSegments.forEach((seg, i) => {
    if (seg.type === 'code') {
      parts.push(
        <code key={`c-${i}`} className="px-1.5 py-0.5 rounded bg-muted text-[13px] font-mono">
          {seg.value}
        </code>
      );
    } else {
      // Process bold, italic, strikethrough on text segments
      parts.push(...formatRichText(seg.value, i));
    }
  });

  return parts;
}

function formatRichText(text: string, keyPrefix: number): React.ReactNode[] {
  // Combined regex for **bold**, *italic*, ~~strike~~
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(~~(.+?)~~)/g;
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      nodes.push(...linkifyText(text.slice(lastIdx, m.index), `${keyPrefix}-${lastIdx}`));
    }
    if (m[1]) {
      // Bold
      nodes.push(<strong key={`b-${keyPrefix}-${m.index}`}>{m[2]}</strong>);
    } else if (m[3]) {
      // Italic
      nodes.push(<em key={`i-${keyPrefix}-${m.index}`}>{m[4]}</em>);
    } else if (m[5]) {
      // Strikethrough
      nodes.push(<del key={`s-${keyPrefix}-${m.index}`} className="opacity-60">{m[6]}</del>);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    nodes.push(...linkifyText(text.slice(lastIdx), `${keyPrefix}-${lastIdx}`));
  }
  if (nodes.length === 0) {
    nodes.push(...linkifyText(text, `${keyPrefix}-full`));
  }
  return nodes;
}

function linkifyText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_REGEX.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    const url = match[1];
    nodes.push(
      <a
        key={`link-${keyPrefix}-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
      >
        {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50)}{url.length > 60 ? '…' : ''}
      </a>
    );
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }
  if (nodes.length === 0 && text) {
    nodes.push(text);
  }
  return nodes;
}

/** Check if a message has a code block (triple backtick) */
function hasCodeBlock(content: string): boolean {
  return /```[\s\S]*?```/.test(content);
}

/**
 * Main render function: takes raw message text and returns formatted React nodes.
 */
export function renderFormattedMessage(content: string): React.ReactNode {
  // Handle code blocks first
  if (hasCodeBlock(content)) {
    const blockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        // Process text before code block
        const before = content.slice(lastIdx, match.index);
        before.split('\n').forEach((line, i) => {
          if (i > 0) parts.push(<br key={`br-${lastIdx}-${i}`} />);
          parts.push(...formatInline(line));
        });
      }
      parts.push(
        <pre key={`pre-${match.index}`} className="mt-1 mb-1 p-2 rounded-lg bg-muted/60 text-[13px] font-mono overflow-x-auto whitespace-pre-wrap">
          <code>{match[1]}</code>
        </pre>
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < content.length) {
      const after = content.slice(lastIdx);
      after.split('\n').forEach((line, i) => {
        if (i > 0) parts.push(<br key={`br-end-${i}`} />);
        parts.push(...formatInline(line));
      });
    }
    return <>{parts}</>;
  }

  // No code blocks — process line by line
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) nodes.push(<br key={`br-${i}`} />);
    
    // Bullet list support
    const bulletMatch = line.match(/^(\s*)([-•])\s+(.+)/);
    if (bulletMatch) {
      nodes.push(
        <span key={`li-${i}`} className="flex items-start gap-1.5">
          <span className="text-muted-foreground select-none">•</span>
          <span>{formatInline(bulletMatch[3])}</span>
        </span>
      );
    } else {
      nodes.push(...formatInline(line));
    }
  });

  return <>{nodes}</>;
}

/**
 * Extract the first URL from a message for link preview purposes.
 */
export function extractFirstUrl(content: string): string | null {
  const match = content.match(URL_REGEX);
  return match ? match[0] : null;
}
