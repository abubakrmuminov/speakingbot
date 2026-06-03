import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@speaking-coach/shared': '../../packages/shared/src/index.ts',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env['VITE_API_URL'] ?? 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api/, ''),
      },
    },
  },
});
