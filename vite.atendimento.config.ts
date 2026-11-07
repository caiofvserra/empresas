import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel de Atendimento em um único HTML autocontido, para abrir sem servidor ao lado dos outros painéis. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-atendimento', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'atendimento.html' } },
});
