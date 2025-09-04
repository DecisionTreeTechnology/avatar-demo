import { test, expect } from '@playwright/test';

test.describe('iOS LLM Simple Debug', () => {
  test('should check basic LLM functionality on iOS', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Simple test: click Ask button and see what happens
    const input = page.locator('input[placeholder*="Press on mic or type"]');
    await input.fill('Hello');
    
    const askButton = page.locator('[data-testid="ask-button"]');
    
    // Check initial state
    const initiallyEnabled = await askButton.isEnabled();
    console.log('Ask button initially enabled:', initiallyEnabled);
    
    // Click and immediately check if it gets disabled
    await askButton.click();
    
    // Wait a short time and check state changes
    await page.waitForTimeout(1000);
    const disabledAfterClick = await askButton.isDisabled();
    console.log('Ask button disabled after 1s:', disabledAfterClick);
    
    // Wait longer and check again
    await page.waitForTimeout(3000);
    const stateAfter4s = await askButton.isDisabled();
    console.log('Ask button disabled after 4s:', stateAfter4s);
    
    // Check for errors
    const errorLogs = logs.filter(log => 
      log.toLowerCase().includes('error') || 
      log.toLowerCase().includes('failed')
    );
    
    if (errorLogs.length > 0) {
      console.log('Errors found:', errorLogs);
    }
    
    // Check for LLM-related logs
    const llmLogs = logs.filter(log => 
      log.includes('LLM') || 
      log.includes('chat') ||
      log.includes('openai') ||
      log.includes('Azure')
    );
    
    if (llmLogs.length > 0) {
      console.log('LLM-related logs:', llmLogs);
    }
    
    // Print last 10 logs for debugging
    console.log('Recent logs:', logs.slice(-10));
  });
});
