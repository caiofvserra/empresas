import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset } from '../src/domain/dataset.ts';
import { defaultFilters } from '../src/domain/types.ts';
import type { Dataset, Filters } from '../src/domain/types.ts';
import { selectScope } from '../src/domain/engine.ts';
import { digitalRegistrationActive } from '../src/domain/digital-inspection.ts';
import { buildEnterpriseEvidence, isValidEnterpriseCnpj, normalizeEnterpriseCnpj } from '../src/enterprise-v10/data.ts';
import { buildEnterpriseModel } from '../src/enterprise-v10/model.ts';
import { metricIds } from '../src/enterprise-v10/types.ts';
import { enterpriseIndicators } from '../src/enterprise-v10/catalog.ts';

function tiny(): Dataset {
  const cnae = dataset.cnaes.find(row => row.code === '7112-0/00')!;
  const companies = ['A','B','C'].map((id, i) => ({ ...dataset.companies[i], id, rootCnpj: dataset.establishments[i].cnpj.slice(0,8) }));
  const cities = dataset.cities.slice(0,1), gres = dataset.gres.slice(0,1);
  const establishments = ['A1','A2','B1','C1'].map((id,i) => ({...dataset.establishments[i], id, companyId:['A','A','B','C'][i], cnpj:dataset.establishments[i].cnpj,
    cityId:cities[0].id,greId:gres[0].id,creaCityId:cities[0].id, cnaeMain:cnae.code,cnaeSecondary:[],openedAt:id==='A2'?'2026-01-02':'2025-01-01',rfbStatus:'Ativa' as const }));
  const registrations = ['A','B','C'].map(id => ({ id:`R${id}`,companyId:id,establishmentId:`${id}1`,type:'Registro' as const,status:id==='B'?'Inativo' as const:'Ativo' as const,
    requestedAt:id==='B'?'2026-01-02':'2025-11-20',startedAt:id==='B'?'2026-01-04':'2025-12-01',...(id==='B'?{ceasedAt:'2026-01-08'}:{}) }));
  const movements = registrations.flatMap(row => [{id:`N${row.id}`,companyId:row.companyId,establishmentId:row.establishmentId,registrationId:row.id,type:'Novo registro' as const,date:row.startedAt},...(row.ceasedAt?[{id:`E${row.id}`,companyId:row.companyId,establishmentId:row.establishmentId,registrationId:row.id,type:'Baixa' as const,date:row.ceasedAt}]:[])]);
  const arts = ['A','B'].map((id,i)=>({...dataset.arts[i],id:`ART${id}`,companyId:id,registrationId:`R${id}`,date:`2026-01-0${i+5}`}));
  const technicalLinks = ['A','C'].map((id,i)=>({...dataset.technicalLinks[i],id:`RT${id}`,companyId:id,startDate:'2026-01-01',endDate:id==='A'?'2026-01-06':undefined}));
  const makeInvoice = (id:string,companyId:string,dueDate:string,amount:number,paidAmount:number,paymentDate?:string)=>({id,companyId,registrationId:`R${companyId}`,dueDate,amount,paidAmount,paymentDate,installmentPlan:false,recovered:false});
  const invoices = [makeInvoice('I1','A','2025-12-01',100,40,'2026-01-05'),makeInvoice('I2','A','2026-01-05',20,20,'2026-01-05'),makeInvoice('I3','B','2025-12-10',50,50,'2025-12-20'),makeInvoice('I4','C','2025-12-20',80,0),makeInvoice('I5','C','2026-01-20',900,0)];
  const contracts = ['A1','B1','A2'].map((establishmentId,i)=>({...dataset.contracts[i],id:`P${i}`,establishmentId,companyId:establishmentId[0],date:['2026-01-03','2026-01-09','2026-01-07'][i],object:'Serviços de engenharia civil',value:(i+1)*1000,category:'Obras'}));
  const employment = ['2025-12','2026-01'].map((month,i)=>({id:`J${i}`,month,cityId:cities[0].id,cnae:cnae.code,cbo:dataset.cbos[0].code,stock:100+i*10,admissions:10,dismissals:0}));
  return {...dataset,companies,establishments,registrations,movements,arts,technicalLinks,invoices,contracts,employment,cities,gres,cnaes:[cnae],caos:[],cases:[],qualityEvents:[],publicRows:[],months:['2025-12','2026-01'],snapshotDate:'2026-01-10'};
}
const analyze=(data:Dataset, filters:Partial<Filters>={})=>buildEnterpriseModel(selectScope(data,{...defaultFilters,period:1,...filters}));
const close=(actual:number|null|undefined,expected:number)=>assert(Math.abs((actual??NaN)-expected)<1e-9,`${actual} != ${expected}`);

