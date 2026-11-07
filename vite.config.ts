import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/**
 * O site: index.html é o menu que lista os painéis, e cada painel tem o seu HTML (presidencia.html, empresas.html, profissionais.html,
 * fiscalizacao.html, financeiro.html, atendimento.html e conselho.html). `base: './'` deixa os endereços relativos, para o site abrir
 * no GitHub Pages dentro de /empresas/ (.github/workflows/pages.yml) e em qualquer outra pasta.
 */
export default defineConfig({ plugins: [react()], base: './', define: { __SITE__: 'true' }, build: { rollupOptions: { input: { index: 'index.html', presidencia: 'presidencia.html', empresas: 'empresas.html', profissionais: 'profissionais.html', fiscalizacao: 'fiscalizacao.html', financeiro: 'financeiro.html', atendimento: 'atendimento.html', conselho: 'conselho.html' } } } });
