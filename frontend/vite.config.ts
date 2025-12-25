import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // [QUAN TRỌNG] Cho phép Docker map port ra ngoài
    port: 5173,       // Cố định port 5173
    strictPort: true, // Nếu port bận thì báo lỗi chứ không tự đổi sang 5174
    watch: {
      usePolling: true, // Bắt buộc khi chạy Docker trên Windows để Hot Reload hoạt động
    }
  }
})