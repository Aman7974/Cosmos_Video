import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy API calls to backend so we don't need full URLs
    proxy: {
      '/api': {
         target: 'http://localhost:5000',
        changeOrigin: true
      },
    },
  },
});
