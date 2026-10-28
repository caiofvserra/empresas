import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** V15: gera um único HTML autocontido (JS, CSS, fontes e malha municipal embutidos) para abrir sem servidor. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  publicDir: false,
  build: { outDir: 'dist-painel', emptyOutDir: true, chunkSizeWarningLimit: 5000, rollupOptions: { input: 'painel.html' } },
});
