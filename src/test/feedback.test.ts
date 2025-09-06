import { describe, it, expect } from 'vitest';
import { generateSessionId, generateFeedbackEventId, createMessageFeedbackEvent, sanitizeFeedbackText } from '../utils/feedbackUtils';
import { FeedbackState, MessageFeedback } from '../types/feedback';

describe('Feedback Utils', () => {
  describe('generateSessionId', () => {
    it('should generate a session ID', () => {
      // Clear localStorage first
      localStorage.clear();
      
      const sessionId = generateSessionId();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should return same session ID on subsequent calls', () => {
      localStorage.clear();
      
      const sessionId1 = generateSessionId();
      const sessionId2 = generateSessionId();
      expect(sessionId1).toBe(sessionId2);
    });
  });

  describe('generateFeedbackEventId', () => {
    it('should generate valid event IDs', () => {
      const sessionId = 'test-session';
      const messageId = 'test-message';
      
      const eventId = generateFeedbackEventId(sessionId, messageId);
      
      expect(eventId).toBeTruthy();
      expect(eventId).toMatch(/^[a-zA-Z0-9]+$/);
      expect(eventId.length).toBeLessThanOrEqual(32);
    });
  });

  describe('createMessageFeedbackEvent', () => {
    it('should create a valid message feedback event', () => {
      const messageId = 'test-message';
      const feedback: MessageFeedback = {
        messageId,
        state: 'like' as FeedbackState,
        timestamp: new Date().toISOString()
      };
      const sessionId = 'test-session';
      const conversationId = 'test-conversation';

      const event = createMessageFeedbackEvent(messageId, feedback, sessionId, conversationId);

      expect(event.type).toBe('response');
      expect(event.messageId).toBe(messageId);
      expect(event.sessionId).toBe(sessionId);
      expect(event.conversationId).toBe(conversationId);
      expect(event.data).toBe(feedback);
      expect(event.feedbackEventId).toBeTruthy();
    });
  });

  describe('sanitizeFeedbackText', () => {
    it('should leave normal text unchanged', () => {
      const text = 'This is normal feedback text.';
      const result = sanitizeFeedbackText(text);
      
      expect(result.sanitized).toBe(text);
      expect(result.containsPII).toBe(false);
    });

    it('should redact email addresses', () => {
      const text = 'Contact me at user@example.com for more info.';
      const result = sanitizeFeedbackText(text);
      
      expect(result.sanitized).toBe('Contact me at [REDACTED] for more info.');
      expect(result.containsPII).toBe(true);
    });

    it('should redact phone numbers', () => {
      const text = 'Call me at 555-123-4567.';
      const result = sanitizeFeedbackText(text);
      
      expect(result.sanitized).toBe('Call me at [REDACTED].');
      expect(result.containsPII).toBe(true);
    });

    it('should truncate long text', () => {
      const text = 'a'.repeat(300);
      const result = sanitizeFeedbackText(text);
      
      expect(result.sanitized).toBe('a'.repeat(197) + '...');
      expect(result.sanitized.length).toBe(200);
    });

    it('should handle multiple PII types', () => {
      const text = 'Email me at test@example.com or call 555-123-4567.';
      const result = sanitizeFeedbackText(text);
      
      expect(result.sanitized).toBe('Email me at [REDACTED] or call [REDACTED].');
      expect(result.containsPII).toBe(true);
    });
  });
});

describe('Feedback Types', () => {
  it('should have correct feedback state values', () => {
    const states: FeedbackState[] = ['none', 'like', 'dislike'];
    expect(states).toHaveLength(3);
  });
});