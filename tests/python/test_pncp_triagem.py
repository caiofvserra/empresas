"""Testes da triagem dos contratos de serviços gerais do PNCP (scripts/pncp_triagem). Só as partes sem rede e sem o modelo.

    python3 -m unittest discover -s tests/python
"""
import json
import re
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / 'scripts'))

from pncp_triagem.coleta import ler_pagina  # noqa: E402
from pncp_triagem.rito import classificar_rito, detectar_marcadores  # noqa: E402
from pncp_triagem.saida import COLUNAS_STAGING, agregar, linha_staging  # noqa: E402
from pncp_triagem.texto import limpar_objeto  # noqa: E402


def contrato(**extra):
    base = {'numeroControlePNCP': '11111111000100-2-000123/2026', 'numeroControlePncpCompra': '11111111000100-1-000045/2026',
            'objetoContrato': 'Contratação de empresa especializada para prestação de serviços de manutenção predial',
            'categoriaProcesso': {'id': 8, 'nome': 'Serviços'}, 'dataPublicacaoPncp': '2026-10-05T10:00:00',
            'unidadeOrgao': {'ufSigla': 'SP', 'codigoIbge': '3550308', 'municipioNome': 'São Paulo'},
            'tipoPessoa': 'PJ', 'niFornecedor': '01234567000189', 'valorGlobal': 1000.0}
    base.update(extra)
    return base


class Texto(unittest.TestCase):
    def test_tira_o_prefixo_burocratico_como_no_treino(self):
        self.assertEqual(limpar_objeto('Contratação de empresa especializada para prestação de serviços de manutenção predial'), 'manutenção predial')
        self.assertEqual(limpar_objeto('REGISTRO DE PREÇOS PARA CONTRATAÇÃO DE  pintura   de escolas'), 'pintura de escolas')
        self.assertEqual(limpar_objeto('O objeto do presente contrato é a locação de máquinas'), 'máquinas')
        self.assertEqual(limpar_objeto(None), '')


class Coleta(unittest.TestCase):
    def test_fica_so_com_servicos_gerais_de_sp_com_objeto_e_sem_valor(self):
        pagina = {'data': [contrato(), contrato(numeroControlePNCP='x-2-1/2026', unidadeOrgao={'ufSigla': 'RJ', 'codigoIbge': '3304557'}),
                           contrato(numeroControlePNCP='y-2-1/2026', categoriaProcesso={'id': 9, 'nome': 'Serviços de Engenharia'}),
                           contrato(numeroControlePNCP='z-2-1/2026', objetoContrato='curto', informacaoComplementar='')]}
        [c] = ler_pagina(pagina)
        self.assertEqual(c['pncp_id'], '11111111000100-2-000123/2026')
        self.assertEqual((c['municipio_ibge'], c['publicacao'], c['ncp_compra'], c['fornecedor_ni']), ('3550308', '2026-10-05', '11111111000100-1-000045/2026', '01234567000189'))
        self.assertNotIn('valor', ' '.join(c.keys()), 'o valor do contrato não entra em nenhuma saída')

    def test_o_texto_do_modelo_e_o_do_treino_objeto_e_complemento(self):
        [c] = ler_pagina({'data': [contrato(objetoContrato='Reforma da escola', informacaoComplementar='com troca do telhado')]})
        self.assertEqual(c['objeto'], 'Reforma da escola | com troca do telhado')
        [s] = ler_pagina({'data': [contrato(objetoContrato='Manutenção dos prédios públicos', informacaoComplementar=None)]})
        self.assertEqual(s['objeto'], 'Manutenção dos prédios públicos')
        self.assertEqual(ler_pagina({'data': [contrato(objetoContrato='x' * 20)]}), [], 'o treino ficou com mais de 20 caracteres')

    def test_sem_o_numero_da_compra_usa_o_proprio_contrato(self):
        [c] = ler_pagina({'data': [contrato(numeroControlePncpCompra=None)]})
        self.assertEqual(c['ncp_compra'], '')


class ColetaParalela(unittest.TestCase):
    def _paginas(self, falha=None):
        import urllib.parse
        from pncp_triagem import coleta
        def falso(url, **_):
            pagina = int(urllib.parse.parse_qs(urllib.parse.urlparse(url).query)['pagina'][0])
            if pagina == falha:
                return None
            return {'totalPaginas': 3, 'data': [contrato(numeroControlePNCP=f'11111111000100-2-{pagina:06d}/2026'), contrato()]}
        original = coleta.pedir_json
        coleta.pedir_json = falso
        try:
            return coleta.buscar_contratos('2026-10-01', '2026-10-31', log=lambda *a: None)
        finally:
            coleta.pedir_json = original

    def test_le_todas_as_paginas_em_paralelo_sem_repetir_contrato(self):
        ids = sorted(c['pncp_id'] for c in self._paginas())
        self.assertEqual(ids, ['11111111000100-2-000001/2026', '11111111000100-2-000002/2026', '11111111000100-2-000003/2026', '11111111000100-2-000123/2026'])

    def test_pagina_que_nao_responde_deixa_o_mes_incompleto(self):
        self.assertIsNone(self._paginas(falha=2))


