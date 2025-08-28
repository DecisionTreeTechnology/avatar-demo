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
      synth.wordBoundary = (_s, e) => {
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
      
      // Create or get existing AudioContext with enhanced iOS Chrome compatibility
      let audioCtx = (window as any).globalAudioContext;
      if (!audioCtx) {
        // Use webkitAudioContext specifically for iOS Chrome/Safari
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        (window as any).globalAudioContext = audioCtx;
        console.log('[useAzureTTS] Created new global AudioContext');
      }
      
      // Enhanced AudioContext management for iOS Chrome
      // iOS Chrome (WebKit) requires explicit user activation and careful state management
      if (audioCtx.state === 'suspended') {
        try { 
          await audioCtx.resume(); 
          console.log('[useAzureTTS] AudioContext resumed, state:', audioCtx.state);
          
          // For iOS Chrome, we need to ensure the context is truly ready
          // WebKit sometimes reports 'running' but audio still doesn't work
          if (/iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent)) {
            // Wait a bit longer for iOS Chrome WebKit to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[useAzureTTS] iOS Chrome detected - additional context stabilization');
          }
        } catch(e) { 
          console.warn('[useAzureTTS] Failed to resume AudioContext:', e); 
          throw new Error('Audio context activation failed - this often happens without user interaction on iOS');
        }
      }
      
      const audioBuffer = await audioCtx.decodeAudioData(audioData.slice(0));
      console.log('[useAzureTTS] Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        contextState: audioCtx.state
      });
      
      // Convert word timings to the expected format
      const wordTimings = words.map((word, i) => ({
        word,
        start: wtimes[i] || 0,
        end: (wtimes[i] || 0) + (wdurations[i] || 0)
      }));
      
      console.log('[useAzureTTS] Word timings:', wordTimings.slice(0, 5), '... total:', wordTimings.length);
      
      // Enhanced mobile audio compatibility test
      // iOS Chrome uses WebKit engine so same restrictions as Safari apply
      if (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent)) {
        const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);
        const isIOSSafari = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent);
        
        console.log('[useAzureTTS] Mobile device detected' + 
          (isIOSChrome ? ' (iOS Chrome)' : '') + 
          (isIOSSafari ? ' (iOS Safari)' : '') + ', testing audio playback...');
        
        try {
          // For iOS Chrome/Safari, we need to ensure the audio actually works
          // by testing with a very short silent audio first
          const testSource = audioCtx.createBufferSource();
          testSource.buffer = audioBuffer;
          const gainNode = audioCtx.createGain();
          
          // Use even quieter volume for iOS Chrome to prevent unwanted sounds
          gainNode.gain.value = isIOSChrome ? 0.01 : 0.05;
          
          testSource.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          // For iOS Chrome, use an even shorter test
          const testDuration = isIOSChrome ? 0.05 : 0.1;
          testSource.start();
          testSource.stop(audioCtx.currentTime + testDuration);
          
          // Wait for the test to complete
          await new Promise(resolve => setTimeout(resolve, testDuration * 1000 + 50));
          
          console.log('[useAzureTTS] Mobile audio test successful' + 
            (isIOSChrome ? ' (iOS Chrome compatible)' : '') +
            (isIOSSafari ? ' (iOS Safari compatible)' : ''));
            
        } catch (e) {
          console.warn('[useAzureTTS] Mobile audio test failed:', e);
          if (isIOSChrome) {
            console.warn('[useAzureTTS] iOS Chrome may require "Request Desktop Site" for full audio compatibility');
          }
          // Don't throw here - let the actual playback attempt proceed
        }
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
