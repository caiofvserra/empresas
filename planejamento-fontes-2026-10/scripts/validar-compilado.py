"""Valida a entrega de planejamento; Python 3, somente biblioteca padrão.

Não acessa APIs, bancos, credenciais nem altera a aplicação.
Executar: python planejamento-fontes-2026-10/scripts/validar-compilado.py
"""
import collections
import csv
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import unquote
import zipfile
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
def read(path):
    return json.loads((root / path).read_text(encoding='utf-8'))

catalog = read('inventarios/catalogo-fontes.json')
sources = catalog['registros']
source_ids = {row['id'] for row in sources}
assert len(sources) == len(source_ids) == 104
assert catalog['metadados']['total_fichas_pesquisadas'] == 105
required = set(catalog['metadados']['schema_comum'])
assert all(required <= set(row) for row in sources)
assert sum(len(row['origens']) for row in sources) == 105
assert len(next(row for row in sources if row['id'] == 'SP-JUCESP')['origens']) == 2
for field in ('tipo_registro', 'grupo', 'classe_acesso', 'classificacao_evidencia', 'prioridade'):
    assert dict(collections.Counter(row[field] for row in sources)) == catalog['metadados']['contagens'][field]

with (root / 'inventarios/catalogo-fontes.csv').open(encoding='utf-8-sig', newline='') as stream:
    assert len(list(csv.DictReader(stream))) == 104

cases = read('inventarios/casos-uso.json')['casos']
assert len(cases) == len({row['id'] for row in cases}) == 34
case_fields = {'nome', 'resumo', 'decisao_apoiada', 'exemplo_sintetico', 'formula_regra', 'grao_unidade', 'tempo_referencia', 'fontes', 'dados_internos_necessarios', 'limitacoes', 'acesso_viabilidade', 'prioridade'}
assert all(case_fields <= set(row) for row in cases)
assert all(source in source_ids or source.startswith('CREA-') for row in cases for source in row['fontes'])

graph = read('inventarios/grafo-planejado.json')
node_ids = {node['id'] for node in graph['nos']}
assert len(node_ids) == len(graph['nos']) == 28
assert len(graph['arestas']) == len({edge['id'] for edge in graph['arestas']}) == 34
assert all(edge['origem'] in node_ids and edge['destino'] in node_ids and set(edge['fontes']) <= source_ids for edge in graph['arestas'])

cnaes = read('inventarios/cnaes-contexto-extraidos.json')['rows']
assert len(cnaes) == len({row['cnae'] for row in cnaes}) == 702
assert collections.Counter(row['classificacao_original'].lower() for row in cnaes) == {'sim': 638, 'passível de obrigação': 64}
assert len(read('inventarios/contexto-modelo.json')['entidades']) == 27

broken = []
for path in root.rglob('*.md'):
    for target in re.findall(r'\]\(([^\n]+?)\)', path.read_text(encoding='utf-8')):
        target = target.strip('<>').split(' "')[0]
        if '://' in target or target.startswith(('#', 'mailto:')):
            continue
        local = target.split('#')[0]
        if local and not (path.parent / unquote(local)).exists():
            broken.append((str(path.relative_to(root)), target))
assert not broken, broken

with zipfile.ZipFile(root / 'inventarios/catalogo-fontes.xlsx') as archive:
    assert archive.testzip() is None
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    sheets = ET.fromstring(archive.read('xl/workbook.xml')).find('s:sheets', ns)
    assert len(sheets) == 8
    expected_rows = {2: 105, 3: 106, 4: 147, 6: 35, 7: 35, 8: 28}
    for index, expected in expected_rows.items():
        sheet = ET.fromstring(archive.read(f'xl/worksheets/sheet{index}.xml'))
        assert len(sheet.findall('s:sheetData/s:row', ns)) == expected

manifest = read('MANIFESTO.json')
actual_files = {str(path.relative_to(root)) for path in root.rglob('*') if path.is_file() and path.name != 'MANIFESTO.json'}
expected_files = {item['path'] for item in manifest['files']}
assert actual_files == expected_files, (actual_files - expected_files, expected_files - actual_files)
for item in manifest['files']:
    data = (root / item['path']).read_bytes()
    assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], item['path']

print('OK: 104 fontes/entradas, 105 origens, 34 casos, 28 tipos de nós, 34 relações, 702 CNAEs, Excel de 8 abas, links e hashes.')
