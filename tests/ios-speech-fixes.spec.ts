import { test, expect } from '@playwright/test';

test.describe('iOS Speech Fixes Verification', () => {
  test('should verify iOS speech functionality works end-to-end', async ({ page }) => {
    const logs: string[] = [];
    
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Test the complete speech flow
    await test.step('Complete LLM + TTS + Avatar Speech Flow', async () => {
      const input = page.locator('input[placeholder*="Press on mic or type"]');
      const askButton = page.getByTestId('ask-button');
      
      // Send a simple message
      await input.type('Hi');
      await askButton.click();
      
      // Wait for button to become disabled (processing started)
      await expect(askButton).toBeDisabled({ timeout: 10000 });
      
      // Wait for processing to complete
      await expect(askButton).toBeEnabled({ timeout: 60000 });
      
      // Check if response appeared
      const answerArea = page.locator('.text-xs.leading-relaxed');
      await expect(answerArea).toBeVisible({ timeout: 5000 });
      
      const responseText = await answerArea.textContent();
      console.log('Response received:', responseText?.substring(0, 100));
      
      // Verify response is not empty and not an error
      expect(responseText).toBeTruthy();
      expect(responseText).not.toContain('Error:');
      expect(responseText).not.toContain('(No response)');
    });
    
    // Check for iOS-specific logs
    const iosLogs = logs.filter(log => 
      log.includes('iOS') || 
      log.includes('AudioContext') || 
      log.includes('TTS') ||
      log.includes('compatibility') ||
      log.includes('audio fixes')
    );
    
    console.log('iOS-related logs found:', iosLogs.length);
    iosLogs.forEach(log => console.log('  -', log));
    
    // Check for errors
    const errorLogs = logs.filter(log => 
      log.includes('[error]') || 
      log.includes('Error:') ||
      log.includes('Failed')
    );
    
    if (errorLogs.length > 0) {
      console.log('Error logs found:', errorLogs);
    }
    
    // Verify no critical errors occurred
    const criticalErrors = errorLogs.filter(log => 
      log.includes('Audio context activation failed') ||
      log.includes('TTS synthesis failed') ||
      log.includes('Missing Azure')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
  
  test('should handle iOS Chrome specifically', async ({ page, context }) => {
    // This test is only for the 'iOS Chrome' project
    if (test.info().project.name !== 'iOS Chrome') {
      test.skip(true, "This test is only for the 'iOS Chrome' project");
      return;
    }

    const userAgent = await page.evaluate(() => navigator.userAgent);
    console.log(`User Agent for iOS Chrome test: ${userAgent}`);
    
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to load
    await page.waitForSelector('canvas', { timeout: 30000 });
    
    // Check if iOS Chrome warning appears
    await page.waitForTimeout(2000);
    const warning = page.locator('.bg-orange-500');
    
    if (await warning.isVisible()) {
      console.log('iOS Chrome warning displayed (as expected)');
    }
    
    // Test basic functionality
    const input = page.locator('input[placeholder*="Press on mic or type"]');
    const askButton = page.getByTestId('ask-button');
    
    await input.type('Test');
    await askButton.click();
    
    // Should still work despite iOS Chrome limitations
    await expect(askButton).toBeDisabled({ timeout: 5000 });
    await expect(askButton).toBeEnabled({ timeout: 60000 });
    
    // Check for iOS Chrome specific logs
    const iosChromeLogsCount = logs.filter(log => 
      log.includes('iOS Chrome') || 
      log.includes('CriOS') ||
      log.includes('WebKit')
    ).length;
    
    console.log('iOS Chrome specific logs found:', iosChromeLogsCount);
    expect(iosChromeLogsCount).toBeGreaterThan(0);
  });
});
