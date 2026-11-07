"""Contratos de serviços gerais de órgãos paulistas na API de consulta do PNCP, sem credencial.

A API não filtra por UF nem por categoria: a coleta lê todas as páginas do período e fica com a categoria 8 (Serviços) das
unidades de SP. O município é o da unidade contratante, não o local do serviço. O valor do contrato não é lido.
"""
import json
import time
import urllib.parse
import urllib.request

CONSULTA = 'https://pncp.gov.br/api/consulta/v1/contratos'
CATEGORIA_SERVICOS = 8
TAMANHO_PAGINA = 500
OBJETO_MINIMO = 20
CABECALHO = {'User-Agent': 'creasp-inteligencia-estrategica/1.0', 'Accept': 'application/json'}


def pedir_json(url, tentativas=4, espera=2.0):
    """GET com espera dobrada entre tentativas (2, 4, 8 s). A API do PNCP cai e responde 5xx com alguma frequência."""
    for n in range(tentativas):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=CABECALHO), timeout=60) as resposta:
                corpo = resposta.read()
                return json.loads(corpo) if corpo else None
        except Exception:  # noqa: BLE001 - a última tentativa propaga
            if n == tentativas - 1:
                raise
            time.sleep(espera * 2 ** n)
    return None


def ler_pagina(pagina, uf='SP', categoria=CATEGORIA_SERVICOS):
    """Os contratos da página que entram na triagem: da UF, da categoria e com objeto de pelo menos 20 caracteres."""
    saida = []
    for c in (pagina or {}).get('data') or []:
        unidade, cat = c.get('unidadeOrgao') or {}, c.get('categoriaProcesso') or {}
        objeto = (c.get('objetoContrato') or '').strip()
        if unidade.get('ufSigla') != uf or cat.get('id') != categoria or len(objeto) < OBJETO_MINIMO:
            continue
        saida.append({
            'pncp_id': c.get('numeroControlePNCP') or '',
            'ncp_compra': (c.get('numeroControlePncpCompra') or '').strip(),
            'municipio_ibge': str(unidade.get('codigoIbge') or ''),
            'publicacao': (c.get('dataPublicacaoPncp') or '')[:10],
            'fornecedor_tipo': c.get('tipoPessoa') or '',
            'fornecedor_ni': c.get('niFornecedor') or '',
            'objeto': objeto,
        })
    return saida


def buscar_contratos(de, ate, uf='SP', categoria=CATEGORIA_SERVICOS, log=print):
    """Todas as páginas do período (datas AAAA-MM-DD, pela publicação no PNCP), sem repetir contrato entre páginas."""
    vistos, contratos, pagina, total = set(), [], 1, 1
    while pagina <= total:
        parametros = {'dataInicial': de.replace('-', ''), 'dataFinal': ate.replace('-', ''), 'pagina': pagina, 'tamanhoPagina': TAMANHO_PAGINA}
        dados = pedir_json(f'{CONSULTA}?{urllib.parse.urlencode(parametros)}')
        if not dados:
            break
        total = int(dados.get('totalPaginas') or 0)
        for c in ler_pagina(dados, uf, categoria):
            if c['pncp_id'] not in vistos:
                vistos.add(c['pncp_id'])
                contratos.append(c)
        if pagina % 50 == 0 or pagina == total:
            log(f'  página {pagina} de {total}: {len(contratos)} contratos de serviços de {uf}')
        pagina += 1
    return contratos
