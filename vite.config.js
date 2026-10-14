import { defineConfig } from 'vite';

// Relative base so the built site works from any path (Vercel, GitHub Pages, a USB stick...)
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Keep Phaser in its own cacheable chunk.
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  server: { host: true },
});
