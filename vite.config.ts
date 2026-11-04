import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/** Quatro painéis no mesmo site: o geral (index.html), o de Empresas (empresas.html), o de Profissionais (profissionais.html) e o de Fiscalização (fiscalizacao.html). */
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', empresas: 'empresas.html', profissionais: 'profissionais.html', fiscalizacao: 'fiscalizacao.html' } } } });
