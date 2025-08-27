import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatBarProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
  busyLabel?: string;
}

// Helper function to detect if text appears to be a complete sentence
const isCompleteSentence = (text: string): boolean => {
  if (!text || text.length < 3) return false;
  
  // Check for sentence-ending punctuation
  const endsWithPunctuation = /[.!?]\s*$/.test(text);
  
  // Check for minimum word count (at least 2 words for a sentence)
  const wordCount = text.trim().split(/\s+/).length;
  const hasMinWords = wordCount >= 2;
  
  // Check for common question words or phrases
  const startsWithQuestion = /^(what|how|when|where|why|who|which|can|could|would|should|do|does|did|is|are|am|will|have|has)\b/i.test(text.trim());
  
  // Auto-send if it ends with punctuation and has enough words
  // OR if it's a question (even without punctuation)
  return (endsWithPunctuation && hasMinWords) || (startsWithQuestion && wordCount >= 3);
};

export const ChatBar: React.FC<ChatBarProps> = ({ disabled, placeholder, onSend, busyLabel = 'Working...' }) => {
  const [value, setValue] = useState('');
  const [autoSendTimer, setAutoSendTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [userWantsListening, setUserWantsListening] = useState(false);
  const onSendRef = useRef(onSend);
  
  // Keep onSend ref current
  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: speechError
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language: 'en-US'
  });

  // Update input value when speech recognition provides transcript
  useEffect(() => {
    if (transcript) {
      setValue(prev => prev + transcript);
      resetTranscript();
      setLastSpeechTime(Date.now());
      
      // Auto-send if transcript ends with sentence-ending punctuation
      const fullText = value + transcript;
      if (isCompleteSentence(fullText.trim())) {
        // Small delay to let user see the text before sending
        setTimeout(() => {
          if (fullText.trim()) {
            onSendRef.current(fullText.trim());
            setValue('');
            setLastSpeechTime(0);
          }
        }, 500);
      }
    }
  }, [transcript, resetTranscript, value]);

  // Update last speech time when there's interim results (user is actively speaking)
  useEffect(() => {
    if (interimTranscript && isListening) {
      setLastSpeechTime(Date.now());
    }
  }, [interimTranscript, isListening]);

  // Auto-manage listening state based on avatar busy status
  useEffect(() => {
    if (disabled && isListening) {
      // Avatar is busy (speaking/thinking), stop listening but remember user wants it
      stopListening();
    } else if (!disabled && userWantsListening && !isListening) {
      // Avatar is done, restart listening if user had it enabled
      startListening();
    }
  }, [disabled, isListening, userWantsListening, startListening, stopListening]);

  // Clear speech error after 5 seconds
  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => {
        resetTranscript(); // This will also clear the error
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [speechError, resetTranscript]);

  // Auto-send after pause in speech (with delay)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isListening && value.trim() && value.trim().length > 5 && lastSpeechTime > 0) {
      // Clear any existing timer
      if (autoSendTimer) {
        clearTimeout(autoSendTimer);
        setAutoSendTimer(null);
      }
      
      // Set a timer to auto-send after 3 seconds of no speech activity
      timer = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTime;
        
        // Only auto-send if it's been 3+ seconds since last speech activity
        if (timeSinceLastSpeech >= 3000) {
          const text = value.trim();
          if (text && text.length > 5) {
            onSendRef.current(text);
            setValue('');
            setLastSpeechTime(0);
          }
        }
      }, 3000);
      
      setAutoSendTimer(timer);
    } else if (!isListening || !value.trim()) {
      // Cleanup timer when not listening or no value
      if (autoSendTimer) {
        clearTimeout(autoSendTimer);
        setAutoSendTimer(null);
      }
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isListening, value, lastSpeechTime]); // Removed onSend to prevent re-renders

  const send = () => {
    if (!value.trim()) return;
    onSendRef.current(value);
    setValue(''); // Clear the input after sending
  };

  const toggleListening = () => {
    if (isListening) {
      // User wants to stop listening
      setUserWantsListening(false);
      stopListening();
    } else {
      // User wants to start listening
      setUserWantsListening(true);
      if (!disabled) {
        // Only start if avatar is not busy
        startListening();
      }
      // If avatar is busy, listening will start automatically when it's done
    }
  };

  // Display value includes interim results while listening
  const displayValue = value + (isListening ? interimTranscript : '');

  return (
    <div className="flex gap-3 items-center w-full relative">
      <div className="flex-1 relative">
        <input
          className="w-full input-pill text-base min-h-[48px]"
          value={displayValue}
          placeholder={placeholder || 'Share what is on your mind...'}
          disabled={disabled}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
      </div>
      
      {/* Microphone button - separate from input */}
      {isSupported && (
        <button
          type="button"
          className={`p-3 rounded-full transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center ${
            userWantsListening 
              ? (isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse'
                )
              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
          }`}
          onClick={toggleListening}
          disabled={false}
          title={
            userWantsListening 
              ? (isListening 
                  ? 'Click to stop listening' 
                  : 'Waiting for avatar to finish speaking...'
                )
              : 'Click to start listening'
          }
        >
          {isListening ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" fill="currentColor" />
              <circle cx="12" cy="12" r="4" fill="white" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" stroke="none">
              <path d="M12 1c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>
      )}
      
      <button
        className="btn-base bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 min-h-[48px] text-base font-medium"
        disabled={disabled}
        onClick={send}
      >{disabled ? busyLabel : 'Ask'}</button>
    </div>
  );
};
