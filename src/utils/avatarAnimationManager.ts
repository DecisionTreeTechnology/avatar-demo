import { TalkingHead } from '@met4citizen/talkinghead';

// Basic type definitions
export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'excited' | 'confused' | 'thinking';
export type GestureType = 'wave' | 'nod' | 'shake_head' | 'point' | 'thumbs_up' | 'shrug' | 'thinking' | 'excited';
export type AnimationIntensity = 'subtle' | 'normal' | 'strong';

// Animation state interface
export interface AnimationState {
  currentEmotion: EmotionType;
  currentGesture: GestureType | null;
  intensity: AnimationIntensity;
  isIdle: boolean;
}

// Emotion mapping interface
export interface EmotionMapping {
  mood: string;
  facialExpression?: string;
  bodyLanguage?: string;
  voiceModulation?: number; // 0.5 to 1.5 for pitch/speed adjustments
}

// Avatar Animation Manager Class
export class AvatarAnimationManager {
  private head: TalkingHead | null = null;
  private currentState: AnimationState = {
    currentEmotion: 'neutral',
    currentGesture: null,
    intensity: 'normal',
    isIdle: true
  };
  
  private idleAnimationTimer: NodeJS.Timeout | null = null;
  private gestureQueue: GestureType[] = [];
  private isProcessingGesture = false;

  // Emotion-to-avatar mood mapping
  private emotionMappings: Record<EmotionType, EmotionMapping> = {
    happy: { 
      mood: 'happy',
      facialExpression: 'smile',
      bodyLanguage: 'open',
      voiceModulation: 1.1
    },
    sad: { 
      mood: 'sad',
      facialExpression: 'frown',
      bodyLanguage: 'closed',
      voiceModulation: 0.9
    },
    angry: { 
      mood: 'angry',
      facialExpression: 'stern',
      bodyLanguage: 'tense',
      voiceModulation: 1.0
    },
    surprised: { 
      mood: 'surprised',
      facialExpression: 'wide_eyes',
      bodyLanguage: 'alert',
      voiceModulation: 1.2
    },
    excited: { 
      mood: 'excited',
      facialExpression: 'bright_smile',
      bodyLanguage: 'energetic',
      voiceModulation: 1.15
    },
    confused: { 
      mood: 'confused',
      facialExpression: 'puzzled',
      bodyLanguage: 'hesitant',
      voiceModulation: 0.95
    },
    thinking: { 
      mood: 'thinking',
      facialExpression: 'contemplative',
      bodyLanguage: 'focused',
      voiceModulation: 0.9
    },
    neutral: { 
      mood: 'neutral',
      facialExpression: 'calm',
      bodyLanguage: 'relaxed',
      voiceModulation: 1.0
    }
  };

  constructor(head: TalkingHead | null = null) {
    this.head = head;
    this.startIdleAnimations();
  }

  public setHead(head: TalkingHead | null): void {
    this.head = head;
    if (head) {
      this.applyCurrentEmotion();
    }
  }

  public setEmotion(emotion: EmotionType, intensity: AnimationIntensity = 'normal'): void {
    console.log(`[AnimationManager] Setting emotion: ${emotion} (${intensity})`);
    
    this.currentState.currentEmotion = emotion;
    this.currentState.intensity = intensity;
    
    this.applyCurrentEmotion();
  }

  public async performGesture(gesture: GestureType): Promise<void> {
    console.log(`[AnimationManager] Queueing gesture: ${gesture}`);
    
    this.gestureQueue.push(gesture);
    
    if (!this.isProcessingGesture) {
      await this.processGestureQueue();
    }
  }

  public getCurrentState(): AnimationState {
    return { ...this.currentState };
  }

  public startIdleAnimations(): void {
    if (this.idleAnimationTimer) {
      clearInterval(this.idleAnimationTimer);
    }
    
    // Start subtle idle animations
    this.idleAnimationTimer = setInterval(() => {
      if (this.currentState.isIdle && this.head) {
        // Perform subtle idle movements
        this.performSubtleIdleAnimation();
      }
    }, 5000 + Math.random() * 5000); // 5-10 seconds
  }

  public stopIdleAnimations(): void {
    if (this.idleAnimationTimer) {
      clearInterval(this.idleAnimationTimer);
      this.idleAnimationTimer = null;
    }
  }