class RetomadaPorPagina(unittest.TestCase):
    """Como na coleta do caderno do estudo: o mês interrompido continua da última página gravada, sem pedir tudo de novo."""

    def test_mes_interrompido_continua_da_pagina_seguinte(self):
        import tempfile
        import urllib.parse
        from unittest import mock
        from pncp_triagem import coleta
        pedidas = []

        def falso(url, **_):
            pagina = int(urllib.parse.parse_qs(urllib.parse.urlparse(url).query)['pagina'][0])
            pedidas.append(pagina)
            return {'totalPaginas': 7, 'data': [contrato(numeroControlePNCP=f'11111111000100-2-{pagina:06d}/2026')]}
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(coleta, 'pedir_json', falso):
            parcial = Path(tmp) / 'contratos-2026-10.parcial.json'
            chamadas = {'n': 0}

            def parar():
                chamadas['n'] += 1
                return chamadas['n'] > 1  # o prazo acaba depois do primeiro bloco
            primeira = coleta.buscar_contratos('2026-10-01', '2026-10-31', log=lambda *a: None, paralelo=2, bloco=2,
                                               parcial=parcial, parar=parar)
            self.assertIsNone(primeira)
            self.assertTrue(parcial.exists())
            feitas = sorted(set(pedidas))
            pedidas.clear()
            completo = coleta.buscar_contratos('2026-10-01', '2026-10-31', log=lambda *a: None, paralelo=2, bloco=2, parcial=parcial)
            self.assertEqual(len(completo), 7)
            self.assertFalse(set(pedidas) & set(feitas), 'página já gravada foi pedida de novo')
            self.assertFalse(parcial.exists())


class LimiteDaApi(unittest.TestCase):
    """HTTP 429: a API do PNCP pede calma. Todas as threads esperam juntas, pelo Retry-After ou por 30 s, e tentam de novo."""

    def test_429_pausa_todas_as_threads_e_tenta_de_novo(self):
        import email.message
        import io
        import urllib.error
        from unittest import mock
        from pncp_triagem import coleta
        relogio = {'agora': 1000.0}
        dormiu = []

        def dormir(s):
            dormiu.append(s)
            relogio['agora'] += s
        respostas = [urllib.error.HTTPError('u', 429, 'Too Many Requests', email.message.Message(), io.BytesIO()),
                     io.BytesIO(b'{"ok": 1}')]

        def abrir(req, timeout):
            r = respostas.pop(0)
            if isinstance(r, Exception):
                raise r
            return r
        with mock.patch.object(coleta.urllib.request, 'urlopen', abrir), mock.patch.object(coleta.time, 'sleep', dormir), \
                mock.patch.object(coleta.time, 'monotonic', lambda: relogio['agora']):
            self.assertEqual(coleta.pedir_json('https://pncp.gov.br/api/x'), {'ok': 1})
            self.assertGreaterEqual(sum(dormiu), 30)
            self.assertGreaterEqual(coleta._pausa['ate'], 1030)  # a pausa vale para as outras threads
        coleta._pausa['ate'] = 0.0


class Rito(unittest.TestCase):
    def test_artigo_de_lei_nao_e_ART(self):
        m = detectar_marcadores('Contratação nos termos do art. 75, II, e do Art. 6º da Lei. ART. 5 trata do prazo.')
        self.assertFalse(m['ART'])
        self.assertTrue(detectar_marcadores('apresentar a ART 2026/000123 no início')['ART'])
        self.assertTrue(detectar_marcadores('Anotação de Responsabilidade Técnica')['ART'])

    def test_CREAS_da_assistencia_social_nao_e_CREA(self):
        self.assertFalse(detectar_marcadores('atendimento no CREAS municipal')['CREA'])
        self.assertTrue(detectar_marcadores('registro no CREA-SP')['CREA'])

    def test_inciso_XXIII_nao_e_servico_de_engenharia(self):
        self.assertFalse(detectar_marcadores('conforme art. 6º, XXIII, da Lei 14.133')['LEI_14133_ENGENHARIA'])
        self.assertTrue(detectar_marcadores('nos termos do art. 6º, inciso XXI')['LEI_14133_ENGENHARIA'])

    def test_rito_presente_pede_dois_marcadores_e_um_especifico(self):
        self.assertEqual(classificar_rito('ART do engenheiro e registro no CREA-SP'), ('Rito presente', ['ART', 'CREA']))
        self.assertEqual(classificar_rito('atestado de capacidade técnica e projeto básico conforme ABNT NBR 5410')[0], 'Rito parcial',
                         'só a moldura de habilitação que a Lei 14.133 pede de qualquer objeto')
        self.assertEqual(classificar_rito('limpeza das salas, nos termos do art. 75'), ('Sem sinal de rito', []))

    def test_quebra_de_linha_e_hifenizacao_do_pdf(self):
        self.assertEqual(classificar_rito('serviço de engen-\nharia com ART\nanotada')[0], 'Rito presente')


