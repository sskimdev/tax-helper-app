// src/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_FILING_ATTACHMENTS_BUCKET: string; // 추가된 환경 변수 타입
    // 다른 환경 변수들도 여기에 추가할 수 있습니다.
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }