import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock TalkingHead
const mockTalkingHead = {
  isReady: false,
  isSpeaking: false,
  error: null,
  containerRef: { current: null },
  warmUpForIOS: vi.fn().mockResolvedValue(undefined),
  speak: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
  setEmotion: vi.fn(),
  performGesture: vi.fn().mockResolvedValue(undefined)
};

// Mock Azure Speech SDK
(global as any).SpeechSDK = {
  SpeechConfig: {
    fromSubscription: vi.fn(() => ({
      speechSynthesisOutputFormat: null
    }))
  },
  SpeechSynthesizer: vi.fn(() => ({
    wordBoundary: null,
    speakSsmlAsync: vi.fn((_ssml: any, success: any, _error: any) => {
      setTimeout(() => success({
        reason: 1,
        audioData: new ArrayBuffer(1024)
      }), 100)
    })
  })),
  ResultReason: {
    SynthesizingAudioCompleted: 1
  }
};

// Mock AudioContext
(global as any).AudioContext = vi.fn(() => ({
  state: 'suspended',
  resume: vi.fn().mockResolvedValue(undefined),
  createBuffer: vi.fn(() => ({
    getChannelData: () => new Float32Array(1024),
    duration: 2.0
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  createGain: vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn()
  })),
  decodeAudioData: vi.fn().mockResolvedValue({
    duration: 2.0,
    getChannelData: () => new Float32Array(1024)
  }),
  currentTime: 0,
  destination: {}
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Export for use in tests
export { mockTalkingHead };