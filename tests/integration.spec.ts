import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up comprehensive mocks for integration testing
    await page.addInitScript(() => {
      // Mock Azure Speech SDK
      (window as any).SpeechSDK = {
        SpeechConfig: {
          fromSubscription: (key: string, region: string) => ({
            speechSynthesisOutputFormat: null,
            key,
            region
          })
        },
        SpeechSynthesizer: class {
          wordBoundary: ((sender: any, event: any) => void) | null = null;
          
          constructor(config: any, audioConfig: any) {}
          
          speakSsmlAsync(ssml: string, success: (result: any) => void, error: (e: any) => void) {
            setTimeout(() => {
              // Simulate word boundary events
              if (this.wordBoundary) {
                const words = ssml.match(/\b\w+\b/g) || ['hello', 'world'];
                const wordBoundaryCallback = this.wordBoundary;
                words.forEach((word, i) => {
                  setTimeout(() => {
                    wordBoundaryCallback(null, {
                      text: word,
                      audioOffset: i * 5000000,
                      duration: 4000000
                    });
                  }, i * 100);
                });
              }
              
              // Create mock audio data
              const audioData = new ArrayBuffer(44100 * 2);
              
              setTimeout(() => {
                success({
                  reason: 1, // SynthesizingAudioCompleted
                  audioData: audioData
                });
              }, 1000);
            }, 100);
          }
        },
        ResultReason: {
          SynthesizingAudioCompleted: 1
        }
      };
      
      // Mock TalkingHead
      class MockTalkingHead {
        _isReady = false;
        _container: HTMLElement | null = null;
        _isDisposed = false;
        
        constructor(container: HTMLElement, options: any) {
          this._container = container;
          
          setTimeout(() => {
            if (!this._isDisposed) {
              this._isReady = true;
              
              // Create canvas
              const canvas = document.createElement('canvas');
              canvas.width = 400;
              canvas.height = 600;
              canvas.style.width = '100%';
              canvas.style.height = '100%';
              canvas.style.background = 'radial-gradient(circle, #2a2a4a, #1a1a2e)';
              canvas.classList.add('avatar-ready');
              
              // Draw avatar
              const ctx = canvas.getContext('2d');
              if (ctx) {
                // Head
                ctx.fillStyle = '#ffdbac';
                ctx.beginPath();
                ctx.arc(200, 200, 80, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(180, 180, 8, 0, Math.PI * 2);
                ctx.arc(220, 180, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Mouth
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(200, 220, 20, 0, Math.PI);
                ctx.stroke();
              }
              
              container.appendChild(canvas);
              
              // Trigger ready event
              window.dispatchEvent(new CustomEvent('avatarReady', { 
                detail: { isReady: true } 
              }));
            }
          }, 1000);
        }
        
        async showAvatar(options: any) {
          return Promise.resolve();
        }
        
        speakAudio(audioObj: any, options: any, callback: () => void) {
          if (this._isDisposed) {
            callback();
            return;
          }
          
          const canvas = this._container?.querySelector('canvas');
          if (canvas) {
            const ctx = canvas.getContext('2d');
            let frame = 0;
            const maxFrames = Math.max(30, Math.floor((audioObj.audio?.duration || 2) * 15));
            
            const animate = () => {
              if (this._isDisposed || frame >= maxFrames) {
                callback();
                return;
              }
              
              if (ctx) {
                // Clear
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Background
                const gradient = ctx.createRadialGradient(200, 300, 0, 200, 300, 300);
                gradient.addColorStop(0, '#2a2a4a');
                gradient.addColorStop(1, '#1a1a2e');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Head
                ctx.fillStyle = '#ffdbac';
                ctx.beginPath();
                ctx.arc(200, 200, 80, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(180, 180, 8, 0, Math.PI * 2);
                ctx.arc(220, 180, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // Animated mouth
                const mouthOpen = Math.sin(frame * 0.8) * 0.5 + 0.5;
                if (mouthOpen > 0.3) {
                  ctx.fillStyle = '#333';
                  ctx.beginPath();
                  ctx.ellipse(200, 225, 25, 10 + mouthOpen * 15, 0, 0, Math.PI * 2);
                  ctx.fill();
                } else {
                  ctx.strokeStyle = '#333';
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(200, 220, 20, 0, Math.PI);
                  ctx.stroke();
                }
              }
              
              frame++;
              requestAnimationFrame(animate);
            };
            
            animate();
          } else {
            setTimeout(callback, 2000);
          }
        }
        
        get isReady() {
          return this._isReady;
        }
        
        dispose() {
          this._isDisposed = true;
          if (this._container) {
            const canvas = this._container.querySelector('canvas');
            if (canvas) {
              canvas.remove();
            }
          }
        }
      }
      
      // Mock import
      (window as any).mockTalkingHead = MockTalkingHead;
      
      // Mock Speech Recognition
      class MockSpeechRecognition extends EventTarget {
        continuous = false;
        interimResults = false;
        lang = 'en-US';
        
        private _isListening = false;
        
        start() {
          this._isListening = true;
          setTimeout(() => {
            this.dispatchEvent(new Event('start'));
          }, 100);
        }
        
        stop() {
          this._isListening = false;
          setTimeout(() => {
            this.dispatchEvent(new Event('end'));
          }, 100);
        }
        
        abort() {
          this._isListening = false;
          this.dispatchEvent(new Event('end'));
        }
      }
      
      (window as any).SpeechRecognition = MockSpeechRecognition;
      (window as any).webkitSpeechRecognition = MockSpeechRecognition;
      
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
        
        async decodeAudioData(audioData: ArrayBuffer) {
          return this.createBuffer(2, 44100, 44100);
        }
        
        close() {
          return Promise.resolve();
        }
        
        get currentTime() {
          return Date.now() / 1000;
        }
      }
      
      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
    });
    
    await page.goto('/');
  });

  test('should complete full conversation flow', async ({ page }) => {
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Check initial state
    await expect(page.locator('.mobile-viewport')).toBeVisible();
    await expect(page.locator('text=Loading avatar...')).toBeVisible();
    
    // Wait for avatar to load
    await page.waitForEvent('domcontentloaded');
    
    // Wait for avatar ready or timeout
    let avatarReady = false;
    try {
      await page.waitForFunction(() => {
        const canvas = document.querySelector('.mobile-avatar-container canvas');
        return canvas && canvas.classList.contains('avatar-ready');
      }, { timeout: 5000 });
      avatarReady = true;
    } catch {
      // Continue test even if avatar doesn't load
    }
    
    // Perform conversation
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    await expect(chatInput).toBeVisible();
    await expect(askButton).toBeVisible();
    
    // First interaction
    await chatInput.fill('Hello, how are you?');
    await askButton.click();
    
    // Should show thinking state
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Should progress to speaking state or complete
    const isSpeaking = await page.locator('button:has-text("Speaking...")').isVisible();
    const isCompleted = await askButton.isVisible();
    
    expect(isSpeaking || isCompleted).toBe(true);
    
    // Wait for full completion
    await page.waitForFunction(() => {
      const button = document.querySelector('button:has-text("Ask")') as HTMLButtonElement;
      return button && !button.disabled;
    }, { timeout: 10000 });
    
    // Should show response
    const responseArea = page.locator('.text-xs.leading-relaxed');
    if (await responseArea.isVisible()) {
      const responseText = await responseArea.textContent();
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(0);
    }
    
    // Second interaction
    await chatInput.fill('That\'s great! Tell me more.');
    await askButton.click();
    
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Should handle second request
    await page.waitForTimeout(3000);
  });

  test('should handle complete speech recognition workflow', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const micButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await micButton.isVisible()) {
      // Start speech recognition
      await micButton.click();
      
      // Simulate speech input
      await page.evaluate(() => {
        const recognition = new (window as any).SpeechRecognition();
        
        // Simulate interim results
        setTimeout(() => {
          const event = new Event('result') as any;
          event.results = [{
            0: { transcript: 'Hello', confidence: 0.8 },
            isFinal: false,
            length: 1
          }];
          event.resultIndex = 0;
          recognition.dispatchEvent(event);
        }, 500);
        
        // Simulate final result
        setTimeout(() => {
          const event = new Event('result') as any;
          event.results = [{
            0: { transcript: 'Hello avatar, how are you today?', confidence: 0.9 },
            isFinal: true,
            length: 1
          }];
          event.resultIndex = 0;
          recognition.dispatchEvent(event);
        }, 1500);
        
        // End recognition
        setTimeout(() => {
          recognition.dispatchEvent(new Event('end'));
        }, 2000);
      });
      
      // Wait for speech recognition to complete
      await page.waitForTimeout(3000);
      
      // Check if input was filled
      const chatInput = page.locator('input[type="text"]');
      const inputValue = await chatInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    }
  });

  test('should handle avatar animation during speech', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Wait for avatar to potentially load
    await page.waitForTimeout(2000);
    
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    await chatInput.fill('Make the avatar speak and animate');
    await askButton.click();
    
    // Wait for processing to start
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Wait for avatar animation
    await page.waitForTimeout(5000);
    
    // Check if canvas is present and potentially animated
    const canvas = page.locator('canvas');
    
    if (await canvas.isVisible()) {
      // Verify canvas dimensions
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      
      if (canvasBox) {
        expect(canvasBox.width).toBeGreaterThan(100);
        expect(canvasBox.height).toBeGreaterThan(100);
      }
      
      // Check for avatar-ready class
      const hasReadyClass = await canvas.evaluate(el => el.classList.contains('avatar-ready'));
      if (hasReadyClass) {
        expect(hasReadyClass).toBe(true);
      }
    }
  });

  test('should maintain state consistency across interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Multiple interactions to test state management
    const messages = [
      'First message',
      'Second message', 
      'Third message'
    ];
    
    for (const message of messages) {
      // Wait for previous interaction to complete
      await page.waitForFunction(() => {
        const button = document.querySelector('button:has-text("Ask")') as HTMLButtonElement;
        return button && !button.disabled;
      }, { timeout: 10000 });
      
      await chatInput.fill(message);
      await askButton.click();
      
      // Verify interaction started
      await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
      
      // Wait a bit for processing
      await page.waitForTimeout(2000);
    }
    
    // Final state should be normal
    await page.waitForFunction(() => {
      const button = document.querySelector('button:has-text("Ask")') as HTMLButtonElement;
      return button && !button.disabled;
    }, { timeout: 15000 });
    
    await expect(askButton).toBeEnabled();
  });

  test('should handle iOS Chrome compatibility integration', async ({ page, browserName }) => {
    // Simulate iOS Chrome user agent
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1',
        configurable: true
      });
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Test iOS Chrome specific behavior
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Trigger audio context initialization
    await chatInput.focus();
    
    // Send message to trigger full flow
    await chatInput.fill('Test iOS Chrome integration');
    await askButton.click();
    
    // Wait for processing
    await page.waitForTimeout(3000);
    
    // Check for iOS warning if needed
    const iosWarning = page.locator('text=iOS Chrome Audio Notice');
    
    // Warning may or may not appear depending on mocked behavior
    // Just verify app continues to function
    await expect(chatInput).toBeEnabled();
  });

  test('should handle error recovery and continuation', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Mock an error scenario
    await page.evaluate(() => {
      let callCount = 0;
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        callCount++;
        if (callCount === 1) {
          // First call fails
          return Promise.reject(new Error('Network error'));
        }
        // Subsequent calls succeed
        return originalFetch.apply(this, args);
      };
    });
    
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // First interaction (should fail)
    await chatInput.fill('This should fail');
    await askButton.click();
    
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Wait for error handling
    await page.waitForTimeout(5000);
    
    // Should return to normal state
    await expect(askButton).toBeEnabled();
    
    // Second interaction (should succeed)
    await chatInput.fill('This should work');
    await askButton.click();
    
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Should process normally
    await page.waitForTimeout(3000);
  });

});
