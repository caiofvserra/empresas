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
Rodar de novo no mesmo dia retoma de onde parou. O valor do contrato não é lido nem gravado.
"""
import argparse
import csv
import datetime as dt
import json
import os
import sys
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
    p.add_argument('--max-rito', type=int, default=None, help='lê os documentos só dos N suspeitos mais prováveis')
    a = p.parse_args()

    from pncp_triagem.modelo import Modelo  # só aqui: o resto do pacote não precisa do sentence-transformers
    destino = Path(a.destino)
    destino.mkdir(parents=True, exist_ok=True)
    rodada, staging = hoje.isoformat(), destino / ARQUIVO_STAGING

    contratos = []
    for de, ate in meses(a.de, a.ate):
        cache = destino / f'contratos-{de[:7]}.json'
        if cache.exists() and json.loads(cache.read_text(encoding='utf-8'))['periodo'] == [de, ate]:
            lote = json.loads(cache.read_text(encoding='utf-8'))['contratos']
        else:
            print(f'Coletando {de} a {ate}...')
            lote = buscar_contratos(de, ate)
            gravar(cache, json.dumps({'periodo': [de, ate], 'contratos': lote}, ensure_ascii=False))
        contratos += lote
    feitos = {l['pncp_id'] for l in ler_staging(staging) if l['rodada'] == rodada}
    pendentes = [c for c in contratos if c['pncp_id'] not in feitos]
    print(f'{len(contratos)} contratos de serviços em SP no período; {len(pendentes)} ainda sem triagem nesta rodada.')

    modelo = Modelo(a.pacote)
    if pendentes:
        probs = modelo.probabilidades([c['objeto'] for c in pendentes])
        ordem = sorted(range(len(pendentes)), key=lambda i: -probs[i])
        novo = not staging.exists()
        lidas, por_compra = 0, {}
        with staging.open('a', encoding='utf-8', newline='') as f:
            w = csv.writer(f, delimiter=';')
            if novo:
                w.writerow(COLUNAS_STAGING)
            for n, i in enumerate(ordem):
                c, prob = pendentes[i], float(probs[i])
                suspeito = prob >= modelo.limiar
                rito = None
                if suspeito and (a.max_rito is None or lidas < a.max_rito):
                    ncp = c['ncp_compra'] or c['pncp_id']
                    if ncp not in por_compra:
                        por_compra[ncp] = analisar_compra(ncp, destino / 'documentos')
                        lidas += 1
                    rito = por_compra[ncp]
                w.writerow(linha_staging(rodada, c, prob, suspeito, rito))
                if n % 20 == 0:
                    f.flush()
                    if suspeito:
                        print(f'  {n + 1} de {len(pendentes)} (documentos de {lidas} compras lidos)')

    # O painel lê a linha mais recente de cada contrato do período pedido.
    ultimas = {}
    for l in ler_staging(staging):
        if a.de <= l['publicacao'] <= a.ate and (l['pncp_id'] not in ultimas or l['rodada'] >= ultimas[l['pncp_id']]['rodada']):
            ultimas[l['pncp_id']] = l
    painel = agregar(list(ultimas.values()), rodada=rodada, modelo=modelo.metadados, periodo={'de': a.de, 'ate': a.ate})
    gravar(Path(a.painel), json.dumps(painel, ensure_ascii=False, separators=(',', ':')) + '\n')
    suspeitos = sum(l['suspeito'] == 'Sim' for l in ultimas.values())
    sem_sinal = sum(l['desfecho_rito'] == 'Sem sinal de rito' for l in ultimas.values())
    print(f'Pronto: {len(ultimas)} contratos, {suspeitos} com objeto de engenharia pelo modelo, {sem_sinal} sem sinal de rito nos documentos.')
    print(f'Staging em {staging}; números do painel em {a.painel}.')


if __name__ == '__main__':
    main()
