import { TalkingHead } from '@met4citizen/talkinghead';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'excited' | 'confused' | 'thinking';
export type GestureType = 'wave' | 'nod' | 'shake_head' | 'point' | 'thumbs_up' | 'shrug' | 'thinking' | 'excited';
export type AnimationIntensity = 'subtle' | 'normal' | 'strong';

export interface AnimationState {
  currentEmotion: EmotionType;
  currentGesture: GestureType | null;
  intensity: AnimationIntensity;
  isIdle: boolean;
}

export interface EmotionMapping {
  mood: string;
  facialExpression?: string;
  bodyLanguage?: string;
  voiceModulation?: number; // 0.5 to 1.5 for pitch/speed adjustments
}

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
      voiceModulation: 1.2
    },
    surprised: { 
      mood: 'surprised',
      facialExpression: 'wide_eyes',
      bodyLanguage: 'alert',
      voiceModulation: 1.15
    },
    neutral: { 
      mood: 'neutral',
      facialExpression: 'calm',
      bodyLanguage: 'relaxed',
      voiceModulation: 1.0
    },
    excited: { 
      mood: 'excited',
      facialExpression: 'big_smile',
      bodyLanguage: 'animated',
      voiceModulation: 1.25
    },
    confused: { 
      mood: 'confused',
      facialExpression: 'puzzled',
      bodyLanguage: 'tilted',
      voiceModulation: 0.95
    },
    thinking: { 
      mood: 'thinking',
      facialExpression: 'concentrated',
      bodyLanguage: 'contemplative',
      voiceModulation: 0.85
    }
  };

  // Gesture animation sequences
  private gestureAnimations: Record<GestureType, () => Promise<void>> = {
    wave: () => this.performWaveGesture(),
    nod: () => this.performNodGesture(),
    shake_head: () => this.performShakeHeadGesture(),
    point: () => this.performPointGesture(),
    thumbs_up: () => this.performThumbsUpGesture(),
    shrug: () => this.performShrugGesture(),
    thinking: () => this.performThinkingGesture(),
    excited: () => this.performExcitedGesture()
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

  private async processGestureQueue(): Promise<void> {
    if (this.gestureQueue.length === 0 || this.isProcessingGesture) {
      return;
    }

    this.isProcessingGesture = true;
    this.currentState.isIdle = false;

    while (this.gestureQueue.length > 0) {
      const gesture = this.gestureQueue.shift()!;
      this.currentState.currentGesture = gesture;
      
      try {
        await this.gestureAnimations[gesture]();
        await this.delay(200); // Brief pause between gestures
      } catch (error) {
        console.error(`[AnimationManager] Error performing gesture ${gesture}:`, error);
      }
    }

    this.currentState.currentGesture = null;
    this.currentState.isIdle = true;
    this.isProcessingGesture = false;
  }

  private applyCurrentEmotion(): void {
    if (!this.head) return;

    const mapping = this.emotionMappings[this.currentState.currentEmotion];
    
    try {
      // Apply mood to TalkingHead if the method exists
      if (typeof this.head.setMood === 'function') {
        this.head.setMood(mapping.mood);
      } else if (typeof (this.head as any).avatarMood !== 'undefined') {
        (this.head as any).avatarMood = mapping.mood;
      }
      
      console.log(`[AnimationManager] Applied emotion: ${this.currentState.currentEmotion} -> mood: ${mapping.mood}`);
    } catch (error) {
      console.error('[AnimationManager] Error applying emotion:', error);
    }
  }

  // Gesture implementations using TalkingHead's animation capabilities
  private async performWaveGesture(): Promise<void> {
    console.log('[AnimationManager] Performing wave gesture');
    
    if (!this.head) return;
    
    try {
      // Simulate wave animation - in a real implementation, this would use TalkingHead's animation API
      await this.simulateGestureSequence([
        { action: 'raise_hand', duration: 300 },
        { action: 'wave_motion', duration: 800, repetitions: 3 },
        { action: 'lower_hand', duration: 300 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Wave gesture error:', error);
    }
  }

  private async performNodGesture(): Promise<void> {
    console.log('[AnimationManager] Performing nod gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'nod_down', duration: 200 },
        { action: 'nod_up', duration: 200 },
        { action: 'nod_down', duration: 200 },
        { action: 'nod_center', duration: 200 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Nod gesture error:', error);
    }
  }

  private async performShakeHeadGesture(): Promise<void> {
    console.log('[AnimationManager] Performing shake head gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'turn_left', duration: 200 },
        { action: 'turn_right', duration: 200 },
        { action: 'turn_left', duration: 200 },
        { action: 'turn_center', duration: 200 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Shake head gesture error:', error);
    }
  }

  private async performPointGesture(): Promise<void> {
    console.log('[AnimationManager] Performing point gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'raise_arm', duration: 400 },
        { action: 'point_forward', duration: 600 },
        { action: 'lower_arm', duration: 400 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Point gesture error:', error);
    }
  }

  private async performThumbsUpGesture(): Promise<void> {
    console.log('[AnimationManager] Performing thumbs up gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'raise_thumb', duration: 300 },
        { action: 'hold_thumbs_up', duration: 800 },
        { action: 'lower_thumb', duration: 300 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Thumbs up gesture error:', error);
    }
  }

  private async performShrugGesture(): Promise<void> {
    console.log('[AnimationManager] Performing shrug gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'raise_shoulders', duration: 400 },
        { action: 'tilt_head', duration: 200 },
        { action: 'hold_shrug', duration: 600 },
        { action: 'lower_shoulders', duration: 400 },
        { action: 'straighten_head', duration: 200 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Shrug gesture error:', error);
    }
  }

  private async performThinkingGesture(): Promise<void> {
    console.log('[AnimationManager] Performing thinking gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'hand_to_chin', duration: 500 },
        { action: 'tilt_head_slightly', duration: 300 },
        { action: 'hold_thinking_pose', duration: 1000 },
        { action: 'straighten_head', duration: 300 },
        { action: 'lower_hand', duration: 500 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Thinking gesture error:', error);
    }
  }

  private async performExcitedGesture(): Promise<void> {
    console.log('[AnimationManager] Performing excited gesture');
    
    try {
      await this.simulateGestureSequence([
        { action: 'slight_bounce', duration: 200 },
        { action: 'raise_both_hands', duration: 300 },
        { action: 'excited_motion', duration: 800, repetitions: 2 },
        { action: 'lower_hands', duration: 300 }
      ]);
    } catch (error) {
      console.error('[AnimationManager] Excited gesture error:', error);
    }
  }

  // Simulate gesture sequence - in real implementation, this would interface with TalkingHead's animation system
  private async simulateGestureSequence(sequence: Array<{action: string, duration: number, repetitions?: number}>): Promise<void> {
    for (const step of sequence) {
      const repetitions = step.repetitions || 1;
      
      for (let i = 0; i < repetitions; i++) {
        console.log(`[AnimationManager] Executing: ${step.action} (${step.duration}ms)`);
        
        // In a real implementation, this would call TalkingHead animation methods
        // For now, we simulate the timing
        await this.delay(step.duration);
      }
    }
  }

  // Idle animations for when avatar is not actively speaking or gesturing
  private startIdleAnimations(): void {
    this.scheduleNextIdleAnimation();
  }

  private scheduleNextIdleAnimation(): void {
    // Clear existing timer
    if (this.idleAnimationTimer) {
      clearTimeout(this.idleAnimationTimer);
    }

    // Schedule next idle animation
    const delay = 3000 + Math.random() * 7000; // 3-10 seconds
    
    this.idleAnimationTimer = setTimeout(() => {
      if (this.currentState.isIdle && !this.isProcessingGesture) {
        this.performIdleAnimation();
      }
      this.scheduleNextIdleAnimation();
    }, delay);
  }

  private async performIdleAnimation(): Promise<void> {
    if (!this.head || !this.currentState.isIdle) return;

    const idleAnimations = [
      'subtle_blink',
      'slight_head_turn',
      'gentle_breathing',
      'micro_expression'
    ];

    const animation = idleAnimations[Math.floor(Math.random() * idleAnimations.length)];
    
    console.log(`[AnimationManager] Performing idle animation: ${animation}`);
    
    try {
      switch (animation) {
        case 'subtle_blink':
          await this.delay(100); // Simulate blink
          break;
        case 'slight_head_turn':
          await this.delay(800); // Simulate gentle head movement
          break;
        case 'gentle_breathing':
          await this.delay(1200); // Simulate breathing motion
          break;
        case 'micro_expression':
          await this.delay(300); // Simulate subtle facial expression
          break;
      }
    } catch (error) {
      console.error('[AnimationManager] Idle animation error:', error);
    }
  }

  public getVoiceModulation(): number {
    const mapping = this.emotionMappings[this.currentState.currentEmotion];
    return mapping.voiceModulation || 1.0;
  }

  public getCurrentState(): AnimationState {
    return { ...this.currentState };
  }

  public cleanup(): void {
    if (this.idleAnimationTimer) {
      clearTimeout(this.idleAnimationTimer);
      this.idleAnimationTimer = null;
    }
    this.gestureQueue = [];
    this.isProcessingGesture = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
