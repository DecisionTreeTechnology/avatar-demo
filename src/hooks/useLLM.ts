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
      // Debug environment variables
      console.log('[useLLM] Environment check:', {
        isDev: import.meta.env.DEV,
        mode: import.meta.env.MODE,
        hasEndpoint: !!import.meta.env.VITE_AZURE_OPENAI_ENDPOINT,
        hasKey: !!import.meta.env.VITE_AZURE_OPENAI_KEY,
        hasDeployment: !!import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT,
        endpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT?.substring(0, 50) + '...',
        deployment: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT,
        allViteVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
        // Additional debug info
        envVarCount: Object.keys(import.meta.env).length,
        actualEndpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT,
        actualKey: import.meta.env.VITE_AZURE_OPENAI_KEY ? '[PRESENT]' : '[MISSING]',
        actualDeployment: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT,
      });

      // Always use direct API calls since we have env vars configured
      // This simplifies the architecture and removes dependency on Azure Functions
      const useDirectAPI = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT && 
        import.meta.env.VITE_AZURE_OPENAI_KEY;

      console.log('[useLLM] Using direct API:', useDirectAPI);

      if (useDirectAPI) {
        console.log('[useLLM] Using direct Azure OpenAI API');
        const endpoint = opts.endpoint || import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
        const apiKey = opts.apiKey || import.meta.env.VITE_AZURE_OPENAI_KEY;
        const deployment = opts.deployment || import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
        const apiVersion = opts.apiVersion || import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-05-01-preview';

        console.log('[useLLM] Config values:', {
          endpoint: endpoint?.substring(0, 50) + '...',
          hasApiKey: !!apiKey,
          deployment,
          apiVersion
        });

        if (!endpoint || !apiKey || !deployment) {
          console.error('[useLLM] Missing config:', { endpoint: !!endpoint, apiKey: !!apiKey, deployment: !!deployment });
          const missing = [];
          if (!endpoint) missing.push('VITE_AZURE_OPENAI_ENDPOINT');
          if (!apiKey) missing.push('VITE_AZURE_OPENAI_KEY');
          if (!deployment) missing.push('VITE_AZURE_OPENAI_DEPLOYMENT');
          throw new Error(`Missing Azure OpenAI configuration: ${missing.join(', ')}`);
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
        // Fallback: Azure Functions (should not be needed with env vars configured)
        console.log('[useLLM] Fallback to Azure Function API - check environment variables');
        console.error('[useLLM] Environment variables not found. Available vars:', Object.keys(import.meta.env));
        const missing = [];
        if (!import.meta.env.VITE_AZURE_OPENAI_ENDPOINT) missing.push('VITE_AZURE_OPENAI_ENDPOINT');
        if (!import.meta.env.VITE_AZURE_OPENAI_KEY) missing.push('VITE_AZURE_OPENAI_KEY');
        if (!import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT) missing.push('VITE_AZURE_OPENAI_DEPLOYMENT');
        throw new Error(`Azure OpenAI environment variables not configured: ${missing.join(', ')}. This may indicate a build-time configuration issue.`);
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
