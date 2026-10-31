"""V19 · gera os resumos que a página Método lê: fontes do atlas unificado (98) e casos de uso do Codex (34).
Uso: python3 scripts/gerar-observatorio.py  (lê observatorio/ e planejamento-fontes-2026-10/, grava src/observatorio/*.json)."""
import csv, json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
rows = list(csv.DictReader(open(root / 'observatorio/catalogo-fontes-unificado.csv', encoding='utf-8-sig')))
fontes = [{'fonte': r['fonte'], 'orgao': r['orgao'], 'tema': r['tema'], 'acesso': r['acesso'], 'rotina': r['rotina'], 'chaves': r['chaves'],
           'valor': r['valor'], 'evidencia': r['evidencia'].split(' ·')[0].strip(), 'data': (r['evidencia'].split('·')[1].strip() if '·' in r['evidencia'] else ''), 'origem': r['origem']} for r in rows]
(root / 'src/observatorio/fontes.json').write_text(json.dumps({'origem': 'observatorio/catalogo-fontes-unificado.csv', 'total': len(fontes), 'fontes': fontes}, ensure_ascii=False, indent=0) + '\n')
text = (root / 'planejamento-fontes-2026-10/CASOS_USO.md').read_text()
casos, grupo = [], ''
for block in re.split(r'\n(?=## |### )', text):
    if block.startswith('## '): grupo = block.splitlines()[0][3:].strip(); continue
    m = re.match(r'### (UC\d+) — (.+)', block)
    if not m: continue
    field = lambda name: (re.search(r'\*\*' + name + r':\*\* (.+)', block) or [None, ''])[1].strip()
    casos.append({'id': m[1], 'nome': m[2].strip(), 'grupo': grupo, 'resumo': field('Resumo'), 'prioridade': field('Prioridade'), 'gestao': field('Gestão interessada')})
(root / 'src/observatorio/casos-uso.json').write_text(json.dumps({'origem': 'planejamento-fontes-2026-10/CASOS_USO.md', 'total': len(casos), 'casos': casos}, ensure_ascii=False, indent=0) + '\n')
print(len(fontes), 'fontes ·', len(casos), 'casos de uso')
