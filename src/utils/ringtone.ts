/**
 * Generate a modern, catchy ringtone as base64 WAV
 * Uses a pleasant ascending arpeggio pattern similar to modern phone ringtones
 */
export const generateModernRingtone = (): string => {
  const sampleRate = 22050; // Higher sample rate for better quality
  const duration = 1.2; // Longer duration for a more complete ringtone
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
  
  // Modern ascending arpeggio pattern: C5 -> E5 -> G5 -> C6 (Major chord arpeggio)
  const notes = [
    { freq: 523.25, start: 0, end: 0.15 },     // C5
    { freq: 659.25, start: 0.15, end: 0.3 },   // E5
    { freq: 783.99, start: 0.3, end: 0.45 },   // G5
    { freq: 1046.50, start: 0.45, end: 0.7 },  // C6 (held longer)
    { freq: 783.99, start: 0.7, end: 0.85 },   // G5
    { freq: 1046.50, start: 0.85, end: 1.2 },  // C6 (final note)
  ];
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDuration = note.end - note.start;
        
        // Smooth attack and release envelope
        const attack = Math.min(1, noteT * 30);
        const release = Math.min(1, (noteDuration - noteT) * 20);
        const envelope = attack * release;
        
        // Add slight vibrato for richness
        const vibrato = 1 + Math.sin(2 * Math.PI * 5 * noteT) * 0.003;
        
        // Main sine wave with harmonic for warmth
        const fundamental = Math.sin(2 * Math.PI * note.freq * vibrato * t);
        const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * vibrato * t) * 0.15;
        const subHarmonic = Math.sin(2 * Math.PI * note.freq * 0.5 * t) * 0.1;
        
        sample += (fundamental + harmonic + subHarmonic) * envelope * 0.35;
      }
    }
    
    // Soft clip to avoid distortion
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

/**
 * Generate a team call ringtone (slightly different pattern)
 * Uses a two-tone alert pattern that's more urgent
 */
export const generateTeamRingtone = (): string => {
  const sampleRate = 22050;
  const duration = 1.0;
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
  
  // Alternating two-tone pattern (like a doorbell or team notification)
  const notes = [
    { freq: 880, start: 0, end: 0.2 },      // A5
    { freq: 1174.66, start: 0.2, end: 0.4 }, // D6
    { freq: 880, start: 0.5, end: 0.7 },     // A5
    { freq: 1174.66, start: 0.7, end: 1.0 }, // D6
  ];
  
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    
    for (const note of notes) {
      if (t >= note.start && t < note.end) {
        const noteT = t - note.start;
        const noteDuration = note.end - note.start;
        
        const attack = Math.min(1, noteT * 40);
        const release = Math.min(1, (noteDuration - noteT) * 25);
        const envelope = attack * release;
        
        const fundamental = Math.sin(2 * Math.PI * note.freq * t);
        const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.2;
        
        sample += (fundamental + harmonic) * envelope * 0.4;
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
