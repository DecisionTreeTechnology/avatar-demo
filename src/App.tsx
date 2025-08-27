import React, { useState } from 'react';
import { AppShell } from './components/AppShell';
import { ChatBar } from './components/ChatBar';
import { useLLM, LLMMessage } from './hooks/useLLM';
import { useAzureTTS } from './hooks/useAzureTTS';
import { useTalkingHead } from './hooks/useTalkingHead';
import { testAudioPlayback } from './utils/mobileDebug';

export const App: React.FC = () => {
  const { chat, loading: llmLoading } = useLLM();
  const { speakText, isSynthesizing } = useAzureTTS();
  const talkingHead = useTalkingHead();
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<LLMMessage[]>([{ role: 'system', content: 'You are a helpful assistant.' }]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isAvatarAudioPlaying, setIsAvatarAudioPlaying] = useState(false);
  const busy = llmLoading || isSynthesizing || talkingHead.isSpeaking || isAvatarAudioPlaying;



  // Initialize AudioContext on first user interaction (required for mobile)
  const initAudioContext = async () => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        (window as any).globalAudioContext = ctx; // Store globally for TTS hook
        setAudioContext(ctx);
      
      // Test audio playback on mobile devices
      if (/iPad|iPhone|iPod|Android/i.test(navigator.userAgent)) {
        await testAudioPlayback();
      }
      } catch (error) {
        console.error('[App] Failed to initialize AudioContext:', error);
      }
    }
  };

  const handleAsk = async (question: string) => {
    // Initialize audio context on first user interaction
    await initAudioContext();
    
    const msgs = [...history, { role: 'user', content: question } as LLMMessage];
    try {
      const completion = await chat(msgs);
      const reply = completion || '(No response)';
      
      setHistory([...msgs, { role: 'assistant', content: reply }]);
      setAnswer(reply);
      
      const tts = await speakText(reply);
      
      // Ensure audio context is running before avatar speech
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      setIsAvatarAudioPlaying(true);
      await talkingHead.speak(tts.audio, tts.wordTimings);
      
      // Keep the audio playing state for the actual duration of the audio
      setTimeout(() => {
        setIsAvatarAudioPlaying(false);
      }, tts.audio.duration * 1000 + 500); // Add 500ms buffer
    } catch (e) {
      console.error('Error in handleAsk:', e);
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
