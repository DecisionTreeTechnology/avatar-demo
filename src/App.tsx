import React, { useState, useEffect } from 'react';
import { AppShell } from './components/AppShell';
import { ChatBar } from './components/ChatBar';
import { useLLM, LLMMessage } from './hooks/useLLM';
import { useAzureTTS } from './hooks/useAzureTTS';
import { useTalkingHead } from './hooks/useTalkingHead';

export const App: React.FC = () => {
  const { chat, loading: llmLoading } = useLLM();
  const { speakText, isSynthesizing } = useAzureTTS();
  const talkingHead = useTalkingHead();
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<LLMMessage[]>([{ role: 'system', content: 'You are a helpful assistant.' }]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [needsGreeting, setNeedsGreeting] = useState(false);
  const busy = llmLoading || isSynthesizing || talkingHead.isSpeaking;

  // Compassionate fertility companion greetings
  const greetings = [
    "Hello! I'm here to support you on your fertility journey. How are you feeling today?",
    "Welcome! I'm your fertility companion, ready to provide guidance and support. What's on your mind?",
    "Hi there! I'm here to help you navigate your fertility path with compassion and understanding.",
    "Hello! I'm your dedicated fertility companion. I'm here to listen and support you every step of the way.",
    "Welcome! Together, we can explore your fertility journey with hope and knowledge. How can I help you today?",
    "Hi! I'm here as your caring fertility companion, ready to provide support and answer your questions.",
    "Hello! I understand that fertility journeys can be challenging, and I'm here to support you with empathy and care."
  ];

  // Mark that greeting is needed when avatar is ready
  useEffect(() => {
    if (talkingHead.isReady && !hasGreeted && !talkingHead.error) {
      setNeedsGreeting(true);
    }
  }, [talkingHead.isReady, hasGreeted, talkingHead.error]);

  const playGreeting = async () => {
    if (!needsGreeting || hasGreeted) return;
    
    try {
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      console.log('[App] Playing greeting after user interaction:', randomGreeting);
      
      const tts = await speakText(randomGreeting);
      await talkingHead.speak(tts.audio, tts.wordTimings);
      setHasGreeted(true);
      setNeedsGreeting(false);
      console.log('[App] Greeting completed');
    } catch (e) {
      console.error('[App] Error in greeting:', e);
    }
  };

  const handleAsk = async (question: string) => {
    // Play greeting before first user question if needed
    if (needsGreeting && !hasGreeted) {
      await playGreeting();
    }
    
    const msgs = [...history, { role: 'user', content: question } as LLMMessage];
    try {
      console.log('[App] Starting LLM request...');
      const completion = await chat(msgs);
      const reply = completion || '(No response)';
      console.log('[App] LLM response received:', reply.substring(0, 100) + '...');
      
      setHistory([...msgs, { role: 'assistant', content: reply }]);
      setAnswer(reply);
      
      console.log('[App] Starting TTS synthesis...');
      const tts = await speakText(reply);
      console.log('[App] TTS completed, audio buffer duration:', tts.audio.duration, 'word count:', tts.wordTimings.length);
      
      console.log('[App] Starting avatar speech...');
      await talkingHead.speak(tts.audio, tts.wordTimings);
      console.log('[App] Avatar speech completed');
    } catch (e) {
      console.error('[App] Error in handleAsk:', e);
    }
  };

  return (
    <AppShell>
      <div className="relative w-full h-full flex flex-col">
        <div className="flex-1 relative">
          <div ref={talkingHead.containerRef} className="absolute inset-0" />
          {talkingHead.error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="glass p-4 rounded-lg text-red-300 text-sm max-w-sm">Avatar error: {talkingHead.error}</div>
            </div>
          )}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[min(900px,90vw)]">
            <div className="glass p-4 rounded-xl space-y-3">
              {needsGreeting && !hasGreeted && (
                <div className="text-sm text-blue-300 bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-500/30">
                  👋 Your fertility companion is ready to greet you! Ask a question or start speaking to begin.
                </div>
              )}
              <ChatBar disabled={busy} onSend={handleAsk} busyLabel={llmLoading ? 'Thinking...' : 'Speaking...'} />
              {answer && (
                <div className="text-xs leading-relaxed max-h-40 overflow-auto whitespace-pre-wrap border border-white/5 rounded-md p-3 bg-black/20">{answer}</div>
              )}
              <div className="text-[10px] opacity-60">Azure Foundry Mistral + Azure Speech • React migration WIP</div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
