import catalog from './cnae-catalog.json';
import type {
  Art, Buyer, Cao, Cbo, City, Cnae, Company, Contract, Dataset, EmploymentFact,
  Establishment, Gre, InspectionCase, Invoice, Movement, MovementType, Professional,
  PublicRow, QualityEvent, QualityKind, Registration, RegistrationStatus, TechnicalLink,
} from './types';

/** Dados sintéticos; o catálogo CNAE e os nomes das 14 GREs provêm dos anexos. */
export const datasetNotes = {
  nature: 'Empresas, CNPJs, vínculos, registros, valores, certidões e ocorrências são fictícios.',
  greSource: 'Organograma CREA-SP, março/2026, páginas 12–19: nomes e numeração das 14 GREs.',
  territorialMapping: 'A atribuição de municípios às GREs é demonstrativa. O organograma não documenta a cobertura territorial completa.',
  employment: 'Emprego público demonstrativo agregado por município, CNAE, CBO e mês; sem identificação de trabalhador ou empregador.',
  sourceQuality: 'Linhas inválidas e duplicadas ficam apenas na origem pública simulada, com eventos de qualidade; o cadastro mestre mantém CNPJs válidos e únicos.',
};

const SNAPSHOT = '2026-09-30';
const DAY = 86400000;
const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
const dateString = (value: number) => new Date(value).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => dateString(timestamp(date) + days * DAY);
const later = (...dates: string[]) => dates.reduce((a, b) => a > b ? a : b);
const earlier = (...dates: string[]) => dates.reduce((a, b) => a < b ? a : b);
const id = (prefix: string, index: number, length = 5) => `${prefix}${String(index + 1).padStart(length, '0')}`;

export const sampleCnaeCodes = [
  '7112-0/00', '4120-4/00', '4321-5/00', '4399-1/03', '7120-1/00', '4221-9/02',
  '4211-1/01', '4299-5/99', '4322-3/01', '3314-7/10', '7119-7/03', '7739-0/02',
];

