import { useState } from 'react';
import { LLMMessage } from './useLLM';
import { ChatMessage } from '../types/chat';

interface ConversationState {
  history: LLMMessage[];
  chatMessages: ChatMessage[];
  conversationHistory: string[];
  addUserMessage: (text: string) => ChatMessage;
  addAssistantMessage: (text: string) => ChatMessage;
  updateHistory: (messages: LLMMessage[]) => void;
  updateConversationHistory: (userText: string, assistantText: string) => void;
}

export const useConversationState = (): ConversationState => {
  // Initial system message for fertility assistant personality
  const [history, setHistory] = useState<LLMMessage[]>([{ 
    role: 'system', 
    content: 'You are a caring, supportive, kind, and empathetic fertility assistant. Your primary role is to provide emotional support, encouragement, and helpful information for people on their fertility journey. Always respond with warmth, understanding, and compassion.' 
  }]);

  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const addUserMessage = (text: string): ChatMessage => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    return userMessage;
  };

  const addAssistantMessage = (text: string): ChatMessage => {
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      text,
      isUser: false,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, assistantMessage]);
    return assistantMessage;
  };

  const updateHistory = (messages: LLMMessage[]) => {
    setHistory(messages);
  };

  const updateConversationHistory = (userText: string, assistantText: string) => {
    setConversationHistory(prev => [...prev, userText, assistantText]);
  };

  return {
    history,
    chatMessages,
    conversationHistory,
    addUserMessage,
    addAssistantMessage,
    updateHistory,
    updateConversationHistory
  };
};