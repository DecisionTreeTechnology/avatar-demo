import { EmotionType, GestureType } from './avatarAnimationManager';

export interface EmotionAnalysis {
  primaryEmotion: EmotionType;
  confidence: number;
  suggestedGestures: GestureType[];
  intensity: 'subtle' | 'normal' | 'strong';
}

export interface TextAnalysisResult {
  emotion: EmotionAnalysis;
  keywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'low' | 'medium' | 'high';
}

export class EmotionRecognitionEngine {
  private emotionKeywords: Record<EmotionType, string[]> = {
    happy: [
      'happy', 'joy', 'excited', 'wonderful', 'amazing', 'great', 'fantastic', 
      'love', 'like', 'enjoy', 'pleased', 'delighted', 'cheerful', 'glad',
      'awesome', 'perfect', 'excellent', 'brilliant', 'marvelous', 'terrific',
      '😊', '😄', '😃', '🎉', '👍', '❤️', '🥳'
    ],
    sad: [
      'sad', 'sorry', 'unhappy', 'disappointed', 'upset', 'down', 'blue',
      'depressed', 'lonely', 'hurt', 'painful', 'tragic', 'unfortunate',
      'regret', 'miss', 'cry', 'tears', 'heartbroken', 'devastated',
      '😢', '😭', '😞', '💔', '😔', '☹️'
    ],
    angry: [
      'angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated',
      'outraged', 'livid', 'enraged', 'hate', 'disgusted', 'pissed',
      'terrible', 'awful', 'horrible', 'stupid', 'ridiculous', 'unacceptable',
      '😠', '😡', '🤬', '💢', '👿'
    ],
    surprised: [
      'surprised', 'shocked', 'amazed', 'astonished', 'wow', 'incredible',
      'unbelievable', 'unexpected', 'sudden', 'startled', 'stunned',
      'overwhelmed', 'blown away', 'mind-blowing', 'extraordinary',
      '😲', '😮', '🤯', '😱', '🙀'
    ],
    excited: [
      'excited', 'thrilled', 'pumped', 'enthusiastic', 'eager', 'energetic',
      'hyped', 'fired up', 'can\'t wait', 'amazing opportunity', 'breakthrough',
      'victory', 'success', 'achievement', 'celebration', 'party',
      '🎉', '🚀', '⚡', '🔥', '🎊', '🥳', '🎈'
    ],
    confused: [
      'confused', 'puzzled', 'perplexed', 'bewildered', 'unclear', 'uncertain',
      'don\'t understand', 'what do you mean', 'how', 'why', 'explain',
      'complicated', 'complex', 'lost', 'baffled', 'mystified',
      '🤔', '😕', '😵', '🤷', '❓', '❔'
    ],
    thinking: [
      'think', 'consider', 'analyze', 'evaluate', 'ponder', 'reflect',
      'contemplate', 'deliberate', 'examine', 'study', 'research',
      'let me think', 'hmm', 'interesting', 'complex question', 'deep',
      '🤔', '💭', '🧠', '📚', '🔍'
    ],
    neutral: [
      'okay', 'fine', 'alright', 'yes', 'no', 'maybe', 'perhaps',
      'understood', 'noted', 'acknowledge', 'continue', 'proceed'
    ]
  };

  private gestureKeywords: Record<GestureType, string[]> = {
    wave: ['hello', 'hi', 'hey', 'greetings', 'goodbye', 'bye', 'farewell', 'see you'],
    nod: ['yes', 'agree', 'correct', 'right', 'exactly', 'absolutely', 'definitely', 'sure'],
    shake_head: ['no', 'disagree', 'wrong', 'incorrect', 'never', 'absolutely not', 'refuse'],
    point: ['look', 'see', 'there', 'here', 'that', 'this', 'over there', 'check this'],
    thumbs_up: ['good job', 'well done', 'excellent', 'approved', 'like it', 'perfect', 'great work'],
    shrug: ['don\'t know', 'maybe', 'perhaps', 'unsure', 'who knows', 'could be', 'not sure'],
    thinking: ['let me think', 'hmm', 'consider', 'analyze', 'complex', 'difficult question'],
    excited: ['amazing', 'incredible', 'fantastic', 'breakthrough', 'celebration', 'victory', 'success']
  };

