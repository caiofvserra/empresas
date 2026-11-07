import { brl, int, pct } from '../painel/ui';
import type { CockpitCtx } from '../cockpit/contexto';
import { Bloco, Indicador, Selo, avisoVazio } from '../cockpit/ui';
import { triagemPncp, useTriagem } from './triagem';
import { Concentracao, ContratosArt, ContratosSemArt, EtapasTce, Fornecedor, PlanoContratacao, abrirContratos } from './blocos';

const soma = (rows: { valor: number }[]) => rows.reduce((total, row) => total + row.valor, 0);

/** Painel de Fiscalização, página 4: os contratos públicos técnicos, a ART de cada um, a situação do fornecedor na data do contrato e quem ganha os contratos. */
export default function PaginaContratos({ ctx }: { ctx: CockpitCtx }) {
  const { malha } = ctx, contratos = malha.contratos, comChave = malha.contratosComChave;
  const citada = comChave.filter(row => row.vinculo === 'Confirmado por documento'), semArt = comChave.filter(row => row.vinculo === 'Não identificado');
  const vazio = avisoVazio(!contratos.length, 'Nenhum contrato técnico');
  const semRegistro = contratos.filter(row => row.situacao === 'Sem registro na data');
  // Serviços gerais que o modelo treinado marca como engenharia: dado real, à parte do cenário dos outros cartões (07/11/2026).
  const triagem = useTriagem(ctx), rodada = triagemPncp.rodada;
  return <div className="ck-grid ck-grid-fs-contratos">
    <section className="ck-cards is-six" style={{ gridArea: 'kpi' }} aria-label="Indicadores dos contratos públicos">
      <Indicador destaque ficha="k-contratos" ctx={ctx} label="Contratos públicos técnicos" value={int(contratos.length)} sub={`${brl(soma(contratos))} contratados no período`}
        onOpen={() => abrirContratos(ctx, contratos, 'Contratos públicos técnicos do período')} />
      <Indicador ficha="k-citada" ctx={ctx} label="ART cita o contrato" value={comChave.length ? pct(citada.length / comChave.length * 100) : '—'} sub={`${int(citada.length)} de ${int(comChave.length)} contratos com CNPJ válido`}
        onOpen={() => abrirContratos(ctx, citada, 'Contratos com ART que cita o contrato')} />
      <Indicador ficha="k-semart" ctx={ctx} label="Nenhuma ART encontrada" value={int(semArt.length)} sub={`${brl(soma(semArt))}; prioridade para verificar, e não infração`}
        onOpen={() => abrirContratos(ctx, semArt, 'Contratos sem ART encontrada', 'Verifique primeiro os de maior valor. Não encontrar a ART não é infração.')} />
      <Indicador ficha="k-semregistro" ctx={ctx} label="Fornecedor sem registro na data" value={brl(soma(semRegistro))} sub={`em ${int(semRegistro.length)} contratos de ${int(new Set(semRegistro.map(row => row.companyId)).size)} empresas`}
        onOpen={() => abrirContratos(ctx, semRegistro, 'Contratos de fornecedor sem registro na data', 'Confirme o objeto e a atividade; informe o órgão contratante quando couber.')} />
      <Indicador ficha="k-triagem" ctx={ctx} label="Serviço geral de engenharia" serie={triagem.serie} value={rodada ? int(triagem.q.suspeitos) : '—'}
        sub={rodada ? <><Selo data={rodada} /> {int(triagem.q.semSinal)} sem sinal de rito</> : 'aguardando a primeira rodada do modelo'} />
      <Indicador ficha="k-pago" ctx={ctx} label="Já pago dos contratos" value={ctx.parcerias.tce.contratado ? pct(ctx.parcerias.tce.pago / ctx.parcerias.tce.contratado * 100) : '—'} sub={`${brl(ctx.parcerias.tce.pago)} pagos, segundo o Tribunal de Contas`} />
    </section>
    <Bloco ctx={ctx} id="mf8" vazio={vazio} area="mf8" title="Contratos técnicos e a ART encontrada" question="Os contratos técnicos do período, por categoria, pela ART encontrada: a ART cita o número do contrato, há uma ART provável a conferir, nenhuma ART foi encontrada ou o CNPJ não permite a busca." help="A ART é provável quando a mesma empresa registrou ART entre 30 dias antes e 60 dias depois do contrato. Quando nada aparece, o contrato deve ser verificado, mas isso não prova que falte ART. Clique numa parte para ver os contratos."><ContratosArt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mf7" vazio={vazio} area="mf7" title="Situação do fornecedor no dia do contrato" question="O valor dos contratos técnicos pela situação da empresa contratada na data de cada contrato: sem registro, registrada com anuidade vencida ou registrada e em dia." help="Sem anuidade em dia, a empresa não conseguiria a certidão de registro e quitação. A situação é a da data do contrato, e não a de hoje. Clique numa fatia para ver os contratos."><Fornecedor ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="sl" vazio={vazio} area="sl" title="Maiores contratos sem ART encontrada" question="Os contratos técnicos de maior valor em que nenhuma ART foi encontrada, com o objeto e a data." help="Verifique com o órgão contratante antes de qualquer notificação. A ART pode ter sido registrada com outro número. Clique num contrato para ver o detalhe."><ContratosSemArt ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="mp" vazio={avisoVazio(!ctx.mercado.concentracao.fornecedores.length, 'Nenhum contrato técnico')} area="mp" title="Quem ganha os contratos técnicos" question="Os dez fornecedores com a maior parte do valor dos contratos técnicos do período, com a parte e o valor escritos. Em laranja, quem estava sem registro na data de ao menos um contrato." help="Mercado concentrado não quer dizer favorecimento. Cada contrato conta uma vez, pela raiz do CNPJ do fornecedor. Clique numa barra para ver os contratos."><Concentracao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="pca" area="pca" title="O que os órgãos planejam contratar no estado" question="Os itens técnicos dos planos anuais de contratação publicados no PNCP, pela etapa em que estão: só planejados, com contratação publicada ou com contrato identificado." help="Plano de contratação é intenção, e não gasto garantido. As etapas não devem ser somadas. Serve para a fiscalização se antecipar às obras e serviços que vêm. Vale para o estado inteiro: os filtros do alto da tela não se aplicam a este bloco."><PlanoContratacao ctx={ctx} /></Bloco>
    <Bloco ctx={ctx} id="tc" vazio={avisoVazio(!ctx.parcerias.tce.contratado, 'Nenhum contrato no Tribunal de Contas')} area="tc" title="Quanto dos contratos já foi pago" question="Para os contratos técnicos do período encontrados no Tribunal de Contas, o valor contratado e o que já foi empenhado, liquidado e pago, segundo o Tribunal de Contas do Estado e o do Município." help="As quatro etapas são do mesmo gasto e não se somam. Pago menor que o contratado é execução em curso, e não irregularidade. Clique numa barra para ver os contratos."><EtapasTce ctx={ctx} /></Bloco>
  </div>;
}
