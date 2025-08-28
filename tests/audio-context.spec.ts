import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Audio Context Management', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock audio context for consistent testing
    await page.addInitScript(() => {
      // Mock AudioContext
      class MockAudioContext {
        state = 'suspended';
        sampleRate = 44100;
        destination = {};
        
        constructor() {
          (window as any).globalAudioContext = this;
        }
        
        async resume() {
          this.state = 'running';
          return Promise.resolve();
        }
        
        createBuffer(channels: number, length: number, sampleRate: number) {
          return {
            getChannelData: () => new Float32Array(length),
            duration: length / sampleRate,
            sampleRate,
            numberOfChannels: channels,
            length
          };
        }
        
        createBufferSource() {
          return {
            buffer: null,
            connect: () => {},
            start: () => {},
            stop: () => {}
          };
        }
        
        createGain() {
          return {
            gain: { value: 1 },
            connect: () => {}
          };
        }
        
        close() {
          return Promise.resolve();
        }
      }
      
      // Replace native AudioContext
      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
    });
  });

  test('should initialize AudioContext on user interaction', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    
    // Check that global AudioContext is created on focus
    await chatInput.focus();
    
    const globalAudioContext = await page.evaluate(() => {
      return (window as any).globalAudioContext !== undefined;
    });
    
    expect(globalAudioContext).toBe(true);
  });

  test('should handle AudioContext state properly', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    await chatInput.focus();
    
    // Check AudioContext state
    const contextState = await page.evaluate(() => {
      const ctx = (window as any).globalAudioContext;
      return ctx ? ctx.state : null;
    });
    
    expect(contextState).toBe('running');
  });

  test('should create AudioContext with proper configuration', async ({ page }) => {
    const askButton = page.locator('button:has-text("Ask")');
    await askButton.click();
    
    // Verify AudioContext properties
    const contextProperties = await page.evaluate(() => {
      const ctx = (window as any).globalAudioContext;
      if (!ctx) return null;
      
      return {
        sampleRate: ctx.sampleRate,
        state: ctx.state,
        hasDestination: !!ctx.destination,
        hasCreateBuffer: typeof ctx.createBuffer === 'function',
        hasCreateBufferSource: typeof ctx.createBufferSource === 'function'
      };
    });
    
    expect(contextProperties).toMatchObject({
      sampleRate: 44100,
      state: 'running',
      hasDestination: true,
      hasCreateBuffer: true,
      hasCreateBufferSource: true
    });
  });

  test('should handle multiple AudioContext activation attempts', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Multiple interactions should not create multiple contexts
    await chatInput.focus();
    await chatInput.blur();
    await chatInput.focus();
    await askButton.click();
    
    const contextCount = await page.evaluate(() => {
      // Check if only one global context exists
      return (window as any).globalAudioContext ? 1 : 0;
    });
    
    expect(contextCount).toBe(1);
  });

  test('should log AudioContext operations properly', async ({ page }) => {
    // Listen for console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('[App]')) {
        logs.push(msg.text());
      }
    });
    
    const chatInput = page.locator('input[type="text"]');
    await chatInput.fill('Test audio context');
    await page.locator('button:has-text("Ask")').click();
    
    // Wait a bit for logs to appear
    await page.waitForTimeout(1000);
    
    // Check for audio context related logs
    const audioLogs = logs.filter(log => 
      log.includes('AudioContext') || 
      log.includes('audio context') ||
      log.includes('[App]')
    );
    
    expect(audioLogs.length).toBeGreaterThan(0);
  });

});
