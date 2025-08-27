// Video call background style configurations

export interface VideoCallStyle {
  name: string;
  description: string;
  background: string;
  vignette: string;
  animation?: string;
}

export const VIDEO_CALL_STYLES: Record<string, VideoCallStyle> = {
  professional: {
    name: "Professional Office",
    description: "Cool blue-gray gradient mimicking office lighting",
    background: `linear-gradient(135deg, 
      #f1f5f9 0%,   
      #e2e8f0 20%,  
      #cbd5e1 40%,  
      #94a3b8 70%,  
      #64748b 100%  
    )`,
    vignette: `radial-gradient(
      ellipse at center,
      transparent 25%,
      rgba(0, 0, 0, 0.05) 50%,
      rgba(0, 0, 0, 0.15) 75%,
      rgba(0, 0, 0, 0.25) 100%
    )`,
    animation: "subtle-lighting 12s ease-in-out infinite"
  },
  
  warm: {
    name: "Warm Office",
    description: "Warm orange tones for a cozy meeting room feel",
    background: `linear-gradient(135deg, 
      #fef7ed 0%,   
      #fed7aa 25%,  
      #fdba74 50%,  
      #fb923c 75%,  
      #f97316 100%  
    )`,
    vignette: `radial-gradient(
      ellipse at center,
      transparent 30%,
      rgba(0, 0, 0, 0.08) 60%,
      rgba(0, 0, 0, 0.18) 85%,
      rgba(0, 0, 0, 0.3) 100%
    )`,
    animation: "warm-lighting 10s ease-in-out infinite"
  },
  
  modern: {
    name: "Modern Studio",
    description: "Clean white background with subtle shadows",
    background: `linear-gradient(135deg, 
      #ffffff 0%,   
      #f8fafc 30%,  
      #f1f5f9 60%,  
      #e2e8f0 100%  
    )`,
    vignette: `radial-gradient(
      ellipse at center,
      transparent 35%,
      rgba(0, 0, 0, 0.03) 55%,
      rgba(0, 0, 0, 0.08) 80%,
      rgba(0, 0, 0, 0.15) 100%
    )`,
    animation: "soft-lighting 15s ease-in-out infinite"
  },
  
  classic: {
    name: "Classic Black",
    description: "Traditional solid black background",
    background: "#000000",
    vignette: "none"
  }
};

export function applyVideoCallStyle(styleName: keyof typeof VIDEO_CALL_STYLES = 'professional') {
  const style = VIDEO_CALL_STYLES[styleName];
  if (!style) return;
  
  const container = document.querySelector('.mobile-avatar-container') as HTMLElement;
  if (!container) return;
  
  container.style.background = style.background;
  if (style.animation) {
    container.style.animation = style.animation;
    container.style.backgroundSize = '400% 400%';
  }
  
  // Update vignette
  const vignette = container.querySelector('::before') as HTMLElement;
  if (vignette && style.vignette !== 'none') {
    vignette.style.background = style.vignette;
  }
}

// CSS keyframes for different lighting animations
export const LIGHTING_KEYFRAMES = `
@keyframes warm-lighting {
  0%, 100% { 
    background-position: 0% 50%; 
    filter: brightness(1.0) saturate(1.0);
  }
  25% { 
    background-position: 100% 25%; 
    filter: brightness(1.05) saturate(1.1);
  }
  50% { 
    background-position: 100% 50%; 
    filter: brightness(1.0) saturate(1.0);
  }
  75% { 
    background-position: 0% 75%; 
    filter: brightness(0.95) saturate(0.9);
  }
}

@keyframes soft-lighting {
  0%, 100% { 
    background-position: 0% 50%; 
    filter: brightness(1.0);
  }
  50% { 
    background-position: 100% 50%; 
    filter: brightness(1.02);
  }
}
`;
