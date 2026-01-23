/**
 * Generate a soft, gentle ringtone as base64 WAV
 * Uses a mellow two-note pattern with smooth attack/decay - similar to iOS "Reflection" tone
 */
export const generateModernRingtone = (): string => {
  const sampleRate = 22050;
  const duration = 1.5; // Slightly longer for a relaxed feel
  const samples = Math.floor(sampleRate * duration);
  
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  // WAV header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Simple, soft two-note pattern (like a gentle "ding-dong")
  // Using soft sine waves at pleasant frequencies
  const notes = [
    { freq: 587.33, start: 0, end: 0.5 },    // D5 - soft start
    { freq: 880, start: 0.5, end: 1.2 },      // A5 - gentle resolve
  ];
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDuration = note.end - note.start;
        
        // Very smooth attack and long decay for gentle sound
        const attack = Math.min(1, noteT * 8); // Slow attack (125ms)
        const decay = Math.pow(Math.max(0, 1 - noteT / noteDuration), 1.5); // Smooth exponential decay
        const envelope = attack * decay;
        
        // Pure sine wave with gentle second harmonic for warmth
        const fundamental = Math.sin(2 * Math.PI * note.freq * t);
        const secondHarmonic = Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.1;
        
        sample += (fundamental + secondHarmonic) * envelope * 0.25; // Low volume for softness
      }
    }
    
    // Soft limiting
    sample = Math.tanh(sample * 0.8);
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

/**
 * Generate a soft team call ringtone
 * Uses a gentle three-note ascending pattern
 */
export const generateTeamRingtone = (): string => {
  const sampleRate = 22050;
  const duration = 1.2;
  const samples = Math.floor(sampleRate * duration);
  
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  // WAV header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Gentle ascending three notes (like a soft chime)
  const notes = [
    { freq: 523.25, start: 0, end: 0.35 },     // C5
    { freq: 659.25, start: 0.3, end: 0.65 },   // E5 (slight overlap for smoothness)
    { freq: 783.99, start: 0.6, end: 1.2 },    // G5 (longer hold)
  ];
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDuration = note.end - note.start;
        
        // Smooth attack and decay
        const attack = Math.min(1, noteT * 10);
        const decay = Math.pow(Math.max(0, 1 - noteT / noteDuration), 1.5);
        const envelope = attack * decay;
        
        // Pure sine wave
        const fundamental = Math.sin(2 * Math.PI * note.freq * t);
        
        sample += fundamental * envelope * 0.2; // Soft volume
      }
    }
    
    sample = Math.tanh(sample);
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

// Cache ringtones to avoid regenerating
let cachedModernRingtone: string | null = null;
let cachedTeamRingtone: string | null = null;

export const getModernRingtone = (): string => {
  if (!cachedModernRingtone) {
    cachedModernRingtone = generateModernRingtone();
  }
  return cachedModernRingtone;
};

export const getTeamRingtone = (): string => {
  if (!cachedTeamRingtone) {
    cachedTeamRingtone = generateTeamRingtone();
  }
  return cachedTeamRingtone;
};
