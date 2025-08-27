import React, { useState } from 'react';
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
  const busy = llmLoading || isSynthesizing || talkingHead.isSpeaking;

  const handleAsk = async (question: string) => {
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
        {/* Avatar Section - Responsive height */}
        <div className="flex-1 relative min-h-0">
          <div ref={talkingHead.containerRef} className="absolute inset-0" />
          {talkingHead.error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="glass p-4 rounded-lg text-red-300 text-sm max-w-sm text-center">
                Avatar error: {talkingHead.error}
              </div>
            </div>
          )}
        </div>
        
        {/* Chat Interface - Fixed at bottom with safe areas */}
        <div className="safe-bottom safe-pads">
          <div className="p-4 pb-2">
            <div className="glass rounded-2xl p-4 space-y-3 max-w-2xl mx-auto">
              <ChatBar disabled={busy} onSend={handleAsk} busyLabel={llmLoading ? 'Thinking...' : 'Speaking...'} />
              {answer && (
                <div className="text-xs leading-relaxed max-h-32 sm:max-h-40 overflow-auto whitespace-pre-wrap border border-white/5 rounded-md p-3 bg-black/20">
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
