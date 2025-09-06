import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto remove
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(message.id), 300);
    }, message.duration || 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [message.id, message.duration, onRemove]);

  const getTypeStyles = () => {
    switch (message.type) {
      case 'error':
        return 'bg-red-600 border-red-500';
      case 'info':
        return 'bg-blue-600 border-blue-500';
      default:
        return 'bg-purple-600 border-purple-500';
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      data-testid={`toast-${message.id}`}
    >
      <div className={`${getTypeStyles()} text-white px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{message.message}</span>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onRemove(message.id), 300);
            }}
            className="text-white/80 hover:text-white transition-colors"
            data-testid={`toast-close-${message.id}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50" data-testid="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};