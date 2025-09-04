import { useCallback } from 'react';
import { useLLM, LLMMessage } from './useLLM';
import { useEmotionRecognition } from './useEmotionRecognition';
import { usePersonalitySystem } from './usePersonalitySystem';
import { useSpeechManager } from './useSpeechManager';
import { useConversationState } from './useConversationState';
import { useErrorHandling } from './useErrorHandling';
import { useAudioManager } from './useAudioManager';
import { ChatMessage } from '../types/chat';
import { AudioContextManager } from '../utils/audioContextManager';
import { createLogger } from '../utils/logger';

interface ConversationManagerConfig {
  talkingHead: any;
  personalitySystem?: any; // Optional shared personality system
  onChatMessageAdd: (message: ChatMessage) => void;
  onConversationUpdate: (history: LLMMessage[]) => void;
}

export const useConversationManager = ({ talkingHead, personalitySystem: sharedPersonalitySystem, onChatMessageAdd, onConversationUpdate }: ConversationManagerConfig) => {
  const { chat } = useLLM();
  const speechManager = useSpeechManager();
  const conversationState = useConversationState();
  const errorHandling = useErrorHandling();
  const audioManager = useAudioManager();
  const logger = createLogger('ConversationManager');

  const emotionRecognition = useEmotionRecognition({
    autoApplyEmotions: true,
    autoTriggerGestures: true
  });

  const personalitySystem = sharedPersonalitySystem || usePersonalitySystem({
    defaultPersonality: 'fertility_assistant',
    autoApplyPersonality: true
  });

  const handleAsk = useCallback(async (question: string) => {
    try {
      errorHandling.setLastError(null);
      
      // Ensure AudioContext is initialized and unlocked before proceeding (important for iOS)
      await audioManager.initAudioContext();
      
      // iOS Safari TalkingHead warm-up - must happen during user gesture
      console.log('[ConversationManager] Calling warmUpForIOS...');
      await talkingHead.warmUpForIOS();
      console.log('[ConversationManager] warmUpForIOS completed');
      
      // If currently speaking, stop ongoing TTS/animation before new request
      if (speechManager.isSpeaking) {
        speechManager.stopSpeaking();
      }
      
      // Add user message to chat
      const userMessage = conversationState.addUserMessage(question);
      onChatMessageAdd(userMessage);
      
      // Analyze user input for emotion and apply to avatar
      logger.log('Analyzing user input emotion...');
      const userEmotionAnalysis = await emotionRecognition.analyzeAndApply(question, talkingHead);
      logger.log('User emotion analysis:', userEmotionAnalysis);
      
      // Prepare LLM messages
      const msgs = [...conversationState.history, { role: 'user', content: question } as LLMMessage];
      
      // Get LLM response
      const completion = await chat(msgs);
      let reply = completion || '(No response)';
      
      // Apply personality-based response modification
      const modifiedReply = personalitySystem.modifyResponse(reply, {
        // Never treat LLM responses as greetings - let them be natural
        isGreeting: false,
        needsEncouragement: userEmotionAnalysis.emotion.primaryEmotion === 'sad' || userEmotionAnalysis.sentiment === 'negative',
        needsEmpathy: ['sad', 'confused', 'angry'].includes(userEmotionAnalysis.emotion.primaryEmotion),
        userInput: question
      });
      
      reply = modifiedReply;
      
      // Analyze LLM response for appropriate avatar emotion/gestures
      console.log('[ConversationManager] Analyzing LLM response emotion...');
      const responseEmotionAnalysis = await emotionRecognition.analyzeAndApply(reply, talkingHead);
      console.log('[ConversationManager] Response emotion analysis:', responseEmotionAnalysis);
      
      // Update conversation history
      conversationState.updateConversationHistory(question, reply);
      
      // Analyze overall conversation context
      if (conversationState.conversationHistory.length > 3) {
        const conversationContext = emotionRecognition.analyzeConversation(
          conversationState.conversationHistory.slice(-6) // Last 6 messages
        );
        console.log('[ConversationManager] Conversation context:', conversationContext);
        
        // Adjust avatar mood based on conversation energy if needed
        if (conversationContext.conversationEnergy === 'high' && responseEmotionAnalysis.emotion.primaryEmotion === 'neutral') {
          console.log('[ConversationManager] Boosting emotion based on high conversation energy');
          talkingHead.setEmotion('excited', 'normal');
        }
      }
      
      // Update LLM history
      const newHistory = [...msgs, { role: 'assistant', content: reply }];
      conversationState.updateHistory(newHistory);
      onConversationUpdate(newHistory);
      
      // Add assistant message to chat
      const assistantMessage = conversationState.addAssistantMessage(reply);
      onChatMessageAdd(assistantMessage);
      
      // Use enhanced TTS with avatar lip sync and iOS support
      try {
        // Re-confirm AudioContext is available and running just before playback
        try {
          const ctx = await AudioContextManager.getInstance().getContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
        } catch (ctxErr) {
          console.warn('[ConversationManager] Warning ensuring AudioContext before playback:', ctxErr);
        }

        // Use speech manager for TTS and avatar coordination
        await speechManager.speakWithAvatar(reply, talkingHead);
        
      } catch (speechError) {
        logger.error('TTS synthesis or avatar speech failed:', speechError);
        // Still show the text response even if speech fails
      }
      
    } catch (e) {
      console.error('[ConversationManager] Error in handleAsk:', e);
      
      // Handle errors including crisis response
      const errorResult = await errorHandling.handleError(e, question, personalitySystem);
      
      if (errorResult.isCrisis && errorResult.crisisMessage) {
        // Handle crisis response
        onChatMessageAdd(errorResult.crisisMessage);
        
        // Show empathetic emotion
        talkingHead.setEmotion('sad', 'subtle');
        
        // Make the avatar speak the crisis response
        try {
          await speechManager.speakWithAvatar(errorResult.crisisMessage.text, talkingHead);
        } catch (speechError) {
          console.warn('Crisis response TTS failed, but message was delivered:', speechError);
        }
      } else {
        // Show appropriate emotion on avatar based on the situation
        const userInput = question?.toLowerCase() || '';
        const crisisKeywords = [
          'suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself', 
          'self harm', 'cut myself', 'overdose', 'jump off', 'hang myself',
          'worthless', 'hopeless', 'can\'t go on', 'better off dead', 'end it all'
        ];
        const isMentalHealthCrisis = crisisKeywords.some(keyword => userInput.includes(keyword));
        
        if (isMentalHealthCrisis) {
          talkingHead.setEmotion('sad', 'subtle'); // Show empathy and care
        } else {
          talkingHead.setEmotion('confused', 'normal');
        }
        
        // Apply personality to error message
        const personalizedError = personalitySystem.modifyResponse(
          errorHandling.lastError || 'Something went wrong. Please try again.',
          { needsEmpathy: true }
        );
        
        // Add error message to chat
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          text: personalizedError,
          isUser: false,
          timestamp: new Date()
        };
        onChatMessageAdd(errorMessage);
      }
    }
  }, [
    chat, 
    speechManager, 
    conversationState, 
    errorHandling, 
    audioManager, 
    emotionRecognition, 
    personalitySystem, 
    talkingHead,
    onChatMessageAdd,
    onConversationUpdate,
    logger
  ]);

  return {
    handleAsk,
    conversationState,
    speechManager,
    errorHandling,
    personalitySystem,
    emotionRecognition
  };
};