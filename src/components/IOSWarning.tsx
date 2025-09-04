import React from 'react';

interface IOSWarningProps {
  show: boolean;
  onDismiss: () => void;
}

export const IOSWarning: React.FC<IOSWarningProps> = ({ show, onDismiss }) => {
  if (!show) return null;

  return (
    <div className="absolute top-4 left-4 right-4 z-30">
      <div className="glass p-4 rounded-lg bg-orange-500/90 text-white">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">iOS Chrome Audio Notice</h4>
            <p className="text-xs mt-1 opacity-90">
              Audio may not work properly on iOS. Please tap the screen to enable audio, then try again.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-orange-200 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};