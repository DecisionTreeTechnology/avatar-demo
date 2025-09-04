import { test, expect } from '@playwright/test';

test.describe('iOS Input Debug', () => {
  test('should check input field behavior on iOS', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    const input = page.locator('input[placeholder*="Press on mic or type"]');
    
    // Test basic input behavior
    console.log('Testing input field behavior...');
    
    // Check initial state
    const initialValue = await input.inputValue();
    console.log('Initial input value:', initialValue);
    
    // Fill with text
    await input.fill('Hello');
    const afterFillValue = await input.inputValue();
    console.log('After fill value:', afterFillValue);
    
    // Check if value persists
    await page.waitForTimeout(1000);
    const afterWaitValue = await input.inputValue();
    console.log('After wait value:', afterWaitValue);
    
    // Try clicking the input to focus it
    await input.click();
    const afterClickValue = await input.inputValue();
    console.log('After click value:', afterClickValue);
    
    // Try typing instead of filling
    await input.clear();
    await input.type('World');
    const afterTypeValue = await input.inputValue();
    console.log('After type value:', afterTypeValue);
    
    // Now try clicking Ask button
    const askButton = page.locator('[data-testid="ask-button"]');
    await askButton.click();
    
    // Wait and check logs
    await page.waitForTimeout(2000);
    
    const chatBarLogs = logs.filter(log => log.includes('[ChatBar]'));
    console.log('ChatBar logs:', chatBarLogs);
    
    // Check input attributes
    const inputAttributes = await input.evaluate(el => {
      const inputEl = el as HTMLInputElement;
      return {
        value: inputEl.value,
        autocorrect: inputEl.getAttribute('autocorrect'),
        autocapitalize: inputEl.getAttribute('autocapitalize'),
        spellcheck: inputEl.getAttribute('spellcheck'),
        autoComplete: inputEl.getAttribute('autocomplete'),
        disabled: inputEl.disabled,
        type: inputEl.type
      };
    });
    
    console.log('Input attributes:', inputAttributes);
  });
});
