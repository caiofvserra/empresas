import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/** Três painéis no mesmo site: o geral (index.html), o de Empresas (empresas.html) e o de Profissionais (profissionais.html). */
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', empresas: 'empresas.html', profissionais: 'profissionais.html' } } } });
