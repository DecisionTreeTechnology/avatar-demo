import { useState, useCallback } from 'react';
import { AudioContextManager } from '../utils/audioContextManager';
import { createLogger } from '../utils/logger';

interface AudioManagerState {
  showIOSWarning: boolean;
  setShowIOSWarning: (show: boolean) => void;
  initAudioContext: () => Promise<void>;
}

export const useAudioManager = (): AudioManagerState => {
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  const logger = createLogger('AudioManager');

  // Initialize AudioContext using centralized manager
  const initAudioContext = useCallback(async (): Promise<void> => {
    try {
      logger.log('Initializing audio context via AudioContextManager');
      const audioManager = AudioContextManager.getInstance();
      await audioManager.getContext();
      
      const debugInfo = audioManager.getDebugInfo();
      logger.log('AudioContext initialized:', debugInfo.audioContext);
      
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSWarning(debugInfo.audioContext.state !== 'running');
      }
      
    } catch (error) {
      logger.error('Error initializing audio context:', error);
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSWarning(true);
      }
    }
  }, [logger]);

  return {
    showIOSWarning,
    setShowIOSWarning,
    initAudioContext
  };
};