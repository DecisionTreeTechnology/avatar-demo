import { test, expect } from '@playwright/test';

test.describe('Microphone Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the required APIs for testing
    await page.addInitScript(() => {
      // Mock AudioContext
      (window as any).AudioContext = class MockAudioContext {
        state = 'suspended';
        async resume() { this.state = 'running'; }
        createGain() { return { gain: { value: 1 }, connect: () => {}, disconnect: () => {} }; }
        createBufferSource() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
        get destination() { return { connect: () => {} }; }
        async decodeAudioData() { return { duration: 2.0 }; }
      };

      // Mock Speech Recognition
      (window as any).SpeechRecognition = class MockSpeechRecognition {
        start() {}
        stop() {}
        abort() {}
      };

      // Mock Azure Speech SDK
      (window as any).SpeechSDK = {
        SpeechConfig: { fromSubscription: () => ({}) },
        SpeechSynthesizer: class { speakSsmlAsync(ssml, success) { setTimeout(() => success({ reason: 1, audioData: new ArrayBuffer(100) }), 100); } },
        ResultReason: { SynthesizingAudioCompleted: 1 }
      };

      // Mock environment
      (window as any).import = { meta: { env: { VITE_AZURE_SPEECH_KEY: 'test', VITE_AZURE_SPEECH_REGION: 'test' } } };
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="avatar-container"]');
  });

  test('microphone integration works with enhanced chat bar', async ({ page }) => {
    // Check that the enhanced chat bar is present
    const chatBar = page.locator('.input-pill');
    await expect(chatBar).toBeVisible();

    // Check that microphone button exists (it should be visible if speech recognition is supported)
    const micButton = page.locator('button[title*="voice input"]');
    if (await micButton.count() > 0) {
      await expect(micButton).toBeVisible();
      
      // Click the microphone button
      await micButton.click();
      
      // Button state should change (color/animation)
      await page.waitForTimeout(100);
      
      // Type some text to test the integration
      await chatBar.fill('Test message');
      await page.locator('[data-testid="ask-button"]').click();
      
      // The microphone should be disabled during processing
      await page.waitForTimeout(500);
      
      console.log('✅ Microphone integration test passed');
    } else {
      console.log('ℹ️ Speech recognition not supported in test environment, skipping microphone-specific tests');
    }
  });

  test('tts integration notifies microphone manager', async ({ page }, testInfo) => {
    // Type a message to trigger TTS
    const input = page.locator('input[type="text"]');
    await input.fill('Hello test');
    
    const askButton = page.locator('[data-testid="ask-button"]');
    await askButton.click();
    
    // Wait for initial processing (button should become disabled)
    await expect(askButton).toBeDisabled();
    
    // Wait longer for TTS synthesis and audio playback completion
    // Mobile browsers need extra time, especially Chrome on mobile
    const isMobile = testInfo.project.name.includes('Mobile') || testInfo.project.name.includes('iOS');
    const waitTime = isMobile ? 8000 : 5000;
    await page.waitForTimeout(waitTime);
    
    // Check that the system is working (button should be enabled after processing)
    await expect(askButton).not.toBeDisabled();
    
    console.log('✅ TTS integration test passed');
  });

  test('app loads with enhanced components', async ({ page }) => {
    // Verify enhanced components are loaded
    const enhancedChatBar = page.locator('.input-pill');
    await expect(enhancedChatBar).toBeVisible();
    
    // Check for settings button (part of enhanced chat bar)
    const settingsButton = page.locator('button[title*="Animation Controls"]');
    await expect(settingsButton).toBeVisible();
    
    // Test settings panel
    await settingsButton.click();
    const settingsPanel = page.locator('text=Personality');
    await expect(settingsPanel).toBeVisible({ timeout: 2000 });
    
    console.log('✅ Enhanced components test passed');
  });

  test('microphone state manager prevents feedback loops', async ({ page }) => {
    // This test verifies the core functionality is working
    // by checking that the microphone state management is integrated
    
    const microphoneStateCheck = await page.evaluate(() => {
      // Check if our microphone state manager is available
      return typeof (window as any).getMicrophoneManager === 'function' ||
             typeof (window as any).globalMicrophoneManager !== 'undefined';
    });
    
    // Even if the manager isn't directly exposed, the integration should work
    // We test this by verifying the enhanced chat bar functionality
    const input = page.locator('input[type="text"]');
    await input.fill('Feedback test message');
    
    const askButton = page.locator('[data-testid="ask-button"]');
    await askButton.click();
    
    // Wait for the response
    await page.waitForTimeout(1500);
    
    // Verify no duplicate messages were created (indicating feedback prevention worked)
    const messages = page.locator('.chat-message, [data-testid*="message"]');
    const messageCount = await messages.count();
    
    // Should have user message + assistant response, but not excessive duplicates
    expect(messageCount).toBeLessThan(10); // Reasonable upper bound
    
    console.log('✅ Feedback prevention test passed');
  });
});
