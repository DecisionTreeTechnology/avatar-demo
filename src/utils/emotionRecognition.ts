// Simple emotion recognition utility
// This is a simplified version to maintain compatibility

export interface TextAnalysisResult {
  emotions: string[];
  intensity: number;
  suggestions: {
    emotion: string;
    gestures: string[];
  }[];
}

export class EmotionRecognitionEngine {
  constructor() {
    // Simple emotion recognition engine
  }

  analyzeText(text: string): TextAnalysisResult {
    // Simple emotion analysis based on keywords
    const lowerText = text.toLowerCase();
    
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'wonderful', 'great', 'amazing', 'fantastic'],
      sad: ['sad', 'upset', 'disappointed', 'down', 'depressed', 'unhappy'],
      anxious: ['anxious', 'worried', 'nervous', 'stress', 'overwhelmed', 'scared'],
      angry: ['angry', 'mad', 'frustrated', 'annoyed', 'irritated'],
      surprised: ['surprised', 'shocked', 'amazed', 'wow', 'unexpected'],
      hopeful: ['hopeful', 'optimistic', 'positive', 'confident', 'believe']
    };

    const detectedEmotions: string[] = [];
    let totalIntensity = 0;

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      if (matches.length > 0) {
        detectedEmotions.push(emotion);
        totalIntensity += matches.length;
      }
    }

    const intensity = Math.min(totalIntensity / 3, 1); // Normalize to 0-1

    // Simple gesture suggestions
    const suggestions = detectedEmotions.map(emotion => ({
      emotion,
      gestures: this.getGesturesForEmotion(emotion)
    }));

    return {
      emotions: detectedEmotions,
      intensity,
      suggestions
    };
  }

  analyzeConversation(messages: Array<{ content: string; role: string }>): TextAnalysisResult {
    // Combine all user messages for analysis
    const userMessages = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    return this.analyzeText(userMessages);
  }

  private getGesturesForEmotion(emotion: string): string[] {
    const gestureMap: Record<string, string[]> = {
      happy: ['wave', 'thumbs_up'],
      sad: ['comfort', 'empathy'],
      anxious: ['calm', 'reassurance'],
      angry: ['calm', 'understanding'],
      surprised: ['surprise', 'wonder'],
      hopeful: ['encouragement', 'support']
    };

    return gestureMap[emotion] || ['neutral'];
  }
}
