import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/** Dois painéis no mesmo site: o geral (index.html) e o de Empresas (empresas.html). */
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', empresas: 'empresas.html' } } } });
