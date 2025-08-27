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
  
  const recognitionRef = useRef<any>(null);
  
  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    setError(null);
    setShouldRestart(true);
    
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
        setError('No speech detected. Please try speaking again.');
        setIsListening(false);
        setShouldRestart(false);
      } else if (event.error === 'audio-capture') {
        setError('Microphone access denied or not available.');
        setIsListening(false);
        setShouldRestart(false);
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
        setIsListening(false);
        setShouldRestart(false);
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
        setIsListening(false);
        setShouldRestart(false);
      } else if (event.error === 'aborted') {
        // Don't show error for user-initiated abort
        setError(null);
        setIsListening(false);
        setShouldRestart(false);
      } else {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setShouldRestart(false);
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      setError(`Failed to start speech recognition: ${err.message}`);
      setShouldRestart(false);
    }
  }, [continuous, interimResults, language, isSupported]);

  const stopListening = useCallback(() => {
    setShouldRestart(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
