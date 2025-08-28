export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ConversationState {
  messages: ChatMessage[];
  isTyping: boolean;
}
