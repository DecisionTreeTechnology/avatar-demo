import { test, expect } from '@playwright/test';

test.describe('Header Menu Buttons Fix', () => {
  test('hamburger menu (left) should be clickable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find the hamburger menu button (left side)
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await expect(hamburgerButton).toBeVisible();

    // Click the hamburger menu
    await hamburgerButton.click();

    // Wait for sidebar to open
    await page.waitForTimeout(500);

    // Verify sidebar opened by looking for sidebar content
    const sidebarFeedback = page.locator('[data-testid="sidebar-feedback"]');
    await expect(sidebarFeedback).toBeVisible();
  });

  test('should only show hamburger menu on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop should only have hamburger menu
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]');

    await expect(hamburgerButton).toBeVisible();
    await expect(mobileMenuButton).not.toBeVisible();

    // Test hamburger menu works
    await hamburgerButton.click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();
  });

  test('mobile should only show hamburger menu (clean design)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile should only have hamburger menu (no redundant three-dots)
    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]');

    await expect(hamburgerButton).toBeVisible();
    await expect(mobileMenuButton).not.toBeVisible();

    // Test hamburger menu works on mobile
    await hamburgerButton.click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();
  });
});