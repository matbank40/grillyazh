import { defineConfig } from 'vite';

// base: './' — относительные пути: сайт работает и в корне домена,
// и в подпапке (GitHub Pages: matbank40.github.io/grillyazh/).
export default defineConfig({
  base: './',
  // es2022 — ради await на верхнем уровне в main.js
  build: { chunkSizeWarningLimit: 1200, target: 'es2022' },
});
