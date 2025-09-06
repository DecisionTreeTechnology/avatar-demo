import { test, expect } from '@playwright/test';

test.describe('Sidebar Universal Access', () => {
  const testSizes = [
    { name: 'Small mobile', width: 375, height: 667 },
    { name: 'Large mobile', width: 414, height: 896 },
    { name: 'Tablet portrait', width: 768, height: 1024 },
    { name: 'Tablet landscape', width: 1024, height: 768 },
    { name: 'Laptop small', width: 1366, height: 768 },
    { name: 'Laptop large', width: 1500, height: 711 },
    { name: 'Desktop standard', width: 1920, height: 1080 },
    { name: 'Desktop large', width: 2560, height: 1440 },
    { name: 'Ultra-wide', width: 3440, height: 1440 }
  ];

  testSizes.forEach(({ name, width, height }) => {
    test(`sidebar should work on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
      const sidebar = page.locator('[data-testid="app-sidebar"]');

      // Check hamburger button exists
      await expect(hamburgerButton).toBeVisible();

      // Click hamburger menu
      await hamburgerButton.click();
      await page.waitForTimeout(500);

      // Check sidebar opened (has translate-x-0 class)
      const sidebarClass = await sidebar.getAttribute('class');
      expect(sidebarClass).toContain('translate-x-0');

      // Check sidebar content is accessible
      const feedbackButton = page.locator('[data-testid="sidebar-feedback"]');
      const settingsButton = page.locator('[data-testid="sidebar-settings"]');
      
      await expect(feedbackButton).toBeVisible();
      await expect(settingsButton).toBeVisible();

      console.log(`✅ ${name} (${width}x${height}): Sidebar works correctly`);
    });
  });

  test('sidebar should work on extremely large displays', async ({ page }) => {
    // Test an extremely large display
    await page.setViewportSize({ width: 5120, height: 2880 }); // 5K display
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const sidebar = page.locator('[data-testid="app-sidebar"]');

    await hamburgerButton.click();
    await page.waitForTimeout(500);

    const sidebarClass = await sidebar.getAttribute('class');
    expect(sidebarClass).toContain('translate-x-0');
    
    console.log('✅ 5K Display (5120x2880): Sidebar works correctly');
  });
});