import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  talkingHead: any;
  personalitySystem: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  talkingHead,
  personalitySystem
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" data-testid="settings-modal">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
            data-testid="settings-modal-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Personality Selection */}
          <div>
            <label className="block text-sm font-medium mb-3 text-white/90">🤗 Personality</label>
            <div className="text-sm mb-3 text-gray-300">
              Current: <span className="text-purple-400">{personalitySystem.personalityTraits.name}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {personalitySystem.availablePersonalities.map((personality: string) => (
                <button
                  key={personality}
                  onClick={() => {
                    personalitySystem.setPersonality(personality);
                    personalitySystem.applyPersonalityToAvatar(talkingHead);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    personalitySystem.currentPersonality === personality
                      ? 'bg-purple-600 text-white'
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
            <label className="block text-sm font-medium mb-3 text-white/90">😊 Emotions</label>
            <div className="grid grid-cols-4 gap-2">
              {['neutral', 'happy', 'sad', 'angry', 'surprised', 'excited', 'confused', 'thinking'].map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => {
                    if (talkingHead.isReady) {
                      talkingHead.setEmotion(emotion as any, 'normal');
                    }
                  }}
                  className="px-3 py-2 text-sm rounded-lg bg-blue-700 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                  disabled={!talkingHead.isReady}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Gestures */}
          <div>
            <label className="block text-sm font-medium mb-3 text-white/90">👋 Gestures</label>
            <div className="grid grid-cols-4 gap-2">
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
                  className="px-3 py-2 text-sm rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                  disabled={!talkingHead.isReady}
                >
                  {gesture.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Status */}
          <div className="pt-4 border-t border-gray-600">
            <div className={`flex items-center gap-2 text-sm ${talkingHead.isReady ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${talkingHead.isReady ? 'bg-green-400' : 'bg-red-400'}`}></div>
              Avatar {talkingHead.isReady ? 'Ready' : 'Loading...'}
            </div>
            {talkingHead.isSpeaking && (
              <div className="flex items-center gap-2 text-blue-400 mt-1 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                Speaking...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};