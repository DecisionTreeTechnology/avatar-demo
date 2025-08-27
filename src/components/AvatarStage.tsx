import React from 'react';
import { useTalkingHead } from '../hooks/useTalkingHead';

interface AvatarStageProps {
  className?: string;
}

export const AvatarStage: React.FC<AvatarStageProps> = ({ className }) => {
  const { containerRef, isReady, isSpeaking } = useTalkingHead();
  return (
    <div className={className + ' relative w-full h-full'}>
      <div ref={containerRef} className="absolute inset-0" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Loading avatar...</div>
      )}
      {isSpeaking && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded-full bg-black/50 text-white">Speaking</div>
      )}
    </div>
  );
};
