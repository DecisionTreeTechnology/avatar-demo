import { useCallback, useRef } from 'react';
import { EmotionRecognitionEngine, TextAnalysisResult } from '../utils/emotionRecognition';
import { UseTalkingHeadResult } from './useTalkingHead';

export interface UseEmotionRecognitionOptions {
  autoApplyEmotions?: boolean;
  autoTriggerGestures?: boolean;
  conversationHistory?: string[];
}

export interface UseEmotionRecognitionResult {
  analyzeText: (text: string) => TextAnalysisResult;
  analyzeAndApply: (text: string, avatar: UseTalkingHeadResult) => Promise<TextAnalysisResult>;
  analyzeConversation: (messages: string[]) => {
    emotionTrend: import('../utils/avatarAnimationManager').EmotionType[];
    overallMood: import('../utils/avatarAnimationManager').EmotionType;
    conversationEnergy: 'low' | 'medium' | 'high';
  };
  getEmotionSuggestions: (text: string) => {
    emotion: import('../utils/avatarAnimationManager').EmotionType;
    gestures: import('../utils/avatarAnimationManager').GestureType[];
    confidence: number;
  };
}

export function useEmotionRecognition(options: UseEmotionRecognitionOptions = {}): UseEmotionRecognitionResult {
  const { autoApplyEmotions = true, autoTriggerGestures = true } = options;
  const engineRef = useRef<EmotionRecognitionEngine>(new EmotionRecognitionEngine());

  const analyzeText = useCallback((text: string): TextAnalysisResult => {
    return engineRef.current.analyzeText(text);
  }, []);

  const analyzeAndApply = useCallback(async (text: string, avatar: UseTalkingHeadResult): Promise<TextAnalysisResult> => {
    const analysis = engineRef.current.analyzeText(text);
    
    console.log('[EmotionRecognition] Analysis result:', {
      emotion: analysis.emotion.primaryEmotion,
      confidence: analysis.emotion.confidence,
      gestures: analysis.emotion.suggestedGestures,
      sentiment: analysis.sentiment
    });

    if (avatar.isReady && autoApplyEmotions) {
      try {
        // Apply the detected emotion
        avatar.setEmotion(analysis.emotion.primaryEmotion, analysis.emotion.intensity);
        
        // Trigger suggested gestures if enabled
        if (autoTriggerGestures && analysis.emotion.suggestedGestures.length > 0) {
          // Delay gesture slightly to allow emotion to apply first
          setTimeout(async () => {
            for (const gesture of analysis.emotion.suggestedGestures) {
              try {
                await avatar.performGesture(gesture);
                // Small delay between multiple gestures
                if (analysis.emotion.suggestedGestures.length > 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              } catch (error) {
                console.error(`[EmotionRecognition] Failed to perform gesture ${gesture}:`, error);
              }
            }
          }, 200);
        }
      } catch (error) {
        console.error('[EmotionRecognition] Failed to apply emotion/gestures:', error);
      }
    }

    return analysis;
  }, [autoApplyEmotions, autoTriggerGestures]);

  const analyzeConversation = useCallback((messages: string[]) => {
    return engineRef.current.analyzeConversationContext(messages);
  }, []);

  const getEmotionSuggestions = useCallback((text: string) => {
    const analysis = engineRef.current.analyzeText(text);
    return {
      emotion: analysis.emotion.primaryEmotion,
      gestures: analysis.emotion.suggestedGestures,
      confidence: analysis.emotion.confidence
    };
  }, []);

  return {
    analyzeText,
    analyzeAndApply,
    analyzeConversation,
    getEmotionSuggestions
  };
}
