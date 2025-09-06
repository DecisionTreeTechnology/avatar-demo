import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('desktop layout shows buttons in header', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop should show feedback and settings buttons in header
    const headerFeedback = page.locator('[data-testid="header-feedback-button"]');
    const headerSettings = page.locator('[data-testid="header-settings-button"]');
    
    await expect(headerFeedback).toBeVisible();
    await expect(headerSettings).toBeVisible();
  });

  test('mobile layout hides desktop header buttons', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile should hide desktop header buttons
    const headerFeedback = page.locator('[data-testid="header-feedback-button"]');
    const headerSettings = page.locator('[data-testid="header-settings-button"]');
    
    await expect(headerFeedback).not.toBeVisible();
    await expect(headerSettings).not.toBeVisible();
  });

  test('sidebar works on both desktop and mobile', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="sidebar-toggle"]');
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('[data-testid="sidebar-toggle"]');
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();
  });
});