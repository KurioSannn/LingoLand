/// <reference types="vite/client" />

interface Window {
  SpeechRecognition?: new () => unknown;
  webkitSpeechRecognition?: new () => unknown;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
