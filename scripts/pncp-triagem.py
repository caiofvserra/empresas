"""Triagem dos contratos de serviços gerais do PNCP em SP com o modelo treinado do estudo do PNCP (07/11/2026).

    python3 scripts/pncp-triagem.py --pacote CAMINHO/pacote_reuso.joblib [--de AAAA-MM-DD] [--ate AAAA-MM-DD]
                                    [--destino var/pncp] [--painel src/domain/pncp-triagem-sp.json] [--max-rito N]

Sem datas, lê o último mês completo. Precisa de internet (API do PNCP e, na primeira vez, o encoder no Hugging Face) e de
`pip install sentence-transformers scikit-learn joblib pymupdf`. No Colab, com o Drive montado, o pacote fica em
/content/drive/MyDrive/PNCP_TCC/resultados_final/pacote_reuso.joblib; a GPU do Colab faz os embeddings em minutos.

Grava:
  - var/pncp/triagem-sp.csv (fora do Git: tem número de controle, CNPJ do fornecedor e objeto), uma linha por contrato e
    rodada, para a carga de stg.pncp_triagem e o cruzamento de integrations/sql/pncp-triagem-x-art.sql;
  - var/pncp/contratos-AAAA-MM.json, a coleta de cada mês, e var/pncp/documentos/, os PDFs lidos, para retomar sem baixar de novo;
  - src/domain/pncp-triagem-sp.json, só números por município e mês, que o painel de Fiscalização lê.
Rodar de novo retoma de onde parou: contrato que já tem linha no staging não é lido outra vez. Quando sobra trabalho
(--minutos esgotado ou API que falhou) e a execução gravou alguma linha, fica o arquivo var/pncp/pendente, que a rotina do
GitHub usa para se chamar de novo. O arquivo do painel junta todas as rodadas do staging, a mais recente de cada
contrato. O valor do contrato não é lido nem gravado. A primeira rodada deve cobrir 12 meses ou mais (--de), para a evolução do
cartão comparar com um ano antes.
"""
import argparse
import csv
import datetime as dt
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / 'scripts'))

from pncp_triagem.coleta import buscar_contratos  # noqa: E402
from pncp_triagem.documentos import analisar_compra  # noqa: E402
from pncp_triagem.saida import ARQUIVO_STAGING, COLUNAS_STAGING, agregar, linha_staging  # noqa: E402


def meses(de, ate):
    """Janelas de um mês (ou menos, nas pontas) entre as duas datas: a API responde melhor a períodos curtos."""
    inicio, fim = dt.date.fromisoformat(de), dt.date.fromisoformat(ate)
    while inicio <= fim:
        proximo = (inicio.replace(day=1) + dt.timedelta(days=32)).replace(day=1)
        yield inicio.isoformat(), min(fim, proximo - dt.timedelta(days=1)).isoformat()
        inicio = proximo


def gravar(caminho, texto):
    """Grava num temporário e troca de nome: uma queda no meio não deixa arquivo pela metade."""
    tmp = Path(f'{caminho}.tmp')
    tmp.write_text(texto, encoding='utf-8')
    os.replace(tmp, caminho)


def ler_staging(caminho):
    if not caminho.exists():
        return []
    with caminho.open(encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f, delimiter=';'))


