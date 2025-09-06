import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string, email?: string, allowContact?: boolean) => void;
  disabled?: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  disabled = false
}) => {
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [allowContact, setAllowContact] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      onSubmit(
        comment.trim(),
        email.trim() || undefined,
        allowContact && !!email.trim()
      );
      // Reset form
      setComment('');
      setEmail('');
      setAllowContact(false);
    }
  };

  const handleClose = () => {
    setComment('');
    setEmail('');
    setAllowContact(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" data-testid="feedback-modal">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Share Feedback</h2>
          <button
            onClick={handleClose}
            disabled={disabled}
            className="text-white/60 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="close-feedback-modal"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-comment" className="block text-sm font-medium text-white/80 mb-2">
              Tell us about your experience
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder="What's working well? What could be improved? Any suggestions?"
              rows={4}
              required
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded text-white/90 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              data-testid="feedback-comment"
            />
            <div className="text-xs text-white/50 mt-1">
              {comment.length}/500
            </div>
          </div>

          <div>
            <label htmlFor="feedback-email" className="block text-sm font-medium text-white/80 mb-2">
              Email (optional)
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded text-white/90 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              data-testid="feedback-email"
            />
          </div>

          {email.trim() && (
            <div className="flex items-start gap-2">
              <input
                id="allow-contact"
                type="checkbox"
                checked={allowContact}
                onChange={(e) => setAllowContact(e.target.checked)}
                className="mt-1 text-purple-600 bg-white/10 border-white/30 rounded focus:ring-purple-500"
                data-testid="allow-contact"
              />
              <label htmlFor="allow-contact" className="text-sm text-white/80 leading-tight">
                I agree to be contacted about my feedback
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!comment.trim() || disabled}
              className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded transition-colors disabled:cursor-not-allowed"
              data-testid="submit-feedback"
            >
              Send Feedback
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={disabled}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="cancel-feedback"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-white/50 leading-tight">
          Your feedback helps us improve Eva's responses and better support your fertility journey. 
          All feedback is collected anonymously unless you provide your email.
        </div>
      </div>
    </div>
  );
};