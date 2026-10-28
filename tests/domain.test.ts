import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { dataset, generateDataset } from '../src/domain/dataset';
import type { Dataset, MovementType, RegistrationStatus } from '../src/domain/types';

const d = dataset;
const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map(row => [row.id, row]));
const companies = byId(d.companies);
const establishments = byId(d.establishments);
const registrations = byId(d.registrations);
const professionals = byId(d.professionals);
const arts = byId(d.arts);
const cities = byId(d.cities);
const gres = byId(d.gres);
const buyers = byId(d.buyers);
const cnaeCodes = new Set(d.cnaes.map(row => row.code));
const cboCodes = new Set(d.cbos.map(row => row.code));

function validCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const digits = [...cnpj].map(Number);
  const calculate = (length: number) => {
    let weight = length === 12 ? 5 : 6;
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += digits[index] * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === digits[12] && calculate(13) === digits[13];
}

function date(value: string, label: string): void {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, label);
  assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value, label);
}

test('normalized sample has the specified scale and unique entity keys', () => {
  const counts: Partial<Record<keyof Dataset, number>> = {
    companies: 3000, establishments: 3600, registrations: 4500,
    professionals: 600, technicalLinks: 1500, arts: 7000, caos: 800,
    invoices: 3500, contracts: 1200, cases: 900,
  };
  for (const [name, count] of Object.entries(counts)) {
    const rows = d[name as keyof typeof counts] as { id: string }[];
    assert.equal(rows.length, count, name);
  }
  for (const [name, value] of Object.entries(d)) {
    if (!Array.isArray(value) || !value.length || !('id' in Object(value[0]))) continue;
    const rows = value as { id: string }[];
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length, `${name}: duplicate ID`);
    assert(rows.every(row => typeof row.id === 'string' && row.id.length > 0), name);
  }
  assert.equal(new Set(d.cnaes.map(row => row.code)).size, d.cnaes.length);
  assert.equal(new Set(d.cbos.map(row => row.code)).size, d.cbos.length);
  assert.equal(new Set(d.months).size, d.months.length);
});

test('generation is repeatable and a different seed changes the fictitious records', () => {
  assert.deepEqual(generateDataset(d.seed), d);
  const alternate = generateDataset(d.seed + 1);
  assert.notDeepEqual(alternate.establishments, d.establishments);
  assert.deepEqual(alternate.cnaes, d.cnaes, 'source catalog must not depend on random seed');
  assert.equal(alternate.companies.length, d.companies.length);
});

test('CNPJ master is valid and unique, with one matriz and matching roots for every company', () => {
  assert.equal(new Set(d.establishments.map(row => row.cnpj)).size, d.establishments.length);
  assert.equal(new Set(d.companies.map(row => row.rootCnpj)).size, d.companies.length);
  const grouped = new Map<string, typeof d.establishments>();
  for (const establishment of d.establishments) {
    assert(validCnpj(establishment.cnpj), `${establishment.id}: invalid CNPJ`);
    const company = companies.get(establishment.companyId);
    assert(company, `${establishment.id}: missing company`);
    assert.equal(establishment.cnpj.slice(0, 8), company.rootCnpj);
    grouped.set(company.id, [...(grouped.get(company.id) ?? []), establishment]);
  }
  for (const company of d.companies) {
    assert.match(company.rootCnpj, /^\d{8}$/);
    const rows = grouped.get(company.id) ?? [];
    assert.equal(rows.filter(row => row.branch === 'Matriz').length, 1, company.id);
    assert(rows.every(row => row.branch === 'Matriz' || row.branch === 'Filial'));
  }
});

test('establishments, registrations and movements preserve their foreign keys and company ownership', () => {
  for (const city of d.cities) assert(gres.has(city.greId), city.id);
  for (const establishment of d.establishments) {
    assert(cities.has(establishment.cityId), establishment.id);
    assert(cities.has(establishment.creaCityId), establishment.id);
    assert(gres.has(establishment.greId), establishment.id);
    assert.equal(cities.get(establishment.cityId)!.greId, establishment.greId);
    assert(cnaeCodes.has(establishment.cnaeMain), `${establishment.id}: unknown main CNAE`);
    for (const code of establishment.cnaeSecondary) assert(cnaeCodes.has(code), code);
    date(establishment.openedAt, establishment.id);
    date(establishment.updatedAt, establishment.id);
    assert(establishment.openedAt <= d.snapshotDate);
    assert(establishment.updatedAt <= d.snapshotDate);
  }
  for (const registration of d.registrations) {
    const establishment = establishments.get(registration.establishmentId);
    assert(establishment, registration.id);
    assert.equal(establishment.companyId, registration.companyId);
    assert(companies.has(registration.companyId), registration.id);
    assert(!companies.get(registration.companyId)!.externalOnly, registration.id);
  }
  for (const movement of d.movements) {
    const registration = registrations.get(movement.registrationId);
    assert(registration, movement.id);
    assert.equal(registration.companyId, movement.companyId);
    assert.equal(registration.establishmentId, movement.establishmentId);
  }
});

