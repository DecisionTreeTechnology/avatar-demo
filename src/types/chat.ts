import { FeedbackState } from './feedback';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  feedback?: FeedbackState;
}

export interface ConversationState {
  messages: ChatMessage[];
  isTyping: boolean;
}
