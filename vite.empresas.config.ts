import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel de Empresas em um único HTML autocontido, para abrir sem servidor ao lado do painel geral. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-empresas', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'empresas.html' } },
});
