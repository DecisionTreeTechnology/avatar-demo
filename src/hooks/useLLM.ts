import { useCallback, useState } from 'react';

interface UseLLMOptions {
  endpoint?: string; // e.g. https://YOUR-RESOURCE.openai.azure.com
  apiKey?: string;
  deployment?: string; // deployment name
  apiVersion?: string; // e.g. 2024-07-01-preview
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function useLLM(opts: UseLLMOptions = {}) {
  const endpoint = opts.endpoint || import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const apiKey = opts.apiKey || import.meta.env.VITE_AZURE_OPENAI_KEY;
  const deployment = opts.deployment || import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = opts.apiVersion || import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-07-01-preview';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: LLMMessage[], override: Partial<UseLLMOptions> = {}) => {
    if (!endpoint || !apiKey || !deployment) throw new Error('Missing Azure OpenAI config');
    setLoading(true); setError(null);
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    // Adaptive tokens parameters
    const baseBody: any = {
      messages,
      temperature: override.temperature ?? opts.temperature ?? 0.7,
      stream: false,
    };
    let triedAlt = false;

    const attempt = async () => {
      const body = { ...baseBody };
      if (!triedAlt) body.max_tokens = override.maxTokens ?? opts.maxTokens ?? 600;
      else body.max_completion_tokens = override.maxTokens ?? opts.maxTokens ?? 600;
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

    try {
      return await attempt();
    } catch (e: any) {
      setError(e.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, [endpoint, apiKey, deployment, apiVersion, opts.temperature, opts.maxTokens]);

  return { chat, loading, error };
}
