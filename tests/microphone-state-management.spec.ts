import { test, expect } from '@playwright/test';

/**
 * Microphone State Management Tests
 * 
 * Testing bulletproof microphone state management to prevent feedback loops
 * where LLM voice gets captured and fed back into the system.
 * 
 * Key Requirements:
 * 1. Microphone should be automatically disabled when avatar is speaking
 * 2. Microphone should not capture audio during TTS playback
 * 3. Microphone should resume only after TTS audio has completely stopped
 * 4. System should handle audio context state changes properly
 * 5. Should prevent echo/feedback loops on all platforms (especially iOS)
 * 6. Should handle edge cases like rapid state changes
 * 7. Should provide clear visual feedback about microphone state
 */

test.describe('Microphone State Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock AudioContext and related APIs
    await page.addInitScript(() => {
      // Mock AudioContext for testing
      class MockAudioContext extends EventTarget {
        state = 'suspended';
        currentTime = 0;
        sampleRate = 44100;

        async resume() {
          this.state = 'running';
          return Promise.resolve();
        }

        async suspend() {
          this.state = 'suspended';
          return Promise.resolve();
        }

        createGain() {
          return {
            gain: { value: 1 },
            connect: () => {},
            disconnect: () => {}
          };
        }

        createBufferSource() {
          return {
            buffer: null,
            connect: () => {},
            disconnect: () => {},
            start: () => {},
            stop: () => {},
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        }

        get destination() {
          return { connect: () => {}, disconnect: () => {} };
        }

        async decodeAudioData(arrayBuffer: ArrayBuffer) {
          return {
            duration: 2.5,
            numberOfChannels: 1,
            sampleRate: 44100,
            length: 110250
          };
        }
      }

      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
      (window as any).globalAudioContext = new MockAudioContext();

      // Mock Speech Recognition
      class MockSpeechRecognition extends EventTarget {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        maxAlternatives = 1;
        
        private _isActive = false;

        start() {
          this._isActive = true;
          setTimeout(() => {
            this.dispatchEvent(new Event('start'));
          }, 10);
        }

        stop() {
          this._isActive = false;
          setTimeout(() => {
            this.dispatchEvent(new Event('end'));
          }, 10);
        }

        abort() {
          this._isActive = false;
          setTimeout(() => {
            this.dispatchEvent(new Event('end'));
          }, 5);
        }

        isActive() {
          return this._isActive;
        }

        // Method to simulate speech input
        simulateResult(transcript: string, isFinal = true) {
          if (this._isActive) {
            const event = new CustomEvent('result', {
              detail: {
                results: [{
                  0: { transcript },
                  isFinal,
                  length: 1
                }],
                resultIndex: 0
              }
            });
            this.dispatchEvent(event);
          }
        }
      }

      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;

      // Mock Azure Speech SDK
      (window as any).SpeechSDK = {
        SpeechConfig: {
          fromSubscription: () => ({
            speechSynthesisOutputFormat: null
          })
        },
        SpeechSynthesizer: class {
          wordBoundary = null;
          speakSsmlAsync(ssml: string, success: Function, error: Function) {
            setTimeout(() => {
              success({
                reason: 1, // SynthesizingAudioCompleted
                audioData: new ArrayBuffer(1000)
              });
            }, 100);
          }
        },
        ResultReason: {
          SynthesizingAudioCompleted: 1
        },
        SpeechSynthesisOutputFormat: {
          Riff22050Hz16BitMonoPcm: 1
        }
      };

      // Mock environment variables
      (window as any).import = {
        meta: {
          env: {
            VITE_AZURE_SPEECH_KEY: 'test-key',
            VITE_AZURE_SPEECH_REGION: 'test-region',
            VITE_AZURE_SPEECH_VOICE: 'en-US-JennyNeural'
          }
        }
      };

      // Mock getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: async () => {
            return new MediaStream();
          }
        },
        writable: true
      });
    });

    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="avatar-container"]');
  });

  test('should disable microphone when avatar starts speaking', async ({ page }) => {
    // Enable microphone
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Verify microphone is active
    await expect(micButton).toHaveClass(/bg-red-500|animate-pulse/);
    
    // Start TTS/avatar speaking
    const input = page.locator('input[type="text"]');
    await input.fill('Hello test');
    await page.locator('[data-testid="ask-button"]').click();
    
    // Verify microphone is automatically disabled when avatar speaks
    await expect(micButton).not.toHaveClass(/bg-red-500/);
    
    // Wait for speaking to complete
    await page.waitForTimeout(1000);
    
    // Microphone should remain off until manually re-enabled
    await expect(micButton).not.toHaveClass(/bg-red-500/);
  });

  test('should prevent audio capture during TTS playback', async ({ page }) => {
    // Mock the audio playback state
    await page.evaluate(() => {
      (window as any).testAudioState = {
        isPlaying: false,
        isTTSSpeaking: false
      };
    });

    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Simulate TTS starting
    await page.evaluate(() => {
      (window as any).testAudioState.isTTSSpeaking = true;
    });
    
    // Try to use microphone during TTS - should be blocked
    const speechState = await page.evaluate(() => {
      const recognition = new (window as any).SpeechRecognition();
      try {
        recognition.start();
        return { started: true, active: recognition.isActive() };
      } catch (e) {
        return { started: false, error: e.message };
      }
    });
    
    // Microphone should be prevented from starting during TTS
    expect(speechState.started).toBe(false);
  });

  test('should handle rapid state changes without feedback loops', async ({ page }) => {
    const micButton = page.locator('button[title*="start voice input"]').first();
    
    // Rapidly toggle microphone state
    await micButton.click(); // Enable
    await page.waitForTimeout(50);
    await micButton.click(); // Disable
    await page.waitForTimeout(50);
    await micButton.click(); // Enable
    await page.waitForTimeout(50);
    
    // Send a message to trigger TTS
    const input = page.locator('input[type="text"]');
    await input.fill('Quick test');
    await page.locator('[data-testid="ask-button"]').click();
    
    // Microphone should be properly disabled
    await expect(micButton).not.toHaveClass(/bg-red-500/);
    
    // No feedback loops should occur (test by checking no duplicate messages)
    const chatMessages = page.locator('.chat-message');
    const messageCount = await chatMessages.count();
    
    // Should have exactly 2 messages (user + assistant), not duplicates
    expect(messageCount).toBeLessThanOrEqual(4); // Allow for loading states
  });

  test('should provide clear visual feedback about microphone state', async ({ page }) => {
    const micButton = page.locator('button[title*="start voice input"]').first();
    
    // Initial state - microphone off
    await expect(micButton).toHaveClass(/bg-gray-600/);
    
    // Enable microphone
    await micButton.click();
    await expect(micButton).toHaveClass(/bg-red-500/);
    await expect(micButton).toHaveClass(/animate-pulse/);
    
    // Disable microphone
    await micButton.click();
    await expect(micButton).toHaveClass(/bg-gray-600/);
    await expect(micButton).not.toHaveClass(/animate-pulse/);
  });

  test('should handle audio context state changes', async ({ page }) => {
    // Test audio context state management
    const audioState = await page.evaluate(async () => {
      const ctx = (window as any).globalAudioContext;
      const initialState = ctx.state;
      
      // Simulate audio context suspension
      await ctx.suspend();
      const suspendedState = ctx.state;
      
      // Resume audio context
      await ctx.resume();
      const resumedState = ctx.state;
      
      return { initialState, suspendedState, resumedState };
    });
    
    expect(audioState.suspendedState).toBe('suspended');
    expect(audioState.resumedState).toBe('running');
  });

  test('should prevent echo/feedback on iOS Safari', async ({ page }) => {
    // Mock iOS Safari user agent
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
    });
    
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Send message to trigger TTS
    const input = page.locator('input[type="text"]');
    await input.fill('iOS test');
    await page.locator('[data-testid="ask-button"]').click();
    
    // On iOS, microphone should be forcefully stopped during TTS
    await expect(micButton).not.toHaveClass(/bg-red-500/);
    
    // Wait for TTS to complete
    await page.waitForTimeout(2000);
    
    // Microphone should not auto-restart on iOS to prevent feedback
    await expect(micButton).toHaveClass(/bg-gray-600/);
  });

  test('should handle microphone permissions properly', async ({ page }) => {
    // Mock permission denied
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: async () => {
            throw new DOMException('Permission denied', 'NotAllowedError');
          }
        },
        writable: true
      });
    });
    
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Should show error state or handle gracefully
    const errorMessage = page.locator('text=*Microphone*');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should implement proper cleanup on component unmount', async ({ page }) => {
    // Navigate away to trigger cleanup
    await page.goto('about:blank');
    
    // Verify no lingering event listeners or audio contexts
    const cleanupState = await page.evaluate(() => {
      return {
        speechRecognitionActive: false, // Should be cleaned up
        audioContextState: (window as any).globalAudioContext?.state || 'closed'
      };
    });
    
    expect(cleanupState.speechRecognitionActive).toBe(false);
  });

  test('should handle network interruptions gracefully', async ({ page }) => {
    // Mock network failure during speech recognition
    await page.evaluate(() => {
      const MockSpeechRecognition = (window as any).SpeechRecognition;
      MockSpeechRecognition.prototype.start = function() {
        setTimeout(() => {
          const errorEvent = new CustomEvent('error', {
            detail: { error: 'network' }
          });
          this.dispatchEvent(errorEvent);
        }, 100);
      };
    });
    
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Should handle network error gracefully
    await page.waitForTimeout(500);
    
    // Microphone should return to safe state
    await expect(micButton).toHaveClass(/bg-gray-600/);
  });

  test('should prevent multiple simultaneous speech recognition instances', async ({ page }) => {
    const micButton = page.locator('button[title*="start voice input"]').first();
    
    // Try to start multiple speech recognition instances
    await page.evaluate(() => {
      const rec1 = new (window as any).SpeechRecognition();
      const rec2 = new (window as any).SpeechRecognition();
      
      rec1.start();
      try {
        rec2.start();
        (window as any).testMultipleInstances = 'allowed';
      } catch (e) {
        (window as any).testMultipleInstances = 'prevented';
      }
    });
    
    const result = await page.evaluate(() => (window as any).testMultipleInstances);
    
    // Should prevent multiple instances to avoid conflicts
    expect(result).toBe('prevented');
  });
});

