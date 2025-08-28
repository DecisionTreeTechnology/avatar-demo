import { test, expect } from '@playwright/test';

test.describe('Quick Validation Tests', () => {
  test('should load app and find elements with correct selectors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
    
    // Check that our key elements are present
    const avatarContainer = page.locator('[data-testid="avatar-container"]');
    const askButton = page.locator('[data-testid="ask-button"]');
    const chatInput = page.locator('input[placeholder*="Press on mic or type"]');
    
    await expect(avatarContainer).toBeVisible();
    await expect(askButton).toBeVisible();
    await expect(chatInput).toBeVisible();
    
    // Check that the Ask button has the correct text
    await expect(askButton).toHaveText('Ask');
    
    // Check that clicking the button works (should not throw errors)
    await askButton.click();
    
    console.log('✅ All key elements found and functional');
  });
  
  test('should have chat history component when avatar is ready', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Chat history should be visible
    const chatHistory = page.locator('[data-testid="chat-history"]');
    await expect(chatHistory).toBeVisible();
    
    console.log('✅ Chat history component found');
  });
});
