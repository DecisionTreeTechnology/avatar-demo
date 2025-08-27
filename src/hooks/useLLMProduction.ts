import { useCallback, useState } from 'react';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useLLMProduction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: LLMMessage[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.content || '(No response)';
    } catch (e: any) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { chat, loading, error };
}
