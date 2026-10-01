import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Orçamento de bundle (critério de aceite seletivo, fase 1):
// - JS inicial pós-gzip: alvo ≤ 350 kB (Ionic+Vue inevitavelmente pesam; lazy-load por página).
// - Verificar por release com `npx vite-bundle-visualizer` ou saída do build.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8100,
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
})
