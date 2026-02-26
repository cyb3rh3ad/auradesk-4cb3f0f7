import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize2, Minimize2, Timer, Music2, Headphones, 
  TreePine, CloudRain, Coffee, Moon, Waves, Wind,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { toast } from 'sonner';

// ── Preset playlists using royalty-free/embeddable YouTube streams ──
interface Playlist {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  // YouTube video IDs for looping ambient music
  tracks: { title: string; youtubeId: string }[];
  // Spotify playlist URI for embed
  spotifyUri?: string;
}

const PLAYLISTS: Playlist[] = [
  {
    id: 'lofi',
    name: 'Lo-Fi Chill',
    description: 'Mellow beats for deep work',
    icon: Headphones,
    color: 'from-violet-500/20 to-indigo-600/20',
    tracks: [
      { title: 'Lofi Hip Hop Radio', youtubeId: 'jfKfPfyJRdk' },
      { title: 'Chill Lofi Mix', youtubeId: '5qap5aO4i9A' },
      { title: 'Coffee Shop Vibes', youtubeId: '2gliGzb2_1I' },
    ],
    spotifyUri: '37i9dQZF1DWWQRwui0ExPn',
  },
  {
    id: 'classical',
    name: 'Classical Focus',
    description: 'Timeless compositions for clarity',
    icon: Music2,
    color: 'from-amber-500/20 to-orange-600/20',
    tracks: [
      { title: 'Classical Music for Studying', youtubeId: 'mIYzp5rcTvU' },
      { title: 'Mozart for Brain Power', youtubeId: 'tT9gT5bqi6Y' },
      { title: 'Bach - Goldberg Variations', youtubeId: 'Ah392lnFHnM' },
    ],
    spotifyUri: '37i9dQZF1DWZZbwlv3Vmta',
  },
  {
    id: 'nature',
    name: 'Nature Sounds',
    description: 'Rain, forest & ocean ambience',
    icon: TreePine,
    color: 'from-emerald-500/20 to-green-600/20',
    tracks: [
      { title: 'Rain Sounds', youtubeId: 'mPZkdNFkNps' },
      { title: 'Forest Ambience', youtubeId: 'xNN7iTA57jM' },
      { title: 'Ocean Waves', youtubeId: 'WHPEKLQID4U' },
    ],
  },
  {
    id: 'ambient',
    name: 'Deep Ambient',
    description: 'Spacious drones & textures',
    icon: Moon,
    color: 'from-blue-500/20 to-cyan-600/20',
    tracks: [
      { title: 'Space Ambient', youtubeId: 'S_MOd40zlYU' },
      { title: 'Deep Focus Music', youtubeId: 'Dx5qFachd3A' },
      { title: 'Ambient Meditation', youtubeId: '7cTPuO65jBo' },
    ],
    spotifyUri: '37i9dQZF1DX3Ogo9pFvBkY',
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz',
    description: 'Warm jazz for relaxed focus',
    icon: Coffee,
    color: 'from-rose-500/20 to-pink-600/20',
    tracks: [
      { title: 'Jazz for Work & Study', youtubeId: 'Dx5qFachd3A' },
      { title: 'Smooth Jazz Radio', youtubeId: 'DSGyEsJ17cI' },
      { title: 'Café Jazz', youtubeId: 'fEvM-OUbaKs' },
    ],
    spotifyUri: '37i9dQZF1DX0SM0LYsmbMT',
  },
];

// ── Streaming service options ──
interface StreamingService {
  id: string;
  name: string;
  icon: string;
  color: string;
  urlPattern: RegExp;
  embedUrl: (id: string) => string;
  placeholder: string;
}

