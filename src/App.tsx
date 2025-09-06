import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from './components/AppShell';
import { EnhancedChatBar, EnhancedChatBarRef } from './components/EnhancedChatBar';
import { ChatHistory } from './components/ChatHistory';
import { AvatarContainer } from './components/AvatarContainer';
import { ErrorDisplay } from './components/ErrorDisplay';
import { IOSWarning } from './components/IOSWarning';
import { SettingsModal } from './components/SettingsModal';

import { useLLM } from './hooks/useLLM';
import { useTalkingHead } from './hooks/useTalkingHead';
import { useConversationManager } from './hooks/useConversationManager';
import { useAudioManager } from './hooks/useAudioManager';
import { usePersonalitySystem } from './hooks/usePersonalitySystem';
import { useFeedback } from './hooks/useFeedback';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { ChatMessage } from './types/chat';
import { isTestMode } from './utils/testUtils';
import { FeedbackModal } from './components/FeedbackModal';
import { ToastContainer } from './components/Toast';

export const App: React.FC = () => {
  const { loading: llmLoading } = useLLM();
  
  // Initialize personality system early to get avatar URL
  const personalitySystem = usePersonalitySystem({
    defaultPersonality: 'fertility_assistant',
    autoApplyPersonality: true
  });
  
  // Use personality-based avatar URL
  const talkingHead = useTalkingHead({
    avatarUrl: personalitySystem.personalityTraits.avatarUrl
  });
  
  const audioManager = useAudioManager();
  
  // Feedback system
  const feedback = useFeedback();
  
  // Layout management
  const layout = useResponsiveLayout();
  
  // Local state for UI
  const [isAsking, setIsAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const chatBarRef = useRef<EnhancedChatBarRef>(null);

  // Test mode: simulate ready state for faster testing
  const isTestModeActive = isTestMode();
  const avatarReady = isTestModeActive || talkingHead.isReady;
  const avatarError = isTestModeActive ? null : talkingHead.error;

  // Set up conversation manager with shared personality system
  const conversationManager = useConversationManager({
    talkingHead,
    personalitySystem, // Pass the shared personality system
    onChatMessageAdd: (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
      // Show rating widget after 3+ Eva messages
      if (!message.isUser && chatMessages.filter(m => !m.isUser).length >= 2) {
        feedback.setShowRatingWidget(true);
      }
    },
    onConversationUpdate: () => {
      // History is managed by conversation manager
    }
  });

  // Note: conversationId is managed internally by the feedback system
  // Each session gets a unique ID for correlation in analytics

  // Combined speaking state - use speech manager state or TalkingHead's state
  const isCurrentlySpeaking = conversationManager.speechManager.isSpeaking || talkingHead.isSpeaking;

  // Busy should reflect processing/synthesis, but not block UI during playback
  const busy = isAsking || llmLoading || (conversationManager.speechManager.isSpeaking && !isTestModeActive);

  // Apply personality and scene to avatar when ready
  useEffect(() => {
    if (avatarReady && !isTestModeActive) {
      personalitySystem.applyPersonalityToAvatar(talkingHead);
      
      // Apply scene background to avatar container
      if (talkingHead.containerRef.current) {
        personalitySystem.applySceneToAvatar(talkingHead.containerRef.current);
      }
      
      // Automatic greeting disabled for production
      // Users can interact naturally without forced greeting
    }
  }, [avatarReady, isTestModeActive, personalitySystem, talkingHead]);

  const enableMicrophone = useCallback(() => {
    chatBarRef.current?.enableAfterTTS();
  }, []);

  const handleAsk = useCallback(async (question: string) => {
    setIsAsking(true);
    try {
      await conversationManager.handleAsk(question);
    } finally {
      setIsAsking(false);
    }
  }, [conversationManager]);

  return (
    <AppShell
      sidebarOpen={layout.sidebarOpen}
      onToggleSidebar={layout.toggleSidebar}
      onCloseSidebar={layout.closeSidebar}
      isMobile={layout.isMobile}
      onOpenFeedback={() => setShowFeedbackModal(true)}
      onToggleSettings={() => setShowSettingsModal(true)}
    >
      <div className="mobile-viewport flex flex-col landscape:flex-row landscape:h-full h-full">
        {/* Avatar Section - Fills ALL available space not taken by chat panel */}
        <AvatarContainer
          talkingHead={talkingHead}
          personalitySystem={personalitySystem}
          avatarReady={avatarReady}
          avatarError={avatarError}
        />
        
        {/* iOS Chrome Warning */}
        <IOSWarning
          show={audioManager.showIOSWarning}
          onDismiss={() => audioManager.setShowIOSWarning(false)}
        />

        {/* Chat Interface - Fixed at bottom with proper mobile safe areas */}
        <div className="mobile-bottom-panel">
          <div className="p-4 pb-safe landscape:p-3 landscape:pb-3 landscape:h-full landscape:flex landscape:flex-col h-full flex flex-col">
            <div className="glass rounded-2xl max-w-2xl mx-auto landscape:max-w-full landscape:mx-0 landscape:flex-1 landscape:flex landscape:flex-col landscape:min-h-0 flex-1 flex flex-col portrait:min-h-[50vh] portrait:max-h-[75vh] gap-0 h-full">
              {/* Welcome message when avatar is loading */}
              {!avatarReady && !avatarError && (
                <div className="p-4 bg-purple-900/20 border border-purple-600/30 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-caring-pulse">
                      <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-purple-200">Your caring assistant is preparing</h4>
                      <p className="text-xs mt-1 text-purple-300/80">
                        Setting up personalized fertility support just for you...
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Display */}
              <ErrorDisplay
                lastError={conversationManager.errorHandling.lastError}
                onDismiss={() => conversationManager.errorHandling.setLastError(null)}
              />

              {/* Chat History - Takes up remaining space above input */}
              <div className="flex-1 min-h-0 max-h-full overflow-hidden relative">
                <ChatHistory 
                  messages={chatMessages}
                  onQuickAction={handleAsk}
                  onInteraction={audioManager.initAudioContext}
                  onEnableMicrophone={enableMicrophone}
                  disabled={busy}
                  isTyping={isAsking || llmLoading}
                  hideWelcome={!avatarReady || !!conversationManager.errorHandling.lastError}
                  // Feedback props
                  showRatingWidget={feedback.showRatingWidget}
                  messageFeedback={feedback.messageFeedback}
                  onMessageFeedback={feedback.submitMessageFeedback}
                  onSessionFeedback={feedback.submitSessionFeedback}
                  onDismissRating={() => feedback.setShowRatingWidget(false)}
                />
              </div>
              {/* Chat Input - Always visible at bottom */}
              <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-lg border-t border-white/10">
                <EnhancedChatBar 
                  ref={chatBarRef}
                  disabled={busy} 
                  onSend={handleAsk} 
                  busyLabel={llmLoading ? 'Thinking...' : 'Speaking...'} 
                  onInteraction={audioManager.initAudioContext}
                  isTTSSpeaking={isCurrentlySpeaking}
                  onStopSpeaking={conversationManager.speechManager.stopSpeaking}
                />
                
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSubmit={(comment, email, allowContact) => {
            feedback.submitGeneralFeedback(comment, email, allowContact);
            setShowFeedbackModal(false);
          }}
          disabled={busy}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          talkingHead={talkingHead}
          personalitySystem={personalitySystem}
        />

        {/* Toast notifications */}
        <ToastContainer
          toasts={feedback.toasts}
          onRemove={feedback.removeToast}
        />
      </div>
    </AppShell>
  );
};