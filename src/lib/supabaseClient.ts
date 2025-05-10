// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is missing. Check your .env file.");
}

// 타임아웃 및 재시도 관련 설정 추가
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    // 타임아웃 설정 증가 (밀리초 단위, 기본값 6000ms에서 증가)
    fetch: (url: string | URL | Request, options?: RequestInit) => {
      return fetch(url, {
        ...options,
        // 타임아웃을 3분(180000ms)으로 설정
        signal: AbortSignal.timeout(180000)
      });
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions)