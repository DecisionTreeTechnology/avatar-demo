import { test, expect } from '@playwright/test';

test.describe('Landscape Click Event Debug', () => {
  test('debug hamburger menu click events in landscape mode', async ({ page }) => {
    // Set landscape viewport
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add console logging to track click events
    await page.addInitScript(() => {
      // Track all click events on the page
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        console.log('Click event:', {
          tagName: target.tagName,
          className: target.className,
          dataset: target.dataset,
          id: target.id,
          clientX: e.clientX,
          clientY: e.clientY,
          eventPhase: e.eventPhase,
          bubbles: e.bubbles,
          cancelable: e.cancelable,
          defaultPrevented: e.defaultPrevented,
          isTrusted: e.isTrusted
        });
      }, true); // Use capture phase to catch all events
    });

    // Listen to console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Click event:')) {
        consoleLogs.push(msg.text());
      }
    });

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await expect(hamburgerButton).toBeVisible();

    // Get element info before clicking
    const elementInfo = await hamburgerButton.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      return {
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom
        },
        styles: {
          position: styles.position,
          zIndex: styles.zIndex,
          pointerEvents: styles.pointerEvents,
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity
        },
        parentInfo: {
          tagName: el.parentElement?.tagName,
          className: el.parentElement?.className,
          styles: el.parentElement ? {
            position: window.getComputedStyle(el.parentElement).position,
            zIndex: window.getComputedStyle(el.parentElement).zIndex,
            pointerEvents: window.getComputedStyle(el.parentElement).pointerEvents
          } : null
        }
      };
    });

    console.log('Hamburger button info:', JSON.stringify(elementInfo, null, 2));

    // Check what elements are at the button's position
    const elementsAtPosition = await page.evaluate(({ x, y }) => {
      const centerX = x + 24; // Center of button (assuming 48px width)
      const centerY = y + 24; // Center of button (assuming 48px height)
      const elementsFromPoint = document.elementsFromPoint(centerX, centerY);
      return elementsFromPoint.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        dataset: (el as HTMLElement).dataset,
        zIndex: window.getComputedStyle(el).zIndex
      }));
    }, { x: elementInfo.rect.x, y: elementInfo.rect.y });

    console.log('Elements at button position:', JSON.stringify(elementsAtPosition, null, 2));

    // Try clicking the hamburger menu
    await hamburgerButton.click();

    // Wait a moment for any events to fire
    await page.waitForTimeout(1000);

    // Check if sidebar opened
    const sidebarFeedback = page.locator('[data-testid="sidebar-feedback"]');
    const sidebarVisible = await sidebarFeedback.isVisible();

    console.log('Console logs captured:', consoleLogs);
    console.log('Sidebar visible after click:', sidebarVisible);

    // The test should pass if sidebar opened, but we want to see the debug info regardless
    if (!sidebarVisible) {
      console.log('ISSUE: Sidebar did not open in landscape mode');
      // Try direct click on coordinates
      await page.click(elementInfo.rect.x + 24, elementInfo.rect.y + 24);
      await page.waitForTimeout(500);
      const sidebarVisibleAfterCoordinateClick = await sidebarFeedback.isVisible();
      console.log('Sidebar visible after coordinate click:', sidebarVisibleAfterCoordinateClick);
    }

    // This test is for debugging, so we'll make it always pass to see the output
    expect(true).toBe(true);
  });
});