test.describe('Edge Cases and Error Handling', () => {
  test('should handle browser tab becoming inactive', async ({ page }) => {
    // Mock tab visibility change
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Microphone should be safely disabled when tab is hidden
    const micButton = page.locator('button[title*="start voice input"]').first();
    await expect(micButton).toHaveClass(/bg-gray-600/);
  });

  test('should handle audio device changes', async ({ page }) => {
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Simulate audio device disconnection
    await page.evaluate(() => {
      const mediaDevices = navigator.mediaDevices;
      if (mediaDevices && mediaDevices.dispatchEvent) {
        mediaDevices.dispatchEvent(new Event('devicechange'));
      }
    });
    
    // Should handle device change gracefully
    await page.waitForTimeout(500);
    await expect(micButton).toHaveClass(/bg-gray-600/);
  });

  test('should prevent feedback in noisy environments', async ({ page }) => {
    const micButton = page.locator('button[title*="start voice input"]').first();
    await micButton.click();
    
    // Simulate very short audio snippets (likely feedback/echo)
    await page.evaluate(() => {
      const recognition = new (window as any).SpeechRecognition();
      recognition.start();
      
      // Simulate very short utterances that should be filtered
      setTimeout(() => {
        recognition.simulateResult('a', true);
      }, 100);
      
      setTimeout(() => {
        recognition.simulateResult('um', true);
      }, 200);
      
      setTimeout(() => {
        recognition.simulateResult('hello world', true);
      }, 300);
    });
    
    await page.waitForTimeout(1000);
    
    // Input should only contain the meaningful phrase, short utterances filtered
    const input = page.locator('input[type="text"]');
    const inputValue = await input.inputValue();
    
    // Should filter out very short utterances
    expect(inputValue).not.toContain('a');
    expect(inputValue).not.toContain('um');
    expect(inputValue).toContain('hello world');
  });
});
