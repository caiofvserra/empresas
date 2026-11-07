"""Sinal do rito de engenharia nos documentos da compra: marcadores e regra adaptados do orquestradorfiscaliza
(src/orquestrador/coleta/pncp_docs.py e analise/checks/rito_engenharia.py, AGPL-3.0, do mesmo autor).

O rito está presente quando o processo traz ao menos dois marcadores e um deles é específico de engenharia (ART, Crea,
engenheiro responsável, obra ou serviço de engenharia, art. 6º, XII ou XXI, da Lei 14.133/2021). Atestado de capacidade
técnica, projeto básico e norma ABNT sozinhos não bastam: a Lei 14.133 pede essa moldura de qualquer objeto, e um termo de
referência de limpeza predial chega a três desses marcadores sem uma linha de engenharia. Achar o sinal não prova que houve
ART, e não achar não prova que faltou: é a prioridade de verificação, que o cruzamento com as ARTs confirma ou não.
"""
import re

MARCADORES = {
    # A sigla ART e a abreviação de "artigo" são as mesmas letras: a sigla só vale em caixa alta, e "ART." seguido de número
    # é artigo de lei escrito em maiúsculas.
    'ART': [r'\banota[çc][ãa]o\s+de\s+responsabilidade\s+t[ée]cnica\b', r'(?-i:\bARTs?\b)(?!\.\s*\d)'],
    # A UF vem separada por barra, espaço ou hífen; "CREAS" é a assistência social.
    'CREA': [r'\bCREA(?:[/\s\-]\w{2})?\b', r'\bConselho\s+Regional\s+de\s+Engenharia\b', r'\bregistro\s+(?:no\s+)?CREA\b'],
    'ENGENHEIRO_RESPONSAVEL': [r'\bengenheiro\s+respons[áa]vel\b', r'\bengenheira?\s+respons[áa]vel\b'],
    'ATESTADO_CAP_TECNICA': [r'\bquadro\s+de\s+respons[áa]veis\s+t[ée]cnicos\b', r'\batestado\s+de\s+capacidade\s+t[ée]cnica\b',
                             r'\bACT\b(?:\s+do\s+CREA)?', r'\brespons[áa]vel\s+t[ée]cnico\b', r'\bRT\s+do\s+(?:contrato|servi[çc]o|edital)\b'],
    'PROJETO_BASICO': [r'\bprojeto\s+b[áa]sico\b', r'\banteprojeto\s+de\s+engenharia\b', r'\bprojeto\s+executivo\b'],
    'OBRA_SERVICO_ENGENHARIA': [r'\bobra\s+de\s+engenharia\b', r'\bservi[çc]o\s+(?:comum\s+)?de\s+engenharia\b',
                                r'\bservi[çc]o\s+especial\s+de\s+engenharia\b'],
    'ABNT_NORMA': [r'\bABNT\s+NBR\s*\d+', r'\bnorma\s+t[ée]cnica\s+(?:NBR\s*\d+|brasileira)\b'],
    # Lei 14.133/2021, art. 6º: XII define obra e XXI, serviço de engenharia. XXIII (termo de referência) abre quase todo TR.
    'LEI_14133_ENGENHARIA': [r'\bart\.?\s*6[°º]?,?\s*(?:inc(?:iso)?\.?\s*)?XII\b', r'\bart\.?\s*6[°º]?,?\s*(?:inc(?:iso)?\.?\s*)?XXI\b'],
}
ESPECIFICOS = ('ART', 'CREA', 'ENGENHEIRO_RESPONSAVEL', 'OBRA_SERVICO_ENGENHARIA', 'LEI_14133_ENGENHARIA')
MARCADORES_PARA_RITO = 2
_RX = {nome: [re.compile(p, re.IGNORECASE) for p in padroes] for nome, padroes in MARCADORES.items()}


def normalizar(texto):
    """Desfaz a hifenização e as quebras de linha simples do PDF; sem isto o regex perde boa parte das ocorrências."""
    if not texto:
        return ''
    texto = re.sub(r'-\s*\n\s*', '', texto)
    texto = re.sub(r'(?<!\n)\n(?!\n)', ' ', texto)
    return re.sub(r'[ \t]+', ' ', texto)


def detectar_marcadores(texto):
    """Presença de cada categoria no texto. O texto não vai para minúsculas: a sigla ART depende da caixa."""
    t = normalizar(texto)
    return {nome: any(rx.search(t) for rx in padroes) for nome, padroes in _RX.items()}


def classificar_rito(texto):
    """(desfecho, categorias presentes) para o texto de todos os documentos lidos da compra, juntos: a ART costuma estar na
    minuta e a norma na especificação, e o que importa é o processo, não cada arquivo."""
    presentes = [nome for nome, achou in detectar_marcadores(texto).items() if achou]
    if len(presentes) >= MARCADORES_PARA_RITO and any(nome in ESPECIFICOS for nome in presentes):
        return 'Rito presente', presentes
    return ('Rito parcial' if presentes else 'Sem sinal de rito'), presentes