  private urgencyKeywords = {
    high: ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'important', 'rush', 'quickly'],
    medium: ['soon', 'please', 'when possible', 'fairly important', 'should', 'need to'],
    low: ['whenever', 'eventually', 'no rush', 'when you can', 'if possible']
  };

  public analyzeText(text: string): TextAnalysisResult {
    const lowercaseText = text.toLowerCase();
    
    // Analyze emotions
    const emotionScores = this.calculateEmotionScores(lowercaseText);
    const primaryEmotion = this.getPrimaryEmotion(emotionScores);
    const confidence = Math.max(...Object.values(emotionScores));
    
    // Determine intensity based on punctuation and caps
    const intensity = this.determineIntensity(text, confidence);
    
    // Suggest gestures
    const suggestedGestures = this.suggestGestures(lowercaseText, primaryEmotion);
    
    // Determine sentiment and urgency
    const sentiment = this.determineSentiment(emotionScores);
    const urgency = this.determineUrgency(lowercaseText);
    
    // Extract key emotional keywords
    const keywords = this.extractEmotionalKeywords(lowercaseText);

    return {
      emotion: {
        primaryEmotion,
        confidence,
        suggestedGestures,
        intensity
      },
      keywords,
      sentiment,
      urgency
    };
  }

  private calculateEmotionScores(text: string): Record<EmotionType, number> {
    const scores: Record<EmotionType, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 0,
      excited: 0,
      confused: 0,
      thinking: 0
    };

    // Count keyword matches for each emotion
    Object.entries(this.emotionKeywords).forEach(([emotion, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          scores[emotion as EmotionType] += matches.length;
        }
      });
    });

    // Normalize scores
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    if (total > 0) {
      Object.keys(scores).forEach(emotion => {
        scores[emotion as EmotionType] = scores[emotion as EmotionType] / total;
      });
    } else {
      scores.neutral = 1.0; // Default to neutral if no keywords found
    }

    return scores;
  }

  private getPrimaryEmotion(scores: Record<EmotionType, number>): EmotionType {
    let maxEmotion: EmotionType = 'neutral';
    let maxScore = 0;

    Object.entries(scores).forEach(([emotion, score]) => {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as EmotionType;
      }
    });

    return maxEmotion;
  }

  private determineIntensity(text: string, confidence: number): 'subtle' | 'normal' | 'strong' {
    let intensityScore = confidence;

    // Check for intensity indicators
    const exclamationMarks = (text.match(/!/g) || []).length;
    const questionMarks = (text.match(/\?/g) || []).length;
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    const emphasisWords = (text.match(/\b(very|extremely|incredibly|absolutely|totally|completely)\b/gi) || []).length;

    intensityScore += (exclamationMarks * 0.1);
    intensityScore += (questionMarks * 0.05);
    intensityScore += (capsWords * 0.15);
    intensityScore += (emphasisWords * 0.1);

    if (intensityScore > 0.7) return 'strong';
    if (intensityScore > 0.3) return 'normal';
    return 'subtle';
  }

  private suggestGestures(text: string, primaryEmotion: EmotionType): GestureType[] {
    const gestures: GestureType[] = [];

    // Check for gesture-specific keywords
    Object.entries(this.gestureKeywords).forEach(([gesture, keywords]) => {
      const hasKeyword = keywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
      });
      
      if (hasKeyword) {
        gestures.push(gesture as GestureType);
      }
    });

    // Add emotion-based gestures
    switch (primaryEmotion) {
      case 'happy':
      case 'excited':
        if (!gestures.includes('thumbs_up')) gestures.push('thumbs_up');
        break;
      case 'thinking':
      case 'confused':
        if (!gestures.includes('thinking')) gestures.push('thinking');
        break;
      case 'surprised':
        // Surprised expressions are mainly facial, no specific gesture needed
        break;
      case 'angry':
      case 'sad':
        // Negative emotions typically don't have positive gestures
        break;
      default:
        // For neutral emotions, suggest contextual gestures
        if (text.includes('?') && !gestures.includes('thinking')) {
          gestures.push('thinking');
        }
    }

    return gestures.slice(0, 2); // Limit to 2 gestures to avoid overwhelming
  }

  private determineSentiment(scores: Record<EmotionType, number>): 'positive' | 'negative' | 'neutral' {
    const positiveScore = scores.happy + scores.excited + scores.surprised;
    const negativeScore = scores.sad + scores.angry;
    const neutralScore = scores.neutral + scores.thinking + scores.confused;

    if (positiveScore > negativeScore && positiveScore > neutralScore) {
      return 'positive';
    }
    if (negativeScore > positiveScore && negativeScore > neutralScore) {
      return 'negative';
    }
    return 'neutral';
  }

  private determineUrgency(text: string): 'low' | 'medium' | 'high' {
    const highUrgencyScore = this.urgencyKeywords.high.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);

    const mediumUrgencyScore = this.urgencyKeywords.medium.reduce((score, keyword) => {
      return score + (text.includes(keyword) ? 1 : 0);
    }, 0);

    if (highUrgencyScore > 0) return 'high';
    if (mediumUrgencyScore > 0) return 'medium';
    return 'low';
  }

  private extractEmotionalKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    Object.values(this.emotionKeywords).flat().forEach(keyword => {
      if (text.includes(keyword.toLowerCase()) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords.slice(0, 5); // Limit to top 5 keywords
  }

  // Analyze conversation context for emotion progression
  public analyzeConversationContext(messages: string[]): {
    emotionTrend: EmotionType[];
    overallMood: EmotionType;
    conversationEnergy: 'low' | 'medium' | 'high';
  } {
    const emotionTrend: EmotionType[] = [];
    const allScores: Record<EmotionType, number> = {
      happy: 0, sad: 0, angry: 0, surprised: 0,
      neutral: 0, excited: 0, confused: 0, thinking: 0
    };

    messages.forEach(message => {
      const analysis = this.analyzeText(message);
      emotionTrend.push(analysis.emotion.primaryEmotion);
      
      // Accumulate scores
      Object.keys(allScores).forEach(emotion => {
        allScores[emotion as EmotionType] += this.calculateEmotionScores(message.toLowerCase())[emotion as EmotionType];
      });
    });

    // Determine overall mood
    const overallMood = this.getPrimaryEmotion(allScores);

    // Calculate conversation energy
    const energyEmotions = ['excited', 'happy', 'angry', 'surprised'];
    const energyScore = energyEmotions.reduce((sum, emotion) => sum + allScores[emotion as EmotionType], 0);
    
    let conversationEnergy: 'low' | 'medium' | 'high' = 'low';
    if (energyScore > 0.4) conversationEnergy = 'high';
    else if (energyScore > 0.2) conversationEnergy = 'medium';

    return {
      emotionTrend,
      overallMood,
      conversationEnergy
    };
  }
}
