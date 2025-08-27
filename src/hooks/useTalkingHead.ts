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
      if (!containerRef.current) return;
      let head: TalkingHead;
      try {
        head = new TalkingHead(containerRef.current, {
          ttsEndpoint: ttsEndpoint, // placeholder, we won't call speakText()
          // Enable English lipsync module so speakAudio can auto-generate visemes from words.
          lipsyncModules: ['en'],
          avatarMood: 'neutral',
          cameraView: 'head'
        });
      } catch (e:any) {
        console.error('[useTalkingHead] construct error', e);
        setError(e?.message || 'Failed to initialize TalkingHead');
        return;
      }
      headRef.current = head;
      console.log('[diag] TalkingHead constructed');
      
      // TalkingHead handles canvas creation internally when container is provided
      setTimeout(() => {
        console.log('[diag] container canvas elements after construct', containerRef.current?.querySelectorAll('canvas'));
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
        if (disposed) return;
        setReady(true);
        console.log('[diag] Avatar loaded, armature=', !!head.armature);
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
    if (!headRef.current) return;
    console.log('[useTalkingHead] Starting speak with buffer duration:', audioBuffer.duration, 'timings:', timings?.length);
    setSpeaking(true);
    try {
      const audioObj = {
        // Pass AudioBuffer directly (NOT inside an array) so TalkingHead uses it as-is.
        audio: audioBuffer,
        words: timings?.map(t => t.word) || [],
        wtimes: timings?.map(t => t.start) || [],
        wdurations: timings?.map(t => t.end - t.start) || []
        // No visemes: library will compute from words using english module.
      };
      console.log('[useTalkingHead] Calling speakAudio with:', {
        audioBufferDuration: audioBuffer.duration,
        wordCount: audioObj.words.length,
        wtimesCount: audioObj.wtimes.length
      });
      
      // Try the original approach first
      headRef.current.speakAudio(audioObj, {}, null);
      console.log('[useTalkingHead] speakAudio called');
      
      // Wait for the audio duration + some buffer time
      await new Promise(resolve => setTimeout(resolve, (audioBuffer.duration * 1000) + 500));
      console.log('[useTalkingHead] speak completed (timeout-based)');
    } catch (e) {
      console.error('[useTalkingHead] speak error:', e);
      throw e;
    } finally {
      setSpeaking(false);
    }
  }, []);

  const resetCamera = useCallback(() => {
    // future enhancement - reposition camera
  }, []);

  return { containerRef, head: headRef.current, isReady, isSpeaking, error, speak, resetCamera };
}
