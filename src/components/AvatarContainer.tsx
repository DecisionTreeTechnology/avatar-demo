import React from 'react';
import { trackInteraction } from '../utils/analytics';

interface AvatarContainerProps {
  talkingHead: any;
  personalitySystem: any;
  avatarReady: boolean;
  avatarError: string | null;
}

export const AvatarContainer: React.FC<AvatarContainerProps> = ({
  talkingHead,
  personalitySystem,
  avatarReady,
  avatarError
}) => {
  return (
    <div className="flex-1 relative min-h-0 overflow-hidden landscape:h-full landscape:flex landscape:items-center landscape:justify-center">
      <div 
        ref={talkingHead.containerRef} 
        data-testid="avatar-container" 
        key="avatar-container-unique"
        data-scene={personalitySystem.currentPersonality === 'fertility_assistant' ? 'fertility_clinic' :
                   personalitySystem.currentPersonality === 'professional' ? 'office' :
                   personalitySystem.currentPersonality === 'casual' ? 'home' : 'park'}
        className="absolute inset-0 mobile-avatar-container landscape:relative landscape:w-full landscape:h-full landscape:max-w-none landscape:max-h-none cursor-pointer"
        onClick={() => {
          trackInteraction({ action: 'avatar_click', context: personalitySystem.currentPersonality });
        }}
      >
        
        {!avatarReady && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600/40 to-pink-600/40 rounded-full mb-6 animate-caring-pulse">
                <svg className="w-10 h-10 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="text-purple-100 text-lg font-medium mb-2">
                {avatarError ? '❌ Connection Issue' : '💝 Your Caring Assistant'}
              </div>
              {!avatarError && (
                <div className="text-purple-200/80 text-sm max-w-xs">
                  Preparing personalized fertility support with empathy and care
                </div>
              )}
              {talkingHead.error && (
                <div className="text-red-300 text-sm max-w-xs">
                  {talkingHead.error}
                  <div className="mt-2 text-xs text-red-400">
                    Please refresh the page to try again
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Smooth entrance animation for avatar */}
        {talkingHead.isReady && (
          <div className="absolute inset-0 animate-fade-in">
            {/* Avatar will appear here */}
          </div>
        )}
      </div>
      {talkingHead.error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
          <div className="glass p-4 rounded-lg text-red-300 text-sm max-w-sm text-center">
            Avatar error: {talkingHead.error}
          </div>
        </div>
      )}
    </div>
  );
};