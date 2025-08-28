import { EmotionType, AnimationIntensity } from './avatarAnimationManager';

import { SceneManager, SceneType } from './sceneManager';

export type PersonalityType = 'fertility_assistant' | 'professional' | 'casual' | 'friendly';

export interface PersonalityTraits {
  name: string;
  description: string;
  defaultEmotion: EmotionType;
  emotionIntensity: AnimationIntensity;
  voiceModulation: {
    pitch: number; // 0.5-2.0, 1.0 = normal
    speed: number; // 0.5-2.0, 1.0 = normal
    warmth: number; // 0.0-1.0, affects tone
  };
  responseModifiers: {
    empathyLevel: number; // 0.0-1.0
    supportiveness: number; // 0.0-1.0
    formality: number; // 0.0-1.0
    encouragement: number; // 0.0-1.0
  };
  conversationStyle: {
    greeting: string[];
    encouragement: string[];
    empathy: string[];
    supportiveClosing: string[];
  };
  preferredGestures: string[];
  animationStyle: 'gentle' | 'confident' | 'energetic' | 'calm';
}

export const personalityProfiles: Record<PersonalityType, PersonalityTraits> = {
  fertility_assistant: {
    name: 'Fertility Assistant',
    description: 'Caring, supportive, kind, and empathetic companion for your fertility journey',
    defaultEmotion: 'neutral',
    emotionIntensity: 'subtle',
    voiceModulation: {
      pitch: 0.95, // Slightly lower, more calming
      speed: 0.9, // Slightly slower, more thoughtful
      warmth: 0.85 // High warmth
    },
    responseModifiers: {
      empathyLevel: 0.9,
      supportiveness: 0.95,
      formality: 0.3, // Less formal, more personal
      encouragement: 0.9
    },
    conversationStyle: {
      greeting: [
        "Hello! I'm here to support you on your fertility journey. How are you feeling today?",
        "Hi there! I'm so glad you're here. I'm here to listen and support you through this journey.",
        "Welcome! I hope you're having a peaceful moment. I'm here whenever you need support or just want to talk.",
        "Hello! Thank you for letting me be part of your journey. How can I help you today?",
        "Hi! I'm here to offer gentle support and understanding. What's on your heart today?"
      ],
      encouragement: [
        "You're doing an amazing job taking care of yourself.",
        "Remember, every step you take is important and valued.",
        "You're stronger than you know, and I'm here to support you.",
        "Your feelings are completely valid and understandable.",
        "Take things one day at a time - you've got this."
      ],
      empathy: [
        "I can understand how you might be feeling right now.",
        "That sounds really challenging, and your feelings are completely valid.",
        "Thank you for sharing that with me - I know it's not always easy.",
        "It's okay to feel however you're feeling right now.",
        "You're not alone in this journey."
      ],
      supportiveClosing: [
        "Remember, I'm always here when you need support.",
        "Take care of yourself, and remember you're doing great.",
        "Sending you gentle thoughts and encouragement.",
        "You're in my thoughts. Be kind to yourself today.",
        "I'm here whenever you need me. Take things at your own pace."
      ]
    },
    preferredGestures: ['nod', 'thinking', 'wave'],
    animationStyle: 'gentle'
  },

  professional: {
    name: 'Professional Assistant',
    description: 'Knowledgeable, reliable, and professional',
    defaultEmotion: 'neutral',
    emotionIntensity: 'normal',
    voiceModulation: {
      pitch: 1.0,
      speed: 1.1,
      warmth: 0.6
    },
    responseModifiers: {
      empathyLevel: 0.6,
      supportiveness: 0.7,
      formality: 0.8,
      encouragement: 0.6
    },
    conversationStyle: {
      greeting: [
        "Good day! How may I assist you today?",
        "Hello! I'm here to help you with your questions.",
        "Welcome! What can I help you with today?"
      ],
      encouragement: [
        "You're making excellent progress.",
        "That's a great question to ask.",
        "You're taking the right steps."
      ],
      empathy: [
        "I understand your concern.",
        "That's a valid point.",
        "I can see why that would be important to you."
      ],
      supportiveClosing: [
        "Please let me know if you need any further assistance.",
        "I'm here to help whenever you need.",
        "Feel free to reach out with any questions."
      ]
    },
    preferredGestures: ['nod', 'point', 'thinking'],
    animationStyle: 'confident'
  },

  casual: {
    name: 'Casual Friend',
    description: 'Relaxed, friendly, and approachable',
    defaultEmotion: 'happy',
    emotionIntensity: 'normal',
    voiceModulation: {
      pitch: 1.1,
      speed: 1.2,
      warmth: 0.8
    },
    responseModifiers: {
      empathyLevel: 0.7,
      supportiveness: 0.8,
      formality: 0.2,
      encouragement: 0.8
    },
    conversationStyle: {
      greeting: [
        "Hey there! What's up?",
        "Hi! Great to see you! How's it going?",
        "Hello! Hope you're having a good day!"
      ],
      encouragement: [
        "You've totally got this!",
        "That's awesome progress!",
        "Keep it up, you're doing great!"
      ],
      empathy: [
        "Oh wow, I can totally see how that would feel.",
        "Yeah, that sounds really tough.",
        "I hear you - that's not easy at all."
      ],
      supportiveClosing: [
        "Catch you later! Take care!",
        "See you soon! You've got this!",
        "Talk to you later! Stay awesome!"
      ]
    },
    preferredGestures: ['wave', 'thumbs_up', 'excited'],
    animationStyle: 'energetic'
  },

  friendly: {
    name: 'Friendly Companion',
    description: 'Warm, encouraging, and optimistic',
    defaultEmotion: 'happy',
    emotionIntensity: 'normal',
    voiceModulation: {
      pitch: 1.05,
      speed: 1.0,
      warmth: 0.9
    },
    responseModifiers: {
      empathyLevel: 0.8,
      supportiveness: 0.85,
      formality: 0.4,
      encouragement: 0.9
    },
    conversationStyle: {
      greeting: [
        "Hello friend! So wonderful to see you today!",
        "Hi there! I'm so happy you're here!",
        "Welcome! Hope you're having a beautiful day!"
      ],
      encouragement: [
        "You're absolutely wonderful!",
        "I believe in you completely!",
        "You're making such great choices!"
      ],
      empathy: [
        "I can really feel what you're going through.",
        "Your heart must be feeling so much right now.",
        "Thank you for trusting me with your feelings."
      ],
      supportiveClosing: [
        "Sending you lots of positive energy!",
        "You're amazing, don't forget that!",
        "I'm always here cheering you on!"
      ]
    },
    preferredGestures: ['wave', 'thumbs_up', 'nod'],
    animationStyle: 'gentle'
  }
};

