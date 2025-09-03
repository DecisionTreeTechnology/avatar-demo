import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell } from './components/AppShell';
import { EnhancedChatBar } from './components/EnhancedChatBar';
import { ChatHistory } from './components/ChatHistory';
import { useLLM, LLMMessage } from './hooks/useLLM';
import { useEnhancedAzureTTS } from './hooks/useEnhancedAzureTTS';
import { useTalkingHead } from './hooks/useTalkingHead';
import { useEmotionRecognition } from './hooks/useEmotionRecognition';
import { usePersonalitySystem } from './hooks/usePersonalitySystem';
import { ChatMessage } from './types/chat';
import { isTestMode } from './utils/testUtils';
import { AudioContextManager } from './utils/audioContextManager';
import { getMicrophoneManager } from './utils/microphoneStateManager';
import { createLogger } from './utils/logger';

export const App: React.FC = () => {
  const { chat, loading: llmLoading } = useLLM();
  const { speakText, playAudio, stopSpeaking, isSynthesizing } = useEnhancedAzureTTS();
  const talkingHead = useTalkingHead();
  
  // Local speaking state since we're using TalkingHead directly for audio
  const [isTalkingHeadSpeaking, setIsTalkingHeadSpeaking] = useState(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Combined speaking state - use either our manual state or TalkingHead's state
  const isCurrentlySpeaking = isTalkingHeadSpeaking || talkingHead.isSpeaking;
  
  // Combined stop function that stops both TTS audio and TalkingHead animation
  const handleStopSpeaking = useCallback(() => {
    console.log('[App] Stopping both TTS and TalkingHead');
    
    // Clear any pending timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    
    // Stop TTS audio playback
    stopSpeaking();
    
    // Stop TalkingHead animation if available
    if (talkingHead.head && typeof talkingHead.head.stopSpeaking === 'function') {
      try {
        talkingHead.head.stopSpeaking();
        console.log('[App] TalkingHead stopSpeaking called');
      } catch (error) {
        console.warn('[App] Error stopping TalkingHead:', error);
      }
    }
    
    // Reset our local speaking state
    setIsTalkingHeadSpeaking(false);

    // Ensure microphone manager knows speaking has ended
    try {
      const mic = getMicrophoneManager();
      mic.notifyTTSEnded();
    } catch {}
  }, [stopSpeaking, talkingHead.head]);
  const emotionRecognition = useEmotionRecognition({
    autoApplyEmotions: true,
    autoTriggerGestures: true
  });
  const personalitySystem = usePersonalitySystem({
    defaultPersonality: 'fertility_assistant',
    autoApplyPersonality: true
  });
  const [history, setHistory] = useState<LLMMessage[]>([{ 
    role: 'system', 
    content: 'You are a caring, supportive, kind, and empathetic fertility assistant. Your primary role is to provide emotional support, encouragement, and helpful information for people on their fertility journey. Always respond with warmth, understanding, and compassion.' 
  }]);
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(true); // Temporary debug flag
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  // Global debug logger for hooks to use
  const logCounter = useRef(0);
  useEffect(() => {
    (window as any).addDebugLog = (message: string) => {
      logCounter.current++;
      const timestampedMessage = `${logCounter.current}: ${message}`;
      setDebugLogs(prev => [...prev.slice(-9), timestampedMessage].slice(-10)); // Show last 10 logs
    };
    return () => {
      delete (window as any).addDebugLog;
    };
  }, []);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showAnimationControls, setShowAnimationControls] = useState(false);
  const logger = createLogger('App');

  // Test mode: simulate ready state for faster testing
  const isTestModeActive = isTestMode();
  // Busy should reflect processing/synthesis, but not block UI during playback
  const busy = isAsking || llmLoading || (isSynthesizing && !isTestModeActive);

  const avatarReady = isTestModeActive || talkingHead.isReady;
  const avatarError = isTestModeActive ? null : talkingHead.error;





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
  }, [avatarReady, isTestModeActive]);

  // Initialize AudioContext using centralized manager
  const initAudioContext = async (): Promise<void> => {
    try {
      logger.log('Initializing audio context via AudioContextManager');
      const audioManager = AudioContextManager.getInstance();
      await audioManager.getContext();
      
      const debugInfo = audioManager.getDebugInfo();
      logger.log('AudioContext initialized:', debugInfo.audioContext);
      
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSWarning(debugInfo.audioContext.state !== 'running');
      }
      
    } catch (error) {
      logger.error('Error initializing audio context:', error);
      const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        setShowIOSWarning(true);
      }
    }
  };

    const handleAsk = async (question: string) => {
    try {
      setIsAsking(true);
      setLastError(null);
      // Ensure AudioContext is initialized and unlocked before proceeding (important for iOS)
      await initAudioContext();
      
      // iOS Safari TalkingHead warm-up - must happen during user gesture
      console.log('[App] Calling warmUpForIOS...');
      logCounter.current++;
      setDebugLogs(prev => [...prev.slice(-9), `${logCounter.current}: [App] Calling warmUpForIOS`].slice(-10));
      await talkingHead.warmUpForIOS();
      console.log('[App] warmUpForIOS completed');
      logCounter.current++;
      setDebugLogs(prev => [...prev.slice(-9), `${logCounter.current}: [App] warmUpForIOS completed`].slice(-10));
      // If currently speaking, stop ongoing TTS/animation before new request
      if (isCurrentlySpeaking) {
        handleStopSpeaking();
      }
      
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        text: question,
        isUser: true,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, userMessage]);
      
      // Analyze user input for emotion and apply to avatar
      logger.log('Analyzing user input emotion...');
      const userEmotionAnalysis = await emotionRecognition.analyzeAndApply(question, talkingHead);
      logger.log('User emotion analysis:', userEmotionAnalysis);
      
      // Add user message to conversation history
      const newConversationHistory = [...conversationHistory, question];
      
      const msgs = [...history, { role: 'user', content: question } as LLMMessage];
      
      // Get LLM response
      const completion = await chat(msgs);
      let reply = completion || '(No response)';
      
      // Apply personality-based response modification
      const modifiedReply = personalitySystem.modifyResponse(reply, {
        // Never treat LLM responses as greetings - let them be natural
        isGreeting: false,
        needsEncouragement: userEmotionAnalysis.emotion.primaryEmotion === 'sad' || userEmotionAnalysis.sentiment === 'negative',
        needsEmpathy: ['sad', 'confused', 'angry'].includes(userEmotionAnalysis.emotion.primaryEmotion),
        userInput: question
      });
      
      reply = modifiedReply;
      
      // Analyze LLM response for appropriate avatar emotion/gestures
      console.log('[App] Analyzing LLM response emotion...');
      const responseEmotionAnalysis = await emotionRecognition.analyzeAndApply(reply, talkingHead);
      console.log('[App] Response emotion analysis:', responseEmotionAnalysis);
      
      // Update conversation history
      const updatedHistory = [...newConversationHistory, reply];
      setConversationHistory(updatedHistory);
      
      // Analyze overall conversation context
      if (updatedHistory.length > 3) {
        const conversationContext = emotionRecognition.analyzeConversation(updatedHistory.slice(-6)); // Last 6 messages
        console.log('[App] Conversation context:', conversationContext);
        
        // Adjust avatar mood based on conversation energy if needed
        if (conversationContext.conversationEnergy === 'high' && responseEmotionAnalysis.emotion.primaryEmotion === 'neutral') {
          console.log('[App] Boosting emotion based on high conversation energy');
          talkingHead.setEmotion('excited', 'normal');
        }
      }
      
      setHistory([...msgs, { role: 'assistant', content: reply }]);
      
      // Add assistant message to chat
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        text: reply,
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Use enhanced TTS with avatar lip sync and iOS support
      try {
        // Re-confirm AudioContext is available and running just before playback
        try {
          const ctx = await AudioContextManager.getInstance().getContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
        } catch (ctxErr) {
          console.warn('[App] Warning ensuring AudioContext before playback:', ctxErr);
        }

        // First synthesize the audio and get word timings
        const { audio, wordTimings } = await speakText(reply);

        // Convert word timings to TalkingHead format (milliseconds expected by library)
        const talkingHeadTimings = wordTimings.map((timing: { word: string; start: number; end: number }) => ({
          word: timing.word,
          start: timing.start || 0,
          end: timing.end || 0
        }));
        
        logger.log('Starting avatar speech with lip sync, duration:', audio.duration);
        logger.log('Setting isTalkingHeadSpeaking to true');
        
        // Set speaking state manually since we're bypassing playAudio
        console.log('[App] Setting isTalkingHeadSpeaking to TRUE');
        logCounter.current++;
        setDebugLogs(prev => [...prev.slice(-9), `${logCounter.current}: [App] Setting isTalkingHeadSpeaking TRUE`].slice(-10));
        setIsTalkingHeadSpeaking(true);

        // Notify microphone manager that TTS is starting (redundant-safe)
        try {
          const mic = getMicrophoneManager();
          mic.notifyTTSStarted();
        } catch {}
        
        // Create a more generous timeout to keep the button visible
        const duration = audio.duration * 1000; // Convert to milliseconds
        const generousTimeout = Math.max(duration + 2000, 5000); // At least 5 seconds or duration + 2 seconds
        
        logger.log('Setting timeout for', generousTimeout, 'ms (audio duration:', duration, 'ms)');
        
        speakingTimeoutRef.current = setTimeout(() => {
          logger.log('Timeout reached, setting speaking to false');
          setIsTalkingHeadSpeaking(false);
          speakingTimeoutRef.current = null;
        }, generousTimeout);
        
        // Begin playback via our TTS audio path for iOS reliability
        // Play actual audio using our AudioContext (reliable unlock)
        try {
          void playAudio(audio, wordTimings, () => {
            logger.log('playAudio onEnd fired');
          });
        } catch (playErr) {
          logger.warn('playAudio failed (continuing with avatar only):', playErr);
        }

        // Drive avatar lipsync with the real audio buffer (TalkingHead's speech is muted)
        talkingHead.speak(audio, talkingHeadTimings).then(() => {
          logger.log('TalkingHead speak completed');
          // Clear extended hold if still pending and release speaking state
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }
          console.log('[App] TalkingHead speak completed - setting isTalkingHeadSpeaking to FALSE');
          logCounter.current++;
          setDebugLogs(prev => [...prev.slice(-9), `${logCounter.current}: [App] TalkingHead completed - setting FALSE`].slice(-10));
          setIsTalkingHeadSpeaking(false);

          // Notify microphone manager that TTS has ended
          try {
            const mic = getMicrophoneManager();
            mic.notifyTTSEnded();
          } catch {}
        }).catch((speakError) => {
          logger.warn('TalkingHead speak error (continuing):', speakError);
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }
          setIsTalkingHeadSpeaking(false);

          // Ensure microphone manager is reset even on error
          try {
            const mic = getMicrophoneManager();
            mic.notifyTTSEnded();
          } catch {}
        });
        
        logger.log('TalkingHead speak started, button should be visible');
        
      } catch (speechError) {
        logger.error('TTS synthesis or avatar speech failed:', speechError);
        setIsTalkingHeadSpeaking(false); // Ensure speaking state is reset on error
        // Still show the text response even if speech fails
      }
      
    } catch (e) {
      console.error('[App] Error in handleAsk:', e);
      
      const errorMessage = e instanceof Error ? e.message : 'Something went wrong';
      setLastError(errorMessage);
      
      // Show error emotion on avatar
      talkingHead.setEmotion('confused', 'normal');
      
      // Apply personality to error message
      const personalizedError = personalitySystem.modifyResponse(
        `I'm sorry, I encountered an error: ${errorMessage}`,
        { needsEmpathy: true }
      );
      
      // Add error message to chat
      const errorMessage_chat: ChatMessage = {
        id: `error-${Date.now()}`,
        text: personalizedError,
        isUser: false,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage_chat]);
    } finally {
      setIsAsking(false);
      // First interaction state removed for production
    }
  };

  return (
    <AppShell>
      <div className="mobile-viewport flex flex-col landscape:flex-row landscape:h-full">
        {/* Avatar Section - Fills ALL available space not taken by chat panel */}
        <div className="flex-1 relative min-h-0 overflow-hidden landscape:h-full landscape:flex landscape:items-center landscape:justify-center">
          <div 
            ref={talkingHead.containerRef} 
            data-testid="avatar-container" 
            key="avatar-container-unique"
            data-scene={personalitySystem.currentPersonality === 'fertility_assistant' ? 'fertility_clinic' :
                       personalitySystem.currentPersonality === 'professional' ? 'office' :
                       personalitySystem.currentPersonality === 'casual' ? 'home' : 'park'}
            className="absolute inset-0 mobile-avatar-container landscape:relative landscape:w-full landscape:h-full landscape:max-w-none landscape:max-h-none"
          >
            {/* NEW Debug Overlay v2.0 */}
            {showDebug && (
              <div className="absolute top-2 left-2 z-30 bg-black/80 text-white text-xs p-2 rounded max-w-sm">
                <div className="font-mono space-y-1">
                  <div>isTalkingHeadSpeaking: {isTalkingHeadSpeaking.toString()}</div>
                  <div>talkingHead.isSpeaking: {talkingHead.isSpeaking.toString()}</div>
                  <div>isCurrentlySpeaking: {isCurrentlySpeaking.toString()}</div>
                  <div>isAsking: {isAsking.toString()}</div>
                </div>
                <div className="mt-2 text-xs border-t border-gray-500 pt-2">
                  <div className="font-bold">Recent Logs:</div>
                  {debugLogs.map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
                <button 
                  className="mt-2 text-xs bg-white text-black px-2 py-1 rounded"
                  onClick={() => setShowDebug(false)}
                >Hide</button>
              </div>
            )}
            
            {!avatarReady && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600/40 to-pink-600/40 rounded-full mb-6 animate-caring-pulse">
                    <svg className="w-10 h-10 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="text-purple-100 text-lg font-medium mb-2">
                    {avatarError ? '❌ Connection Issue' : '💝 Your Caring Assistant'}
                  </div>
                  {!avatarError && (
                    <div className="text-purple-200/80 text-sm max-w-xs">
                      Preparing personalized fertility support with empathy and care
                    </div>
                  )}
                  {talkingHead.error && (
                    <div className="text-red-300 text-sm max-w-xs">
                      {talkingHead.error}
                      <div className="mt-2 text-xs text-red-400">
                        Please refresh the page to try again
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Smooth entrance animation for avatar */}
            {talkingHead.isReady && (
              <div className="absolute inset-0 animate-fade-in">
                {/* Avatar will appear here */}
              </div>
            )}
          </div>
          {talkingHead.error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
              <div className="glass p-4 rounded-lg text-red-300 text-sm max-w-sm text-center">
                Avatar error: {talkingHead.error}
              </div>
            </div>
          )}
        </div>
        
        {/* iOS Chrome Warning */}
        {showIOSWarning && (
          <div className="absolute top-4 left-4 right-4 z-30">
            <div className="glass p-4 rounded-lg bg-orange-500/90 text-white">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">iOS Chrome Audio Notice</h4>
                  <p className="text-xs mt-1 opacity-90">
                    Audio may not work properly on iOS. Please tap the screen to enable audio, then try again.
                  </p>
                </div>
                <button
                  onClick={() => setShowIOSWarning(false)}
                  className="flex-shrink-0 text-orange-200 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

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
              {lastError && (
                <div className="p-3 bg-red-900/50 border border-red-600 rounded-lg text-red-300 mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <strong>❌ Error:</strong>
                      <p className="mt-1 text-sm">{lastError}</p>
                    </div>
                    <button
                      onClick={() => setLastError(null)}
                      className="ml-2 text-red-400 hover:text-red-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Chat History - Takes up remaining space above input */}
              <div className="flex-1 min-h-0 max-h-full overflow-hidden relative">
                <ChatHistory 
                  messages={chatMessages}
                  onQuickAction={handleAsk}
                  onInteraction={initAudioContext}
                  disabled={busy}
                  isTyping={isAsking || llmLoading}
                  hideWelcome={!avatarReady || !!lastError}
                />
              </div>
              {/* Chat Input - Always visible at bottom */}
              <div className="flex-shrink-0 bg-gray-900/50 p-3 rounded-lg border-t border-white/10">
                <EnhancedChatBar 
                  disabled={busy} 
                  onSend={handleAsk} 
                  busyLabel={llmLoading ? 'Thinking...' : 'Speaking...'} 
                  onInteraction={initAudioContext}
                  onToggleSettings={() => setShowAnimationControls(!showAnimationControls)}
                  isTTSSpeaking={isCurrentlySpeaking}
                  onStopSpeaking={handleStopSpeaking}
                />
                
                {/* Animation Controls Expandable Section */}
                {showAnimationControls && (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-white/10 max-h-96 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Personality Selection */}
                        <div>
                          <label className="block text-xs font-medium mb-2 text-white/80">🤗 Personality</label>
                          <div className="text-xs mb-2 text-gray-300">
                            Current: <span className="text-blue-400">{personalitySystem.personalityTraits.name}</span>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {personalitySystem.availablePersonalities.map((personality) => (
                              <button
                                key={personality}
                                onClick={() => {
                                  personalitySystem.setPersonality(personality);
                                  personalitySystem.applyPersonalityToAvatar(talkingHead);
                                }}
                                className={`px-2 py-1 text-xs rounded transition-colors text-left ${
                                  personalitySystem.currentPersonality === personality
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }`}
                                disabled={!talkingHead.isReady}
                              >
                                {personality.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emotions */}
                        <div>
                          <label className="block text-xs font-medium mb-2 text-white/80">😊 Emotions</label>
                          <div className="grid grid-cols-4 portrait:grid-cols-2 gap-1">
                            {['neutral', 'happy', 'sad', 'angry', 'surprised', 'excited', 'confused', 'thinking'].map((emotion) => (
                              <button
                                key={emotion}
                                onClick={() => {
                                  if (talkingHead.isReady) {
                                    talkingHead.setEmotion(emotion as any, 'normal');
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                                disabled={!talkingHead.isReady}
                              >
                                {emotion}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Gestures */}
                        <div>
                          <label className="block text-xs font-medium mb-2 text-white/80">👋 Gestures</label>
                          <div className="grid grid-cols-4 portrait:grid-cols-2 gap-1">
                            {['wave', 'nod', 'shake_head', 'point', 'thumbs_up', 'shrug', 'thinking', 'excited'].map((gesture) => (
                              <button
                                key={gesture}
                                onClick={async () => {
                                  if (talkingHead.isReady) {
                                    try {
                                      await talkingHead.performGesture(gesture as any);
                                    } catch (error) {
                                      console.error('Failed to perform gesture:', error);
                                    }
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                                disabled={!talkingHead.isReady}
                              >
                                {gesture.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Avatar Status */}
                        <div className="pt-2 border-t border-gray-600 text-xs">
                          <div className={`flex items-center gap-2 ${talkingHead.isReady ? 'text-green-400' : 'text-red-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${talkingHead.isReady ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            Avatar {talkingHead.isReady ? 'Ready' : 'Loading...'}
                          </div>
                          {talkingHead.isSpeaking && (
                            <div className="flex items-center gap-2 text-blue-400 mt-1">
                              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                              Speaking...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
