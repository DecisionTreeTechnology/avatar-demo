import { test as base, expect } from '@playwright/test';
import { enableTestMode } from '../src/utils/testUtils';

// Extend the base test to include our setup
export const test = base.extend({
  page: async ({ page }, use) => {
    // Enable test mode before navigating
    await page.addInitScript(() => {
      // Set the test mode flag before the app loads
      (window as any).__AVATAR_TEST_MODE__ = true;
    });
    
    await use(page);
  },
});

export { expect };
