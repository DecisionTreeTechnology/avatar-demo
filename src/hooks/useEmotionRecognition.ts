import { useCallback, useRef } from 'react';
import { EmotionRecognitionEngine } from '../utils/emotionRecognition';
import { EmotionType } from '../utils/avatarAnimationManager';
import { UseTalkingHeadResult } from './useTalkingHead';

export interface UseEmotionRecognitionOptions {
  autoApplyEmotions?: boolean;
  autoTriggerGestures?: boolean;
}

export interface EmotionAnalysisResult {
  emotion: {
    primaryEmotion: EmotionType;
    confidence: number;
    suggestedGestures: string[];
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  conversationEnergy?: 'low' | 'medium' | 'high';
}

export interface ConversationAnalysisResult extends EmotionAnalysisResult {
  conversationEnergy: 'low' | 'medium' | 'high';
}

export interface UseEmotionRecognitionResult {
  analyzeAndApply: (text: string, avatar: UseTalkingHeadResult) => Promise<EmotionAnalysisResult>;
  analyzeConversation: (messages: string[]) => ConversationAnalysisResult;
  analyzeText: (text: string) => EmotionAnalysisResult;
}

const mapEmotionToAvatar = (detectedEmotion: string): EmotionType => {
  const emotionMap: Record<string, EmotionType> = {
    happy: 'happy',
    sad: 'sad',
    anxious: 'confused',
    angry: 'angry',
    surprised: 'surprised',
    hopeful: 'excited',
    neutral: 'neutral'
  };
  
  return emotionMap[detectedEmotion] || 'neutral';
};

const determineSentiment = (emotions: string[], intensity: number): 'positive' | 'negative' | 'neutral' => {
  const positiveEmotions = ['happy', 'hopeful', 'excited'];
  const negativeEmotions = ['sad', 'anxious', 'angry'];
  
  const hasPositive = emotions.some(e => positiveEmotions.includes(e));
  const hasNegative = emotions.some(e => negativeEmotions.includes(e));
  
  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  if (intensity > 0.5) {
    return hasNegative ? 'negative' : hasPositive ? 'positive' : 'neutral';
  }
  return 'neutral';
};

const determineConversationEnergy = (intensity: number, emotions: string[]): 'low' | 'medium' | 'high' => {
  const highEnergyEmotions = ['excited', 'happy', 'angry', 'surprised'];
  const hasHighEnergyEmotion = emotions.some(e => highEnergyEmotions.includes(e));
  
  if (hasHighEnergyEmotion && intensity > 0.7) return 'high';
  if (intensity > 0.4 || hasHighEnergyEmotion) return 'medium';
  return 'low';
};

export function useEmotionRecognition(
  options: UseEmotionRecognitionOptions = {}
): UseEmotionRecognitionResult {
  const { autoApplyEmotions = true, autoTriggerGestures = true } = options;
  
  const engineRef = useRef<EmotionRecognitionEngine>(new EmotionRecognitionEngine());

  const analyzeText = useCallback((text: string): EmotionAnalysisResult => {
    const analysis = engineRef.current.analyzeText(text);
    
    // Get primary emotion (first detected or neutral)
    const primaryEmotion = analysis.emotions.length > 0 
      ? mapEmotionToAvatar(analysis.emotions[0])
      : 'neutral';
    
    // Calculate confidence based on intensity
    const confidence = Math.min(analysis.intensity * 2, 1); // Scale up slightly
    
    // Get suggested gestures
    const suggestedGestures = analysis.suggestions.flatMap(s => s.gestures);
    
    // Determine sentiment
    const sentiment = determineSentiment(analysis.emotions, analysis.intensity);
    
    return {
      emotion: {
        primaryEmotion,
        confidence,
        suggestedGestures
      },
      sentiment
    };
  }, []);

  const analyzeAndApply = useCallback(async (
    text: string, 
    avatar: UseTalkingHeadResult
  ): Promise<EmotionAnalysisResult> => {
    console.log('[EmotionRecognition] Analyzing text:', text.substring(0, 100) + '...');
    
    const result = analyzeText(text);
    
    console.log('[EmotionRecognition] Analysis result:', result);
    
    // Apply emotions to avatar if enabled and avatar is ready
    if (autoApplyEmotions && avatar.isReady && result.emotion.confidence > 0.3) {
      try {
        console.log(`[EmotionRecognition] Applying emotion: ${result.emotion.primaryEmotion}`);
        avatar.setEmotion(result.emotion.primaryEmotion, 'normal');
      } catch (error) {
        console.warn('[EmotionRecognition] Failed to apply emotion to avatar:', error);
      }
    }
    
    // Trigger gestures if enabled and suggested
    if (autoTriggerGestures && avatar.isReady && result.emotion.suggestedGestures.length > 0 && result.emotion.confidence > 0.5) {
      try {
        // Pick the first suggested gesture that maps to avatar gestures
        const gestureMap: Record<string, string> = {
          wave: 'wave',
          thumbs_up: 'thumbs_up',
          comfort: 'nod',
          empathy: 'nod',
          calm: 'thinking',
          reassurance: 'nod',
          understanding: 'nod',
          surprise: 'excited',
          wonder: 'thinking',
          encouragement: 'thumbs_up',
          support: 'nod'
        };
        
        const availableGesture = result.emotion.suggestedGestures.find(g => gestureMap[g]);
        if (availableGesture) {
          const mappedGesture = gestureMap[availableGesture];
          console.log(`[EmotionRecognition] Triggering gesture: ${mappedGesture}`);
          // Small delay to let emotion apply first
          setTimeout(() => {
            avatar.performGesture(mappedGesture as any).catch(error => {
              console.warn('[EmotionRecognition] Failed to perform gesture:', error);
            });
          }, 500);
        }
      } catch (error) {
        console.warn('[EmotionRecognition] Failed to trigger gesture:', error);
      }
    }
    
    return result;
  }, [autoApplyEmotions, autoTriggerGestures, analyzeText]);

  const analyzeConversation = useCallback((messages: string[]): ConversationAnalysisResult => {
    // Convert string array to the format expected by the engine
    const messageObjects = messages.map((content, index) => ({
      content,
      role: index % 2 === 0 ? 'user' : 'assistant'
    }));
    
    const analysis = engineRef.current.analyzeConversation(messageObjects);
    const baseResult = analyzeText(messages.join(' '));
    
    // Add conversation energy analysis
    const conversationEnergy = determineConversationEnergy(analysis.intensity, analysis.emotions);
    
    console.log('[EmotionRecognition] Conversation analysis:', {
      emotions: analysis.emotions,
      intensity: analysis.intensity,
      conversationEnergy
    });
    
    return {
      ...baseResult,
      conversationEnergy
    };
  }, [analyzeText]);

  return {
    analyzeAndApply,
    analyzeConversation,
    analyzeText
  };
}
