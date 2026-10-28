import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Database, Search, ShieldCheck, X } from 'lucide-react';
import { reportIndicators } from '../domain/report-indicators';
import { dataset } from '../domain/dataset';
import { buildProfessionalModel } from '../domain/professionals';
import sourceMetadata from '../domain/source-metadata.json';
import { automatedSourceCatalog } from '../integrations/catalog';

export interface AuditEntry { at: string; action: string; detail: string; role: string }

const sourceDocuments = [
  ['ANALISE_DOCUMENTOS_V8.md', 'Campos úteis dos BIs existentes e reconciliações'],
  ['DECISOES_INDICADORES_V8.md', 'Perguntas, decisões e fórmulas da visão executiva'],
  ['FISCALIZACAO_DIGITAL_V8.md', 'Cruzamentos digitais, regras e evidências'],
  ['PLANILHA_CONFEA_V8.md', 'Catálogo da planilha e ressalvas dos indicadores 35/53'],
  ['TRANSPARENCIA_NORMAS_V8.md', 'TCU/Confea: requisitos, prazos e limites de publicação'],
  ['ATUALIZACAO_AUTOMATICA_V7.md', 'Conexões, rotinas automáticas e requisitos de atualização'],
  ['POWER_BI.md', 'Arquitetura SQL Server e Db2 via gateway e análises de gestão'],
  ['SOURCES.md', 'Arquivos internos, geografia e hashes'],
  ['REFERENCIAS_DRIVE_V5.md', '22 painéis de referência do Drive'],
  ['REFERENCIAS_VISUAIS_V5.md', 'Referências atuais de visualização Power BI'],
  ['MODELO_DADOS.md', 'Entidades, grãos e relacionamentos'],
  ['DESIGN_POWER_BI.md', 'Composição do relatório e design system'],
  ['NORMAS.md', 'Normas CREA/Confea consultadas'],
];

