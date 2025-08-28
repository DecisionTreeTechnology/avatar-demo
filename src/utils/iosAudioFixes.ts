// Enhanced iOS audio compatibility fixes
// Addresses specific iOS mobile browser audio limitations

export interface IOSAudioFix {
  success: boolean;
  message: string;
  applied: string[];
}

export async function applyIOSAudioFixes(): Promise<IOSAudioFix> {
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const isIOSChrome = isIOS && /CriOS/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && /Safari/i.test(navigator.userAgent) && !/CriOS/i.test(navigator.userAgent);
  
  if (!isIOS) {
    return { success: true, message: 'Not iOS device', applied: [] };
  }
  
  const fixes: string[] = [];
  
  try {
    // Fix 1: Enhanced AudioContext creation with WebKit compatibility
    if (!((window as any).globalAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({
        sampleRate: 48000, // iOS prefers 48kHz
        latencyHint: 'interactive'
      });
      
      // Immediate activation attempt
      if (ctx.state === 'suspended') {
        await ctx.resume();
        
        // iOS Chrome needs extra time for WebKit engine
        if (isIOSChrome) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      (window as any).globalAudioContext = ctx;
      fixes.push('AudioContext created with iOS optimizations');
    }
    
    // Fix 2: iOS Chrome requires specific audio buffer handling
    if (isIOSChrome) {
      // Pre-create audio nodes to warm up the audio pipeline
      const ctx = (window as any).globalAudioContext;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.01;
      gainNode.connect(ctx.destination);
      
      // Create a minimal audio buffer for WebKit pipeline initialization
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start();
      source.stop(ctx.currentTime + 0.1);
      
      fixes.push('iOS Chrome audio pipeline pre-warmed');
    }
    
    // Fix 3: Prevent audio interruption by other page elements
    if (isIOS) {
      // Disable automatic audio session management that can interfere
      const metaTag = document.createElement('meta');
      metaTag.name = 'apple-mobile-web-app-capable';
      metaTag.content = 'yes';
      if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        document.head.appendChild(metaTag);
        fixes.push('Apple web app meta tag added');
      }
    }
    
    // Fix 4: Enhanced error handling for iOS audio issues
    window.addEventListener('beforeunload', () => {
      const ctx = (window as any).globalAudioContext;
      if (ctx && ctx.state === 'running') {
        try {
          ctx.suspend();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
    fixes.push('Audio cleanup handler added');
    
    return {
      success: true,
      message: `iOS audio fixes applied successfully${isIOSChrome ? ' (iOS Chrome mode)' : isIOSSafari ? ' (iOS Safari mode)' : ''}`,
      applied: fixes
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to apply iOS audio fixes: ${error}`,
      applied: fixes
    };
  }
}

// Call this function during app initialization
export async function ensureIOSAudioCompatibility(): Promise<boolean> {
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  if (!isIOS) return true;
  
  try {
    const result = await applyIOSAudioFixes();
    console.log('[iOS Audio] Compatibility fixes:', result);
    return result.success;
  } catch (error) {
    console.error('[iOS Audio] Failed to ensure compatibility:', error);
    return false;
  }
}
