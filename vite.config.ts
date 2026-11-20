import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// base relativa: funziona sia su GitHub Pages (sottocartella) sia su Netlify/Cloudflare
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icona.svg'],
      workbox: {
        // tutto in cache: l'app funziona offline dopo la prima apertura
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,mp3,m4a,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        name: 'Il villaggio di Giada',
        short_name: 'Villaggio',
        description: 'Un villaggio di animali del bosco che cresce con il tuo diario.',
        lang: 'it',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1d1a17',
        theme_color: '#1d1a17',
        icons: [
          { src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
