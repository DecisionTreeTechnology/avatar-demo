import { useCallback, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { getMicrophoneManager } from '../utils/microphoneStateManager';
import { getAudioContext } from '../utils/audioContextManager';
import { createLogger } from '../utils/logger';

interface AzureTTSOptions {
  key?: string;
  region?: string;
  voice?: string;
  format?: string;
  // New options for microphone integration
  notifyMicrophoneManager?: boolean;
  prePlaybackDelay?: number;  // Delay before starting playback
  postPlaybackDelay?: number; // Delay after playback before re-enabling microphone
}

export interface SpeakResult {
  audio: AudioBuffer;
  wordTimings: { word: string; start: number; end: number }[];
}


export function useEnhancedAzureTTS(opts: AzureTTSOptions = {}) {
  const key = opts.key || import.meta.env.VITE_AZURE_SPEECH_KEY;
  const region = opts.region || import.meta.env.VITE_AZURE_SPEECH_REGION;
  const voice = opts.voice || import.meta.env.VITE_AZURE_SPEECH_VOICE || 'en-US-JennyNeural';
  const notifyMicrophoneManager = opts.notifyMicrophoneManager ?? true;
  const prePlaybackDelay = opts.prePlaybackDelay ?? 100;
  const postPlaybackDelay = opts.postPlaybackDelay ?? 750;

  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const [isSynthesizing, setSynth] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRetryCount = useRef(0);
  const logger = createLogger('EnhancedTTS');
  const currentPlaybackRef = useRef<{
    source: AudioBufferSourceNode | null;
    gainNode: GainNode | null;
    startTime: number;
    endCallback?: () => void;
  }>({ source: null, gainNode: null, startTime: 0 });


  // Enhanced AudioContext creation using centralized manager
  const createEnhancedAudioContext = async (): Promise<AudioContext> => {
    logger.log('Getting AudioContext from centralized manager');
    return await getAudioContext();
  };

  // Simplified context validation - manager handles resume logic
  const ensureAudioContextRunning = async (ctx: AudioContext): Promise<void> => {
    logger.log('AudioContext state:', ctx.state);
    
    if (ctx.state !== 'running') {
      // The AudioContextManager handles resume logic, so we just need to get it again
      logger.log('AudioContext not running, getting fresh context from manager');
      const freshCtx = await getAudioContext();
      if (freshCtx.state !== 'running') {
        throw new Error(`AudioContext failed to activate. State: ${freshCtx.state}. iOS devices require user interaction for audio.`);
      }
    }
  };

  // Enhanced audio testing with iOS-specific validations
  const validateAudioPlayback = async (ctx: AudioContext, _buffer: AudioBuffer): Promise<boolean> => {
    try {
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      
      if (!isIOS) {
        // Skip validation for non-iOS devices
        return true;
      }

      logger.log('Running iOS audio validation...');
      
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
          logger.warn('Audio validation timeout');
          resolve(false);
        }, 2000);

        source.onended = () => {
          clearTimeout(timeout);
          logger.log('Audio validation successful');
          resolve(true);
        };

        source.start();
        source.stop(ctx.currentTime + testDuration);
      });
      
    } catch (error) {
      logger.error('Audio validation failed:', error);
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
    
    // Notify microphone manager that TTS is starting
    if (notifyMicrophoneManager) {
      const micManager = getMicrophoneManager();
      micManager.notifyTTSStarted();
    }
    
    const synth = ensureSynth();
    setSynth(true);
    
    try {
      console.log('[Enhanced TTS] Starting synthesis for text:', text.substring(0, 50) + '...');
      
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
      
      console.log('[Enhanced TTS] Debug - Words array:', words);
      console.log('[Enhanced TTS] Debug - wtimes array:', wtimes);
      console.log('[Enhanced TTS] Debug - wdurations array:', wdurations);
      console.log('[Enhanced TTS] Debug - Final wordTimings:', wordTimings);
      
      console.log('[Enhanced TTS] Synthesis completed successfully:', {
        audioBufferDuration: audioBuffer.duration,
        wordCount: wordTimings.length,
        audioContextState: audioCtx.state
      });
      
      return { audio: audioBuffer, wordTimings };
      
    } catch (e: any) {
      console.error('[Enhanced TTS] Synthesis failed:', e);
      setError(e.message || String(e));
      
      // Ensure microphone manager is notified even on error
      if (notifyMicrophoneManager) {
        const micManager = getMicrophoneManager();
        micManager.notifyTTSEnded();
      }
      
      // Provide iOS-specific error guidance
      if (e.message?.includes('AudioContext')) {
        const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        
        if (isIOSChrome) {
          throw new Error('iOS Chrome audio issue detected. Try enabling "Request Desktop Site" in Chrome menu, or use Safari for better compatibility.');
        } else if (isIOS) {
          throw new Error('iOS audio activation failed. Ensure you have interacted with the page (tap/click) before using audio features.');
        }
      }
      
      throw e;
    } finally {
      setSynth(false);
      
      // Notify microphone manager that TTS synthesis has ended (but playback might continue)
      if (notifyMicrophoneManager) {
        // We don't call notifyTTSEnded here because audio playback happens separately
        // The playAudio function will handle the end notification
      }
    }
  }, [voice, key, region, notifyMicrophoneManager]);

  const playAudio = useCallback(async (
    audioBuffer: AudioBuffer, 
    _wordTimings: { word: string; start: number; end: number }[] = [],
    onEnd?: () => void
  ): Promise<void> => {
    if (!audioBuffer) throw new Error('No audio buffer provided');

    console.log('[Enhanced TTS] Getting AudioContext for playback');
    const audioCtx = await getAudioContext();

    // Stop any currently playing audio
    if (currentPlaybackRef.current.source) {
      try {
        currentPlaybackRef.current.source.stop();
        currentPlaybackRef.current.source.disconnect();
      } catch (e) {
        console.warn('[Enhanced TTS] Error stopping previous audio:', e);
      }
    }

    setIsSpeaking(true);

    try {
      // Add pre-playback delay
      if (prePlaybackDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, prePlaybackDelay));
      }

      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      
      source.buffer = audioBuffer;
      gainNode.gain.value = 1.0;
      
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Store current playback reference
      currentPlaybackRef.current = {
        source,
        gainNode,
        startTime: audioCtx.currentTime,
        endCallback: onEnd
      };

      let hasEnded = false;
      
      // Set up end handler
      const handleEnd = async () => {
        if (hasEnded) return; // Prevent multiple calls
        hasEnded = true;
        
        console.log('[Enhanced TTS] Audio playback ended');
        setIsSpeaking(false);
        
        // Clean up references
        currentPlaybackRef.current = { source: null, gainNode: null, startTime: 0 };
        
        // Add post-playback delay before re-enabling microphone
        if (postPlaybackDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, postPlaybackDelay));
        }
        
        // Notify microphone manager that TTS has ended
        if (notifyMicrophoneManager) {
          const micManager = getMicrophoneManager();
          micManager.notifyTTSEnded();
        }
        
        // Call optional end callback
        onEnd?.();
      };

      source.onended = handleEnd;
      
      // Fallback timeout for test environments where audio might not actually play
      const fallbackTimeout = setTimeout(() => {
        console.log('[Enhanced TTS] Fallback timeout triggered for audio playback');
        handleEnd();
      }, Math.max(audioBuffer.duration * 1000 + 2000, 3000)); // Duration + 2s buffer, minimum 3s
      
      // Clear fallback timeout when audio ends naturally  
      source.addEventListener('ended', () => {
        clearTimeout(fallbackTimeout);
      });
      
      // Start playback
      source.start();
      console.log('[Enhanced TTS] Audio playback started, duration:', audioBuffer.duration.toFixed(2) + 's');
      
    } catch (error) {
      console.error('[Enhanced TTS] Audio playback failed:', error);
      setIsSpeaking(false);
      
      // Ensure microphone manager is notified even on error
      if (notifyMicrophoneManager) {
        const micManager = getMicrophoneManager();
        micManager.notifyTTSEnded();
      }
      
      throw error;
    }
  }, [notifyMicrophoneManager, prePlaybackDelay, postPlaybackDelay]);

  const speakTextAndPlay = useCallback(async (text: string, onEnd?: () => void): Promise<SpeakResult> => {
    console.log('[Enhanced TTS] Speaking text and playing:', text.substring(0, 50) + '...');
    
    try {
      // First synthesize the text
      const result = await speakText(text);
      
      // Then play the audio with microphone management
      await playAudio(result.audio, result.wordTimings, onEnd);
      
      return result;
    } catch (error) {
      console.error('[Enhanced TTS] Speak and play failed:', error);
      throw error;
    }
  }, [speakText, playAudio]);

  const stopSpeaking = useCallback(() => {
    console.log('[Enhanced TTS] Stopping speech');
    
    if (currentPlaybackRef.current.source) {
      try {
        currentPlaybackRef.current.source.stop();
        currentPlaybackRef.current.source.disconnect();
      } catch (e) {
        console.warn('[Enhanced TTS] Error stopping audio:', e);
      }
    }
    
    setIsSpeaking(false);
    currentPlaybackRef.current = { source: null, gainNode: null, startTime: 0 };
    
    // Notify microphone manager
    if (notifyMicrophoneManager) {
      const micManager = getMicrophoneManager();
      micManager.notifyTTSEnded();
    }
  }, [notifyMicrophoneManager]);

  return { 
    speakText, 
    playAudio,
    speakTextAndPlay,
    stopSpeaking,
    isSynthesizing, 
    isSpeaking,
    error,
    // Additional debugging methods
    getAudioContextState: () => {
      try {
        return (window as any).globalAudioContext?.state || 'unknown';
      } catch {
        return 'error';
      }
    },
    retryCount: audioContextRetryCount.current
  };
}
