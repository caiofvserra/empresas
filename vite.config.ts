import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/** Cinco painéis no mesmo site: o geral (index.html), o de Empresas (empresas.html), o de Profissionais (profissionais.html), o de Fiscalização (fiscalizacao.html) e o de Gestão do Conselho (conselho.html). */
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', empresas: 'empresas.html', profissionais: 'profissionais.html', fiscalizacao: 'fiscalizacao.html', conselho: 'conselho.html' } } } });
