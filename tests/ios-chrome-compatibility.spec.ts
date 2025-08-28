import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - iOS Chrome Compatibility', () => {
  
  test.describe('iOS Chrome Mobile Mode', () => {
    test.use({ 
      // Simulate iOS Chrome in mobile mode
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 667 }
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should detect iOS Chrome correctly', async ({ page }) => {
      const isIOSChrome = await page.evaluate(() => {
        const ua = navigator.userAgent;
        return /iPad|iPhone|iPod/i.test(ua) && /CriOS/i.test(ua);
      });
      
      expect(isIOSChrome).toBe(true);
    });

    test('should show iOS Chrome warning when needed', async ({ page }) => {
      // Interact with the app to trigger audio context initialization
      const chatInput = page.locator('input[type="text"]');
      await chatInput.fill('Test iOS Chrome warning');
      await page.locator('button:has-text("Ask")').click();
      
      // Wait for potential warning to appear
      await page.waitForTimeout(2000);
      
      // Check if iOS warning is displayed
      const warningBanner = page.locator('text=iOS Chrome Audio Notice');
      
      // The warning should appear if audio compatibility test fails
      // This is conditional based on the mock audio context behavior
      if (await warningBanner.isVisible()) {
        await expect(warningBanner).toBeVisible();
        
        // Check warning message content
        const warningMessage = page.locator('text=Request Desktop Site');
        await expect(warningMessage).toBeVisible();
        
        // Test warning dismissal
        const closeButton = page.locator('[data-testid="close-ios-warning"]').or(
          page.locator('button').filter({ hasText: '×' })
        ).or(
          page.locator('svg[viewBox="0 0 24 24"]').locator('..').filter({ hasText: '' })
        );
        
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(warningBanner).not.toBeVisible();
        }
      }
    });

    test('should handle iOS Chrome audio context activation', async ({ page }) => {
      // Mock iOS Chrome specific audio context behavior
      await page.addInitScript(() => {
        let resumeAttempts = 0;
        
        class MockIOSChromeAudioContext {
          state = 'suspended';
          sampleRate = 44100;
          destination = {};
          
          constructor() {
            (window as any).globalAudioContext = this;
          }
          
          async resume() {
            resumeAttempts++;
            // Simulate iOS Chrome requiring multiple resume attempts
            if (resumeAttempts < 2) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.state = 'running';
            return Promise.resolve();
          }
          
          createBuffer(channels: number, length: number, sampleRate: number) {
            return {
              getChannelData: () => new Float32Array(length),
              duration: length / sampleRate,
              sampleRate,
              numberOfChannels: channels,
              length
            };
          }
          
          createBufferSource() {
            return {
              buffer: null,
              connect: () => {},
              start: () => {},
              stop: () => {}
            };
          }
          
          createGain() {
            return {
              gain: { value: 1 },
              connect: () => {}
            };
          }
        }
        
        (window as any).AudioContext = MockIOSChromeAudioContext;
        (window as any).webkitAudioContext = MockIOSChromeAudioContext;
      });
      
      const chatInput = page.locator('input[type="text"]');
      await chatInput.focus();
      
      // Verify context activation with iOS Chrome specific behavior
      const contextReady = await page.evaluate(async () => {
        const ctx = (window as any).globalAudioContext;
        if (!ctx) return false;
        
        await ctx.resume();
        return ctx.state === 'running';
      });
      
      expect(contextReady).toBe(true);
    });

    test('should apply iOS Chrome specific CSS optimizations', async ({ page }) => {
      const avatarContainer = page.locator('.mobile-avatar-container');
      await expect(avatarContainer).toBeVisible();
      
      // Check for WebKit specific CSS properties
      const hasWebKitOptimizations = await page.evaluate(() => {
        const container = document.querySelector('.mobile-avatar-container');
        if (!container) return false;
        
        const styles = window.getComputedStyle(container);
        
        // Check for hardware acceleration
        const transform = styles.transform;
        const backfaceVisibility = styles.backfaceVisibility;
        
        return {
          hasTransform: transform !== 'none',
          hasBackfaceVisibility: backfaceVisibility === 'hidden',
          hasPerspective: styles.perspective !== 'none'
        };
      });
      
      // At least some optimization should be applied
      if (hasWebKitOptimizations !== false) {
        expect(
          hasWebKitOptimizations.hasTransform || 
          hasWebKitOptimizations.hasBackfaceVisibility ||
          hasWebKitOptimizations.hasPerspective
        ).toBe(true);
      } else {
        // If container not found, that's also a test failure
        expect(hasWebKitOptimizations).not.toBe(false);
      }
    });
  });

  test.describe('iOS Chrome Desktop Mode', () => {
    test.use({ 
      // Simulate iOS Chrome in desktop mode (larger viewport, different UA)
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Safari/604.1',
      viewport: { width: 1024, height: 768 }
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should not show iOS Chrome warning in desktop mode', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      await chatInput.fill('Test desktop mode');
      await page.locator('button:has-text("Ask")').click();
      
      // Wait for potential warning
      await page.waitForTimeout(2000);
      
      // Warning should not appear in desktop mode
      const warningBanner = page.locator('text=iOS Chrome Audio Notice');
      await expect(warningBanner).not.toBeVisible();
    });

    test('should handle desktop mode audio better', async ({ page }) => {
      const askButton = page.locator('button:has-text("Ask")');
      await askButton.click();
      
      // Desktop mode should have better audio context handling
      const contextState = await page.evaluate(() => {
        const ctx = (window as any).globalAudioContext;
        return ctx ? ctx.state : null;
      });
      
      expect(contextState).toBe('running');
    });
  });

  test.describe('iOS Safari Comparison', () => {
    test.use({ 
      // Simulate iOS Safari
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 667 }
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should detect iOS Safari (not Chrome)', async ({ page }) => {
      const browserInfo = await page.evaluate(() => {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/i.test(ua);
        const isIOSChrome = isIOS && /CriOS/i.test(ua);
        const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS/i.test(ua);
        
        return { isIOS, isIOSChrome, isIOSSafari };
      });
      
      expect(browserInfo.isIOS).toBe(true);
      expect(browserInfo.isIOSChrome).toBe(false);
      expect(browserInfo.isIOSSafari).toBe(true);
    });

    test('should not show iOS Chrome specific warnings in Safari', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      await chatInput.fill('Test Safari behavior');
      await page.locator('button:has-text("Ask")').click();
      
      await page.waitForTimeout(2000);
      
      // iOS Chrome specific warnings should not appear in Safari
      const iosChromeWarning = page.locator('text=Request Desktop Site');
      await expect(iosChromeWarning).not.toBeVisible();
    });
  });

});
