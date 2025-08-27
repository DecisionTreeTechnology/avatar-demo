import { useCallback, useState } from 'react';

interface AzureTTSOptions {
  voice?: string;
  format?: string;
}

export interface SpeakResult {
  audio: AudioBuffer;
  wordTimings: { word: string; start: number; end: number }[];
}

export function useAzureTTSProduction(opts: AzureTTSOptions = {}) {
  const voice = opts.voice || import.meta.env.VITE_AZURE_SPEECH_VOICE || 'en-US-JennyNeural';
  const [isSynthesizing, setSynth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speakText = useCallback(async (text: string): Promise<SpeakResult> => {
    setError(null);
    if (!text.trim()) throw new Error('Empty text');
    setSynth(true);
    
    try {
      // Use Azure Function for production or local Azure SDK for development
      const isDevelopment = import.meta.env.DEV;
      
      if (isDevelopment) {
        // Development: Use client-side Azure SDK (with exposed keys)
        const { useAzureTTS } = await import('./useAzureTTS');
        const { speakText: devSpeakText } = useAzureTTS({ voice });
        return await devSpeakText(text);
      } else {
        // Production: Use secure Azure Function
        const response = await fetch('/api/speech-synthesis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Speech synthesis failed');
        }

        const { audioData, wordTimings } = await response.json();
        
        // Decode base64 audio data to AudioBuffer
        const audioArrayBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume AudioContext if suspended
        if (audioCtx.state === 'suspended') {
          try { 
            await audioCtx.resume(); 
            console.log('[useAzureTTSProduction] AudioContext resumed');
          } catch(e) { 
            console.warn('[useAzureTTSProduction] Failed to resume AudioContext:', e); 
          }
        }
        
        const audioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
        return { audio: audioBuffer, wordTimings };
      }
    } catch (e: any) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setSynth(false);
    }
  }, [voice]);

  return { speakText, isSynthesizing, error };
}
