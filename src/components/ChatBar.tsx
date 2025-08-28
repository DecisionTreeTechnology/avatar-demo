import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatBarProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
  busyLabel?: string;
  onInteraction?: () => Promise<void> | void;
}

export const ChatBar: React.FC<ChatBarProps> = ({ disabled, placeholder, onSend, busyLabel = 'Working...', onInteraction }) => {
  const [value, setValue] = useState('');
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [userWantsListening, setUserWantsListening] = useState(false);
  
  const { 
    isListening, 
    transcript, 
    interimTranscript, 
    isSupported, 
    startListening, 
    forceStop, 
    resetTranscript, 
    error: speechError 
  } = useSpeechRecognition({ continuous: true, interimResults: true });

  // Update input value when speech recognition provides transcript
  useEffect(() => {
    if (transcript) {
      setValue(prev => prev + transcript);
      resetTranscript();
      setLastSpeechTime(Date.now());
    }
  }, [transcript, resetTranscript]);

  // Update last speech time when there's interim results (user is actively speaking)
  useEffect(() => {
    if (interimTranscript && isListening) {
      setLastSpeechTime(Date.now());
    }
  }, [interimTranscript, isListening]);

  // Auto-manage listening state based on avatar busy status
  useEffect(() => {
    if (disabled) {
      // Avatar is busy (speaking/thinking), immediately force stop listening
      forceStop();
    }
  }, [disabled, forceStop]);

  // Separate effect to handle restarting when avatar finishes
  useEffect(() => {
    if (!disabled && userWantsListening && !isListening) {
      // Avatar is done, restart listening if user had it enabled
      // Small delay to ensure avatar audio has stopped playing
      const timer = setTimeout(() => {
        if (!disabled && userWantsListening) {
          startListening();
        }
      }, 750); // Slightly longer delay
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [disabled, userWantsListening, isListening, startListening]);

  // Clear speech error after 5 seconds
  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => {
        resetTranscript(); // This will also clear the error
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [speechError, resetTranscript]);

  // Force reset stuck microphone state after timeout
  useEffect(() => {
    if (userWantsListening && !isListening && !disabled) {
      // If user wants to listen but isn't actually listening and avatar isn't busy
      // Reset after 5 seconds to prevent stuck state
      const resetTimeout = setTimeout(() => {
        console.log('Resetting stuck microphone state');
        setUserWantsListening(false);
      }, 5000);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [userWantsListening, isListening, disabled]);

  // Auto-send after pause in speech (with delay)
  useEffect(() => {
    // Clear any existing timer
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
    }

    if (isListening && value.trim() && value.trim().length > 5 && lastSpeechTime > 0) {
      // Set a timer to auto-send after 3 seconds of no speech activity
      autoSendTimerRef.current = setTimeout(() => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastSpeechTime;

        // Only auto-send if it's been 3+ seconds since last speech activity
        if (timeSinceLastSpeech >= 3000) {
          const text = value.trim();
          if (text && text.length > 5) {
            onSend(text);
            setValue('');
            setLastSpeechTime(0);
          }
        }
      }, 3000);
    }

    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
      }
    };
  }, [isListening, value, lastSpeechTime, onSend]);

  const toggleListening = async () => {
    // Initialize audio context on user interaction
    await onInteraction?.();
    
    if (isListening || userWantsListening) {
      // User wants to stop listening or reset stuck state
      console.log('Stopping listening, userWantsListening:', userWantsListening, 'isListening:', isListening);
      setUserWantsListening(false);
      forceStop(); // Use forceStop instead of stopListening for immediate reset
    } else {
      // User wants to start listening
      console.log('Starting listening');
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

  // Detect iOS Chrome for input optimization
  const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);

  return (
    <div className="flex gap-3 items-center w-full relative">
      <div className="flex-1 relative">
        <input
          className="w-full input-pill text-base min-h-[48px]"
          value={displayValue}
          placeholder={placeholder || 'Press on mic or type to share what is on your mind...'}
          disabled={disabled}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
              e.preventDefault(); 
              if (!value.trim()) return;
              onInteraction?.();
              onSend(value); 
              setValue(''); 
            } 
          }}
          onFocus={() => onInteraction?.()} // Initialize audio context on focus
          autoComplete="off"
          // iOS Chrome compatibility: Allow autocorrect and capitalization for better emoji/special char support
          autoCorrect={isIOSChrome ? "on" : "off"}
          autoCapitalize={isIOSChrome ? "sentences" : "off"}
          spellCheck={isIOSChrome ? "true" : "false"}
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
                  : 'Waiting to start... Click to cancel if stuck'
                )
              : 'Click to start voice input'
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
        data-testid="ask-button"
        className="btn-base bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 min-h-[48px] text-base font-medium"
        disabled={disabled}
        onClick={() => {
          if (!value.trim()) {
            return;
          }
          onInteraction?.();
          onSend(value); // Call directly instead of using ref
          setValue(''); // Clear the input after sending
        }}
      >{disabled ? busyLabel : 'Ask'}</button>
      
      {/* Microphone Error Display */}
      {speechError && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-start justify-between">
            <div>
              <strong>🎙️ Microphone Issue:</strong>
              <p className="mt-1">{speechError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
