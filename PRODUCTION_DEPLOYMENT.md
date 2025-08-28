# iOS TTS Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript compilation errors resolved
- [ ] ESLint warnings addressed
- [ ] iOS-specific test suite passing
- [ ] Enhanced TTS integration tested on real iOS devices
- [ ] Debug panel only shows in development/staging

### ✅ Performance Optimization
- [ ] Bundle size analysis completed
- [ ] Audio files optimized for mobile
- [ ] Network requests minimized
- [ ] Memory leak testing completed

### ✅ iOS Compatibility
- [ ] Safari iOS 15+ compatibility verified
- [ ] Chrome iOS 15+ compatibility verified
- [ ] iPad landscape/portrait modes tested
- [ ] VoiceOver accessibility tested

## 🏗️ Build Configuration

### Production Environment Variables
Create `.env.production` file:
```bash
# Azure TTS Configuration (Production)
VITE_AZURE_SPEECH_KEY=your_production_key_here
VITE_AZURE_SPEECH_REGION=your_region_here
VITE_AZURE_SPEECH_VOICE=en-US-JennyNeural

# LLM Configuration
VITE_LLM_API_URL=your_production_llm_endpoint
VITE_LLM_API_KEY=your_production_llm_key

# Feature Flags
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_ANALYTICS=true
VITE_ENVIRONMENT=production
```

### Build Command
```bash
# Production build with optimizations
npm run build

# Verify build output
npm run preview
```

### Build Analysis
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-analyzer

# Analyze bundle size
npm run build -- --config vite.config.analyzer.js
```

## 🌐 Deployment Platforms

### Option 1: Azure Static Web Apps (Recommended)
```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

jobs:
  build_and_deploy_job:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: "dist"
        env:
          VITE_AZURE_SPEECH_KEY: ${{ secrets.VITE_AZURE_SPEECH_KEY }}
          VITE_AZURE_SPEECH_REGION: ${{ secrets.VITE_AZURE_SPEECH_REGION }}
```

### Option 2: Vercel
```json
// vercel.json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        },
        {
          "key": "Cross-Origin-Opener-Policy", 
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

### Option 3: Netlify
```toml
# netlify.toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Embedder-Policy = "credentialless"
    Cross-Origin-Opener-Policy = "same-origin"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

## 📊 Monitoring & Analytics

### Error Tracking Setup
```typescript
// src/utils/errorTracking.ts
export const trackError = (error: Error, context: string) => {
  if (import.meta.env.PROD) {
    // Send to your error tracking service
    console.error(`[${context}]`, error);
    
    // Example: Sentry integration
    // Sentry.captureException(error, { tags: { context } });
  }
};

// Usage in enhanced TTS
catch (error) {
  trackError(error, 'iOS_TTS_SYNTHESIS');
  // ... handle error
}
```

### iOS-Specific Analytics
```typescript
// src/utils/iosAnalytics.ts
export const trackIOSEvent = (event: string, data: any) => {
  if (import.meta.env.PROD && iosAudioManager.getStatus().isIOS) {
    // Track iOS-specific events
    analytics.track(`ios_${event}`, {
      ...data,
      device: iosAudioManager.getStatus(),
      timestamp: Date.now()
    });
  }
};
```

## 🔒 Security Configuration

### Content Security Policy
```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  connect-src 'self' https://*.cognitiveservices.azure.com https://api.openai.com;
  media-src 'self' blob: data:;
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data: blob:;
  worker-src 'self' blob:;
">
```

### Environment Variable Security
```bash
# Never commit these to repository
# Set in deployment platform's environment variables
VITE_AZURE_SPEECH_KEY=production_key_here
VITE_LLM_API_KEY=production_key_here

# Safe to commit (public configuration)
VITE_AZURE_SPEECH_REGION=eastus
VITE_AZURE_SPEECH_VOICE=en-US-JennyNeural
```

## 🚦 Deployment Pipeline

### Staging Environment
```bash
# Deploy to staging first
npm run build
npm run deploy:staging

# Test on staging with iOS devices
# Run automated test suite
npm run test:ios-staging
```

### Production Deployment
```bash
# Only deploy after staging validation
npm run build:production
npm run deploy:production

# Immediate post-deployment checks
npm run test:production-smoke
```

## 📈 Performance Monitoring

### Core Web Vitals for iOS
Monitor these metrics specifically for iOS users:
- **First Contentful Paint (FCP)**: < 1.5s on iOS
- **Largest Contentful Paint (LCP)**: < 2.5s on iOS
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Audio Start Latency**: < 3s (custom metric)

### iOS-Specific Monitoring
```typescript
// Performance monitoring for iOS
const monitorIOSPerformance = () => {
  if (iosAudioManager.getStatus().isIOS) {
    // Monitor TTS latency
    performance.mark('tts-start');
    // ... after TTS completes
    performance.mark('tts-end');
    performance.measure('tts-duration', 'tts-start', 'tts-end');
    
    // Monitor memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', memory.usedJSHeapSize / 1024 / 1024, 'MB');
    }
  }
};
```

## 🔄 Rollback Strategy

### Feature Flags
```typescript
// src/utils/featureFlags.ts
export const isFeatureEnabled = (feature: string): boolean => {
  const flags = {
    enhanced_ios_tts: import.meta.env.VITE_ENABLE_ENHANCED_TTS !== 'false',
    debug_panel: import.meta.env.VITE_ENABLE_DEBUG_PANEL === 'true',
    ios_audio_recovery: import.meta.env.VITE_ENABLE_AUDIO_RECOVERY !== 'false'
  };
  
  return flags[feature] ?? false;
};
```

### Gradual Rollout
1. **0% - Internal Testing**: Development team only
2. **10% - Beta Users**: Selected iOS users
3. **50% - Partial Rollout**: Half of iOS traffic
4. **100% - Full Rollout**: All users

## 📞 Incident Response

### iOS-Specific Alert Thresholds
- TTS failure rate > 5% on iOS
- Audio context errors > 10% on iOS
- Memory usage > 100MB on iOS
- Response time > 5s on iOS

### Emergency Rollback
```bash
# Quick rollback to previous version
npm run deploy:rollback

# Or disable enhanced features
export VITE_ENABLE_ENHANCED_TTS=false
npm run deploy:hotfix
```

## 📋 Post-Deployment Verification

### Automated Checks
```bash
# Run production smoke tests
npm run test:production

# Check specific iOS functionality
npm run test:ios-production
```

### Manual Verification
- [ ] Test on iPhone Safari
- [ ] Test on iPhone Chrome
- [ ] Test on iPad Safari
- [ ] Test on iPad Chrome
- [ ] Verify debug panel is hidden
- [ ] Check error tracking is working
- [ ] Validate performance metrics

---

*This deployment guide ensures a smooth and monitored rollout of the enhanced iOS TTS functionality to production.*
