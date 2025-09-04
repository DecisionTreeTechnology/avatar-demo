import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from './components/AppShell';
import { EnhancedChatBar, EnhancedChatBarRef } from './components/EnhancedChatBar';
import { ChatHistory } from './components/ChatHistory';
import { AvatarContainer } from './components/AvatarContainer';
import { ErrorDisplay } from './components/ErrorDisplay';
import { IOSWarning } from './components/IOSWarning';
import { AnimationControls } from './components/AnimationControls';

import { useLLM, LLMMessage } from './hooks/useLLM';
import { useTalkingHead } from './hooks/useTalkingHead';
import { useConversationManager } from './hooks/useConversationManager';
import { useAudioManager } from './hooks/useAudioManager';
import { ChatMessage } from './types/chat';
import { isTestMode } from './utils/testUtils';

export const App: React.FC = () => {
  const { loading: llmLoading } = useLLM();
  const talkingHead = useTalkingHead();
  const audioManager = useAudioManager();
  
  // Local state for UI
  const [isAsking, setIsAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<LLMMessage[]>([]);
  const [showAnimationControls, setShowAnimationControls] = useState(false);
  const chatBarRef = useRef<EnhancedChatBarRef>(null);

  // Test mode: simulate ready state for faster testing
  const isTestModeActive = isTestMode();
  const avatarReady = isTestModeActive || talkingHead.isReady;
  const avatarError = isTestModeActive ? null : talkingHead.error;

  // Set up conversation manager
  const conversationManager = useConversationManager({
    talkingHead,
    onChatMessageAdd: (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    },
    onConversationUpdate: (newHistory: LLMMessage[]) => {
      setHistory(newHistory);
    }
  });

  // Combined speaking state - use speech manager state or TalkingHead's state
  const isCurrentlySpeaking = conversationManager.speechManager.isSpeaking || talkingHead.isSpeaking;

  // Busy should reflect processing/synthesis, but not block UI during playback
  const busy = isAsking || llmLoading || (conversationManager.speechManager.isSpeaking && !isTestModeActive);

  // Apply personality and scene to avatar when ready
  useEffect(() => {
    if (avatarReady && !isTestModeActive) {
      conversationManager.personalitySystem.applyPersonalityToAvatar(talkingHead);
      
      // Apply scene background to avatar container
      if (talkingHead.containerRef.current) {
        conversationManager.personalitySystem.applySceneToAvatar(talkingHead.containerRef.current);
      }
      
      // Automatic greeting disabled for production
      // Users can interact naturally without forced greeting
    }
  }, [avatarReady, isTestModeActive, conversationManager.personalitySystem, talkingHead]);

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
    <AppShell>
      <div className="mobile-viewport flex flex-col landscape:flex-row landscape:h-full">
        {/* Avatar Section - Fills ALL available space not taken by chat panel */}
        <AvatarContainer
          talkingHead={talkingHead}
          personalitySystem={conversationManager.personalitySystem}
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
                  onToggleSettings={() => setShowAnimationControls(!showAnimationControls)}
                  isTTSSpeaking={isCurrentlySpeaking}
                  onStopSpeaking={conversationManager.speechManager.stopSpeaking}
                />
                
                {/* Animation Controls Expandable Section */}
                <AnimationControls
                  show={showAnimationControls}
                  talkingHead={talkingHead}
                  personalitySystem={conversationManager.personalitySystem}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};