# Bulletproof Microphone State Management

This implementation provides robust microphone state management to prevent audio feedback loops where the LLM's voice gets captured by the microphone and fed back into the system.

## 🎯 Problem Solved

**Audio Feedback Loop Prevention**: When an avatar speaks (TTS playback), the microphone would capture that audio and feed it back into the speech recognition system, causing:
- Echo effects
- Duplicate responses
- Degraded user experience
- Infinite feedback loops
- Particularly problematic on iOS devices

## 🛡️ Solution Architecture

### Core Components

1. **`MicrophoneStateManager`** (`src/utils/microphoneStateManager.ts`)
   - Central authority for microphone state
   - Prevents capture during TTS playback
   - Handles iOS-specific audio quirks
   - Robust error handling and recovery

2. **`useEnhancedSpeechRecognition`** (`src/hooks/useEnhancedSpeechRecognition.ts`)
   - React hook interface to the state manager
   - Integrates with component lifecycle
   - Provides clean state updates

3. **`EnhancedChatBar`** (`src/components/EnhancedChatBar.tsx`)
   - UI component with visual feedback
   - Integrates with TTS state
   - Clear microphone state indicators

4. **Enhanced TTS Integration** (`src/hooks/useEnhancedAzureTTS.ts`)
   - Notifies microphone manager about TTS state
   - Proper timing coordination
   - Error handling

## 🔧 Key Features

### ✅ Feedback Prevention
- **Automatic Mic Muting**: Microphone is immediately disabled when TTS starts
- **Smart Restart Logic**: Controlled restart after TTS completes
- **Filtering**: Short utterances (likely feedback) are filtered out
- **iOS Safety Delays**: Additional delays for iOS audio stability

### ✅ Robust State Management
- **Single Source of Truth**: Centralized state prevents conflicts
- **Event-Driven Architecture**: Clean separation of concerns
- **Error Recovery**: Automatic retry with exponential backoff
- **Cleanup Handling**: Proper resource disposal

### ✅ Platform Compatibility
- **iOS Safari**: Special handling for webkit audio context
- **iOS Chrome**: Compatibility workarounds
- **Desktop Browsers**: Optimized performance
- **Permission Handling**: Graceful permission denied scenarios

### ✅ Visual Feedback
- **Clear States**: Microphone off, listening, waiting, disabled
- **Error Display**: User-friendly error messages
- **Debug Info**: Development mode debugging
- **Accessibility**: Screen reader friendly

## 🔄 State Flow

```
User Intent to Listen
        ↓
    Check if Safe
   (No TTS Playing)
        ↓
   Start Recognition
        ↓
    User Speaks → TTS Triggered
        ↓
  Force Stop Microphone
        ↓
   TTS Plays Audio
        ↓
  Post-Playback Delay
        ↓
 Optional Auto-Restart
```

## 🧪 Testing Strategy

Comprehensive test suite covers:

- **Feedback Prevention**: Microphone disabled during TTS
- **State Transitions**: Proper state changes
- **Error Handling**: Permission errors, network issues
- **Platform Specific**: iOS Safari/Chrome behaviors
- **Edge Cases**: Rapid state changes, cleanup

Test file: `tests/microphone-state-management.spec.ts`

## 🚀 Usage

### Basic Integration

```typescript
// In your React component
import { useEnhancedSpeechRecognition } from './hooks/useEnhancedSpeechRecognition';

const MyComponent = () => {
  const speechRecognition = useEnhancedSpeechRecognition({
    feedbackFilterThreshold: 3, // Filter short utterances
    autoRestartAfterTTS: false  // Manual control preferred
  });

  // Start listening
  const handleStartListening = () => {
    speechRecognition.startListening();
  };

  // TTS integration
  const handleTTSStart = () => {
    speechRecognition.notifyTTSStarted();
  };

  const handleTTSEnd = () => {
    speechRecognition.notifyTTSEnded();
  };

  return (
    <div>
      <button 
        onClick={handleStartListening}
        disabled={!speechRecognition.canStartCapture}
      >
        {speechRecognition.isListening ? 'Stop' : 'Start'} Listening
      </button>
      
      {speechRecognition.error && (
        <div className="error">{speechRecognition.error}</div>
      )}
    </div>
  );
};
```

