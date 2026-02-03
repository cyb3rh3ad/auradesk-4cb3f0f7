/**
 * Premium Call Ringtone System
 * Generates pleasant, modern ringtones using Web Audio API
 */

type RingtoneType = 'incoming' | 'outgoing' | 'team' | 'notification';

interface RingtoneOptions {
  volume?: number;
  loop?: boolean;
}

class CallRingtoneService {
  private audioContext: AudioContext | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];
  private isPlaying = false;
  private loopInterval: NodeJS.Timeout | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a pleasant two-tone ringtone (like iPhone/Android)
   */
  playIncomingRing(options: RingtoneOptions = {}): void {
    const { volume = 0.4, loop = true } = options;
    
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playPattern = () => {
      // First note - pleasant high tone
      this.playTone(880, 0.25, volume * 0.8);
      
      // Second note - slightly lower, creates nice interval
      setTimeout(() => {
        this.playTone(698.46, 0.25, volume);
      }, 200);
      
      // Third note - resolve
      setTimeout(() => {
        this.playTone(784, 0.3, volume * 0.6);
      }, 400);
    };

    playPattern();
    
    if (loop) {
      this.loopInterval = setInterval(playPattern, 2000);
    }
  }

  /**
   * Play outgoing call tone (waiting for answer)
   */
  playOutgoingRing(options: RingtoneOptions = {}): void {
    const { volume = 0.25, loop = true } = options;
    
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playPattern = () => {
      // Classic "ringback" tone
      this.playTone(440, 1.0, volume);
    };

    playPattern();
    
    if (loop) {
      this.loopInterval = setInterval(playPattern, 3000);
    }
  }

  /**
   * Play team/group call ringtone (ascending arpeggio)
   */
  playTeamRing(options: RingtoneOptions = {}): void {
    const { volume = 0.35, loop = true } = options;
    
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playPattern = () => {
      // Ascending arpeggio - more exciting for group calls
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 0.15, volume * (1 - i * 0.1));
        }, i * 100);
      });
    };

    playPattern();
    
    if (loop) {
      this.loopInterval = setInterval(playPattern, 1800);
    }
  }

  /**
   * Play a notification sound
   */
  playNotification(options: RingtoneOptions = {}): void {
    const { volume = 0.3 } = options;
    
    // Pleasant "pop" sound
    this.playTone(880, 0.08, volume);
    setTimeout(() => {
      this.playTone(1108.73, 0.08, volume * 0.7);
    }, 60);
  }

  /**
   * Play a single tone with envelope
   */
  private playTone(frequency: number, duration: number, volume: number): void {
    try {
      const ctx = this.getAudioContext();
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Use sine wave for smooth, pleasant sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      // Smooth attack and decay envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02); // Quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Smooth decay
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
      
      // Track active nodes
      this.activeOscillators.push(oscillator);
      this.activeGains.push(gainNode);
      
      // Clean up after done
      oscillator.onended = () => {
        const oscIndex = this.activeOscillators.indexOf(oscillator);
        if (oscIndex > -1) this.activeOscillators.splice(oscIndex, 1);
        
        const gainIndex = this.activeGains.indexOf(gainNode);
        if (gainIndex > -1) this.activeGains.splice(gainIndex, 1);
        
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('Error playing tone:', error);
    }
  }

  /**
   * Stop all ringtones
   */
  stop(): void {
    this.isPlaying = false;
    
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    // Stop all active oscillators
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    
    this.activeGains.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        // Ignore
      }
    });

    this.activeOscillators = [];
    this.activeGains = [];
  }

  /**
   * Check if currently playing
   */
  isRinging(): boolean {
    return this.isPlaying;
  }

  /**
   * Trigger vibration on mobile devices
   */
  vibrate(pattern: number | number[] = [200, 100, 200]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Stop vibration
   */
  stopVibration(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }
}

// Export singleton instance
export const callRingtone = new CallRingtoneService();

// Helper functions for common use cases
export const playIncomingCallRing = (options?: RingtoneOptions) => callRingtone.playIncomingRing(options);
export const playOutgoingCallRing = (options?: RingtoneOptions) => callRingtone.playOutgoingRing(options);
export const playTeamCallRing = (options?: RingtoneOptions) => callRingtone.playTeamRing(options);
export const playCallNotification = (options?: RingtoneOptions) => callRingtone.playNotification(options);
export const stopCallRing = () => callRingtone.stop();
export const vibratePhone = (pattern?: number | number[]) => callRingtone.vibrate(pattern);
export const stopVibration = () => callRingtone.stopVibration();
