# iOS TTS Debugging Guide

This guide provides comprehensive tools and techniques for debugging iOS Text-to-Speech (TTS) issues in the Avatar Demo application, particularly focusing on iOS Chrome compatibility problems.

## Overview

iOS devices have specific audio handling requirements that can cause TTS to fail, especially in iOS Chrome. This debugging suite provides:

1. **Comprehensive iOS detection and compatibility testing**
2. **Real-time debugging panel with detailed diagnostics**
3. **Browser simulation tools for testing without physical devices**
4. **Automated test suite for regression testing**
5. **Remote debugging setup for physical iOS devices**

## Quick Start

### 1. Using the Debug Panel

The debug panel is automatically available in development mode or when using debug URL parameters:

```bash
# Start development server
npm run dev

# Open with debug panel
http://localhost:5173/?debug=ios-chrome&verbose=true
```

Click the debug button (🖥️) in the top-right corner to open the iOS TTS Debugger panel.

### 2. Browser Simulation Testing

Use the automated testing script to simulate iOS environments:

```bash
# Make script executable (first time only)
chmod +x ./ios-debug.sh

# Run the iOS debugging script
./ios-debug.sh
```

Choose option 1 for full testing environment or option 2 for browser configurations only.

### 3. Run Automated Tests

```bash
# Run iOS-specific debug tests
npm run test:ios-debug

# Run all tests including iOS debugging
npm run test
```

## Debug Panel Features

The iOS TTS Debugger panel provides several tabs with detailed information:

### Overview Tab
- Device detection (iOS/Chrome/Safari)
- User interaction status
- Current issues and recommendations
- Quick status indicators

### Audio Tab
- AudioContext state and configuration
- Web Audio API support testing
- Speech synthesis capabilities
- Sample rate and latency information

### Network Tab
- Connection type and speed
- Memory usage monitoring
- Performance metrics

### Test Tab
- Real-time audio playback testing
- iOS Chrome issue simulation
- Interactive testing tools

## URL Parameters for Testing

Use these URL parameters to enable specific debugging modes:

| Parameter | Values | Description |
|-----------|--------|-------------|
| `debug` | `ios-chrome`, `ios-safari`, `ipad`, `mobile` | Enable specific debug mode |
| `verbose` | `true`, `false` | Enable verbose logging |
| `simulate` | `suspended` | Simulate specific issues |
| `stress` | `true` | Enable stress testing |
| `speed` | `slow`, `fast` | Simulate network conditions |

### Examples

```bash
# Debug iOS Chrome issues
http://localhost:5173/?debug=ios-chrome&verbose=true

# Simulate audio context suspension
http://localhost:5173/?debug=audio-issues&simulate=suspended

# Test with slow network
http://localhost:5173/?debug=network&speed=slow

# Mobile debugging mode
http://localhost:5173/?debug=mobile&mobile=true
```

## Remote iOS Device Debugging

### Prerequisites

1. **iOS Device Setup**:
   - Connect iOS device via USB
   - Enable Web Inspector: Settings > Safari > Advanced > Web Inspector = ON
   - For Chrome: Enable USB debugging in Chrome flags

2. **Mac Setup**:
   - Safari with Develop menu enabled
   - Chrome DevTools for Chrome debugging

### Safari Web Inspector

1. Connect your iOS device via USB
2. Open Safari on Mac
3. Go to Develop menu > [Your Device] > [Your Page]
4. Use Web Inspector to debug

### Chrome DevTools

1. Open Chrome on your iOS device
2. In Chrome on Mac, go to `chrome://inspect`
3. Enable "Discover USB devices"
4. Connect device and authorize
5. Click "Inspect" next to your page

### Network Access