### TTS Integration

```typescript
// In your TTS hook
import { getMicrophoneManager } from '../utils/microphoneStateManager';

const useTTS = () => {
  const playAudio = async (audioBuffer: AudioBuffer) => {
    // Notify microphone manager
    const micManager = getMicrophoneManager();
    micManager.notifyTTSStarted();

    try {
      // Play audio...
      await playAudioBuffer(audioBuffer);
    } finally {
      // Always notify end, even on error
      micManager.notifyTTSEnded();
    }
  };

  return { playAudio };
};
```

## 🔧 Configuration Options

### MicrophoneStateManager Options

```typescript
interface MicrophoneManagerOptions {
  minSilenceDuration?: number;    // 500ms - Silence before considering speech ended
  maxRetryAttempts?: number;      // 3 - Maximum retry attempts for failed starts
  feedbackFilterThreshold?: number; // 2 - Minimum length for valid speech input
  autoRestartAfterTTS?: boolean;  // false - Whether to auto-restart after TTS
  debounceDelay?: number;         // 300ms - Debounce delay for rapid state changes
}
```

### Enhanced Speech Recognition Options

```typescript
interface UseEnhancedSpeechRecognitionOptions {
  feedbackFilterThreshold?: number;  // 2 - Filter very short utterances
  autoRestartAfterTTS?: boolean;      // false - Auto-restart behavior
}
```

## 🐛 Common Issues & Solutions

### Issue: Microphone doesn't start on iOS
**Solution**: Ensure user interaction before starting. Use `onInteraction` callback.

### Issue: Audio context suspended
**Solution**: The system handles this automatically with retry logic.

### Issue: Permission denied
**Solution**: Clear error messaging with platform-specific guidance.

### Issue: Echo/feedback still occurring
**Solution**: 
- Check `feedbackFilterThreshold` setting
- Verify TTS notifications are properly sent
- Increase `postPlaybackDelay`

## 📊 Performance Considerations

- **Memory**: Singleton pattern prevents multiple instances
- **CPU**: Minimal overhead with event-driven architecture
- **Network**: No additional network requests
- **Battery**: Proper cleanup prevents background drain

## 🔒 Security & Privacy

- **No Data Storage**: No speech data is stored
- **Local Processing**: All processing happens client-side
- **Permission Respect**: Proper handling of denied permissions
- **Clean Shutdown**: Ensures microphone access is released

## 🚀 Future Enhancements

- **Voice Activity Detection**: More intelligent speech detection
- **Noise Cancellation**: Built-in noise filtering
- **Multiple Languages**: Language-specific feedback thresholds
- **Analytics**: Usage and error metrics
- **Custom Filters**: User-defined feedback patterns

## 📝 Migration Guide

### From Old ChatBar to EnhancedChatBar

1. Replace import:
   ```typescript
   // Old
   import { ChatBar } from './components/ChatBar';
   
   // New
   import { EnhancedChatBar } from './components/EnhancedChatBar';
   ```

2. Update props:
   ```typescript
   // Old
   <ChatBar disabled={busy} onSend={handleAsk} />
   
   // New
   <EnhancedChatBar 
     disabled={busy} 
     onSend={handleAsk}
     isTTSSpeaking={isSpeaking}
   />
   ```

3. Update TTS integration:
   ```typescript
   // Add to your TTS implementation
   const { speakTextAndPlay, isSpeaking } = useEnhancedAzureTTS();
   ```

## 🧪 Testing Commands

```bash
# Run all microphone tests
npm test -- --grep "Microphone State Management"

# Run specific test
npm test -- --grep "should disable microphone when avatar starts speaking"

# Run with debug output
DEBUG=1 npm test -- --grep "Microphone"

# Run on specific browser
npm test -- --project="Mobile Safari" --grep "Microphone"
```

## 📚 References

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [iOS Audio Context Best Practices](https://developer.apple.com/documentation/webkit/audio-web-api)
- [Echo Cancellation Techniques](https://webrtc.org/getting-started/media-capture-and-constraints)

---

**Result**: ✅ Bulletproof microphone state management that prevents audio feedback loops while providing excellent user experience across all platforms, especially iOS devices.
