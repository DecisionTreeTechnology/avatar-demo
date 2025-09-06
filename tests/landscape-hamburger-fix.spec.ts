import { test, expect } from '@playwright/test';

test.describe('Landscape Hamburger Menu Fix', () => {
  test('hamburger menu should be clickable in landscape mode', async ({ page }) => {
    // Set landscape viewport
    await page.setViewportSize({ width: 812, height: 375 }); // iPhone landscape dimensions
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the hamburger menu button
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await expect(hamburgerButton).toBeVisible();

    // Check if button is actually clickable by getting its bounding box and click position
    const buttonBox = await hamburgerButton.boundingBox();
    expect(buttonBox).toBeTruthy();
    
    // Try clicking the hamburger menu
    await hamburgerButton.click();

    // Wait for sidebar to open
    await page.waitForTimeout(500);

    // Verify sidebar opened by looking for sidebar content
    const sidebarFeedback = page.locator('[data-testid="sidebar-feedback"]');
    await expect(sidebarFeedback).toBeVisible();
  });

  test('hamburger menu should have proper z-index in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    
    // Check computed styles to ensure proper z-index
    const zIndex = await hamburgerButton.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.zIndex;
    });
    
    // Should have a high z-index to be clickable
    expect(parseInt(zIndex) >= 10).toBe(true);
  });

  test('header should not be hidden behind other elements in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Check that header is not overlapped by getting its position
    const headerBox = await header.boundingBox();
    expect(headerBox).toBeTruthy();
    expect(headerBox!.y).toBe(0); // Header should be at the top
  });
});