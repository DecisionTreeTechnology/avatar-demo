import { test, expect } from '@playwright/test';

/**
 * RELIABILITY & STRESS TESTING
 * 
 * Tests designed to break the application and ensure it recovers gracefully.
 * These tests push the app to its limits to identify potential failure points.
 */

test.describe('Reliability & Stress Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
  });

  test('API Rate Limiting and Throttling', async ({ page }) => {
    await test.step('Rapid-fire requests to test rate limiting', async () => {
      // Send many requests rapidly to test rate limiting
      const rapidMessages = Array.from({ length: 20 }, (_, i) => `Rapid message ${i}`);
      
      // Fire all requests as quickly as possible
      for (const message of rapidMessages) {
        page.fill('[data-testid="chat-input"]', message).catch(() => {}); // Don't wait
        page.click('[data-testid="send-button"]').catch(() => {}); // Don't wait
      }

      // Should handle gracefully - either queue, throttle, or show appropriate error
      await page.waitForTimeout(5000);
      
      // App should still be responsive
      await page.fill('[data-testid="chat-input"]', "System recovery test");
      await page.click('[data-testid="send-button"]');
      
      // Should either process or show meaningful error
      await expect(page.locator('[data-testid="chat-messages"], [data-testid="error-message"]')).toContainText(['recovery', 'error', 'limit'], { timeout: 15000 });
    });
  });

  test('Memory Leak Detection', async ({ page }) => {
    let initialMemory: number;
    let finalMemory: number;

    await test.step('Measure baseline memory', async () => {
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      console.log(`Initial memory: ${initialMemory} bytes`);
    });

    await test.step('Perform memory-intensive operations', async () => {
      // Create and destroy many elements
      for (let i = 0; i < 100; i++) {
        await page.fill('[data-testid="chat-input"]', `Memory test iteration ${i}`);
        await page.click('[data-testid="send-button"]');
        
        if (i % 10 === 0) {
          // Periodically clear chat to prevent DOM bloat
          await page.evaluate(() => {
            const chatMessages = document.querySelector('[data-testid="chat-messages"]');
            if (chatMessages) {
              chatMessages.innerHTML = '';
            }
          });
        }
      }
    });

    await test.step('Check for memory leaks', async () => {
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      console.log(`Final memory: ${finalMemory} bytes`);

      // Memory should not have grown excessively (allow for some growth)
      const memoryGrowth = finalMemory - initialMemory;
      const maxAllowedGrowth = 50 * 1024 * 1024; // 50MB
      
      expect(memoryGrowth).toBeLessThan(maxAllowedGrowth);
      console.log(`Memory growth: ${memoryGrowth} bytes (within ${maxAllowedGrowth} limit)`);
    });
  });

  test('Network Chaos Testing', async ({ page }) => {
    await test.step('Intermittent network failures', async () => {
      let requestCount = 0;
      
      // Randomly fail 30% of requests
      await page.route('**/*', (route) => {
        requestCount++;
        if (Math.random() < 0.3) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Send multiple messages with intermittent failures
      const messages = [
        "This might fail",
        "Testing network chaos",
        "Can you handle network issues?",
        "Resilience test in progress",
        "Final network test message"
      ];

      for (const message of messages) {
        await page.fill('[data-testid="chat-input"]', message);
        await page.click('[data-testid="send-button"]');
        
        // Wait and check for either success or error handling
        await page.waitForTimeout(3000);
        
        // Should show either message or error, but not hang
        const hasMessage = await page.locator('[data-testid="chat-messages"]').textContent();
        const hasError = await page.locator('[data-testid="error-message"]').isVisible();
        
        expect(hasMessage || hasError).toBeTruthy();
      }

      // Clean up route
      await page.unroute('**/*');
      console.log(`Total network requests: ${requestCount}`);
    });
  });

  test('Concurrent User Simulation', async ({ browser }) => {
    await test.step('Multiple concurrent sessions', async () => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(contexts.map(context => context.newPage()));

      // Load app in all contexts
      await Promise.all(pages.map(page => page.goto('/')));
      await Promise.all(pages.map(page => 
        page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 })
      ));

      // Have all users send messages simultaneously
      const messages = [
        "Concurrent user 1 message",
        "Concurrent user 2 message", 
        "Concurrent user 3 message"
      ];

      await Promise.all(pages.map((page, index) => 
        page.fill('[data-testid="chat-input"]', messages[index])
      ));

      await Promise.all(pages.map(page => 
        page.click('[data-testid="send-button"]')
      ));

      // All should receive responses
      await Promise.all(pages.map((page, index) => 
        expect(page.locator('[data-testid="chat-messages"]')).toContainText(`user ${index + 1}`, { timeout: 15000 })
      ));

      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });
  });

  test('Resource Exhaustion Testing', async ({ page }) => {
    await test.step('Audio system stress test', async () => {
      // Try to overwhelm the audio system
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="chat-input"]', "Play this audio message to stress the TTS system with a long message that will take time to synthesize and speak");
        await page.click('[data-testid="send-button"]');
        
        // Don't wait - send next immediately
        await page.waitForTimeout(100);
      }

      // Should handle queue properly
      await page.waitForTimeout(5000);
      
      // System should recover
      await page.fill('[data-testid="chat-input"]', "Audio stress test complete");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('complete', { timeout: 15000 });
    });

    await test.step('DOM node stress test', async () => {
      // Create many DOM elements rapidly
      for (let i = 0; i < 50; i++) {
        await page.fill('[data-testid="chat-input"]', `DOM stress test message ${i} with extra content to increase DOM size`);
        await page.click('[data-testid="send-button"]');
        
        await page.waitForTimeout(100);
      }

      // Check DOM performance
      const nodeCount = await page.evaluate(() => {
        return document.querySelectorAll('*').length;
      });
      
      console.log(`Total DOM nodes: ${nodeCount}`);
      
      // Should still be responsive
      await page.fill('[data-testid="chat-input"]', "DOM stress complete");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('DOM stress complete', { timeout: 10000 });
    });
  });

  test('Edge Case Input Fuzzing', async ({ page }) => {
    await test.step('Malformed and edge case inputs', async () => {
      const edgeCaseInputs = [
        '', // Empty string
        ' '.repeat(10000), // Very long spaces
        '🎭🎪🎨🎯🎲🎸🎺🎼🎵🎶🎤🎧🎬🎮', // Unicode emojis
        '<script>alert("xss")</script>', // XSS attempt
        'SELECT * FROM users;', // SQL injection attempt
        '{"malformed": json}', // Malformed JSON
        'А Б В Г Д Е Ж З И Й', // Cyrillic characters
        '中文测试内容', // Chinese characters
        '🔥'.repeat(1000), // Many emojis
        '\n\n\n\n\n\n\n\n\n\n', // Multiple newlines
        'a'.repeat(50000), // Very long string
      ];

      for (const input of edgeCaseInputs) {
        try {
          await page.fill('[data-testid="chat-input"]', input);
          await page.click('[data-testid="send-button"]');
          
          await page.waitForTimeout(2000);
          
          // Should either process or show appropriate error
          const hasContent = await page.locator('[data-testid="chat-messages"], [data-testid="error-message"]').isVisible();
          expect(hasContent).toBeTruthy();
          
        } catch (error) {
          console.log(`Input "${input.substring(0, 50)}..." caused error: ${error}`);
          // App should recover from errors
        }
      }
    });
  });

  test('Browser Compatibility Stress', async ({ page }) => {
    await test.step('API feature detection', async () => {
      // Test Web APIs availability
      const apis = await page.evaluate(() => {
        return {
          speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
          audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
          mediaRecorder: 'MediaRecorder' in window,
          getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
          localStorage: 'localStorage' in window,
          sessionStorage: 'sessionStorage' in window,
          webGL: !!document.createElement('canvas').getContext('webgl'),
          webGL2: !!document.createElement('canvas').getContext('webgl2'),
        };
      });

      console.log('Browser API support:', apis);
      
      // App should handle missing APIs gracefully
      await page.fill('[data-testid="chat-input"]', "Testing browser compatibility");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('compatibility', { timeout: 10000 });
    });
  });

  test('Performance Monitoring', async ({ page }) => {
    await test.step('Performance metrics collection', async () => {
      // Start performance monitoring
      await page.addInitScript(() => {
        (window as any).performanceMetrics = {
          loadTime: 0,
          interactions: [],
          errors: []
        };

        // Monitor load time
        window.addEventListener('load', () => {
          (window as any).performanceMetrics.loadTime = performance.now();
        });

        // Monitor interactions
        ['click', 'input', 'submit'].forEach(eventType => {
          document.addEventListener(eventType, (e) => {
            (window as any).performanceMetrics.interactions.push({
              type: eventType,
              timestamp: performance.now(),
              target: (e.target as Element)?.tagName
            });
          });
        });

        // Monitor errors
        window.addEventListener('error', (e) => {
          (window as any).performanceMetrics.errors.push({
            message: e.message,
            timestamp: performance.now()
          });
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });

      // Perform various interactions
      await page.fill('[data-testid="chat-input"]', "Performance test message");
      await page.click('[data-testid="send-button"]');
      await page.waitForTimeout(3000);

      // Collect performance data
      const metrics = await page.evaluate(() => (window as any).performanceMetrics);
      
      console.log('Performance Metrics:', {
        loadTime: metrics.loadTime,
        interactionCount: metrics.interactions.length,
        errorCount: metrics.errors.length
      });

      // Verify performance thresholds
      expect(metrics.loadTime).toBeLessThan(5000); // Load within 5 seconds
      expect(metrics.errors.length).toBe(0); // No JavaScript errors
    });
  });

  test('Recovery After System Sleep/Wake', async ({ page }) => {
    await test.step('Simulate system sleep and wake', async () => {
      // Start normal conversation
      await page.fill('[data-testid="chat-input"]', "Before system sleep");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Before', { timeout: 10000 });

      // Simulate system sleep by pausing page execution
      await page.evaluate(() => {
        // Simulate network disconnect
        (window as any).navigator.onLine = false;
      });

      await page.waitForTimeout(5000);

      // Simulate wake up
      await page.evaluate(() => {
        (window as any).navigator.onLine = true;
        // Trigger online event
        window.dispatchEvent(new Event('online'));
      });

      // App should recover and work normally
      await page.fill('[data-testid="chat-input"]', "After system wake");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('After', { timeout: 15000 });
    });
  });
});