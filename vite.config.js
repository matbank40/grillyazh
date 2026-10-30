import { defineConfig } from 'vite';

// base: './' — относительные пути: сайт работает и в корне домена,
// и в подпапке (GitHub Pages: matbank40.github.io/grillyazh/).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
});
