import { test, expect } from '@playwright/test';

test.describe('Simple Sidebar Debug', () => {
  test('check sidebar classes and state in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const sidebar = page.locator('[data-testid="app-sidebar"]');

    // Check initial classes
    const initialClass = await sidebar.getAttribute('class');
    console.log('Initial sidebar class:', initialClass);

    // Click hamburger
    await hamburgerButton.click();
    await page.waitForTimeout(500); // Wait for animation

    // Check classes after click
    const afterClickClass = await sidebar.getAttribute('class');
    console.log('After click sidebar class:', afterClickClass);

    // Check computed styles
    const computedStyles = await sidebar.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        transform: styles.transform,
        left: styles.left,
        display: styles.display,
        visibility: styles.visibility,
        zIndex: styles.zIndex,
        width: styles.width
      };
    });
    console.log('Computed styles:', computedStyles);

    // Check if classes contain the right values
    expect(afterClickClass).toContain('translate-x-0');
    expect(afterClickClass).not.toContain('-translate-x-full');
  });
});