"""Gera src/domain/confea-planilha.json a partir dos CSV da planilha do Confea (docs/pesquisa/confea-prestacao-contas/).

A planilha "Relação de Dados e Indicadores de Resultados do Sistema" (Anexo IV da PL-2260/2023) tem 161 métricas do Crea e
35 indicadores. O painel de Indicadores do Sistema lê só o que precisa: código, subprograma, tema, nome, recorte no tempo,
formato, definição, orientação e os indicadores ligados a cada métrica; e, de cada indicador, a fórmula, a medida e quem responde.
Rodar de novo quando a planilha mudar: python3 scripts/confea/csv-para-json.py
"""
import csv
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ / 'docs' / 'pesquisa' / 'confea-prestacao-contas'


def limpa(texto: str) -> str:
    return ' '.join((texto or '').split())


def recorte(texto: str) -> str:
    texto = texto.lower()
    if texto.startswith('em 31/12'):
        return 'fim'
    if texto.startswith('no exercício'):
        return 'exercicio'
    return 'publicacao'


metricas = []
for linha in csv.DictReader(open(PASTA / 'metricas-crea.csv', encoding='utf-8')):
    ligados = [int(x) for x in linha['indicadores_relacionados'].replace(' ', '').split('/') if x.strip().isdigit()]
    metricas.append({
        'codigo': int(linha['codigo']), 'subprograma': limpa(linha['subprograma']), 'tema': limpa(linha['tema']), 'nome': limpa(linha['metrica']),
        'recorte': recorte(linha['recorte_temporal']), 'formato': 'decimal' if 'decimal' in linha['formato'].lower() else 'inteiro',
        'definicao': limpa(linha['definicao']), 'orientacao': limpa(linha['orientacao']), 'indicadores': ligados,
    })

indicadores = []
for linha in csv.DictReader(open(PASTA / 'indicadores.csv', encoding='utf-8')):
    indicadores.append({
        'codigo': int(linha['codigo']), 'subprograma': limpa(linha['subprograma']), 'nome': limpa(linha['indicador']), 'objetivo': limpa(linha['objetivo']),
        'formula': limpa(linha['formula']), 'medida': limpa(linha['medida']), 'responsavel': limpa(linha['responsavel']), 'observacao': limpa(linha['observacao']),
    })

saida = RAIZ / 'src' / 'domain' / 'confea-planilha.json'
saida.write_text(json.dumps({'fonte': 'Relação de Dados e Indicadores de Resultados do Sistema (Anexo IV da PL-2260/2023), CSV em docs/pesquisa/confea-prestacao-contas/',
                             'metricas': metricas, 'indicadores': indicadores}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
print(f'{len(metricas)} métricas e {len(indicadores)} indicadores em {saida}')
