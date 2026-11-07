import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel de Gestão do Conselho em um único HTML autocontido, para abrir sem servidor ao lado dos outros painéis. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-conselho', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'conselho.html' } },
});
