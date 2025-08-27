# Azure Static Web Apps Deployment Guide

## 🚀 Production Deployment Checklist

### ⚠️ Security Requirements (CRITICAL)

**Before deploying to production, you MUST:**

1. **Remove API keys from `.env` file** - Current .env exposes sensitive keys
2. **Set up Azure Functions** for secure API calls
3. **Configure environment variables** in Azure Static Web Apps settings

### 📋 Pre-Deployment Steps

#### 1. Security Cleanup
```bash
# 1. Remove sensitive data from .env
mv .env .env.local
cp .env.production .env

# 2. Ensure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

#### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Azure Functions dependencies (if using)
cd api && npm install
```

#### 3. Build and Test
```bash
# Production build
npm run build:production

# Local preview
npm run preview
```

### 🔧 Azure Static Web Apps Configuration

#### 1. Create Azure Static Web App
```bash
# Using Azure CLI
az staticwebapp create \
  --name fertility-companion-avatar \
  --resource-group your-resource-group \
  --source https://github.com/Sergei-gorlovetsky/avatar-demo \
  --location "East US 2" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist"
```

#### 2. Configure Environment Variables in Azure Portal

**Navigate to:** Azure Portal → Your Static Web App → Configuration → Environment Variables

**Required Variables:**
```
AZURE_SPEECH_KEY=your_speech_key_here
AZURE_SPEECH_REGION=eastus2
AZURE_SPEECH_VOICE=en-US-JennyNeural
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_KEY=your_openai_key
AZURE_OPENAI_DEPLOYMENT=Ministral-3B
AZURE_OPENAI_API_VERSION=2024-05-01-preview
```

### 🏗️ Build Configuration

#### Static Web App Config (`staticwebapp.config.json`)
- ✅ SPA routing configured
- ✅ Security headers set
- ✅ MIME types for 3D assets (.glb files)
- ✅ API routing configured

#### Vite Build Config
- ✅ Code splitting for optimal loading
- ✅ Asset optimization
- ✅ Source maps for debugging
- ✅ Development proxy for Azure Functions

### 🔐 Security Measures Implemented

1. **Environment Variable Security**
   - Sensitive keys moved to Azure Functions
   - Client-side variables are non-sensitive only
   - Production/development environment separation

2. **HTTP Security Headers**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`

3. **CORS Configuration**
   - Proper CORS headers in Azure Functions
   - Domain-specific access controls

### 📊 Performance Optimizations

1. **Bundle Optimization**
   - Vendor chunk separation
   - Tree shaking enabled
   - Minification with Terser

2. **Asset Optimization**
   - Asset inlining for small files
   - Optimized chunk sizes
   - Source map generation

3. **Loading Strategy**
   - Lazy loading for heavy dependencies
   - Progressive loading of avatar assets

### 🧪 Testing Strategy

#### Pre-Production Testing
```bash
# 1. Build production bundle
npm run build:production

# 2. Test locally
npm run preview

# 3. Test key functionality:
# - Avatar loading
# - Speech synthesis
# - Voice input
# - LLM responses
```

#### Production Validation
- [ ] Avatar loads correctly
- [ ] Speech synthesis works
- [ ] Voice input functions
- [ ] LLM integration active
- [ ] No console errors
- [ ] Mobile responsiveness
- [ ] HTTPS enforcement

### 🚨 Critical Issues to Address

1. **API Key Exposure** ⚠️
   - Current `.env` file contains sensitive Azure keys
   - Keys are visible in client-side bundle
   - **Action Required:** Move to Azure Functions

2. **CORS Configuration** ⚠️
   - Azure services may need domain whitelisting
   - **Action Required:** Configure CORS in Azure portal

3. **Rate Limiting** ⚠️
   - No rate limiting on API calls
   - **Action Required:** Implement Azure API Management

### 📱 Mobile Considerations

- ✅ Touch-friendly interface
- ✅ Responsive design
- ⚠️ Voice input may need mobile-specific handling
- ⚠️ Avatar rendering performance on mobile devices

### 🔄 CI/CD Pipeline

GitHub Actions workflow automatically:
1. Builds the application
2. Runs tests (when added)
3. Deploys to Azure Static Web Apps
4. Configures environment variables

### 📈 Monitoring & Analytics

Consider adding:
- Application Insights for error tracking
- Performance monitoring
- User analytics
- Speech synthesis usage metrics

### 🎯 Post-Deployment Tasks

1. **DNS Configuration**
   - Set up custom domain
   - Configure SSL certificate

2. **Content Delivery**
   - Verify global CDN distribution
   - Test loading times from different regions

3. **Security Audit**
   - Run security scan
   - Verify no sensitive data in client bundle
   - Test API authentication

4. **Performance Testing**
   - Load testing
   - Avatar rendering performance
   - Speech synthesis latency

### 🆘 Troubleshooting

**Common Issues:**
- Avatar not loading → Check .glb file path and MIME types
- Speech not working → Verify Azure Speech keys and CORS
- API errors → Check Azure Function logs
- Build failures → Verify dependencies and TypeScript config

**Debug Commands:**
```bash
# Check build output
npm run build:production && ls -la dist/

# Test Azure Functions locally
cd api && npm start

# Check environment variables
echo $NODE_ENV
```
