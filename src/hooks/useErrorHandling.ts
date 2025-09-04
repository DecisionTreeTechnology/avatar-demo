import { useState, useCallback } from 'react';
import { ChatMessage } from '../types/chat';

interface ErrorHandlingState {
  lastError: string | null;
  setLastError: (error: string | null) => void;
  handleError: (error: any, userInput: string, personalitySystem: any) => Promise<{ isCrisis: boolean; crisisMessage?: ChatMessage }>;
}

export const useErrorHandling = (): ErrorHandlingState => {
  const [lastError, setLastError] = useState<string | null>(null);

  const handleError = useCallback(async (error: any, userInput: string, personalitySystem: any): Promise<{ isCrisis: boolean; crisisMessage?: ChatMessage }> => {
    console.error('[ErrorHandling] Error occurred:', error);
    
    // Parse and provide user-friendly error messages
    let userFriendlyError = 'Something went wrong. Please try again.';
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // Handle content policy errors with special consideration for mental health crisis situations
      if (errorMessage.includes('content management policy') || 
          errorMessage.includes('responsibleaipolicyviolation') ||
          errorMessage.includes('filtered') ||
          (error.message.includes('400') && error.message.includes('error'))) {
        
        // Check if this might be a mental health crisis situation by looking at the original user question
        const userInputLower = userInput?.toLowerCase() || '';
        const crisisKeywords = [
          'suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself', 
          'self harm', 'cut myself', 'overdose', 'jump off', 'hang myself',
          'worthless', 'hopeless', 'can\'t go on', 'better off dead', 'end it all'
        ];
        
        const isMentalHealthCrisis = crisisKeywords.some(keyword => userInputLower.includes(keyword));
        
        if (isMentalHealthCrisis) {
          // Instead of showing this as an error, create a proper chat response
          const crisisResponse = `I hear that you're going through an incredibly difficult time right now, and I want you to know that your feelings are valid. While I have some limitations in how I can respond to certain topics, please know that you're not alone and there is help available.

If you're having thoughts of suicide or self-harm, please reach out for immediate support:
• National Suicide Prevention Lifeline: 988 or 1-800-273-8255
• Crisis Text Line: Text HOME to 741741
• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

Your life has value, and there are people who want to help you through this difficult time. Would you like to talk about what's been making you feel this way, or how we might find some support resources together?`;

          // Apply personality to the crisis response
          const personalizedCrisisResponse = personalitySystem.modifyResponse(
            crisisResponse,
            { needsEmpathy: true, isGreeting: false }
          );

          // Create crisis response as a chat message
          const crisisMessage: ChatMessage = {
            id: `crisis-${Date.now()}`,
            text: personalizedCrisisResponse,
            isUser: false,
            timestamp: new Date()
          };

          // Clear the error and don't show it as an error message
          setLastError(null);
          
          return { isCrisis: true, crisisMessage };
        } else {
          userFriendlyError = "I'm sorry, but I can't respond to that request due to content guidelines. Please try rephrasing your question or asking something else.";
        }
      }
      // Handle rate limiting
      else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        userFriendlyError = "I'm receiving too many requests right now. Please wait a moment and try again.";
      }
      // Handle network/connection errors
      else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
        userFriendlyError = "I'm having trouble connecting right now. Please check your internet connection and try again.";
      }
      // Handle authentication errors
      else if (errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
        userFriendlyError = "There seems to be an authentication issue. Please refresh the page and try again.";
      }
      // For other specific errors, show a generic message without exposing technical details
      else if (errorMessage.includes('error') && error.message.length > 100) {
        userFriendlyError = "I encountered an unexpected issue. Please try asking your question differently.";
      }
      // For short, clear errors, show them as-is
      else if (error.message.length < 100 && !error.message.includes('{')) {
        userFriendlyError = error.message;
      }
    }
    
    // Apply personality to error message (future feature)
    // const personalizedError = personalitySystem.modifyResponse(
    //   userFriendlyError,
    //   { needsEmpathy: true }
    // );

    setLastError(userFriendlyError);
    
    return { isCrisis: false };
  }, []);

  // Crisis input detection (currently handled by ConversationManager)
  // const isCrisisInput = useCallback((userInput: string): boolean => {
  //   const userInputLower = userInput?.toLowerCase() || '';
  //   const crisisKeywords = [
  //     'suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself', 
  //     'self harm', 'cut myself', 'overdose', 'jump off', 'hang myself',
  //     'worthless', 'hopeless', 'can\'t go on', 'better off dead', 'end it all'
  //   ];
  //   
  //   return crisisKeywords.some(keyword => userInputLower.includes(keyword));
  // }, []);

  return {
    lastError,
    setLastError,
    handleError
  };
};