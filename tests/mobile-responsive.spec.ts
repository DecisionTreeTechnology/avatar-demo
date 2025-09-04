import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Mobile Responsive Design', () => {
  
  test.describe('Mobile Portrait (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should display properly on mobile portrait', async ({ page }) => {
      // Check main layout elements
      await expect(page.locator('.mobile-viewport')).toBeVisible();
      await expect(page.locator('.mobile-avatar-container')).toBeVisible();
      await expect(page.locator('.mobile-bottom-panel')).toBeVisible();
      
      // Check that avatar container takes up most of the space
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const avatarContainer = page.locator('.mobile-avatar-container');
      const avatarBox = await avatarContainer.boundingBox();
      
      expect(avatarBox).toBeTruthy();
      if (avatarBox) {
        expect(avatarBox.height).toBeGreaterThan(viewportHeight * 0.4); // At least 40% of viewport
      }
    });

    test('should have properly sized chat interface on mobile', async ({ page }) => {
      const bottomPanel = page.locator('.mobile-bottom-panel');
      await expect(bottomPanel).toBeVisible();
      
      // Check chat input is properly sized
      const chatInput = page.locator('input[type="text"]');
      const inputBox = await chatInput.boundingBox();
      
      expect(inputBox).toBeTruthy();
      if (inputBox) {
        expect(inputBox.width).toBeGreaterThan(200); // Reasonable width for mobile
        expect(inputBox.height).toBeGreaterThan(40);  // Touch-friendly height
      }
      
      // Check Ask button is touch-friendly
      const askButton = page.locator('[data-testid="ask-button"]');
      const buttonBox = await askButton.boundingBox();
      
      expect(buttonBox).toBeTruthy();
      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThan(40); // Touch-friendly height
        expect(buttonBox.width).toBeGreaterThan(60);   // Adequate width
      }
    });

    test('should handle safe area insets on mobile', async ({ page }) => {
      // Check if safe area CSS variables are applied
      const bottomPanel = page.locator('.mobile-bottom-panel');
      
      const safeAreaStyles = await bottomPanel.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          paddingBottom: styles.paddingBottom,
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight
        };
      });
      
      // Should have some padding (either safe area or fallback)
      expect(parseFloat(safeAreaStyles.paddingBottom)).toBeGreaterThan(0);
      expect(parseFloat(safeAreaStyles.paddingLeft)).toBeGreaterThan(0);
      expect(parseFloat(safeAreaStyles.paddingRight)).toBeGreaterThan(0);
    });

    test('should prevent horizontal scrolling on mobile', async ({ page }) => {
      const bodyOverflow = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        
        return {
          bodyOverflowX: window.getComputedStyle(body).overflowX,
          htmlOverflowX: window.getComputedStyle(html).overflowX,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth
        };
      });
      
      // Should not have horizontal scrolling
      expect(bodyOverflow.bodyScrollWidth).toBeLessThanOrEqual(bodyOverflow.bodyClientWidth + 5); // 5px tolerance
    });
  });

  test.describe('Mobile Landscape (667x375)', () => {
    test.use({ viewport: { width: 667, height: 375 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should adapt to landscape orientation', async ({ page }) => {
      const viewport = page.locator('.mobile-viewport');
      await expect(viewport).toBeVisible();
      
      // Check that layout adapts to landscape
      const viewportBox = await viewport.boundingBox();
      expect(viewportBox).toBeTruthy();
      
      if (viewportBox) {
        expect(viewportBox.width).toBeGreaterThan(viewportBox.height); // Landscape
      }
      
      // Bottom panel should still be accessible
      const bottomPanel = page.locator('.mobile-bottom-panel');
      await expect(bottomPanel).toBeVisible();
    });

    test('should maintain usable chat interface in landscape', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('[data-testid="ask-button"]');
      
      await expect(chatInput).toBeVisible();
      await expect(askButton).toBeVisible();
      
      // Should still be able to interact
      await chatInput.fill('Landscape test');
      await expect(chatInput).toHaveValue('Landscape test');
    });
  });

  test.describe('Tablet Portrait (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should scale appropriately for tablet', async ({ page }) => {
      const avatarContainer = page.locator('.mobile-avatar-container');
      await expect(avatarContainer).toBeVisible();
      
      // Check that avatar container is properly sized for tablet
      const containerBox = await avatarContainer.boundingBox();
      expect(containerBox).toBeTruthy();
      
      if (containerBox) {
        expect(containerBox.width).toBeGreaterThan(400); // Larger than mobile
        expect(containerBox.height).toBeGreaterThan(500);
      }
    });

    test('should have properly sized chat interface for tablet', async ({ page }) => {
      const bottomPanel = page.locator('.mobile-bottom-panel');
      const chatContainer = bottomPanel.locator('.glass');
      
      await expect(chatContainer).toBeVisible();
      
      // Check for max-width constraint on larger screens
      const containerBox = await chatContainer.boundingBox();
      expect(containerBox).toBeTruthy();
      
      if (containerBox) {
        // Should be constrained by max-width on larger screens
        expect(containerBox.width).toBeLessThanOrEqual(700); // Reasonable max width
      }
    });
  });

  test.describe('Large Mobile (414x896 - iPhone 11)', () => {
    test.use({ viewport: { width: 414, height: 896 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should utilize extra screen space effectively', async ({ page }) => {
      const avatarContainer = page.locator('.mobile-avatar-container');
      const avatarBox = await avatarContainer.boundingBox();
      
      expect(avatarBox).toBeTruthy();
      if (avatarBox) {
        // Should use the extra height effectively
        expect(avatarBox.height).toBeGreaterThan(600);
      }
    });

    test('should maintain proper proportions on large mobile', async ({ page }) => {
      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      }));
      
      expect(viewport.width).toBe(414);
      expect(viewport.height).toBe(896);
      
      // Check that elements scale appropriately
      const chatInput = page.locator('input[type="text"]');
      const inputBox = await chatInput.boundingBox();
      
      expect(inputBox).toBeTruthy();
      if (inputBox) {
        expect(inputBox.width).toBeGreaterThan(300); // Should use available width
      }
    });
  });

  test.describe('Cross-Device Consistency', () => {
    const devices = [
      { name: 'Small Mobile', width: 360, height: 640 },
      { name: 'Medium Mobile', width: 375, height: 667 },
      { name: 'Large Mobile', width: 414, height: 896 },
      { name: 'Small Tablet', width: 768, height: 1024 }
    ];

    devices.forEach(device => {
      test(`should maintain functionality on ${device.name}`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        await page.goto('/');
        
        // Basic functionality should work on all devices
        const chatInput = page.locator('input[type="text"]');
        const askButton = page.locator('[data-testid="ask-button"]');
        
        await expect(chatInput).toBeVisible();
        await expect(askButton).toBeVisible();
        
        // Should be able to type and interact
        await chatInput.fill(`Test on ${device.name}`);
        await expect(chatInput).toHaveValue(`Test on ${device.name}`);
        
        // Button should be clickable
        await expect(askButton).toBeEnabled();
      });
    });
  });

  test.describe('Touch Interactions', () => {
    test.use({ 
      viewport: { width: 375, height: 667 },
      hasTouch: true 
    });

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test('should handle touch events properly', async ({ page }) => {
      const chatInput = page.locator('input[type="text"]');
      const askButton = page.locator('[data-testid="ask-button"]');
      
      // Test touch interaction
      await chatInput.tap();
      await expect(chatInput).toBeFocused();
      
      await chatInput.fill('Touch test');
      await askButton.tap();
      
      // Should respond to touch
      await expect(page.locator('[data-testid="ask-button"]:has-text("Thinking...")').or(page.locator('[data-testid="ask-button"]:has-text("Speaking...")'))).toBeVisible();
    });

    test('should prevent zoom on double tap', async ({ page }) => {
      // Check that touch-action is set to prevent zoom
      const chatInput = page.locator('input[type="text"]');
      
      const touchAction = await chatInput.evaluate(el => {
        return window.getComputedStyle(el).touchAction;
      });
      
      // Should have touch-action that prevents zoom
      expect(touchAction).toMatch(/manipulation|pan-x|pan-y/);
    });

    test('should have touch-friendly button sizes', async ({ page }) => {
      const askButton = page.locator('[data-testid="ask-button"]');
      const buttonBox = await askButton.boundingBox();
      
      expect(buttonBox).toBeTruthy();
      if (buttonBox) {
        // Should meet minimum touch target size (44px)
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
      }
      
      // Check microphone button if present
      const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      if (await micButton.isVisible()) {
        const micBox = await micButton.boundingBox();
        expect(micBox).toBeTruthy();
        if (micBox) {
          expect(micBox.height).toBeGreaterThanOrEqual(44);
          expect(micBox.width).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

});
