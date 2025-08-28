// Simplified iOS Audio Context Manager
// Simple approach to handle iOS audio context

let audioContext: AudioContext | null = null;

// Function to create the audio context when needed
const createAudioContext = (): AudioContext => {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      (window as any).globalAudioContext = audioContext;
      
      // Set up event listeners after context is created
      setupEventListeners();
    } catch (error) {
      console.error('[AudioContext] Failed to create AudioContext:', error);
      throw error;
    }
  }
  return audioContext;
};

// Set up event listeners for user interactions
const setupEventListeners = () => {
  if (!audioContext) return;

  // Resume on first user interaction
  const resumeAudioContext = async () => {
    if (!audioContext || audioContext.state !== "suspended") return;
    
    try {
      await audioContext.resume();
    } catch (error) {
      console.warn('[AudioContext] Failed to resume:', error);
    }
  };

  // Handle multiple types of user interactions
  document.addEventListener("click", resumeAudioContext, { once: true });
  document.addEventListener("touchstart", resumeAudioContext, { once: true });
  document.addEventListener("keydown", resumeAudioContext, { once: true });

  // Also handle ongoing gestures for reliability
  const handleUserGesture = async () => {
    if (!audioContext || audioContext.state !== "suspended") return;
    
    try {
      await audioContext.resume();
    } catch (error) {
      // Silently fail for ongoing gestures
    }
  };

  document.addEventListener("click", handleUserGesture);
  document.addEventListener("touchstart", handleUserGesture);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAudioContext);
} else {
  createAudioContext();
}

// Simple manager for compatibility with existing code
class SimpleAudioManager {
  getAudioContext(): AudioContext {
    return createAudioContext();
  }

  unlockFromGesture(): AudioContext {
    const ctx = createAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        // Ignore errors in gesture unlock
      });
    }
    return ctx;
  }

  async activateWithUserGesture(): Promise<AudioContext> {
    const ctx = createAudioContext();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (error) {
        console.warn('[AudioContext] Activation failed:', error);
      }
    }
    return ctx;
  }

  getStatus() {
    const ctx = createAudioContext();
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const isIOSChrome = isIOS && /CriOS/i.test(navigator.userAgent);
    
    return {
      hasContext: true,
      state: ctx.state,
      isIOS,
      isIOSChrome,
      retryCount: 0
    };
  }

  isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }
}

// Export singleton instance
export const iosAudioManager = new SimpleAudioManager();
export default iosAudioManager;
