import { test, expect } from '@playwright/test';

test.describe('iOS Speech Debug Tests', () => {
  test('should diagnose iOS speech synthesis issues on Mobile Safari', async ({ page }) => {
    // Enable console logging
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Test audio context initialization
    await test.step('Initialize audio context', async () => {
      const audioContextResult = await page.evaluate(async () => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          
          (window as any).globalAudioContext = ctx;
          
          return {
            success: true,
            state: ctx.state,
            sampleRate: ctx.sampleRate,
            destination: !!ctx.destination
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log('Audio context init result:', audioContextResult);
      expect(audioContextResult.success).toBe(true);
    });
    
    // Test basic text input and submission
    await test.step('Send test message', async () => {
      const input = page.locator('input[placeholder*="Press on mic or type"]');
      await input.fill('Hello, can you hear me?');
      
      const askButton = page.locator('[data-testid="ask-button"]');
      await askButton.click();
      
      // Wait for processing to start
      await expect(askButton).toBeDisabled({ timeout: 10000 });
    });
    
    // Monitor TTS and audio playback
    await test.step('Monitor TTS synthesis', async () => {
      // Wait for TTS to be triggered and check for audio generation
      const ttsResult = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let ttsStarted = false;
          let audioGenerated = false;
          let speechStarted = false;
          let errors: string[] = [];
          
          // Monitor console for TTS activity
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          const originalConsoleWarn = console.warn;
          
          console.log = (...args) => {
            const message = args.join(' ');
            originalConsoleLog(...args);
            
            if (message.includes('Starting TTS synthesis')) {
              ttsStarted = true;
            }
            if (message.includes('Audio decoded successfully')) {
              audioGenerated = true;
            }
            if (message.includes('Starting avatar speech')) {
              speechStarted = true;
            }
          };
          
          console.error = (...args) => {
            const message = args.join(' ');
            originalConsoleError(...args);
            errors.push(message);
          };
          
          console.warn = (...args) => {
            const message = args.join(' ');
            originalConsoleWarn(...args);
            errors.push(message);
          };
          
          // Check for completion after reasonable time
          setTimeout(() => {
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;
            
            resolve({
              ttsStarted,
              audioGenerated,
              speechStarted,
              errors,
              globalAudioContext: !!(window as any).globalAudioContext,
              audioContextState: (window as any).globalAudioContext?.state
            });
          }, 15000); // Wait 15 seconds for TTS process
        });
      });
      
      console.log('TTS monitoring result:', ttsResult);
      
      // Check if TTS process started
      expect((ttsResult as any).ttsStarted).toBe(true);
      
      // Log any errors found during TTS
      if ((ttsResult as any).errors?.length > 0) {
        console.log('TTS errors detected:', (ttsResult as any).errors);
      }
    });
    
    // Test audio playback capability
    await test.step('Test audio playback capability', async () => {
      const audioTestResult = await page.evaluate(async () => {
        try {
          const ctx = (window as any).globalAudioContext;
          if (!ctx) {
            return { success: false, error: 'No global audio context' };
          }
          
          // Create a test audio buffer
          const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          
          // Generate a quiet test tone
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate) * 0.01;
          }
          
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          
          // Try to play the test audio
          source.start();
          
          return {
            success: true,
            contextState: ctx.state,
            sampleRate: ctx.sampleRate
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log('Audio playback test result:', audioTestResult);
      expect(audioTestResult.success).toBe(true);
    });
    
    // Wait for Ask button to be re-enabled (indicating completion)
    await test.step('Wait for process completion', async () => {
      const askButton = page.locator('[data-testid="ask-button"]');
      await expect(askButton).toBeEnabled({ timeout: 30000 });
    });
    
    // Check final console logs for any iOS-specific issues
    const iosLogs = logs.filter(log => 
      log.includes('iOS') || 
      log.includes('AudioContext') || 
      log.includes('TTS') ||
      log.includes('avatar speech') ||
      log.includes('audio test')
    );
    
    console.log('iOS-related logs:', iosLogs);
  });
});
