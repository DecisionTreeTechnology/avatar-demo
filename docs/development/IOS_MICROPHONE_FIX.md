# 🎙️ iOS Microphone Fix Guide

## Current Status
✅ **TTS Working**: Avatar speech is now working on iOS  
❌ **Microphone Not Working**: Due to iOS HTTPS requirement

## The Problem
iOS Safari and Chrome **require HTTPS** for microphone access. Your current setup uses HTTP (`http://192.168.86.242:5173/`), which blocks microphone permissions on iOS.

## 🔧 Enhanced Debugging Added

The app now includes enhanced microphone debugging:

1. **Refresh your iPhone browser** to get the latest code
2. **Click the microphone button** - you should see a helpful error message
3. **Click "Debug"** to open the microphone debug panel
4. **Test microphone access** to see exactly what's blocking it

## 🚀 Solution 1: HTTPS with ngrok (Recommended)

### Step 1: Create Free ngrok Account
1. Visit: https://dashboard.ngrok.com/signup
2. Sign up with email or GitHub
3. Go to "Your Authtoken" page: https://dashboard.ngrok.com/get-started/your-authtoken
4. Copy your authtoken (looks like: `2abc...xyz`)

### Step 2: Configure ngrok
```bash
# Add your authtoken (replace with your actual token)
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE

# Verify configuration
ngrok config check
```

### Step 3: Start HTTPS Tunnel
```bash
# In your avatar-demo directory
ngrok http 5173
```

### Step 4: Use HTTPS URL on iPhone
- ngrok will show something like: `https://abc123.ngrok-free.app`
- Open this HTTPS URL on your iPhone
- Grant microphone permission when prompted
- Test both TTS and microphone

## 🚀 Solution 2: Use Safari (Better Support)

iOS Safari has better speech recognition support than Chrome:

1. **Switch to Safari** on your iPhone (instead of Chrome)
2. **Test microphone** even with HTTP - Safari is more permissive
3. **Check debug panel** for specific Safari capabilities

## 🚀 Solution 3: Deploy to HTTPS Hosting

Deploy to a service that provides HTTPS:

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts, get HTTPS URL
```

### Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Access via `https://username.github.io/avatar-demo`

## 🧪 Testing Checklist

Once you have HTTPS:

### ✅ Basic Functionality
- [ ] App loads on HTTPS
- [ ] TTS still works
- [ ] Microphone button shows no errors
- [ ] Can grant microphone permission

### ✅ Microphone Testing
- [ ] Click microphone button
- [ ] See microphone permission prompt
- [ ] Grant permission
- [ ] Speak a question
- [ ] Voice transcription appears
- [ ] Auto-submit after pause

### ✅ iOS Specific
- [ ] Test on Safari iOS
- [ ] Test on Chrome iOS
- [ ] Test background/foreground
- [ ] Test with other apps using audio

## 🔍 Debugging Commands

### Check Current Status
```javascript
// In browser console
console.log('Secure Context:', window.isSecureContext);
console.log('Protocol:', window.location.protocol);
console.log('Speech Recognition:', !!(window.SpeechRecognition || window.webkitSpeechRecognition));
```

### Test Microphone Manually
```javascript
// Test getUserMedia
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microphone access granted');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.log('❌ Microphone blocked:', err));
```

## 🚨 Common Issues & Solutions

### Issue: "not-allowed" Error
**Cause**: User denied microphone permission  
**Solution**: Check iPhone Settings > Safari/Chrome > Microphone

### Issue: "audio-capture" Error
**Cause**: No HTTPS or microphone hardware issue  
**Solution**: Use HTTPS or try different browser

### Issue: Speech Recognition Starts But No Text
**Cause**: iOS WebKit limitations or network issues  
**Solution**: Try Safari, check network connection

### Issue: Microphone Works But Stops Quickly
**Cause**: iOS background app restrictions  
**Solution**: Keep app in foreground, increase timeout

## 📱 iOS Specific Tips

1. **Use Safari first** - better iOS compatibility
2. **Keep app in foreground** - iOS suspends audio in background
3. **Grant permissions explicitly** - iOS sometimes needs manual permission grants
4. **Test with AirPods** - Bluetooth mics sometimes work better
5. **Close other audio apps** - iOS limits concurrent audio access

## 🎯 Quick Test with ngrok

If you want to test immediately:

```bash
# Quick setup (replace with your token)
ngrok config add-authtoken YOUR_TOKEN
ngrok http 5173

# Open the https:// URL on iPhone
# Test microphone - should work!
```

---

**Next Step**: Set up ngrok with HTTPS to get full iOS microphone functionality! 🎙️✨
