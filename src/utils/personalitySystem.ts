import { EmotionType, AnimationIntensity } from './avatarAnimationManager';

// Personality types
export type PersonalityType = 'fertility_assistant' | 'professional' | 'casual' | 'friendly';

// Personality traits interface
export interface PersonalityTraits {
  name: string;
  description: string;
  defaultEmotion: EmotionType;
  emotionIntensity: AnimationIntensity;
  animationStyle: 'subtle' | 'expressive' | 'dynamic';
  avatarUrl: string;
  voiceCharacteristics: {
    pace: 'slow' | 'normal' | 'fast';
    warmth: 'formal' | 'warm' | 'very_warm';
    energy: 'calm' | 'balanced' | 'energetic';
  };
  communicationStyle: {
    empathy: 'low' | 'medium' | 'high';
    encouragement: 'subtle' | 'moderate' | 'strong';
    formality: 'formal' | 'friendly' | 'casual';
  };
  scenePreference: string;
}

// Response modification context
export interface ResponseContext {
  isGreeting?: boolean;
  needsEncouragement?: boolean;
  needsEmpathy?: boolean;
  isClosing?: boolean;
  userEmotion?: EmotionType;
  userInput?: string;
}

// Personality definitions
const personalityDefinitions: Record<PersonalityType, PersonalityTraits> = {
  fertility_assistant: {
    name: 'Fertility Assistant',
    description: 'Caring, supportive, and empathetic fertility support specialist',
    defaultEmotion: 'happy',
    emotionIntensity: 'normal',
    animationStyle: 'expressive',
    avatarUrl: '/ProfessionalCompanionAvatar.glb', // TODO: Fix FertilityCompanionAvatar.glb animation issues
    voiceCharacteristics: {
      pace: 'normal',
      warmth: 'very_warm',
      energy: 'balanced'
    },
    communicationStyle: {
      empathy: 'high',
      encouragement: 'strong',
      formality: 'friendly'
    },
    scenePreference: 'fertility_clinic'
  },
  professional: {
    name: 'Professional',
    description: 'Formal, knowledgeable, and reliable professional consultant',
    defaultEmotion: 'neutral',
    emotionIntensity: 'subtle',
    animationStyle: 'subtle',
    avatarUrl: '/ProfessionalCompanionAvatar.glb',
    voiceCharacteristics: {
      pace: 'normal',
      warmth: 'formal',
      energy: 'calm'
    },
    communicationStyle: {
      empathy: 'medium',
      encouragement: 'subtle',
      formality: 'formal'
    },
    scenePreference: 'office'
  },
  casual: {
    name: 'Casual',
    description: 'Relaxed, approachable, and easy-going companion',
    defaultEmotion: 'happy',
    emotionIntensity: 'normal',
    animationStyle: 'dynamic',
    avatarUrl: '/ProfessionalCompanionAvatar.glb',
    voiceCharacteristics: {
      pace: 'normal',
      warmth: 'warm',
      energy: 'balanced'
    },
    communicationStyle: {
      empathy: 'medium',
      encouragement: 'moderate',
      formality: 'casual'
    },
    scenePreference: 'home'
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm, enthusiastic, and cheerful friend',
    defaultEmotion: 'excited',
    emotionIntensity: 'normal',
    animationStyle: 'expressive',
    avatarUrl: '/ProfessionalCompanionAvatar.glb',
    voiceCharacteristics: {
      pace: 'fast',
      warmth: 'very_warm',
      energy: 'energetic'
    },
    communicationStyle: {
      empathy: 'high',
      encouragement: 'strong',
      formality: 'friendly'
    },
    scenePreference: 'park'
  }
};

// Personality-specific greetings
const personalityGreetings: Record<PersonalityType, string[]> = {
  fertility_assistant: [
    "Hello! I'm here to support you on your fertility journey. How are you feeling today?",
    "Welcome! I'm so glad you're here. How can I help you today?",
    "Hi there! I'm here to provide caring support for your fertility journey. What's on your mind?",
    "Hello! I'm your fertility support companion. How are you doing today?"
  ],
  professional: [
    "Good day. I'm here to assist you with professional guidance. How may I help you?",
    "Hello. I'm your professional consultant. What would you like to discuss today?",
    "Welcome. I'm here to provide expert assistance. How can I be of service?",
    "Good day. I'm ready to help with your professional needs. What can I assist you with?"
  ],
  casual: [
    "Hey there! What's going on today?",
    "Hi! How's everything going?",
    "Hello! What can I help you with today?",
    "Hey! Good to see you. What's up?"
  ],
  friendly: [
    "Hi there! I'm so excited to chat with you today! How are you doing?",
    "Hello! What a wonderful day to connect! How can I brighten your day?",
    "Hey! I'm thrilled you're here! What's happening in your world today?",
    "Hi! I'm here and ready to help with lots of enthusiasm! What can we explore together?"
  ]
};

