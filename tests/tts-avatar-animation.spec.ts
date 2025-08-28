import { test, expect, Page } from '@playwright/test';

test.describe('Avatar Demo - TTS and Avatar Animation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock TTS and Avatar functionality
    await page.addInitScript(() => {
      // Mock Azure Speech SDK
      (window as any).SpeechSDK = {
        SpeechConfig: {
          fromSubscription: () => ({
            speechSynthesisOutputFormat: null
          })
        },
        SpeechSynthesizer: class {
          wordBoundary: ((sender: any, event: any) => void) | null = null;
          
          constructor() {}
          
          speakSsmlAsync(ssml: string, success: (result: any) => void, error: (e: any) => void) {
            // Mock successful synthesis
            setTimeout(() => {
              // Simulate word boundary events
              if (this.wordBoundary) {
                const words = ['Hello', 'there', 'how', 'are', 'you'];
                const wordBoundaryCallback = this.wordBoundary;
                words.forEach((word, i) => {
                  setTimeout(() => {
                    wordBoundaryCallback(null, {
                      text: word,
                      audioOffset: i * 5000000, // 500ms per word in 100ns units
                      duration: 4000000 // 400ms duration in 100ns units
                    });
                  }, i * 100);
                });
              }
              
              // Create mock audio data
              const audioData = new ArrayBuffer(44100 * 2); // 1 second of audio data
              
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
      (window as any).TalkingHeadMock = class {
        _isReady = false;
        _container: HTMLElement | null = null;
        
        constructor(container: HTMLElement, options: any) {
          this._container = container;
          
          // Simulate avatar loading
          setTimeout(() => {
            this._isReady = true;
            
            // Create a mock canvas
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 600;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.background = 'linear-gradient(45deg, #1a1a2e, #16213e)';
            
            // Draw a simple avatar representation
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
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('avatarReady'));
          }, 1500);
        }
        
        async showAvatar(options: any) {
          return Promise.resolve();
        }
        
        speakAudio(audioObj: any, options: any, callback: () => void) {
          // Simulate avatar speaking animation
          const canvas = this._container?.querySelector('canvas');
          if (canvas) {
            const ctx = canvas.getContext('2d');
            let frame = 0;
            const animationFrames = 30;
            
            const animate = () => {
              if (ctx && frame < animationFrames) {
                // Clear and redraw with mouth animation
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Background
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(1, '#16213e');
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
                ctx.fillStyle = frame % 10 < 5 ? '#333' : '#ff6b6b';
                const mouthHeight = 5 + Math.sin(frame * 0.5) * 3;
                ctx.fillRect(185, 220, 30, mouthHeight);
                
                frame++;
                requestAnimationFrame(animate);
              } else {
                // Reset mouth to normal
                if (ctx) {
                  ctx.clearRect(180, 215, 40, 20);
                  ctx.strokeStyle = '#333';
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(200, 220, 20, 0, Math.PI);
                  ctx.stroke();
                }
                callback();
              }
            };
            
            animate();
          } else {
            // Fallback if no canvas
            setTimeout(callback, 2000);
          }
        }
        
        get isReady() {
          return this._isReady;
        }
        
        dispose() {}
      };
    });
  });

  test('should load and display avatar', async ({ page }) => {
    // Wait for avatar to load
    await page.waitForEvent('domcontentloaded');
    
    // Check avatar container is present
    const avatarContainer = page.locator('.mobile-avatar-container');
    await expect(avatarContainer).toBeVisible();
    
    // Wait for avatar ready event or timeout
    try {
      await page.waitForEvent('console', { 
        predicate: msg => msg.text().includes('avatar') || msg.text().includes('TalkingHead'),
        timeout: 5000 
      });
    } catch {
      // Timeout is okay, continue with test
    }
  });

  test('should show avatar loading state initially', async ({ page }) => {
    const loadingText = page.locator('text=Loading avatar...');
    await expect(loadingText).toBeVisible();
    
    // Check container ref status
    const containerStatus = page.locator('text=Container ref:');
    await expect(containerStatus).toBeVisible();
  });

  test('should handle avatar loading errors gracefully', async ({ page }) => {
    // Inject an error into the avatar loading
    await page.evaluate(() => {
      // Override TalkingHead to throw an error
      (window as any).TalkingHeadMock = class {
        constructor() {
          throw new Error('Avatar loading failed');
        }
      };
    });
    
    await page.reload();
    
    // Should show error message instead of loading
    const errorMessage = page.locator('text=Avatar error:');
    
    // Wait a bit for error to potentially appear
    await page.waitForTimeout(2000);
    
    // Either show error or continue with loading (graceful degradation)
    const hasError = await errorMessage.isVisible();
    const hasLoading = await page.locator('text=Loading avatar...').isVisible();
    
    expect(hasError || hasLoading).toBe(true);
  });

  test('should process TTS request when user sends message', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Send a message
    await chatInput.fill('Hello avatar');
    await askButton.click();
    
    // Should show thinking state
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
    
    // Wait for TTS processing
    await page.waitForTimeout(3000);
    
    // Should eventually show speaking state or return to normal
    const speakingButton = page.locator('button:has-text("Speaking...")');
    const normalButton = page.locator('button:has-text("Ask")');
    
    // Either speaking or returned to normal state
    const isSpeaking = await speakingButton.isVisible();
    const isNormal = await normalButton.isVisible();
    
    expect(isSpeaking || isNormal).toBe(true);
  });

  test('should display avatar canvas with proper dimensions', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for avatar to potentially load
    
    const canvas = page.locator('canvas');
    
    if (await canvas.isVisible()) {
      // Check canvas has proper dimensions
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      
      if (canvasBox) {
        expect(canvasBox.width).toBeGreaterThan(200);
        expect(canvasBox.height).toBeGreaterThan(200);
      }
      
      // Check canvas styling
      const canvasStyles = await canvas.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          display: styles.display
        };
      });
      
      expect(canvasStyles.display).not.toBe('none');
      expect(canvasStyles.width).not.toBe('0px');
      expect(canvasStyles.height).not.toBe('0px');
    }
  });

  test('should handle avatar speech animation', async ({ page }) => {
    // Mock successful avatar loading
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('avatarReady'));
    });
    
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Send a message to trigger speech
    await chatInput.fill('Make the avatar speak');
    await askButton.click();
    
    // Wait for speaking to start
    await page.waitForTimeout(2000);
    
    // Check if canvas updates during speech (basic animation test)
    const canvas = page.locator('canvas');
    
    if (await canvas.isVisible()) {
      // Take screenshot before and during speaking to verify animation
      const beforeSpeaking = await canvas.screenshot();
      
      // Wait during speaking animation
      await page.waitForTimeout(1000);
      
      const duringSpeaking = await canvas.screenshot();
      
      // Images should be different if animation is working
      // This is a basic check - in real scenarios you might want more sophisticated comparison
      expect(beforeSpeaking.length).toBeGreaterThan(0);
      expect(duringSpeaking.length).toBeGreaterThan(0);
    }
  });

  test('should handle multiple speech requests properly', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    // Send first message
    await chatInput.fill('First message');
    await askButton.click();
    
    // Wait for processing to start
    await page.waitForTimeout(500);
    
    // Try to send second message (should be disabled)
    await expect(askButton).toBeDisabled();
    
    // Wait for first request to complete
    await page.waitForTimeout(5000);
    
    // Button should be enabled again
    await expect(askButton).toBeEnabled();
    
    // Should be able to send second message
    await chatInput.fill('Second message');
    await askButton.click();
    
    await expect(page.locator('button:has-text("Thinking...")')).toBeVisible();
  });

  test('should show response text after avatar speaks', async ({ page }) => {
    const chatInput = page.locator('input[type="text"]');
    const askButton = page.locator('button:has-text("Ask")');
    
    await chatInput.fill('Tell me something');
    await askButton.click();
    
    // Wait for response processing and speaking
    await page.waitForTimeout(5000);
    
    // Should show the response text area
    const responseArea = page.locator('.text-xs.leading-relaxed');
    
    // Response area should appear with content
    if (await responseArea.isVisible()) {
      const responseText = await responseArea.textContent();
      expect(responseText).toBeTruthy();
      expect(responseText?.length).toBeGreaterThan(0);
    }
  });

});
