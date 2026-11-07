import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
/** Os painéis no mesmo site: o da Presidência (index.html e presidencia.html), Empresas, Profissionais, Fiscalização, Financeiro, Atendimento e Gestão do Conselho, cada um no seu HTML. */
export default defineConfig({ plugins: [react()], build: { rollupOptions: { input: { index: 'index.html', presidencia: 'presidencia.html', empresas: 'empresas.html', profissionais: 'profissionais.html', fiscalizacao: 'fiscalizacao.html', financeiro: 'financeiro.html', atendimento: 'atendimento.html', conselho: 'conselho.html' } } } });
