import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatBarProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (text: string) => void;
  busyLabel?: string;
}

export const ChatBar: React.FC<ChatBarProps> = ({ disabled, placeholder, onSend, busyLabel = 'Working...' }) => {
  const [value, setValue] = useState('');
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
    continuous: false,
    interimResults: true,
    language: 'en-US'
  });

  // Update input value when speech recognition provides transcript
  useEffect(() => {
    if (transcript) {
      setValue(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  const send = () => {
    if (!value.trim()) return;
    onSend(value);
    setValue(''); // Clear the input after sending
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Display value includes interim results while listening
  const displayValue = value + (isListening ? interimTranscript : '');

  return (
    <div className="flex gap-2 items-center w-full">
      <div className="flex-1 relative">
        <input
          className="w-full input-pill pr-12"
          value={displayValue}
          placeholder={placeholder || 'Share what\'s on your mind...'}
          disabled={disabled}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        {isSupported && (
          <button
            type="button"
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
            }`}
            onClick={toggleListening}
            disabled={disabled}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a2 2 0 114 0v4a2 2 0 11-4 0V7z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>
      <button
        className="btn-base bg-blue-600 hover:bg-blue-500 text-white px-4"
        disabled={disabled}
        onClick={send}
      >{disabled ? busyLabel : 'Ask'}</button>
      {speechError && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
          {speechError}
        </div>
      )}
    </div>
  );
};
