import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook that monitors audio levels of a MediaStream using Web Audio API.
 * Returns a normalized level (0-1) and a boolean indicating if the user is speaking.
 */
export function useAudioLevel(stream: MediaStream | null, enabled: boolean = true) {
  const [level, setLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedLevel = useRef(0);

  useEffect(() => {
    if (!stream || !enabled) {
      setLevel(0);
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
      audioContextRef.current = ctx;
    } catch {
      return;
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    analyserRef.current = analyser;

    try {
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch {
      ctx.close();
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const SPEAKING_THRESHOLD = 0.08;
    const SMOOTHING = 0.3;
    let speakingFrames = 0;
    const SPEAKING_FRAME_THRESHOLD = 3; // Need N consecutive frames to count as speaking

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS from frequency data
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Smooth the level to avoid jitter
      smoothedLevel.current = smoothedLevel.current * SMOOTHING + rms * (1 - SMOOTHING);
      const currentLevel = Math.min(1, smoothedLevel.current * 2.5); // Amplify a bit

      setLevel(currentLevel);

      // Debounced speaking detection
      if (currentLevel > SPEAKING_THRESHOLD) {
        speakingFrames = Math.min(speakingFrames + 1, SPEAKING_FRAME_THRESHOLD + 5);
      } else {
        speakingFrames = Math.max(speakingFrames - 1, 0);
      }
      setIsSpeaking(speakingFrames >= SPEAKING_FRAME_THRESHOLD);

      rafRef.current = requestAnimationFrame(tick);
    };

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        rafRef.current = requestAnimationFrame(tick);
      });
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      analyserRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
      smoothedLevel.current = 0;
    };
  }, [stream, enabled]);

  return { level, isSpeaking };
}
