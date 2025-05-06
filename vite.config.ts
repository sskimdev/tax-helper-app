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
})