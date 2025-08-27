import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  optimizeDeps: {
    // These modules are dynamically imported by TalkingHead; exclude to avoid pre-bundling errors
    exclude: ['@met4citizen/talkinghead', '@met4citizen/headtts']
  },
  
  build: {
    // Production optimizations
    target: 'es2015',
    minify: 'terser',
    sourcemap: true,
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          three: ['three'],
          azure: ['microsoft-cognitiveservices-speech-sdk'],
          avatar: ['@met4citizen/talkinghead', '@met4citizen/headtts']
        }
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1600
  },
  
  server: {
    port: 5173,
    // Development proxy for Azure Functions
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
