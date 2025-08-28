import React, { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { ChatBar } from './components/ChatBar';
import { useLLM, LLMMessage } from './hooks/useLLM';
import { useAzureTTS } from './hooks/useAzureTTS';
import { useTalkingHead } from './hooks/useTalkingHead';
import { testAudioPlayback } from './utils/mobileDebug';
import { getIOSChromeWarningMessage, testIOSAudioCompatibility } from './utils/iosCompatibility';
import { ensureIOSAudioCompatibility } from './utils/iosAudioFixes';

export const App: React.FC = () => {
  const { chat, loading: llmLoading } = useLLM();
  const { speakText, isSynthesizing } = useAzureTTS();
  const talkingHead = useTalkingHead();
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<LLMMessage[]>([{ role: 'system', content: 'You are a helpful assistant.' }]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isAvatarAudioPlaying, setIsAvatarAudioPlaying] = useState(false);
  const [showIOSWarning, setShowIOSWarning] = useState(false);
  const busy = llmLoading || isSynthesizing || talkingHead.isSpeaking || isAvatarAudioPlaying;

  // Debug busy state changes
  useEffect(() => {
    console.log('[App] Busy state changed:', {
      busy,
      llmLoading,
      isSynthesizing,
      talkingHeadSpeaking: talkingHead.isSpeaking,
      isAvatarAudioPlaying
    });
  }, [busy, llmLoading, isSynthesizing, talkingHead.isSpeaking, isAvatarAudioPlaying]);



  // Initialize AudioContext on first user interaction (required for mobile)
  const initAudioContext = async () => {
    if (!audioContext) {
      try {
        // Apply iOS-specific audio fixes first
        await ensureIOSAudioCompatibility();
        
        // Enhanced audio context initialization for iOS Chrome compatibility
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass({
          sampleRate: 48000, // iOS prefers 48kHz
          latencyHint: 'interactive'
        });
        
        // Critical: iOS Chrome requires explicit resume after creation
        if (ctx.state === 'suspended') {
          await ctx.resume();
          console.log('[App] AudioContext resumed after creation, state:', ctx.state);
        }
        
        // Store globally for TTS hook and ensure it's accessible
        (window as any).globalAudioContext = ctx;
        setAudioContext(ctx);
        
        // Enhanced mobile audio testing with iOS Chrome specific handling
        if (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent)) {
          console.log('[App] Mobile device detected, running enhanced audio test...');
          const audioTestResult = await testAudioPlayback();
          
          const isIOSChrome = /iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent);
          if (!audioTestResult && isIOSChrome) {
            console.warn('[App] iOS Chrome audio test failed - user may need to enable "Request Desktop Site"');
            setShowIOSWarning(true);
          }
          
          // Additional iOS compatibility test
          if (isIOSChrome) {
            const iosTest = await testIOSAudioCompatibility();
            if (!iosTest.success || iosTest.needsDesktopMode) {
              console.log('[App] iOS Chrome compatibility test:', iosTest.message);
              setShowIOSWarning(true);
            }
          }
        }
        
        console.log('[App] AudioContext initialization complete, state:', ctx.state);
      } catch (error) {
        console.error('[App] Failed to initialize AudioContext:', error);
        // Don't throw - let the app continue and show error feedback
      }
    } else {
      // Ensure existing context is running
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('[App] Existing AudioContext resumed, state:', audioContext.state);
        } catch (error) {
          console.error('[App] Failed to resume existing AudioContext:', error);
        }
      }
    }
  };

  const handleAsk = async (question: string) => {
    try {
      // Initialize audio context on first user interaction
      await initAudioContext();
      
      const msgs = [...history, { role: 'user', content: question } as LLMMessage];
      
      // Get LLM response
      const completion = await chat(msgs);
      const reply = completion || '(No response)';
      
      setHistory([...msgs, { role: 'assistant', content: reply }]);
      setAnswer(reply);
      
      // Ensure audio context is ready before TTS
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
        
        // For iOS Chrome, add extra delay to ensure WebKit is ready
        if (/iPad|iPhone|iPod/i.test(navigator.userAgent) && /CriOS/i.test(navigator.userAgent)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Generate speech
      const tts = await speakText(reply);
      
      // Additional AudioContext check right before avatar speech
      const globalCtx = (window as any).globalAudioContext;
      if (globalCtx && globalCtx.state === 'suspended') {
        await globalCtx.resume();
      }
      
      // Play avatar speech
      setIsAvatarAudioPlaying(true);
      await talkingHead.speak(tts.audio, tts.wordTimings);
      
      // Reset audio playing state
      setTimeout(() => {
        setIsAvatarAudioPlaying(false);
      }, tts.audio.duration * 1000 + 500);
      
    } catch (e) {
      console.error('[App] Error in handleAsk:', e);
      setIsAvatarAudioPlaying(false);
      
      // Show error to user
      setAnswer(`Error: ${e instanceof Error ? e.message : 'Something went wrong'}`);
    }
  };

  return (
    <AppShell>
      <div className="mobile-viewport flex flex-col">
        {/* Avatar Section - Takes remaining space */}
        <div className="flex-1 relative min-h-0 overflow-hidden">
          <div ref={talkingHead.containerRef} className="absolute inset-0 mobile-avatar-container">
            {!talkingHead.isReady && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-white text-sm animate-pulse">
                  {talkingHead.error ? `Error: ${talkingHead.error}` : 'Loading avatar...'}
                  <div className="text-xs mt-2 opacity-70">
                    Container ref: {talkingHead.containerRef.current ? 'Connected' : 'Not connected'}
                  </div>
                </div>
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
                    {getIOSChromeWarningMessage()}
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
          <div className="p-4 pb-safe">
            <div className="glass rounded-2xl p-4 space-y-3 max-w-2xl mx-auto">
              <ChatBar 
                disabled={busy} 
                onSend={handleAsk} 
                busyLabel={llmLoading ? 'Thinking...' : 'Speaking...'} 
                onInteraction={initAudioContext}
              />
              {answer && (
                <div className="text-xs leading-relaxed max-h-24 sm:max-h-32 md:max-h-40 overflow-auto whitespace-pre-wrap border border-white/5 rounded-md p-3 bg-black/20">
                  {answer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
