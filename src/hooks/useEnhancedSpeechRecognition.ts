import { useState, useEffect, useCallback, useRef } from 'react';
import { getMicrophoneManager, MicrophoneStateManager } from '../utils/microphoneStateManager';

interface UseEnhancedSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  feedbackFilterThreshold?: number;
  autoRestartAfterTTS?: boolean;
}

interface UseEnhancedSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  userIntentToListen: boolean;
  canStartCapture: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
  isTTSSpeaking: boolean;
  retryCount: number;
  // New methods for TTS integration
  notifyTTSStarted: () => void;
  notifyTTSEnded: () => void;
  temporarilyDisable: (durationMs?: number) => void;
}

export function useEnhancedSpeechRecognition(
  options: UseEnhancedSpeechRecognitionOptions = {}
): UseEnhancedSpeechRecognitionReturn {
  const {
    feedbackFilterThreshold = 2,
    autoRestartAfterTTS = false
  } = options;

  // State
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [managerState, setManagerState] = useState(() => {
    const manager = getMicrophoneManager({
      feedbackFilterThreshold,
      autoRestartAfterTTS
    });
    return manager.getPublicState();
  });

  // Refs
  const managerRef = useRef<MicrophoneStateManager | null>(null);
  const mountedRef = useRef(true);

  // Initialize manager
  useEffect(() => {
    managerRef.current = getMicrophoneManager({
      feedbackFilterThreshold,
      autoRestartAfterTTS
    });

    const manager = managerRef.current;

    // Set up event listeners
    const handleStateChanged = (event: any) => {
      if (!mountedRef.current) return;

      if (event.data?.type === 'transcript') {
        if (event.data.finalTranscript) {
          setTranscript(prev => prev + event.data.finalTranscript);
        }
        if (event.data.interimTranscript !== undefined) {
          setInterimTranscript(event.data.interimTranscript);
        }
      } else if (event.data?.type === 'interim') {
        setInterimTranscript(event.data.interimTranscript || '');
      } else {
        // General state change
        setManagerState(manager.getPublicState());
      }
    };

    const handleCaptureStarted = () => {
      if (!mountedRef.current) return;
      console.log('[useEnhancedSpeechRecognition] Capture started');
      setError(null);
      setManagerState(manager.getPublicState());
    };

    const handleCaptureStopped = () => {
      if (!mountedRef.current) return;
      console.log('[useEnhancedSpeechRecognition] Capture stopped');
      setInterimTranscript('');
      setManagerState(manager.getPublicState());
    };

    const handleError = (event: any) => {
      if (!mountedRef.current) return;
      console.error('[useEnhancedSpeechRecognition] Error:', event.data);
      
      const errorMessage = event.data?.error || 'Unknown error';
      const isPermissionError = event.data?.isPermissionError || false;
      
      if (isPermissionError) {
        const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
        const isSecureContext = window.isSecureContext;
        
        if (isIOS && !isSecureContext) {
          setError('🔒 Microphone requires HTTPS on iOS. Please use Safari or an HTTPS connection.');
        } else {
          setError('🎙️ Microphone access denied. Please allow microphone access in your browser settings.');
        }
      } else {
        setError(`🎙️ ${errorMessage}`);
      }
      
      setManagerState(manager.getPublicState());
    };

    const handleFeedbackPrevented = (event: any) => {
      if (!mountedRef.current) return;
      console.log('[useEnhancedSpeechRecognition] Feedback prevented:', event.data);
      // Could emit a subtle UI indication here if needed
    };

    const handleTTSBlocked = (event: any) => {
      if (!mountedRef.current) return;
      console.log('[useEnhancedSpeechRecognition] TTS blocked microphone:', event.data);
    };

    // Add event listeners
    manager.addEventListener('stateChanged', handleStateChanged);
    manager.addEventListener('captureStarted', handleCaptureStarted);
    manager.addEventListener('captureStopped', handleCaptureStopped);
    manager.addEventListener('error', handleError);
    manager.addEventListener('feedbackPrevented', handleFeedbackPrevented);
    manager.addEventListener('ttsBlocked', handleTTSBlocked);

    // Update initial state
    setManagerState(manager.getPublicState());

    return () => {
      // Remove event listeners
      manager.removeEventListener('stateChanged', handleStateChanged);
      manager.removeEventListener('captureStarted', handleCaptureStarted);
      manager.removeEventListener('captureStopped', handleCaptureStopped);
      manager.removeEventListener('error', handleError);
      manager.removeEventListener('feedbackPrevented', handleFeedbackPrevented);
      manager.removeEventListener('ttsBlocked', handleTTSBlocked);
    };
  }, [feedbackFilterThreshold, autoRestartAfterTTS]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          setError(null);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Public methods
  const startListening = useCallback(() => {
    if (!managerRef.current) return;
    
    console.log('[useEnhancedSpeechRecognition] Starting listening');
    setError(null);
    managerRef.current.startCapture();
  }, []);

  const stopListening = useCallback(() => {
    if (!managerRef.current) return;
    
    console.log('[useEnhancedSpeechRecognition] Stopping listening');
    managerRef.current.stopCapture('USER_REQUEST');
  }, []);

  const resetTranscript = useCallback(() => {
    console.log('[useEnhancedSpeechRecognition] Resetting transcript');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const notifyTTSStarted = useCallback(() => {
    if (!managerRef.current) return;
    
    console.log('[useEnhancedSpeechRecognition] Notifying TTS started');
    managerRef.current.notifyTTSStarted();
  }, []);

  const notifyTTSEnded = useCallback(() => {
    if (!managerRef.current) return;
    
    console.log('[useEnhancedSpeechRecognition] Notifying TTS ended');
    managerRef.current.notifyTTSEnded();
  }, []);

  const temporarilyDisable = useCallback((durationMs = 5000) => {
    if (!managerRef.current) return;
    
    console.log('[useEnhancedSpeechRecognition] Temporarily disabling for', durationMs, 'ms');
    managerRef.current.temporarilyDisable(durationMs);
  }, []);

  // Return enhanced interface
  return {
    isListening: managerState.isCapturing,
    transcript,
    interimTranscript,
    isSupported: managerRef.current?.isSupported() ?? false,
    userIntentToListen: managerState.userIntentToListen,
    canStartCapture: managerState.canStartCapture,
    startListening,
    stopListening,
    resetTranscript,
    error,
    isTTSSpeaking: managerState.isTTSSpeaking,
    retryCount: managerState.retryCount,
    // TTS integration methods
    notifyTTSStarted,
    notifyTTSEnded,
    temporarilyDisable
  };
}
