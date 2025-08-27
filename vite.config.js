import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  optimizeDeps: {
    // TalkingHead module is dynamically imported; exclude to avoid pre-bundling errors
    exclude: ['@met4citizen/talkinghead']
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
          azure: ['microsoft-cognitiveservices-speech-sdk'],
          avatar: ['@met4citizen/talkinghead']
        }
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1600
  },
  
  server: {
    port: 5173,
    // Development proxy for Azure Functions (disabled when env vars are present for direct API calls)
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:7071',
    //     changeOrigin: true,
    //     secure: false
    //   }
    // }
  }
});
