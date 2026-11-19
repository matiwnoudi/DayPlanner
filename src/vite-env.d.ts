/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BASE: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Build zamanı (Vite define ile enjekte edilir)
declare const __BUILD_TIME__: string;
