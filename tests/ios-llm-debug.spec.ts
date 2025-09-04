import { test, expect } from '@playwright/test';

test.describe('iOS LLM Request Debug', () => {
  test('should investigate why LLM requests fail on iOS Mobile Safari', async ({ page }) => {
    // Capture all console messages and network requests
    const logs: string[] = [];
    const networkErrors: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('requestfailed', request => {
      networkErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Check environment variables and API configuration
    await test.step('Check API configuration', async () => {
      const apiConfig = await page.evaluate(() => {
        // Access environment variables through the window object in browser context
        const getEnv = (key: string) => (window as any)[key] || '';
        
        return {
          hasOpenAIKey: !!(getEnv('VITE_AZURE_OPENAI_KEY') || (import.meta as any).env?.VITE_AZURE_OPENAI_KEY),
          hasOpenAIEndpoint: !!(getEnv('VITE_AZURE_OPENAI_ENDPOINT') || (import.meta as any).env?.VITE_AZURE_OPENAI_ENDPOINT),
          hasSpeechKey: !!(getEnv('VITE_AZURE_SPEECH_KEY') || (import.meta as any).env?.VITE_AZURE_SPEECH_KEY),
          hasSpeechRegion: !!(getEnv('VITE_AZURE_SPEECH_REGION') || (import.meta as any).env?.VITE_AZURE_SPEECH_REGION),
          userAgent: navigator.userAgent,
          isIOS: /iPad|iPhone|iPod/i.test(navigator.userAgent)
        };
      });
      
      console.log('API Configuration:', apiConfig);
      expect(apiConfig.hasOpenAIKey).toBe(true);
      expect(apiConfig.hasOpenAIEndpoint).toBe(true);
    });
    
    // Test the LLM request directly
    await test.step('Test LLM request', async () => {
      const input = page.locator('input[placeholder*="Press on mic or type"]');
      await input.fill('Hello');
      
      // Monitor network requests
      const responsePromise = page.waitForResponse(response => 
        response.url().includes('openai') || response.url().includes('azure'), 
        { timeout: 15000 }
      ).catch(() => null);
      
      const askButton = page.locator('[data-testid="ask-button"]');
      await askButton.click();
      
      // Wait a moment to see if processing starts
      await page.waitForTimeout(2000);
      
      // Check if button gets disabled (indicating processing started)
      const isDisabled = await askButton.isDisabled();
      console.log('Ask button disabled after click:', isDisabled);
      
      // Wait for potential response
      const response = await responsePromise;
      if (response) {
        console.log('LLM Response received:', response.status(), response.url());
      } else {
        console.log('No LLM response detected within timeout');
      }
      
      // Check for any errors in the console
      const errorLogs = logs.filter(log => 
        log.includes('error') || 
        log.includes('Error') || 
        log.includes('Failed') ||
        log.includes('failed')
      );
      
      if (errorLogs.length > 0) {
        console.log('Error logs detected:', errorLogs);
      }
      
      if (networkErrors.length > 0) {
        console.log('Network errors detected:', networkErrors);
      }
    });
    
    // Test if the issue is with the useLLM hook specifically
    await test.step('Test useLLM hook directly', async () => {
      const llmTestResult = await page.evaluate(async () => {
        try {
          // Try to access the LLM functionality directly
          const testMessage = [{ role: 'user', content: 'test' }];
          
          // Check if fetch works on iOS
          const getEnv = (key: string) => (window as any)[key] || (import.meta as any).env?.[key] || '';
          
          const openaiEndpoint = getEnv('VITE_AZURE_OPENAI_ENDPOINT');
          const openaiKey = getEnv('VITE_AZURE_OPENAI_KEY');
          const deployment = getEnv('VITE_AZURE_OPENAI_DEPLOYMENT');
          
          if (!openaiEndpoint || !openaiKey || !deployment) {
            return { 
              success: false, 
              error: 'Missing API configuration',
              hasEndpoint: !!openaiEndpoint,
              hasKey: !!openaiKey,
              hasDeployment: !!deployment
            };
          }
          
          const url = `${openaiEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
          
          // Test if we can at least initiate the request
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': openaiKey,
            },
            body: JSON.stringify({
              messages: testMessage,
              max_tokens: 10,
              temperature: 0.7,
            }),
          }).catch(e => {
            return { error: e.message };
          });
          
          if ((response as any).error) {
            return { success: false, error: (response as any).error };
          }
          
          const responseData = await (response as Response).json().catch(e => {
            return { error: 'Failed to parse JSON: ' + e.message };
          });
          
          return { 
            success: true, 
            status: (response as Response).status,
            hasResponse: !!responseData,
            responseType: typeof responseData
          };
          
        } catch (error) {
          return { 
            success: false, 
            error: error.message || String(error)
          };
        }
      });
      
      console.log('Direct LLM test result:', llmTestResult);
    });
    
    // Print all collected logs for analysis
    console.log('All console logs:', logs.slice(-20)); // Last 20 logs
  });
});