const STREAMING_SERVICES: StreamingService[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🟢',
    color: 'from-green-500/20 to-green-600/20',
    urlPattern: /(?:spotify\.com\/(?:playlist|album|track)\/|spotify:(?:playlist|album|track):)([a-zA-Z0-9]+)/,
    embedUrl: (id) => `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`,
    placeholder: 'Paste Spotify playlist URL...',
  },
  {
    id: 'youtube',
    name: 'YouTube Music',
    icon: '🔴',
    color: 'from-red-500/20 to-red-600/20',
    urlPattern: /(?:youtube\.com\/(?:watch\?v=|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    embedUrl: (id) => `https://www.youtube.com/embed/${id}?autoplay=1&loop=1`,
    placeholder: 'Paste YouTube video or playlist URL...',
  },
  {
    id: 'apple',
    name: 'Apple Music',
    icon: '🍎',
    color: 'from-pink-500/20 to-red-500/20',
    urlPattern: /music\.apple\.com\/[a-z]{2}\/(?:playlist|album)\/[^/]+\/([a-z0-9.]+)/i,
    embedUrl: (id) => `https://embed.music.apple.com/us/playlist/${id}`,
    placeholder: 'Paste Apple Music playlist URL...',
  },
];

// ── Pomodoro Timer ──
const TIMER_PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function FocusRoom() {
  const { setManualStatus } = usePresenceContext();
  
  // ── State ──
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Streaming service
  const [streamingUrl, setStreamingUrl] = useState('');
  const [activeEmbed, setActiveEmbed] = useState<string | null>(null);
  const [activeServiceName, setActiveServiceName] = useState<string | null>(null);
  
  // Timer
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPreset, setTimerPreset] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // YouTube player ref
  const playerRef = useRef<HTMLIFrameElement>(null);

  // ── Enter DND on mount, restore on unmount ──
  useEffect(() => {
    setManualStatus('dnd');
    toast('🎯 Focus mode activated', { description: 'All notifications silenced.' });
    
    return () => {
      setManualStatus('online');
    };
  }, []);

  // ── Timer logic ──
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            toast.success('⏰ Focus session complete!', { description: 'Great work! Take a break.' });
            // Play a gentle notification
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 528;
              osc.type = 'sine';
              gain.gain.value = 0.15;
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
              osc.stop(ctx.currentTime + 2);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // ── Player controls ──
  const playPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentTrackIndex(0);
    setIsPlaying(true);
    setActiveEmbed(null);
    setActiveServiceName(null);
  };

  const nextTrack = () => {
    if (!selectedPlaylist) return;
    setCurrentTrackIndex(prev => (prev + 1) % selectedPlaylist.tracks.length);
  };

  const prevTrack = () => {
    if (!selectedPlaylist) return;
    setCurrentTrackIndex(prev => prev === 0 ? selectedPlaylist.tracks.length - 1 : prev - 1);
  };

  const currentTrack = selectedPlaylist?.tracks[currentTrackIndex];

  // ── Streaming URL handler ──
  const handleStreamingSubmit = () => {
    if (!streamingUrl.trim()) return;
    
    for (const service of STREAMING_SERVICES) {
      const match = streamingUrl.match(service.urlPattern);
      if (match) {
        setActiveEmbed(service.embedUrl(match[1]));
        setActiveServiceName(service.name);
        setSelectedPlaylist(null);
        setIsPlaying(false);
        toast.success(`Connected to ${service.name}`);
        return;
      }
    }
    
    toast.error('Could not recognize that URL', { description: 'Try pasting a Spotify, YouTube, or Apple Music link.' });
  };

  // ── YouTube embed URL ──
  const youtubeEmbedUrl = currentTrack 
    ? `https://www.youtube.com/embed/${currentTrack.youtubeId}?autoplay=${isPlaying ? 1 : 0}&loop=1&playlist=${currentTrack.youtubeId}&controls=0&modestbranding=1&rel=0`
    : null;

  // Timer progress
  const currentPreset = TIMER_PRESETS[timerPreset];
  const timerProgress = currentPreset ? ((currentPreset.seconds - timerSeconds) / currentPreset.seconds) * 100 : 0;

  return (
    <div className={cn(
      "h-full flex flex-col bg-background overflow-hidden transition-all duration-500",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* Ambient background effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 md:px-8 py-4 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <h1 className="text-lg font-semibold text-foreground">Focus Room</h1>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">DND Active</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* ── Pomodoro Timer ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              {/* Timer ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" strokeWidth="4" className="stroke-muted/30" />
                <motion.circle 
                  cx="60" cy="60" r="54" fill="none" strokeWidth="4"
                  className="stroke-primary"
                  strokeLinecap="round"
                  strokeDasharray={339.292}
                  animate={{ strokeDashoffset: 339.292 - (339.292 * timerProgress / 100) }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl md:text-5xl font-mono font-bold text-foreground tracking-tight">
                  {formatTime(timerSeconds)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {timerActive ? 'focusing...' : 'ready'}
                </span>
              </div>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-2">
              {TIMER_PRESETS.map((preset, i) => (
                <Button
                  key={preset.seconds}
                  variant={timerPreset === i ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setTimerPreset(i);
                    setTimerSeconds(preset.seconds);
                    setTimerActive(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Button 
              onClick={() => {
                if (timerSeconds === 0) {
                  setTimerSeconds(TIMER_PRESETS[timerPreset].seconds);
                }
                setTimerActive(!timerActive);
              }}
              variant={timerActive ? 'destructive' : 'default'}
              className="gap-2"
            >
              <Timer className="w-4 h-4" />
              {timerActive ? 'Pause' : timerSeconds === 0 ? 'Restart' : 'Start Focus'}
            </Button>
          </motion.div>

          {/* ── Playlist Selection ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Music2 className="w-4 h-4" />
              Ambient Playlists
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLAYLISTS.map((playlist) => {
                const Icon = playlist.icon;
                const isActive = selectedPlaylist?.id === playlist.id;
                return (
                  <motion.button
                    key={playlist.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => playPlaylist(playlist)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 text-center",
                      isActive 
                        ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10" 
                        : "border-border/30 bg-card/50 hover:border-border/60 hover:bg-card/80"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      playlist.color
                    )}>
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{playlist.name}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{playlist.description}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activePlaylist"
                        className="absolute inset-0 border-2 border-primary/40 rounded-2xl"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Streaming Service Connect ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Connect Your Music
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={streamingUrl}
                  onChange={(e) => setStreamingUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStreamingSubmit()}
                  placeholder="Paste a Spotify, YouTube, or Apple Music link..."
                  className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
              <Button onClick={handleStreamingSubmit} variant="outline" className="gap-2 shrink-0">
                <Headphones className="w-4 h-4" />
                Connect
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              {STREAMING_SERVICES.map(s => (
                <span key={s.id} className="text-xs text-muted-foreground/60">
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── Now Playing / Embedded Player ── */}
          <AnimatePresence mode="wait">
            {(selectedPlaylist || activeEmbed) && (
              <motion.div
                key={activeEmbed || selectedPlaylist?.id}
                initial={{ opacity: 0, y: 20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="overflow-hidden"
              >
                {/* Built-in playlist player */}
                {selectedPlaylist && !activeEmbed && (
                  <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-4 md:p-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                      {/* Album art / YouTube embed */}
                      <div className="w-full md:w-80 aspect-video rounded-xl overflow-hidden bg-black/20 shrink-0">
                        {youtubeEmbedUrl && (
                          <iframe
                            ref={playerRef}
                            src={youtubeEmbedUrl}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title={currentTrack?.title}
                          />
                        )}
                      </div>
                      
                      {/* Controls */}
                      <div className="flex-1 flex flex-col items-center md:items-start gap-3 w-full">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{currentTrack?.title}</h3>
                          <p className="text-sm text-muted-foreground">{selectedPlaylist.name}</p>
                        </div>
                        
                        {/* Playback controls */}
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={prevTrack}>
                            <SkipBack className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="default" 
                            size="icon" 
                            className="h-12 w-12 rounded-full"
                            onClick={() => setIsPlaying(!isPlaying)}
                          >
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={nextTrack}>
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-2 w-full max-w-[200px]">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => setIsMuted(!isMuted)}
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </Button>
                          <Slider
                            value={[isMuted ? 0 : volume]}
                            onValueChange={([v]) => { setVolume(v); setIsMuted(false); }}
                            max={100}
                            step={1}
                            className="flex-1"
                          />
                        </div>

                        {/* Track list */}
                        <div className="w-full mt-2 space-y-1">
                          {selectedPlaylist.tracks.map((track, i) => (
                            <button
                              key={i}
                              onClick={() => { setCurrentTrackIndex(i); setIsPlaying(true); }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                                i === currentTrackIndex 
                                  ? "bg-primary/10 text-primary" 
                                  : "text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              <span className="w-5 text-center text-xs">
                                {i === currentTrackIndex && isPlaying ? '▶' : i + 1}
                              </span>
                              <span className="truncate">{track.title}</span>
                            </button>
                          ))}
                        </div>

                        {/* Open in Spotify */}
                        {selectedPlaylist.spotifyUri && (
                          <a
                            href={`https://open.spotify.com/playlist/${selectedPlaylist.spotifyUri}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open full playlist on Spotify
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* External streaming embed */}
                {activeEmbed && (
                  <div className="bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">
                        Playing from {activeServiceName}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setActiveEmbed(null); setActiveServiceName(null); setStreamingUrl(''); }}
                      >
                        Disconnect
                      </Button>
                    </div>
                    <div className="rounded-xl overflow-hidden">
                      <iframe
                        src={activeEmbed}
                        className="w-full h-[352px]"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        title="Music Player"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Quick ambient sounds (inline, no embed) ── */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Ambience</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: CloudRain, label: 'Rain' },
                { icon: Waves, label: 'Waves' },
                { icon: Wind, label: 'Wind' },
                { icon: TreePine, label: 'Forest' },
                { icon: Coffee, label: 'Café' },
              ].map(({ icon: Icon, label }) => (
                <AmbientSoundButton key={label} icon={Icon} label={label} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Ambient sound button (uses Web Audio API for simple tones/noise) ──
function AmbientSoundButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  const [active, setActive] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; nodes: AudioNode[] } | null>(null);

  const toggle = () => {
    if (active && audioRef.current) {
      audioRef.current.ctx.close();
      audioRef.current = null;
      setActive(false);
    } else {
      try {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        gain.gain.value = 0.08;
        gain.connect(ctx.destination);

        // Create a filtered noise for ambient effect
        const bufferSize = 2 * ctx.sampleRate;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = label === 'Rain' ? 'bandpass' : label === 'Waves' ? 'lowpass' : label === 'Wind' ? 'highpass' : 'lowpass';
        filter.frequency.value = label === 'Rain' ? 2000 : label === 'Waves' ? 400 : label === 'Wind' ? 3000 : label === 'Forest' ? 800 : 1200;
        filter.Q.value = label === 'Rain' ? 0.5 : 0.3;

        source.connect(filter);
        filter.connect(gain);
        source.start();

        audioRef.current = { ctx, nodes: [source, filter, gain] };
        setActive(true);
      } catch {
        toast.error('Could not start audio');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.ctx.close();
      }
    };
  }, []);

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      className={cn("gap-1.5 rounded-full", active && "shadow-lg shadow-primary/20")}
      onClick={toggle}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {active && (
        <motion.div
          className="w-1.5 h-1.5 bg-primary-foreground rounded-full"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </Button>
  );
}
