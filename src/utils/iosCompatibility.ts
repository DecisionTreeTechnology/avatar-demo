// iOS Chrome compatibility utilities
// iOS Chrome uses WebKit engine which has different audio handling than desktop Chrome

export interface IOSCompatibilityInfo {
  isIOSChrome: boolean;
  isIOSSafari: boolean;
  isIOS: boolean;
  needsDesktopMode: boolean;
  audioContextSupport: 'full' | 'limited' | 'none';
  recommendedAction?: string;
}

export function getIOSCompatibilityInfo(): IOSCompatibilityInfo {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isIOSChrome = isIOS && /CriOS/i.test(userAgent);
  const isIOSSafari = isIOS && /Safari/i.test(userAgent) && !/CriOS/i.test(userAgent);
  
  // Check if running in desktop mode (usually has higher user agent screen resolution)
  const isLikelyDesktopMode = isIOSChrome && (
    screen.width > 1024 || 
    userAgent.includes('Macintosh') ||
    !userAgent.includes('Mobile')
  );
  
  let audioContextSupport: 'full' | 'limited' | 'none' = 'full';
  let needsDesktopMode = false;
  let recommendedAction: string | undefined;
  
  if (isIOSChrome && !isLikelyDesktopMode) {
    // iOS Chrome in mobile mode has limited audio capabilities
    audioContextSupport = 'limited';
    needsDesktopMode = true;
    recommendedAction = 'For full audio support, enable "Request Desktop Site" in Chrome menu';
  } else if (isIOSSafari) {
    // iOS Safari has good audio support but some limitations
    audioContextSupport = 'full';
  } else if (isIOS) {
    // Other iOS browsers may have limitations
    audioContextSupport = 'limited';
  }
  
  return {
    isIOSChrome,
    isIOSSafari,
    isIOS,
    needsDesktopMode,
    audioContextSupport,
    recommendedAction
  };
}

export async function ensureAudioContextReady(): Promise<boolean> {
  try {
    const ctx = (window as any).globalAudioContext;
    if (!ctx) {
      console.warn('[IOSCompatibility] No global AudioContext available');
      return false;
    }
    
    const info = getIOSCompatibilityInfo();
    
    if (ctx.state === 'suspended') {
      console.log('[IOSCompatibility] Resuming suspended AudioContext...');
      await ctx.resume();
      
      // iOS Chrome may need additional time
      if (info.isIOSChrome) {
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[IOSCompatibility] iOS Chrome - additional activation time');
      }
    }
    
    // Verify context is actually ready
    if (ctx.state !== 'running') {
      console.warn('[IOSCompatibility] AudioContext not in running state:', ctx.state);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[IOSCompatibility] Failed to ensure AudioContext ready:', error);
    return false;
  }
}

export function shouldShowIOSChromeWarning(): boolean {
  const info = getIOSCompatibilityInfo();
  return info.isIOSChrome && info.needsDesktopMode;
}

export function getIOSChromeWarningMessage(): string {
  return "For the best experience with voice and avatar on iOS Chrome, please enable 'Request Desktop Site' in the browser menu (⋯ → Request Desktop Site).";
}

// Test if audio playback works properly on current iOS configuration
export async function testIOSAudioCompatibility(): Promise<{
  success: boolean;
  message: string;
  needsDesktopMode?: boolean;
}> {
  const info = getIOSCompatibilityInfo();
  
  if (!info.isIOS) {
    return { success: true, message: 'Not iOS device' };
  }
  
  try {
    const contextReady = await ensureAudioContextReady();
    if (!contextReady) {
      return {
        success: false,
        message: 'AudioContext failed to activate',
        needsDesktopMode: info.needsDesktopMode
      };
    }
    
    // Run a quick audio test
    const ctx = (window as any).globalAudioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate); // 50ms
    const data = buffer.getChannelData(0);
    
    // Create a very quiet test tone
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate) * 0.01;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    if (info.isIOSChrome) {
      // Use gain node for better control in iOS Chrome
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.01;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }
    
    source.start();
    
    // Wait for test to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      message: info.isIOSChrome 
        ? 'iOS Chrome audio test passed' 
        : 'iOS audio test passed',
      needsDesktopMode: info.needsDesktopMode
    };
    
  } catch (error) {
    console.error('[IOSCompatibility] Audio test failed:', error);
    return {
      success: false,
      message: `iOS audio test failed: ${error}`,
      needsDesktopMode: info.needsDesktopMode
    };
  }
}
