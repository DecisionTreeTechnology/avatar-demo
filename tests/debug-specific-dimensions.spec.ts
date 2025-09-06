import { test, expect } from '@playwright/test';

test.describe('Debug Specific Dimensions 1500x711', () => {
  test('test sidebar behavior at 1500x711 dimensions', async ({ page }) => {
    // Set the exact problematic dimensions
    await page.setViewportSize({ width: 1500, height: 711 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check what the mobile detection logic determines
    const detectionValues = await page.evaluate(() => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const isLandscapeMobile = window.innerWidth > window.innerHeight && window.innerHeight < 500;
      const isMobileDevice = hasTouch || isSmallScreen || isLandscapeMobile;
      const isLargeDesktop = window.innerWidth > 1024 && window.innerHeight > 600 && !hasTouch;
      
      return {
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        hasTouch,
        isSmallScreen,
        isLandscapeMobile,
        isMobileDevice,
        isLargeDesktop
      };
    });
    
    console.log('Detection at 1500x711:', detectionValues);

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const sidebar = page.locator('[data-testid="app-sidebar"]');

    // Check initial state
    const initialClass = await sidebar.getAttribute('class');
    console.log('Initial sidebar class:', initialClass);

    // Try clicking hamburger
    await hamburgerButton.click();
    await page.waitForTimeout(500);

    // Check state after click
    const afterClickClass = await sidebar.getAttribute('class');
    console.log('After click sidebar class:', afterClickClass);

    // The test should fail if sidebar doesn't open
    expect(afterClickClass).toContain('translate-x-0');
  });

  test('create visual debug info for 1500x711', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 711 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add debug overlay
    await page.addInitScript(() => {
      setTimeout(() => {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-overlay';
        debugDiv.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          background: rgba(0,0,0,0.9);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          z-index: 9999;
          max-width: 300px;
        `;
        
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth < 768;
        const isLandscapeMobile = window.innerWidth > window.innerHeight && window.innerHeight < 500;
        const isMobileDevice = hasTouch || isSmallScreen || isLandscapeMobile;
        const isLargeDesktop = window.innerWidth > 1024 && window.innerHeight > 600 && !hasTouch;
        
        debugDiv.innerHTML = `
          <strong>Debug Info (1500x711)</strong><br>
          Size: ${window.innerWidth}x${window.innerHeight}<br>
          hasTouch: ${hasTouch}<br>
          isSmallScreen: ${isSmallScreen}<br>
          isLandscapeMobile: ${isLandscapeMobile}<br>
          isMobileDevice: ${isMobileDevice}<br>
          isLargeDesktop: ${isLargeDesktop}<br>
        `;
        
        document.body.appendChild(debugDiv);
      }, 1000);
    });

    // Wait for debug overlay to appear
    await page.waitForTimeout(2000);

    // Take a screenshot to see the debug info
    await page.screenshot({ 
      path: 'debug-1500x711.png', 
      fullPage: false 
    });

    console.log('Debug screenshot saved as debug-1500x711.png');
  });
});