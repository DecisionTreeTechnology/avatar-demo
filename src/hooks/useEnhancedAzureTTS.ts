import { useCallback, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { iosDebugger } from '../utils/iosDebugger';

interface AzureTTSOptions {
  key?: string;
  region?: string;
  voice?: string;
  format?: string;
}

export interface SpeakResult {
  audio: AudioBuffer;
  wordTimings: { word: string; start: number; end: number }[];
}

interface IOSAudioContextConfig {
  sampleRate: number;
  latencyHint: AudioContextLatencyCategory;
  retryAttempts: number;
  stabilizationDelay: number;
}

export function useEnhancedAzureTTS(opts: AzureTTSOptions = {}) {
  const key = opts.key || import.meta.env.VITE_AZURE_SPEECH_KEY;
  const region = opts.region || import.meta.env.VITE_AZURE_SPEECH_REGION;
  const voice = opts.voice || import.meta.env.VITE_AZURE_SPEECH_VOICE || 'en-US-JennyNeural';

  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const [isSynthesizing, setSynth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRetryCount = useRef(0);
  const maxRetries = 3;

  // Get iOS-specific AudioContext configuration
  const getIOSAudioConfig = (): IOSAudioContextConfig => {
    const debugInfo = iosDebugger.getDebugInfo();
    const isIOSChrome = debugInfo?.device.isIOSChrome || 
      (/iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent));
    const isIOSSafari = debugInfo?.device.isIOSSafari || 
      (/iPad|iPhone|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent));

    if (isIOSChrome) {
      return {
        sampleRate: 48000, // iOS Chrome prefers 48kHz
        latencyHint: 'interactive',
        retryAttempts: 3,
        stabilizationDelay: 500 // Longer delay for iOS Chrome
      };
    } else if (isIOSSafari) {
      return {
        sampleRate: 44100, // iOS Safari works well with 44.1kHz
        latencyHint: 'interactive',
        retryAttempts: 2,
        stabilizationDelay: 200
      };
    } else {
      return {
        sampleRate: 44100,
        latencyHint: 'interactive',
        retryAttempts: 1,
        stabilizationDelay: 100
      };
    }
  };

  // Enhanced AudioContext creation with iOS-specific handling
  const createEnhancedAudioContext = async (): Promise<AudioContext> => {
    const config = getIOSAudioConfig();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('AudioContext not supported in this browser');
    }

    // Check if we already have a working global context
    const existingCtx = (window as any).globalAudioContext;
    if (existingCtx && existingCtx.state === 'running') {
      console.log('[Enhanced TTS] Reusing existing working AudioContext');
      return existingCtx;
    }

    console.log('[Enhanced TTS] Creating new AudioContext with iOS config:', config);
    
    const ctx = new AudioContextClass({
      sampleRate: config.sampleRate,
      latencyHint: config.latencyHint
    });

    // Store globally
    (window as any).globalAudioContext = ctx;

    return ctx;
  };

  // Enhanced AudioContext resume with retry logic
  const ensureAudioContextRunning = async (ctx: AudioContext): Promise<void> => {
    const config = getIOSAudioConfig();
    
    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        if (ctx.state === 'suspended') {
          console.log(`[Enhanced TTS] Attempting to resume AudioContext (attempt ${attempt + 1}/${config.retryAttempts + 1})`);
          await ctx.resume();
        }

        // Wait for stabilization
        await new Promise(resolve => setTimeout(resolve, config.stabilizationDelay));

        if (ctx.state === 'running') {
          console.log('[Enhanced TTS] AudioContext successfully running');
          audioContextRetryCount.current = 0; // Reset retry count on success
          return;
        }

        if (attempt < config.retryAttempts) {
          console.warn(`[Enhanced TTS] AudioContext still ${ctx.state}, retrying...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt)));
        }
      } catch (error) {
        console.error(`[Enhanced TTS] AudioContext resume attempt ${attempt + 1} failed:`, error);
        if (attempt < config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempt)));
        }
      }
    }

    // If we get here, all attempts failed
    audioContextRetryCount.current++;
    
    if (audioContextRetryCount.current >= maxRetries) {
      throw new Error('AudioContext failed to activate after multiple attempts. iOS devices require user interaction for audio. Try refreshing the page and ensure you interact with the page before using audio features.');
    } else {
      throw new Error(`AudioContext activation failed (attempt ${audioContextRetryCount.current}/${maxRetries}). State: ${ctx.state}`);
    }
  };

  // Enhanced audio testing with iOS-specific validations
  const validateAudioPlayback = async (ctx: AudioContext, _buffer: AudioBuffer): Promise<boolean> => {
    try {
      const debugInfo = iosDebugger.getDebugInfo();
      const isIOS = debugInfo?.device.isIOS || /iPad|iPhone|iPod/i.test(navigator.userAgent);
      
      if (!isIOS) {
        // Skip validation for non-iOS devices
        return true;
      }

      console.log('[Enhanced TTS] Running iOS audio validation...');
      
      // Create a very short test buffer
      const testDuration = 0.05; // 50ms
      const testBuffer = ctx.createBuffer(1, ctx.sampleRate * testDuration, ctx.sampleRate);
      const testData = testBuffer.getChannelData(0);
      
      // Generate a very quiet test tone
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate) * 0.01;
      }

      const source = ctx.createBufferSource();
      source.buffer = testBuffer;
      
      // Use gain node for better control
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.01;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Test playback
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[Enhanced TTS] Audio validation timeout');
          resolve(false);
        }, 2000);

        source.onended = () => {
          clearTimeout(timeout);
          console.log('[Enhanced TTS] Audio validation successful');
          resolve(true);
        };

        source.start();
        source.stop(ctx.currentTime + testDuration);
      });
      
    } catch (error) {
      console.error('[Enhanced TTS] Audio validation failed:', error);
      return false;
    }
  };

  const ensureSynth = () => {
    if (synthesizerRef.current) return synthesizerRef.current;
    if (!key || !region) throw new Error('Missing Azure Speech key/region');
    
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisOutputFormat = (SpeechSDK as any).SpeechSynthesisOutputFormat.Riff22050Hz16BitMonoPcm;
    
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
      console.log('[Enhanced TTS] Starting synthesis for text:', text.substring(0, 50) + '...');
      
      // Update debug info
      if (iosDebugger.getDebugInfo()) {
        await iosDebugger.startDebugging();
      }
      
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
      
      console.log('[Enhanced TTS] Starting Azure synthesis...');
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
      
      console.log('[Enhanced TTS] Azure synthesis completed, audio size:', audioData.byteLength);
      
      // Enhanced AudioContext creation and management
      const audioCtx = await createEnhancedAudioContext();
      
      // Ensure AudioContext is running with retry logic
      await ensureAudioContextRunning(audioCtx);
      
      // Additional iOS fix: If context is still suspended, try simple resume
      if (audioCtx.state === 'suspended') {
        console.log('[Enhanced TTS] Context still suspended, attempting resume...');
        try {
          await audioCtx.resume();
          console.log('[Enhanced TTS] Resume result:', audioCtx.state);
        } catch (activationError) {
          console.warn('[Enhanced TTS] Resume failed:', activationError);
          // Continue anyway - sometimes audio still works even if context appears suspended
        }
      }
      
      console.log('[Enhanced TTS] Decoding audio data...');
      const audioBuffer = await audioCtx.decodeAudioData(audioData.slice(0));
      
      console.log('[Enhanced TTS] Audio decoded successfully:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length,
        contextState: audioCtx.state
      });
      
      // Run iOS-specific audio validation
      const isValid = await validateAudioPlayback(audioCtx, audioBuffer);
      if (!isValid) {
        console.warn('[Enhanced TTS] Audio validation failed, but proceeding...');
      }
      
      // Convert word timings to the expected format
      const wordTimings = words.map((word, i) => ({
        word,
        start: wtimes[i] || 0,
        end: (wtimes[i] || 0) + (wdurations[i] || 0)
      }));
      
      console.log('[Enhanced TTS] Synthesis completed successfully:', {
        audioBufferDuration: audioBuffer.duration,
        wordCount: wordTimings.length,
        audioContextState: audioCtx.state
      });
      
      return { audio: audioBuffer, wordTimings };
      
    } catch (e: any) {
      console.error('[Enhanced TTS] Synthesis failed:', e);
      setError(e.message || String(e));
      
      // Provide iOS-specific error guidance
      if (e.message?.includes('AudioContext')) {
        const debugInfo = iosDebugger.getDebugInfo();
        if (debugInfo?.device.isIOSChrome) {
          throw new Error('iOS Chrome audio issue detected. Try enabling "Request Desktop Site" in Chrome menu, or use Safari for better compatibility.');
        } else if (debugInfo?.device.isIOS) {
          throw new Error('iOS audio activation failed. Ensure you have interacted with the page (tap/click) before using audio features.');
        }
      }
      
      throw e;
    } finally {
      setSynth(false);
    }
  }, [voice, key, region]);

  return { 
    speakText, 
    isSynthesizing, 
    error,
    // Additional debugging methods
    getAudioContextState: () => (window as any).globalAudioContext?.state || 'unknown',
    retryCount: audioContextRetryCount.current
  };
}
