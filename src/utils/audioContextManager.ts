interface AudioContextConfig {
  sampleRate: number;
  latencyHint: AudioContextLatencyCategory;
  retryAttempts: number;
  stabilizationDelay: number;
  maxRetryDelay: number;
}

interface AudioContextState {
  context: AudioContext | null;
  isInitialized: boolean;
  retryCount: number;
  lastError: string | null;
}

export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private state: AudioContextState = {
    context: null,
    isInitialized: false,
    retryCount: 0,
    lastError: null
  };
  
  private config: AudioContextConfig;
  private eventListeners: Array<() => void> = [];

  private constructor() {
    this.config = this.getOptimalConfig();
    this.setupGlobalEventListeners();
  }

  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  private getOptimalConfig(): AudioContextConfig {
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const isIOSChrome = isIOS && /CriOS/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent);

    if (isIOSChrome) {
      return {
        sampleRate: 48000, // iOS Chrome prefers 48kHz
        latencyHint: 'interactive',
        retryAttempts: 5, // More attempts for iOS Chrome
        stabilizationDelay: 800, // Longer stabilization
        maxRetryDelay: 3000
      };
    } else if (isIOSSafari) {
      return {
        sampleRate: 44100, // iOS Safari works well with 44.1kHz
        latencyHint: 'interactive',
        retryAttempts: 3,
        stabilizationDelay: 300,
        maxRetryDelay: 2000
      };
    } else {
      return {
        sampleRate: 44100,
        latencyHint: 'interactive',
        retryAttempts: 2,
        stabilizationDelay: 100,
        maxRetryDelay: 1000
      };
    }
  }

  private setupGlobalEventListeners(): void {
    // Handle page visibility changes (iOS backgrounding)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.state.context?.state === 'suspended') {
        console.log('[AudioContextManager] Page visible, attempting to resume suspended context');
        this.resumeContext().catch(error => {
          console.warn('[AudioContextManager] Failed to resume on visibility change:', error);
        });
      }
    };

    // Handle page focus/blur
    const handleFocus = () => {
      if (this.state.context?.state === 'suspended') {
        console.log('[AudioContextManager] Page focused, attempting to resume suspended context');
        this.resumeContext().catch(error => {
          console.warn('[AudioContextManager] Failed to resume on focus:', error);
        });
      }
    };

    // iOS-specific touch handler for initial activation
    const handleFirstTouch = async () => {
      console.log('[AudioContextManager] First touch detected, initializing audio context');
      try {
        await this.getContext();
        document.removeEventListener('touchstart', handleFirstTouch);
        document.removeEventListener('touchend', handleFirstTouch);
      } catch (error) {
        console.warn('[AudioContextManager] Failed to initialize on first touch:', error);
      }
    };

    // General click handler for desktop and fallback
    const handleFirstClick = async () => {
      console.log('[AudioContextManager] First click detected, initializing audio context');
      try {
        await this.getContext();
        document.removeEventListener('click', handleFirstClick);
      } catch (error) {
        console.warn('[AudioContextManager] Failed to initialize on first click:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('focus', handleFocus);
    document.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true });
    document.addEventListener('touchend', handleFirstTouch, { once: true, passive: true });
    document.addEventListener('click', handleFirstClick, { once: true });

    // Store cleanup functions
    this.eventListeners.push(
      () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      () => document.removeEventListener('focus', handleFocus),
      () => document.removeEventListener('touchstart', handleFirstTouch),
      () => document.removeEventListener('touchend', handleFirstTouch),
      () => document.removeEventListener('click', handleFirstClick)
    );
  }

  async getContext(): Promise<AudioContext> {
    if (!this.state.context || this.state.context.state === 'closed') {
      await this.createContext();
    }

    if (this.state.context!.state === 'suspended') {
      await this.resumeContext();
    }

    // Store as global for backward compatibility
    (window as any).globalAudioContext = this.state.context;
    
    return this.state.context!;
  }

  private async createContext(): Promise<void> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('AudioContext not supported in this browser');
    }

    console.log('[AudioContextManager] Creating AudioContext with config:', this.config);
    
    try {
      this.state.context = new AudioContextClass({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latencyHint
      });

      // Set up context event listeners
      this.state.context.addEventListener('statechange', () => {
        console.log('[AudioContextManager] AudioContext state changed to:', this.state.context?.state);
      });

      this.state.isInitialized = true;
      this.state.lastError = null;
      
      console.log('[AudioContextManager] AudioContext created successfully:', {
        state: this.state.context.state,
        sampleRate: this.state.context.sampleRate
      });
      
    } catch (error) {
      this.state.lastError = error instanceof Error ? error.message : String(error);
      console.error('[AudioContextManager] Failed to create AudioContext:', error);
      throw error;
    }
  }

  async resumeContext(): Promise<void> {
    if (!this.state.context) {
      throw new Error('No AudioContext to resume');
    }

    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (this.state.context.state === 'suspended') {
          console.log(`[AudioContextManager] Attempting to resume AudioContext (attempt ${attempt + 1}/${this.config.retryAttempts + 1})`);
          await this.state.context.resume();
        }

        // Wait for stabilization
        await new Promise(resolve => setTimeout(resolve, this.config.stabilizationDelay));

        if (this.state.context.state === 'running') {
          console.log('[AudioContextManager] AudioContext successfully resumed');
          this.state.retryCount = 0;
          this.state.lastError = null;
          return;
        }

        if (attempt < this.config.retryAttempts) {
          console.warn(`[AudioContextManager] AudioContext still ${this.state.context.state}, retrying...`);
          const delay = Math.min(300 * Math.pow(2, attempt), this.config.maxRetryDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.error(`[AudioContextManager] Resume attempt ${attempt + 1} failed:`, error);
        this.state.lastError = error instanceof Error ? error.message : String(error);
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(500 * Math.pow(2, attempt), this.config.maxRetryDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.state.retryCount++;
    
    if (isIOS) {
      throw new Error('AudioContext activation failed on iOS. Ensure you have interacted with the page (tap/click) before using audio features. Try refreshing the page if the problem persists.');
    } else {
      throw new Error(`AudioContext activation failed after ${this.config.retryAttempts + 1} attempts. State: ${this.state.context.state}`);
    }
  }

  getState(): AudioContextState & { config: AudioContextConfig } {
    return {
      ...this.state,
      config: this.config
    };
  }

  getDebugInfo(): Record<string, any> {
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const isIOSChrome = isIOS && /CriOS/i.test(navigator.userAgent);
    const isIOSSafari = isIOS && /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent);
    
    return {
      platform: {
        isIOS,
        isIOSChrome,
        isIOSSafari,
        userAgent: navigator.userAgent
      },
      audioContext: {
        exists: !!this.state.context,
        state: this.state.context?.state || 'none',
        sampleRate: this.state.context?.sampleRate || 'unknown',
        maxChannels: this.state.context?.destination?.maxChannelCount || 'unknown'
      },
      manager: {
        isInitialized: this.state.isInitialized,
        retryCount: this.state.retryCount,
        lastError: this.state.lastError,
        config: this.config
      },
      global: {
        hasGlobalContext: !!(window as any).globalAudioContext,
        globalContextState: (window as any).globalAudioContext?.state || 'none'
      }
    };
  }

  async testPlayback(): Promise<boolean> {
    try {
      const ctx = await this.getContext();
      
      // Create a very short test tone
      const testDuration = 0.1; // 100ms
      const testBuffer = ctx.createBuffer(1, ctx.sampleRate * testDuration, ctx.sampleRate);
      const testData = testBuffer.getChannelData(0);
      
      // Generate a quiet test tone
      for (let i = 0; i < testData.length; i++) {
        testData[i] = Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate) * 0.05; // Very quiet
      }

      const source = ctx.createBufferSource();
      source.buffer = testBuffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.05;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[AudioContextManager] Test playback timeout');
          resolve(false);
        }, 3000);

        source.onended = () => {
          clearTimeout(timeout);
          console.log('[AudioContextManager] Test playback successful');
          resolve(true);
        };

        source.start();
        source.stop(ctx.currentTime + testDuration);
      });
      
    } catch (error) {
      console.error('[AudioContextManager] Test playback failed:', error);
      return false;
    }
  }

  destroy(): void {
    // Clean up event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    
    // Close audio context
    if (this.state.context && this.state.context.state !== 'closed') {
      this.state.context.close().catch(error => {
        console.warn('[AudioContextManager] Error closing AudioContext:', error);
      });
    }
    
    // Clear global reference
    if ((window as any).globalAudioContext === this.state.context) {
      (window as any).globalAudioContext = null;
    }
    
    // Reset state
    this.state = {
      context: null,
      isInitialized: false,
      retryCount: 0,
      lastError: null
    };
    
    // Clear singleton instance
    AudioContextManager.instance = null;
  }
}

// Export convenience functions
export const getAudioContext = (): Promise<AudioContext> => {
  return AudioContextManager.getInstance().getContext();
};

export const getAudioContextDebugInfo = (): Record<string, any> => {
  return AudioContextManager.getInstance().getDebugInfo();
};

export const testAudioPlayback = (): Promise<boolean> => {
  return AudioContextManager.getInstance().testPlayback();
};