def main():
    hoje = dt.date.today()
    fim_mes_passado = hoje.replace(day=1) - dt.timedelta(days=1)
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('--pacote', required=True, help='pacote_reuso.joblib do estudo do PNCP')
    p.add_argument('--de', default=fim_mes_passado.replace(day=1).isoformat())
    p.add_argument('--ate', default=fim_mes_passado.isoformat())
    p.add_argument('--destino', default=str(RAIZ / 'var' / 'pncp'))
    p.add_argument('--painel', default=str(RAIZ / 'src' / 'domain' / 'pncp-triagem-sp.json'))
    p.add_argument('--max-rito', type=int, default=None, help='lê os documentos de no máximo N compras nesta execução')
    p.add_argument('--minutos', type=float, default=None, help='para de começar mês ou compra nova depois de N minutos; o resto fica para a próxima execução')
    p.add_argument('--paralelo', type=int, default=6, help='compras lidas ao mesmo tempo')
    a = p.parse_args()

    from pncp_triagem.modelo import Modelo  # só aqui: o resto do pacote não precisa do sentence-transformers
    destino = Path(a.destino)
    destino.mkdir(parents=True, exist_ok=True)
    rodada, staging = hoje.isoformat(), destino / ARQUIVO_STAGING
    prazo = time.monotonic() + a.minutos * 60 if a.minutos else None
    sem_tempo = lambda: prazo is not None and time.monotonic() > prazo  # noqa: E731
    # Contrato que já tem linha, de qualquer rodada, não é lido de novo: cada execução só acrescenta o que falta. Assim a primeira
    # rodada de 12 meses pode levar mais de uma execução, e a rotina do mês seguinte termina o que ficou.
    feitos = {l['pncp_id'] for l in ler_staging(staging)}
    modelo = Modelo(a.pacote)
    lidas, adiados, escritos, faltou = 0, 0, 0, False

    for de, ate in meses(a.de, a.ate):
        if sem_tempo():
            print(f'Tempo esgotado antes de {de[:7]}: os meses que faltam ficam para a próxima execução.')
            faltou = True
            break
        cache = destino / f'contratos-{de[:7]}.json'
        if cache.exists() and json.loads(cache.read_text(encoding='utf-8'))['periodo'] == [de, ate]:
            lote = json.loads(cache.read_text(encoding='utf-8'))['contratos']
        else:
            print(f'Coletando {de} a {ate}...')
            lote = buscar_contratos(de, ate)
            gravar(cache, json.dumps({'periodo': [de, ate], 'contratos': lote}, ensure_ascii=False))
        pendentes = [c for c in lote if c['pncp_id'] not in feitos]
        print(f'{de[:7]}: {len(lote)} contratos de serviços em SP, {len(pendentes)} sem triagem.')
        if not pendentes:
            continue
        probs = [float(x) for x in modelo.probabilidades([c['objeto'] for c in pendentes])]
        suspeitos = sorted((i for i in range(len(pendentes)) if probs[i] >= modelo.limiar), key=lambda i: -probs[i])
        # Compras a ler, da mais provável para a menos; a mesma compra serve a todos os contratos dela.
        ncps = list(dict.fromkeys(pendentes[i]['ncp_compra'] or pendentes[i]['pncp_id'] for i in suspeitos))
        if a.max_rito is not None:
            ncps = ncps[:max(0, a.max_rito - lidas)]
        por_compra = {}

        def ler(ncp):
            return ncp, (None if sem_tempo() else analisar_compra(ncp, destino / 'documentos'))
        with ThreadPoolExecutor(max_workers=a.paralelo) as pool:
            for n, (ncp, rito) in enumerate(pool.map(ler, ncps), start=1):
                por_compra[ncp] = rito
                if n % 50 == 0:
                    print(f'  documentos de {n} de {len(ncps)} compras lidos')
        lidas += sum(r is not None for r in por_compra.values())

        novo = not staging.exists()
        with staging.open('a', encoding='utf-8', newline='') as f:
            w = csv.writer(f, delimiter=';')
            if novo:
                w.writerow(COLUNAS_STAGING)
            for i, c in enumerate(pendentes):
                suspeito, ncp = probs[i] >= modelo.limiar, c['ncp_compra'] or c['pncp_id']
                rito = por_compra.get(ncp) if suspeito else None
                if suspeito and ncp in por_compra and rito is None:
                    adiados += 1  # a API falhou ou o tempo acabou: sem linha agora, o contrato volta na próxima execução
                    continue
                w.writerow(linha_staging(rodada, c, probs[i], suspeito, rito))
                feitos.add(c['pncp_id'])
                escritos += 1
    if adiados:
        print(f'{adiados} contratos ficaram para a próxima execução (falha da API do PNCP ou tempo esgotado).')
    # Sobrou trabalho e esta execução andou: a rotina do GitHub lê este arquivo e se chama de novo com o mesmo período. Sem
    # avanço (a API do PNCP fora do ar, por exemplo), não há arquivo, e a rotina para em vez de girar em falso.
    pendente = destino / 'pendente'
    if (adiados or faltou) and escritos:
        pendente.write_text(f'{adiados} contratos adiados; meses por começar: {"sim" if faltou else "não"}\n', encoding='utf-8')
    elif pendente.exists():
        pendente.unlink()

    # O painel lê a linha mais recente de cada contrato de todas as rodadas do staging, e não só do período pedido: a rodada do
    # mês acrescenta um mês ao que já estava, em vez de trocar doze meses por um.
    ultimas = {}
    for l in ler_staging(staging):
        if l['publicacao'] and (l['pncp_id'] not in ultimas or l['rodada'] >= ultimas[l['pncp_id']]['rodada']):
            ultimas[l['pncp_id']] = l
    datas = sorted(l['publicacao'] for l in ultimas.values())
    painel = agregar(list(ultimas.values()), rodada=rodada, modelo=modelo.metadados, periodo={'de': datas[0], 'ate': datas[-1]} if datas else None)
    gravar(Path(a.painel), json.dumps(painel, ensure_ascii=False, separators=(',', ':')) + '\n')
    suspeitos = sum(l['suspeito'] == 'Sim' for l in ultimas.values())
    sem_sinal = sum(l['desfecho_rito'] == 'Sem sinal de rito' for l in ultimas.values())
    print(f'Pronto: {len(ultimas)} contratos, {suspeitos} com objeto de engenharia pelo modelo, {sem_sinal} sem sinal de rito nos documentos.')
    print(f'Staging em {staging}; números do painel em {a.painel}.')


if __name__ == '__main__':
    main()
