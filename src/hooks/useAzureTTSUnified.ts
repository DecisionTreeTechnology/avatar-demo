import { useCallback, useState } from 'react';
import { useAzureTTS } from './useAzureTTS';

interface AzureTTSOptions {
  voice?: string;
  format?: string;
}

export interface SpeakResult {
  audio: AudioBuffer;
  wordTimings: { word: string; start: number; end: number }[];
}

export function useAzureTTSUnified(opts: AzureTTSOptions = {}) {
  const voice = opts.voice || import.meta.env.VITE_AZURE_SPEECH_VOICE || 'en-US-JennyNeural';
  const [isSynthesizing, setSynth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we should use direct API in development
  const useDirectAPI = import.meta.env.DEV && 
    import.meta.env.VITE_AZURE_SPEECH_KEY && 
    import.meta.env.VITE_AZURE_SPEECH_REGION;

  // Always initialize the direct API hook (even if we might not use it)
  // This ensures hooks are called consistently
  const directTTS = useAzureTTS({ voice });

  const speakText = useCallback(async (text: string): Promise<SpeakResult> => {
    setError(null);
    if (!text.trim()) throw new Error('Empty text');
    setSynth(true);
    
    try {
      if (useDirectAPI) {
        // Development: Use direct Azure Speech SDK
        console.log('[useAzureTTSUnified] Using direct Azure Speech SDK');
        return await directTTS.speakText(text);
      } else {
        // Production or fallback: Use Azure Function
        console.log('[useAzureTTSUnified] Using Azure Function API');
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
            console.log('[useAzureTTSUnified] AudioContext resumed');
          } catch(e) { 
            console.warn('[useAzureTTSUnified] Failed to resume AudioContext:', e); 
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
  }, [voice, useDirectAPI, directTTS]);

  // Return the combined state - show synthesizing if either this hook or the direct TTS is working
  const combinedIsSynthesizing = isSynthesizing || (useDirectAPI && directTTS.isSynthesizing);
  const combinedError = error || (useDirectAPI && directTTS.error);

  return { 
    speakText, 
    isSynthesizing: combinedIsSynthesizing, 
    error: combinedError 
  };
}
