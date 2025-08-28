import { useCallback, useEffect, useRef, useState } from 'react';
import { TalkingHead } from '@met4citizen/talkinghead';

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
}

export function useTalkingHead(options: UseTalkingHeadOptions = {}): UseTalkingHeadResult {
  const { avatarUrl = '/avatar.glb', highDPI = true, ttsEndpoint = '/gtts/' } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<TalkingHead | null>(null);
  const [isReady, setReady] = useState(false);
  const [isSpeaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let handleResize: (() => void) | null = null;
    const init = async () => {
      if (!containerRef.current) {
        setTimeout(init, 100);
        return;
      }
      
      let head: TalkingHead;
      try {
        head = new TalkingHead(containerRef.current, {
          ttsEndpoint: ttsEndpoint, // placeholder, we won't call speakText()
          // Enable English lipsync module so speakAudio can auto-generate visemes from words.
          lipsyncModules: ['en'],
          avatarMood: 'neutral',
          cameraView: 'full' // Show full body instead of just head
        });
      } catch (e:any) {
        console.error('TalkingHead construct error', e);
        setError(e?.message || 'Failed to initialize TalkingHead');
        return;
      }
      headRef.current = head;
      
      // TalkingHead handles canvas creation internally when container is provided
      setTimeout(() => {
        const canvases = containerRef.current?.querySelectorAll('canvas');
        if (canvases && canvases.length > 0) {
          canvases.forEach((canvas) => {
            // Force canvas to be visible and sized
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.minWidth = '300px';
            canvas.style.minHeight = '400px';
          });
        }
      }, 250);

      handleResize = () => {
        // TalkingHead manages its own rendering size
      };
      window.addEventListener('resize', handleResize);
      try {
        await head.showAvatar({ 
          url: avatarUrl, 
          lipsyncLang: 'en', 
          avatarMood: 'neutral' 
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
      try { headRef.current?.dispose?.(); } catch {}
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
      const audioObj = {
        audio: audioBuffer,
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

  return { containerRef, head: headRef.current, isReady, isSpeaking, error, speak, resetCamera };
}
