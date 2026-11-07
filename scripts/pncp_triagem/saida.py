"""O que a triagem grava: a linha do staging (fora do Git, com número de controle e CNPJ) e o agregado do painel (só números).

O staging alimenta stg.pncp_triagem e o cruzamento com as ARTs em integrations/sql/pncp-triagem-x-art.sql. O agregado vai para
src/domain/pncp-triagem-sp.json e é lido pelo cartão da página Contratos do painel de Fiscalização.
"""
COLUNAS_STAGING = ('rodada', 'pncp_id', 'ncp_compra', 'orgao_cnpj', 'municipio_ibge', 'publicacao', 'fornecedor_tipo', 'fornecedor_ni',
                   'objeto', 'prob_engenharia', 'suspeito', 'desfecho_rito', 'marcadores', 'documentos_lidos')
ARQUIVO_STAGING = 'triagem-sp.csv'
NAO_ANALISADO = 'Não analisado'
# Desfechos que não chegaram a ler o texto: a compra não foi achada, não tem documento ou o PDF é imagem sem OCR.
SEM_LEITURA = ('Sem compra vinculada', 'Sem documento', 'Documento ilegível')


def linha_staging(rodada, contrato, prob, suspeito, rito):
    """Uma linha por contrato lido. `rito` é None para quem não passou do limiar: o documento só é lido para os suspeitos."""
    rito = rito or {'desfecho': NAO_ANALISADO, 'marcadores': [], 'documentos': 0}
    # CPF de fornecedor pessoa física não é gravado: o cruzamento é só com empresas, e o staging fica guardado fora do Git.
    ni = '' if contrato['fornecedor_tipo'] == 'PF' else contrato['fornecedor_ni']
    return [rodada, contrato['pncp_id'], contrato['ncp_compra'], contrato['pncp_id'][:14], contrato['municipio_ibge'], contrato['publicacao'],
            contrato['fornecedor_tipo'], ni, contrato['objeto'], f'{prob:.4f}', 'Sim' if suspeito else 'Não',
            rito['desfecho'], '|'.join(rito['marcadores']), str(rito['documentos'])]


def agregar(linhas, rodada, modelo, periodo=None):
    """Contagens por município do IBGE e mês de publicação, a partir das linhas do staging (dicionários pelas colunas). Os meses
    são todos os do calendário entre o primeiro e o último, também os sem contrato, para o painel contar a janela em meses."""
    publicados = sorted({l['publicacao'][:7] for l in linhas if l['publicacao']})
    meses = []
    if publicados:
        ano, mes = map(int, publicados[0].split('-'))
        while f'{ano:04d}-{mes:02d}' <= publicados[-1]:
            meses.append(f'{ano:04d}-{mes:02d}')
            ano, mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    posicao = {m: i for i, m in enumerate(meses)}
    municipios = {}
    for l in linhas:
        if not l['publicacao']:
            continue
        m = municipios.setdefault(l['municipio_ibge'], {k: [0] * len(meses) for k in ('lidos', 'suspeitos', 'presente', 'parcial', 'semSinal', 'semLeitura')})
        i, d = posicao[l['publicacao'][:7]], l['desfecho_rito']
        m['lidos'][i] += 1
        if l['suspeito'] != 'Sim':
            continue
        m['suspeitos'][i] += 1
        chave = {'Rito presente': 'presente', 'Rito parcial': 'parcial', 'Sem sinal de rito': 'semSinal'}.get(d, 'semLeitura' if d in SEM_LEITURA else None)
        if chave:
            m[chave][i] += 1
    return {'fonte': 'PNCP, API de consulta e de arquivos; modelo treinado do estudo do PNCP', 'rodada': rodada, 'modelo': modelo,
            'periodo': periodo or ({'de': meses[0], 'ate': meses[-1]} if meses else None), 'meses': meses,
            'municipios': dict(sorted(municipios.items()))}
