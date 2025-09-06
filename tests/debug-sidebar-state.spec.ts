import { test, expect } from '@playwright/test';

test.describe('Debug Sidebar State', () => {
  test('debug sidebar state management in landscape', async ({ page }) => {
    // Set landscape viewport
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Add debugging to window object
    await page.addInitScript(() => {
      // Expose React component state debugging
      (window as any).debugSidebar = () => {
        const sidebarElement = document.querySelector('[data-testid="app-sidebar"]');
        if (sidebarElement) {
          const styles = window.getComputedStyle(sidebarElement);
          return {
            transform: styles.transform,
            className: sidebarElement.className,
            boundingBox: sidebarElement.getBoundingClientRect()
          };
        }
        return null;
      };
    });

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    const sidebar = page.locator('[data-testid="app-sidebar"]');

    // Check initial state
    console.log('=== INITIAL STATE ===');
    const initialDebug = await page.evaluate(() => (window as any).debugSidebar());
    console.log('Initial sidebar:', initialDebug);

    // Click hamburger menu
    console.log('=== CLICKING HAMBURGER MENU ===');
    await hamburgerButton.click();
    
    // Wait for state update
    await page.waitForTimeout(100);

    // Check state after click (before animation completes)
    const immediateDebug = await page.evaluate(() => (window as any).debugSidebar());
    console.log('Immediate after click:', immediateDebug);

    // Wait for animation to complete
    await page.waitForTimeout(500);

    // Check final state
    const finalDebug = await page.evaluate(() => (window as any).debugSidebar());
    console.log('Final after animation:', finalDebug);

    // Check if the className contains translate-x-0
    const hasCorrectTransform = await sidebar.evaluate(el => {
      return {
        className: el.className,
        hasTranslateX0: el.className.includes('translate-x-0'),
        hasTranslateXFull: el.className.includes('-translate-x-full'),
        computedTransform: window.getComputedStyle(el).transform
      };
    });
    console.log('Transform analysis:', hasCorrectTransform);

    // Check if React state is updating correctly
    const reactStateDebug = await page.evaluate(() => {
      // Try to find React fiber and state
      const sidebarElement = document.querySelector('[data-testid="app-sidebar"]') as any;
      const fiberKey = Object.keys(sidebarElement || {}).find(key => key.startsWith('__reactFiber'));
      if (fiberKey && sidebarElement[fiberKey]) {
        let current = sidebarElement[fiberKey];
        // Walk up the fiber tree to find the sidebar component
        while (current && !current.memoizedProps?.isOpen) {
          current = current.return;
        }
        if (current && current.memoizedProps) {
          return {
            isOpen: current.memoizedProps.isOpen,
            isMobile: current.memoizedProps.isMobile,
            hasToggleFn: typeof current.memoizedProps.onToggleSidebar === 'function'
          };
        }
      }
      return { error: 'Could not find React state' };
    });
    console.log('React state:', reactStateDebug);
  });

  test('verify toggle function is called correctly', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Track clicks on the toggle function
    await page.addInitScript(() => {
      let clickCount = 0;
      const originalAddEventListener = Element.prototype.addEventListener;
      Element.prototype.addEventListener = function(type, listener, options) {
        if (type === 'click' && this.dataset?.testid === 'sidebar-toggle') {
          const wrappedListener = function(e: any) {
            clickCount++;
            console.log(`Hamburger clicked ${clickCount} times`, {
              timestamp: Date.now(),
              target: e.target.dataset?.testid,
              event: e.type
            });
            return listener.call(this, e);
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    // Listen for console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Hamburger clicked')) {
        logs.push(msg.text());
      }
    });

    const hamburgerButton = page.locator('[data-testid="sidebar-toggle"]');
    
    // Click multiple times to see if state toggles
    await hamburgerButton.click();
    await page.waitForTimeout(300);
    await hamburgerButton.click();
    await page.waitForTimeout(300);
    await hamburgerButton.click();
    await page.waitForTimeout(300);

    console.log('Click logs:', logs);
    expect(logs.length).toBeGreaterThan(0);
  });
});