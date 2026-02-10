import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface VoiceMessagePlayerProps {
  url: string;
  duration?: number;
  isOwn: boolean;
}

export const VoiceMessagePlayer = ({ url, duration, isOwn }: VoiceMessagePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setTotalDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audio.pause();
      audio.src = '';
    };
  }, [url]);

  const updateProgress = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (audio.duration) {
      setProgress(audio.currentTime / audio.duration);
      setCurrentTime(audio.currentTime);
    }
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      audioRef.current.play();
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Generate static waveform bars
  const bars = 20;
  const waveformHeights = useRef(
    Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8)
  ).current;

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[260px]">
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isOwn 
            ? "bg-white/20 hover:bg-white/30 text-primary-foreground" 
            : "bg-primary/15 hover:bg-primary/25 text-primary"
        )}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-6">
          {waveformHeights.map((h, i) => {
            const barProgress = i / bars;
            const isActive = barProgress <= progress;
            return (
              <motion.div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors duration-150",
                  isOwn
                    ? isActive ? "bg-white/90" : "bg-white/30"
                    : isActive ? "bg-primary" : "bg-primary/25"
                )}
                style={{ height: `${h * 100}%`, minHeight: 3 }}
                animate={isPlaying && isActive ? { scaleY: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3, repeat: Infinity }}
              />
            );
          })}
        </div>
        <span className={cn(
          "text-[10px]",
          isOwn ? "text-white/60" : "text-muted-foreground"
        )}>
          {formatTime(isPlaying ? currentTime : totalDuration)}
        </span>
      </div>
    </div>
  );
};
