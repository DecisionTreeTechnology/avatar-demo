import React from 'react';

interface ErrorDisplayProps {
  lastError: string | null;
  onDismiss: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ lastError, onDismiss }) => {
  if (!lastError) return null;

  return (
    <div className={`p-4 rounded-lg mb-4 ${
      lastError.includes('National Suicide Prevention') || lastError.includes('Crisis Text Line') 
        ? 'bg-blue-900/30 border border-blue-500/50 text-blue-100' // Supportive blue for crisis messages
        : 'bg-red-900/50 border border-red-600 text-red-300' // Red for other errors
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm">{lastError}</p>
        </div>
        <button
          onClick={onDismiss}
          className={`ml-2 ${
            lastError.includes('National Suicide Prevention') || lastError.includes('Crisis Text Line')
              ? 'text-blue-400 hover:text-blue-200' // Blue for crisis messages
              : 'text-red-400 hover:text-red-200' // Red for other errors
          }`}
        >
          ×
        </button>
      </div>
    </div>
  );
};