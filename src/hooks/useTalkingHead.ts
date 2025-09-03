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
  stopSpeaking: () => void; // Method to stop current speech
  resetCamera: () => void;
  warmUpForIOS: () => Promise<void>; // New method for iOS Safari audio initialization
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
  const stopRequestedRef = useRef(false); // Flag to stop current speech
  
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
          lipsyncModules: ['en'],
          lipsyncLang: 'en',
          mixerGainSpeech: 0, // Mute TalkingHead's internal speech audio
          cameraView: 'upper',
          cameraDistance: 4.5,
          cameraY: 1.0
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
      return;
    }
    
    // Reset stop flag for new speech
    stopRequestedRef.current = false;
    setSpeaking(true);
    
    // Small delay to ensure state propagates before any callbacks
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      // Create audio object for TalkingHead
      const audioObj = {
        audio: audioBuffer,
        words: timings?.map(t => t.word) || [],
        wtimes: timings?.map(t => t.start) || [],
        wdurations: timings?.map(t => t.end - t.start) || []
      };
      
      // Simple promise-based approach with callback deduplication and minimum duration
      await new Promise<void>((resolve) => {
        let callbackFired = false; // Prevent multiple callback executions
        const startTime = Date.now();
        const minSpeakingDuration = 1000; // Keep speaking state for at least 1 second
        
        const cleanup = (reason = 'normal') => {
          if (!callbackFired) {
            callbackFired = true;
            
            if (stopRequestedRef.current || reason === 'stopped') {
              // Immediate cleanup if stop was requested
              setSpeaking(false);
              resolve();
            } else {
              // Normal cleanup with minimum duration
              const elapsed = Date.now() - startTime;
              const remainingTime = Math.max(0, minSpeakingDuration - elapsed);
              
              setTimeout(() => {
                setSpeaking(false);
                resolve();
              }, remainingTime);
            }
          }
        };
        
        const timeoutId = setTimeout(() => {
          cleanup();
        }, (audioBuffer.duration * 1000) + 1000);
        
        // Check for stop request periodically
        const stopCheckInterval = setInterval(() => {
          if (stopRequestedRef.current) {
            clearTimeout(timeoutId);
            clearInterval(stopCheckInterval);
            cleanup('stopped');
          }
        }, 100);
        
        if (typeof headRef.current?.speakAudio === 'function') {
          console.log('[useTalkingHead] Calling speakAudio - keeping isSpeaking true');
          headRef.current.speakAudio(audioObj, {}, () => {
            console.log('[useTalkingHead] speakAudio callback - setting isSpeaking false');
            clearTimeout(timeoutId);
            cleanup();
          });
        } else {
          console.log('[useTalkingHead] ERROR: speakAudio method not available! Setting isSpeaking false immediately');
          clearTimeout(timeoutId);
          cleanup();
        }
      });
    } catch (e) {
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

  // iOS Safari warm-up method - must be called from user gesture
  const warmUpForIOS = useCallback(async () => {
    
    if (!headRef.current) {
      return;
    }
    
    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      return;
    }
    
    
    try {
      // Create a tiny silent audio buffer to initialize the audio system
      const audioCtx = (window as any).globalAudioContext;
      if (audioCtx) {
        const silentBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.01, audioCtx.sampleRate);
        const channelData = silentBuffer.getChannelData(0);
        channelData.fill(0);
        
        // Call speakAudio with silent data to initialize the system
        const warmUpObj = {
          audio: silentBuffer,
          words: [],
          wtimes: [],
          wdurations: []
        };
        
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, 100);
          
          if (typeof headRef.current?.speakAudio === 'function') {
            headRef.current.speakAudio(warmUpObj, {}, () => {
              clearTimeout(timeoutId);
              resolve();
            });
          } else {
            clearTimeout(timeoutId);
            resolve();
          }
        });
      }
    } catch (error) {
      // Silent fail for iOS warm-up
    }
  }, []);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    console.log('[useTalkingHead] stopSpeaking called - stopping current speech and animation');
    stopRequestedRef.current = true;
    
    // Try to stop the TalkingHead animation if possible
    if (headRef.current) {
      try {
        // Check if the TalkingHead library has a stop method
        if (typeof headRef.current.stopSpeaking === 'function') {
          console.log('[useTalkingHead] Calling TalkingHead.stopSpeaking()');
          headRef.current.stopSpeaking();
        } else if (typeof headRef.current.stop === 'function') {
          console.log('[useTalkingHead] Calling TalkingHead.stop()');
          headRef.current.stop();
        } else {
          console.log('[useTalkingHead] No stop method found - using workaround');
          // Workaround: call speakAudio with empty/silent audio to interrupt
          const silentBuffer = new AudioBuffer({
            numberOfChannels: 1,
            length: 1,
            sampleRate: 22050
          });
          const audioObj = {
            audio: silentBuffer,
            timings: []
          };
          headRef.current.speakAudio(audioObj, {}, () => {
            console.log('[useTalkingHead] Silent audio completed - animation should stop');
          });
        }
      } catch (error) {
        console.warn('[useTalkingHead] Error stopping TalkingHead animation:', error);
      }
    }
    
    setSpeaking(false);
  }, []);

  return { 
    containerRef, 
    head: headRef.current, 
    isReady, 
    isSpeaking, 
    error, 
    speak, 
    stopSpeaking,
    resetCamera,
    warmUpForIOS,
    setEmotion,
    performGesture,
    animationManager: animationManagerRef.current
  };
}
