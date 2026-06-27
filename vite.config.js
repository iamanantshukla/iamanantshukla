import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sub-project B: one config, two build outputs selected by VITE_BUILD_TARGET (default 'local').
//   local -> base '/',              outDir 'dist'
//   pages -> base '/iamanantshukla/', outDir 'docs'  (GitHub Pages, .nojekyll in public/)
//
// The flag is read from process.env here (set by the build:local / build:pages npm scripts) and
// also surfaced into import.meta.env.VITE_BUILD_TARGET so src/lib/config.js resolves the same value
// at runtime. Vite only auto-exposes VITE_*-prefixed vars from .env files, not from process.env, so
// we explicitly `define` it to bridge the process env into the client bundle.
const TARGET = process.env.VITE_BUILD_TARGET || 'local';
const PAGES_BASE = '/iamanantshukla/';

if (TARGET !== 'local' && TARGET !== 'pages') {
  // A typo'd flag builds as the pages variant (spec B §5) but is loudly noticed before publish.
  console.warn(`[vite] Unknown VITE_BUILD_TARGET="${TARGET}"; building with pages-base semantics.`);
}

export default defineConfig({
  plugins: [react()],
  base: TARGET === 'pages' ? PAGES_BASE : '/',
  build: {
    outDir: TARGET === 'pages' ? 'docs' : 'dist',
    emptyOutDir: true,
  },
  define: {
    'import.meta.env.VITE_BUILD_TARGET': JSON.stringify(TARGET),
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
