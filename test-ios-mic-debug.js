#!/usr/bin/env node

/**
 * Quick iOS Microphone Diagnostic Test
 * This script helps diagnose iOS microphone issues
 */

import { chromium, webkit, devices } from 'playwright';

async function testIOSMicrophone() {
  console.log('🔍 Running iOS Microphone Diagnostic Test...\n');
  
  // Test with different iOS device configurations
  const testConfigurations = [
    { name: 'iOS Safari', device: devices['iPhone 13'], browser: 'webkit' },
    { name: 'iOS Chrome', device: devices['iPhone 13'], browser: 'chromium', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1' }
  ];

  for (const config of testConfigurations) {
    console.log(`\n📱 Testing ${config.name}...`);
    
    let browser, context, page;
    
    try {
      // Launch browser
      if (config.browser === 'webkit') {
        browser = await webkit.launch({ headless: false });
      } else {
        browser = await chromium.launch({ headless: false });
      }
      
      // Create context with device emulation
      const contextOptions = {
        ...config.device,
        permissions: ['microphone'],
        recordVideo: { dir: './test-results/' }
      };
      
      if (config.userAgent) {
        contextOptions.userAgent = config.userAgent;
      }
      
      context = await browser.newContext(contextOptions);
      page = await context.newPage();
      
      // Enable console logging
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('speech') || text.includes('mic') || text.includes('audio') || text.includes('iOS')) {
          console.log(`  🔊 [${msg.type()}] ${text}`);
        }
      });
      
      // Navigate to app
      console.log('  🌐 Loading app...');
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Wait for avatar container
      console.log('  🤖 Waiting for avatar...');
      await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 30000 });
      
      // Check if microphone button exists
      console.log('  🎙️  Checking microphone button...');
      const micButtons = await page.locator('button[title*="voice input"], button[title*="listening"], button[title*="microphone"]').all();
      
      if (micButtons.length === 0) {
        console.log('  ❌ No microphone button found');
        
        // Check speech recognition support
        const speechSupport = await page.evaluate(() => {
          const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
          const isSecureContext = window.isSecureContext;
          const protocol = window.location.protocol;
          const userAgent = navigator.userAgent;
          
          return {
            hasSpeechRecognition,
            isSecureContext,
            protocol,
            isIOS: /iPad|iPhone|iPod/i.test(userAgent),
            isIOSChrome: /iPad|iPhone|iPod/i.test(userAgent) && /CriOS/i.test(userAgent)
          };
        });
        
        console.log('  📊 Speech Recognition Support:', JSON.stringify(speechSupport, null, 2));
        
        if (!speechSupport.isSecureContext && speechSupport.protocol === 'http:') {
          console.log('  🔒 ISSUE FOUND: App is running on HTTP, but iOS requires HTTPS for microphone access!');
          console.log('  💡 SOLUTION: Use ngrok, deploy to HTTPS, or test with Safari (sometimes more permissive)');
        }
        
        if (!speechSupport.hasSpeechRecognition) {
          console.log('  ❌ Speech Recognition API not available');
        }
        
      } else {
        console.log(`  ✅ Found ${micButtons.length} microphone button(s)`);
        
        // Test clicking the microphone button
        const micButton = micButtons[0];
        console.log('  🖱️  Clicking microphone button...');
        
        await micButton.click();
        await page.waitForTimeout(1000);
        
        // Check for error messages
        const errorMessages = await page.locator('text=/microphone|permission|denied|https|blocked/i').all();
        if (errorMessages.length > 0) {
          console.log('  ⚠️  Error messages found:');
          for (const error of errorMessages) {
            const text = await error.textContent();
            console.log(`    - ${text}`);
          }
        }
        
        // Check microphone state
        const micState = await page.evaluate(() => {
          const button = document.querySelector('button[title*="voice input"], button[title*="listening"], button[title*="microphone"]');
          return {
            buttonExists: !!button,
            buttonClasses: button?.className || 'N/A',
            buttonTitle: button?.title || 'N/A',
            isListening: button?.className?.includes('animate-pulse') || button?.className?.includes('bg-red-500')
          };
        });
        
        console.log('  📊 Microphone State:', JSON.stringify(micState, null, 2));
      }
      
      // Test typing a message (alternative to voice)
      console.log('  ⌨️  Testing text input as alternative...');
      const input = page.locator('input[type="text"]');
      if (await input.count() > 0) {
        await input.fill('Test message - microphone issue on iOS');
        await page.locator('[data-testid="ask-button"]').click();
        console.log('  ✅ Text input works - this is your alternative while fixing microphone');
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${config.name}:`, error.message);
    } finally {
      // Cleanup
      try {
        if (page) await page.close();
        if (context) await context.close();
        if (browser) await browser.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  console.log('\n🏁 Diagnostic Complete!');
  console.log('\n💡 Quick Solutions for iOS Microphone Issues:');
  console.log('1. 🔒 Use HTTPS: iOS requires secure connection for microphone');
  console.log('2. 🌐 Try ngrok: ngrok http 5173 → use the https:// URL');
  console.log('3. 🍎 Use Safari: Sometimes more permissive than Chrome on iOS');
  console.log('4. ⚙️  iOS Chrome: Enable "Request Desktop Site" in menu');
  console.log('5. 📱 Check Settings: iOS > Safari > Camera & Microphone Access');
}

// Run the diagnostic
testIOSMicrophone().catch(console.error);
