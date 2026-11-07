"""Contratos de serviços gerais de órgãos paulistas na API de consulta do PNCP, sem credencial.

A API não filtra por UF nem por categoria: a coleta lê todas as páginas do período e fica com a categoria 8 (Serviços) das
unidades de SP. O texto que vai ao modelo é o mesmo do treino: o objeto com a informação complementar depois de " | ", e só
entra o que passa de 20 caracteres. O município é o da unidade contratante, não o local do serviço. O valor do contrato não é lido.
"""
import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

CONSULTA = 'https://pncp.gov.br/api/consulta/v1/contratos'
CATEGORIA_SERVICOS = 8
TAMANHO_PAGINA = 500
OBJETO_MINIMO = 20  # o treino ficou com os textos de mais de 20 caracteres
CABECALHO = {'User-Agent': 'creasp-inteligencia-estrategica/1.0', 'Accept': 'application/json'}


# Pausa comum a todas as threads: quando a API responde 429, ninguém pede nada até a hora marcada.
_pausa = {'ate': 0.0}
_trava = threading.Lock()


def _esperar_vez():
    while True:
        with _trava:
            falta = _pausa['ate'] - time.monotonic()
        if falta <= 0:
            return
        time.sleep(falta)


def _pausar(segundos):
    with _trava:
        _pausa['ate'] = max(_pausa['ate'], time.monotonic() + segundos)


def pedir_json(url, tentativas=6, espera=2.0):
    """GET com espera dobrada entre tentativas (2, 4, 8 s). A API do PNCP cai e responde 5xx com alguma frequência.

    Com 429 (pedidos demais), a espera vale para todas as threads: o Retry-After da resposta, ou 30, 60, 120 e 240 s.
    """
    for n in range(tentativas):
        _esperar_vez()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=CABECALHO), timeout=60) as resposta:
                corpo = resposta.read()
                return json.loads(corpo) if corpo else None
        except urllib.error.HTTPError as erro:
            if n == tentativas - 1:
                raise
            if erro.code == 429:
                pedido = (erro.headers or {}).get('Retry-After') or ''
                _pausar(int(pedido) if pedido.isdigit() else 30 * 2 ** min(n, 3))
            else:
                time.sleep(espera * 2 ** n)
        except Exception:  # noqa: BLE001 - a última tentativa propaga
            if n == tentativas - 1:
                raise
            time.sleep(espera * 2 ** n)
    return None


def ler_pagina(pagina, uf='SP', categoria=CATEGORIA_SERVICOS):
    """Os contratos da página que entram na triagem: da UF, da categoria e com texto de mais de 20 caracteres."""
    saida = []
    for c in (pagina or {}).get('data') or []:
        unidade, cat = c.get('unidadeOrgao') or {}, c.get('categoriaProcesso') or {}
        objeto = f"{c.get('objetoContrato') or ''} | {c.get('informacaoComplementar') or ''}".strip(' |')
        if unidade.get('ufSigla') != uf or cat.get('id') != categoria or len(objeto) <= OBJETO_MINIMO:
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


def buscar_contratos(de, ate, uf='SP', categoria=CATEGORIA_SERVICOS, log=print, paralelo=4):
    """Todas as páginas do período (datas AAAA-MM-DD, pela publicação no PNCP), sem repetir contrato entre páginas.

    Um mês do país são umas 600 páginas de 500 contratos, a uns 4 segundos cada: lidas uma a uma, 12 meses passavam das 6 horas
    que a rotina tem. A primeira página diz quantas são; as outras vão em paralelo, `paralelo` por vez. Com 8 ao mesmo tempo a API responde
    cada página em 30 s e devolve 429; com 4, em uns 8 s, o dobro do ritmo de uma por vez (conferido em 07/11/2026).
    """
    def pedir(pagina):
        parametros = {'dataInicial': de.replace('-', ''), 'dataFinal': ate.replace('-', ''), 'pagina': pagina, 'tamanhoPagina': TAMANHO_PAGINA}
        return pagina, pedir_json(f'{CONSULTA}?{urllib.parse.urlencode(parametros)}')

    _, primeira = pedir(1)
    if not primeira:
        return []
    total = int(primeira.get('totalPaginas') or 0)
    vistos, contratos = set(), []

    def juntar(dados):
        for c in ler_pagina(dados, uf, categoria):
            if c['pncp_id'] not in vistos:
                vistos.add(c['pncp_id'])
                contratos.append(c)

    juntar(primeira)
    with ThreadPoolExecutor(max_workers=paralelo) as pool:
        for n, (pagina, dados) in enumerate(pool.map(pedir, range(2, total + 1)), start=2):
            if not dados:  # a API parou no meio: o mês ficaria pela metade, e o cache o daria como completo
                raise RuntimeError(f'A API do PNCP não respondeu a página {pagina} de {total}; rode de novo.')
            juntar(dados)
            if n % 100 == 0 or n == total:
                log(f'  página {n} de {total}: {len(contratos)} contratos de serviços de {uf}')
    return contratos
