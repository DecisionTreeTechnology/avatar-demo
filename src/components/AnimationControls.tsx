import React from 'react';

interface AnimationControlsProps {
  show: boolean;
  talkingHead: any;
  personalitySystem: any;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  show,
  talkingHead,
  personalitySystem
}) => {
  if (!show) return null;

  return (
    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-white/10 max-h-96 overflow-y-auto">
      <div className="space-y-4">
        {/* Personality Selection */}
        <div>
          <label className="block text-xs font-medium mb-2 text-white/80">🤗 Personality</label>
          <div className="text-xs mb-2 text-gray-300">
            Current: <span className="text-blue-400">{personalitySystem.personalityTraits.name}</span>
          </div>
          <div className="grid grid-cols-1 gap-1">
            {personalitySystem.availablePersonalities.map((personality: string) => (
              <button
                key={personality}
                onClick={() => {
                  personalitySystem.setPersonality(personality);
                  personalitySystem.applyPersonalityToAvatar(talkingHead);
                }}
                className={`px-2 py-1 text-xs rounded transition-colors text-left ${
                  personalitySystem.currentPersonality === personality
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                disabled={!talkingHead.isReady}
              >
                {personality.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Emotions */}
        <div>
          <label className="block text-xs font-medium mb-2 text-white/80">😊 Emotions</label>
          <div className="grid grid-cols-4 portrait:grid-cols-2 gap-1">
            {['neutral', 'happy', 'sad', 'angry', 'surprised', 'excited', 'confused', 'thinking'].map((emotion) => (
              <button
                key={emotion}
                onClick={() => {
                  if (talkingHead.isReady) {
                    talkingHead.setEmotion(emotion as any, 'normal');
                  }
                }}
                className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                disabled={!talkingHead.isReady}
              >
                {emotion}
              </button>
            ))}
          </div>
        </div>

        {/* Gestures */}
        <div>
          <label className="block text-xs font-medium mb-2 text-white/80">👋 Gestures</label>
          <div className="grid grid-cols-4 portrait:grid-cols-2 gap-1">
            {['wave', 'nod', 'shake_head', 'point', 'thumbs_up', 'shrug', 'thinking', 'excited'].map((gesture) => (
              <button
                key={gesture}
                onClick={async () => {
                  if (talkingHead.isReady) {
                    try {
                      await talkingHead.performGesture(gesture as any);
                    } catch (error) {
                      console.error('Failed to perform gesture:', error);
                    }
                  }
                }}
                className="px-2 py-1 text-xs rounded bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                disabled={!talkingHead.isReady}
              >
                {gesture.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Status */}
        <div className="pt-2 border-t border-gray-600 text-xs">
          <div className={`flex items-center gap-2 ${talkingHead.isReady ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${talkingHead.isReady ? 'bg-green-400' : 'bg-red-400'}`}></div>
            Avatar {talkingHead.isReady ? 'Ready' : 'Loading...'}
          </div>
          {talkingHead.isSpeaking && (
            <div className="flex items-center gap-2 text-blue-400 mt-1">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              Speaking...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};