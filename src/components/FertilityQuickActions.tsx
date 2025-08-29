import React from 'react';

interface FertilityQuickActionsProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onInteraction?: () => Promise<void> | void;
}

export const FertilityQuickActions: React.FC<FertilityQuickActionsProps> = ({
  onSend,
  disabled = false,
  onInteraction
}) => {
  const quickActions = [
    {
      emoji: "💭",
      text: "I'm feeling overwhelmed",
      message: "I'm feeling really overwhelmed with everything related to my fertility journey right now."
    },
    {
      emoji: "⏰",
      text: "Two week wait",
      message: "I'm in my two week wait and it's really hard to stay positive and not overthink everything."
    },
    {
      emoji: "💝",
      text: "Need encouragement",
      message: "I could really use some encouragement and support today. This journey feels so difficult."
    },
    {
      emoji: "🤗",
      text: "Share good news",
      message: "I have some good news to share about my fertility journey and I'm feeling hopeful!"
    },
    {
      emoji: "❓",
      text: "Ask about stress",
      message: "How can I better manage stress and anxiety during my fertility treatment?"
    },
    {
      emoji: "💪",
      text: "Self-care tips",
      message: "What are some good self-care practices I can do while trying to conceive?"
    }
  ];

  const handleQuickAction = async (message: string) => {
    // Initialize audio context on user interaction (important for iOS)
    if (onInteraction) {
      await onInteraction();
    }
    
    // Send the message
    onSend(message);
  };

  return (
    <div className="mb-3">
      <div className="text-xs text-gray-400 mb-2">💝 Quick Support Options:</div>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickAction(action.message)}
            disabled={disabled}
            className="flex items-center gap-2 p-2 text-xs bg-purple-900/30 hover:bg-purple-800/40 border border-purple-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <span className="text-sm">{action.emoji}</span>
            <span className="flex-1 text-purple-200">{action.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
