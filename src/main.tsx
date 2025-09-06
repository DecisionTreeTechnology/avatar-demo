import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './App';
import { AudioContextManager } from './utils/audioContextManager';
import './utils/analytics';

// Initialize AudioContextManager early to register gesture listeners on startup
try {
  AudioContextManager.getInstance();
} catch {}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
