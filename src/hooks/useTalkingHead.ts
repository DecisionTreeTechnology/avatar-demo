import { useCallback, useEffect, useRef, useState } from 'react';
import { TalkingHead } from '@met4citizen/talkinghead';
import { AvatarAnimationManager, EmotionType, GestureType, AnimationIntensity } from '../utils/avatarAnimationManager';

interface UseTalkingHeadOptions {
  avatarUrl?: string;
  highDPI?: boolean;
  ttsEndpoint?: string; // TalkingHead requires a Google-compliant TTS endpoint even if we only use speakAudio
}

export interface SpeakWordTiming {
  word: string;
  start: number;
  end: number;
}

export interface UseTalkingHeadResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  head: TalkingHead | null;
  isReady: boolean;
  isSpeaking: boolean;
  error: string | null;
  speak: (audio: AudioBuffer, timings?: SpeakWordTiming[]) => Promise<void>;
  resetCamera: () => void;
  // Enhanced animation methods
  setEmotion: (emotion: EmotionType, intensity?: AnimationIntensity) => void;
  performGesture: (gesture: GestureType) => Promise<void>;
  animationManager: AvatarAnimationManager | null;
}

export function useTalkingHead(options: UseTalkingHeadOptions = {}): UseTalkingHeadResult {
  const { avatarUrl = '/avatar.glb', highDPI = true, ttsEndpoint = '/gtts/' } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<TalkingHead | null>(null);
  const animationManagerRef = useRef<AvatarAnimationManager | null>(null);
  const [isReady, setReady] = useState(false);
  const [isSpeaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  console.log('[useTalkingHead] Hook called with avatarUrl:', avatarUrl);

  useEffect(() => {
    console.log('[useTalkingHead] useEffect triggered');
    let disposed = false;
    let handleResize: (() => void) | null = null;
    const init = async () => {
      if (!containerRef.current) {
        setTimeout(init, 100);
        return;
      }
      
      console.log('[useTalkingHead] Initializing TalkingHead...');
      
      // Clear any existing content in the container to prevent duplicates
      if (containerRef.current) {
        const existingCanvases = containerRef.current.querySelectorAll('canvas');
        if (existingCanvases.length > 0) {
          console.log('[useTalkingHead] Cleaning up', existingCanvases.length, 'existing canvas elements');
          existingCanvases.forEach(canvas => canvas.remove());
        }
        
        // Also clear any other child elements that might be left over
        const children = Array.from(containerRef.current.children);
        children.forEach(child => {
          if (child.tagName === 'CANVAS' || child.classList.contains('talking-head-element')) {
            child.remove();
          }
        });
      }
      
      // Dispose of any existing TalkingHead instance
      if (headRef.current) {
        console.log('[useTalkingHead] Disposing existing TalkingHead instance');
        try {
          headRef.current.dispose?.();
        } catch (e) {
          console.warn('[useTalkingHead] Error disposing existing instance:', e);
        }
        headRef.current = null;
      }
      
      let head: TalkingHead;
      try {
        head = new TalkingHead(containerRef.current, {
          ttsEndpoint: ttsEndpoint, // placeholder, we won't call speakText()
          // Enable English lipsync module so speakAudio can auto-generate visemes from words.
          lipsyncModules: ['en'],
          lipsyncLang: 'en',
          // Mute TalkingHead's internal speech audio; we play audio via EnhancedTTS
          mixerGainSpeech: 0,
          // avatarMood will be set by personality system after initialization
          cameraView: 'upper', // hoose one of "full", "mid", "upper", "head"
          cameraDistance: 4.5, // Closer camera for better zoom
          cameraY: 1.0 // Slightly higher camera position to focus on upper area
        });
      } catch (e:any) {
        console.error('TalkingHead construct error', e);
        setError(e?.message || 'Failed to initialize TalkingHead');
        return;
      }
      headRef.current = head;
      
      // Initialize animation manager
      animationManagerRef.current = new AvatarAnimationManager(head);
      
      // TalkingHead handles canvas creation internally when container is provided
      setTimeout(() => {
        const canvases = containerRef.current?.querySelectorAll('canvas');
        console.log('[useTalkingHead] Found', canvases?.length || 0, 'canvas elements');
        if (canvases && canvases.length > 0) {
          // Only style the first canvas to avoid duplicates
          const canvas = canvases[0];
          canvas.style.display = 'block';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.minWidth = '300px';
          canvas.style.minHeight = '400px';
          
          // Hide any additional canvases that might be duplicates
          for (let i = 1; i < canvases.length; i++) {
            console.warn('[useTalkingHead] Hiding duplicate canvas', i);
            canvases[i].style.display = 'none';
          }
        }
      }, 250);

      handleResize = () => {
        // TalkingHead manages its own rendering size
      };
      window.addEventListener('resize', handleResize);
      try {
        await head.showAvatar({ 
          url: avatarUrl, 
          lipsyncLang: 'en'
          // avatarMood will be set by personality system after avatar loads
        });
        if (disposed) {
          return;
        }
        setReady(true);
        
        // Add visual feedback that avatar is ready
        setTimeout(() => {
          const canvas = containerRef.current?.querySelector('canvas');
          if (canvas) {
            canvas.classList.add('avatar-ready');
          }
        }, 100);
      } catch (e:any) {
        console.error('Avatar load failed', e);
        setError(e?.message || 'Avatar load failed');
      }
    };
    init();
    return () => {
      disposed = true;
      if (handleResize) try { window.removeEventListener('resize', handleResize); } catch {}
      // Cleanup animation manager
      try { animationManagerRef.current?.dispose?.(); } catch {}
      // Dispose of the TalkingHead instance
      try { 
        headRef.current?.dispose?.(); 
        headRef.current = null;
      } catch {}
      // Clear any remaining canvas elements
      if (containerRef.current) {
        const canvases = containerRef.current.querySelectorAll('canvas');
        canvases.forEach(canvas => canvas.remove());
      }
    };
  }, [avatarUrl, highDPI, ttsEndpoint]);

  const speak = useCallback(async (audioBuffer: AudioBuffer, timings?: SpeakWordTiming[]) => {
    if (!headRef.current) {
      console.warn('No head instance available');
      return;
    }
    setSpeaking(true);
    
    try {
      // Enhanced mobile audio compatibility
      const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);
      const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('[useTalkingHead] Mobile device detected' + (isIOSChrome ? ' (iOS Chrome)' : '') + ', checking audio context...');
        
        // Ensure global audio context is available and active
        const globalCtx = (window as any).globalAudioContext;
        if (globalCtx && globalCtx.state === 'suspended') {
          console.log('[useTalkingHead] Resuming suspended AudioContext...');
          await globalCtx.resume();
          
          // iOS Chrome may need additional time for WebKit to activate
          if (isIOSChrome) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
      
      // Create audio object for TalkingHead with enhanced timing
      // For iPhone compatibility, ensure the AudioBuffer is properly accessible
      let processedAudioBuffer = audioBuffer;
      
      // On iOS, sometimes the AudioBuffer needs to be reconstructed for proper access
      if (isMobile) {
        try {
          // Get the audio context that created this buffer
          const audioCtx = (window as any).globalAudioContext;
          if (audioCtx && audioBuffer.sampleRate !== audioCtx.sampleRate) {
            console.log('[useTalkingHead] AudioBuffer sample rate mismatch, reconstructing for iOS compatibility');
            
            // Create a new buffer with the correct sample rate
            const newBuffer = audioCtx.createBuffer(
              audioBuffer.numberOfChannels,
              Math.floor(audioBuffer.length * (audioCtx.sampleRate / audioBuffer.sampleRate)),
              audioCtx.sampleRate
            );
            
            // Copy and resample the audio data
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
              const oldData = audioBuffer.getChannelData(channel);
              const newData = newBuffer.getChannelData(channel);
              
              // Simple linear interpolation resampling
              const ratio = oldData.length / newData.length;
              for (let i = 0; i < newData.length; i++) {
                const oldIndex = i * ratio;
                const index = Math.floor(oldIndex);
                const frac = oldIndex - index;
                
                if (index + 1 < oldData.length) {
                  newData[i] = oldData[index] * (1 - frac) + oldData[index + 1] * frac;
                } else {
                  newData[i] = oldData[index] || 0;
                }
              }
            }
            
            processedAudioBuffer = newBuffer;
            console.log('[useTalkingHead] AudioBuffer reconstructed for iOS compatibility');
          }
        } catch (resampleError) {
          console.warn('[useTalkingHead] AudioBuffer resampling failed, using original:', resampleError);
          processedAudioBuffer = audioBuffer;
        }
      }
      
      const audioObj = {
        audio: processedAudioBuffer,
        words: timings?.map(t => t.word) || [],
        wtimes: timings?.map(t => t.start) || [],
        wdurations: timings?.map(t => t.end - t.start) || []
      };
      
      console.log('[useTalkingHead] Starting avatar speech with audio duration:', audioBuffer.duration);
      
      // Use promise-based approach to better track completion
      await new Promise<void>((resolve, reject) => {
        let isResolved = false;
        const cleanup = () => {
          if (!isResolved) {
            isResolved = true;
            setSpeaking(false);
          }
        };
        
        // Adjust timeout for mobile devices - iOS Chrome may need more time
        const baseDuration = audioBuffer.duration * 1000;
        const mobileBuffer = isMobile ? 2000 : 1000; // Extra buffer for mobile
        const iosBuffer = isIOSChrome ? 1000 : 0; // Additional buffer for iOS Chrome
        const maxDuration = Math.max(baseDuration + mobileBuffer + iosBuffer, 5000);
        
        console.log('[useTalkingHead] Setting timeout for', maxDuration, 'ms (mobile:', isMobile, ', iOS Chrome:', isIOSChrome, ')');
        
        const timeoutId = setTimeout(() => {
          console.log('[useTalkingHead] speak timeout reached');
          cleanup();
          resolve();
        }, maxDuration);
        
        try {
          // Check if speakAudio method exists and call it
          if (typeof headRef.current?.speakAudio === 'function') {
            console.log('[useTalkingHead] Calling speakAudio...');
            headRef.current.speakAudio(audioObj, {}, () => {
              console.log('[useTalkingHead] speakAudio callback fired');
              clearTimeout(timeoutId);
              cleanup();
              resolve();
            });
          } else {
            console.warn('speakAudio method not available');
            clearTimeout(timeoutId);
            cleanup();
            resolve();
          }
        } catch (error) {
          console.error('speakAudio error:', error);
          clearTimeout(timeoutId);
          cleanup();
          reject(error);
        }
      });
      
      console.log('[useTalkingHead] speak completed successfully');
    } catch (e) {
      console.error('speak error:', e);
      setSpeaking(false);
      throw e;
    }
  }, []);

  const resetCamera = useCallback(() => {
    // future enhancement - reposition camera
  }, []);

  // Enhanced animation methods
  const setEmotion = useCallback((emotion: EmotionType, intensity?: AnimationIntensity) => {
    animationManagerRef.current?.setEmotion(emotion, intensity);
  }, []);

  const performGesture = useCallback(async (gesture: GestureType) => {
    if (animationManagerRef.current) {
      await animationManagerRef.current.performGesture(gesture);
    }
  }, []);

  return { 
    containerRef, 
    head: headRef.current, 
    isReady, 
    isSpeaking, 
    error, 
    speak, 
    resetCamera,
    setEmotion,
    performGesture,
    animationManager: animationManagerRef.current
  };
}
