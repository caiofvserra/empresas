import geometria from './sp-municipios.json';
import type { Dataset } from './types';
import { chance } from './hash';
import greMunicipios from './gre-municipios.json';

/**
 * Os 645 municípios paulistas (malha do IBGE), cada um com a sua GRE e um porte demonstrativo (04/11/2026, pedido do Caio:
 * "as outras cidades não existem?"). Antes, o cenário punha todos os profissionais em 24 cidades e o mapa ficava quase todo cinza.
 *
 * GRE e UGI: tabela oficial do Crea-SP (planilha "GRE UGI UNIDADE Município", enviada pelo Caio em 04/11/2026), em
 * `gre-municipios.json`, pelo código do IBGE: 16 GREs, 645 municípios. A capital aparece na planilha dividida em zonas, todas na GRE 5.
 * Município fora da tabela (nenhum, hoje) fica com a GRE da cidade-sede mais próxima.
 *
 * Porte: população aproximada do Censo 2022 (IBGE) para os maiores municípios, arredondada; os demais recebem um porte sorteado
 * pelo código do IBGE, na faixa das cidades pequenas do interior (mediana perto de 12 mil habitantes). Serve só para espalhar
 * os profissionais do cenário; em produção, o município vem do endereço do cadastro.
 */
export interface Municipio { id: string; nome: string; greId: string; ugi: string | null; populacao: number; centro: [number, number] }

/** População aproximada (milhares de habitantes, Censo 2022), dos municípios paulistas maiores. */
const populacaoMil: Record<string, number> = {
  'São Paulo': 11451, Guarulhos: 1291, Campinas: 1139, 'São Bernardo do Campo': 810, 'Santo André': 748, Osasco: 728, Sorocaba: 723,
  'Ribeirão Preto': 698, 'São José dos Campos': 697, 'São José do Rio Preto': 480, 'Mogi das Cruzes': 451, Jundiaí: 443, Piracicaba: 423,
  Mauá: 418, Santos: 418, Diadema: 393, Carapicuíba: 386, Bauru: 379, Itaquaquecetuba: 369, Franca: 352, 'Praia Grande': 349,
  'São Vicente': 329, Barueri: 316, Taubaté: 310, Suzano: 307, Limeira: 291, 'Guarujá': 287, Sumaré: 279, Cotia: 274, 'Taboão da Serra': 273,
  Indaiatuba: 255, 'São Carlos': 254, 'Embu das Artes': 250, Araraquara: 242, Jacareí: 240, Americana: 237, Marília: 237, Hortolândia: 236,
  Itapevi: 232, 'Presidente Prudente': 225, 'Rio Claro': 201, Araçatuba: 200, "Santa Bárbara d'Oeste": 183, 'Ferraz de Vasconcelos': 179,
  'Bragança Paulista': 176, Itu: 168, 'São Caetano do Sul': 165, Pindamonhangaba: 165, 'Francisco Morato': 165, 'Itapecerica da Serra': 158,
  Atibaia: 158, Itapetininga: 157, 'Santana de Parnaíba': 154, 'Mogi Guaçu': 153, Botucatu: 145, 'Franco da Rocha': 144, Caraguatatuba: 134,
  Jaú: 133, Araras: 130, Votorantim: 127, Valinhos: 126, Sertãozinho: 126, Tatuí: 123, Barretos: 122, Itatiba: 121, Salto: 120,
  Birigui: 118, Jandira: 118, 'Várzea Paulista': 117, 'Ribeirão Pires': 115, Catanduva: 115, Guaratinguetá: 115, Cubatão: 112, 'Itanhaém': 112,
  Paulínia: 110, Ourinhos: 103, 'Poá': 103, Assis: 101, Leme: 98, Votuporanga: 96, Caieiras: 95, Mairiporã: 93, 'São João da Boa Vista': 92,
  'Mogi Mirim': 92, Ubatuba: 92, Avaré: 89, Itapeva: 89, Arujá: 86, Lorena: 84, Matão: 79, 'Campo Limpo Paulista': 77, Lins: 77,
  Bebedouro: 76, Vinhedo: 76, Cruzeiro: 74, Jaboticabal: 71, 'Peruíbe': 69, Fernandópolis: 69, Mococa: 67, 'Bertioga': 64, Tupã: 63,
  'Nova Odessa': 62, Penápolis: 61, 'Lençóis Paulista': 61, Batatais: 58, Andradina: 56, Registro: 56, Olímpia: 55, Jales: 48, Dracena: 46,
  'Capão Bonito': 46, Adamantina: 34, 'Ilha Solteira': 25,
};

