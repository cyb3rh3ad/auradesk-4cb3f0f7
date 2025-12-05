// Generate a short notification sound as base64 WAV
const generateNotificationSound = (): string => {
  const sampleRate = 8000;
  const duration = 0.15;
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
  
  // Generate a pleasant "pop" sound
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 30) * Math.min(1, t * 100);
    const freq = 880 + Math.exp(-t * 20) * 440; // Descending pitch
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

let cachedSoundUrl: string | null = null;

export const playMessageNotification = async () => {
  try {
    if (!cachedSoundUrl) {
      cachedSoundUrl = generateNotificationSound();
    }
    const audio = new Audio(cachedSoundUrl);
    audio.volume = 0.4;
    await audio.play();
  } catch (e) {
    // Silently fail if audio is blocked
    console.log('Notification sound blocked:', e);
  }
};