class Saida(unittest.TestCase):
    def test_linha_de_staging_segue_as_colunas(self):
        [c] = ler_pagina({'data': [contrato()]})
        linha = linha_staging('2026-11-07', c, prob=0.81234, suspeito=True, rito={'desfecho': 'Sem sinal de rito', 'marcadores': [], 'documentos': 2})
        self.assertEqual(len(linha), len(COLUNAS_STAGING))
        d = dict(zip(COLUNAS_STAGING, linha))
        self.assertEqual((d['prob_engenharia'], d['suspeito'], d['desfecho_rito'], d['documentos_lidos'], d['orgao_cnpj']), ('0.8123', 'Sim', 'Sem sinal de rito', '2', '11111111000100'))
        [pf] = ler_pagina({'data': [contrato(tipoPessoa='PF', niFornecedor='12345678909')]})
        self.assertEqual(dict(zip(COLUNAS_STAGING, linha_staging('2026-11-07', pf, prob=0.9, suspeito=True, rito=None)))['fornecedor_ni'], '', 'CPF não vai para o staging')
        nao = dict(zip(COLUNAS_STAGING, linha_staging('2026-11-07', c, prob=0.1, suspeito=False, rito=None)))
        self.assertEqual((nao['suspeito'], nao['desfecho_rito'], nao['marcadores']), ('Não', 'Não analisado', ''))

    def test_agregado_so_tem_numeros_por_municipio_e_mes(self):
        linhas = [
            {'municipio_ibge': '3550308', 'publicacao': '2026-09-10', 'suspeito': 'Sim', 'desfecho_rito': 'Sem sinal de rito'},
            {'municipio_ibge': '3550308', 'publicacao': '2026-10-01', 'suspeito': 'Sim', 'desfecho_rito': 'Rito presente'},
            {'municipio_ibge': '3550308', 'publicacao': '2026-10-02', 'suspeito': 'Não', 'desfecho_rito': 'Não analisado'},
            {'municipio_ibge': '3509502', 'publicacao': '2026-10-03', 'suspeito': 'Sim', 'desfecho_rito': 'Sem documento'},
        ]
        a = agregar(linhas, rodada='2026-11-07', modelo={'limiar': 0.45})
        self.assertEqual(a['meses'], ['2026-09', '2026-10'])
        self.assertEqual(a['municipios']['3550308'], {'lidos': [1, 2], 'suspeitos': [1, 1], 'presente': [0, 1], 'parcial': [0, 0], 'semSinal': [1, 0], 'semLeitura': [0, 0]})
        self.assertEqual(a['municipios']['3509502']['semLeitura'], [0, 1])
        com_buraco = agregar([linhas[0], {**linhas[3], 'publicacao': '2026-12-01'}], rodada='2026-11-07', modelo={})
        self.assertEqual(com_buraco['meses'], ['2026-09', '2026-10', '2026-11', '2026-12'], 'mês sem contrato também entra, para a janela contar meses')
        texto = json.dumps(a, ensure_ascii=False)
        self.assertNotRegex(texto, r'\d{14}', 'nenhum CNPJ nem número de controle no arquivo do painel')

    def test_contrato_sql_descreve_as_colunas_do_staging(self):
        sql = (RAIZ / 'integrations' / 'sql' / 'pncp-triagem-x-art.sql').read_text(encoding='utf-8')
        trecho = re.search(r'stg\.pncp_triagem\s+<- triagem-sp\.csv[^\n]*\n--\s+\(([^)]*)\)', sql)
        self.assertIsNotNone(trecho, 'o SQL descreve a carga de stg.pncp_triagem')
        self.assertEqual([c.strip() for c in trecho[1].split(',')], list(COLUNAS_STAGING))
        sem_comentario = re.sub(r'--.*$', '', sql, flags=re.M)
        for valor in re.findall(r"(?:desfecho_rito|suspeito)\s*(?:=|<>|IN\s*\()\s*'([^']*)'", sem_comentario):
            self.assertIn(valor, {'Sim', 'Não', 'Rito presente', 'Rito parcial', 'Sem sinal de rito', 'Sem compra vinculada', 'Sem documento', 'Documento ilegível', 'Não analisado'})


