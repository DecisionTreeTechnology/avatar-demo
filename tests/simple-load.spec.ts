import { test, expect } from '@playwright/test';

test.describe('Simple App Load Test', () => {
  
  test('should load the app successfully', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that basic elements are present
    await expect(page.locator('.mobile-viewport')).toBeVisible({ timeout: 10000 });
    
    // Check for input and button
    await expect(page.locator('input[type="text"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="ask-button"]')).toBeVisible({ timeout: 10000 });
    
    // Check button text
    const buttonText = await page.locator('[data-testid="ask-button"]').textContent();
    expect(buttonText).toBe('Ask');
    
    console.log('✅ App loaded successfully with all basic elements');
  });

  test('should have working input field', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    
    // Type in the input
    await input.fill('Hello test');
    await expect(input).toHaveValue('Hello test');
    
    console.log('✅ Input field works correctly');
  });
});