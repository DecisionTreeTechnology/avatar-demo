/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_AZURE_SPEECH_KEY?: string;
    readonly VITE_AZURE_SPEECH_REGION?: string;
    readonly VITE_AZURE_SPEECH_VOICE?: string;
    readonly VITE_AZURE_OPENAI_ENDPOINT?: string;
    readonly VITE_AZURE_OPENAI_KEY?: string;
    readonly VITE_AZURE_OPENAI_DEPLOYMENT?: string;
    readonly VITE_AZURE_OPENAI_API_VERSION?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module '@met4citizen/talkinghead';

declare module 'three';

export {};
