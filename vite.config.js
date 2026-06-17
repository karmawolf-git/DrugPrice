import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 상대 경로 base: dev·preview·GitHub Pages 서브경로 어디서나 에셋이 정상 로드됨
  base: './',
})
