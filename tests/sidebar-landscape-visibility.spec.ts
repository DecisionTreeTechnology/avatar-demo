import { test, expect } from '@playwright/test';

test.describe('Sidebar Landscape Visibility', () => {
  test('sidebar should be visible and properly positioned in landscape mode', async ({ page }) => {
    // Set landscape viewport (iPhone landscape)
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check initial sidebar state
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toBeVisible(); // Should exist in DOM
    
    // Initially should be hidden (translated off-screen)
    const sidebarInitialTransform = await sidebar.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.transform;
    });
    console.log('Initial sidebar transform:', sidebarInitialTransform);

    // Click hamburger menu
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await expect(hamburgerButton).toBeVisible();
    await hamburgerButton.click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Check if sidebar is now visible and properly positioned
    const sidebarBox = await sidebar.boundingBox();
    console.log('Sidebar bounding box after click:', sidebarBox);

    // Check sidebar transform after opening
    const sidebarOpenTransform = await sidebar.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        transform: styles.transform,
        left: styles.left,
        top: styles.top,
        zIndex: styles.zIndex,
        position: styles.position,
        width: styles.width,
        height: styles.height,
        visibility: styles.visibility,
        opacity: styles.opacity
      };
    });
    console.log('Sidebar styles when open:', sidebarOpenTransform);

    // Check if isMobile detection affects sidebar
    const isDetectedAsMobile = await page.evaluate(() => {
      return window.innerWidth < 768;
    });
    console.log('Is detected as mobile in landscape:', isDetectedAsMobile);
    console.log('Window dimensions:', await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })));

    // Check if sidebar content is accessible
    const sidebarFeedback = page.locator('[data-testid="sidebar-feedback"]');
    const sidebarSettings = page.locator('[data-testid="sidebar-settings"]');
    
    await expect(sidebarFeedback).toBeVisible();
    await expect(sidebarSettings).toBeVisible();

    // Try clicking a sidebar item
    await sidebarFeedback.click();
    
    // Should close sidebar and open feedback modal
    await page.waitForTimeout(300);
    const feedbackModal = page.locator('[data-testid="feedback-modal"]');
    await expect(feedbackModal).toBeVisible();
  });

  test('check backdrop behavior in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if backdrop appears based on mobile detection
    const isDetectedAsMobile = await page.evaluate(() => window.innerWidth < 768);
    
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await hamburgerButton.click();
    await page.waitForTimeout(300);

    const backdrop = page.locator('[data-testid="sidebar-backdrop"]');
    
    if (isDetectedAsMobile) {
      await expect(backdrop).toBeVisible();
    } else {
      await expect(backdrop).not.toBeVisible();
    }

    console.log('Mobile detection in landscape:', isDetectedAsMobile);
    console.log('Backdrop should be visible:', isDetectedAsMobile);
  });
});