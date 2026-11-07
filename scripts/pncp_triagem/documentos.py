"""Documentos da compra no PNCP (edital, termo de referência, projeto básico) e o texto deles, adaptado do orquestradorfiscaliza
(src/orquestrador/coleta/pncp_docs.py, AGPL-3.0, do mesmo autor).

O contrato aponta a compra que o originou (numeroControlePncpCompra); é na compra que estão o termo de referência e o projeto,
onde a engenharia aparece ou não. Lê até três documentos, na ordem em que o marcador tende a aparecer. PDF sem texto passa pelo
OCR do PyMuPDF quando o Tesseract em português está instalado; sem ele, o documento fica como ilegível, e não como sem rito.
"""
import glob
import os
import re
import urllib.request
from pathlib import Path

from .coleta import CABECALHO, pedir_json
from .rito import classificar_rito

API = 'https://pncp.gov.br/api/pncp/v1'
# Manual do PNCP, tipos de documento: 4 termo de referência, 6 projeto básico, 7 estudo técnico preliminar, 8 projeto executivo,
# 5 anteprojeto, 2 edital, 3 minuta do contrato, 12 contrato, 14 termo aditivo.
PRIORIDADE = (4, 6, 7, 8, 5, 2, 3, 12, 14)
MAX_DOCUMENTOS = 3
TEXTO_MINIMO = 200
OCR_PAGINAS = 8
_NCP = re.compile(r'^(\d{14})-(\d+)-(\d+)/(\d{4})$')


def decompor(ncp):
    m = _NCP.match((ncp or '').strip())
    return None if not m else {'cnpj': m[1], 'tipo': int(m[2]), 'sequencial': int(m[3]), 'ano': int(m[4])}


def _base(info):
    recurso = 'compras' if info['tipo'] == 1 else 'contratos'
    return f"{API}/orgaos/{info['cnpj']}/{recurso}/{info['ano']}/{info['sequencial']}/arquivos"


def pasta_tessdata():
    """Onde está o modelo de português do OCR (por.traineddata): TESSDATA_PREFIX ou as pastas do pacote tesseract-ocr-por.
    O motor do OCR já vem dentro do PyMuPDF; falta só esse arquivo, que o `apt install tesseract-ocr-por` do Colab traz."""
    candidatas = [os.environ.get('TESSDATA_PREFIX', ''), *sorted(glob.glob('/usr/share/tesseract-ocr/*/tessdata'), reverse=True),
                  '/usr/share/tessdata', '/opt/homebrew/share/tessdata', '/usr/local/share/tessdata']
    return next((c for c in candidatas if c and Path(c, 'por.traineddata').exists()), None)


def _texto_pdf(conteudo):
    try:
        import pymupdf
    except ImportError:
        import fitz as pymupdf
    try:
        with pymupdf.open(stream=conteudo, filetype='pdf') as doc:
            texto = '\n'.join(p.get_text() for p in doc)
            tessdata = pasta_tessdata()
            if len(texto.strip()) >= TEXTO_MINIMO or not tessdata:
                return texto
            ocr = []
            for i, pagina in enumerate(doc):
                if i >= OCR_PAGINAS:
                    break
                try:
                    ocr.append(pagina.get_text(textpage=pagina.get_textpage_ocr(language='por', dpi=200, full=True, tessdata=tessdata)))
                except Exception:  # noqa: BLE001 - página ruim não derruba o documento
                    continue
            return '\n'.join(ocr)
    except Exception:  # noqa: BLE001 - PDF corrompido é comum
        return ''


def _baixar(url, pasta):
    destino = pasta / (re.sub(r'[^0-9A-Za-z]+', '_', url.split('/orgaos/')[-1]) + '.pdf') if pasta else None
    if destino and destino.exists() and destino.stat().st_size:
        return destino.read_bytes()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=CABECALHO), timeout=90) as resposta:
            conteudo = resposta.read()
    except Exception:  # noqa: BLE001 - a triagem segue sem o documento
        return None
    if not conteudo.startswith(b'%PDF'):
        return None
    if destino:
        destino.write_bytes(conteudo)
    return conteudo


def analisar_compra(ncp, pasta=None):
    """{'desfecho', 'marcadores', 'documentos'} para a compra (ou o contrato, se a compra não veio)."""
    info = decompor(ncp)
    if not info:
        return {'desfecho': 'Sem compra vinculada', 'marcadores': [], 'documentos': 0}
    try:
        lista = pedir_json(_base(info)) or []
    except Exception:  # noqa: BLE001
        lista = []
    lista = [d for d in (lista if isinstance(lista, list) else lista.get('data') or []) if d.get('statusAtivo', True)]
    if not lista:
        return {'desfecho': 'Sem documento', 'marcadores': [], 'documentos': 0}
    ordem = {t: i for i, t in enumerate(PRIORIDADE)}
    escolhidos = sorted(lista, key=lambda d: ordem.get(d.get('tipoDocumentoId'), 99))[:MAX_DOCUMENTOS]
    pasta = Path(pasta) if pasta else None
    if pasta:
        pasta.mkdir(parents=True, exist_ok=True)
    textos = []
    for d in escolhidos:
        seq = d.get('sequencialDocumento') or d.get('sequencial')
        conteudo = _baixar(f'{_base(info)}/{seq}', pasta)
        texto = _texto_pdf(conteudo) if conteudo else ''
        if len(texto.strip()) >= TEXTO_MINIMO:
            textos.append(texto)
    if not textos:
        return {'desfecho': 'Documento ilegível', 'marcadores': [], 'documentos': 0}
    desfecho, marcadores = classificar_rito('\n\n'.join(textos))
    return {'desfecho': desfecho, 'marcadores': marcadores, 'documentos': len(textos)}
