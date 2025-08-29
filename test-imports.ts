// Temporary test file to verify imports work
import { EmotionType } from './src/utils/avatarAnimationManager';
import { PersonalityManager, PersonalityType, PersonalityTraits } from './src/utils/personalitySystem';

// This should compile without errors if imports are working
const emotion: EmotionType = 'happy';
const personality: PersonalityType = 'fertility_assistant';

console.log('Imports working:', { emotion, personality });