Get your local development server's IP:

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from iOS device
http://[YOUR-IP]:5173/?debug=ios-device&mobile=true
```

## Common iOS TTS Issues and Solutions

### 1. AudioContext Suspended in iOS Chrome

**Issue**: AudioContext remains in 'suspended' state even after user interaction.

**Detection**: Debug panel shows AudioContext state as 'suspended' with warning.

**Solutions**:
- Enable "Request Desktop Site" in iOS Chrome
- Ensure proper user gesture handling
- Add additional resume attempts with delays

### 2. Low Sample Rate Issues

**Issue**: iOS Chrome may default to lower sample rates.

**Detection**: Debug panel shows sample rate below 44100Hz.

**Solutions**:
- Explicitly set sample rate to 48000Hz
- Use webkitAudioContext fallback
- Test with different audio formats

### 3. Web Audio API Limitations

**Issue**: Some Web Audio features not available in iOS Chrome.

**Detection**: Debug panel shows missing Web Audio capabilities.

**Solutions**:
- Implement fallbacks for missing features
- Use alternative audio processing methods
- Consider iOS Safari as primary target

### 4. Memory Pressure Issues

**Issue**: High memory usage causing audio failures.

**Detection**: Debug panel shows high memory usage percentage.

**Solutions**:
- Optimize audio buffer management
- Implement audio buffer recycling
- Monitor and limit concurrent audio processes

## Browser Simulation

The debug script opens multiple browser windows with different iOS configurations:

```bash
./ios-debug.sh
# Choose option 2 for browser testing only
```

This opens:
- Chrome with iOS Chrome user agent
- Safari with iPad simulation
- Chrome with desktop mode simulation

## Automated Testing

The test suite includes specific iOS debugging scenarios:

```typescript
// Run specific iOS debug test
npm run test -- --grep "iOS TTS Debugging"

// Run with different viewports
npm run test -- --grep "Different Viewports"
```

### Test Coverage

- iOS Chrome user agent detection
- AudioContext state management
- Debug panel functionality
- Report generation and export
- Issue simulation and recovery
- Cross-browser compatibility

## Development Workflow

### 1. Daily Development

```bash
# Start with debug mode
npm run dev
# Add ?debug=true to URL for debug panel access
```

### 2. Testing iOS Changes

```bash
# Quick browser simulation
./ios-debug.sh # Choose option 2

# Full automated testing
npm run test:ios-debug
```

### 3. Production Debugging

```bash
# Build with debug flags
npm run build

# Test production build with debug
npx serve dist
# Access: http://localhost:3000/?debug=production
```

## Troubleshooting

### Debug Panel Not Appearing

1. Check if you're in development mode or using debug URL parameters
2. Ensure imports are correct in App.tsx
3. Check browser console for JavaScript errors

### iOS Simulator Not Working

1. Install Xcode command line tools: `xcode-select --install`
2. Install full Xcode from App Store
3. Check simulator list: `xcrun simctl list devices`

### Remote Debugging Connection Issues

1. Ensure both devices are on same network
2. Check firewall settings
3. Verify Web Inspector is enabled on iOS
4. Try restarting both devices

### Audio Tests Failing

1. Check microphone permissions
2. Ensure speakers/headphones are connected
3. Test with different audio sample rates
4. Check for other audio applications interfering

## Performance Monitoring

### Memory Usage

Monitor memory usage in the debug panel:
- Keep usage below 80% of limit
- Watch for memory leaks in audio buffers
- Clear unused AudioContext objects

### Network Performance

- Monitor connection type and speed
- Adjust audio quality based on network
- Implement progressive loading for better UX

### Battery Impact

- Minimize continuous audio processing
- Use efficient audio codecs
- Implement smart scheduling for background tasks

## Contributing

When adding new iOS debugging features:

1. Update the debug panel with new information
2. Add corresponding automated tests
3. Update this documentation
4. Test on multiple iOS devices and browsers

### Adding New Debug Information

```typescript
// In iosDebugger.ts
const newDebugInfo = {
  // Add your debug information
};

// In IOSDebugPanel.tsx
// Add UI components to display the information

// In ios-debug.spec.ts
// Add automated tests for the new feature
```

## Resources

- [iOS Safari Web Audio Limitations](https://developer.apple.com/documentation/webkit/safari_web_content_guide/playing_audio_and_video)
- [Chrome DevTools for Mobile](https://developer.chrome.com/docs/devtools/device-mode/)
- [WebKit Audio Context Guidelines](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Playwright Testing Framework](https://playwright.dev/)

## Support

For issues related to iOS TTS debugging:

1. Check the debug panel for specific error messages
2. Review this documentation for common solutions
3. Run the automated test suite to identify regressions
4. Use the browser simulation tools to reproduce issues
5. Generate and share debug reports for detailed analysis
