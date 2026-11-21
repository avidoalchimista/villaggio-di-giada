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
      includeAssets: ['icona.svg', 'apple-touch-icon.png'],
      workbox: {
        // tutto in cache: l'app funziona offline dopo la prima apertura
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,mp3,m4a,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
      manifest: {
        id: './',
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
          { src: 'icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icona-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