test('V10 keeps a controlled 17-indicator business catalog and truthful absence denominators',()=>{
 const model=analyze(tiny()); assert.deepEqual(Object.keys(model.metrics),[...metricIds]);
 assert.deepEqual(enterpriseIndicators.map(row=>row.id),[...metricIds]);for(const definition of enterpriseIndicators){for(const key of ['name','meaning','formula','decision','example','limits','unit'] as const)assert(definition[key].trim().length>0);assert(definition.sources.length>0);}
 const empty=analyze({...tiny(),companies:[],establishments:[],registrations:[],movements:[],technicalLinks:[],arts:[],invoices:[],contracts:[],employment:[]});
 for(const id of ['retention','coverage','rtCoverage','rtContinuity','corporateActivity','economicContext','supplierCoverage','contractTrace','compliance','recovery','observedEntry'] as const)assert.equal(empty.metrics[id].value,null,id);
 assert.equal(empty.metrics.base.value,0);
});
test('V10 company roots and CNPJ establishments remain different counting units',()=>{
 const m=analyze(tiny());assert.equal(m.metrics.base.value,2);assert.equal(m.metrics.coverage.numerator,2);assert.equal(m.metrics.coverage.denominator,4);close(m.metrics.coverage.value,50);
 assert.deepEqual(m.metadata.notLocatedEstablishmentIds,['A2']);assert.deepEqual(m.metadata.inactiveMatchedEstablishmentIds,['B1']);
 assert.equal(m.regions[0].eligible,m.regions[0].matched+m.regions[0].notLocated+m.regions[0].inactiveMatched);
});
test('V10 registry history ignores the current status label and preserves flow-stock reconciliation',()=>{
 const data=tiny();data.registrations[1].status='Ativo';const m=analyze(data);
 assert.equal(m.metrics.base.value,2);assert.equal(m.monthly[0].entered,1);assert.equal(m.monthly[0].exited,1);
 assert.equal(m.metadata.openingCompanyIds.length+m.monthly[0].entered-m.monthly[0].exited,m.monthly[0].base);
 const direct=data.registrations.filter(row=>digitalRegistrationActive(row,data,data.snapshotDate)).map(row=>row.companyId).sort();assert.deepEqual(m.metadata.activeCompanyIds,direct);
});
test('V10 retention follows the opening cohort and qualifies current RFB status instead of inventing its past',()=>{
 const data=tiny();const m=analyze(data);close(m.metrics.retention.value,100);assert.equal(m.metrics.retention.denominator,2);
 data.establishments[3].rfbStatus='Baixada';const n=analyze(data);assert.equal(n.metrics.retention.denominator,1);assert.match(n.metrics.retention.note,/corte atual/);
});
test('V10 new market requires a new establishment and no historical exact registration',()=>{
 const data=tiny();const m=analyze(data);assert.equal(m.metrics.newMarket.value,1);assert.deepEqual(m.metrics.newMarket.factIds,['A2']);
 data.establishments[2].openedAt='2026-01-02';assert.equal(analyze(data).metrics.newMarket.value,1,'Inactive historical match cannot become a fresh unmatched case');
});
test('V10 current RT and company-day continuity have explicit and different denominators',()=>{
 const m=analyze(tiny());close(m.metrics.rtCoverage.value,50);assert.equal(m.metadata.registeredCompanyDays,24);assert.equal(m.metadata.coveredCompanyDays,15);close(m.metrics.rtContinuity.value,62.5);
 assert.equal(m.gapBuckets.reduce((sum,row)=>sum+row.count,0),3);assert.equal(m.technicalPartition.reduce((sum,row)=>sum+row.count,0),2);
});
test('V10 unioned RT intervals never double-count overlapping professionals or multiple registrations',()=>{
 const data=tiny();data.technicalLinks.push({...data.technicalLinks[1],id:'RT-overlap'});data.registrations.push({...data.registrations[2],id:'RC-overlap'});
 const m=analyze(data);assert.equal(m.metadata.coveredCompanyDays,15);assert.equal(m.metadata.registeredCompanyDays,24);
});
test('V10 corporate ART activity includes companies that were registered in the period, not just the final stock',()=>{
 const m=analyze(tiny());assert.equal(m.metrics.corporateActivity.numerator,2);assert.equal(m.metrics.corporateActivity.denominator,3);close(m.metrics.corporateActivity.value,200/3);
 assert.deepEqual(m.monthly[0].artCompanyIds,['A','B']);assert.equal(m.monthly[0].arts,2);
});
test('V10 employment compares compatible monthly stocks and blocks company-specific or size attribution',()=>{
 const data=tiny();const m=analyze(data,{period:2});close(m.metrics.economicContext.value,10);assert.equal(m.metrics.economicContext.numerator,110);assert.equal(m.metrics.economicContext.denominator,100);
 assert.equal(analyze(data).metrics.economicContext.value,null,'one observed month cannot establish growth');
 assert.equal(analyze(data,{period:2,sizes:[data.companies[0].size]}).metrics.economicContext.value,null);
});
test('V10 PNCP supplier coverage uses complete CNPJ and actual publication date, without covering another branch',()=>{
 const m=analyze(tiny());assert.equal(m.metrics.publicDemand.value,6000);assert.equal(m.metrics.supplierCoverage.numerator,1);assert.equal(m.metrics.supplierCoverage.denominator,3);close(m.metrics.supplierCoverage.value,100/3);
 assert.equal(m.contracts.find(row=>row.contract.id==='P2')!.exactActiveAtPublication,false);
});
test('V10 uses each supplier most recent selected publication and deduplicates contract IDs',()=>{
 const data=tiny();data.contracts.push({...data.contracts[0],id:'P4',establishmentId:'B1',companyId:'B',date:'2026-01-06',value:500});data.contracts.push({...data.contracts[0]});
 const m=analyze(data);assert.equal(m.metrics.publicDemand.value,6500);assert.equal(m.metrics.supplierCoverage.numerator,1,'Earlier active contract cannot mask the later inactive publication');assert.equal(m.metrics.supplierCoverage.denominator,3);
});
test('V10 contract-ART traces require explicit documentary references and never infer absence of an ART',()=>{
 const data=tiny(),scope=selectScope(data,{...defaultFilters,period:1});const evidence={...buildEnterpriseEvidence(data),contractArt:[{id:'D1',contractId:'P0',artId:'ARTA',companyId:'A',recordedAt:'2026-01-05',source:'Demonstration document'}]};
 const m=buildEnterpriseModel(scope,evidence);close(m.metrics.contractTrace.value,100/3);assert.deepEqual(m.contracts.find(row=>row.contract.id==='P2')!.artIds,[]);assert.match(m.metrics.contractTrace.note,/não significa ausência/);
});
test('V10 digital convergence requires the same eligible establishment, not just another branch of the root',()=>{
 const data=tiny();const m=analyze(data);assert.deepEqual(m.metrics.convergentEvidence.companyIds,['A','B']);
 data.contracts=data.contracts.filter(row=>row.establishmentId!=='A2');assert.deepEqual(analyze(data).metrics.convergentEvidence.companyIds,['B']);
});
test('V10 cash, debt and company compliance do not use ART/PNCP values or future obligations',()=>{
 const m=analyze(tiny());assert.equal(m.metrics.receipts.value,60);assert.equal(m.metrics.overdue.value,140);assert.equal(m.metrics.compliance.numerator,1);assert.equal(m.metrics.compliance.denominator,3);
 assert.equal(m.debtBuckets.reduce((sum,row)=>sum+row.value,0),140);assert.equal(m.monthly.reduce((sum,row)=>sum+row.receipts,0),60);
});
test('V10 recovery holds the opening overdue cohort fixed and keeps mixed payment-company identities',()=>{
 const m=analyze(tiny());assert.equal(m.recoveryCohort.openingBalance,180);assert.equal(m.recoveryCohort.recovered,40);assert.equal(m.recoveryCohort.remaining,140);close(m.metrics.recovery.value,40/180*100);
 assert.deepEqual(m.monthly[0].recoveredCompanyIds,['A']);assert.deepEqual(m.monthly[0].otherReceiptCompanyIds,['A']);
 assert.equal(m.monthly.reduce((sum,row)=>sum+row.recovered,0),m.recoveryCohort.recovered);
});
test('V10 observed entry uses a documented pre-window establishment cohort and need not imply final vigency',()=>{
 const m=analyze(tiny());assert.equal(m.metadata.baseline,'2025-12-31');assert.equal(m.metrics.observedEntry.denominator,1);assert.equal(m.metrics.observedEntry.numerator,1);close(m.metrics.observedEntry.value,100);
 assert.deepEqual(m.metrics.observedEntry.companyIds,['B']);assert(!m.metadata.activeCompanyIds.includes('B'));assert.match(m.metrics.observedEntry.note,/não efeito causal/);
});
test('V10 documentary fixtures reproduce valid temporal references and preserve alphanumeric CNPJs',()=>{
 assert.equal(normalizeEnterpriseCnpj('12.abc.345/01de-35'),'12ABC34501DE35');assert(isValidEnterpriseCnpj('12.ABC.345/01DE-35'));assert(!isValidEnterpriseCnpj('12.ABC.345/01DE-36'));
 const data=tiny(),a=buildEnterpriseEvidence(data),b=buildEnterpriseEvidence(structuredClone(data));assert.deepEqual(a,b);
 for(const row of a.contractArt){assert(data.contracts.some(contract=>contract.id===row.contractId&&contract.companyId===row.companyId));assert(data.arts.some(art=>art.id===row.artId&&art.companyId===row.companyId));assert(row.recordedAt<=data.snapshotDate);}
 for(const row of a.observations){assert(!data.registrations.some(reg=>reg.establishmentId===row.establishmentId&&reg.startedAt<=row.observedAt));assert(row.observedAt<=data.snapshotDate);}
});
test('V10 production-size relational scopes conserve IDs, ratios, financial cents and regional exclusive base',()=>{
 const scope=selectScope(dataset,defaultFilters),m=buildEnterpriseModel(scope);
 assert.equal(m.regions.reduce((sum,row)=>sum+row.base,0),m.metrics.base.value);
 assert.equal(m.regions.reduce((sum,row)=>sum+row.eligible,0),m.metrics.coverage.denominator);
 for(const metric of Object.values(m.metrics)){assert.equal(new Set(metric.companyIds).size,metric.companyIds.length);assert(metric.companyIds.every(id=>scope.companyIds.has(id)));if(metric.unit==='percent'&&metric.value!==null&&metric.id!=='economicContext')assert(metric.value>=0&&metric.value<=100);}
 let opening=m.metadata.openingCompanyIds.length;for(const month of m.monthly){assert.equal(opening+month.entered-month.exited,month.base,month.month);opening=month.base;}
 assert.equal(Math.round(m.monthly.reduce((sum,row)=>sum+row.receipts,0)*100),Math.round(m.metrics.receipts.value!*100));
 assert.equal(Math.round(m.debtBuckets.reduce((sum,row)=>sum+row.value,0)*100),Math.round(m.metrics.overdue.value!*100));
});
test('V10 filters reduce records while global exact lookup does not manufacture missing registration',()=>{
 const data=tiny();const m=analyze(data,{search:'98'+data.establishments[1].cnpj.slice(2)});assert.equal(m.metrics.coverage.denominator,1);assert.equal(m.metrics.coverage.numerator,0);
 const subset=buildEnterpriseModel(selectScope(data,{...defaultFilters,period:1},['A']));assert(subset.companyFacts.every(row=>row.companyId==='A'));assert.equal(subset.metrics.coverage.denominator,2);assert.equal(subset.metrics.coverage.numerator,1);
});

test('V10 rejects documentary bridges with invalid references, duplicate pairs or premature recording',()=>{
 const data=tiny(),scope=selectScope(data,{...defaultFilters,period:1});
 const valid={id:'D',contractId:'P0',artId:'ARTA',companyId:'A',recordedAt:'2026-01-05',source:'Document'};
 const result=buildEnterpriseModel(scope,{synthetic:true,observations:[],contractArt:[valid,{...valid,id:'duplicate'},{...valid,id:'future',recordedAt:'2026-12-01'},{...valid,id:'missing',artId:'ABSENT'},{...valid,id:'wrong-company',contractId:'P1',companyId:'B'},{...valid,id:'premature',contractId:'P2',recordedAt:'2026-01-01'}]});
 assert.equal(result.metadata.bridgeRows,1);assert.equal(result.metrics.contractTrace.numerator,1);
});
