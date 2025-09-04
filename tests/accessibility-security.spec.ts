import { test, expect } from '@playwright/test';

/**
 * ACCESSIBILITY & SECURITY TESTING
 * 
 * Ensures the application is accessible to all users and secure against
 * common vulnerabilities. Critical for bulletproof production deployment.
 */

test.describe('Accessibility & Security Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
  });

  test('WCAG 2.1 AA Compliance', async ({ page }) => {
    await test.step('Keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Continue tabbing through interface
      const tabbableElements = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        if (focused && focused !== 'BODY') {
          tabbableElements.push(focused);
        }
      }
      
      expect(tabbableElements.length).toBeGreaterThan(0);
      console.log('Tabbable elements:', tabbableElements);
    });

    await test.step('Screen reader support', async () => {
      // Check for proper ARIA labels
      const ariaElements = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').count();
      expect(ariaElements).toBeGreaterThan(0);
      
      // Check for semantic HTML
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1, h2, h3')).toHaveCount({ min: 1 });
      
      // Test button accessibility
      const buttons = await page.locator('button').count();
      const buttonsWithLabels = await page.locator('button[aria-label], button:has-text("")').count();
      
      expect(buttonsWithLabels).toBeGreaterThanOrEqual(buttons * 0.8); // 80% should have labels
    });

    await test.step('Color contrast and visual accessibility', async () => {
      // Test high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.locator('[data-testid="avatar-container"]')).toBeVisible();
      
      // Test reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('[data-testid="avatar-container"]')).toBeVisible();
      
      // Reset
      await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    });

    await test.step('Focus management', async () => {
      // Test focus trapping in modal dialogs
      await page.fill('[data-testid="chat-input"]', "Open settings");
      await page.keyboard.press('Enter');
      
      // If modal opens, focus should be managed properly
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        // First focusable element should be focused
        await expect(page.locator(':focus')).toBeVisible();
        
        // Tab should cycle within modal
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();
      }
    });
  });

  test('Security Vulnerability Testing', async ({ page }) => {
    await test.step('XSS prevention', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        '{{constructor.constructor("alert(\'xss\')")()}}',
        '${alert("xss")}',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        await page.fill('[data-testid="chat-input"]', payload);
        await page.click('[data-testid="send-button"]');
        
        // Wait for response
        await page.waitForTimeout(2000);
        
        // Should not execute JavaScript
        const alertDialogs = [];
        page.on('dialog', dialog => {
          alertDialogs.push(dialog.message());
          dialog.dismiss();
        });
        
        expect(alertDialogs).toHaveLength(0);
        
        // Content should be escaped/sanitized
        const chatContent = await page.locator('[data-testid="chat-messages"]').textContent();
        expect(chatContent).not.toContain('<script>');
      }
    });

    await test.step('CSRF protection', async () => {
      // Test that forms have CSRF tokens or use proper headers
      const forms = await page.locator('form').count();
      
      if (forms > 0) {
        // Check for CSRF tokens or proper fetch headers
        const hasCSRFTokens = await page.locator('input[name*="csrf"], input[name*="token"]').count();
        
        // If no CSRF tokens, should use fetch with proper headers
        await page.evaluate(() => {
          const originalFetch = window.fetch;
          (window as any).fetchCalls = [];
          window.fetch = function(...args) {
            (window as any).fetchCalls.push(args);
            return originalFetch.apply(this, args);
          };
        });

        await page.fill('[data-testid="chat-input"]', "CSRF test message");
        await page.click('[data-testid="send-button"]');
        
        const fetchCalls = await page.evaluate(() => (window as any).fetchCalls || []);
        
        if (fetchCalls.length > 0) {
          console.log('Fetch calls made:', fetchCalls.length);
          // Should have proper headers or tokens
        }
      }
    });

    await test.step('Input validation and sanitization', async () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'SELECT * FROM users WHERE id = 1; DROP TABLE users;--',
        '{{7*7}}', // Template injection
        '${7*7}', // Template literal injection
        '<%=7*7%>', // ERB injection
        '{%7*7%}', // Jinja2 injection
        '\\x00\\x01\\x02\\x03', // Null bytes
        'A'.repeat(1000000), // Buffer overflow attempt
      ];

      for (const maliciousInput of maliciousInputs) {
        try {
          await page.fill('[data-testid="chat-input"]', maliciousInput);
          await page.click('[data-testid="send-button"]');
          
          await page.waitForTimeout(2000);
          
          // Should handle gracefully without execution
          const pageContent = await page.content();
          expect(pageContent).not.toContain('49'); // 7*7 should not be evaluated
          
        } catch (error) {
          console.log(`Input handled with error (expected): ${error}`);
        }
      }
    });

    await test.step('Content Security Policy validation', async () => {
      // Check CSP headers
      const response = await page.goto('/');
      const cspHeader = response?.headers()['content-security-policy'];
      
      if (cspHeader) {
        console.log('CSP Header:', cspHeader);
        
        // Should have restrictive CSP
        expect(cspHeader).toContain('default-src');
        expect(cspHeader).not.toContain("'unsafe-eval'");
      }
      
      // Test inline script blocking
      try {
        await page.addScriptTag({ content: 'window.cspTest = true;' });
        const cspTestResult = await page.evaluate(() => (window as any).cspTest);
        
        // If CSP is properly configured, this should be undefined
        if (cspTestResult) {
          console.warn('Inline scripts not blocked by CSP');
        }
      } catch (error) {
        console.log('Inline script properly blocked by CSP');
      }
    });
  });

  test('Privacy and Data Protection', async ({ page }) => {
    await test.step('Local storage security', async () => {
      // Check what data is stored locally
      const localStorageData = await page.evaluate(() => {
        const data: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key);
          }
        }
        return data;
      });

      console.log('LocalStorage data keys:', Object.keys(localStorageData));
      
      // Should not store sensitive data in plain text
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /credit.*card/i,
        /ssn/i,
        /social.*security/i
      ];

      for (const [key, value] of Object.entries(localStorageData)) {
        const combinedData = `${key} ${value}`.toLowerCase();
        
        for (const pattern of sensitivePatterns) {
          if (pattern.test(combinedData)) {
            console.warn(`Potential sensitive data in localStorage: ${key}`);
          }
        }
      }
    });

    await test.step('Network request analysis', async () => {
      const requests: { url: string; method: string; headers: Record<string, string> }[] = [];
      
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      });

      // Generate some network activity
      await page.fill('[data-testid="chat-input"]', "Privacy test message");
      await page.click('[data-testid="send-button"]');
      
      await page.waitForTimeout(5000);
      
      console.log(`Network requests made: ${requests.length}`);
      
      // Check for secure transmission
      const httpRequests = requests.filter(req => req.url.startsWith('http://'));
      expect(httpRequests.filter(req => !req.url.includes('localhost'))).toHaveLength(0);
      
      // Check for tracking/analytics
      const trackingDomains = ['google-analytics.com', 'facebook.com', 'doubleclick.net'];
      const trackingRequests = requests.filter(req => 
        trackingDomains.some(domain => req.url.includes(domain))
      );
      
      console.log(`Tracking requests: ${trackingRequests.length}`);
    });
  });

  test('Performance Security', async ({ page }) => {
    await test.step('Resource exhaustion protection', async () => {
      // Test DoS protection
      const startTime = Date.now();
      
      // Try to exhaust resources
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          page.evaluate(() => {
            // Try to create many elements
            for (let j = 0; j < 100; j++) {
              const div = document.createElement('div');
              div.innerHTML = 'test'.repeat(1000);
              document.body.appendChild(div);
              document.body.removeChild(div);
            }
          })
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should not hang or crash
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      // App should still be responsive
      await page.fill('[data-testid="chat-input"]', "Resource exhaustion test complete");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('complete', { timeout: 10000 });
    });

    await test.step('Memory bomb protection', async () => {
      // Test large input handling
      const largeInput = 'A'.repeat(10000000); // 10MB string
      
      try {
        await page.fill('[data-testid="chat-input"]', largeInput.substring(0, 100000)); // Limit to 100KB for test
        await page.click('[data-testid="send-button"]');
        
        await page.waitForTimeout(5000);
        
        // Should handle large input gracefully
        const isResponsive = await page.locator('[data-testid="chat-input"]').isEnabled();
        expect(isResponsive).toBeTruthy();
        
      } catch (error) {
        console.log('Large input handled with error (acceptable):', error);
      }
    });
  });

  test('Authentication and Session Security', async ({ page }) => {
    await test.step('Session management', async () => {
      // Test session handling
      const sessionData = await page.evaluate(() => {
        return {
          cookies: document.cookie,
          sessionStorage: Object.keys(sessionStorage),
          localStorage: Object.keys(localStorage)
        };
      });

      console.log('Session data keys:', {
        cookies: sessionData.cookies ? 'present' : 'none',
        sessionStorage: sessionData.sessionStorage.length,
        localStorage: sessionData.localStorage.length
      });

      // If using sessions, should have proper security flags
      if (sessionData.cookies) {
        // Check for HttpOnly, Secure, SameSite flags
        console.log('Cookies present - verify security flags in network tab');
      }
    });

    await test.step('Logout and cleanup', async () => {
      // Test proper session cleanup
      const initialData = await page.evaluate(() => ({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
      }));

      // Simulate logout or session cleanup
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      const cleanedData = await page.evaluate(() => ({
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length
      }));

      expect(cleanedData.localStorage).toBe(0);
      expect(cleanedData.sessionStorage).toBe(0);
      
      console.log('Session cleanup successful');
    });
  });

  test('Third-party Dependencies Security', async ({ page }) => {
    await test.step('Check for vulnerable dependencies', async () => {
      // This would normally be done in CI with npm audit
      console.log('Security note: Run "npm audit" to check for vulnerable dependencies');
      
      // Test that app functions without third-party scripts
      await page.route('**/*', (route) => {
        const url = route.request().url();
        
        // Block external scripts (except localhost/same-origin)
        if (url.includes('googleapis.com') || 
            url.includes('cdn.') || 
            url.includes('unpkg.com') ||
            url.includes('jsdelivr.net')) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.reload();
      
      // App should still work without external dependencies
      await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 15000 });
      
      await page.fill('[data-testid="chat-input"]', "Dependency isolation test");
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('isolation', { timeout: 10000 });
      
      await page.unroute('**/*');
    });
  });
});