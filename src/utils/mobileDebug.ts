// Mobile debugging utilities for audio and layout issues

export interface MobileDebugInfo {
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  safeArea: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  audio: {
    contextState: string;
    contextSupported: boolean;
    resumeCapability: boolean;
  };
  orientation: string;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  browser: {
    isIOSChrome: boolean;
    isIOSSafari: boolean;
    isAndroidChrome: boolean;
    name: string;
  };
}

export function getMobileDebugInfo(): MobileDebugInfo {
  const audioContext = (window as any).globalAudioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  const ua = navigator.userAgent;
  
  // Detect specific browser on iOS
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isIOSChrome = isIOS && /CriOS/.test(ua);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS/.test(ua);
  const isAndroidChrome = /Android/.test(ua) && /Chrome/.test(ua);
  
  let browserName = 'Unknown';
  if (isIOSChrome) browserName = 'iOS Chrome';
  else if (isIOSSafari) browserName = 'iOS Safari';
  else if (isAndroidChrome) browserName = 'Android Chrome';
  else if (/Android/.test(ua)) browserName = 'Android Browser';
  else if (/Chrome/.test(ua)) browserName = 'Chrome';
  else if (/Safari/.test(ua)) browserName = 'Safari';
  
  return {
    userAgent: ua,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    },
    safeArea: {
      top: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px',
      bottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px',
      left: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px',
      right: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px'
    },
    audio: {
      contextState: audioContext?.state || 'unknown',
      contextSupported: !!(window.AudioContext || (window as any).webkitAudioContext),
      resumeCapability: typeof audioContext?.resume === 'function'
    },
    orientation: screen.orientation?.type || 'unknown',
    isIOS,
    isAndroid: /Android/.test(ua),
    isMobile: /iPad|iPhone|iPod|Android/.test(ua),
    browser: {
      isIOSChrome,
      isIOSSafari,
      isAndroidChrome,
      name: browserName
    }
  };
}

export function logMobileDebugInfo() {
  const info = getMobileDebugInfo();
  console.log('[MobileDebug] Device info:', info);
  
  // Check for common mobile issues
  if (info.isMobile && info.audio.contextState === 'suspended') {
    console.warn('[MobileDebug] AudioContext is suspended - this is expected on mobile until user interaction');
  }
  
  if (info.isIOS && info.safeArea.bottom === '0px') {
    console.warn('[MobileDebug] iOS device detected but no safe area bottom inset - may be in compatibility mode');
  }
  
  if (info.browser.isIOSChrome) {
    console.info('[MobileDebug] iOS Chrome detected - using WebKit engine with Chrome UI');
  }
  
  if (info.viewport.height < 600) {
    console.warn('[MobileDebug] Small viewport height detected - bottom panel may cover content');
  }
  
  // Avatar scaling info for mobile
  if (info.isMobile) {
    const isPortrait = info.viewport.height > info.viewport.width;
    let expectedScale = 1.0;
    
    if (isPortrait) {
      if (info.viewport.width <= 360) expectedScale = 0.55;
      else if (info.viewport.width <= 414) expectedScale = 0.6;
      else if (info.viewport.width <= 768) expectedScale = 0.7;
    } else if (info.viewport.height <= 500) {
      expectedScale = 0.8;
    }
    
    console.info(`[MobileDebug] Avatar scaling: ${expectedScale}x for ${isPortrait ? 'portrait' : 'landscape'} mode (${info.viewport.width}×${info.viewport.height})`);
  }
  
  // iOS Chrome specific warnings
  if (info.browser.isIOSChrome && info.safeArea.bottom === '0px') {
    console.warn('[MobileDebug] iOS Chrome may have different safe area behavior compared to Safari');
  }
  
  return info;
}

export async function testAudioPlayback(): Promise<boolean> {
  try {
    const audioContext = (window as any).globalAudioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Store globally for reuse
    if (!(window as any).globalAudioContext) {
      (window as any).globalAudioContext = audioContext;
    }
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log('[MobileDebug] AudioContext resumed for test, state:', audioContext.state);
    }
    
    // Enhanced test for iOS Chrome compatibility
    const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);
    
    // Create a short test tone - even quieter for iOS Chrome
    const duration = isIOSChrome ? 0.05 : 0.1; // 50ms for iOS Chrome, 100ms for others
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a very quiet test tone
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.sin(2 * Math.PI * 440 * i / audioContext.sampleRate) * (isIOSChrome ? 0.01 : 0.05);
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // For iOS Chrome, use additional gain node for better control
    if (isIOSChrome) {
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.01; // Very quiet
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
    } else {
      source.connect(audioContext.destination);
    }
    
    source.start();
    
    // Wait for playback to complete
    await new Promise(resolve => setTimeout(resolve, duration * 1000 + 100));
    
    console.log('[MobileDebug] Audio test playback completed successfully' + 
      (isIOSChrome ? ' (iOS Chrome compatible)' : ''));
    return true;
  } catch (error) {
    console.error('[MobileDebug] Audio test failed:', error);
    
    // Provide specific guidance for iOS Chrome
    if (/iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent)) {
      console.warn('[MobileDebug] iOS Chrome detected - if audio doesn\'t work, try "Request Desktop Site" option');
    }
    
    return false;
  }
}
