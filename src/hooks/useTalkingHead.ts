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
      console.error('[useTalkingHead] No head instance available');
      return;
    }
    
    console.log('[useTalkingHead] TalkingHead instance:', {
      hasInstance: !!headRef.current,
      hasSpeakAudio: typeof headRef.current?.speakAudio === 'function',
      instanceType: headRef.current?.constructor?.name
    });
    
    setSpeaking(true);
    
    try {
      // Debug timing data
      console.log('[useTalkingHead] Debug - Audio duration:', audioBuffer.duration);
      console.log('[useTalkingHead] Debug - Timings received:', timings);
      console.log('[useTalkingHead] Debug - Words:', timings?.map(t => t.word));
      console.log('[useTalkingHead] Debug - Start times:', timings?.map(t => t.start));
      console.log('[useTalkingHead] Debug - End times:', timings?.map(t => t.end));
      
      // Create simple audio object for TalkingHead - back to basics
      const audioObj = {
        audio: audioBuffer,
        words: timings?.map(t => t.word) || [],
        wtimes: timings?.map(t => t.start) || [],
        wdurations: timings?.map(t => t.end - t.start) || []
      };
      
      console.log('[useTalkingHead] Debug - Final audioObj:', audioObj);
      
      // Simple promise-based approach with debug tracking
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.log('[useTalkingHead] TIMEOUT - speakAudio did not complete');
          setSpeaking(false);
          resolve();
        }, (audioBuffer.duration * 1000) + 1000);
        
        if (typeof headRef.current?.speakAudio === 'function') {
          console.log('[useTalkingHead] Calling TalkingHead.speakAudio...');
          try {
            headRef.current.speakAudio(audioObj, {}, () => {
              console.log('[useTalkingHead] SUCCESS - speakAudio callback fired!');
              clearTimeout(timeoutId);
              setSpeaking(false);
              resolve();
            });
            console.log('[useTalkingHead] speakAudio call completed (waiting for callback)');
          } catch (error) {
            console.error('[useTalkingHead] ERROR calling speakAudio:', error);
            clearTimeout(timeoutId);
            setSpeaking(false);
            resolve();
          }
        } else {
          console.error('[useTalkingHead] speakAudio method not available!');
          clearTimeout(timeoutId);
          setSpeaking(false);
          resolve();
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
      console.warn('[useTalkingHead] No TalkingHead instance for iOS warm-up');
      return;
    }
    
    const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      console.log('[useTalkingHead] Desktop detected, skipping iOS warm-up');
      return;
    }
    
    try {
      console.log('[useTalkingHead] Warming up TalkingHead for iOS Safari...');
      
      // Create a tiny silent audio buffer to initialize the audio system
      const audioCtx = (window as any).globalAudioContext;
      if (audioCtx) {
        const silentBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.01, audioCtx.sampleRate); // 10ms silent
        const channelData = silentBuffer.getChannelData(0);
        channelData.fill(0); // Ensure silence
        
        // Call speakAudio with empty/minimal data to initialize the system
        const warmUpObj = {
          audio: silentBuffer,
          words: [],
          wtimes: [],
          wdurations: []
        };
        
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(resolve, 100); // Quick timeout
          
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
        
        console.log('[useTalkingHead] iOS Safari warm-up completed');
      }
    } catch (error) {
      console.warn('[useTalkingHead] iOS warm-up failed:', error);
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
    warmUpForIOS,
    setEmotion,
    performGesture,
    animationManager: animationManagerRef.current
  };
}