function checkDigits(base: string): string {
  const calculate = (digits: string, weights: number[]) => {
    const remainder = [...digits].reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0) % 11;
    return remainder < 2 ? '0' : String(11 - remainder);
  };
  const first = calculate(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first + calculate(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}

/** Toda aleatoriedade é local à chamada e usa exclusivamente esta semente. */
export function generateDataset(seed = 20260930): Dataset {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const pick = <T,>(items: readonly T[]): T => items[integer(0, items.length - 1)];
  const between = (first: string, last: string) => {
    const begin = timestamp(first);
    const end = Math.max(begin, timestamp(last));
    return dateString(begin + integer(0, Math.floor((end - begin) / DAY)) * DAY);
  };

  const months = Array.from({ length: 36 }, (_, index) => {
    const value = new Date(Date.UTC(2023, 9 + index, 1));
    return value.toISOString().slice(0, 7);
  });
  const greNames = ['Araçatuba', 'Campinas', 'Ribeirão Preto', 'Piracicaba', 'Capital',
    'São José dos Campos', 'Santos', 'Bauru', 'São José do Rio Preto', 'Araraquara',
    'Sorocaba', 'Mogi Guaçu', 'Guarulhos', 'Santo André'];
  const gres: Gre[] = greNames.map((name, index) => ({ id: `GRE${index + 1}`, name: `GRE${index + 1} · ${name}` }));
  const citySeeds: [string, string, number, number, number][] = [
    ['Araçatuba', '3502804', 1, 140, 85], ['Campinas', '3509502', 2, 355, 195],
    ['Ribeirão Preto', '3543402', 3, 320, 100], ['Piracicaba', '3538709', 4, 315, 179],
    ['São Paulo', '3550308', 5, 425, 235], ['São José dos Campos', '3549904', 6, 470, 205],
    ['Santos', '3548500', 7, 455, 280], ['Bauru', '3506003', 8, 245, 175],
    ['São José do Rio Preto', '3549805', 9, 235, 80], ['Araraquara', '3503208', 10, 290, 137],
    ['Sorocaba', '3552205', 11, 330, 235], ['Mogi Guaçu', '3530706', 12, 367, 145],
    ['Guarulhos', '3518800', 13, 438, 221], ['Santo André', '3547809', 14, 439, 246],
    ['Osasco', '3534401', 5, 408, 229], ['Jundiaí', '3525904', 2, 386, 210],
    ['Taubaté', '3554102', 6, 500, 190], ['Praia Grande', '3541000', 7, 435, 288],
    ['Limeira', '3526902', 4, 332, 163], ['Presidente Prudente', '3541406', 1, 100, 185],
    ['São Carlos', '3548906', 10, 300, 153], ['Franca', '3516200', 3, 355, 70],
    ['Barueri', '3505708', 5, 392, 232], ['Botucatu', '3507506', 11, 270, 219],
  ];
  const cities: City[] = citySeeds.map(([name, ibgeCode, gre, x, y]) => ({
    id: ibgeCode, name, ibgeCode, greId: `GRE${gre}`, x, y,
  }));
  const cbos: Cbo[] = [
    { code: '2142-05', label: 'Engenheiro civil', technical: true },
    { code: '2143-05', label: 'Engenheiro eletricista', technical: true },
    { code: '2144-05', label: 'Engenheiro mecânico', technical: true },
    { code: '3121-05', label: 'Técnico em construção civil', technical: true },
    { code: 'Outras', label: 'Demais ocupações', technical: false },
  ];
  // Cópia integral do catálogo, incluindo a grafia da classificação e todas as colunas.
  const cnaes = catalog.map(row => ({ ...row, fields: { ...row.fields } })) as Cnae[];
  const names = ['Vértice', 'Nexo', 'Horizonte', 'Prisma', 'Ápice', 'Orbe', 'Trama', 'Eixo', 'Pórtico', 'Vetor'];
  const sectors = ['Engenharia', 'Construções', 'Sistemas Elétricos', 'Obras', 'Análises Técnicas',
    'Redes de Energia', 'Infraestrutura', 'Projetos', 'Instalações', 'Manutenção', 'Desenho Técnico', 'Equipamentos'];
  const sizes: Company['size'][] = ['Microempresa', 'Pequena empresa', 'Média empresa', 'Grande empresa'];
  const companies: Company[] = Array.from({ length: 3000 }, (_, index) => ({
    id: id('EMP-', index), rootCnpj: `98${String(index + 1).padStart(6, '0')}`,
    name: `${names[index % names.length]} ${sectors[index % 12]} ${String(index + 1).padStart(4, '0')} Ltda.`,
    tradeName: `${names[index % names.length]} ${String(index + 1).padStart(4, '0')}`,
    size: sizes[random() < .46 ? 0 : random() < .68 ? 1 : random() < .85 ? 2 : 3],
    legalNature: index % 9 === 0 ? 'Empresário individual' : 'Sociedade empresária limitada',
    externalOnly: index % 7 === 0,
  }));
  const establishments: Establishment[] = [];
  const establishmentsPerCompany = new Map<string, Establishment[]>();
  const cityWeighted = cities.flatMap(city => Array.from({ length: city.name === 'São Paulo' ? 12
    : city.name === 'Campinas' ? 6 : ['Ribeirão Preto', 'Sorocaba', 'São José dos Campos'].includes(city.name) ? 3 : 1 }, () => city));
  for (let index = 0; index < 3600; index++) {
    const branch = index >= 3000;
    const company = companies[branch ? ((index - 3000) * 37 + 17) % 3000 : index];
    const city = pick(cityWeighted);
    const parent = establishmentsPerCompany.get(company.id)?.[0];
    const openedAt = branch
      ? earlier(addDays(parent!.openedAt, integer(100, 720)), '2026-03-01')
      : index % 5 === 0 ? between('2023-10-01', '2025-12-01') : between('2012-01-01', '2023-09-01');
    const cnaeMain = sampleCnaeCodes[(index + integer(0, 3)) % sampleCnaeCodes.length];
    const secondary = [sampleCnaeCodes[(index + 5) % 12], sampleCnaeCodes[(index + 8) % 12]].filter(code => code !== cnaeMain);
    const cnpjBase = `${company.rootCnpj}${branch ? '0002' : '0001'}`;
    const statusRoll = random();
    const establishment: Establishment = {
      id: id('EST-', index), companyId: company.id, cnpj: cnpjBase + checkDigits(cnpjBase),
      branch: branch ? 'Filial' : 'Matriz', cityId: city.id, greId: city.greId,
      cnaeMain, cnaeSecondary: [...new Set(secondary)], openedAt,
      rfbStatus: statusRoll < .085 ? 'Baixada' : statusRoll < .115 ? 'Suspensa' : statusRoll < .14 ? 'Inapta' : 'Ativa',
      creaCityId: index % 29 === 0 ? cities[(cities.indexOf(city) + 1) % cities.length].id : city.id,
      updatedAt: SNAPSHOT,
    };
    establishments.push(establishment);
    establishmentsPerCompany.set(company.id, [...(establishmentsPerCompany.get(company.id) ?? []), establishment]);
  }

  const eligibleEstablishments = establishments.filter(establishment => !companies[Number(establishment.companyId.slice(4)) - 1].externalOnly);
  const historicalCount = 4500 - eligibleEstablishments.length;
  const historicalIds = new Set(eligibleEstablishments.filter(row => row.openedAt < '2024-01-01')
    .sort((a, b) => a.openedAt.localeCompare(b.openedAt)).slice(0, historicalCount).map(row => row.id));
  if (historicalIds.size !== historicalCount) throw new Error('A amostra precisa de estabelecimentos antigos suficientes para registros históricos.');
  const registrations: Registration[] = [];
  const movements: Movement[] = [];
  const activeIntervals = new Map<string, { start: string; end: string }[]>();
  const registrationsPerCompany = new Map<string, Registration[]>();
  function createRegistration(establishment: Establishment, start: string, events: { type: MovementType; date: string }[], historic: boolean) {
    const registrationId = id('REG-', registrations.length);
    const finalEvent = events[events.length - 1];
    const status: RegistrationStatus = finalEvent.type === 'Baixa' ? 'Inativo' : finalEvent.type === 'Cancelamento' ? 'Cancelado' : 'Ativo';
    const registration: Registration = {
      id: registrationId, companyId: establishment.companyId, establishmentId: establishment.id,
      type: registrations.length % 8 === 0 ? 'Visto' : 'Registro', status,
      requestedAt: later(establishment.openedAt, addDays(start, -integer(3, 25))), startedAt: start,
      ...(status === 'Ativo' ? {} : { ceasedAt: finalEvent.date }),
    };
    registrations.push(registration);
    registrationsPerCompany.set(registration.companyId, [...(registrationsPerCompany.get(registration.companyId) ?? []), registration]);
    for (const event of events) movements.push({
      id: id('MOV-', movements.length), registrationId, companyId: registration.companyId,
      establishmentId: establishment.id, type: event.type, date: event.date,
    });
    const intervals: { start: string; end: string }[] = [];
    let activeStart: string | undefined;
    for (const event of events) {
      if (event.type === 'Novo registro' || event.type === 'Reativação') activeStart = event.date;
      else if (activeStart) { intervals.push({ start: activeStart, end: addDays(event.date, -1) }); activeStart = undefined; }
    }
    if (activeStart) intervals.push({ start: activeStart, end: SNAPSHOT });
    activeIntervals.set(registrationId, intervals);
    return historic ? registration.ceasedAt! : registration.startedAt;
  }
  eligibleEstablishments.forEach((establishment, index) => {
    let predecessorCeased: string | undefined;
    if (historicalIds.has(establishment.id)) {
      const start = between(later(addDays(establishment.openedAt, 15), '2020-01-01'), '2023-08-01');
      const end = between(later(addDays(start, 180), '2023-10-01'), '2024-08-01');
      predecessorCeased = createRegistration(establishment, start, [{ type: 'Novo registro', date: start },
        { type: index % 4 === 0 ? 'Baixa' : 'Cancelamento', date: end }], true);
    }
    const minimum = later(addDays(establishment.openedAt, 20), predecessorCeased ? addDays(predecessorCeased, 30) : '2021-01-01');
    const start = between(minimum, '2026-06-30');
    const available = Math.floor((timestamp(SNAPSHOT) - timestamp(start)) / DAY);
    const dayAt = (fraction: number) => addDays(start, Math.floor(available * fraction));
    const events: { type: MovementType; date: string }[] = [{ type: 'Novo registro', date: start }];
    switch (index % 10) {
      case 0: events.push({ type: 'Cancelamento', date: dayAt(.7) }); break;
      case 1: events.push({ type: 'Baixa', date: dayAt(.72) }); break;
      case 2: events.push({ type: 'Baixa', date: dayAt(.4) }, { type: 'Reativação', date: dayAt(.68) }); break;
      case 3: events.push({ type: 'Baixa', date: dayAt(.35) }, { type: 'Reativação', date: dayAt(.6) }, { type: 'Cancelamento', date: dayAt(.87) }); break;
      default: break;
    }
    createRegistration(establishment, start, events, false);
  });

  const firstNames = ['Ana', 'Bruno', 'Camila', 'Daniel', 'Elisa', 'Felipe', 'Gabriela', 'Hugo', 'Isabela', 'João'];
  const lastNames = ['Almeida', 'Barros', 'Costa', 'Duarte', 'Esteves', 'Ferraz', 'Gomes', 'Lima', 'Moraes', 'Nunes'];
  const modalities = ['Civil', 'Elétrica', 'Mecânica', 'Agronomia', 'Segurança do trabalho'];
  const professionals: Professional[] = Array.from({ length: 600 }, (_, index) => ({
    id: id('PRO-', index), name: `${firstNames[index % 10]} ${lastNames[Math.floor(index / 10) % 10]} ${String(index + 1).padStart(3, '0')}`,
    registration: `DEMO-SP-${String(index + 1).padStart(6, '0')}`, modality: modalities[index % modalities.length],
  }));
  const registeredCompanies = companies.filter(company => !company.externalOnly);
  const technicalLinks: TechnicalLink[] = Array.from({ length: 1500 }, (_, index) => {
    const company = registeredCompanies[(Math.floor(index / 2) * 31) % registeredCompanies.length];
    const professional = professionals[(index * 13 + Math.floor(index / 2)) % professionals.length];
    const firstRegistration = registrationsPerCompany.get(company.id)!.reduce((a, b) => a.startedAt < b.startedAt ? a : b);
    const startDate = between(firstRegistration.startedAt, '2026-05-31');
    const ended = index % 2 === 0 || index % 11 === 0;
    return { id: id('VRT-', index), companyId: company.id, professionalId: professional.id,
      startDate, modality: professional.modality,
      ...(ended ? { endDate: between(addDays(startDate, 15), SNAPSHOT) } : {}),
    };
  });
  // Ajuste determinístico dos pares, depois de consumir o mesmo fluxo aleatório:
  // algumas empresas têm RTS simultâneos em modalidades distintas; outras
  // preservam uma troca cronológica, com encerramento antes do novo vínculo.
  // Nenhuma nova chamada ao PRNG altera ARTs ou as demais entidades aprovadas.
  for (let pair = 0; pair < technicalLinks.length / 2; pair++) {
    const previous = technicalLinks[pair * 2];
    const successor = technicalLinks[pair * 2 + 1];
    if (pair % 5 === 0) {
      delete previous.endDate;
      delete successor.endDate;
      successor.startDate = later(addDays(previous.startDate, 7), successor.startDate);
    } else {
      const availableDays = Math.floor((timestamp(SNAPSHOT) - timestamp(previous.startDate)) / DAY);
      const transitionAfter = Math.min(180, Math.max(30, Math.floor(availableDays * .55)));
      previous.endDate = addDays(previous.startDate, transitionAfter);
      successor.startDate = addDays(previous.endDate, 1);
      if (pair % 7 === 0) {
        const remainingDays = Math.floor((timestamp(SNAPSHOT) - timestamp(successor.startDate)) / DAY);
        successor.endDate = addDays(successor.startDate, Math.max(15, Math.floor(remainingDays * .6)));
      } else delete successor.endDate;
    }
  }
  const descriptions = ['Projeto de infraestrutura urbana', 'Execução de obra civil', 'Instalação elétrica',
    'Manutenção de redes e sistemas', 'Laudo técnico e avaliação', 'Ensaios de materiais', 'Supervisão de obra', 'Projeto de saneamento'];
  const arts: Art[] = Array.from({ length: 7000 }, (_, index) => {
    const registration = registrations[(index * 37) % registrations.length];
    const interval = pick(activeIntervals.get(registration.id)!);
    const date = between(interval.start, interval.end);
    const completed = index % 4 !== 0;
    return { id: id('ART-DEMO-', index), companyId: registration.companyId, registrationId: registration.id,
      date, description: descriptions[index % descriptions.length], value: integer(20, 2500) * 1000,
      status: completed ? 'Baixada' : 'Registrada', modality: modalities[index % modalities.length],
      ...(completed ? { endDate: earlier(addDays(date, integer(20, 240)), SNAPSHOT) } : {}),
    };
  });
  const artsPerCompany = new Map<string, Art[]>();
  for (const art of arts) artsPerCompany.set(art.companyId, [...(artsPerCompany.get(art.companyId) ?? []), art]);
  const caoCompanies = registeredCompanies.filter(company => artsPerCompany.get(company.id)?.some(art => art.status === 'Baixada' && art.endDate! < '2026-09-15'));
  const caoStatuses: Cao['status'][] = ['Emitida', 'Emitida', 'Emitida', 'Emitida', 'Emitida', 'Emitida', 'Revogada', 'Em análise', 'Pendente', 'Solicitada'];
  const caos: Cao[] = Array.from({ length: 800 }, (_, index) => {
    const company = caoCompanies[(index * 17) % caoCompanies.length];
    const status = caoStatuses[index % 10];
    const completed = status === 'Emitida' || status === 'Revogada';
    const availableArts = artsPerCompany.get(company.id)!.filter(art => !completed || (art.status === 'Baixada' && art.endDate! < '2026-09-15'));
    const covered = availableArts.slice(0, 1 + index % 3);
    const latestEnd = completed ? covered.reduce((latest, art) => later(latest, art.endDate!), covered[0].endDate!) : covered[0].date;
    const requestedAt = completed ? addDays(latestEnd, 1) : between(later(covered[0].date, '2025-10-01'), SNAPSHOT);
    const issuedAt = completed ? between(addDays(requestedAt, 1), SNAPSHOT) : undefined;
    return { id: id('CAO-DEMO-', index), companyId: company.id, requestedAt, status,
      ...(issuedAt ? { issuedAt } : {}), artIds: covered.map(art => art.id), activity: [...new Set(covered.map(art => art.description))].join(' · '),
    };
  });

  const invoices: Invoice[] = Array.from({ length: 3500 }, (_, index) => {
    const registration = registrations[(index * 29) % registrations.length];
    const interval = activeIntervals.get(registration.id)![0];
    const future = index % 19 === 0;
    const dueDate = future ? between('2026-10-01', '2026-12-20')
      : between(later(interval.start, '2023-10-01'), later(later(interval.start, '2023-10-01'), earlier(interval.end, '2026-08-31')));
    const amount = integer(12, 95) * 25;
    const mode = index % 10;
    const paidAmount = future || mode >= 7 ? 0 : mode === 6 ? Math.round(amount * .4 * 100) / 100 : amount;
    const recovered = paidAmount > 0 && mode <= 1;
    const paymentDate = paidAmount === 0 ? undefined
      : recovered ? between(addDays(dueDate, 15), SNAPSHOT)
        : between(later(interval.start, addDays(dueDate, -20)), earlier(addDays(dueDate, 15), SNAPSHOT));
    return { id: id('FIN-', index), companyId: registration.companyId, registrationId: registration.id,
      dueDate, amount, paidAmount, ...(paymentDate ? { paymentDate } : {}),
      installmentPlan: index % 7 === 0, recovered,
    };
  });
  const buyers: Buyer[] = [
    ...cities.map(city => ({ id: `ORG-${city.id}`, name: `Administração municipal de ${city.name} (simulação)`, sphere: 'Municipal' })),
    ...Array.from({ length: 6 }, (_, index) => ({ id: id('ORG-EST-', index), name: `Órgão estadual demonstrativo ${index + 1}`, sphere: 'Estadual' })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: id('ORG-FED-', index), name: `Órgão federal demonstrativo ${index + 1}`, sphere: 'Federal' })),
  ];
  const contractTemplates = [
    { object: 'Elaboração de projeto de infraestrutura e saneamento', category: 'Serviços técnicos' },
    { object: 'Execução de obra de construção de unidade escolar', category: 'Obras' },
    { object: 'Manutenção de redes e instalações elétricas', category: 'Manutenção' },
    { object: 'Ensaios e avaliação de sistemas mecânicos', category: 'Serviços técnicos' },
    { object: 'Fornecimento de materiais de escritório', category: 'Fornecimento' },
    { object: 'Consultoria administrativa e apoio à gestão', category: 'Consultoria' },
    { object: 'Serviços de operação e manutenção', category: 'Objeto ambíguo' },
  ];
  const contracts: Contract[] = Array.from({ length: 1200 }, (_, index) => {
    const company = companies[(index * 37 + 11) % companies.length];
    const establishment = pick(establishmentsPerCompany.get(company.id)!);
    return { id: id('PNCP-DEMO-', index), companyId: company.id, establishmentId: establishment.id,
      buyerId: pick(buyers).id, date: between(later(establishment.openedAt, '2023-10-01'), SNAPSHOT),
      ...contractTemplates[index % contractTemplates.length], value: integer(25, 7000) * 1000,
    };
  });
  const caseStatuses: InspectionCase['status'][] = ['Identificada', 'Validação cadastral', 'Análise técnica', 'Encaminhada', 'Concluída'];
  const notes = ['Sinal cadastral identificado; enquadramento ainda não verificado.', 'Informações de origem e cadastro em conferência.',
    'Atividades e documentação submetidas à análise técnica.', 'Encaminhamento registrado para unidade responsável.', 'Tratamento finalizado com conclusão documentada.'];
  const cases: InspectionCase[] = Array.from({ length: 900 }, (_, index) => {
    const establishment = establishments[(index * 43 + 7) % establishments.length];
    const createdAt = between(later(establishment.openedAt, '2023-10-01'), '2026-08-01');
    const finalIndex = index % caseStatuses.length;
    const duration = Math.floor((timestamp(SNAPSHOT) - timestamp(createdAt)) / DAY);
    const history = caseStatuses.slice(0, finalIndex + 1).map((status, step) => ({
      date: addDays(createdAt, Math.floor(duration * step / 6)), status, note: notes[step],
    }));
    const status = caseStatuses[finalIndex];
    const noticeStages: NonNullable<InspectionCase['notice']>['stage'][] = ['Notificação', 'Auto de infração', 'Defesa', 'Decisão', 'Arquivado'];
    return { id: id('CASO-', index), companyId: establishment.companyId, establishmentId: establishment.id,
      createdAt, status, history,
      ...(status === 'Concluída' ? { completedAt: history[history.length - 1].date } : {}),
      outcome: status === 'Concluída' ? index % 2 === 0 ? 'Cadastro atualizado após validação' : 'Tratamento encerrado; sem ação adicional'
        : 'Enquadramento pendente de validação; sinal não constitui conclusão de irregularidade',
      ...(finalIndex >= 3 && index % 3 === 0 ? { notice: {
        id: id('PROC-DEMO-', index), date: history[3].date, stage: noticeStages[Math.floor(index / 3) % noticeStages.length],
      } } : {}),
    };
  });

  // Cubo de emprego simulado independente de empresas: 24 municípios × 12 CNAEs × 5 CBOs × 36 meses.
  const employment: EmploymentFact[] = [];
  for (const [cityIndex, city] of cities.entries()) {
    for (const [cnaeIndex, cnae] of sampleCnaeCodes.entries()) {
      for (const [cboIndex, cbo] of cbos.entries()) {
        let stock = integer(12, cbo.technical ? 140 : 650) * (city.name === 'São Paulo' ? 4 : city.name === 'Campinas' ? 2 : 1);
        for (const [monthIndex, month] of months.entries()) {
          const growth = cityIndex % 5 === 0 || cnaeIndex % 4 === 0 ? .042 : .027;
          const admissions = integer(0, Math.max(1, Math.ceil(stock * growth))) + (monthIndex % 12 === 2 ? 2 : 0);
          const dismissals = Math.min(stock + admissions, integer(0, Math.max(1, Math.ceil(stock * .026))));
          stock += admissions - dismissals;
          employment.push({ id: `EMPREG-${city.id}-${cnaeIndex}-${cboIndex}-${month}`, month,
            cityId: city.id, cnae, cbo: cbo.code, stock, admissions, dismissals });
        }
      }
    }
  }

  const qualityEvents: QualityEvent[] = [];
  const publicRows: PublicRow[] = establishments.map((establishment, index) => ({
    id: id('RFB-SIM-', index), establishmentId: establishment.id, cnpj: establishment.cnpj,
    companyName: companies[Number(establishment.companyId.slice(4)) - 1].name,
    cityId: establishment.cityId, cnae: index % 71 === 0 ? '' : establishment.cnaeMain,
    updatedAt: index % 67 === 0 ? '2024-06-30' : SNAPSHOT,
  }));
  const addQuality = (establishment: Establishment, type: QualityKind, source: string, evidence: string, resolved = false) => {
    qualityEvents.push({ id: id('QUAL-', qualityEvents.length), establishmentId: establishment.id,
      companyId: establishment.companyId, type, date: '2026-09-30', resolved, source, evidence });
  };
  for (const [index, establishment] of establishments.entries()) {
    if (index % 71 === 0) addQuality(establishment, 'Sem CNAE', 'Receita Federal · staging simulado', 'Linha pública sem atividade principal; cadastro mestre preservado.');
    if (establishment.creaCityId !== establishment.cityId) addQuality(establishment, 'Município divergente', 'Confronto cadastral demonstrativo', `Município CREA ${establishment.creaCityId} difere da origem pública ${establishment.cityId}.`);
    if (index % 83 === 0) addQuality(establishment, 'GRE não identificada', 'Distribuição territorial · staging simulado', 'Origem territorial sem identificador GRE; vínculo mestre demonstrativo atribuído para navegação.');
    if (index % 67 === 0) addQuality(establishment, 'Dados desatualizados', 'Receita Federal · staging simulado', 'Linha da origem pública com atualização em 2024-06-30.');
    if (index % 53 === 0) addQuality(establishment, 'CNAE alterado', 'Receita Federal · histórico simulado', `CNAE anterior ${sampleCnaeCodes[(index + 1) % 12]}; CNAE mestre atual ${establishment.cnaeMain}.`, index % 2 === 0);
    if (establishment.rfbStatus === 'Baixada' && registrations.some(reg => reg.establishmentId === establishment.id && reg.status === 'Ativo')) {
      addQuality(establishment, 'CREA ativo / CNPJ baixado', 'Confronto cadastral demonstrativo', 'Registro ativo no snapshot e estabelecimento baixado na situação RFB simulada; requer verificação.');
    }
  }
  for (let index = 0; index < 120; index++) {
    const establishment = establishments[index * 23 % establishments.length];
    const original = publicRows.find(row => row.establishmentId === establishment.id)!;
    publicRows.push({ ...original, id: id('RFB-DUP-SIM-', index) });
    addQuality(establishment, 'CNPJ duplicado na origem', 'Receita Federal · staging simulado', 'Duas linhas de origem para o mesmo CNPJ; estabelecimento mestre único.');
  }
  for (let index = 0; index < 60; index++) {
    const establishment = establishments[(index * 47 + 9) % establishments.length];
    const original = publicRows.find(row => row.establishmentId === establishment.id)!;
    publicRows.push({ ...original, id: id('RFB-INVALID-SIM-', index), cnpj: `${establishment.cnpj.slice(0, 13)}X` });
    addQuality(establishment, 'CNPJ inválido', 'Receita Federal · staging simulado', 'Linha de origem contém caractere não numérico no CNPJ; excluída da identidade canônica.');
  }
  return { companies, establishments, registrations, movements, professionals, technicalLinks,
    arts, caos, invoices, cases, buyers, contracts, employment, qualityEvents, publicRows,
    cities, gres, cnaes, cbos, months, snapshotDate: SNAPSHOT, updatedAt: SNAPSHOT, seed };
}

export const dataset = generateDataset();
export const companyById = new Map(dataset.companies.map(row => [row.id, row]));
export const establishmentById = new Map(dataset.establishments.map(row => [row.id, row]));
export const cityById = new Map(dataset.cities.map(row => [row.id, row]));
export const greById = new Map(dataset.gres.map(row => [row.id, row]));
export const cnaeByCode = new Map(dataset.cnaes.map(row => [row.code, row]));
export const professionalById = new Map(dataset.professionals.map(row => [row.id, row]));
