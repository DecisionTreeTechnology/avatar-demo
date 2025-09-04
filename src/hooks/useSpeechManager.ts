import { useState, useCallback, useRef } from 'react';
import { useEnhancedAzureTTS } from './useEnhancedAzureTTS';
import { createLogger } from '../utils/logger';

interface SpeechManagerState {
  isSpeaking: boolean;
  stopSpeaking: () => void;
  speakWithAvatar: (text: string, talkingHead: any) => Promise<void>;
}

export const useSpeechManager = (): SpeechManagerState => {
  const { speakText, playAudio, stopSpeaking: stopTTS } = useEnhancedAzureTTS();
  const [isTalkingHeadSpeaking, setIsTalkingHeadSpeaking] = useState(false);
  const speakingStartTimeRef = useRef<number>(0);
  const stopRequestedRef = useRef(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTalkingHeadRef = useRef<any>(null); // Track current TalkingHead for stop functionality
  const logger = createLogger('SpeechManager');

  // Combined stop function that stops both TTS audio and TalkingHead animation
  const handleStopSpeaking = useCallback(() => {
    console.log('[SpeechManager] Stopping both TTS and TalkingHead');
    
    // Set stop flag to prevent delays
    stopRequestedRef.current = true;
    
    // Clear any pending timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    
    // Stop TTS audio playback
    stopTTS();
    
    // Stop TalkingHead avatar lip-sync animation if currently tracked
    if (currentTalkingHeadRef.current && typeof currentTalkingHeadRef.current.stopSpeaking === 'function') {
      console.log('[SpeechManager] Stopping TalkingHead avatar lip-sync animation');
      currentTalkingHeadRef.current.stopSpeaking();
    }
    
    // Reset our local speaking state immediately
    setIsTalkingHeadSpeaking(false);

    // NOTE: This is a manual stop, EnhancedChatBar should handle microphone restart immediately
  }, [stopTTS]);

  const speakWithAvatar = useCallback(async (text: string, talkingHead: any) => {
    try {
      logger.log('Starting speech synthesis and avatar coordination');
      
      // Track the current TalkingHead for stop functionality
      currentTalkingHeadRef.current = talkingHead;
      
      // First synthesize the audio and get word timings
      const { audio, wordTimings } = await speakText(text);

      // Convert word timings to TalkingHead format (milliseconds expected by library)
      const talkingHeadTimings = wordTimings.map((timing: { word: string; start: number; end: number }) => ({
        word: timing.word,
        start: timing.start || 0,
        end: timing.end || 0
      }));
      
      logger.log('Starting avatar speech with lip sync, duration:', audio.duration);
      logger.log('Setting isTalkingHeadSpeaking to true');
      
      // Set speaking state manually since we're bypassing playAudio
      console.log('[SpeechManager] Setting isTalkingHeadSpeaking to TRUE');
      speakingStartTimeRef.current = Date.now(); // Track when speaking started
      stopRequestedRef.current = false; // Reset stop flag for new speech
      
      // Force synchronous state update with multiple setState calls
      setIsTalkingHeadSpeaking(true);
      
      // Add a small delay to ensure state propagates before TalkingHead speak
      await new Promise(resolve => setTimeout(resolve, 100));

      // NOTE: EnhancedChatBar handles microphone notifications based on isTTSSpeaking prop
      
      // Create a more generous timeout to keep the button visible
      const duration = audio.duration * 1000; // Convert to milliseconds
      const generousTimeout = Math.max(duration + 2000, 5000); // At least 5 seconds or duration + 2 seconds
      
      logger.log('Setting timeout for', generousTimeout, 'ms (audio duration:', duration, 'ms)');
      
      speakingTimeoutRef.current = setTimeout(() => {
        logger.log('Timeout reached, setting speaking to false');
        setIsTalkingHeadSpeaking(false);
        speakingTimeoutRef.current = null;
      }, generousTimeout);
      
      // Begin playback via our TTS audio path for iOS reliability
      // Play actual audio using our AudioContext (reliable unlock)
      try {
        void playAudio(audio, wordTimings, () => {
          logger.log('playAudio onEnd fired');
        });
      } catch (playErr) {
        logger.warn('playAudio failed (continuing with avatar only):', playErr);
      }

      // Small delay to ensure all states are properly set before calling TalkingHead
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Drive avatar lipsync with the real audio buffer (TalkingHead's speech is muted)
      talkingHead.speak(audio, talkingHeadTimings).then(() => {
        logger.log('TalkingHead speak completed');
        // Clear extended hold if still pending and release speaking state
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = null;
        }
        console.log('[SpeechManager] TalkingHead speak completed - setting isTalkingHeadSpeaking to FALSE');
        
        // Only reset state if stop wasn't already requested
        if (!stopRequestedRef.current) {
          // Normal completion - wait for TTS audio to finish too
          const elapsed = Date.now() - speakingStartTimeRef.current;
          const expectedDuration = audio.duration * 1000; // Expected TTS duration
          const remainingTime = Math.max(0, expectedDuration - elapsed + 500); // Extra 500ms buffer
          
          setTimeout(() => {
            setIsTalkingHeadSpeaking(false);
          }, remainingTime);
        }

        // NOTE: EnhancedChatBar handles microphone notifications
      }).catch((speakError: unknown) => {
        logger.warn('TalkingHead speak error (continuing):', speakError);
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = null;
        }
        setIsTalkingHeadSpeaking(false);

        // NOTE: EnhancedChatBar handles microphone notifications
      });
      
      logger.log('TalkingHead speak started, button should be visible');
      
    } catch (speechError) {
      logger.error('TTS synthesis or avatar speech failed:', speechError);
      setIsTalkingHeadSpeaking(false); // Ensure speaking state is reset on error
      throw speechError; // Re-throw to allow caller to handle
    }
  }, [speakText, playAudio, logger]);

  return {
    isSpeaking: isTalkingHeadSpeaking,
    stopSpeaking: handleStopSpeaking,
    speakWithAvatar
  };
};