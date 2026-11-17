import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The browser calls /api/*; Vite forwards it to the Express server (no CORS needed in dev).
    proxy: { '/api': { target: 'http://localhost:3001', rewrite: (path) => path.replace(/^\/api/, '') } },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
});
