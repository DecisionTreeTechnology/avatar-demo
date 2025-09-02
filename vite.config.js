import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  optimizeDeps: {
    // TalkingHead module is dynamically imported; exclude to avoid pre-bundling errors
    exclude: ['@met4citizen/talkinghead'],
    include: [
      'react',
      'react-dom',
      'microsoft-cognitiveservices-speech-sdk',
    ]
  },
  
  build: {
    // Production optimizations
    target: 'es2015',
    minify: 'terser',
    sourcemap: false, // Disable for production
    
    terserOptions: {
      compress: {
        drop_console: true, // Remove console statements in production
        drop_debugger: true,
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'azure-vendor': ['microsoft-cognitiveservices-speech-sdk'],
          'avatar-vendor': ['@met4citizen/talkinghead']
        }
      }
    },
    
    // Asset optimization
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000 // Stricter limit for production
  },
  
  server: {
    port: 5173,
    host: true, // Allow external connections
    // Allow ngrok hosts for iOS testing
    allowedHosts: [
      'localhost',
      '.ngrok-free.app',  // Allow all ngrok free hosts
      '.ngrok.app',       // Allow all ngrok paid hosts
      '.ngrok.io'         // Allow legacy ngrok hosts
    ],
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
