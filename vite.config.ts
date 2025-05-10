// vite.config.ts
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Shadcn UI가 경로 별칭 설정을 추가했을 수 있음
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600, // 경고 표시 임계값 증가
    rollupOptions: {
      output: {
        manualChunks: {
          // 주요 라이브러리를 별도 청크로 분리
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          ui: ['@radix-ui/react-toast', '@radix-ui/react-label', '@radix-ui/react-select', 'class-variance-authority', 'clsx', 'tailwind-merge']
        }
      }
    }
  }
})