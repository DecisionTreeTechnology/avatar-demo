import { defineConfig, devices } from '@playwright/test';

/**
 * BULLETPROOF E2E TESTING CONFIGURATION
 * 
 * Advanced Playwright configuration specifically designed for comprehensive
 * bulletproofing of the avatar demo application across all environments.
 */

export default defineConfig({
  testDir: './tests',
  
  // Run bulletproof tests in series to avoid resource conflicts
  fullyParallel: false,
  workers: 2,
  
  // Fail the build on CI if any tests fail
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only for flaky test detection
  retries: process.env.CI ? 2 : 1,
  
  // Reporter configuration for comprehensive reporting
  reporter: [
    ['html', { outputFolder: 'bulletproof-test-results' }],
    ['json', { outputFile: 'bulletproof-test-results.json' }],
    ['junit', { outputFile: 'bulletproof-results.xml' }],
    ['github'], // GitHub Actions annotations
    ['list'],
  ],

  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    // Enable tracing for failed tests
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Longer timeouts for complex operations
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors for local testing
    ignoreHTTPSErrors: true,
    
    // Collect console logs
    // @ts-ignore
    contextOptions: {
      recordVideo: {
        dir: 'bulletproof-videos/',
        size: { width: 1280, height: 720 }
      }
    }
  },

  // Test patterns - run bulletproof tests with specific pattern
  testMatch: [
    '**/bulletproof-*.spec.ts',
    '**/reliability-*.spec.ts', 
    '**/accessibility-*.spec.ts'
  ],

  // Projects for cross-browser bulletproof testing
  projects: [
    {
      name: 'Desktop Chrome - Bulletproof',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-web-security', // For testing only
            '--allow-running-insecure-content'
          ]
        }
      },
      metadata: {
        description: 'Primary bulletproof testing on Desktop Chrome'
      }
    },

    {
      name: 'Desktop Firefox - Bulletproof',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'media.navigator.streams.fake': true,
            'media.navigator.permission.disabled': true,
            'media.gmp-manager.buildID': '20181001000000'
          }
        }
      },
      metadata: {
        description: 'Cross-browser validation on Firefox'
      }
    },

    {
      name: 'Desktop Safari - Bulletproof',
      use: { 
        ...devices['Desktop Safari'],
        // Safari-specific configurations
      },
      metadata: {
        description: 'Safari compatibility validation'
      }
    },

    {
      name: 'Mobile Chrome - Bulletproof',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific settings
        hasTouch: true,
        isMobile: true
      },
      metadata: {
        description: 'Mobile Chrome stress testing'
      }
    },

    {
      name: 'Mobile Safari - Bulletproof',
      use: { 
        ...devices['iPhone 12'],
        // iOS Safari specific settings
        hasTouch: true,
        isMobile: true
      },
      metadata: {
        description: 'iOS Safari reliability testing'
      }
    },

    {
      name: 'Tablet - Bulletproof',
      use: { 
        ...devices['iPad Pro'],
        hasTouch: true
      },
      metadata: {
        description: 'Tablet form factor testing'
      }
    },

    // Stress testing on various viewport sizes
    {
      name: 'Large Desktop - Bulletproof',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },

    {
      name: 'Small Mobile - Bulletproof', 
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 }, // iPhone SE size
        hasTouch: true,
        isMobile: true
      }
    },

    // Performance testing project
    {
      name: 'Performance Monitoring',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--js-flags=--expose-gc'
          ]
        }
      },
      metadata: {
        description: 'Performance and memory monitoring'
      }
    },

    // Accessibility testing project
    {
      name: 'Accessibility Testing',
      use: {
        ...devices['Desktop Chrome'],
        // Accessibility specific settings
        colorScheme: 'dark',
        reducedMotion: 'reduce'
      },
      metadata: {
        description: 'WCAG compliance and accessibility testing'
      }
    }
  ],

  // Global setup and teardown
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',

  // Web server configuration for testing
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    env: {
      NODE_ENV: 'test',
      VITE_TEST_MODE: 'true'
    }
  },

  // Test timeouts
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Output directories
  outputDir: 'bulletproof-test-results/',
  
  // Metadata for test reporting
  metadata: {
    testType: 'bulletproof-e2e',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    description: 'Comprehensive bulletproof testing suite for Avatar Demo application'
  }
});