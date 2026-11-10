import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel de Indicadores do Sistema em um único HTML autocontido, para abrir sem servidor ao lado dos outros painéis. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-indicadores', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'indicadores.html' } },
});