if __name__ == '__main__':
    unittest.main()


class Retomada(unittest.TestCase):
    """O script inteiro, com modelo, coleta e documentos falsos: a segunda execução pula o que a primeira gravou."""

    def rodar(self, pasta, ritos, coleta=None):
        import importlib.util
        import types
        from unittest import mock
        spec = importlib.util.spec_from_file_location('pncp_triagem_cli', RAIZ / 'scripts' / 'pncp-triagem.py')
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)

        class Modelo:
            limiar, metadados = 0.5, {'limiar': 0.5}

            def __init__(self, caminho):
                pass

            def probabilidades(self, objetos):
                return [0.9 if 'obra' in o else 0.1 for o in objetos]
        lote = [{'pncp_id': f'11111111000100-2-00000{n}/2026', 'ncp_compra': f'11111111000100-1-00000{n}/2026', 'orgao_cnpj': '11111111000100',
                 'municipio_ibge': '3550308', 'publicacao': '2026-10-05', 'fornecedor_tipo': 'PJ', 'fornecedor_ni': '01234567000189',
                 'objeto': objeto} for n, objeto in enumerate(['reforma de obra da escola', 'limpeza de prédios', 'obra de drenagem'])]
        lidas = []

        def analisar(ncp, pasta_docs):
            lidas.append(ncp)
            return ritos.get(ncp)
        argv = ['pncp-triagem.py', '--pacote', 'x', '--de', '2026-10-01', '--ate', '2026-10-31', '--destino', str(pasta),
                '--painel', str(pasta / 'painel.json')]
        with mock.patch.dict(sys.modules, {'pncp_triagem.modelo': types.SimpleNamespace(Modelo=Modelo)}), \
                mock.patch.object(cli, 'buscar_contratos', coleta or (lambda *a, **k: lote)), mock.patch.object(cli, 'analisar_compra', analisar), \
                mock.patch.object(sys, 'argv', argv), mock.patch('builtins.print'):
            cli.main()
        return lidas

    def test_compra_que_falhou_fica_pendente_e_so_ela_e_lida_de_novo(self):
        import csv
        import tempfile
        ok = {'desfecho': 'Rito presente', 'marcadores': ['ART', 'CREA'], 'documentos': 1}
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp)
            primeira = self.rodar(pasta, {'11111111000100-1-000000/2026': ok})  # a compra da drenagem falha na API
            self.assertEqual(sorted(primeira), ['11111111000100-1-000000/2026', '11111111000100-1-000002/2026'])
            self.assertTrue((pasta / 'pendente').exists())
            segunda = self.rodar(pasta, {'11111111000100-1-000002/2026': ok})
            self.assertEqual(segunda, ['11111111000100-1-000002/2026'])
            self.assertFalse((pasta / 'pendente').exists())
            with (pasta / 'triagem-sp.csv').open(encoding='utf-8') as f:
                linhas = list(csv.DictReader(f, delimiter=';'))
            self.assertEqual(len(linhas), 3)
            self.assertIsNotNone(json.loads((pasta / 'painel.json').read_text(encoding='utf-8'))['rodada'])

    def test_sem_avanco_nao_deixa_pendente(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp)
            self.rodar(pasta, {})  # as duas compras suspeitas falham; o contrato de limpeza é gravado
            self.assertTrue((pasta / 'pendente').exists())
            self.rodar(pasta, {})  # de novo nada responde: nenhuma linha nova, e a rotina para
            self.assertFalse((pasta / 'pendente').exists())

    def test_mes_coletado_pela_metade_tambem_e_avanco(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            pasta = Path(tmp)

            def metade(de, ate, parcial=None, parar=None, **_):
                parcial.write_text(json.dumps({'periodo': [de, ate], 'pagina': 300, 'total': 600, 'contratos': []}), encoding='utf-8')
                return None  # o prazo acabou no meio do mês
            self.rodar(pasta, {}, coleta=metade)
            self.assertTrue((pasta / 'pendente').exists(), 'leu 300 páginas: a rotina deve se chamar de novo')
            self.rodar(pasta, {}, coleta=lambda *a, **k: None)  # nada novo: a página salva não mudou
            self.assertFalse((pasta / 'pendente').exists())
