import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel de Profissionais em um único HTML autocontido, para abrir sem servidor ao lado dos outros dois painéis. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-profissionais', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'profissionais.html' } },
});
