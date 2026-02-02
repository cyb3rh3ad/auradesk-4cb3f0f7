import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Book, Download, Loader2, Check, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { USER_GUIDE_CONTENT, SUPPORTED_LANGUAGES, LanguageCode } from '@/data/userGuideContent';
import { useToast } from '@/hooks/use-toast';

interface UserGuideDownloadProps {
  variant?: 'button' | 'link';
  className?: string;
}

export const UserGuideDownload = ({ variant = 'button', className }: UserGuideDownloadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleLanguageSelect = async (langCode: LanguageCode) => {
    setSelectedLanguage(langCode);
    setIsTranslating(true);

    try {
      // Call the translation edge function
      const { data, error } = await supabase.functions.invoke('translate-guide', {
        body: {
          content: USER_GUIDE_CONTENT,
          targetLanguage: langCode,
        },
      });

      if (error) throw error;

      const translatedContent = data.translatedContent || USER_GUIDE_CONTENT;
      
      setIsDownloading(true);
      
      // Convert markdown to a downloadable HTML file with nice styling
      const htmlContent = generateStyledHTML(translatedContent, langCode);
      
      // Create and download the file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name || 'English';
      link.download = `AuraDesk_User_Guide_${langName}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started!",
        description: `User guide in ${langName} is being downloaded.`,
      });

      // Close dialog after a moment
      setTimeout(() => {
        setIsOpen(false);
        setSelectedLanguage(null);
      }, 1500);

    } catch (error) {
      console.error('Translation/download error:', error);
      toast({
        title: "Download failed",
        description: "There was an error preparing your guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
      setIsDownloading(false);
    }
  };

  const generateStyledHTML = (markdown: string, langCode: LanguageCode) => {
    // Convert markdown to HTML with basic parsing
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr>')
      // Tables (basic)
      .replace(/\|(.+)\|/gim, (match) => {
        const cells = match.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      })
      // Line breaks
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>');

    // Wrap in paragraphs
    html = `<p>${html}</p>`;

    // Fix list items
    html = html.replace(/<\/li><br>/g, '</li>');
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/g, '');

    const langDir = langCode === 'zh' || langCode === 'ja' ? 'ltr' : 'ltr';
    const fontFamily = langCode === 'zh' ? '"Noto Sans SC", "Microsoft YaHei", sans-serif' :
                       langCode === 'ja' ? '"Noto Sans JP", "Hiragino Sans", sans-serif' :
                       '"Inter", "Segoe UI", system-ui, sans-serif';

    return `<!DOCTYPE html>
<html lang="${langCode}" dir="${langDir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuraDesk User Guide</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: ${fontFamily};
      line-height: 1.7;
      color: #1a1a2e;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
      padding: 3rem 4rem;
    }
    
    .header {
      text-align: center;
      padding-bottom: 2rem;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 2rem;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      border-radius: 20px;
      margin: 0 auto 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
      font-weight: bold;
    }
    
    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }
    
    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1a1a2e;
      margin: 2.5rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #8b5cf6;
    }
    
    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #374151;
      margin: 1.5rem 0 0.75rem;
    }
    
    p {
      margin: 1rem 0;
      color: #4b5563;
    }
    
    ul, ol {
      margin: 1rem 0;
      padding-left: 2rem;
    }
    
    li {
      margin: 0.5rem 0;
      color: #4b5563;
    }
    
    strong {
      font-weight: 600;
      color: #1a1a2e;
    }
    
    code {
      background: #f3f4f6;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 0.9em;
      color: #8b5cf6;
    }
    
    a {
      color: #8b5cf6;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;
    }
    
    a:hover {
      border-bottom-color: #8b5cf6;
    }
    
    hr {
      border: none;
      height: 2px;
      background: linear-gradient(to right, transparent, #e5e7eb, transparent);
      margin: 2rem 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    th, td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #8b5cf6;
      color: white;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    tr:hover {
      background: #f3f4f6;
    }
    
    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 0.9rem;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        padding: 2rem;
      }
    }
    
    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }
      
      .container {
        padding: 2rem;
      }
      
      h1 {
        font-size: 2rem;
      }
      
      h2 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">A</div>
    </div>
    ${html}
    <div class="footer">
      <p>© 2026 AuraDesk. All rights reserved.</p>
      <p>Contact: info.auradesk@gmail.com</p>
    </div>
  </div>
</body>
</html>`;
  };

  return (
    <>
      {variant === 'button' ? (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className={`gap-2 ${className}`}
        >
          <Book className="w-4 h-4" />
          User Guide
        </Button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
        >
          <Book className="w-4 h-4" />
          User Guide
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="guide-download-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Download User Guide
            </DialogTitle>
          </DialogHeader>
          
          <div id="guide-download-description" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Select your preferred language to download the comprehensive AuraDesk user guide.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <motion.button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  disabled={isTranslating || isDownloading}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                    ${selectedLanguage === lang.code 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  whileHover={{ scale: selectedLanguage === lang.code ? 1 : 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lang.name}</p>
                    <p className="text-xs text-muted-foreground">{lang.nativeName}</p>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {selectedLanguage === lang.code && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex items-center gap-1"
                      >
                        {isTranslating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-xs text-primary">
                              {lang.code === 'en' ? 'Preparing...' : 'Translating...'}
                            </span>
                          </>
                        ) : isDownloading ? (
                          <>
                            <Download className="w-4 h-4 text-primary animate-bounce" />
                            <span className="text-xs text-primary">Downloading...</span>
                          </>
                        ) : (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              The guide will be downloaded as an HTML file that you can open in any browser or print to PDF.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
