import { useCallback, useRef, useState } from 'react';
import { PersonalityManager, PersonalityType, PersonalityTraits } from '../utils/personalitySystem';
import { EmotionType } from '../utils/avatarAnimationManager';
import { UseTalkingHeadResult } from './useTalkingHead';

export interface UsePersonalitySystemOptions {
  defaultPersonality?: PersonalityType;
  autoApplyPersonality?: boolean;
}

export interface UsePersonalitySystemResult {
  currentPersonality: PersonalityType;
  personalityTraits: PersonalityTraits;
  setPersonality: (personality: PersonalityType) => void;
  modifyResponse: (response: string, context: {
    isGreeting?: boolean;
    needsEncouragement?: boolean;
    needsEmpathy?: boolean;
    isClosing?: boolean;
    userEmotion?: EmotionType;
    userInput?: string;
  }) => string;
  applyPersonalityToAvatar: (avatar: UseTalkingHeadResult) => void;
  getPersonalityGreeting: () => string;
  availablePersonalities: PersonalityType[];
  // Scene management methods
  applySceneToAvatar: (container: HTMLElement) => void;
  getCurrentScene: () => string;
  getSceneDescription: () => string;
}

export function usePersonalitySystem(options: UsePersonalitySystemOptions = {}): UsePersonalitySystemResult {
  const { defaultPersonality = 'fertility_assistant', autoApplyPersonality = true } = options;
  
  const personalityManagerRef = useRef<PersonalityManager>(new PersonalityManager(defaultPersonality));
  const [currentPersonality, setCurrentPersonalityState] = useState<PersonalityType>(defaultPersonality);
  const [personalityTraits, setPersonalityTraits] = useState<PersonalityTraits>(
    personalityManagerRef.current.getTraits()
  );

  const setPersonality = useCallback((personality: PersonalityType) => {
    personalityManagerRef.current.setPersonality(personality);
    setCurrentPersonalityState(personality);
    setPersonalityTraits(personalityManagerRef.current.getTraits());
    
    console.log(`[PersonalitySystem] Switched to ${personality} personality`);
  }, []);

  const modifyResponse = useCallback((response: string, context: {
    isGreeting?: boolean;
    needsEncouragement?: boolean;
    needsEmpathy?: boolean;
    isClosing?: boolean;
    userEmotion?: EmotionType;
    userInput?: string;
  }) => {
    // Only apply personality modifications for the initial greeting
    if (context.isGreeting) {
      const manager = personalityManagerRef.current;
      return manager.modifyResponse(response, context);
    }
    
    // For all other responses, return the LLM response as-is
    // Let the LLM handle empathy, support, and personality naturally
    return response;
  }, [currentPersonality]);

  const applyPersonalityToAvatar = useCallback((avatar: UseTalkingHeadResult) => {
    if (!avatar.isReady || !autoApplyPersonality) return;

    const traits = personalityManagerRef.current.getTraits();
    
    try {
      // Apply default emotion and intensity
      avatar.setEmotion(traits.defaultEmotion, traits.emotionIntensity);
      
      console.log(`[PersonalitySystem] Applied ${currentPersonality} traits to avatar:`, {
        emotion: traits.defaultEmotion,
        intensity: traits.emotionIntensity,
        style: traits.animationStyle
      });
    } catch (error) {
      console.error('[PersonalitySystem] Failed to apply personality to avatar:', error);
    }
  }, [currentPersonality, autoApplyPersonality]);

  const getPersonalityGreeting = useCallback(() => {
    return personalityManagerRef.current.getRandomGreeting();
  }, []);

  const applySceneToAvatar = useCallback((container: HTMLElement) => {
    personalityManagerRef.current.applySceneToAvatar(container);
  }, []);

  const getCurrentScene = useCallback(() => {
    return personalityManagerRef.current.getCurrentScene();
  }, []);

  const getSceneDescription = useCallback(() => {
    return personalityManagerRef.current.getSceneDescription();
  }, []);

  const availablePersonalities: PersonalityType[] = ['fertility_assistant', 'professional', 'casual', 'friendly'];

  return {
    currentPersonality,
    personalityTraits,
    setPersonality,
    modifyResponse,
    applyPersonalityToAvatar,
    getPersonalityGreeting,
    availablePersonalities,
    applySceneToAvatar,
    getCurrentScene,
    getSceneDescription
  };
}
