import { test, expect } from '@playwright/test';

test.describe('Enhanced Animations and Personality System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load and avatar container to appear
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 30000 });
    
    // Wait additional time for avatar to initialize
    await page.waitForTimeout(3000);
  });

  test('should display fertility assistant personality by default', async ({ page }) => {
    // Check if fertility quick actions are visible (indicates fertility assistant personality)
    await expect(page.locator('text=Quick Support Options')).toBeVisible();
    
    // Check for fertility-specific quick actions
    await expect(page.locator('text=I\'m feeling overwhelmed')).toBeVisible();
    await expect(page.locator('text=Two week wait')).toBeVisible();
    await expect(page.locator('text=Need encouragement')).toBeVisible();
  });

  test('should show initial fertility assistant greeting', async ({ page }) => {
    // Wait for initial greeting to appear
    await page.waitForTimeout(2000);
    
    // Check for fertility assistant greeting
    const answerText = page.locator('text=/Hello.*support.*journey/i');
    await expect(answerText).toBeVisible({ timeout: 10000 });
  });

  test('should respond with fertility-specific support', async ({ page }) => {
    // Click on a fertility quick action
    await page.locator('text=I\'m feeling overwhelmed').click();
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check for supportive response
    const response = page.locator('[class*="overflow-auto"]').last();
    await expect(response).toContainText(/support|understand|journey|feelings/i, { timeout: 15000 });
  });

  test('should show animation controls panel', async ({ page }) => {
    // Open animation controls
    await page.locator('button[title="Show Animation Controls"]').click();
    
    // Check if personality section is visible
    await expect(page.locator('text=Personality')).toBeVisible();
    await expect(page.locator('text=Current:')).toBeVisible();
    await expect(page.locator('text=Fertility Assistant')).toBeVisible();
  });

  test('should allow personality switching', async ({ page }) => {
    // Open animation controls
    await page.locator('button[title="Show Animation Controls"]').click();
    
    // Switch to casual personality
    await page.locator('text=Casual').click();
    
    // Check if personality changed
    await expect(page.locator('text=Casual Friend')).toBeVisible();
    
    // Fertility quick actions should be hidden for non-fertility personalities
    await page.locator('button[title="Show Animation Controls"]').click(); // Close panel
    await expect(page.locator('text=Quick Support Options')).not.toBeVisible();
  });

  test('should apply emotions through control panel', async ({ page }) => {
    // Open animation controls
    await page.click('button[title="Show Animation Controls"]');
    
    // Test different emotions
    const emotions = ['happy', 'sad', 'excited', 'thinking'];
    
    for (const emotion of emotions) {
      await page.click(`button:has-text("${emotion}")`);
      
      // Wait a moment for animation to apply
      await page.waitForTimeout(500);
      
      // Verify emotion is selected (button should be highlighted)
      const emotionButton = page.locator(`button:has-text("${emotion}")`);
      await expect(emotionButton).toHaveClass(/bg-blue-600/);
    }
  });

  test('should trigger gestures through control panel', async ({ page }) => {
    // Open animation controls
    await page.click('button[title="Show Animation Controls"]');
    
    // Test different gestures
    const gestures = ['wave', 'nod', 'thumbs up', 'thinking'];
    
    for (const gesture of gestures) {
      // Click gesture button
      await page.click(`button:has-text("${gesture}")`);
      
      // Wait for gesture to complete
      await page.waitForTimeout(1000);
      
      // Verify no errors occurred (gesture button should still be clickable)
      const gestureButton = page.locator(`button:has-text("${gesture}")`);
      await expect(gestureButton).toBeEnabled();
    }
  });

  test('should test emotion recognition with fertility context', async ({ page }) => {
    // Type a message related to fertility stress
    const input = page.locator('input[type="text"]');
    await input.fill('I\'m really stressed about my upcoming fertility appointment');
    
    // Send message
    await page.locator('button:has-text("Send")').click();
    
    // Wait for response
    await page.waitForTimeout(8000);
    
    // Check for empathetic response
    const response = page.locator('[class*="overflow-auto"]').last();
    await expect(response).toContainText(/understand|stress|support|appointment/i, { timeout: 15000 });
  });

  test('should handle gesture triggers', async ({ page }) => {
    // Open animation controls
    await page.locator('button[title="Show Animation Controls"]').click();
    
    // Click on a gesture
    await page.locator('text=nod').click();
    
    // Animation should be triggered (we can't easily test the visual, but no errors should occur)
    await page.waitForTimeout(1000);
    
    // Test text analysis
    const textarea = page.locator('textarea');
    await textarea.fill('I am so happy and excited about this news!');
    await page.locator('button:has-text("Analyze & Apply")').click();
    
    // Check for analysis results
    await expect(page.locator('text=Last Analysis:')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Emotion:')).toBeVisible();
  });

  test('should maintain conversation context', async ({ page }) => {
    // Send first message
    const input = page.locator('input[type="text"]');
    await input.fill('Hello, I\'m new to fertility treatments');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(5000);
    
    // Send follow-up message
    await input.fill('I\'m feeling anxious about the process');
    await page.locator('button:has-text("Send")').click();
    await page.waitForTimeout(5000);
    
    // Check for contextual response that acknowledges the fertility journey
    const response = page.locator('[class*="overflow-auto"]').last();
    await expect(response).toContainText(/anxiety|process|journey|understand/i, { timeout: 15000 });
  });
});
