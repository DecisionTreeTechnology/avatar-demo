/**
 * Scene Manager - Creates immersive backgrounds for different avatar personalities
 */

export type SceneType = 
  | 'fertility_clinic'
  | 'wellness_spa' 
  | 'botanical_garden'
  | 'peaceful_office'
  | 'sunset_terrace'
  | 'cozy_library';

export interface SceneConfig {
  name: string;
  description: string;
  colors: string[];
  animation: string;
  mood: 'calming' | 'energizing' | 'comforting' | 'professional' | 'romantic' | 'focused';
  lighting: 'soft' | 'warm' | 'bright' | 'ambient' | 'golden' | 'cool';
}

export class SceneManager {
  private static scenes: Record<SceneType, SceneConfig> = {
    fertility_clinic: {
      name: 'Fertility Wellness Center',
      description: 'Calm, professional medical spa environment with soft, healing colors',
      colors: [
        '#f0f9ff', // Soft sky blue
        '#e0f2fe', // Light blue  
        '#f3e8ff', // Soft lavender
        '#fdf2f8', // Light pink
        '#fff7ed', // Warm cream
        '#f0fdf4', // Soft mint
        '#ecfdf5', // Light green
        '#f0f9ff'  // Back to soft blue
      ],
      animation: 'fertility-ambiance',
      mood: 'calming',
      lighting: 'soft'
    },
    
    wellness_spa: {
      name: 'Tranquil Wellness Spa',
      description: 'Serene spa environment with earth tones and natural elements',
      colors: [
        '#fef7f0', // Warm cream
        '#f5f5dc', // Beige
        '#e6f3e6', // Soft mint
        '#f0f8ff', // Alice blue
        '#fff8dc', // Cornsilk
        '#f5f5f5', // White smoke
        '#e0f0e0', // Light green
        '#fef7f0'  // Back to cream
      ],
      animation: 'spa-serenity',
      mood: 'comforting',
      lighting: 'warm'
    },
    
    botanical_garden: {
      name: 'Peaceful Garden',
      description: 'Lush botanical environment with natural greens and florals',
      colors: [
        '#f0fff0', // Honeydew
        '#e6ffe6', // Light green
        '#f5fffa', // Mint cream
        '#fff0f5', // Lavender blush
        '#f0f8ff', // Alice blue
        '#e0ffe0', // Light green
        '#f5f5dc', // Beige
        '#f0fff0'  // Back to honeydew
      ],
      animation: 'garden-breeze',
      mood: 'energizing',
      lighting: 'bright'
    },
    
    peaceful_office: {
      name: 'Modern Consultation Room',
      description: 'Professional yet warm consultation space',
      colors: [
        '#f8fafc', // Slate 50
        '#f1f5f9', // Slate 100
        '#e2e8f0', // Slate 200
        '#f3f4f6', // Gray 100
        '#f9fafb', // Gray 50
        '#f0f9ff', // Sky 50
        '#eff6ff', // Blue 50
        '#f8fafc'  // Back to slate
      ],
      animation: 'professional-ambiance',
      mood: 'professional',
      lighting: 'cool'
    },
    
    sunset_terrace: {
      name: 'Golden Hour Terrace',
      description: 'Warm, romantic sunset setting for intimate conversations',
      colors: [
        '#fff7ed', // Orange 50
        '#ffedd5', // Orange 100
        '#fed7aa', // Orange 200
        '#fef3c7', // Amber 100
        '#fef7cd', // Yellow 100
        '#fef3c7', // Amber 100
        '#fed7aa', // Orange 200
        '#fff7ed'  // Back to orange
      ],
      animation: 'golden-hour',
      mood: 'romantic',
      lighting: 'golden'
    },
    
    cozy_library: {
      name: 'Cozy Study Nook',
      description: 'Warm, scholarly environment for focused discussions',
      colors: [
        '#fef7f0', // Stone 50
        '#fafaf9', // Stone 50
        '#f5f5f4', // Stone 100
        '#e7e5e4', // Stone 200
        '#f3f4f6', // Gray 100
        '#f9fafb', // Gray 50
        '#fafaf9', // Stone 50
        '#fef7f0'  // Back to stone
      ],
      animation: 'study-ambiance',
      mood: 'focused',
      lighting: 'ambient'
    }
  };