  private async processGestureQueue(): Promise<void> {
    if (this.gestureQueue.length === 0) {
      this.isProcessingGesture = false;
      return;
    }

    this.isProcessingGesture = true;
    this.currentState.isIdle = false;

    const gesture = this.gestureQueue.shift()!;
    
    try {
      await this.executeGesture(gesture);
    } catch (error) {
      console.error(`[AnimationManager] Failed to execute gesture ${gesture}:`, error);
    }

    // Small delay between gestures
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.currentState.isIdle = true;
    await this.processGestureQueue();
  }

  private async executeGesture(gesture: GestureType): Promise<void> {
    if (!this.head) {
      console.warn('[AnimationManager] No head instance available for gesture');
      return;
    }

    console.log(`[AnimationManager] Executing gesture: ${gesture}`);
    
    // For now, we'll use simple delays to simulate gestures
    // In a real implementation, this would use TalkingHead's animation system
    switch (gesture) {
      case 'wave':
        await this.performWaveGesture();
        break;
      case 'nod':
        await this.performNodGesture();
        break;
      case 'shake_head':
        await this.performShakeHeadGesture();
        break;
      case 'point':
        await this.performPointGesture();
        break;
      case 'thumbs_up':
        await this.performThumbsUpGesture();
        break;
      case 'shrug':
        await this.performShrugGesture();
        break;
      case 'thinking':
        await this.performThinkingGesture();
        break;
      case 'excited':
        await this.performExcitedGesture();
        break;
      default:
        console.warn(`[AnimationManager] Unknown gesture: ${gesture}`);
    }
  }

  private applyCurrentEmotion(): void {
    if (!this.head) {
      console.warn('[AnimationManager] No head instance available for emotion');
      return;
    }

    const mapping = this.emotionMappings[this.currentState.currentEmotion];
    
    try {
      // Apply mood to TalkingHead if the method exists
      if (typeof this.head.setMood === 'function') {
        console.log('[AnimationManager] Using setMood method');
        this.head.setMood(mapping.mood);
      } else if (typeof (this.head as any).avatarMood !== 'undefined') {
        console.log('[AnimationManager] Using avatarMood property');
        (this.head as any).avatarMood = mapping.mood;
      } else {
        console.warn('[AnimationManager] No mood setting method found on TalkingHead instance');
      }
      
      console.log(`[AnimationManager] Applied emotion: ${this.currentState.currentEmotion} -> mood: ${mapping.mood}`);
    } catch (error) {
      console.error('[AnimationManager] Error applying emotion:', error);
    }
  }

  // Gesture implementations (simplified for now)
  private async performWaveGesture(): Promise<void> {
    await this.simulateGestureSequence('wave', 1000);
  }

  private async performNodGesture(): Promise<void> {
    await this.simulateGestureSequence('nod', 800);
  }

  private async performShakeHeadGesture(): Promise<void> {
    await this.simulateGestureSequence('shake_head', 1000);
  }

  private async performPointGesture(): Promise<void> {
    await this.simulateGestureSequence('point', 1200);
  }

  private async performThumbsUpGesture(): Promise<void> {
    await this.simulateGestureSequence('thumbs_up', 1000);
  }

  private async performShrugGesture(): Promise<void> {
    await this.simulateGestureSequence('shrug', 1500);
  }

  private async performThinkingGesture(): Promise<void> {
    await this.simulateGestureSequence('thinking', 2000);
  }

  private async performExcitedGesture(): Promise<void> {
    await this.simulateGestureSequence('excited', 1500);
  }

  private async performSubtleIdleAnimation(): Promise<void> {
    // Subtle breathing or micro-movements
    console.log('[AnimationManager] Performing idle animation');
  }

  // Simulate gesture sequence - in real implementation, this would interface with TalkingHead's animation system
  private async simulateGestureSequence(gestureName: string, duration: number): Promise<void> {
    console.log(`[AnimationManager] Simulating ${gestureName} gesture for ${duration}ms`);
    
    // In a real implementation, this would trigger actual avatar animations
    // For now, we just wait for the gesture duration
    await new Promise(resolve => setTimeout(resolve, duration));
    
    console.log(`[AnimationManager] Completed ${gestureName} gesture`);
  }

  public dispose(): void {
    this.stopIdleAnimations();
    this.gestureQueue = [];
    this.isProcessingGesture = false;
    this.head = null;
  }
}
