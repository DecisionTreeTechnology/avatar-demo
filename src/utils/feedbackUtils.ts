import { FeedbackEvent, MessageFeedback, SessionFeedbackData, GeneralFeedback } from '../types/feedback';

export const generateSessionId = (): string => {
  const existing = localStorage.getItem('eva_session_id');
  if (existing) return existing;
  
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  localStorage.setItem('eva_session_id', sessionId);
  return sessionId;
};

export const generateFeedbackEventId = (sessionId: string, messageId?: string): string => {
  const base = `${sessionId}_${messageId || 'session'}_${Date.now()}`;
  return btoa(base).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

export const createMessageFeedbackEvent = (
  messageId: string,
  feedback: MessageFeedback,
  sessionId: string,
  conversationId?: string
): FeedbackEvent => ({
  type: 'response',
  sessionId,
  conversationId,
  messageId,
  data: feedback,
  feedbackEventId: generateFeedbackEventId(sessionId, messageId)
});

export const createSessionFeedbackEvent = (
  feedback: SessionFeedbackData,
  sessionId: string,
  conversationId?: string
): FeedbackEvent => ({
  type: 'session',
  sessionId,
  conversationId,
  data: feedback,
  feedbackEventId: generateFeedbackEventId(sessionId)
});

export const createGeneralFeedbackEvent = (
  feedback: GeneralFeedback,
  sessionId: string
): FeedbackEvent => ({
  type: 'general',
  sessionId,
  data: feedback,
  feedbackEventId: generateFeedbackEventId(sessionId)
});

export const sanitizeFeedbackText = (text: string): { sanitized: string; containsPII: boolean } => {
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email (except in feedback form)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
  ];

  let sanitized = text;
  let containsPII = false;

  piiPatterns.forEach(pattern => {
    if (pattern.test(text)) {
      containsPII = true;
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
  });

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }

  return { sanitized, containsPII };
};