test('registration status and start/cessation dates reconcile with the movement history', () => {
  const statusAfter: Record<MovementType, RegistrationStatus> = {
    'Novo registro': 'Ativo', Baixa: 'Inativo', 'Reativação': 'Ativo', Cancelamento: 'Cancelado',
  };
  const history = new Map<string, typeof d.movements>();
  for (const movement of d.movements) {
    date(movement.date, movement.id);
    assert(movement.date <= d.snapshotDate, movement.id);
    history.set(movement.registrationId, [...(history.get(movement.registrationId) ?? []), movement]);
  }
  for (const registration of d.registrations) {
    const rows = (history.get(registration.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    assert(rows.length > 0, registration.id);
    assert.equal(rows[0].type, 'Novo registro', registration.id);
    assert.equal(rows.filter(row => row.type === 'Novo registro').length, 1, registration.id);
    assert.equal(registration.startedAt, rows[0].date, registration.id);
    date(registration.requestedAt, registration.id);
    assert(registration.requestedAt <= registration.startedAt, registration.id);
    const last = rows.at(-1)!;
    assert.equal(registration.status, statusAfter[last.type], registration.id);
    if (registration.status !== 'Ativo') {
      const lastCessation = rows.filter(row => row.type === 'Baixa' || row.type === 'Cancelamento').at(-1)!;
      assert.equal(registration.ceasedAt, lastCessation.date, registration.id);
    } else {
      assert.equal(registration.ceasedAt, undefined, registration.id);
    }
    let state: RegistrationStatus | undefined;
    for (const movement of rows) {
      if (movement.type === 'Baixa' || movement.type === 'Cancelamento') {
        assert.equal(state, 'Ativo', `${registration.id}: cessation of inactive registration`);
      }
      if (movement.type === 'Reativação') assert(state !== 'Ativo', `${registration.id}: redundant reactivation`);
      state = statusAfter[movement.type];
    }
  }
  const external = d.companies.filter(row => row.externalOnly);
  assert(external.length > 0);
  const registeredCompanyIds = new Set(d.registrations.map(row => row.companyId));
  assert(external.every(row => !registeredCompanyIds.has(row.id)));
});

test('historical active stock reconciles at every movement date without overlapping registrations', () => {
  const days = new Map<string, typeof d.movements>();
  for (const movement of d.movements) {
    days.set(movement.date, [...(days.get(movement.date) ?? []), movement]);
  }
  const active = new Set<string>();
  const ownerByEstablishment = new Map<string, string>();
  let stock = 0;
  for (const [day, events] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    const opening = events.filter(event => event.type === 'Novo registro' || event.type === 'Reativação');
    const closing = events.filter(event => event.type === 'Baixa' || event.type === 'Cancelamento');
    // Cessation takes effect on its date; process it before another registration begins that day.
    for (const event of closing) {
      assert(active.has(event.registrationId), `${day}: inactive registration ${event.registrationId} ceased`);
      assert.equal(ownerByEstablishment.get(event.establishmentId), event.registrationId, event.id);
      active.delete(event.registrationId);
      ownerByEstablishment.delete(event.establishmentId);
    }
    for (const event of opening) {
      assert(!active.has(event.registrationId), `${day}: repeated opening of ${event.registrationId}`);
      assert(!ownerByEstablishment.has(event.establishmentId), `${day}: overlapping registrations for ${event.establishmentId}`);
      active.add(event.registrationId);
      ownerByEstablishment.set(event.establishmentId, event.registrationId);
    }
    stock += opening.length - closing.length;
    assert.equal(stock, active.size, `${day}: stock does not reconcile with movements`);
    assert(stock >= 0, day);
    assert(stock <= d.registrations.filter(registration => registration.startedAt <= day).length, day);
  }
  const activeAtSnapshot = d.registrations.filter(registration => registration.status === 'Ativo');
  assert.equal(stock, activeAtSnapshot.length);
  assert.deepEqual([...active].sort(), activeAtSnapshot.map(registration => registration.id).sort());
  const registrationIds = new Set(d.registrations.map(registration => registration.id));
  const startedIds = new Set(d.movements.filter(movement => movement.type === 'Novo registro').map(movement => movement.registrationId));
  assert.deepEqual(startedIds, registrationIds, 'every registration must have an initial movement');
});

test('professional links and ARTs retain company ownership and coherent chronology', () => {
  for (const link of d.technicalLinks) {
    assert(companies.has(link.companyId), link.id);
    assert(professionals.has(link.professionalId), link.id);
    date(link.startDate, link.id);
    assert(link.startDate <= d.snapshotDate, link.id);
    if (link.endDate) {
      date(link.endDate, link.id);
      assert(link.endDate >= link.startDate && link.endDate <= d.snapshotDate, link.id);
    }
  }
  for (const art of d.arts) {
    const registration = registrations.get(art.registrationId);
    assert(registration, art.id);
    assert.equal(registration.companyId, art.companyId);
    date(art.date, art.id);
    assert(art.date >= registration.startedAt && art.date <= d.snapshotDate, art.id);
    assert(Number.isFinite(art.value) && art.value > 0, art.id);
    if (art.status === 'Baixada') {
      assert(art.endDate, art.id);
      date(art.endDate, art.id);
      assert(art.endDate >= art.date && art.endDate <= d.snapshotDate, art.id);
    }
  }
});

test('responsabilidade técnica demonstra RTS simultâneos diversos e trocas sem sobreposição histórica', () => {
  const byCompany = new Map<string, typeof d.technicalLinks>();
  for (const link of d.technicalLinks) byCompany.set(link.companyId, [...(byCompany.get(link.companyId) ?? []), link]);
  const active = (link: typeof d.technicalLinks[number]) => link.startDate <= d.snapshotDate && (!link.endDate || link.endDate > d.snapshotDate);
  const simultaneous = [...byCompany.values()].filter(links => links.filter(active).length > 1);
  assert(simultaneous.length > 0, 'amostra deve permitir analisar empresas com múltiplos RTS vigentes');
  assert(simultaneous.some(links => new Set(links.filter(active).map(link => link.professionalId)).size > 1
    && new Set(links.filter(active).map(link => link.modality)).size > 1), 'RTS simultâneos devem incluir pessoas e modalidades distintas');
  const exchanges = [...byCompany.values()].filter(links => links.length > 1 && links.filter(active).length < 2);
  assert(exchanges.length > 0, 'amostra deve preservar trocas de RTS no histórico');
  for (const links of exchanges) {
    const ordered = [...links].sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let index = 1; index < ordered.length; index++) {
      const previous = ordered[index - 1]; const successor = ordered[index];
      assert(previous.endDate && previous.endDate < successor.startDate, 'troca deve encerrar o vínculo anterior antes da entrada do sucessor');
      assert.notEqual(previous.professionalId, successor.professionalId, 'troca deve referir-se a profissionais distintos');
    }
  }
  assert(new Set(d.technicalLinks.filter(active).map(link => link.modality)).size > 2, 'vínculos vigentes devem permitir comparar modalidades');
});

test('issued and revoked CAOs refer to completed ARTs of the same company', () => {
  assert(d.caos.some(row => row.status === 'Emitida'));
  assert(d.caos.some(row => row.status === 'Revogada'));
  for (const cao of d.caos) {
    assert(companies.has(cao.companyId), cao.id);
    date(cao.requestedAt, cao.id);
    assert(cao.requestedAt <= d.snapshotDate, cao.id);
    assert(cao.artIds.length > 0, cao.id);
    assert.equal(new Set(cao.artIds).size, cao.artIds.length, cao.id);
    for (const id of cao.artIds) {
      const art = arts.get(id);
      assert(art, `${cao.id}: unknown ART ${id}`);
      assert.equal(art.companyId, cao.companyId, cao.id);
      if (cao.status === 'Emitida' || cao.status === 'Revogada') {
        assert(cao.issuedAt, cao.id);
        assert.equal(art.status, 'Baixada', cao.id);
        assert(art.endDate && art.endDate < cao.issuedAt, cao.id);
      }
    }
    if (cao.issuedAt) {
      date(cao.issuedAt, cao.id);
      assert(cao.requestedAt <= cao.issuedAt && cao.issuedAt <= d.snapshotDate, cao.id);
    }
  }
});

test('financial amounts and recovery respect payment and due dates', () => {
  assert(d.invoices.some(row => row.recovered), 'sample must include late recovery');
  assert(d.invoices.some(row => row.paidAmount === 0), 'sample must include unpaid bills');
  assert(d.invoices.some(row => row.paidAmount > 0 && row.paidAmount < row.amount), 'sample must include partial payments');
  assert(d.invoices.some(row => row.dueDate > d.snapshotDate), 'sample must include bills that are not overdue');
  for (const invoice of d.invoices) {
    const registration = registrations.get(invoice.registrationId);
    assert(registration, invoice.id);
    assert.equal(invoice.companyId, registration.companyId);
    assert(Number.isFinite(invoice.amount) && invoice.amount > 0, invoice.id);
    assert(Number.isFinite(invoice.paidAmount) && invoice.paidAmount >= 0 && invoice.paidAmount <= invoice.amount, invoice.id);
    date(invoice.dueDate, invoice.id);
    if (invoice.paidAmount > 0) {
      assert(invoice.paymentDate, invoice.id);
      date(invoice.paymentDate, invoice.id);
      assert(invoice.paymentDate <= d.snapshotDate, invoice.id);
    } else {
      assert.equal(invoice.paymentDate, undefined, invoice.id);
    }
    if (invoice.dueDate > d.snapshotDate) assert.equal(invoice.paidAmount, 0, invoice.id);
    if (invoice.recovered) {
      assert(invoice.paidAmount > 0 && invoice.paymentDate! > invoice.dueDate, invoice.id);
    }
  }
});

test('contracts and inspection histories reference existing establishments and buyers', () => {
  for (const contract of d.contracts) {
    assert(companies.has(contract.companyId), contract.id);
    assert.equal(establishments.get(contract.establishmentId)?.companyId, contract.companyId, contract.id);
    assert(buyers.has(contract.buyerId), contract.id);
    date(contract.date, contract.id);
    assert(contract.date <= d.snapshotDate, contract.id);
    assert(Number.isFinite(contract.value) && contract.value > 0, contract.id);
  }
  for (const inspection of d.cases) {
    assert.equal(establishments.get(inspection.establishmentId)?.companyId, inspection.companyId, inspection.id);
    date(inspection.createdAt, inspection.id);
    assert(inspection.createdAt <= d.snapshotDate, inspection.id);
    assert(inspection.history.length > 0, inspection.id);
    assert.equal(inspection.history.at(-1)!.status, inspection.status, inspection.id);
    let previous = inspection.createdAt;
    for (const entry of inspection.history) {
      date(entry.date, inspection.id);
      assert(entry.date >= previous && entry.date <= d.snapshotDate, inspection.id);
      previous = entry.date;
    }
    if (inspection.status === 'Concluída') {
      assert(inspection.completedAt, inspection.id);
      assert.equal(inspection.completedAt, inspection.history.at(-1)!.date, inspection.id);
    }
    if (inspection.notice) {
      date(inspection.notice.date, inspection.id);
      assert(inspection.notice.date >= inspection.createdAt && inspection.notice.date <= d.snapshotDate, inspection.id);
    }
  }
});

test('employment is aggregated by municipality, CNAE and CBO and reconciles monthly stock', () => {
  assert(d.employment.length > 0);
  const grouped = new Map<string, typeof d.employment>();
  const dimensions = new Set<string>();
  for (const fact of d.employment) {
    assert(!('companyId' in fact), `${fact.id}: public employment must stay aggregated`);
    assert(!('professionalId' in fact), fact.id);
    assert(cities.has(fact.cityId), fact.id);
    assert(cnaeCodes.has(fact.cnae), fact.id);
    assert(cboCodes.has(fact.cbo), fact.id);
    assert(d.months.includes(fact.month), fact.id);
    assert.match(fact.month, /^\d{4}-\d{2}$/);
    assert(fact.month <= d.snapshotDate.slice(0, 7), fact.id);
    for (const value of [fact.stock, fact.admissions, fact.dismissals]) assert(Number.isInteger(value) && value >= 0, fact.id);
    const key = `${fact.cityId}|${fact.cnae}|${fact.cbo}`;
    const uniqueKey = `${key}|${fact.month}`;
    assert(!dimensions.has(uniqueKey), `${fact.id}: duplicate employment dimensions`);
    dimensions.add(uniqueKey);
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }
  for (const [key, facts] of grouped) {
    facts.sort((a, b) => a.month.localeCompare(b.month));
    assert(facts.length > 1, `${key}: monthly stock needs consecutive observations`);
    for (let index = 1; index < facts.length; index++) {
      const previous = facts[index - 1];
      const current = facts[index];
      const nextMonth = new Date(`${previous.month}-01T00:00:00Z`);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      assert.equal(current.month, nextMonth.toISOString().slice(0, 7), `${key}: missing month`);
      assert.equal(current.stock, previous.stock + current.admissions - current.dismissals, `${key} ${current.month}`);
    }
  }
});

test('deliberately invalid and duplicate public rows are traceable through quality events', () => {
  const eventsByEstablishment = new Map<string, typeof d.qualityEvents>();
  for (const event of d.qualityEvents) {
    assert.equal(establishments.get(event.establishmentId)?.companyId, event.companyId, event.id);
    date(event.date, event.id);
    assert(event.date <= d.snapshotDate, event.id);
    assert(event.source.trim().length > 0 && event.evidence.trim().length > 0, event.id);
    eventsByEstablishment.set(event.establishmentId, [...(eventsByEstablishment.get(event.establishmentId) ?? []), event]);
  }
  const invalid = d.publicRows.filter(row => !validCnpj(row.cnpj));
  assert(invalid.length > 0, 'sample must demonstrate invalid source CNPJs');
  for (const row of invalid) {
    assert(eventsByEstablishment.get(row.establishmentId)?.some(event => event.type === 'CNPJ inválido'), row.id);
  }
  const publicCnpjs = new Map<string, typeof d.publicRows>();
  for (const row of d.publicRows) {
    assert(establishments.has(row.establishmentId), row.id);
    assert(cities.has(row.cityId), row.id);
    assert(!row.cnae || cnaeCodes.has(row.cnae), row.id);
    publicCnpjs.set(row.cnpj, [...(publicCnpjs.get(row.cnpj) ?? []), row]);
  }
  const duplicates = [...publicCnpjs.values()].filter(rows => rows.length > 1);
  assert(duplicates.length > 0, 'sample must demonstrate duplicated source CNPJs');
  for (const rows of duplicates) {
    assert(rows.some(row => eventsByEstablishment.get(row.establishmentId)?.some(event => event.type === 'CNPJ duplicado na origem')), rows[0].cnpj);
  }
  assert(d.publicRows.length > d.establishments.length, 'quality defects must not replace canonical establishments');
});

test('all 702 imported CNAEs preserve original worksheet fields and their classifications', () => {
  const original = JSON.parse(readFileSync(new URL('../src/domain/cnae-catalog.json', import.meta.url), 'utf8'));
  assert.equal(d.cnaes.length, 702);
  assert.deepEqual(d.cnaes, original);
  assert.equal(d.cnaes.filter(row => row.classification === 'Relacionado').length, 638);
  assert.equal(d.cnaes.filter(row => row.classification === 'Depende de análise').length, 64);
  assert.equal(d.cnaes.filter(row => row.originalClassification === 'Sim').length, 623);
  assert.equal(d.cnaes.filter(row => row.originalClassification === 'sim').length, 15);
  assert.equal(d.cnaes.filter(row => row.originalClassification === 'Passível de obrigação').length, 64);
  assert.equal(new Set(d.cnaes.map(row => `${row.sourceSheet}:${row.sourceRow}`)).size, 702);
  for (const row of d.cnaes) {
    assert.deepEqual(Object.keys(row.fields).sort(), ['SUBCLASSE', 'DESCRIÇÃO', 'OBRIGAÇÃO DE REGISTRO'].sort());
    assert.equal(row.fields.SUBCLASSE, row.code);
    assert.equal(row.fields['DESCRIÇÃO'], row.label);
    assert.equal(row.fields['OBRIGAÇÃO DE REGISTRO'], row.originalClassification);
    assert.equal(row.sourceSheet, 'Planilha1');
    assert(Number.isInteger(row.sourceRow) && row.sourceRow >= 2 && row.sourceRow <= 703);
  }
});
