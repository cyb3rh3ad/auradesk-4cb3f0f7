import { useState, useCallback } from 'react';
import { useAuraVille } from '@/hooks/useAuraVille';
import { useProximityVoice } from '@/hooks/useProximityVoice';
import { useFurniture } from '@/hooks/useFurniture';
import { useIsMobile } from '@/hooks/use-mobile';
import { GameCanvas } from '@/components/auraville/GameCanvas';
import { CharacterCustomizer } from '@/components/auraville/CharacterCustomizer';
import { TouchControls } from '@/components/auraville/TouchControls';
import { FurnitureEditor } from '@/components/auraville/FurnitureEditor';
import { SpatialProfile } from '@/components/auraville/gameTypes';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, UserCog, Volume2, Loader2, Home, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [showFurnitureEditor, setShowFurnitureEditor] = useState(false);
  const [insideHouseId, setInsideHouseId] = useState<string | null>(null);

  const { micActive, nearbyCount, startMic, stopMic } = useProximityVoice(
    channelRef,
    position,
    remotePlayers,
    voiceEnabled
  );

  const { furniture, isOwner, addFurniture, removeFurniture } = useFurniture(insideHouseId);

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

  const handleEnterHouse = useCallback((houseId: string) => {
    setInsideHouseId(houseId);
    setShowFurnitureEditor(false);
  }, []);

  const handleExitHouse = useCallback(() => {
    setInsideHouseId(null);
    setShowFurnitureEditor(false);
  }, []);

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

  if (!profile) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background p-4 overflow-auto">
        <CharacterCustomizer onSave={handleSaveProfile} isNew />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <GameCanvas
        position={position}
        profile={profile}
        remotePlayers={remotePlayers}
        houses={houses}
        decorations={decorations}
        updateMovement={updateMovement}
        insideHouseId={insideHouseId}
        onEnterHouse={handleEnterHouse}
        onExitHouse={handleExitHouse}
        furniture={furniture}
      />

      {/* HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-md border border-border/30 rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-3 shadow-lg"
        >
          <span className="font-bold text-sm tracking-wide text-foreground">🏘️ AuraVille</span>
          <span className="text-muted-foreground/50 text-xs">|</span>
          <span className="text-primary text-xs font-medium">{remotePlayers.size} online</span>
          {insideHouseId && (
            <>
              <span className="text-muted-foreground/50 text-xs">|</span>
              <span className="text-xs font-medium flex items-center gap-1">
                <Home className="w-3 h-3" /> Indoors
              </span>
            </>
          )}
        </motion.div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            className={cn(
              "h-9 w-9 rounded-xl shadow-lg border border-border/30",
              voiceEnabled
                ? "bg-primary/90 hover:bg-primary text-primary-foreground"
                : "bg-card/80 backdrop-blur-md text-muted-foreground hover:text-foreground"
            )}
          >
            {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          {voiceEnabled && nearbyCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-primary/90 backdrop-blur-md rounded-xl px-2 py-1.5 flex items-center gap-1.5 shadow-lg"
            >
              <Volume2 className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-primary-foreground text-xs font-medium">{nearbyCount}</span>
            </motion.div>
          )}

          {/* Furniture editor toggle (only when inside own house) */}
          {insideHouseId && isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFurnitureEditor(!showFurnitureEditor)}
              className={cn(
                "h-9 w-9 rounded-xl shadow-lg border border-border/30",
                showFurnitureEditor
                  ? "bg-primary/90 hover:bg-primary text-primary-foreground"
                  : "bg-card/80 backdrop-blur-md text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCustomizer(true)}
            className="h-9 w-9 rounded-xl bg-card/80 backdrop-blur-md text-muted-foreground hover:text-foreground shadow-lg border border-border/30"
          >
            <UserCog className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Coordinates */}
      {!insideHouseId && (
        <div className="absolute bottom-3 right-3 bg-card/60 backdrop-blur-sm rounded-lg px-2 py-1 z-10 border border-border/20">
          <span className="text-muted-foreground text-[10px] font-mono">
            {Math.round(position.x)}, {Math.round(position.y)}
          </span>
        </div>
      )}

      {/* Controls hint (desktop) */}
      {!isMobile && (
        <div className="absolute bottom-3 left-3 bg-card/60 backdrop-blur-sm rounded-lg px-3 py-1.5 z-10 border border-border/20">
          <span className="text-muted-foreground text-xs">
            <kbd className="bg-muted px-1 rounded text-[10px] font-mono">WASD</kbd> move · <kbd className="bg-muted px-1 rounded text-[10px] font-mono">E</kbd> enter/exit
          </span>
        </div>
      )}

      {isMobile && <TouchControls onMove={setJoystick} />}

      {/* Furniture Editor Panel */}
      <AnimatePresence>
        {showFurnitureEditor && insideHouseId && isOwner && (
          <FurnitureEditor
            isOwner={isOwner}
            furniture={furniture}
            onAdd={addFurniture}
            onRemove={removeFurniture}
            onClose={() => setShowFurnitureEditor(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomizer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-30"
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
