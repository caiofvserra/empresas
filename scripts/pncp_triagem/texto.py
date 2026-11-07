"""Limpeza do objeto do contrato antes do encoder: os mesmos padrões usados no treino do modelo.

Sem ela, o "contratação de empresa especializada para prestação de serviços de..." que abre quase todo objeto puxa a
similaridade para cima e o modelo deixa de separar uma coisa da outra. Mudar estes padrões muda a entrada do modelo treinado.
"""
import re

_PREFIXOS = [re.compile(p, re.IGNORECASE) for p in [
    r'^\s*o\s+objeto\s+d[eo]\s+presente\s+\w+\s+(é\s+|e\s+)?(a\s+|o\s+)?',
    r'^\s*registro\s+de\s+pre[çc]os?\s+(para\s+(a\s+)?)?(contrata[çc][ãa]o\s+(de\s+)?)?',
    r'^\s*contrata[çc][ãa]o\s+(de\s+)?(empresa\s+)?(especializada\s+)?'
    r'((para|em|na|no)\s+(a\s+)?)?(presta[çc][ãa]o\s+(de\s+)?)?(servi[çc]os?\s+(de\s+)?)?',
    r'^\s*presta[çc][ãa]o\s+de\s+servi[çc]os?\s+(de\s+)?',
    r'^\s*aquisi[çc][ãa]o\s+de\s+', r'^\s*fornecimento\s+de\s+',
    r'^\s*execu[çc][ãa]o\s+de\s+(servi[çc]os?\s+(de\s+)?)?',
    r'^\s*loca[çc][ãa]o\s+de\s+',
]]


def limpar_objeto(texto):
    """Tira os prefixos burocráticos (até três passadas, porque eles vêm encadeados) e junta os espaços."""
    if not isinstance(texto, str):
        return ''
    s = texto.strip()
    for _ in range(3):
        for rx in _PREFIXOS:
            s = rx.sub('', s, count=1)
    return re.sub(r'\s+', ' ', s).strip()
