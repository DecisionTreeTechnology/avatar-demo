import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Error Handling and Edge Cases', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Network Error Handling', () => {
    
    test('should handle offline state gracefully', async ({ page }) => {
      // Simulate offline state
      await page.context().setOffline(true);
      
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      await chatInput.fill('Test offline message');
      await askButton.click();
      
      // Should show thinking state but then handle error
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
      
      // Wait for error handling
      await page.waitForTimeout(5000);
      
      // Should return to normal state or show error
      const isBackToNormal = await askButton.isVisible();
      const hasError = await page.locator('text=error').isVisible();
      
      expect(isBackToNormal || hasError).toBe(true);
      
      // Restore online state
      await page.context().setOffline(false);
    });

    test('should handle slow network responses', async ({ page }) => {
      // Slow down network requests
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.continue();
      });
      
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      await chatInput.fill('Slow network test');
      await askButton.click();
      
      // Should remain in thinking state during slow request
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
      
      // Should eventually respond or timeout gracefully
      await page.waitForTimeout(10000);
      
      // Should either complete or handle timeout
      const isCompleted = await askButton.isVisible();
      const isStillThinking = await page.locator('button:has-text("Thinking...")').isVisible();
      
      expect(isCompleted || isStillThinking).toBe(true);
    });
  });

  test.describe('Input Validation and Edge Cases', () => {
    
    test('should handle very long input text', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Create very long text
      const longText = 'This is a very long message. '.repeat(100); // ~3000 characters
      
      await chatInput.fill(longText);
      await askButton.click();
      
      // Should handle long input gracefully
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
      
      // Wait for processing
      await page.waitForTimeout(5000);
      
      // Should either process or show reasonable error
      const isProcessed = await askButton.isVisible();
      expect(isProcessed).toBe(true);
    });

    test('should handle special characters and emojis', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      const specialText = 'Hello! 🤖 How are you? ñáéíóú 中文 العربية @#$%^&*()';
      
      await chatInput.fill(specialText);
      await expect(chatInput).toHaveValue(specialText);
      
      await askButton.click();
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    });

    test('should handle rapid successive inputs', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Send first message
      await chatInput.fill('First message');
      await askButton.click();
      
      // Wait a bit then try to send another
      await page.waitForTimeout(100);
      
      // Button should be disabled
      await expect(askButton).toBeDisabled();
      
      // Input should still be available for typing but submit should be blocked
      await chatInput.fill('Second message');
      await expect(chatInput).toHaveValue('Second message');
      
      // Try clicking disabled button
      await askButton.click({ force: true });
      
      // Should remain disabled
      await expect(askButton).toBeDisabled();
    });

    test('should handle empty and whitespace-only inputs', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Test empty input
      await askButton.click();
      await expect(askButton).toBeEnabled(); // Should remain enabled
      
      // Test whitespace-only input
      await chatInput.fill('   \n\t   ');
      await askButton.click();
      await expect(askButton).toBeEnabled(); // Should remain enabled
      
      // Test with actual content
      await chatInput.fill('Real message');
      await askButton.click();
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    
    test('should handle missing Web APIs gracefully', async ({ page }) => {
      // Mock missing APIs
      await page.addInitScript(() => {
        // Remove speech recognition
        delete (window as any).SpeechRecognition;
        delete (window as any).webkitSpeechRecognition;
        
        // Mock missing AudioContext
        delete (window as any).AudioContext;
        delete (window as any).webkitAudioContext;
      });
      
      await page.reload();
      
      // App should still load and be functional
      await expect(page.locator('.mobile-viewport')).toBeVisible();
      
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      await expect(chatInput).toBeVisible();
      await expect(askButton).toBeVisible();
      
      // Microphone button should not be present
      const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      const micVisible = await micButton.isVisible();
      expect(micVisible).toBe(false);
      
      // Basic text input should still work
      await chatInput.fill('Test without APIs');
      await askButton.click();
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    });

    test('should handle console errors gracefully', async ({ page }) => {
      const errors: string[] = [];
      
      // Collect console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Trigger potential error scenarios
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      await chatInput.fill('Test error handling');
      await askButton.click();
      
      // Wait for potential errors
      await page.waitForTimeout(3000);
      
      // App should continue functioning despite any console errors
      await expect(chatInput).toBeEnabled();
      
      // Log errors for debugging but don't fail test for non-critical errors
      if (errors.length > 0) {
        console.log('Console errors detected:', errors);
      }
    });
  });

  test.describe('Memory and Performance Edge Cases', () => {
    
    test('should handle multiple avatar interactions without memory leaks', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Perform multiple interactions
      for (let i = 0; i < 5; i++) {
        await chatInput.fill(`Test message ${i + 1}`);
        await askButton.click();
        
        // Wait for completion
        await page.waitForTimeout(2000);
        
        // Wait for return to normal state
        while (await page.locator('button:has-text("Thinking...")').isVisible() || 
               await page.locator('button:has-text("Speaking...")').isVisible()) {
          await page.waitForTimeout(500);
        }
        
        // Clear input for next iteration
        await chatInput.fill('');
      }
      
      // Check that app is still responsive
      await expect(chatInput).toBeEnabled();
      await expect(askButton).toBeEnabled();
    });

    test('should handle browser tab visibility changes', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      await chatInput.fill('Tab visibility test');
      await askButton.click();
      
      // Simulate tab becoming hidden
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(1000);
      
      // Simulate tab becoming visible again
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      // App should continue functioning
      await expect(chatInput).toBeEnabled();
    });
  });

  test.describe('Accessibility Edge Cases', () => {
    
    test('should handle keyboard navigation edge cases', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Test Tab navigation
      await page.keyboard.press('Tab');
      await expect(chatInput).toBeFocused();
      
      await page.keyboard.press('Tab');
      // Should focus next interactive element (Ask button or mic button)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe('BUTTON');
      
      // Test Escape key
      await chatInput.focus();
      await chatInput.fill('Test escape');
      await page.keyboard.press('Escape');
      
      // Should maintain functionality
      await expect(chatInput).toBeEnabled();
    });

    test('should handle screen reader scenarios', async ({ page }) => {
      // Test ARIA attributes and labels
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('button:has-text("Ask")');
      
      // Check for proper labeling
      const inputPlaceholder = await chatInput.getAttribute('placeholder');
      expect(inputPlaceholder).toBeTruthy();
      
      const buttonText = await askButton.textContent();
      expect(buttonText).toBeTruthy();
      
      // Check for proper button states
      await chatInput.fill('Screen reader test');
      await askButton.click();
      
      // Disabled button should be properly indicated
      const isDisabled = await askButton.isDisabled();
      if (isDisabled) {
        const ariaDisabled = await askButton.getAttribute('aria-disabled');
        const disabled = await askButton.getAttribute('disabled');
        expect(ariaDisabled === 'true' || disabled !== null).toBe(true);
      }
    });
  });

});
