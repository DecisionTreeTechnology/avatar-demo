/**
 * Bulletproof Microphone State Manager
 * 
 * Prevents audio feedback loops by ensuring the microphone is never active
 * when the avatar is speaking or TTS is playing.
 * 
 * Key Features:
 * - Automatic microphone muting during TTS playback
 * - Echo/feedback loop prevention
 * - iOS Safari/Chrome compatibility
 * - Robust error handling and recovery
 * - Clear state management and visual feedback
 * - Prevention of multiple simultaneous recognition instances
 */

interface MicrophoneState {
  isCapturing: boolean;
  isMuted: boolean;
  isTemporarilyDisabled: boolean;
  userIntentToListen: boolean;
  lastActivityTime: number;
  retryCount: number;
}

interface AudioPlaybackState {
  isTTSSpeaking: boolean;
  isAvatarSpeaking: boolean;
  isAudioPlaying: boolean;
  ttsStartTime: number | null;
  ttsEndTime: number | null;
}

interface MicrophoneManagerOptions {
  minSilenceDuration?: number; // Minimum silence before considering speech ended
  maxRetryAttempts?: number;   // Maximum retry attempts for failed starts
  feedbackFilterThreshold?: number; // Minimum length for valid speech input
  autoRestartAfterTTS?: boolean; // Whether to auto-restart after TTS
  debounceDelay?: number;      // Debounce delay for rapid state changes
}

type MicrophoneEventType = 
  | 'stateChanged' 
  | 'captureStarted' 
  | 'captureStopped' 
  | 'error' 
  | 'feedbackPrevented'
  | 'ttsBlocked';

interface MicrophoneEvent {
  type: MicrophoneEventType;
  data?: any;
  timestamp: number;
}

type MicrophoneEventListener = (event: MicrophoneEvent) => void;

export class MicrophoneStateManager {
  private state: MicrophoneState = {
    isCapturing: false,
    isMuted: false,
    isTemporarilyDisabled: false,
    userIntentToListen: false,
    lastActivityTime: 0,
    retryCount: 0
  };

  private audioState: AudioPlaybackState = {
    isTTSSpeaking: false,
    isAvatarSpeaking: false,
    isAudioPlaying: false,
    ttsStartTime: null,
    ttsEndTime: null
  };

  private options: Required<MicrophoneManagerOptions>;
  private eventListeners: Map<MicrophoneEventType, Set<MicrophoneEventListener>> = new Map();
  private recognitionInstance: any = null;
  private stateChangeTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(options: MicrophoneManagerOptions = {}) {
    this.options = {
      minSilenceDuration: 500,
      maxRetryAttempts: 3,
      feedbackFilterThreshold: 2,
      autoRestartAfterTTS: true, // Enable by default for better UX
      debounceDelay: 300,
      ...options
    };

    this.setupCleanupHandlers();
  }

