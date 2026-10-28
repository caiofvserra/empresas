import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowDownUp, ChevronLeft, ChevronRight, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { exportTransparencyCsv, selectTransparencyRows, transparencySource } from '../domain/transparency';
import type { TransparencyMode, TransparencyRow } from '../domain/transparency';
import rules from '../domain/transparency-rules-v8.json';
import ReportOverlay from '../components/ReportOverlay';
import { downloadCsv } from '../components/CompanyTable';
import './TransparencyReport.css';
const PAGE_SIZE = 4;

/** A private specification of reporting obligations, with no fabricated public results. */
export default function TransparencyReport({ canExport }: { canExport: boolean }) {
  const [mode, setMode] = useState<TransparencyMode>('indicators');
  const [search, setSearch] = useState('');
  const [program, setProgram] = useState('');
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TransparencyRow | null>(null);
  const [showRules, setShowRules] = useState(false);
  const rows = useMemo(() => selectTransparencyRows({ mode, search, program, mandatoryOnly, descending }), [mode, search, program, mandatoryOnly, descending]);
  const programs = useMemo(() => [...new Set(selectTransparencyRows({ mode }).map(row => row.program))].sort(), [mode]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const updateMode = (next: TransparencyMode) => { setMode(next); setProgram(''); setSearch(''); setPage(1); };
  const themes = rules.obligations.filter(row => row.obligationKind === 'regional_submission_for_federal_publication');
  return <div className="r8-transparency" data-report="transparency">
    <section className="r8-policy" data-panel="transparency-obligations" aria-label="Exigências verificadas de transparência">
      <header><span className="r8-eyebrow">BASE NORMATIVA VERIFICADA</span><h2>O que precisa ser divulgado?</h2><p>CREA-SP · informação institucional; nenhuma liberação pública realizada</p></header>
      <div className="r8-deadline"><strong>31 março</strong><span>RG regional: até o fim de março do exercício seguinte.</span><a href="https://pesquisa.apps.tcu.gov.br/redireciona/norma/NORMA-36629" target="_blank" rel="noreferrer" aria-label="Consultar DN TCU 216 de 2025">DN-TCU 216/2025 · art. 4º I <ExternalLink size={10}/></a></div>
      <div className="r8-deadline small"><strong>1º abril</strong><span>Envio da prestação de contas ao Confea. É outro prazo.</span></div>
      <h3>Dados regionais para o capítulo do Sistema</h3>
      <ul>{themes.map(row => <li key={row.id}>{row.title}</li>)}</ul>
      <p className="r8-policy-note">DN 216: quadros regionais em dados abertos, com retenção mínima de 5 anos. A marcação de um indicador na planilha não comprova, sozinha, sua obrigação pública individual.</p>
      <button type="button" className="r8-policy-link" onClick={() => setShowRules(true)}>Ver normas, alcance e exceções <ExternalLink size={12}/></button>
    </section>
    <section className="r8-catalog" data-panel="transparency-catalog" aria-label="Catálogo regional Confea e estado das fontes">
      <header><div><span className="r8-eyebrow">REGRA → FONTE → VALOR HOMOLOGADO</span><h2>Prestação de contas com origem rastreável</h2><p>42 indicadores CREA + 2 de dependência federal. Os 9 exclusivamente Confea ficam fora do recorte SP.</p></div><button type="button" disabled={!canExport || !rows.length} className="r8-export" aria-label="Exportar catálogo filtrado CSV" onClick={() => downloadCsv(exportTransparencyCsv(rows, canExport), `creasp-catalogo-${mode}.csv`)}><ArrowDownToLine size={14}/>Exportar catálogo</button></header>
      <div className="r8-catalog-tools"><div className="r8-catalog-modes" role="group" aria-label="Tipo de catálogo"><button className={mode === 'indicators' ? 'active' : ''} onClick={() => updateMode('indicators')}>Indicadores</button><button className={mode === 'data' ? 'active' : ''} onClick={() => updateMode('data')}>Dados solicitados</button></div><label className="r8-search"><Search size={13}/><input aria-label="Pesquisar catálogo Confea" placeholder="Código, indicador ou fórmula" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}/></label><select aria-label="Subprograma do catálogo" value={program} onChange={event => { setProgram(event.target.value); setPage(1); }}><option value="">Todos os subprogramas</option>{programs.map(value => <option key={value}>{value}</option>)}</select><label className="r8-catalog-check"><input type="checkbox" checked={mandatoryOnly} onChange={event => { setMandatoryOnly(event.target.checked); setPage(1); }}/>RG obrigatório</label></div>
      <div className="r8-catalog-table"><table><thead><tr><th><button aria-label="Ordenar código do catálogo" onClick={() => setDescending(value => !value)}>Código <ArrowDownUp size={11}/></button></th><th>Indicador / dado solicitado</th><th>Apresentação na planilha</th><th>Valor homologado</th></tr></thead><tbody>{visible.map(row => <tr key={row.id} data-catalog-id={row.id}><td>{row.code}</td><td><button className="r8-row-link" onClick={() => setSelected(row)}>{row.title}</button><small>{row.program} · {row.unit}{row.scope === 'mixed_requires_confea' ? ' · depende do Confea' : ''}</small>{row.reviewNotes.length > 0 && <span className="r8-review">Ressalva na fórmula ou interpretação</span>}</td><td><span className="r8-tag">{row.mandatoryReport ? 'RG obrigatório' : 'Orientação do catálogo'}</span><small>{row.workbookTcuMention ? 'Tema TCU mencionado na planilha' : 'Solicitação do Sistema'}</small></td><td><span className="r8-pending">Fonte não conectada</span><small>Sem valor atual atribuído</small></td></tr>)}</tbody></table>{!rows.length && <div className="r8-no-catalog" role="status">Nenhuma regra neste recorte. Ajuste a pesquisa ou o subprograma.</div>}</div>
      <footer><span data-catalog-count>{rows.length} regras · {visible.length ? (current - 1) * PAGE_SIZE + 1 : 0}–{Math.min(current * PAGE_SIZE, rows.length)}</span><div><button aria-label="Página anterior do catálogo" disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft size={14}/></button><span>{current} / {pageCount}</span><button aria-label="Próxima página do catálogo" disabled={current === pageCount} onClick={() => setPage(current + 1)}><ChevronRight size={14}/></button></div><span title={transparencySource.displayName}>Planilha enviada · células e fórmulas preservadas</span></footer>
      <div className="r8-publication-gate" data-panel="transparency-readiness"><ShieldCheck size={16}/><p><strong>Prévia privada para futura publicação.</strong> Valores dependem de views homologadas, competência, validação e autorização. A API da Portaria SEGECEX 10/2025 é inicialmente exigida apenas dos conselhos federais.</p></div>
    </section>
    {selected && <ReportOverlay title={`Indicador/dado ${selected.code} — ${selected.title}`} subtitle="Definição da planilha, fonte pendente e limites de interpretação" onClose={() => setSelected(null)}><div className="r8-rule-detail"><p className="p-notice">Fonte não conectada. Nenhum valor dos anexos foi tratado como dado atual ou como prova de cumprimento.</p><dl><dt>Conceito e corte</dt><dd>{selected.objective}</dd><dt>Fórmula / definição</dt><dd>{selected.formula}</dd><dt>Unidade</dt><dd>{selected.unit}</dd><dt>Origem da regra</dt><dd>{selected.evidence}</dd><dt>Campos necessários</dt><dd>{selected.dependencies.join(' · ') || 'View da entidade de origem, no grão e corte definidos.'}</dd><dt>Conexão prevista</dt><dd>SQL Server ou Db2 via gateway; tabela de prestação de contas anual homologada.</dd><dt>Observação original</dt><dd>{selected.notes || 'Sem observação adicional na linha da planilha.'}</dd></dl>{selected.reviewNotes.map(note => <p className="r8-rule-warning" key={note}>{note}</p>)}<p>Obrigatoriedade no Relatório de Gestão segundo o catálogo: {selected.mandatoryReport ? 'sim' : 'não indicada'}. Menção TCU não equivale a comprovação jurídica individual de publicação da fórmula.</p></div></ReportOverlay>}
    {showRules && <ReportOverlay title="Transparência — normas verificadas e alcance" subtitle="CREA-SP regional; nenhuma mudança de compartilhamento" onClose={() => setShowRules(false)}><div className="r8-rule-detail"><p className="p-notice">Relatório regional público: 31/03. Envio ao Confea: 01/04. Os temas de consolidação federal não autorizam divulgar microdados de triagem.</p>{rules.obligations.map(row => <article className="p-provenance" key={row.id}><h3>{row.title}</h3><p>{row.appliesTo === 'confea_national' ? 'Referência federal: não atribuída como obrigação atual do CREA-SP.' : row.obligationKind === 'regional_submission_for_federal_publication' ? 'Contribuição regional para publicação consolidada do Sistema.' : row.mandatoryForRegional ? 'Exigência aplicável ao regional, no alcance da norma.' : 'Diretriz de implementação; verificar homologação regional.'}</p><blockquote>{row.excerpt}</blockquote><a href={row.sourceUrl} target="_blank" rel="noreferrer">Fonte oficial · {row.section} ↗</a></article>)}<a href="/docs/TRANSPARENCIA_NORMAS_V8.md" target="_blank" rel="noreferrer">Ler levantamento normativo e limites de publicação ↗</a></div></ReportOverlay>}
  </div>;
}
