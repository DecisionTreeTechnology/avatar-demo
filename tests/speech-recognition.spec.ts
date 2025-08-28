import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Speech Recognition', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock speech recognition API
    await page.addInitScript(() => {
      class MockSpeechRecognition extends EventTarget {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        
        private _isListening = false;
        private _mockTranscript = 'Hello avatar, how are you today?';
        
        start() {
          this._isListening = true;
          
          // Simulate speech recognition starting
          setTimeout(() => {
            this.dispatchEvent(new Event('start'));
          }, 100);
          
          // Simulate speech recognition result
          setTimeout(() => {
            const event = new Event('result') as any;
            event.results = [{
              0: { transcript: this._mockTranscript, confidence: 0.9 },
              isFinal: true,
              length: 1
            }];
            event.resultIndex = 0;
            this.dispatchEvent(event);
          }, 1000);
          
          // Simulate speech recognition end
          setTimeout(() => {
            this.dispatchEvent(new Event('end'));
            this._isListening = false;
          }, 1500);
        }
        
        stop() {
          this._isListening = false;
          this.dispatchEvent(new Event('end'));
        }
        
        abort() {
          this._isListening = false;
          this.dispatchEvent(new Event('end'));
        }
        
        get isListening() {
          return this._isListening;
        }
      }
      
      // Mock both prefixed and non-prefixed versions
      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    });
  });

  test('should show microphone button when speech recognition is supported', async ({ page }) => {
    // Wait for component to initialize
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    // Microphone button should be visible since we mocked speech recognition
    await expect(micButton).toBeVisible();
  });

  test('should toggle listening state when microphone button is clicked', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Initial state should be not listening
      await expect(micButton).not.toHaveClass(/bg-red-500/);
      
      // Click to start listening
      await micButton.click();
      
      // Wait for listening state to activate
      await page.waitForTimeout(200);
      
      // Button should show listening state (red background or animation)
      const isListening = await page.evaluate(() => {
        const button = document.querySelector('button svg')?.closest('button');
        return button?.classList.contains('bg-red-500') || 
               button?.classList.contains('animate-pulse') ||
               button?.classList.contains('bg-orange-500');
      });
      
      expect(isListening).toBe(true);
    }
  });

  test('should process speech recognition results and fill input', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('input[type="text"]');
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Start speech recognition
      await micButton.click();
      
      // Wait for mock speech recognition to provide results
      await page.waitForTimeout(2000);
      
      // Check if input was filled with speech recognition result
      const inputValue = await chatInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
      
      // Should contain part of our mock transcript
      expect(inputValue).toContain('Hello');
    }
  });

  test('should auto-send complete sentences', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Mock complete sentence with punctuation
      await page.evaluate(() => {
        const recognition = new (window as any).SpeechRecognition();
        recognition._mockTranscript = 'What is the weather today?';
      });
      
      // Start speech recognition
      await micButton.click();
      
      // Wait for speech recognition and auto-send
      await page.waitForTimeout(3000);
      
      // Input should be cleared if auto-send triggered
      const chatInput = page.locator('input[type="text"]');
      const inputValue = await chatInput.inputValue();
      
      // Either input is cleared (auto-sent) or contains the question
      expect(inputValue.length === 0 || inputValue.includes('weather')).toBe(true);
    }
  });

  test('should stop listening when avatar is speaking', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Start listening
      await micButton.click();
      await page.waitForTimeout(500);
      
      // Send a message to make avatar speak
      await chatInput.fill('Tell me a joke');
      await askButton.click();
      
      // Wait for busy state
      await page.waitForSelector('button:has-text("Thinking...")', { timeout: 5000 });
      
      // Microphone should be stopped/disabled when avatar is busy
      const micState = await page.evaluate(() => {
        const button = document.querySelector('button svg')?.closest('button');
        return {
          isDisabled: button?.disabled,
          hasRedBackground: button?.classList.contains('bg-red-500'),
          hasAnimation: button?.classList.contains('animate-pulse')
        };
      });
      
      // Microphone should not be in active listening state when avatar is busy
      expect(micState.hasRedBackground && micState.hasAnimation).toBe(false);
    }
  });

  test('should handle speech recognition errors gracefully', async ({ page }) => {
    // Mock speech recognition with error
    await page.addInitScript(() => {
      class ErrorSpeechRecognition extends EventTarget {
        start() {
          setTimeout(() => {
            const errorEvent = new Event('error') as any;
            errorEvent.error = 'not-allowed';
            this.dispatchEvent(errorEvent);
          }, 100);
        }
        
        stop() {}
        abort() {}
      }
      
      (window as any).SpeechRecognition = ErrorSpeechRecognition;
      (window as any).webkitSpeechRecognition = ErrorSpeechRecognition;
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      await micButton.click();
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // App should continue to work despite speech recognition error
      const chatInput = page.locator('input[type="text"]');
      await expect(chatInput).toBeEnabled();
      
      const askButton = page.locator('button:has-text("Ask")');
      await expect(askButton).toBeEnabled();
    }
  });

  test('should provide proper microphone button accessibility', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Check button has proper title/tooltip
      const hasTitle = await micButton.getAttribute('title');
      expect(hasTitle).toBeTruthy();
      expect(hasTitle).toMatch(/listening|microphone|start|stop/i);
      
      // Check button is keyboard accessible
      await micButton.focus();
      const isFocused = await micButton.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Check button responds to keyboard activation
      await micButton.press('Enter');
      
      // Should toggle state
      await page.waitForTimeout(200);
      const newTitle = await micButton.getAttribute('title');
      expect(newTitle).not.toBe(hasTitle);
    }
  });

});
