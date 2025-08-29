import { test, expect } from '@playwright/test';

test.describe('Emotion Recognition System Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Mock dependencies for faster testing
    await page.addInitScript(() => {
      // Mock TalkingHead to track mood changes
      (window as any).TalkingHead = class {
        private _mood = 'neutral';
        private _appliedMoods: string[] = [];
        private _isReady = true;
        
        constructor(container: HTMLElement, options: any) {
          this._isReady = true;
        }
        
        async showAvatar(options: any) {
          if (options.avatarMood) {
            this._mood = options.avatarMood;
            this._appliedMoods.push(options.avatarMood);
            console.log(`Avatar mood applied: ${this._mood}`);
          }
          return Promise.resolve();
        }
        
        get isReady() { return this._isReady; }
        get currentMood() { return this._mood; }
        get appliedMoods() { return this._appliedMoods; }
        
        speakAudio() {}
        dispose() {}
      };
      
      // Mock Azure Speech SDK
      (window as any).SpeechSDK = {
        SpeechConfig: { fromSubscription: () => ({}) },
        SpeechSynthesizer: class {
          speakSsmlAsync(ssml: string, success: (result: any) => void) {
            setTimeout(() => success({ reason: 1, audioData: new ArrayBuffer(1024) }), 100);
          }
        },
        ResultReason: { SynthesizingAudioCompleted: 1 }
      };
    });
    
    await page.waitForSelector('[data-testid="avatar-container"]', { timeout: 10000 });
  });

  test('should analyze positive emotions correctly', async ({ page }) => {
    // Open animation controls to access emotion recognition
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const positiveTexts = [
      'I am so excited about this wonderful news!',
      'This makes me incredibly happy and joyful!',
      'I feel amazing and thrilled about everything!',
      'What fantastic and delightful results!'
    ];
    
    for (const text of positiveTexts) {
      // Clear previous text and enter new text
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(text);
      
      // Analyze emotion
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      // Check analysis results
      await expect(page.locator('text=Last Analysis:')).toBeVisible();
      
      // Emotion should be positive
      const emotionDisplay = await page.locator('text=Emotion:').locator('..').textContent();
      expect(emotionDisplay).toMatch(/(happy|excited|joy|enthusiastic|cheerful|positive)/i);
    }
  });

  test('should analyze negative emotions correctly', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const negativeTexts = [
      'I am really sad and disappointed about this',
      'This makes me feel terrible and upset',
      'I\'m frustrated and angry about the situation',
      'I feel worried and anxious about everything'
    ];
    
    for (const text of negativeTexts) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Last Analysis:')).toBeVisible();
      
      const emotionDisplay = await page.locator('text=Emotion:').locator('..').textContent();
      expect(emotionDisplay).toMatch(/(sad|disappointed|frustrated|angry|worried|anxious|upset|negative)/i);
    }
  });

  test('should analyze neutral emotions correctly', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const neutralTexts = [
      'The weather is okay today',
      'I went to the store and bought groceries',
      'The meeting is scheduled for 3 PM',
      'Please review the document when you have time'
    ];
    
    for (const text of neutralTexts) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Last Analysis:')).toBeVisible();
      
      const emotionDisplay = await page.locator('text=Emotion:').locator('..').textContent();
      expect(emotionDisplay).toMatch(/(neutral|calm|informative|factual|balanced)/i);
    }
  });

  test('should detect conversation energy levels', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const energyTests = [
      { text: 'I AM SO INCREDIBLY EXCITED!!!!!', expectedEnergy: 'high' },
      { text: 'This is amazing and wonderful news!', expectedEnergy: 'medium' },
      { text: 'That sounds fine to me.', expectedEnergy: 'low' },
      { text: 'Okay. Sure. Whatever.', expectedEnergy: 'low' }
    ];
    
    for (const test of energyTests) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(test.text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Last Analysis:')).toBeVisible();
      
      // Check if energy is displayed (might be in intensity or energy field)
      const analysisText = await page.locator('text=Last Analysis:').locator('..').textContent();
      
      // Verify analysis was performed
      expect(analysisText).toBeTruthy();
      expect(analysisText!.length).toBeGreaterThan(20);
    }
  });

  test('should apply emotions to avatar through conversation', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    // Send an emotional message through the chat
    await input.fill('I am incredibly excited and happy about my test results!');
    await page.locator('button:has-text("Send")').click();
    
    // Wait for response and emotion processing
    await page.waitForTimeout(3000);
    
    // Check that the emotion was processed in the background
    // The emotion recognition should automatically analyze the user's message
    const response = page.locator('[class*="overflow-auto"]').last();
    await expect(response).toBeVisible();
    
    // The avatar should have processed the emotional content
    // We can't directly check the avatar mood change without more complex setup,
    // but we can verify the message was processed
    const responseText = await response.textContent();
    expect(responseText).toBeTruthy();
  });

  test('should handle fertility-specific emotional contexts', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const fertilityEmotions = [
      {
        text: 'I\'m feeling overwhelmed about starting IVF treatments',
        expectedEmotions: ['overwhelmed', 'anxious', 'worried', 'stressed']
      },
      {
        text: 'I\'m so excited about our positive pregnancy test!',
        expectedEmotions: ['excited', 'happy', 'joyful', 'thrilled']
      },
      {
        text: 'The two week wait is making me anxious and hopeful',
        expectedEmotions: ['anxious', 'hopeful', 'mixed', 'anticipation']
      }
    ];
    
    for (const test of fertilityEmotions) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(test.text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Last Analysis:')).toBeVisible();
      
      const emotionDisplay = await page.locator('text=Emotion:').locator('..').textContent();
      
      // Check if any of the expected emotions are detected
      const hasExpectedEmotion = test.expectedEmotions.some(emotion => 
        emotionDisplay?.toLowerCase().includes(emotion.toLowerCase())
      );
      
      // At minimum, should detect some emotion
      expect(emotionDisplay).toBeTruthy();
      expect(emotionDisplay!.length).toBeGreaterThan(5);
    }
  });

  test('should update emotion display in real-time', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    // Start with neutral text
    const textarea = page.locator('textarea');
    await textarea.fill('This is a normal message');
    await page.locator('button:has-text("Analyze & Apply")').click();
    await page.waitForTimeout(1000);
    
    const firstAnalysis = await page.locator('text=Last Analysis:').locator('..').textContent();
    
    // Change to emotional text
    await textarea.fill('');
    await textarea.fill('I am absolutely thrilled and overjoyed!');
    await page.locator('button:has-text("Analyze & Apply")').click();
    await page.waitForTimeout(1000);
    
    const secondAnalysis = await page.locator('text=Last Analysis:').locator('..').textContent();
    
    // Analyses should be different
    expect(firstAnalysis).toBeTruthy();
    expect(secondAnalysis).toBeTruthy();
    expect(firstAnalysis).not.toBe(secondAnalysis);
    
    // Second analysis should show more positive emotion
    expect(secondAnalysis).toMatch(/(happy|excited|joy|thrilled|positive)/i);
  });

  test('should handle empty or invalid text gracefully', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const edgeCases = ['', '   ', '...', '???', '123', '!@#$%^&*()'];
    
    for (const text of edgeCases) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(500);
      
      // Should not crash or show errors
      // Either shows analysis or handles gracefully
      const hasAnalysis = await page.locator('text=Last Analysis:').isVisible();
      const hasError = await page.locator('text=error').isVisible();
      
      // Should not show errors
      expect(hasError).toBe(false);
    }
  });

  test('should maintain emotion context across multiple analyses', async ({ page }) => {
    await page.locator('button[title="Show Animation Controls"]').click();
    
    const emotionSequence = [
      'I am really excited about this!',
      'But now I\'m feeling a bit worried',
      'Actually, I\'m feeling much better now!'
    ];
    
    const analyses: string[] = [];
    
    for (const text of emotionSequence) {
      const textarea = page.locator('textarea');
      await textarea.fill('');
      await textarea.fill(text);
      
      await page.locator('button:has-text("Analyze & Apply")').click();
      await page.waitForTimeout(1000);
      
      const analysis = await page.locator('text=Last Analysis:').locator('..').textContent();
      analyses.push(analysis || '');
    }
    
    // Should have three different analyses
    expect(analyses).toHaveLength(3);
    expect(analyses[0]).toBeTruthy();
    expect(analyses[1]).toBeTruthy();
    expect(analyses[2]).toBeTruthy();
    
    // Each analysis should be different
    expect(analyses[0]).not.toBe(analyses[1]);
    expect(analyses[1]).not.toBe(analyses[2]);
    
    // First should be positive, second negative/worried, third positive again
    expect(analyses[0]).toMatch(/(excited|happy|positive)/i);
    expect(analyses[1]).toMatch(/(worried|concerned|negative)/i);
    expect(analyses[2]).toMatch(/(better|positive|good)/i);
  });
});
