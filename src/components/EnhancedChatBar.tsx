import React, { useState, useEffect, useRef } from 'react';
import { useEnhancedSpeechRecognition } from '../hooks/useEnhancedSpeechRecognition';

interface EnhancedChatBarProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
  busyLabel?: string;
  onInteraction?: () => Promise<void> | void;
  onToggleSettings?: () => void;
  // New props for TTS integration
  isTTSSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

export const EnhancedChatBar: React.FC<EnhancedChatBarProps> = ({ 
  disabled, 
  placeholder, 
  onSend, 
  busyLabel = 'Working...', 
  onInteraction, 
  onToggleSettings,
  isTTSSpeaking = false,
  onStopSpeaking
}) => {
  const [value, setValue] = useState('');
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  
  const speechRecognition = useEnhancedSpeechRecognition({
    feedbackFilterThreshold: 3, // Slightly more aggressive filtering
    autoRestartAfterTTS: true  // Auto-restart after TTS to prevent stuck spinning button
  });

  // Integrate with TTS state - Primary TTS state management
  useEffect(() => {
    if (isTTSSpeaking) {
      console.log('[EnhancedChatBar] TTS started - notifying speech recognition');
      speechRecognition.notifyTTSStarted();
    } else {
      console.log('[EnhancedChatBar] TTS ended - notifying speech recognition');
      speechRecognition.notifyTTSEnded();
    }
  }, [isTTSSpeaking, speechRecognition]);

  // Handle other busy states (LLM processing, etc.) - Secondary state management
  useEffect(() => {
    // Only manage non-TTS busy states to avoid conflicts with TTS state above
    const isNonTTSBusy = disabled && !isTTSSpeaking;
    
    if (isNonTTSBusy && speechRecognition.isListening) {
      console.log('[EnhancedChatBar] Non-TTS busy (LLM processing) - stopping microphone');
      speechRecognition.notifyTTSStarted(); // Use TTS notification for consistency
    } else if (!disabled && !isTTSSpeaking && speechRecognition.userIntentToListen) {
      console.log('[EnhancedChatBar] System ready - restarting microphone directly');
      
      // Clear TTS state first
      speechRecognition.notifyTTSEnded();
      
      // Then directly restart the microphone
      setTimeout(() => {
        console.log('[EnhancedChatBar] Direct restart after TTS completion');
        speechRecognition.startListening();
      }, 200);
    }
  }, [disabled, isTTSSpeaking, speechRecognition]);

  // Update input value when speech recognition provides transcript
  useEffect(() => {
    if (speechRecognition.transcript) {
      setValue(prev => prev + speechRecognition.transcript);
      speechRecognition.resetTranscript();
      setLastSpeechTime(Date.now());
    }
  }, [speechRecognition.transcript, speechRecognition]);

  // Update last speech time when there's interim results (user is actively speaking)
  useEffect(() => {
    if (speechRecognition.interimTranscript && speechRecognition.isListening) {
      setLastSpeechTime(Date.now());
    }
  }, [speechRecognition.interimTranscript, speechRecognition.isListening]);

  // Clear speech error after 5 seconds
  useEffect(() => {
    if (speechRecognition.error) {
      const timer = setTimeout(() => {
        speechRecognition.resetTranscript(); // This will also clear the error
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [speechRecognition.error, speechRecognition]);

  // Auto-send after pause in speech (with delay)
  useEffect(() => {
    // Clear any existing timer
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
    }

    if (speechRecognition.isListening && value.trim() && value.trim().length > 5 && lastSpeechTime > 0) {
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
  }, [speechRecognition.isListening, value, lastSpeechTime, onSend]);

  const toggleListening = async () => {
    // Initialize audio context on user interaction
    await onInteraction?.();
    
    if (speechRecognition.userIntentToListen) {
      // User wants to stop listening
      console.log('[EnhancedChatBar] User stopping listening');
      speechRecognition.stopListening();
    } else {
      // User wants to start listening
      console.log('[EnhancedChatBar] User starting listening');
      speechRecognition.startListening();
    }
  };

  // Get microphone button state and styling
  const getMicrophoneButtonState = () => {
    if (!speechRecognition.canStartCapture) {
      return {
        className: 'bg-gray-700 text-gray-400 cursor-not-allowed',
        title: speechRecognition.isTTSSpeaking 
          ? 'Microphone disabled during speech playback'
          : 'Microphone temporarily unavailable',
        disabled: true
      };
    }
    
    if (speechRecognition.userIntentToListen) {
      if (speechRecognition.isListening) {
        return {
          className: 'bg-red-500 hover:bg-red-600 text-white animate-pulse',
          title: 'Click to stop listening',
          disabled: false
        };
      } else {
        return {
          className: 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse',
          title: 'Waiting to start... Click to cancel',
          disabled: false
        };
      }
    }
    
    return {
      className: 'bg-gray-600 hover:bg-gray-500 text-gray-300',
      title: 'Click to start voice input',
      disabled: false
    };
  };

  // Display value includes interim results while listening
  const displayValue = value + (speechRecognition.isListening ? speechRecognition.interimTranscript : '');

  // Detect iOS Chrome for input optimization
  const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);

  const micButtonState = getMicrophoneButtonState();

  return (
    <div className="flex gap-3 items-center flex-1 relative landscape:flex-col landscape:gap-4">
      <div className="flex-1 relative landscape:w-full">
        <input
          type="text"
          className="w-full input-pill text-base min-h-[48px] landscape:min-h-[44px] landscape:text-sm"
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
      
      {/* Button row for landscape mode */}
      <div className="flex gap-3 landscape:w-full landscape:justify-center">
        {/* Enhanced Microphone button */}
        {speechRecognition.isSupported && (
          <button
            type="button"
            className={`p-3 rounded-full transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center landscape:min-w-[52px] landscape:min-h-[52px] ${micButtonState.className}`}
            onClick={toggleListening}
            disabled={micButtonState.disabled}
            title={micButtonState.title}
          >
            {speechRecognition.isListening ? (
              <svg className="w-6 h-6 landscape:w-7 landscape:h-7" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" fill="currentColor" />
                <circle cx="12" cy="12" r="4" fill="white" />
              </svg>
            ) : speechRecognition.userIntentToListen ? (
              // Waiting/loading state
              <svg className="w-6 h-6 landscape:w-7 landscape:h-7 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ) : (
              // Regular microphone icon
              <svg className="w-6 h-6 landscape:w-7 landscape:h-7" fill="currentColor" viewBox="0 0 24 24" stroke="none">
                <path d="M12 1c-1.66 0-3 1.34-3 3v6c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>
        )}
        
        <button
          data-testid="ask-button"
          className="btn-base bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 min-h-[48px] text-base font-medium landscape:px-8 landscape:py-3 landscape:min-h-[52px] landscape:text-base landscape:flex-1"
          disabled={disabled}
          onClick={() => {
            if (!value.trim()) {
              return;
            }
            onInteraction?.();
            onSend(value);
            setValue('');
          }}
        >{disabled ? busyLabel : 'Ask'}</button>
        
        {/* Stop TTS Button - Only visible when TTS is speaking */}
        {isTTSSpeaking && onStopSpeaking && (
          <button
            data-testid="stop-tts-button"
            className="btn-base bg-red-600 hover:bg-red-500 text-white px-4 py-3 min-h-[48px] landscape:min-h-[52px] z-50 relative animate-pulse border-2 border-red-400"
            onClick={(e) => {
              console.log('[EnhancedChatBar] Stop button clicked!');
              e.preventDefault();
              e.stopPropagation();
              onStopSpeaking();
            }}
            disabled={false}
            title="Stop speaking - Click to interrupt"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6v4H9z" />
            </svg>
          </button>
        )}
        
                {/* Settings Button */}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            className="btn-base bg-gray-600 hover:bg-gray-500 text-white px-4 py-3 min-h-[48px] landscape:min-h-[52px]"
            title="Toggle Animation Controls"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Enhanced Error Display */}
      {speechRecognition.error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm shadow-lg z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <strong>Microphone Issue</strong>
              </div>
              <p>{speechRecognition.error}</p>
              {speechRecognition.retryCount > 0 && (
                <p className="text-xs mt-1 text-red-600">
                  Retry attempt: {speechRecognition.retryCount}
                </p>
              )}
            </div>
            <button
              onClick={() => speechRecognition.resetTranscript()}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
