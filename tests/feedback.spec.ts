import { test, expect } from '@playwright/test';

test.describe('Feedback System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-history"]', { timeout: 10000 });
  });

  test('should display feedback button in chat bar', async ({ page }) => {
    const feedbackButton = page.locator('[data-testid="feedback-button"]');
    await expect(feedbackButton).toBeVisible();
    await expect(feedbackButton).toHaveAttribute('title', 'Share Feedback');
  });

  test('should open feedback modal when feedback button is clicked', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).toBeVisible();
    await expect(page.locator('text=Share Feedback')).toBeVisible();
  });

  test('should close feedback modal when close button is clicked', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    await page.click('[data-testid="close-feedback-modal"]');
    
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).not.toBeVisible();
  });

  test('should submit general feedback successfully', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    // Fill out feedback form
    await page.fill('[data-testid="feedback-comment"]', 'This is test feedback for Eva.');
    await page.click('[data-testid="submit-feedback"]');
    
    // Check that modal closed and toast appeared
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).not.toBeVisible();
    
    // Look for toast notification
    await expect(page.locator('text=Thank you for your feedback 💜')).toBeVisible({ timeout: 5000 });
  });

  test('should show email and contact checkbox when email is provided', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    // Initially, allow contact checkbox should not be visible
    await expect(page.locator('[data-testid="allow-contact"]')).not.toBeVisible();
    
    // Enter email
    await page.fill('[data-testid="feedback-email"]', 'test@example.com');
    
    // Now allow contact checkbox should be visible
    await expect(page.locator('[data-testid="allow-contact"]')).toBeVisible();
  });

  test('should not submit feedback without comment', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    const submitButton = page.locator('[data-testid="submit-feedback"]');
    await expect(submitButton).toBeDisabled();
  });

  // Note: Message feedback tests would require Eva to respond first
  // For now we test the UI components that are always available
  
  test('feedback modal should enforce character limits', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    // Fill with text longer than 500 characters
    const longText = 'a'.repeat(600);
    await page.fill('[data-testid="feedback-comment"]', longText);
    
    // Check that input was truncated to 500 chars
    const inputValue = await page.locator('[data-testid="feedback-comment"]').inputValue();
    expect(inputValue.length).toBe(500);
    
    // Check that character count is displayed
    await expect(page.locator('text=500/500')).toBeVisible();
  });

  test('feedback modal should validate email format', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    await page.fill('[data-testid="feedback-comment"]', 'Test feedback');
    await page.fill('[data-testid="feedback-email"]', 'invalid-email');
    
    // Try to submit - should not work with invalid email
    await page.click('[data-testid="submit-feedback"]');
    
    // Modal should still be visible (didn't submit due to HTML5 validation)
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should handle feedback submission with valid email and consent', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    
    await page.fill('[data-testid="feedback-comment"]', 'Test feedback with email');
    await page.fill('[data-testid="feedback-email"]', 'test@example.com');
    await page.check('[data-testid="allow-contact"]');
    
    await page.click('[data-testid="submit-feedback"]');
    
    // Modal should close and toast should appear
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).not.toBeVisible();
    await expect(page.locator('text=Thank you for your feedback 💜')).toBeVisible({ timeout: 5000 });
  });

  test('toast notifications should be dismissible', async ({ page }) => {
    await page.click('[data-testid="feedback-button"]');
    await page.fill('[data-testid="feedback-comment"]', 'Test feedback');
    await page.click('[data-testid="submit-feedback"]');
    
    // Wait for specific toast message to appear
    const toastMessage = page.locator('text=Thank you for your feedback 💜');
    await expect(toastMessage).toBeVisible({ timeout: 5000 });
    
    // Find the toast container and close button
    const toastContainer = page.locator('[data-testid="toast-container"]');
    await expect(toastContainer).toBeVisible();
    
    const closeButton = page.locator('[data-testid^="toast-close-"]').first();
    await closeButton.click();
    
    // Toast message should disappear
    await expect(toastMessage).not.toBeVisible({ timeout: 2000 });
  });
});