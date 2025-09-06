import { useState, useCallback } from 'react';
import { FeedbackState, FeedbackReason, SessionRating, MessageFeedback, SessionFeedbackData, GeneralFeedback } from '../types/feedback';
import { generateSessionId, createMessageFeedbackEvent, createSessionFeedbackEvent, createGeneralFeedbackEvent, sanitizeFeedbackText } from '../utils/feedbackUtils';
import { trackFeedbackEvent } from '../utils/analytics';
import { ToastMessage } from '../components/Toast';

export interface UseFeedbackReturn {
  sessionId: string;
  conversationId?: string;
  showRatingWidget: boolean;
  messageFeedback: Record<string, FeedbackState>;
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  setConversationId: (id: string) => void;
  setShowRatingWidget: (show: boolean) => void;
  submitMessageFeedback: (messageId: string, state: FeedbackState, reason?: FeedbackReason, note?: string) => void;
  submitSessionFeedback: (rating: SessionRating, comment?: string) => void;
  submitGeneralFeedback: (comment: string, email?: string, allowContact?: boolean) => void;
}

export const useFeedback = (): UseFeedbackReturn => {
  const [sessionId] = useState(() => generateSessionId());
  const [conversationId, setConversationId] = useState<string>();
  const [showRatingWidget, setShowRatingWidget] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, FeedbackState>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'success', duration = 3000) => {
    const toast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      duration
    };
    setToasts(prev => [...prev, toast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const submitMessageFeedback = useCallback((
    messageId: string, 
    state: FeedbackState, 
    reason?: FeedbackReason, 
    note?: string
  ) => {
    // Update local state
    setMessageFeedback(prev => ({ ...prev, [messageId]: state }));

    // Create feedback data
    const feedbackData: MessageFeedback = {
      messageId,
      state,
      reason,
      note: note ? sanitizeFeedbackText(note).sanitized : undefined,
      timestamp: new Date().toISOString()
    };

    // Create and track event
    const event = createMessageFeedbackEvent(messageId, feedbackData, sessionId, conversationId);
    trackFeedbackEvent(event);

    // Show confirmation toast
    if (state === 'like') {
      addToast('Thanks for your feedback 💜');
    } else if (state === 'dislike') {
      addToast('Thanks for helping us improve 💜');
    }
  }, [sessionId, conversationId, addToast]);

  const submitSessionFeedback = useCallback((rating: SessionRating, comment?: string) => {
    // Create feedback data
    const feedbackData: SessionFeedbackData = {
      rating,
      comment: comment ? sanitizeFeedbackText(comment).sanitized : undefined,
      timestamp: new Date().toISOString()
    };

    // Create and track event
    const event = createSessionFeedbackEvent(feedbackData, sessionId, conversationId);
    trackFeedbackEvent(event);

    // Hide rating widget
    setShowRatingWidget(false);

    // Show confirmation toast
    addToast('Thanks for rating this conversation 💜');
  }, [sessionId, conversationId, addToast]);

  const submitGeneralFeedback = useCallback((comment: string, email?: string, allowContact = false) => {
    // Create feedback data
    const feedbackData: GeneralFeedback = {
      comment: sanitizeFeedbackText(comment).sanitized,
      email: email && allowContact ? email : undefined,
      allowContact: allowContact && !!email,
      timestamp: new Date().toISOString()
    };

    // Create and track event
    const event = createGeneralFeedbackEvent(feedbackData, sessionId);
    trackFeedbackEvent(event);

    // Show confirmation toast
    addToast('Thank you for your feedback 💜');
  }, [sessionId, addToast]);

  return {
    sessionId,
    conversationId,
    showRatingWidget,
    messageFeedback,
    toasts,
    addToast,
    removeToast,
    setConversationId,
    setShowRatingWidget,
    submitMessageFeedback,
    submitSessionFeedback,
    submitGeneralFeedback
  };
};