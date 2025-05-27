// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/attendance-app/',    // ← 꼭 리포지터리 이름으로
  build: {
    outDir: 'docs',            // ← GitHub Pages가 인식하는 docs 폴더
    emptyOutDir: true,
  },
  plugins: [react()],
})
