import { useState, useCallback } from 'react';
import { useAuraVille } from '@/hooks/useAuraVille';
import { useProximityVoice } from '@/hooks/useProximityVoice';
import { useIsMobile } from '@/hooks/use-mobile';
import { GameCanvas } from '@/components/auraville/GameCanvas';
import { CharacterCustomizer } from '@/components/auraville/CharacterCustomizer';
import { TouchControls } from '@/components/auraville/TouchControls';
import { SpatialProfile } from '@/components/auraville/gameTypes';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, UserCog, Volume2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AuraVille = () => {
  const isMobile = useIsMobile();
  const {
    profile,
    profileLoading,
    saveProfile,
    position,
    remotePlayers,
    houses,
    decorations,
    updateMovement,
    setJoystick,
    channelRef,
  } = useAuraVille();

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);

  const { micActive, nearbyCount, startMic, stopMic } = useProximityVoice(
    channelRef,
    position,
    remotePlayers,
    voiceEnabled
  );

  const handleSaveProfile = useCallback(async (p: SpatialProfile) => {
    await saveProfile(p);
    setShowCustomizer(false);
  }, [saveProfile]);

  const toggleVoice = useCallback(async () => {
    if (voiceEnabled) {
      stopMic();
      setVoiceEnabled(false);
    } else {
      await startMic();
      setVoiceEnabled(true);
    }
  }, [voiceEnabled, startMic, stopMic]);

  // Loading
  if (profileLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AuraVille…</p>
        </div>
      </div>
    );
  }

  // First-time character creation
  if (!profile) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-950/50 via-background to-blue-950/50 p-4 overflow-auto">
        <CharacterCustomizer onSave={handleSaveProfile} isNew />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {/* Game Canvas */}
      <GameCanvas
        position={position}
        profile={profile}
        remotePlayers={remotePlayers}
        houses={houses}
        decorations={decorations}
        updateMovement={updateMovement}
      />

      {/* HUD - Top bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-3"
        >
          <span className="text-white font-bold text-sm tracking-wide">🏘️ AuraVille</span>
          <span className="text-white/50 text-xs">|</span>
          <span className="text-green-400 text-xs font-medium">{remotePlayers.size} online</span>
        </motion.div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            className={`h-9 w-9 rounded-xl ${voiceEnabled ? 'bg-blue-500/80 hover:bg-blue-500 text-white' : 'bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60'}`}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          {/* Nearby voice indicator */}
          {voiceEnabled && nearbyCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-blue-500/80 backdrop-blur-sm rounded-xl px-2 py-1.5 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium">{nearbyCount}</span>
            </motion.div>
          )}

          {/* Edit character */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCustomizer(true)}
            className="h-9 w-9 rounded-xl bg-black/50 backdrop-blur-sm text-white/70 hover:text-white hover:bg-black/60"
          >
            <UserCog className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Coordinates display */}
      <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 z-10">
        <span className="text-white/50 text-[10px] font-mono">
          {Math.round(position.x)}, {Math.round(position.y)}
        </span>
      </div>

      {/* Mobile touch controls */}
      {isMobile && <TouchControls onMove={setJoystick} />}

      {/* Character customizer overlay */}
      <AnimatePresence>
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-30"
            onClick={(e) => e.target === e.currentTarget && setShowCustomizer(false)}
          >
            <CharacterCustomizer
              initialProfile={profile}
              onSave={handleSaveProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuraVille;
