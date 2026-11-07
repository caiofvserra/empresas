import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Painel da Presidência (07/11/2026; antes painel geral): gera um único HTML autocontido (JS, CSS, fontes e malha municipal embutidos) para abrir sem servidor. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-presidencia', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'presidencia.html' } },
});
