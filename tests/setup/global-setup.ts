import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for bulletproof testing
 * 
 * Prepares the testing environment and performs initial checks
 * before running the comprehensive test suite.
 */

async function globalSetup(config: FullConfig) {
  console.log('🛡️  Bulletproof Testing Setup Starting...');
  
  const startTime = Date.now();
  
  try {
    // 1. Verify application is accessible
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    const baseURL = config.webServer?.port 
      ? `http://localhost:${config.webServer.port}`
      : config.use?.baseURL || 'http://localhost:5173';
    
    console.log(`📡 Checking application availability at ${baseURL}`);
    
    // Wait up to 30 seconds for app to be ready
    let retries = 30;
    while (retries > 0) {
      try {
        await page.goto(baseURL, { timeout: 5000 });
        const title = await page.title();
        
        if (title && title.length > 0) {
          console.log(`✅ Application ready: "${title}"`);
          break;
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`❌ Application not ready after 30 seconds: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 2. Verify critical elements are present
    console.log('🔍 Verifying critical application elements...');
    
    const criticalSelectors = [
      '[data-testid="avatar-container"]',
      '[data-testid="chat-input"]',
      '[data-testid="send-button"]'
    ];

    let elementsFound = 0;
    for (const selector of criticalSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        elementsFound++;
      } catch (error) {
        console.warn(`⚠️  Critical element not found: ${selector}`);
      }
    }

    if (elementsFound === 0) {
      throw new Error('❌ No critical elements found - app may not be loading correctly');
    }

    console.log(`✅ Found ${elementsFound}/${criticalSelectors.length} critical elements`);

    // 3. Check for JavaScript errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(3000); // Wait for any startup errors
    
    if (jsErrors.length > 0) {
      console.warn(`⚠️  Found ${jsErrors.length} JavaScript errors:`);
      jsErrors.forEach(error => console.warn(`   • ${error}`));
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    // 4. Performance baseline check
    console.log('📊 Establishing performance baseline...');
    
    const performanceMetrics = await page.evaluate(() => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalLoad: navigation.loadEventEnd - navigation.navigationStart,
          memoryUsed: (performance as any).memory?.usedJSHeapSize || 0
        };
      }
      return null;
    });

    if (performanceMetrics) {
      console.log(`📊 Performance Baseline:`);
      console.log(`   • DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`   • Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`   • Total Load Time: ${performanceMetrics.totalLoad}ms`);
      console.log(`   • Memory Used: ${Math.round(performanceMetrics.memoryUsed / 1024 / 1024)}MB`);

      // Store baseline for comparison in tests
      process.env.PERF_BASELINE_LOAD = performanceMetrics.totalLoad.toString();
      process.env.PERF_BASELINE_MEMORY = performanceMetrics.memoryUsed.toString();
    }

    // 5. Environment information
    console.log('🌐 Test Environment Information:');
    console.log(`   • Node.js: ${process.version}`);
    console.log(`   • Platform: ${process.platform}`);
    console.log(`   • Architecture: ${process.arch}`);
    console.log(`   • CI: ${process.env.CI || 'false'}`);
    console.log(`   • Base URL: ${baseURL}`);

    await browser.close();
    
    const setupTime = Date.now() - startTime;
    console.log(`✅ Bulletproof setup completed in ${setupTime}ms`);
    
    // Store setup metadata
    process.env.TEST_SETUP_TIME = setupTime.toString();
    process.env.TEST_START_TIME = Date.now().toString();

  } catch (error) {
    console.error('❌ Bulletproof setup failed:', error);
    throw error;
  }
}

export default globalSetup;