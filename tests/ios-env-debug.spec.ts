import { test, expect } from '@playwright/test';

test.describe('iOS Environment Debug', () => {
  test('should check environment variables on iOS', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Check environment variables
    const envResult = await page.evaluate(() => {
      try {
        // Check if import.meta.env is available
        const metaEnv = (import.meta as any).env;
        const windowVars = Object.keys(window).filter(k => k.includes('VITE') || k.includes('AZURE'));
        
        return {
          hasImportMeta: !!(import.meta as any).env,
          metaEnvKeys: metaEnv ? Object.keys(metaEnv) : [],
          viteVars: metaEnv ? Object.keys(metaEnv).filter((k: string) => k.startsWith('VITE_')) : [],
          windowVars,
          specificVars: {
            endpoint: metaEnv?.VITE_AZURE_OPENAI_ENDPOINT ? '[PRESENT]' : '[MISSING]',
            key: metaEnv?.VITE_AZURE_OPENAI_KEY ? '[PRESENT]' : '[MISSING]',
            deployment: metaEnv?.VITE_AZURE_OPENAI_DEPLOYMENT || '[MISSING]',
            speechKey: metaEnv?.VITE_AZURE_SPEECH_KEY ? '[PRESENT]' : '[MISSING]',
            speechRegion: metaEnv?.VITE_AZURE_SPEECH_REGION || '[MISSING]'
          }
        };
      } catch (error) {
        return {
          error: error.message,
          hasImportMeta: false
        };
      }
    });
    
    console.log('Environment check:', envResult);
    
    // Specifically test if useLLM would work
    const llmTest = await page.evaluate(async () => {
      try {
        // Simulate what useLLM does
        const metaEnv = (import.meta as any).env;
        const endpoint = metaEnv?.VITE_AZURE_OPENAI_ENDPOINT;
        const apiKey = metaEnv?.VITE_AZURE_OPENAI_KEY;
        const deployment = metaEnv?.VITE_AZURE_OPENAI_DEPLOYMENT;
        
        console.log('[Test] LLM config check:', {
          hasEndpoint: !!endpoint,
          hasKey: !!apiKey,
          hasDeployment: !!deployment
        });
        
        if (!endpoint || !apiKey || !deployment) {
          return {
            success: false,
            error: 'Missing configuration',
            missing: {
              endpoint: !endpoint,
              key: !apiKey,
              deployment: !deployment
            }
          };
        }
        
        // Try to make a minimal request
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-05-01-preview`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 10,
            temperature: 0.7,
          }),
        });
        
        const responseText = await response.text();
        
        return {
          success: response.ok,
          status: response.status,
          responsePreview: responseText.substring(0, 200),
          error: !response.ok ? responseText : null
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('LLM test result:', llmTest);
    
    // Check if the issue is with the async nature
    expect(envResult.hasImportMeta).toBe(true);
  });
});