export default function GovernanceModal({ initial, audit, onClose }: { initial: string; audit: AuditEntry[]; onClose: () => void }) {
  const [tab, setTab] = useState(initial === 'sources' || initial === 'governance' ? initial : 'dictionary');
  const [query, setQuery] = useState(initial && !['sources', 'governance'].includes(initial) ? reportIndicators.find(i => i.id === initial)?.name ?? '' : '');
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    host.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const elements = Array.from(host.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a,input,select,[tabindex="0"]') ?? []).filter(element => element.getClientRects().length);
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [onClose]);
  const shown = reportIndicators.filter(i => `${i.name} ${i.source} ${i.id} ${i.concept}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const metadata = {
    reportVersion: '9.0.0',
    internalDemonstration: { ...sourceMetadata, professionals: buildProfessionalModel(dataset).metadata },
    productionConnectionsConfigured: false,
    refreshSchedulingActive: false,
    sourceCatalog: automatedSourceCatalog,
  };
  return <div className="p-drawer-backdrop" onClick={onClose}>
    <div className="p-modal p-governance-modal" ref={host} role="dialog" aria-modal="true" aria-labelledby="gov-title" onClick={e => e.stopPropagation()}>
      <header className="p-modal-header">
        <div><span className="p-eyebrow">REGRAS · FONTES · GOVERNANÇA</span><h2 id="gov-title">Transparência da análise</h2></div>
        <button className="p-iconbutton" aria-label="Fechar transparência" onClick={onClose}><X size={20} /></button>
      </header>
      <nav className="p-domain-tabs" aria-label="Seções da transparência">
        {[
          ['dictionary', 'Dicionário de indicadores', BookOpen],
          ['sources', 'Fontes e processamento', Database],
          ['governance', 'Acesso e auditoria', ShieldCheck],
        ].map(([id, label, Icon]) => {
          const I = Icon as typeof BookOpen;
          return <button className={`p-subtab ${tab === id ? 'active' : ''}`} key={String(id)} onClick={() => { setTab(String(id)); setQuery(''); }}><I size={16} />{String(label)}</button>;
        })}
      </nav>
      <div className="p-modal-body">
        {tab === 'dictionary' && <>
          <label className="p-search"><Search size={16} /><input placeholder="Pesquisar indicador, conceito ou fonte" aria-label="Pesquisar dicionário de indicadores" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <p className="p-notice">As medidas ativas são derivadas de fatos relacionados no cenário demonstrativo. Dados reais só poderão ocupar esses visuais por banco de dados ou API com rotina de atualização, validação e histórico de execução. As fórmulas são propostas para homologação pelo CREA-SP; publicações transcritas manualmente não integram os indicadores.</p>
          <div className="p-dictionary">{shown.map(i => <article className="p-formula" key={i.id}>
            <h3>{i.name}</h3><p>{i.concept}</p>
            <dl><dt>Fórmula</dt><dd>{i.formula}</dd><dt>Unidade de contagem</dt><dd>{i.unit}</dd><dt>Fonte</dt><dd>{i.source}</dd><dt>Competência</dt><dd>{i.competence}</dd><dt>Periodicidade</dt><dd>{i.periodicity}</dd><dt>Limitações</dt><dd>{i.limitations}</dd><dt>Validação funcional</dt><dd>{i.owner}</dd><dt>Versão da regra</dt><dd>{i.ruleVersion}</dd></dl>
          </article>)}</div>
          {!shown.length && <div className="p-empty">Nenhum indicador corresponde à pesquisa.</div>}
        </>}
        {tab === 'sources' && <>
          <div className="p-notice"><Database size={20} /><div><strong>Produção prevista por banco ou API</strong><p>O protótipo demonstra indicadores com dados fictícios. Nenhum banco interno do CREA-SP foi conectado e nenhum agendamento institucional está ativo. Números extraídos manualmente de sites, relatórios ou PDFs foram retirados dos visuais e do dicionário ativo.</p></div></div>
          <div className="p-detail-grid">
            <div><span>Competência do cenário demonstrativo</span><strong>30 de setembro de 2026</strong></div>
            <div><span>Última carga do banco CREA-SP</span><strong>Não conectado</strong></div>
            <div><span>Execução automática institucional</span><strong>Não configurada</strong></div>
            <div><span>Versão e semente do cenário</span><strong>Base 1.0 · app v9 · {dataset.seed}</strong></div>
          </div>
          <div className="p-provenance">
            <h3>Fontes aptas à atualização</h3>
            <p>A conexão de cada fonte deve registrar origem, competência, início e fim da carga, resultado, volume processado e regra aplicada. Agenda proposta não equivale a rotina em execução. Uma falha ou ausência de conexão não será exibida como zero.</p>
          </div>
          <section className="p-provenance" aria-label="Situação das fontes automáticas"><h3>Conexões e agendas previstas</h3>{automatedSourceCatalog.map(source => <article className="p-record" key={source.id} data-source-id={source.id}><div className="p-record-head"><strong>{source.title}</strong><span>Não configurada</span></div><p>{source.schedule} · agenda prevista, sem execução ativa</p><small>Última carga válida: nenhuma. {source.missingRequirements.join(' · ')}</small><details><summary>Contrato e limitações da fonte</summary><p>{source.endpoint}</p><p>{source.limitations.join(' ')}</p></details></article>)}</section>
          <div className="p-provenance">
            <h3>Documentos examinados e dimensões de referência</h3><p><strong>BIs existentes e planilha Confea:</strong> os PDFs e prints revelam campos e questões de reconciliação. Seus valores não alimentam as medidas. A planilha define 53 indicadores e preserva fórmulas/células; o indicador 53 é participação do orçamento aprovado, e o 35 exige revisão do denominador. A página Transparência é prévia privada, com fontes não conectadas e normas verificadas.</p>
            <p><strong>Classificação CNAE:</strong> a planilha enviada pelo usuário orienta as regras de análise, preservando os rótulos originais. Em produção, a classificação deve ser mantida em tabela versionada e homologada; CNAE não define automaticamente obrigação de registro.</p>
            <p><strong>Estrutura CREA-SP:</strong> o organograma enviado define as áreas de referência. A cobertura territorial municipal e as responsabilidades funcionais precisam ser homologadas em dimensões institucionais; as associações da demonstração não equivalem ao cadastro real.</p>
            <p><strong>Geografia de São Paulo:</strong> códigos oficiais dos municípios permitem relacionar fontes no grão territorial. A malha serve à visualização; os fatos sobrepostos continuam demonstrativos até a conexão da fonte correspondente.</p>
            <p><strong>Cenário relacional:</strong> empresas, profissionais, vínculos, ARTs, CAOs, financeiro empresarial, evidências digitais, emprego e contratos são fictícios. Os dados agregados de emprego e formação não são atribuídos artificialmente a um CNPJ ou profissional.</p>
          </div>
          <h3>Regras para a carga de produção</h3>
          <ol className="p-processing">
            <li>Ler o banco ou API autorizado no grão de cada entidade, com filtros territoriais de São Paulo e parâmetros de competência.</li>
            <li>Preservar chaves de origem e histórico; conciliar identificadores antes de calcular relações entre empresas e profissionais.</li>
            <li>Validar integridade, duplicidades, totais e denominadores antes de promover a carga para o modelo analítico.</li>
            <li>Registrar sucesso real somente após a conclusão da carga. Manter a competência dos fatos separada do horário de execução.</li>
            <li>Recalcular os indicadores e atualizar o modelo Power BI com restrições de acesso e exportação.</li>
          </ol>
          <div className="p-doclinks">{sourceDocuments.map(([file, label]) => <a key={file} href={`/docs/${file}`} target="_blank" rel="noreferrer">{label} <ArrowUpRight size={14} /></a>)}</div>
          <details><summary>Metadados da demonstração e dimensões de referência</summary><pre className="p-source-json">{JSON.stringify(metadata, null, 2)}</pre></details>
        </>}
        {tab === 'governance' && <>
          <div className="p-notice"><ShieldCheck size={20} /><div><strong>Acesso privado real · perfis demonstrativos</strong><p>A hospedagem exige acesso autorizado do proprietário. A troca de perfis apenas demonstra permissões e recortes: não constitui autenticação, RLS ou proteção de dados no navegador. Os fatos apresentados nesta demonstração são fictícios. A arquitetura de produção prevê cargas autorizadas por banco ou API, com registro de origem e competência. Produção exige autorização no servidor ou Power BI, RLS validada e controle das exportações.</p></div></div>
          <div className="p-detail-grid">
            <div><span>Administração · demo</span><strong>Universo completo, financeiro e exportação</strong></div>
            <div><span>Analista GRE2 · demo</span><strong>Recorte regional; sem financeiro</strong></div>
            <div><span>Consulta · demo</span><strong>Análise sem financeiro nem exportação</strong></div>
            <div><span>Versionamento das regras</span><strong>App v9 · regras e contratos de carga versionados</strong></div>
          </div>
          <h3>Auditoria local desta demonstração</h3>
          <p className="p-source">Registra interações no navegador. Não é um log institucional inviolável e pode ser removido pelo usuário. Competências dos dados e datas de extração permanecem separadas dos horários de interação.</p>
          <div className="p-audit">{audit.length ? audit.slice().reverse().map((entry, index) => <article key={index}><strong>{entry.action}</strong><span>{new Date(entry.at).toLocaleString('pt-BR')} · {entry.role}</span><p>{entry.detail}</p></article>) : <p className="p-empty">Nenhuma interação registrada nesta sessão.</p>}</div>
          <h3>Regras de interpretação</h3>
          <ul>
            <li>CNAE e ausência de correspondência não determinam automaticamente obrigação de registro.</li>
            <li>O histórico de fiscalização e a pontuação demonstrativa apoiam leitura analítica e validação humana; não afirmam irregularidade.</li>
            <li>Auto, defesa e decisão são eventos processuais distintos; o relatório não executa tratativas ou aplica penalidades.</li>
            <li>CAT pertence ao profissional; CAO refere-se à pessoa jurídica. Título profissional, pessoa, vínculo RT e autoria ART são unidades distintas.</li>
            <li>QSA confirmado não equivale a RT ou emprego. Correspondência aproximada permanece sugestão, sem mesclagem automática.</li>
            <li>Emprego e remuneração públicos permanecem no grão territorial/atividade/ocupação disponível; não são atribuídos a CNPJs ou pessoas fictícias.</li>
            <li>Conclusões de curso, diplomados, profissionais registrados e ocupados têm recortes e períodos próprios; comparações não demonstram conversão individual.</li>
            <li>Cargas reais e fatos sintéticos devem permanecer separados. Fontes agregadas só recebem filtros compatíveis com sua granularidade.</li>
            <li>A classificação textual é determinística e demonstrativa, sem modelo de IA treinado. Regras e limitações estão no dicionário.</li>
          </ul>
        </>}
      </div>
    </div>
  </div>;
}