// Personality Manager Class
export class PersonalityManager {
  private currentPersonality: PersonalityType;
  private currentTraits: PersonalityTraits;

  constructor(initialPersonality: PersonalityType = 'fertility_assistant') {
    this.currentPersonality = initialPersonality;
    this.currentTraits = personalityDefinitions[initialPersonality];
  }

  public setPersonality(personality: PersonalityType): void {
    console.log(`[PersonalityManager] Switching to ${personality} personality`);
    this.currentPersonality = personality;
    this.currentTraits = personalityDefinitions[personality];
  }

  public getPersonality(): PersonalityType {
    return this.currentPersonality;
  }

  public getTraits(): PersonalityTraits {
    return { ...this.currentTraits };
  }

  public getRandomGreeting(): string {
    const greetings = personalityGreetings[this.currentPersonality];
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  }

  public modifyResponse(response: string, context: ResponseContext): string {
    console.log(`[PersonalityManager] Modifying response for ${this.currentPersonality}`, context);
    
    // Only apply modifications for greetings - let LLM handle the rest naturally
    if (!context.isGreeting) {
      return response;
    }

    const traits = this.currentTraits;
    let modifiedResponse = response;

    // Add personality-specific touches only for greetings
    if (context.isGreeting) {
      switch (this.currentPersonality) {
        case 'fertility_assistant':
          if (!modifiedResponse.includes('fertility') && !modifiedResponse.includes('support')) {
            modifiedResponse = `${modifiedResponse} I'm here to provide caring support for your fertility journey.`;
          }
          break;
        case 'professional':
          if (traits.communicationStyle.formality === 'formal') {
            modifiedResponse = modifiedResponse.replace(/Hi!/g, 'Good day.');
            modifiedResponse = modifiedResponse.replace(/Hey/g, 'Hello');
          }
          break;
        case 'friendly':
          if (!modifiedResponse.includes('!')) {
            modifiedResponse = modifiedResponse.replace(/\.$/, '!');
          }
          break;
      }
    }

    console.log(`[PersonalityManager] Original: "${response}" -> Modified: "${modifiedResponse}"`);
    return modifiedResponse;
  }

  public applySceneToAvatar(container: HTMLElement): void {
    const scene = this.currentTraits.scenePreference;
    
    if (container) {
      console.log(`[PersonalityManager] Applying ${scene} scene background`);
      
      // Add data attribute for CSS targeting
      container.setAttribute('data-scene', scene);
      
      // Remove all scene-specific classes
      container.classList.remove('fertility-clinic-scene', 'office-scene', 'home-scene', 'park-scene');
      
      // Add scene-specific class based on current personality
      switch (scene) {
        case 'fertility_clinic':
          container.classList.add('fertility-clinic-scene');
          break;
        case 'office':
          container.classList.add('office-scene');
          break;
        case 'home':
          container.classList.add('home-scene');
          break;
        case 'park':
          container.classList.add('park-scene');
          break;
      }
      
      // Add subtle animation
      container.style.transition = 'background 2s ease-in-out, box-shadow 1s ease-in-out';
    }
  }

  public getCurrentScene(): string {
    return this.currentTraits.scenePreference;
  }

  public getSceneDescription(): string {
    const sceneDescriptions: Record<string, string> = {
      fertility_clinic: 'A warm, professional fertility clinic with soft lighting, calming colors, and subtle medical patterns - designed to provide comfort and hope during your fertility journey',
      office: 'A modern corporate office with clean lines, professional gray tones, and geometric patterns that convey competence and reliability',
      home: 'A cozy, comfortable home environment with warm orange and wood tones, creating an intimate and relaxed atmosphere for casual conversation',
      park: 'A peaceful natural park setting with gentle greens, organic patterns, and flowing elements that evoke fresh air and tranquility'
    };
    
    return sceneDescriptions[this.currentTraits.scenePreference] || 'A neutral environment';
  }

  public getAvailablePersonalities(): PersonalityType[] {
    return Object.keys(personalityDefinitions) as PersonalityType[];
  }

  public getPersonalityDescription(personality: PersonalityType): string {
    return personalityDefinitions[personality].description;
  }

  public getAvatarUrl(personality?: PersonalityType): string {
    const targetPersonality = personality || this.currentPersonality;
    return personalityDefinitions[targetPersonality].avatarUrl;
  }
}
