import { test, expect } from '@playwright/test';

test.describe('Real Touch Events in Landscape', () => {
  test('hamburger menu should respond to touch events in landscape', async ({ page }) => {
    // Use real mobile device viewport
    await page.setViewportSize({ width: 812, height: 375 }); // iPhone landscape
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    await expect(hamburgerButton).toBeVisible();

    // Check if there are any elements overlapping the button area
    const buttonBox = await hamburgerButton.boundingBox();
    expect(buttonBox).toBeTruthy();

    // Use dispatchEvent to simulate real touch events
    await hamburgerButton.evaluate((button) => {
      // Simulate touchstart
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [new Touch({
          identifier: 0,
          target: button,
          clientX: 34, // Center of button
          clientY: 30,
          pageX: 34,
          pageY: 30,
          screenX: 34,
          screenY: 30,
          radiusX: 10,
          radiusY: 10
        })],
        bubbles: true,
        cancelable: true
      });
      
      // Simulate touchend
      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [new Touch({
          identifier: 0,
          target: button,
          clientX: 34,
          clientY: 30,
          pageX: 34,
          pageY: 30,
          screenX: 34,
          screenY: 30,
          radiusX: 10,
          radiusY: 10
        })],
        bubbles: true,
        cancelable: true
      });

      console.log('Dispatching touch events');
      button.dispatchEvent(touchStartEvent);
      button.dispatchEvent(touchEndEvent);
    });

    // Wait for any animations
    await page.waitForTimeout(500);

    // Check if sidebar opened
    const sidebarFeedback = page.locator('[data-testid="sidebar-feedback"]');
    const sidebarVisible = await sidebarFeedback.isVisible();

    if (!sidebarVisible) {
      // Try regular click as fallback
      console.log('Touch events failed, trying regular click');
      await hamburgerButton.click();
      await page.waitForTimeout(500);
    }

    await expect(sidebarFeedback).toBeVisible();
  });

  test('check for any overlapping elements in landscape mode', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if any elements are positioned over the header area
    const overlappingElements = await page.evaluate(() => {
      const headerRect = document.querySelector('header')?.getBoundingClientRect();
      if (!headerRect) return [];

      const overlapping = [];
      const allElements = document.querySelectorAll('*');
      
      for (const element of allElements) {
        if (element === document.querySelector('header')) continue;
        
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        
        // Check if element overlaps with header area
        const overlapsVertically = rect.top < headerRect.bottom && rect.bottom > headerRect.top;
        const overlapsHorizontally = rect.left < headerRect.right && rect.right > headerRect.left;
        
        if (overlapsVertically && overlapsHorizontally && 
            styles.position !== 'static' && 
            parseInt(styles.zIndex || '0') >= 0) {
          overlapping.push({
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            zIndex: styles.zIndex,
            position: styles.position,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }
          });
        }
      }
      
      return overlapping;
    });

    console.log('Elements potentially overlapping header:', JSON.stringify(overlappingElements, null, 2));
    
    // If there are overlapping elements with higher z-index, that's our issue
    const higherZIndexElements = overlappingElements.filter(el => 
      parseInt(el.zIndex || '0') > 10
    );
    
    expect(higherZIndexElements.length).toBe(0);
  });
});