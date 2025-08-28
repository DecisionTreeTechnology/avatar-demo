import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  forceStop: () => void; // Immediate stop without restart capability
  resetTranscript: () => void;
  error: string | null;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    continuous = false,
    interimResults = true,
    language = 'en-US'
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shouldRestart, setShouldRestart] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRestartTime, setLastRestartTime] = useState(0);
  
  const recognitionRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setRetryCount(0);
  }, []);

  const stopRecognitionTimer = useCallback(() => {
    if (recognitionTimerRef.current) {
      clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }
  }, []);

  const startRecognitionTimer = useCallback(() => {
    stopRecognitionTimer();
    recognitionTimerRef.current = setTimeout(() => {
      if (isListening) {
        // If recognition is active but no result, it might be stuck.
        // Force a restart.
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }
    }, 5000); // 5 seconds timeout
  }, [isListening, stopRecognitionTimer]);

  const attemptRestart = useCallback(() => {
    if (!shouldRestart) return;
    
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;
    
    // Prevent too frequent restarts (minimum 1 second between attempts)
    if (timeSinceLastRestart < 1000) return;
    
    // Stop retry attempts after 5 failures
    if (retryCount >= 5) {
      setShouldRestart(false);
      setRetryCount(0);
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setLastRestartTime(now);
    
    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Try to restart after a short delay
    retryTimeoutRef.current = setTimeout(() => {
      if (shouldRestart && !isListening) {
        // Restart by creating a new recognition instance
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const newRecognition = new SpeechRecognition();
        
        newRecognition.continuous = continuous;
        newRecognition.interimResults = interimResults;
        newRecognition.lang = language;
        newRecognition.maxAlternatives = 1;
        
        newRecognition.onstart = () => {
          setIsListening(true);
          startRecognitionTimer();
        };
        newRecognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
          }
          setInterimTranscript(interimTranscript);
          startRecognitionTimer(); // Reset timer on new results
        };
        
        newRecognition.onerror = (event: any) => {
          stopRecognitionTimer();
          if (event.error === 'no-speech' || event.error === 'network') {
            setError(null);
            setIsListening(false);
          } else {
            setIsListening(false);
            setShouldRestart(false);
            setRetryCount(0);
          }
        };
        
        newRecognition.onend = () => {
          stopRecognitionTimer();
          setIsListening(false);
          setInterimTranscript('');
        };
        
        recognitionRef.current = newRecognition;
        
        try {
          newRecognition.start();
        } catch (err) {
          console.log('Failed to restart speech recognition:', err);
        }
      }
    }, 1000 + (retryCount * 500)); // Exponential backoff
  }, [shouldRestart, lastRestartTime, retryCount, isListening, isSupported, continuous, interimResults, language, startRecognitionTimer, stopRecognitionTimer]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);
    setShouldRestart(true);
    setLastRestartTime(Date.now());
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    recognitionRef.current.continuous = continuous;
    recognitionRef.current.interimResults = interimResults;
    recognitionRef.current.lang = language;
    recognitionRef.current.maxAlternatives = 1;
    
    // Set timeouts to handle no-speech scenarios better
    if (recognitionRef.current.serviceURI !== undefined) {
      // For webkitSpeechRecognition, we can set some additional properties
      recognitionRef.current.grammars = undefined; // Use default grammar
    }

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      startRecognitionTimer();
    };

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
      setInterimTranscript(interimTranscript);
      startRecognitionTimer(); // Reset timer on new results
    };

    recognitionRef.current.onerror = (event: any) => {
      stopRecognitionTimer();
      // Handle different error types
      if (event.error === 'no-speech') {
        // Don't show error for no-speech - it's common and expected
        // Just silently restart if user wants continuous listening
        setError(null);
        setIsListening(false);
        if (shouldRestart) {
          attemptRestart();
        }
      } else if (event.error === 'audio-capture') {
        setError('Microphone access denied or not available.');
        setIsListening(false);
        setShouldRestart(false);
        setRetryCount(0);
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setIsListening(false);
        setShouldRestart(false);
        setRetryCount(0);
      } else if (event.error === 'network') {
        // Network errors are common - just log and retry
        setError(null);
        setIsListening(false);
        if (shouldRestart) {
          attemptRestart();
        }
      } else if (event.error === 'aborted') {
        // Don't show error for user-initiated abort
        setError(null);
        setIsListening(false);
        setShouldRestart(false);
        setRetryCount(0);
      } else {
        setError(null); // Don't show most errors to user
        setIsListening(false);
        if (shouldRestart) {
          attemptRestart();
        }
      }
    };

    recognitionRef.current.onend = () => {
      stopRecognitionTimer();
      setIsListening(false);
      setInterimTranscript('');
      
      // Auto-restart if we should be listening and it wasn't manually stopped
      if (shouldRestart) {
        attemptRestart();
      }
    };

    try {
      recognitionRef.current.start();
      setRetryCount(0); // Reset retry count on successful start
    } catch (err: any) {
      setError(`Failed to start speech recognition: ${err.message}`);
      setShouldRestart(false);
      setRetryCount(0);
    }
  }, [continuous, interimResults, language, isSupported, attemptRestart, startRecognitionTimer, stopRecognitionTimer]);

  const stopListening = useCallback(() => {
    setShouldRestart(false);
    setRetryCount(0);
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false); // Immediately set to false
  }, []);

  const forceStop = useCallback(() => {
    setShouldRestart(false);
    setRetryCount(0);
    
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        // Use abort() for immediate stop and also set onend to null to prevent restart
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      } catch (err) {
        console.log('Error force stopping recognition:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognitionTimer();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, [stopRecognitionTimer]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    forceStop,
    resetTranscript,
    error
  };
}
