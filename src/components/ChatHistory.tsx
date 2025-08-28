
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types/chat';

interface ChatHistoryProps {
  messages: ChatMessage[];
  onQuickAction?: (message: string) => void;
  disabled?: boolean;
  isTyping?: boolean;
  hideWelcome?: boolean; // Hide the welcome message when greeting is being prepared
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  messages, 
  onQuickAction,
  disabled = false,
  isTyping = false,
  hideWelcome = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(false); // Start with false
  const [showDelayedQuickActions, setShowDelayedQuickActions] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[ChatHistory] Received messages:', messages.length, messages.map(m => ({ id: m.id, text: m.text.substring(0, 50) + '...', isUser: m.isUser })));
  }, [messages]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show quick actions after greeting appears (with delay)
  useEffect(() => {
    const hasUserMessages = messages.some(msg => msg.isUser);
    const hasAssistantMessages = messages.some(msg => !msg.isUser);
    
    console.log('[ChatHistory] Quick actions logic:', { hasUserMessages, hasAssistantMessages, showDelayedQuickActions, showQuickActions });
    
    // Hide quick actions after first user message
    if (hasUserMessages) {
      console.log('[ChatHistory] Hiding quick actions - user has sent messages');
      setShowQuickActions(false);
      setShowDelayedQuickActions(false);
    } 
    // Show quick actions with delay after greeting appears
    else if (hasAssistantMessages && !showDelayedQuickActions) {
      console.log('[ChatHistory] Scheduling quick actions to appear in 2 seconds');
      const timer = setTimeout(() => {
        console.log('[ChatHistory] Showing quick actions now');
        setShowDelayedQuickActions(true);
        setShowQuickActions(true);
      }, 2000); // 2 second delay after greeting
      
      return () => {
        console.log('[ChatHistory] Clearing quick actions timer');
        clearTimeout(timer);
      };
    }
    // Show immediately if no messages at all
    else if (!hasAssistantMessages && !hasUserMessages) {
      console.log('[ChatHistory] Showing quick actions immediately - no messages');
      setShowQuickActions(true);
    }
  }, [messages, showDelayedQuickActions]);

  // Only show 3 random quick actions to save space
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

  // Randomly select 3 quick actions
  const selectedQuickActions = React.useMemo(() => {
    const shuffled = [...quickActions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, []);

  return (
    <div className="w-full h-full" data-testid="chat-history">
      {/* Absolute positioned scroll container - leave space for toolbar */}
      <div className="absolute inset-x-0 top-0 bottom-0 overflow-y-auto p-6 space-y-6 chat-history-scroll">
        <div ref={scrollRef} className="w-full">
        {/* Welcome message when no conversation - only show if no messages at all */}
        {messages.length === 0 && !hideWelcome && (
          <div className="text-center py-1">
            <div className="mb-1">
              <div className="w-10 h-10 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-2">
                <span className="text-lg">💝</span>
              </div>
              <h3 className="text-sm font-medium text-white/90 mb-1">
                Hi! I'm here to support you
              </h3>
              <p className="text-xs text-white/60 leading-tight">
                I'm your caring fertility assistant. I'm here to listen, provide support, and help you through your journey with empathy and understanding.
              </p>
            </div>
          </div>
        )}

        {/* Quick action starters - show when appropriate, independent of welcome message */}
        {showQuickActions && (
          <div className="text-center py-1">
            <div className="text-xs text-purple-300 mb-1">💝 How can I help you today?</div>
            <div className="space-y-1">
              {selectedQuickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => onQuickAction?.(action.message)}
                  disabled={disabled}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-purple-900/30 hover:bg-purple-800/40 border border-purple-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="text-sm">{action.emoji}</span>
                  <span className="flex-1 text-purple-200 leading-tight">{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex mb-8 ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                message.isUser
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-white/10 text-white/90 border border-white/10'
              }`}
            >
              <div className="text-sm leading-relaxed">{message.text}</div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start mb-8">
            <div className="bg-white/10 text-white/90 border border-white/10 rounded-2xl px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                <span className="text-xs text-white/60">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Show quick actions again after longer conversations when user might need more support */}
        {messages.length > 0 && messages.length >= 8 && messages.length % 8 === 0 && (
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="text-xs text-purple-300 mb-2 text-center">💝 Need more support?</div>
            <div className="grid grid-cols-1 gap-2">
              {selectedQuickActions.slice(0, 2).map((action, index) => (
                <button
                  key={`repeat-${index}`}
                  onClick={() => onQuickAction?.(action.message)}
                  disabled={disabled}
                  className="flex items-center gap-2 p-2 text-xs bg-purple-900/20 hover:bg-purple-800/30 border border-purple-600/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <span className="text-sm">{action.emoji}</span>
                  <span className="flex-1 text-purple-200">{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