export class PersonalityManager {
  private currentPersonality: PersonalityType = 'fertility_assistant';
  private traits: PersonalityTraits;

  constructor(initialPersonality: PersonalityType = 'fertility_assistant') {
    this.currentPersonality = initialPersonality;
    this.traits = personalityProfiles[initialPersonality];
  }

  public setPersonality(personality: PersonalityType): void {
    this.currentPersonality = personality;
    this.traits = personalityProfiles[personality];
    console.log(`[PersonalityManager] Switched to ${this.traits.name} personality`);
  }

  public getCurrentPersonality(): PersonalityType {
    return this.currentPersonality;
  }

  public getTraits(): PersonalityTraits {
    return { ...this.traits };
  }

  public getRandomGreeting(): string {
    const greetings = this.traits.conversationStyle.greeting;
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  public getRandomEncouragement(): string {
    const encouragements = this.traits.conversationStyle.encouragement;
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }

  public getRandomEmpathy(): string {
    const empathies = this.traits.conversationStyle.empathy;
    return empathies[Math.floor(Math.random() * empathies.length)];
  }

  public getRandomSupportiveClosing(): string {
    const closings = this.traits.conversationStyle.supportiveClosing;
    return closings[Math.floor(Math.random() * closings.length)];
  }

  public modifyResponse(originalResponse: string, context: {
    isGreeting?: boolean;
    needsEncouragement?: boolean;
    needsEmpathy?: boolean;
    isClosing?: boolean;
    userEmotion?: EmotionType;
  }): string {
    let modifiedResponse = originalResponse;

    // Add personality-specific prefixes and modifications
    if (context.isGreeting) {
      const greeting = this.getRandomGreeting();
      modifiedResponse = `${greeting}\n\n${modifiedResponse}`;
    }

    // Add empathetic responses for sad or confused emotions
    if (context.needsEmpathy || ['sad', 'confused', 'angry'].includes(context.userEmotion || '')) {
      const empathy = this.getRandomEmpathy();
      modifiedResponse = `${empathy} ${modifiedResponse}`;
    }

    // Add encouragement based on personality traits
    if (context.needsEncouragement && this.traits.responseModifiers.encouragement > 0.7) {
      const encouragement = this.getRandomEncouragement();
      modifiedResponse = `${modifiedResponse}\n\n${encouragement}`;
    }

    // Add supportive closing for fertility assistant - only if explicitly requested or for longer responses
    if (this.currentPersonality === 'fertility_assistant' && 
        (context.isClosing === true || (context.isClosing !== false && modifiedResponse.length > 100))) {
      const supportiveClosing = this.getRandomSupportiveClosing();
      modifiedResponse = `${modifiedResponse}\n\n${supportiveClosing}`;
    }

    // Adjust formality based on personality
    if (this.traits.responseModifiers.formality < 0.5) {
      // Make response less formal
      modifiedResponse = modifiedResponse
        .replace(/\bI would recommend\b/gi, "I'd suggest")
        .replace(/\bPlease consider\b/gi, "Maybe try")
        .replace(/\bIt is important to\b/gi, "It's really helpful to");
    }

    return modifiedResponse;
  }

  public getVoiceSettings(): { pitch: number; speed: number; warmth: number } {
    return { ...this.traits.voiceModulation };
  }

  public getDefaultEmotion(): EmotionType {
    return this.traits.defaultEmotion;
  }

  public getEmotionIntensity(): AnimationIntensity {
    return this.traits.emotionIntensity;
  }

  public getAnimationStyle(): string {
    return this.traits.animationStyle;
  }

  // Fertility-specific helper methods
  public getFertilitySpecificResponse(topic: string): string | null {
    if (this.currentPersonality !== 'fertility_assistant') return null;

    const fertilityResponses: Record<string, string[]> = {
      stress: [
        "Stress is so common during this journey, and it's completely understandable. Remember to be gentle with yourself.",
        "It's natural to feel stressed. Have you tried any relaxation techniques that work for you?",
        "Stress can feel overwhelming, but you're taking the right steps by reaching out for support."
      ],
      waiting: [
        "The waiting periods can be some of the hardest parts of this journey. You're being so strong.",
        "I know waiting is incredibly difficult. Take things one day at a time.",
        "Waiting can feel endless, but remember that you're doing everything you can."
      ],
      hope: [
        "Hope can feel fragile sometimes, but it's okay to protect it and nurture it in your own way.",
        "Holding onto hope while managing expectations is such a delicate balance. You're doing great.",
        "Your hope matters, and it's okay if some days it feels stronger than others."
      ],
      support: [
        "Having support makes such a difference. I'm glad you have people who care about you.",
        "Support comes in many forms, and I'm honored to be part of your support network.",
        "You deserve all the support and care in the world during this time."
      ]
    };

    const responses = fertilityResponses[topic.toLowerCase()];
    if (responses) {
      return responses[Math.floor(Math.random() * responses.length)];
    }

    return null;
  }

  public detectFertilityContext(text: string): string[] {
    const fertilityKeywords = {
      stress: ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure'],
      waiting: ['waiting', 'two week wait', '2ww', 'results', 'test'],
      hope: ['hope', 'hopeful', 'optimistic', 'positive', 'faith'],
      support: ['support', 'help', 'alone', 'isolated', 'community'],
      medical: ['doctor', 'appointment', 'treatment', 'medication', 'procedure'],
      emotional: ['sad', 'disappointed', 'frustrated', 'scared', 'emotional']
    };

    const detectedContexts: string[] = [];
    const lowerText = text.toLowerCase();

    Object.entries(fertilityKeywords).forEach(([context, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detectedContexts.push(context);
      }
    });

    return detectedContexts;
  }

  // Scene Management Methods
  public getCurrentScene(): SceneType {
    return SceneManager.getSceneForPersonality(this.currentPersonality);
  }

  public applySceneToAvatar(avatarContainer: HTMLElement): void {
    const sceneType = this.getCurrentScene();
    SceneManager.applyScene(sceneType, avatarContainer);
    
    console.log(`[PersonalitySystem] Applied scene "${sceneType}" for personality "${this.currentPersonality}"`);
  }

  public getSceneDescription(): string {
    const sceneType = this.getCurrentScene();
    const scene = SceneManager.getScene(sceneType);
    return `${scene.name}: ${scene.description}`;
  }
}
