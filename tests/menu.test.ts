import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paineisDoMenu } from '../src/menu/paineis';

const raiz = join(import.meta.dirname, '..');
const cockpit = readFileSync(join(raiz, 'src', 'cockpit', 'Cockpit.tsx'), 'utf8');
const rotulos = (lista: string) => {
  const inicio = cockpit.indexOf(`const ${lista}: PaginaDef[] = [`);
  assert.ok(inicio >= 0, `${lista} não achada em Cockpit.tsx`);
  return [...cockpit.slice(inicio, cockpit.indexOf('\n];', inicio)).matchAll(/label: '([^']+)'/g)].map(m => m[1]);
};

test('o menu do site lista os sete painéis, cada um com o seu HTML', () => {
  assert.deepEqual(paineisDoMenu.map(p => p.id), ['presidencia', 'empresas', 'profissionais', 'fiscalizacao', 'conselho', 'financeiro', 'atendimento']);
  const vite = readFileSync(join(raiz, 'vite.config.ts'), 'utf8');
  for (const painel of paineisDoMenu) {
    assert.ok(existsSync(join(raiz, painel.arquivo)), `${painel.arquivo} não existe`);
    assert.ok(vite.includes(`'${painel.arquivo}'`), `${painel.arquivo} fora do build do site`);
    assert.ok(cockpit.includes(`site: '${painel.arquivo}'`), `${painel.id}: Cockpit aponta para outro arquivo`);
  }
  assert.equal(paineisDoMenu.find(p => p.id === 'conselho')!.nome, 'Colegiados');
});

test('as páginas de cada painel no menu são as mesmas do menu lateral do painel', () => {
  const listas: Record<string, string> = { presidencia: 'paginasPresidencia', empresas: 'paginasEmpresas', profissionais: 'paginasProfissionais', fiscalizacao: 'paginasFiscalizacao', conselho: 'paginasConselho', financeiro: 'paginasFinanceiro', atendimento: 'paginasAtendimento' };
  for (const painel of paineisDoMenu) assert.deepEqual(painel.paginas, rotulos(listas[painel.id]), `páginas de ${painel.nome}`);
});

test('a página inicial do site é o menu, e a Presidência abre em presidencia.html', () => {
  const index = readFileSync(join(raiz, 'index.html'), 'utf8');
  assert.ok(index.includes('/src/menu/main.tsx'), 'index.html carrega o menu');
  assert.ok(readFileSync(join(raiz, 'presidencia.html'), 'utf8').includes('/src/cockpit/main.tsx'));
});

test('todo painel do site tem o botão Voltar ao menu; fora do site (entrega em arquivo único) ele some', () => {
  assert.match(cockpit, /\{noSite && <a className="ck-voltar" href="index\.html"/);
  assert.match(readFileSync(join(raiz, 'vite.config.ts'), 'utf8'), /define: \{ __SITE__: 'true' \}/, 'só o build do site liga o Voltar');
  for (const config of ['vite.empresas.config.ts', 'vite.presidencia.config.ts', 'vite.conselho.config.ts']) assert.ok(!readFileSync(join(raiz, config), 'utf8').includes('__SITE__'), `${config} não liga o Voltar`);
});

test('o site usa endereços relativos, para abrir no GitHub Pages dentro de /empresas/', () => {
  assert.match(readFileSync(join(raiz, 'vite.config.ts'), 'utf8'), /base: '\.\/'/);
});
