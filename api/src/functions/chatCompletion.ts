import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function chatCompletion(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Azure OpenAI chat completion request received');

    try {
        const { messages } = await request.json() as { messages: any[] };
        
        if (!messages || !Array.isArray(messages)) {
            return {
                status: 400,
                body: JSON.stringify({ error: 'Messages array is required' })
            };
        }

        // Get Azure OpenAI credentials from environment variables
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiKey = process.env.AZURE_OPENAI_KEY;
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'Ministral-3B';
        const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-05-01-preview';

        if (!endpoint || !apiKey) {
            context.error('Missing Azure OpenAI configuration');
            return {
                status: 500,
                body: JSON.stringify({ error: 'OpenAI service configuration missing' })
            };
        }

        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

        // Adaptive tokens parameters
        const baseBody: any = {
            messages,
            temperature: 0.7,
            stream: false,
        };
        let triedAlt = false;

        const attempt = async () => {
            const body = { ...baseBody };
            if (!triedAlt) {
                body.max_tokens = 600;
            } else {
                body.max_completion_tokens = 600;
            }
            
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
            const content = (json as any)?.choices?.[0]?.message?.content?.trim?.() || '';
            return content;
        };

        const result = await attempt();

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                content: result
            })
        };

    } catch (error) {
        context.error('Error in chat completion:', error);
        return {
            status: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

app.http('chat-completion', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: chatCompletion
});