  /**
   * Check if microphone capture should be allowed
   */
  private canStartCapture(): boolean {
    if (this.isDestroyed) return false;
    if (this.state.isTemporarilyDisabled) return false;
    if (this.audioState.isTTSSpeaking) return false;
    if (this.audioState.isAvatarSpeaking) return false;
    if (this.audioState.isAudioPlaying) return false;
    
    // Additional safety check for iOS
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    if (isIOS && this.audioState.ttsEndTime) {
      const timeSinceLastTTS = Date.now() - this.audioState.ttsEndTime;
      if (timeSinceLastTTS < 1000) {
        this.emitEvent('ttsBlocked', { 
          reason: 'iOS safety delay', 
          timeSinceLastTTS 
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Notify when TTS/Avatar speaking starts
   */
  public notifyTTSStarted(): void {
    console.log('[MicrophoneManager] TTS started - forcing microphone stop', {
      wasCapturing: this.state.isCapturing,
      wasListening: this.state.userIntentToListen
    });
    
    // Prevent rapid successive calls
    if (this.audioState.isTTSSpeaking) {
      console.log('[MicrophoneManager] TTS already started, skipping duplicate notification');
      return;
    }
    
    this.audioState.isTTSSpeaking = true;
    this.audioState.isAvatarSpeaking = true;
    this.audioState.isAudioPlaying = true;
    this.audioState.ttsStartTime = Date.now();
    this.audioState.ttsEndTime = null;

    // Immediately force stop any active recognition
    this.forceStopCapture('TTS_STARTED');
    
    this.emitEvent('stateChanged', { 
      reason: 'TTS_STARTED',
      state: this.getPublicState() 
    });
  }

  /**
   * Notify when TTS/Avatar speaking ends
   */
  public notifyTTSEnded(): void {
    console.log('[MicrophoneManager] TTS ended', {
      autoRestartAfterTTS: this.options.autoRestartAfterTTS,
      userIntentToListen: this.state.userIntentToListen
    });
    
    // Prevent rapid successive calls
    if (!this.audioState.isTTSSpeaking) {
      console.log('[MicrophoneManager] TTS already ended, skipping duplicate notification');
      return;
    }
    
    this.audioState.isTTSSpeaking = false;
    this.audioState.isAvatarSpeaking = false;
    this.audioState.isAudioPlaying = false;
    this.audioState.ttsEndTime = Date.now();

    // Add a safety delay before allowing restart to prevent race conditions
    setTimeout(() => {
      // Auto-restart if configured OR if user had intent to listen
      if (this.options.autoRestartAfterTTS || this.state.userIntentToListen) {
        console.log('[MicrophoneManager] Auto-restarting microphone after TTS completion');
        this.attemptRestart('TTS_ENDED');
      } else {
        console.log('[MicrophoneManager] No auto-restart after TTS (disabled or no user intent)');
      }
      
      this.emitEvent('stateChanged', { 
        reason: 'TTS_ENDED',
        state: this.getPublicState() 
      });
    }, this.options.debounceDelay);
  }

  /**
   * Start microphone capture with user intent
   */
  public async startCapture(): Promise<boolean> {
    if (this.isDestroyed) return false;

    console.log('[MicrophoneManager] User intent to start capture');
    this.state.userIntentToListen = true;
    this.state.retryCount = 0;

    return this.attemptStart('USER_REQUEST');
  }

  /**
   * Stop microphone capture
   */
  public stopCapture(reason = 'USER_REQUEST'): void {
    console.log('[MicrophoneManager] Stop capture requested:', reason);
    
    this.state.userIntentToListen = false;
    this.forceStopCapture(reason);
  }

  /**
   * Force stop capture immediately
   */
  private forceStopCapture(reason: string): void {
    console.log('[MicrophoneManager] Force stopping capture for reason:', reason, {
      hadInstance: !!this.recognitionInstance,
      wasCapturing: this.state.isCapturing
    });
    
    if (this.recognitionInstance) {
      try {
        // Clear all event handlers to prevent restart attempts
        this.recognitionInstance.onend = null;
        this.recognitionInstance.onerror = null;
        this.recognitionInstance.onresult = null;
        this.recognitionInstance.onstart = null;
        
        // Use abort for immediate stop
        this.recognitionInstance.abort();
        this.recognitionInstance = null;
      } catch (error) {
        console.warn('[MicrophoneManager] Error stopping recognition:', error);
      }
    }

    const wasCapturing = this.state.isCapturing;
    this.state.isCapturing = false;
    this.state.lastActivityTime = Date.now();

    if (wasCapturing) {
      this.emitEvent('captureStopped', { reason });
    }

    this.clearTimers();
  }

  /**
   * Attempt to start recognition
   */
  private async attemptStart(reason: string): Promise<boolean> {
    if (!this.canStartCapture()) {
      console.log('[MicrophoneManager] Cannot start capture:', {
        canStart: this.canStartCapture(),
        isDestroyed: this.isDestroyed,
        isTemporarilyDisabled: this.state.isTemporarilyDisabled,
        audioState: this.audioState
      });
      return false;
    }

    try {
      // Check for speech recognition support
      const SpeechRecognition = (window as any).SpeechRecognition || 
                                (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }

      // Prevent multiple instances
      if (this.recognitionInstance) {
        this.forceStopCapture('PREVENTING_MULTIPLE_INSTANCES');
      }

      // Create new recognition instance
      this.recognitionInstance = new SpeechRecognition();
      this.setupRecognitionHandlers();

      // Start recognition
      this.recognitionInstance.start();
      console.log('[MicrophoneManager] Started recognition for reason:', reason);
      
      return true;

    } catch (error) {
      console.error('[MicrophoneManager] Failed to start recognition:', error);
      
      this.state.retryCount++;
      if (this.state.retryCount < this.options.maxRetryAttempts) {
        // Retry with exponential backoff
        setTimeout(() => {
          if (this.state.userIntentToListen && this.canStartCapture()) {
            this.attemptStart(`RETRY_${this.state.retryCount}`);
          }
        }, 1000 * Math.pow(2, this.state.retryCount - 1));
      } else {
        this.state.userIntentToListen = false;
        this.emitEvent('error', { 
          error: error instanceof Error ? error.message : String(error),
          retryCount: this.state.retryCount
        });
      }
      
      return false;
    }
  }

  /**
   * Setup recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognitionInstance) return;

    this.recognitionInstance.continuous = true;
    this.recognitionInstance.interimResults = true;
    this.recognitionInstance.lang = 'en-US';
    this.recognitionInstance.maxAlternatives = 1;

    this.recognitionInstance.onstart = () => {
      console.log('[MicrophoneManager] Recognition started');
      this.state.isCapturing = true;
      this.state.retryCount = 0;
      this.emitEvent('captureStarted', { timestamp: Date.now() });
    };

    this.recognitionInstance.onresult = (event: any) => {
      this.handleSpeechResult(event);
    };

    this.recognitionInstance.onerror = (event: any) => {
      console.warn('[MicrophoneManager] Recognition error:', event.error);
      
      if (event.error === 'no-speech' || event.error === 'network') {
        // These are common and non-critical errors
        return;
      }
      
      this.state.isCapturing = false;
      
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        this.state.userIntentToListen = false;
        this.emitEvent('error', { 
          error: `Microphone access denied: ${event.error}`,
          isPermissionError: true 
        });
      } else {
        this.emitEvent('error', { error: event.error });
      }
    };

    this.recognitionInstance.onend = () => {
      console.log('[MicrophoneManager] Recognition ended');
      this.state.isCapturing = false;
      
      // Only attempt restart if user still wants to listen and conditions allow
      if (this.state.userIntentToListen && this.canStartCapture()) {
        // Small delay to prevent rapid restart loops
        setTimeout(() => {
          if (this.state.userIntentToListen && this.canStartCapture()) {
            this.attemptRestart('AUTO_RESTART');
          }
        }, this.options.debounceDelay);
      }
    };
  }

  /**
   * Handle speech recognition results
   */
  private handleSpeechResult(event: any): void {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Filter out very short utterances that might be feedback/echo
    if (finalTranscript) {
      const trimmed = finalTranscript.trim();
      if (trimmed.length >= this.options.feedbackFilterThreshold) {
        this.emitEvent('stateChanged', {
          type: 'transcript',
          finalTranscript: trimmed,
          interimTranscript: interimTranscript.trim()
        });
        console.log('[MicrophoneManager] Valid transcript:', trimmed);
      } else {
        console.log('[MicrophoneManager] Filtered short utterance:', trimmed);
        this.emitEvent('feedbackPrevented', { 
          filteredText: trimmed,
          reason: 'too_short' 
        });
      }
    }

    if (interimTranscript) {
      this.emitEvent('stateChanged', {
        type: 'interim',
        interimTranscript: interimTranscript.trim()
      });
    }

    this.state.lastActivityTime = Date.now();
  }

  /**
   * Attempt to restart recognition
   */
  private attemptRestart(reason: string): void {
    console.log('[MicrophoneManager] Attempting restart for reason:', reason);
    this.attemptStart(reason);
  }

  /**
   * Get public state for UI
   */
  public getPublicState() {
    return {
      isCapturing: this.state.isCapturing,
      isMuted: this.state.isMuted,
      userIntentToListen: this.state.userIntentToListen,
      isTemporarilyDisabled: this.state.isTemporarilyDisabled,
      canStartCapture: this.canStartCapture(),
      isTTSSpeaking: this.audioState.isTTSSpeaking,
      retryCount: this.state.retryCount
    };
  }

  /**
   * Check if speech recognition is supported
   */
  public isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Temporarily disable microphone (for critical audio operations)
   */
  public temporarilyDisable(durationMs = 5000): void {
    console.log('[MicrophoneManager] Temporarily disabling for', durationMs, 'ms');
    
    this.state.isTemporarilyDisabled = true;
    this.forceStopCapture('TEMPORARILY_DISABLED');
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
    
    this.cleanupTimer = setTimeout(() => {
      this.state.isTemporarilyDisabled = false;
      if (this.state.userIntentToListen && this.canStartCapture()) {
        this.attemptRestart('TEMPORARY_DISABLE_ENDED');
      }
    }, durationMs);
  }

  /**
   * Event management
   */
  public addEventListener(type: MicrophoneEventType, listener: MicrophoneEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  public removeEventListener(type: MicrophoneEventType, listener: MicrophoneEventListener): void {
    this.eventListeners.get(type)?.delete(listener);
  }

  private emitEvent(type: MicrophoneEventType, data?: any): void {
    const event: MicrophoneEvent = {
      type,
      data,
      timestamp: Date.now()
    };

    this.eventListeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[MicrophoneManager] Event listener error:', error);
      }
    });
  }

  /**
   * Setup cleanup handlers for proper disposal
   */
  private setupCleanupHandlers(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.forceStopCapture('PAGE_HIDDEN');
      }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Destroy the manager and clean up resources
   */
  public destroy(): void {
    console.log('[MicrophoneManager] Destroying');
    
    this.isDestroyed = true;
    this.state.userIntentToListen = false;
    
    this.forceStopCapture('DESTROYED');
    this.clearTimers();
    this.eventListeners.clear();
  }
}

// Singleton instance for global use
let globalMicrophoneManager: MicrophoneStateManager | null = null;

export function getMicrophoneManager(options?: MicrophoneManagerOptions): MicrophoneStateManager {
  if (!globalMicrophoneManager) {
    globalMicrophoneManager = new MicrophoneStateManager(options);
  }
  return globalMicrophoneManager;
}

export function destroyMicrophoneManager(): void {
  if (globalMicrophoneManager) {
    globalMicrophoneManager.destroy();
    globalMicrophoneManager = null;
  }
}
