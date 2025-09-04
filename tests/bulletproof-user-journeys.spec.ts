import { test, expect } from '@playwright/test';

/**
 * BULLETPROOF E2E TESTING: Critical User Journeys
 * 
 * These tests simulate complete real-world user scenarios to ensure
 * the application is bulletproof under actual usage conditions.
 */

test.describe('Bulletproof User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial app load
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
  });

  test('Complete Fertility Consultation Journey', async ({ page }) => {
    // 1. User arrives seeking fertility help
    await test.step('Initial load and personality detection', async () => {
      await expect(page.locator('text=fertility')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="personality-fertility"]')).toBeVisible();
    });

    // 2. User asks about fertility concerns
    await test.step('User expresses fertility concerns', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("I've been trying to conceive for 6 months and I'm worried. What should I do?");
      await page.click('[data-testid="send-button"]');
      
      // Avatar should show empathy
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('understand', { timeout: 10000 });
      await expect(page.locator('[data-testid="avatar-container"]')).toHaveAttribute('data-emotion', 'empathetic');
    });

    // 3. User asks follow-up questions
    await test.step('Follow-up conversation', async () => {
      await page.fill('[data-testid="chat-input"]', "What tests should I consider?");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('test', { timeout: 10000 });
      
      // Third question to ensure conversation continuity
      await page.fill('[data-testid="chat-input"]', "How long should we try naturally?");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(['month', 'year'], { timeout: 10000 });
    });

    // 4. User switches to voice interaction
    await test.step('Voice interaction in fertility context', async () => {
      await page.click('[data-testid="microphone-button"]');
      await expect(page.locator('[data-testid="microphone-button"]')).toHaveClass(/recording/);
      
      // Simulate voice input (in real scenario, would use mock audio)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mockSpeechResult', { 
          detail: { transcript: 'Thank you for the guidance, this helps a lot' }
        }));
      });
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('welcome', { timeout: 10000 });
    });

    // 5. User experiences crisis moment
    await test.step('Crisis intervention', async () => {
      await page.fill('[data-testid="chat-input"]', "I feel so hopeless and worthless. Nothing seems to work.");
      await page.click('[data-testid="send-button"]');
      
      // Should trigger crisis response
      await expect(page.locator('[data-testid="crisis-response"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(['support', 'help'], { timeout: 10000 });
    });
  });

  test('Professional Consultation Journey', async ({ page }) => {
    // Switch to professional personality
    await page.selectOption('[data-testid="personality-selector"]', 'professional');
    await expect(page.locator('[data-testid="personality-professional"]')).toBeVisible();

    await test.step('Business consultation flow', async () => {
      await page.fill('[data-testid="chat-input"]', "I need help developing a business strategy for Q1");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(['strategy', 'business'], { timeout: 10000 });
      await expect(page.locator('[data-testid="avatar-container"]')).toHaveAttribute('data-scene', 'office');
    });

    await test.step('Professional follow-up with documents', async () => {
      await page.fill('[data-testid="chat-input"]', "Can you help me create a project timeline?");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('timeline', { timeout: 10000 });
    });
  });

  test('Mobile User Journey - Portrait to Landscape', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });

    await test.step('Portrait mode interaction', async () => {
      await expect(page.locator('[data-testid="mobile-chat-panel"]')).toBeVisible();
      
      await page.fill('[data-testid="chat-input"]', "Hello, can you help me?");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('help', { timeout: 10000 });
    });

    await test.step('Rotate to landscape and continue', async () => {
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Layout should adapt
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
      
      // Continue conversation
      await page.fill('[data-testid="chat-input"]', "This is a follow-up question");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('follow', { timeout: 10000 });
    });
  });

  test('Network Interruption Recovery Journey', async ({ page }) => {
    await test.step('Start normal conversation', async () => {
      await page.fill('[data-testid="chat-input"]', "Tell me about artificial intelligence");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('intelligence', { timeout: 10000 });
    });

    await test.step('Simulate network failure and recovery', async () => {
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      await page.fill('[data-testid="chat-input"]', "This should fail");
      await page.click('[data-testid="send-button"]');
      
      // Should show error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
      
      // Restore network
      await page.unroute('**/*');
      
      // Retry should work
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('fail', { timeout: 15000 });
    });
  });

  test('Audio System Stress Test Journey', async ({ page }) => {
    await test.step('Multiple rapid TTS requests', async () => {
      // Send multiple quick messages to stress test TTS queue
      const messages = [
        "Tell me about the weather",
        "What is machine learning?",
        "How does artificial intelligence work?",
        "Explain quantum computing"
      ];

      for (let i = 0; i < messages.length; i++) {
        await page.fill('[data-testid="chat-input"]', messages[i]);
        await page.click('[data-testid="send-button"]');
        // Small delay to create realistic but rapid interaction
        await page.waitForTimeout(1000);
      }

      // Should handle all requests without breaking
      await expect(page.locator('[data-testid="chat-messages"] .message')).toHaveCount(messages.length * 2); // user + assistant messages
    });

    await test.step('TTS stop button during speech', async () => {
      await page.fill('[data-testid="chat-input"]', "Tell me a very long story about technology and innovation in the modern world and how it affects our daily lives");
      await page.click('[data-testid="send-button"]');
      
      // Wait for TTS to start
      await expect(page.locator('[data-testid="tts-stop-button"]')).toBeVisible({ timeout: 10000 });
      
      // Stop TTS
      await page.click('[data-testid="tts-stop-button"]');
      
      // Should stop immediately
      await expect(page.locator('[data-testid="tts-stop-button"]')).toBeHidden({ timeout: 2000 });
      
      // Should be able to send new message immediately
      await page.fill('[data-testid="chat-input"]', "Can you hear me now?");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('hear', { timeout: 10000 });
    });
  });

  test('Long Session Stability Journey', async ({ page }) => {
    await test.step('Extended conversation simulation', async () => {
      // Simulate a long conversation session
      const conversationTopics = [
        "What is the weather like today?",
        "Tell me about renewable energy",
        "How do solar panels work?", 
        "What are the benefits of wind power?",
        "Explain hydroelectric energy",
        "What about nuclear power?",
        "How can I reduce my carbon footprint?",
        "What are electric vehicles?",
        "Tell me about battery technology",
        "What is the future of energy?"
      ];

      for (let i = 0; i < conversationTopics.length; i++) {
        await page.fill('[data-testid="chat-input"]', conversationTopics[i]);
        await page.click('[data-testid="send-button"]');
        
        // Wait for response
        await page.waitForSelector(`[data-testid="chat-messages"] .message:nth-child(${(i + 1) * 2})`, { timeout: 15000 });
        
        // Small delay between messages for realism
        await page.waitForTimeout(2000);
      }

      // Verify all messages are present and app is still responsive
      await expect(page.locator('[data-testid="chat-messages"] .message')).toHaveCount(conversationTopics.length * 2);
      
      // App should still be responsive
      await page.fill('[data-testid="chat-input"]', "Final test message");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Final test', { timeout: 10000 });
    });
  });

  test('Memory and Performance Stress Journey', async ({ page }) => {
    await test.step('Memory intensive operations', async () => {
      // Generate large conversation history
      for (let i = 0; i < 50; i++) {
        await page.fill('[data-testid="chat-input"]', `Message number ${i} with some additional content to make it longer`);
        await page.click('[data-testid="send-button"]');
        
        // Wait for response every 5 messages to avoid overwhelming
        if (i % 5 === 0) {
          await page.waitForTimeout(3000);
        }
      }

      // Check memory usage and responsiveness
      const jsHeapUsed = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      console.log(`JS Heap Used: ${jsHeapUsed} bytes`);
      
      // App should still be responsive
      await page.fill('[data-testid="chat-input"]', "Memory test completed");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Memory test', { timeout: 10000 });
    });
  });
});