import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Basic Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Avatar Demo/);
    
    // Check main containers are present
    await expect(page.locator('.mobile-viewport')).toBeVisible();
    await expect(page.locator('.mobile-avatar-container')).toBeVisible();
    await expect(page.locator('.mobile-bottom-panel')).toBeVisible();
  });

  test('should display avatar loading state initially', async ({ page }) => {
    // Check loading message is displayed
    const loadingMessage = page.locator('text=Loading avatar...');
    await expect(loadingMessage).toBeVisible();
    
    // Check container ref status
    const containerStatus = page.locator('text=Container ref:');
    await expect(containerStatus).toBeVisible();
  });

  test('should have functional chat input', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Check chat input is present and enabled
    const chatInput = page.locator('input[placeholder*="Press on mic or type"]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();
    
    // Check placeholder text
    await expect(chatInput).toHaveAttribute('placeholder', /Press on mic or type to share/);
    
    // Test typing in input
    await chatInput.fill('Hello, avatar!');
    await expect(chatInput).toHaveValue('Hello, avatar!');
  });

  test('should have Ask button that becomes disabled when busy', async ({ page }) => {
    const askButton = page.locator('button:has-text("Ask")');
    await expect(askButton).toBeVisible();
    await expect(askButton).toBeEnabled();
    
    // Type a message and click Ask
    const chatInput = page.locator('input[type="text"]');
    await chatInput.fill('Test message');
    
    // Click Ask button
    await askButton.click();
    
    // Button should become disabled and show busy state
    await expect(askButton).toBeDisabled();
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
  });

  test('should display microphone button when speech recognition is supported', async ({ page }) => {
    // Check if microphone button is present
    const micButton = page.locator('button svg').first();
    
    // The microphone button should be visible if speech recognition is supported
    // This depends on browser support, so we'll check conditionally
    const isSupported = await page.evaluate(() => {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    });
    
    if (isSupported) {
      await expect(micButton).toBeVisible();
    }
  });

  test('should handle keyboard interaction correctly', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    
    // Test Enter key submission
    await chatInput.fill('Test Enter key');
    await chatInput.press('Enter');
    
    // Input should be cleared after submission
    await expect(chatInput).toHaveValue('');
  });

  test('should show answer display area after interaction', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    await chatInput.fill('Hello');
    await askButton.click();
    
    // Wait for the answer display area to appear
    // This will happen after the LLM response
    await page.waitForSelector('.text-xs.leading-relaxed', { timeout: 30000 });
    
    const answerArea = page.locator('.text-xs.leading-relaxed');
    await expect(answerArea).toBeVisible();
  });

  test('should handle empty input correctly', async ({ page }) => {
    const askButton = page.locator('button:has-text("Ask")');
    
    // Click Ask with empty input
    await askButton.click();
    
    // Button should remain enabled (no action taken)
    await expect(askButton).toBeEnabled();
  });

  test('should maintain responsive design on different screen sizes', async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('.mobile-viewport')).toBeVisible();
    
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.mobile-avatar-container')).toBeVisible();
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.mobile-bottom-panel')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Check input accessibility
    await expect(chatInput).toHaveAttribute('autoComplete', 'off');
    await expect(chatInput).toHaveAttribute('autoCorrect', 'off');
    await expect(chatInput).toHaveAttribute('autoCapitalize', 'off');
    await expect(chatInput).toHaveAttribute('spellCheck', 'false');
    
    // Check button is properly labeled
    await expect(askButton).toHaveText('Ask');
  });

});
