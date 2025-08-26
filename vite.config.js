import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // These modules are dynamically imported by TalkingHead; exclude to avoid pre-bundling errors
    exclude: ['@met4citizen/talkinghead', '@met4citizen/headtts']
  },
  server: {
    port: 5173
  }
});
