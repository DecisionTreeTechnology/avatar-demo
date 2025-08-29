# 🔧 Debug Panel Toggle Feature

## Overview
The microphone debug panel now has a toggleable interface for better development experience. The debug information is only available in development mode and can be shown/hidden as needed.

## Usage

### Development Mode
When running `npm run dev`, you'll see:
- **🔧 Debug Toggle Button**: Orange button with a lightbulb icon next to the settings button
- **Click to Show**: Debug panel appears showing real-time microphone state
- **Click to Hide**: Debug panel disappears (or click the × in the panel)

### Production Mode  
When running `npm run build`, the debug toggle and panel are completely removed from the build.

## Debug Panel Information

When visible, the debug panel shows:

```
🔧 Microphone Debug               ×
Listening: 🟢/🔴    (Is speech recognition actively listening)
Intent: 🟢/🔴       (Has user clicked mic button to express intent)
Can Start: 🟢/🔴    (Can capture start based on TTS/permission state)
TTS: 🟢/🔴          (Is TTS currently speaking/playing audio)
Retries: 0          (Number of speech recognition retry attempts)
```

### Status Indicators:
- **🟢 Green**: Active/Enabled/Available
- **🔴 Red**: Inactive/Disabled/Blocked

## Use Cases

### 🔍 Debugging Microphone Issues:
- Check if microphone permissions are granted
- Verify TTS state coordination is working
- Monitor feedback prevention system status
- Track retry attempts during errors

### 🧪 Testing Microphone State Management:
- Verify TTS properly blocks microphone capture
- Confirm microphone re-enables after TTS ends
- Monitor state transitions during conversations
- Validate iOS-specific audio context handling

### 🚀 Development Flow:
1. **Hidden by default** - Clean interface during normal development
2. **Toggle when needed** - Quick access to debug info
3. **Auto-removed in production** - No debug code in final build

## Technical Implementation

### Toggle State:
```typescript
const [showDebugPanel, setShowDebugPanel] = useState(false);
```

### Conditional Rendering:
```typescript
{process.env.NODE_ENV === 'development' && showDebugPanel && (
  <div className="debug-panel">
    {/* Debug info here */}
  </div>
)}
```

### Debug Button:
- Only shown in development mode
- Visual feedback when panel is active (orange vs gray)
- Accessible tooltip with clear description

## Benefits

✅ **Clean Development UI** - Debug info hidden by default  
✅ **On-Demand Debugging** - Show debug info only when needed  
✅ **Production Clean** - Zero debug code in production builds  
✅ **Better UX** - Professional appearance without debug clutter  
✅ **Quick Access** - Single click to toggle debug visibility  

---

*This feature enhances the bulletproof microphone state management system with developer-friendly debugging capabilities.*
