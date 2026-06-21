import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/iamanantshukla/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { outDir: 'dist' },
  test: { environment: 'jsdom' },
});
