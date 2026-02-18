import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewProps {
  url: string;
  isOwn: boolean;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

// Simple client-side preview using og:image heuristics
// We can't fetch arbitrary sites due to CORS, so we use known patterns
const getPreviewFromUrl = (url: string): PreviewData | null => {
  try {
    const u = new URL(url);
    const domain = u.hostname.replace('www.', '');
    
    // YouTube
    if (domain === 'youtube.com' || domain === 'youtu.be') {
      const videoId = domain === 'youtu.be' 
        ? u.pathname.slice(1) 
        : u.searchParams.get('v');
      if (videoId) {
        return {
          title: 'YouTube Video',
          siteName: 'YouTube',
          image: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        };
      }
    }
    
    // GitHub
    if (domain === 'github.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return {
          title: `${parts[0]}/${parts[1]}`,
          siteName: 'GitHub',
          image: `https://opengraph.githubassets.com/1/${parts[0]}/${parts[1]}`,
        };
      }
    }

    // Generic fallback — show domain
    return {
      title: domain,
      siteName: domain.charAt(0).toUpperCase() + domain.slice(1),
    };
  } catch {
    return null;
  }
};

export const LinkPreview = ({ url, isOwn }: LinkPreviewProps) => {
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    const data = getPreviewFromUrl(url);
    if (data) setPreview(data);
  }, [url]);

  if (!preview) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block mt-1.5 rounded-lg overflow-hidden border transition-opacity hover:opacity-90',
        isOwn ? 'border-white/20' : 'border-border/50'
      )}
    >
      {preview.image && (
        <img 
          src={preview.image} 
          alt="" 
          className="w-full h-32 object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className={cn(
        'px-3 py-2 text-xs',
        isOwn ? 'bg-white/10' : 'bg-muted/40'
      )}>
        {preview.siteName && (
          <p className={cn('font-medium mb-0.5 flex items-center gap-1', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            <ExternalLink className="w-3 h-3" />
            {preview.siteName}
          </p>
        )}
        {preview.title && (
          <p className={cn('font-semibold truncate', isOwn ? 'text-primary-foreground' : 'text-foreground')}>
            {preview.title}
          </p>
        )}
      </div>
    </a>
  );
};
