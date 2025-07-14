import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ① src 全体を @ で参照
      '@': path.resolve(__dirname, 'src'),
      // ② utils フォルダ
      'utils': path.resolve(__dirname, 'src/utils'),
      // ③ types 定義ファイル（たとえば src/types.ts）
      'types': path.resolve(__dirname, 'src/types.ts'),
    },
  },
})
