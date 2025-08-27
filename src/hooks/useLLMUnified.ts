import { useCallback, useState } from 'react';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UseLLMOptions {
  endpoint?: string;
  apiKey?: string;
  deployment?: string;
  apiVersion?: string;
  maxTokens?: number;
  temperature?: number;
}

export function useLLM(opts: UseLLMOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: LLMMessage[]) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if we're in development with local Azure SDK or production with Azure Functions
      const useDirectAPI = import.meta.env.DEV && 
        import.meta.env.VITE_AZURE_OPENAI_ENDPOINT && 
        import.meta.env.VITE_AZURE_OPENAI_KEY;

      if (useDirectAPI) {
        // Development: Use direct Azure OpenAI API calls
        const endpoint = opts.endpoint || import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
        const apiKey = opts.apiKey || import.meta.env.VITE_AZURE_OPENAI_KEY;
        const deployment = opts.deployment || import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
        const apiVersion = opts.apiVersion || import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-07-01-preview';

        if (!endpoint || !apiKey || !deployment) {
          throw new Error('Missing Azure OpenAI config for development');
        }

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        
        const baseBody: any = {
          messages,
          temperature: opts.temperature ?? 0.7,
          stream: false,
        };
        let triedAlt = false;

        const attempt = async () => {
          const body = { ...baseBody };
          if (!triedAlt) body.max_tokens = opts.maxTokens ?? 600;
          else body.max_completion_tokens = opts.maxTokens ?? 600;
          
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: JSON.stringify(body),
          });
          
          if (!res.ok) {
            const text = await res.text();
            if (!triedAlt && /max_tokens|max_completion_tokens/i.test(text)) {
              triedAlt = true;
              return attempt();
            }
            throw new Error(`LLM error ${res.status}: ${text}`);
          }
          
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content?.trim?.() || '';
          return content;
        };

        return await attempt();
      } else {
        // Production or fallback: Use Azure Function
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
      }
    } catch (e: any) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [opts.endpoint, opts.apiKey, opts.deployment, opts.apiVersion, opts.temperature, opts.maxTokens]);

  return { chat, loading, error };
}