/** Porte das cidades pequenas: log-normal com mediana perto de 12 mil e quase todas entre 3 mil e 50 mil habitantes. */
function populacaoDe(id: string, nome: string) {
  if (populacaoMil[nome]) return populacaoMil[nome] * 1000;
  const u = Math.min(0.999, Math.max(0.001, chance(`pop:${id}`))), z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * chance(`pop2:${id}`));
  return Math.round(Math.min(60_000, Math.max(1_000, 12_000 * Math.exp(0.75 * z))));
}
type Feature = { properties: { codarea: string; name: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } };
const cache = new WeakMap<Dataset, Municipio[]>();
export function municipiosSp(dataset: Dataset): Municipio[] {
  const saved = cache.get(dataset); if (saved) return saved;
  const features = (geometria as unknown as { features: Feature[] }).features;
  const centros = features.map(feature => {
    const aneis = feature.geometry.type === 'MultiPolygon' ? (feature.geometry.coordinates as number[][][][]).map(poligono => poligono[0]) : [(feature.geometry.coordinates as number[][][])[0]];
    const anel = aneis.reduce((maior, atual) => atual.length > maior.length ? atual : maior, aneis[0]);
    return [anel.reduce((total, ponto) => total + ponto[0], 0) / anel.length, anel.reduce((total, ponto) => total + ponto[1], 0) / anel.length] as [number, number];
  });
  const porNome = new Map(features.map((feature, index) => [feature.properties.name, centros[index]]));
  const sedes = dataset.cities.map(city => ({ greId: city.greId, at: porNome.get(city.name) })).filter((sede): sede is { greId: string; at: [number, number] } => Boolean(sede.at));
  const lista = features.map((feature, index) => {
    const [x, y] = centros[index], nome = feature.properties.name, id = feature.properties.codarea;
    const oficial = (greMunicipios as unknown as Record<string, [number, string]>)[id];
    let greId = oficial ? `GRE${oficial[0]}` : sedes[0].greId, distancia = Infinity;
    if (!oficial) for (const sede of sedes) { const dx = (sede.at[0] - x) * Math.cos(y * Math.PI / 180), dy = sede.at[1] - y, d = dx * dx + dy * dy; if (d < distancia) { distancia = d; greId = sede.greId; } }
    const populacao = populacaoDe(id, nome);
    return { id, nome, greId, ugi: oficial?.[1] ?? null, populacao, centro: centros[index] };
  });
  cache.set(dataset, lista); return lista;
}
/** Município pelo código do IBGE (o mesmo id das cidades-sede em dataset.cities). */
const porIdCache = new WeakMap<Dataset, Map<string, Municipio>>();
export function municipioPorId(dataset: Dataset): Map<string, Municipio> { let saved = porIdCache.get(dataset); if (!saved) { saved = new Map(municipiosSp(dataset).map(row => [row.id, row])); porIdCache.set(dataset, saved); } return saved; }
/** População demonstrativa de um município pelo código do IBGE (a mesma usada para espalhar os profissionais). */
let populacoes: Map<string, number> | null = null;
export function populacaoMunicipio(id: string): number | undefined {
  populacoes ??= new Map((geometria as unknown as { features: Feature[] }).features.map(feature => [feature.properties.codarea, populacaoDe(feature.properties.codarea, feature.properties.name)]));
  return populacoes.get(id);
}
export const nomesForaDaMalha = () => Object.keys(populacaoMil).filter(nome => !(geometria as unknown as { features: Feature[] }).features.some(feature => feature.properties.name === nome));
