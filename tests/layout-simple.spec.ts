import { test, expect } from '@playwright/test';

test.describe('Layout Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have Eva header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Eva');
  });

  test('should have sidebar toggle', async ({ page }) => {
    const toggle = page.locator('[data-testid="sidebar-toggle"]');
    await expect(toggle).toBeVisible();
  });

  test('should have clean chat input without old buttons', async ({ page }) => {
    // Old buttons should not exist in chat area
    await expect(page.locator('.btn-base').filter({ hasText: 'Feedback' })).not.toBeVisible();
    await expect(page.locator('.btn-base').filter({ hasText: 'Settings' })).not.toBeVisible();
  });

  test('sidebar opens when toggle is clicked', async ({ page }) => {
    await page.click('[data-testid="sidebar-toggle"]');
    await page.waitForTimeout(300);
    
    // Should see sidebar content
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-settings"]')).toBeVisible();
  });
});