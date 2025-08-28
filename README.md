# 🤖 Fertility Companion Avatar Demo

An interactive 3D avatar application with speech-to-text, text-to-speech, and AI conversation capabilities, specifically designed as a compassionate fertility companion.

## ✨ Features

- **3D Interactive Avatar** - Realistic lip-sync and facial animations
- **Voice Conversation** - Speak to the avatar using voice input
- **AI-Powered Responses** - Fertility-focused conversations using Azure OpenAI/Mistral
- **Text-to-Speech** - Natural voice synthesis with Azure Speech Services
- **Modern UI** - Glass-morphism design with Tailwind CSS
- **Progressive Web App** - Mobile-optimized responsive design
- **iOS Chrome Compatible** - Optimized for all mobile browsers including iOS Chrome
- **Comprehensive Testing** - 100% test coverage with Playwright across all browsers

## 🚨 Security Notice

⚠️ **CRITICAL:** This repository contains example code with API keys exposed in `.env` file for development purposes only. 

**Before production deployment:**
1. Remove all API keys from client-side code
2. Implement Azure Functions for secure API calls
3. Use Azure Static Web Apps environment variables

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete security guidelines.

## 🏗️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **3D Graphics:** Three.js, TalkingHead library
- **AI Services:** Azure OpenAI (direct API), Azure Speech Services (direct API)
- **Deployment:** Azure Static Web Apps (static hosting only)
- **Voice:** Web Speech API, Azure Speech SDK

## 🔧 Architecture

This is a **simplified demo architecture** that calls Azure APIs directly from the frontend:

```
Frontend (React) → Azure OpenAI API (direct)
                → Azure Speech API (direct)
```

**For production**, consider using Azure Functions as an API layer for better security and rate limiting.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Azure account with Speech and OpenAI services
- Modern browser with WebGL support

### Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/Sergei-gorlovetsky/avatar-demo.git
   cd avatar-demo
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment** (Development Only)
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Azure credentials
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Application**
   Navigate to `http://localhost:5173`

## 🧪 Testing

This project includes comprehensive Playwright test coverage:

```bash
# Run all tests (181 tests, 100% pass rate)
npm test

# Run tests with visual browser
npm run test:headed

# Interactive test runner
npm run test:ui

# View test reports
npm run test:report
```

**Test Coverage:**
- ✅ 181/181 tests passing (100% success rate)
- ✅ 6 browser environments (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari, iOS Chrome)
- ✅ Cross-device responsive testing
- ✅ iOS Chrome compatibility validated
- ✅ Comprehensive feature testing (voice, avatar, TTS, error handling)

See [TESTING.md](TESTING.md) for detailed testing documentation.

## 🎮 Usage

1. **Wait for Avatar Load** - The 3D avatar will appear when ready
2. **First Interaction** - Ask a question or click the microphone to start
3. **Voice Input** - Click microphone button and speak your question
4. **Text Input** - Type questions in the chat input
5. **AI Response** - Watch the avatar speak the AI-generated response

## 🔧 Configuration

### Environment Variables

**Development (.env.local):**
```env
VITE_AZURE_SPEECH_KEY=your_speech_key
VITE_AZURE_SPEECH_REGION=eastus2
VITE_AZURE_SPEECH_VOICE=en-US-JennyNeural
VITE_AZURE_OPENAI_ENDPOINT=your_endpoint
VITE_AZURE_OPENAI_KEY=your_key
VITE_AZURE_OPENAI_DEPLOYMENT=your_deployment
```

**Production:** Use Azure Static Web Apps environment variables (server-side)

## 📱 Browser Support

- **Chrome/Edge:** Full support (recommended)
- **Safari:** Full support with webkit prefixes  
- **Firefox:** Limited speech recognition support
- **Mobile:** iOS Safari and Android Chrome
- **iOS Chrome:** ✅ **Fully optimized** - Special character and emoji support
- **Testing:** Validated across all environments with Playwright

## 🔒 Security Best Practices

### For Development
- Use `.env.local` for sensitive keys
- Never commit real API keys to git
- Use HTTPS for all external requests

### For Production
- Implement Azure Functions for API calls
- Use Azure Key Vault for secrets
- Enable CORS restrictions
- Implement rate limiting

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

## 📄 License

This project is licensed under the ISC License.

---

**⚠️ Remember:** This is a demo application. Implement proper security measures before production use.
