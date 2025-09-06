export type FeedbackState = 'none' | 'like' | 'dislike';

export type FeedbackReason = 
  | 'inaccurate'
  | 'incomplete' 
  | 'hallucination'
  | 'off-topic'
  | 'too-verbose'
  | 'too-short'
  | 'unsafe'
  | 'other';

export type SessionRating = 1 | 2 | 3 | 4 | 5;

export interface MessageFeedback {
  messageId: string;
  state: FeedbackState;
  reason?: FeedbackReason;
  note?: string;
  timestamp: string;
}

export interface SessionFeedbackData {
  rating: SessionRating;
  comment?: string;
  timestamp: string;
}

export interface GeneralFeedback {
  comment: string;
  email?: string;
  allowContact: boolean;
  timestamp: string;
}

export interface FeedbackEvent {
  type: 'response' | 'session' | 'general';
  sessionId: string;
  conversationId?: string;
  messageId?: string;
  data: MessageFeedback | SessionFeedbackData | GeneralFeedback;
  feedbackEventId: string;
}