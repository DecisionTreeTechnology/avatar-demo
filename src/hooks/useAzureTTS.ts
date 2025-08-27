import { useCallback, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

interface AzureTTSOptions {
  key?: string;
  region?: string;
  voice?: string;
  format?: string; // e.g. riff-22050hz-16bit-mono-pcm
}

export interface SpeakResult {
  audio: AudioBuffer;
  wordTimings: { word: string; start: number; end: number }[];
}

export function useAzureTTS(opts: AzureTTSOptions = {}) {
  const key = opts.key || import.meta.env.VITE_AZURE_SPEECH_KEY;
  const region = opts.region || import.meta.env.VITE_AZURE_SPEECH_REGION;
  const voice = opts.voice || import.meta.env.VITE_AZURE_SPEECH_VOICE || 'en-US-JennyNeural';
  const format = opts.format || 'riff-22050hz-16bit-mono-pcm';

  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const [isSynthesizing, setSynth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureSynth = () => {
    if (synthesizerRef.current) return synthesizerRef.current;
    if (!key || !region) throw new Error('Missing Azure Speech key/region');
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisOutputFormat = (SpeechSDK as any).SpeechSynthesisOutputFormat.Riff22050Hz16BitMonoPcm;
    
    // Use undefined for audioConfig so we get audioData in the result instead of file output
    const synth = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);
    synthesizerRef.current = synth;
    return synth;
  };

  const speakText = useCallback(async (text: string): Promise<SpeakResult> => {
    setError(null);
    if (!text.trim()) throw new Error('Empty text');
    const synth = ensureSynth();
    setSynth(true);
    
    try {
      const words: string[] = [];
      const wtimes: number[] = [];
      const wdurations: number[] = [];
      
      // Set up word boundary event handler
      synth.wordBoundary = (s, e) => {
        const tMs = e.audioOffset / 10000;
        words.push(e.text);
        wtimes.push(tMs);
        wdurations.push(e.duration / 10000);
      };

      const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${voice}'>${text}</voice></speak>`;
      const result: SpeechSDK.SpeechSynthesisResult = await new Promise((resolve, reject) => {
        synth.speakSsmlAsync(
          ssml,
          r => resolve(r),
          e => reject(e)
        );
      });
      
      if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
        throw new Error('Synthesis failed: ' + result.errorDetails);
      }
      
      const audioData = result.audioData as ArrayBuffer;
      if (!audioData || audioData.byteLength === 0) {
        throw new Error('Azure synthesis produced no audio');
      }
      
      // Decode audio data to AudioBuffer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume AudioContext if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        try { 
          await audioCtx.resume(); 
          console.log('[useAzureTTS] AudioContext resumed');
        } catch(e) { 
          console.warn('[useAzureTTS] Failed to resume AudioContext:', e); 
        }
      }
      
      const audioBuffer = await audioCtx.decodeAudioData(audioData.slice(0));
      console.log('[useAzureTTS] Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      // Convert word timings to the expected format
      const wordTimings = words.map((word, i) => ({
        word,
        start: wtimes[i] || 0,
        end: (wtimes[i] || 0) + (wdurations[i] || 0)
      }));
      
      console.log('[useAzureTTS] Word timings:', wordTimings.slice(0, 5), '... total:', wordTimings.length);
      
      // Optional: Test direct audio playback (bypassing TalkingHead)
      if (import.meta.env.VITE_PLAY_DIRECT === 'true') {
        console.log('[useAzureTTS] Playing audio directly for testing...');
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      }
      
      return { audio: audioBuffer, wordTimings };
    } catch (e: any) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setSynth(false);
    }
  }, [voice]);

  return { speakText, isSynthesizing, error };
}
