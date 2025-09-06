import React, { useState } from 'react';
import { FeedbackState, FeedbackReason } from '../types/feedback';

interface MessageFeedbackProps {
  messageId: string;
  currentFeedback: FeedbackState;
  onFeedbackChange: (messageId: string, state: FeedbackState, reason?: FeedbackReason, note?: string) => void;
  disabled?: boolean;
}

const FEEDBACK_REASONS: { value: FeedbackReason; label: string }[] = [
  { value: 'inaccurate', label: 'Inaccurate information' },
  { value: 'incomplete', label: 'Incomplete response' },
  { value: 'hallucination', label: 'Made up information' },
  { value: 'off-topic', label: 'Off-topic response' },
  { value: 'too-verbose', label: 'Too verbose/long' },
  { value: 'too-short', label: 'Too brief/short' },
  { value: 'unsafe', label: 'Unsafe/harmful content' },
  { value: 'other', label: 'Other' }
];

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  currentFeedback,
  onFeedbackChange,
  disabled = false
}) => {
  const [showDislikePanel, setShowDislikePanel] = useState(false);
  const [reason, setReason] = useState<FeedbackReason>('inaccurate');
  const [note, setNote] = useState('');

  const handleLike = () => {
    const newState = currentFeedback === 'like' ? 'none' : 'like';
    onFeedbackChange(messageId, newState);
    setShowDislikePanel(false);
  };

  const handleDislike = () => {
    if (currentFeedback === 'dislike') {
      // Toggle back to none
      onFeedbackChange(messageId, 'none');
      setShowDislikePanel(false);
    } else {
      // Show dislike panel
      setShowDislikePanel(true);
    }
  };

  const handleSubmitDislike = () => {
    onFeedbackChange(messageId, 'dislike', reason, note.trim() || undefined);
    setShowDislikePanel(false);
    setNote('');
  };

  const handleCancel = () => {
    setShowDislikePanel(false);
    setNote('');
  };

  return (
    <div className="mt-2">
      {/* Thumbs up/down buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleLike}
          disabled={disabled}
          className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            currentFeedback === 'like'
              ? 'bg-green-500/20 text-green-400'
              : 'text-white/40 hover:text-green-400 hover:bg-green-500/10'
          }`}
          title="Helpful response"
          data-testid={`like-${messageId}`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>

        <button
          onClick={handleDislike}
          disabled={disabled}
          className={`p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            currentFeedback === 'dislike'
              ? 'bg-red-500/20 text-red-400'
              : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
          }`}
          title="Not helpful"
          data-testid={`dislike-${messageId}`}
        >
          <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
          </svg>
        </button>
      </div>

      {/* Dislike feedback panel */}
      {showDislikePanel && (
        <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg" data-testid={`dislike-panel-${messageId}`}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                What went wrong?
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as FeedbackReason)}
                className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white/90 focus:outline-none focus:ring-1 focus:ring-purple-500"
                data-testid={`reason-select-${messageId}`}
              >
                {FEEDBACK_REASONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-gray-800">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/80 mb-1">
                Additional notes (optional, max 200 chars)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="Tell us more about the issue..."
                rows={2}
                className="w-full px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-white/90 placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                data-testid={`feedback-note-${messageId}`}
              />
              <div className="text-xs text-white/50 mt-1">
                {note.length}/200
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmitDislike}
                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                data-testid={`submit-dislike-${messageId}`}
              >
                Submit
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors"
                data-testid={`cancel-dislike-${messageId}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};