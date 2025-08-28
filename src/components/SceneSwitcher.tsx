import React from 'react';
import { SceneManager, SceneType } from '../utils/sceneManager';

interface SceneSwitcherProps {
  currentScene: SceneType;
  onSceneChange: (scene: SceneType) => void;
  disabled?: boolean;
}

export const SceneSwitcher: React.FC<SceneSwitcherProps> = ({ 
  currentScene, 
  onSceneChange, 
  disabled = false 
}) => {
  const scenes = SceneManager.getAllScenes();

  return (
    <div className="scene-switcher p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
      <h3 className="text-sm font-medium text-gray-200 mb-3">🎬 Background Scene</h3>
      
      <div className="grid grid-cols-1 gap-2">
        {Object.entries(scenes).map(([sceneType, config]) => (
          <button
            key={sceneType}
            onClick={() => onSceneChange(sceneType as SceneType)}
            disabled={disabled}
            className={`p-3 rounded-lg text-left transition-all ${
              currentScene === sceneType
                ? 'bg-blue-600/80 text-white border border-blue-400/50'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="font-medium text-sm">{config.name}</div>
            <div className="text-xs opacity-75 mt-1">{config.description}</div>
            <div className="flex gap-2 mt-2">
              <span className="inline-block px-2 py-1 bg-black/20 rounded text-xs">
                {config.mood}
              </span>
              <span className="inline-block px-2 py-1 bg-black/20 rounded text-xs">
                {config.lighting}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-600/30 rounded text-xs text-blue-200">
        💡 <strong>Current:</strong> {scenes[currentScene].name}
        <br />
        <span className="opacity-75">{scenes[currentScene].description}</span>
      </div>
    </div>
  );
};