  /**
   * Get scene configuration for a specific scene type
   */
  static getScene(sceneType: SceneType): SceneConfig {
    return this.scenes[sceneType];
  }

  /**
   * Get scene type based on personality
   */
  static getSceneForPersonality(personality: string): SceneType {
    switch (personality) {
      case 'fertility_assistant':
        return 'fertility_clinic';
      case 'wellness_coach':
        return 'wellness_spa';
      case 'therapist':
        return 'botanical_garden';
      case 'professional':
        return 'peaceful_office';
      default:
        return 'fertility_clinic';
    }
  }

  /**
   * Apply scene to avatar container
   */
  static applyScene(sceneType: SceneType, container: HTMLElement): void {
    const scene = this.getScene(sceneType);
    
    // Create CSS gradient from scene colors
    const gradient = `linear-gradient(135deg, ${scene.colors.join(', ')})`;
    
    // Apply scene styling
    container.style.background = gradient;
    container.style.backgroundSize = '400% 400%';
    container.style.animation = `${scene.animation} 20s ease-in-out infinite`;
    
    // Add scene-specific class for additional styling
    container.className = container.className.replace(/scene-\w+/g, '');
    container.classList.add(`scene-${sceneType}`);
    
    // Set CSS custom properties for dynamic theming
    container.style.setProperty('--scene-mood', scene.mood);
    container.style.setProperty('--scene-lighting', scene.lighting);
  }

  /**
   * Get all available scenes
   */
  static getAllScenes(): Record<SceneType, SceneConfig> {
    return this.scenes;
  }

  /**
   * Create scene-specific CSS animations
   */
  static generateSceneCSS(): string {
    return `
      @keyframes spa-serenity {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.0) saturate(0.8) sepia(0.1); }
        25% { background-position: 100% 25%; filter: brightness(1.02) saturate(0.9) sepia(0.15); }
        50% { background-position: 100% 75%; filter: brightness(0.98) saturate(0.85) sepia(0.12); }
        75% { background-position: 0% 75%; filter: brightness(1.01) saturate(0.88) sepia(0.18); }
      }
      
      @keyframes garden-breeze {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.05) saturate(1.1) hue-rotate(0deg); }
        25% { background-position: 100% 25%; filter: brightness(1.08) saturate(1.2) hue-rotate(5deg); }
        50% { background-position: 100% 75%; filter: brightness(1.02) saturate(1.05) hue-rotate(-3deg); }
        75% { background-position: 0% 75%; filter: brightness(1.06) saturate(1.15) hue-rotate(2deg); }
      }
      
      @keyframes professional-ambiance {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.0) saturate(0.9) contrast(1.05); }
        50% { background-position: 100% 50%; filter: brightness(1.02) saturate(0.95) contrast(1.02); }
      }
      
      @keyframes golden-hour {
        0%, 100% { background-position: 0% 50%; filter: brightness(1.1) saturate(1.3) sepia(0.3); }
        25% { background-position: 100% 25%; filter: brightness(1.15) saturate(1.4) sepia(0.4); }
        50% { background-position: 100% 75%; filter: brightness(1.05) saturate(1.25) sepia(0.25); }
        75% { background-position: 0% 75%; filter: brightness(1.12) saturate(1.35) sepia(0.35); }
      }
      
      @keyframes study-ambiance {
        0%, 100% { background-position: 0% 50%; filter: brightness(0.95) saturate(0.8) contrast(1.1); }
        50% { background-position: 50% 100%; filter: brightness(0.98) saturate(0.85) contrast(1.05); }
      }
    `;
  }
}
