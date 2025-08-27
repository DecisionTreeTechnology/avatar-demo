import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

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
  
  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setRetryCount(0);
  }, []);

  const attemptRestart = useCallback(() => {
    if (!shouldRestart) return;
    
    const now = Date.now();
    const timeSinceLastRestart = now - lastRestartTime;
    
    // Prevent too frequent restarts (minimum 1 second between attempts)
    if (timeSinceLastRestart < 1000) return;
    
    // Stop retry attempts after 5 failures
    if (retryCount >= 5) {
      console.log('Max retry attempts reached, stopping speech recognition');
      setShouldRestart(false);
      setRetryCount(0);
      return;
    }
    
    console.log(`Attempting to restart speech recognition (attempt ${retryCount + 1})`);
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
        
        newRecognition.onstart = () => setIsListening(true);
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
        };
        
        newRecognition.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);
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
  }, [shouldRestart, lastRestartTime, retryCount, isListening, isSupported, continuous, interimResults, language]);

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
    };

    recognitionRef.current.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      
      // Handle different error types
      if (event.error === 'no-speech') {
        // Don't show error for no-speech - it's common and expected
        // Just silently restart if user wants continuous listening
        console.log('No speech detected, will retry...');
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
        console.log('Network error in speech recognition, will retry...');
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
        console.log(`Speech recognition error: ${event.error}, will retry...`);
        setError(null); // Don't show most errors to user
        setIsListening(false);
        if (shouldRestart) {
          attemptRestart();
        }
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      
      // Auto-restart if we should be listening and it wasn't manually stopped
      if (shouldRestart) {
        console.log('Speech recognition ended, attempting restart...');
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
  }, [continuous, interimResults, language, isSupported]);

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
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error
  };
}
