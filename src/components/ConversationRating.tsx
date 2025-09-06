import React, { useState } from 'react';
import { SessionRating } from '../types/feedback';

interface ConversationRatingProps {
  onSubmit: (rating: SessionRating, comment?: string) => void;
  onDismiss: () => void;
  disabled?: boolean;
}

export const ConversationRating: React.FC<ConversationRatingProps> = ({
  onSubmit,
  onDismiss,
  disabled = false
}) => {
  const [rating, setRating] = useState<SessionRating | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  const handleRatingClick = (selectedRating: SessionRating) => {
    setRating(selectedRating);
    setShowComment(true);
  };

  const handleSubmit = () => {
    if (rating) {
      onSubmit(rating, comment.trim() || undefined);
    }
  };

  const stars = [1, 2, 3, 4, 5] as const;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm" data-testid="conversation-rating">
      <div className="text-center">
        <h3 className="text-sm font-medium text-white/90 mb-2">
          How helpful was Eva today?
        </h3>
        
        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-3">
          {stars.map((star) => (
            <button
              key={star}
              onClick={() => handleRatingClick(star)}
              disabled={disabled}
              className={`p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                rating && star <= rating
                  ? 'text-yellow-400'
                  : 'text-white/30 hover:text-yellow-400'
              }`}
              title={`${star} star${star > 1 ? 's' : ''}`}
              data-testid={`star-${star}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Comment section */}
        {showComment && (
          <div className="space-y-3">
            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                placeholder="Tell us how we can improve (optional)"
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded text-white/90 placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                data-testid="rating-comment"
              />
              <div className="text-xs text-white/50 mt-1">
                {comment.length}/200
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSubmit}
                disabled={!rating || disabled}
                className="px-4 py-2 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded transition-colors disabled:cursor-not-allowed"
                data-testid="submit-rating"
              >
                Submit
              </button>
              <button
                onClick={onDismiss}
                disabled={disabled}
                className="px-4 py-2 text-xs bg-white/10 hover:bg-white/20 text-white/80 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="dismiss-rating"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Initial skip button */}
        {!showComment && (
          <button
            onClick={onDismiss}
            disabled={disabled}
            className="text-xs text-white/60 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="skip-rating"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};