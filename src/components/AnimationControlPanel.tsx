import React, { useState } from 'react';
import { EmotionType, GestureType, AnimationIntensity } from '../utils/avatarAnimationManager';
import { UseTalkingHeadResult } from '../hooks/useTalkingHead';
import { UseEmotionRecognitionResult } from '../hooks/useEmotionRecognition';
import { UsePersonalitySystemResult } from '../hooks/usePersonalitySystem';

interface AnimationControlPanelProps {
  avatar: UseTalkingHeadResult;
  emotionRecognition: UseEmotionRecognitionResult;
  personalitySystem: UsePersonalitySystemResult;
  isVisible: boolean;
  onToggle: () => void;
}

const emotions: EmotionType[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'excited', 'confused', 'thinking'];
const gestures: GestureType[] = ['wave', 'nod', 'shake_head', 'point', 'thumbs_up', 'shrug', 'thinking', 'excited'];
const intensities: AnimationIntensity[] = ['subtle', 'normal', 'strong'];

export const AnimationControlPanel: React.FC<AnimationControlPanelProps> = ({
  avatar,
  emotionRecognition,
  personalitySystem,
  isVisible,
  onToggle
}) => {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('neutral');
  const [selectedIntensity, setSelectedIntensity] = useState<AnimationIntensity>('normal');
  const [testText, setTestText] = useState('Hello! I am excited to meet you.');
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const handleEmotionChange = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    if (avatar.isReady) {
      avatar.setEmotion(emotion, selectedIntensity);
    }
  };

  const handleGestureClick = async (gesture: GestureType) => {
    if (avatar.isReady) {
      try {
        await avatar.performGesture(gesture);
      } catch (error) {
        console.error('Failed to perform gesture:', error);
      }
    }
  };

  const handleTestText = async () => {
    if (!avatar.isReady) return;
    
    try {
      const analysis = await emotionRecognition.analyzeAndApply(testText, avatar);
      setLastAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze text:', error);
    }
  };

  if (!isVisible) {
    return (
      <div className="portrait:block landscape:hidden">
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors landscape:bottom-4 landscape:left-4"
          title="Toggle Animation Controls"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900/95 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl max-w-sm w-full max-h-96 overflow-y-auto landscape:bottom-4 landscape:left-4 landscape:max-w-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold landscape:text-base">🎭 Animation Controls</h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Personality Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">🤗 Personality</label>
        <div className="text-xs mb-2 text-gray-300">
          Current: <span className="text-blue-400">{personalitySystem.personalityTraits.name}</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {personalitySystem.availablePersonalities.map((personality) => (
            <button
              key={personality}
              onClick={() => {
                personalitySystem.setPersonality(personality);
                personalitySystem.applyPersonalityToAvatar(avatar);
              }}
              className={`px-3 py-2 text-xs rounded transition-colors text-left ${
                personalitySystem.currentPersonality === personality
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              disabled={!avatar.isReady}
            >
              {personality.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Emotions */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Emotions</label>
        <div className="grid grid-cols-2 gap-2">
          {emotions.map((emotion) => (
            <button
              key={emotion}
              onClick={() => handleEmotionChange(emotion)}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedEmotion === emotion
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              disabled={!avatar.isReady}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Intensity</label>
        <div className="flex gap-2">
          {intensities.map((intensity) => (
            <button
              key={intensity}
              onClick={() => setSelectedIntensity(intensity)}
              className={`px-3 py-2 text-xs rounded transition-colors ${
                selectedIntensity === intensity
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {intensity}
            </button>
          ))}
        </div>
      </div>

      {/* Gestures */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Gestures</label>
        <div className="grid grid-cols-2 gap-2">
          {gestures.map((gesture) => (
            <button
              key={gesture}
              onClick={() => handleGestureClick(gesture)}
              className="px-3 py-2 text-xs rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
              disabled={!avatar.isReady}
            >
              {gesture.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Text Analysis */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Test Text Analysis</label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full p-2 text-xs bg-gray-800 border border-gray-600 rounded resize-none"
          rows={2}
          placeholder="Enter text to analyze emotions..."
        />
        <button
          onClick={handleTestText}
          className="mt-2 w-full px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
          disabled={!avatar.isReady}
        >
          Analyze & Apply
        </button>
      </div>

      {/* Analysis Results */}
      {lastAnalysis && (
        <div className="text-xs bg-gray-800 p-3 rounded">
          <div className="font-medium mb-1">Last Analysis:</div>
          <div>Emotion: <span className="text-blue-400">{lastAnalysis.emotion.primaryEmotion}</span></div>
          <div>Confidence: <span className="text-green-400">{(lastAnalysis.emotion.confidence * 100).toFixed(1)}%</span></div>
          <div>Gestures: <span className="text-purple-400">{lastAnalysis.emotion.suggestedGestures.join(', ') || 'None'}</span></div>
          <div>Sentiment: <span className="text-yellow-400">{lastAnalysis.sentiment}</span></div>
        </div>
      )}

      {/* Avatar Status */}
      <div className="mt-4 pt-3 border-t border-gray-700 text-xs">
        <div className={`flex items-center gap-2 ${avatar.isReady ? 'text-green-400' : 'text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${avatar.isReady ? 'bg-green-400' : 'bg-red-400'}`}></div>
          Avatar {avatar.isReady ? 'Ready' : 'Loading...'}
        </div>
        {avatar.isSpeaking && (
          <div className="flex items-center gap-2 text-blue-400 mt-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            Speaking...
          </div>
        )}
      </div>
    </div>
  );
};
