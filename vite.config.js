import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  // 显式添加 server 配置
  server: {
    port: 3001,        // 修改为安全端口（如 3000/8080）
    strictPort: true   // 端口占用时直接报错（避免自动跳转到保留端口）
  }
})
