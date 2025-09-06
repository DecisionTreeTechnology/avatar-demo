import { test, expect } from '@playwright/test';

test.describe('ChatGPT-style Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('[data-testid="chat-history"]', { timeout: 10000 });
  });

  test('should display header with Eva branding', async ({ page }) => {
    // Check Eva branding in header
    await expect(page.locator('h1:has-text("Eva")')).toBeVisible();
    await expect(page.locator('header span:has-text("Fertility Companion")')).toBeVisible();
  });

  test('should have sidebar toggle button in header', async ({ page }) => {
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    await expect(sidebarToggle).toBeVisible();
  });

  test('should open sidebar when toggle is clicked', async ({ page }) => {
    // Initially sidebar should be closed
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
    
    // Click toggle
    await page.click('[data-testid="sidebar-toggle"]');
    
    // Wait for animation and check sidebar is open
    await page.waitForTimeout(500); // Wait for animation
    await expect(sidebar).toHaveClass(/translate-x-0/);
  });

  test('should show feedback and settings options in sidebar', async ({ page }) => {
    // Open sidebar
    await page.click('[data-testid="sidebar-toggle"]');
    
    // Check for menu items
    await expect(page.locator('[data-testid="sidebar-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-settings"]')).toBeVisible();
  });

  test('should close sidebar when close button is clicked', async ({ page }) => {
    // Open sidebar
    await page.click('[data-testid="sidebar-toggle"]');
    
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toHaveClass(/translate-x-0/);
    
    // Close sidebar
    await page.click('[data-testid="sidebar-close"]');
    
    // Sidebar should be closed
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('should show desktop header buttons on large screens', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1024, height: 768 });
    
    const feedbackButton = page.locator('[data-testid="header-feedback-button"]');
    const settingsButton = page.locator('[data-testid="header-settings-button"]');
    
    await expect(feedbackButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
  });

  test('should open feedback modal from sidebar', async ({ page }) => {
    // Open sidebar and click feedback
    await page.click('[data-testid="sidebar-toggle"]');
    await page.click('[data-testid="sidebar-feedback"]');
    
    // Modal should open
    const modal = page.locator('[data-testid="feedback-modal"]');
    await expect(modal).toBeVisible();
  });

  test('should close sidebar on mobile when clicking backdrop', async ({ page }) => {
    // Set to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open sidebar
    await page.click('[data-testid="sidebar-toggle"]');
    
    const sidebar = page.locator('[data-testid="app-sidebar"]');
    await expect(sidebar).toHaveClass(/translate-x-0/);
    
    // Click backdrop
    await page.click('[data-testid="sidebar-backdrop"]');
    
    // Sidebar should close
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('chat input should be clean without buttons', async ({ page }) => {
    // The old feedback and settings buttons should not be in the chat bar
    const chatBar = page.locator('.btn-base:has-text("Feedback")');
    await expect(chatBar).not.toBeVisible();
    
    const settingsInChat = page.locator('.btn-base:has-text("Settings")');  
    await expect(settingsInChat).not.toBeVisible();
  });
});