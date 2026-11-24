// I funghi: Giada manda un animale a cercarli nel bosco. Sta via un po' (o fino al giorno dopo)
// e torna con il cestino: specie vere, diverse a seconda della stagione, alcune rare.
// Con i funghi Giada può: esporli nella sala dei funghi del museo, cucinarli lei,
// o darli a un animale che fa il cuoco (che prepara un piatto speciale e guadagna castagne).
// Quelli velenosi non si cucinano: si guardano e basta.
import { hash, rng } from './caso';
import { defMestiere } from './mestieri';
import type { Animale, StatoGioco } from './tipi';

export type FormaFungo =
  | 'porcino' | 'ombrello' | 'imbuto' | 'gruppetto' | 'mazza' | 'spugna' | 'mensola' | 'orecchio'
  | 'tartufo' | 'gabbia' | 'corallo' | 'palla';

export interface DefFungo {
  id: string;
  nome: string;
  latino: string;
  cappello: string;
  gambo: string;
  forma: FormaFungo;
  pois?: boolean; // macchie bianche sul cappello
  raro: number; // 1 comune … 5 rarissimo
  mesi: number[]; // quando si trova (1 = gennaio)
  mangia: 'si' | 'no' | 'veleno'; // buono da mangiare, non buono, velenoso
  piatto?: string; // cosa ci si cucina
  frase: string;
}

const TUTTO_ANNO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const FUNGHI: DefFungo[] = [
  { id: 'porcino', nome: 'Porcino', latino: 'Boletus edulis', cappello: '#8a5a2a', gambo: '#efe2c4', forma: 'porcino', raro: 3, mesi: [6, 7, 8, 9, 10, 11], mangia: 'si', piatto: 'risotto ai porcini', frase: 'Il re del bosco: cappello marrone e gambo bello grosso.' },
  { id: 'finferlo', nome: 'Finferlo', latino: 'Cantharellus cibarius', cappello: '#f0b030', gambo: '#f0b84a', forma: 'imbuto', raro: 2, mesi: [6, 7, 8, 9, 10], mangia: 'si', piatto: 'tagliatelle ai finferli', frase: 'Giallo come un tuorlo, profuma di albicocca.' },
  { id: 'chiodino', nome: 'Chiodini', latino: 'Armillaria mellea', cappello: '#c8a050', gambo: '#e8d8a8', forma: 'gruppetto', raro: 1, mesi: [9, 10, 11], mangia: 'si', piatto: 'polenta coi chiodini', frase: 'Crescono tutti insieme sui ceppi, come una famiglia.' },
  { id: 'mazza', nome: 'Mazza di tamburo', latino: 'Macrolepiota procera', cappello: '#c8b090', gambo: '#e8dcc4', forma: 'mazza', raro: 2, mesi: [8, 9, 10, 11], mangia: 'si', piatto: 'cotoletta di mazza di tamburo', frase: 'Alto alto, con il cappello grande come un ombrello.' },
  { id: 'prataiolo', nome: 'Prataiolo', latino: 'Agaricus campestris', cappello: '#f4efe6', gambo: '#f8f4ec', forma: 'ombrello', raro: 1, mesi: [4, 5, 6, 7, 8, 9, 10], mangia: 'si', piatto: 'zuppa di prataioli', frase: 'Bianco bianco, cresce nei prati dopo la pioggia.' },
  { id: 'ovolo', nome: 'Ovolo buono', latino: 'Amanita caesarea', cappello: '#f07020', gambo: '#f0d040', forma: 'ombrello', raro: 4, mesi: [7, 8, 9, 10], mangia: 'si', piatto: 'insalata di ovoli', frase: 'Nasce da un uovo bianco! Lo mangiavano gli imperatori romani.' },
  { id: 'spugnola', nome: 'Spugnola', latino: 'Morchella esculenta', cappello: '#b09060', gambo: '#f0e6d0', forma: 'spugna', raro: 3, mesi: [3, 4, 5], mangia: 'si', piatto: 'crostini con le spugnole', frase: 'Sembra una spugna, e arriva con la primavera.' },
  { id: 'trombetta', nome: 'Trombetta dei morti', latino: 'Craterellus cornucopioides', cappello: '#3a3030', gambo: '#4a4040', forma: 'imbuto', raro: 3, mesi: [8, 9, 10, 11], mangia: 'si', piatto: 'pasta alle trombette', frase: 'Nera come una trombetta: ha un nome serio ma è buonissima.' },
  { id: 'orecchione', nome: 'Orecchione', latino: 'Pleurotus ostreatus', cappello: '#9a9aa8', gambo: '#e8e8ec', forma: 'mensola', raro: 1, mesi: [10, 11, 12, 1, 2], mangia: 'si', piatto: 'orecchioni impanati', frase: 'Cresce sui tronchi anche quando fa freddo.' },
  { id: 'inverno', nome: "Fungo dell'inverno", latino: 'Flammulina velutipes', cappello: '#e0902a', gambo: '#5a3a20', forma: 'gruppetto', raro: 2, mesi: [11, 12, 1, 2, 3], mangia: 'si', piatto: "brodo caldo dell'inverno", frase: 'Non ha paura della neve: spunta proprio col gelo.' },
  { id: 'giuda', nome: 'Orecchio di Giuda', latino: 'Auricularia auricula-judae', cappello: '#7a3a2a', gambo: '#7a3a2a', forma: 'orecchio', raro: 2, mesi: TUTTO_ANNO, mangia: 'si', piatto: 'zuppa agrodolce', frase: "Morbido come un'orecchietta, cresce sui sambuchi." },
  { id: 'tartufo-bianco', nome: 'Tartufo bianco', latino: 'Tuber magnatum', cappello: '#e8dcc0', gambo: '#e8dcc0', forma: 'tartufo', raro: 5, mesi: [10, 11, 12], mangia: 'si', piatto: 'uovo al tegamino col tartufo', frase: 'Nascosto sotto terra, profuma tantissimo. Rarissimo!' },
  { id: 'tartufo-nero', nome: 'Tartufo nero', latino: 'Tuber melanosporum', cappello: '#2a2420', gambo: '#2a2420', forma: 'tartufo', raro: 4, mesi: [12, 1, 2, 3], mangia: 'si', piatto: 'crostone al tartufo nero', frase: "Un tesoro nero sotto le querce d'inverno." },
  { id: 'lingua', nome: 'Lingua di bue', latino: 'Fistulina hepatica', cappello: '#b02a2a', gambo: '#b02a2a', forma: 'mensola', raro: 3, mesi: [8, 9, 10], mangia: 'si', piatto: 'lingua di bue in padella', frase: 'Rossa e morbida, cresce sui castagni come una linguaccia!' },
  { id: 'muscaria', nome: 'Ovolo malefico', latino: 'Amanita muscaria', cappello: '#e02a20', gambo: '#f8f4ec', forma: 'ombrello', pois: true, raro: 2, mesi: [8, 9, 10, 11], mangia: 'veleno', frase: 'Il fungo delle fiabe, rosso a pois bianchi. Bellissimo, ma velenoso!' },
  { id: 'falloide', nome: 'Tignosa verdognola', latino: 'Amanita phalloides', cappello: '#a8b080', gambo: '#f0f0e0', forma: 'ombrello', raro: 3, mesi: [7, 8, 9, 10, 11], mangia: 'veleno', frase: 'Il fungo più pericoloso del bosco: non va mai toccato.' },
  { id: 'olivo', nome: "Fungo dell'olivo", latino: 'Omphalotus olearius', cappello: '#f08a20', gambo: '#e07a18', forma: 'imbuto', raro: 4, mesi: [8, 9, 10, 11], mangia: 'veleno', frase: 'Di notte le sue lamelle brillano piano piano. Velenoso!' },
  { id: 'tacchino', nome: 'Coda di tacchino', latino: 'Trametes versicolor', cappello: '#8a7a6a', gambo: '#8a7a6a', forma: 'mensola', raro: 1, mesi: TUTTO_ANNO, mangia: 'no', frase: 'Ha le righe colorate come la coda di un tacchino.' },
  { id: 'esca', nome: 'Fungo esca', latino: 'Fomes fomentarius', cappello: '#8a8070', gambo: '#8a8070', forma: 'mensola', raro: 2, mesi: TUTTO_ANNO, mangia: 'no', frase: 'Duro come il legno: una volta si usava per accendere il fuoco.' },
  { id: 'gabbia', nome: 'Fungo gabbia', latino: 'Clathrus ruber', cappello: '#e8483a', gambo: '#f4ece0', forma: 'gabbia', raro: 4, mesi: [6, 7, 8, 9, 10], mangia: 'no', frase: "Sembra una gabbietta rossa… e puzza un po'!" },
  { id: 'ditola', nome: 'Ditola gialla', latino: 'Ramaria flava', cappello: '#f0c850', gambo: '#f4e4b0', forma: 'corallo', raro: 3, mesi: [8, 9, 10], mangia: 'no', frase: 'Sembra un corallo del mare, ma sta nel bosco.' },
  { id: 'vescia', nome: 'Vescia', latino: 'Lycoperdon perlatum', cappello: '#ece4d0', gambo: '#ece4d0', forma: 'palla', raro: 1, mesi: [7, 8, 9, 10, 11], mangia: 'no', frase: 'Se la tocchi sbuffa una nuvoletta di polvere!' },
];
export const FUNGO = Object.fromEntries(FUNGHI.map((f) => [f.id, f])) as Record<string, DefFungo>;

/** Chi è a funghi in questo momento. */
export interface Cercatore {
  animale: string;
  parte: number; // quando è partito (ms)
  torna: number; // quando torna (ms)
  data: string; // il giorno in cui è partito: il giorno dopo è tornato di sicuro
}

/** Cosa ha portato chi torna dal bosco. */
export interface Rientro {
  animale: string;
  funghi: Record<string, number>;
  ritrovamento: string | null; // ogni tanto trova anche qualcosa per il museo (vedi museo.ts)
}

export interface Funghi {
  fuori: Cercatore[];
  cestino: Record<string, number>; // i funghi che Giada ha da parte
  trovati: Record<string, number>; // quanti ne sono stati trovati in tutto, per specie
  uscite: Record<string, string>; // animale → ultimo giorno in cui è andato a funghi
  piatti: number; // quanti piatti di funghi sono stati cucinati
  avvisato?: boolean; // il corvo ha già detto che nella vita vera si va solo con un grande
}

/** Al massimo quanti animali nel bosco insieme. */
export const FUORI_MAX = 3;
/** Quanto sta via (minuti): chi è bravo torna prima. */
export const MINUTI = { normale: 20, bravo: 12 };
/** Quanti funghi servono (al massimo) per un piatto: si usano tutti quelli di quel tipo, fino a 3. */
export const PER_PIATTO = 3;

/** I mestieri che cucinano. */
export const CUOCHI = ['cuoco', 'fornaio', 'pasticcere', 'locandiere'];

export function funghiDi(s: StatoGioco): Funghi {
  s.funghi ??= { fuori: [], cestino: {}, trovati: {}, uscite: {}, piatti: 0 };
  return s.funghi;
}

/** Chi conosce il bosco trova di più e torna prima. */
export function bravoAiFunghi(a: Pick<Animale, 'abilita' | 'mestiere'>): boolean {
  return a.abilita.includes('raccogliere') || ['guardaboschi', 'esploratore', 'contadino', 'giardiniere', 'guaritore', 'cuoco'].includes(defMestiere(a.mestiere)?.id ?? '');
}

export function eFuori(s: StatoGioco, id: string): boolean {
  return !!s.funghi?.fuori.some((c) => c.animale === id);
}

/** Perché un animale non può andare a funghi adesso (null = può andare). */
export function motivoNo(s: StatoGioco, a: Animale, oggi: string): string | null {
  if (a.fase === 'uovo') return 'è ancora un uovo';
  if (a.fase === 'cucciolo') return 'è troppo piccolo per il bosco';
  if (a.addormentato) return 'sta dormendo';
  if (eFuori(s, a.id)) return 'è già nel bosco';
  if (s.funghi?.uscite[a.id] === oggi) return 'ci è già andato oggi';
  if ((s.funghi?.fuori.length ?? 0) >= FUORI_MAX) return `nel bosco ce ne sono già ${FUORI_MAX}`;
  return null;
}

/** Manda un animale a funghi. */
export function mandaAFunghi(s: StatoGioco, id: string, adesso: number, oggi: string): Cercatore | null {
  const a = s.animali.find((x) => x.id === id);
  if (!a || motivoNo(s, a, oggi)) return null;
  const f = funghiDi(s);
  const minuti = bravoAiFunghi(a) ? MINUTI.bravo : MINUTI.normale;
  const c: Cercatore = { animale: id, parte: adesso, torna: adesso + minuti * 60_000, data: oggi };
  f.fuori.push(c);
  f.uscite[id] = oggi;
  return c;
}

/** Quanti minuti mancano al ritorno (almeno 1 finché non è tornato). */
export function minutiAlRitorno(c: Cercatore, adesso: number): number {
  return Math.max(1, Math.ceil((c.torna - adesso) / 60_000));
}

/** Il mese di una data AAAA-MM-GG. */
const meseDi = (data: string) => Number(data.slice(5, 7));

/** I funghi che si trovano in quel mese. */
export function funghiDelMese(mese: number): DefFungo[] {
  return FUNGHI.filter((f) => f.mesi.includes(mese));
}

/** La stagione dei funghi: d'autunno se ne trovano tanti, d'inverno pochi. */
export function abbondanza(mese: number): number {
  return [9, 10, 11].includes(mese) ? 2 : [6, 7, 8].includes(mese) ? 1 : 0;
}

/**
 * Cosa trova nel bosco: da 2 a 5 funghi (di più in autunno e se è bravo); i rari capitano di rado,
 * chi è bravo li trova un po' più spesso. `r` dà i numeri a caso (nelle prove è fisso).
 */
export function raccolto(mese: number, bravo: boolean, r: () => number): Record<string, number> {
  const lista = funghiDelMese(mese);
  const out: Record<string, number> = {};
  if (!lista.length) return out;
  const esp = bravo ? 1.5 : 2;
  const pesi = lista.map((f) => 1 / Math.pow(f.raro, esp));
  const tot = pesi.reduce((a, b) => a + b, 0);
  const n = 2 + abbondanza(mese) + (bravo ? 1 : 0) - (r() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    let x = r() * tot;
    let f = lista[lista.length - 1];
    for (let k = 0; k < lista.length; k++) {
      x -= pesi[k];
      if (x < 0) { f = lista[k]; break; }
    }
    out[f.id] = (out[f.id] ?? 0) + 1;
  }
  return out;
}

/**
 * Chi è tornato dal bosco (il tempo è passato, o è già un altro giorno): mette i funghi nel cestino
 * e restituisce cosa ha portato ognuno. `trova` sceglie un ritrovamento per il museo (vedi museo.ts).
 */
export function rientri(s: StatoGioco, adesso: number, oggi: string, trova?: (r: () => number) => string | null): Rientro[] {
  const f = s.funghi;
  if (!f?.fuori.length) return [];
  const out: Rientro[] = [];
  f.fuori = f.fuori.filter((c) => {
    if (c.torna > adesso && c.data === oggi) return true;
    const a = s.animali.find((x) => x.id === c.animale);
    if (!a) return false;
    const r = rng(hash(`${s.inizio}|funghi|${c.animale}|${c.parte}`));
    const funghi = raccolto(meseDi(c.data), bravoAiFunghi(a), r);
    for (const [id, n] of Object.entries(funghi)) {
      f.cestino[id] = (f.cestino[id] ?? 0) + n;
      f.trovati[id] = (f.trovati[id] ?? 0) + n;
    }
    const ritrovamento = trova && r() < 0.25 ? trova(r) : null;
    out.push({ animale: c.animale, funghi, ritrovamento });
    return false;
  });
  return out;
}

/** Fa tornare subito chi è nel bosco (solo per le prove). */
export function richiamaTutti(s: StatoGioco) {
  for (const c of s.funghi?.fuori ?? []) c.torna = 0;
}

/** Chi può cucinare i funghi: Giada, e gli animali che fanno i cuochi (svegli). */
export function cuochi(s: StatoGioco): Animale[] {
  return s.animali.filter((a) => a.fase !== 'uovo' && !a.addormentato && !eFuori(s, a.id) && CUOCHI.includes(defMestiere(a.mestiere)?.id ?? ''));
}

export interface Piatto {
  nome: string;
  funghi: number; // quanti ne ha usati
  castagne: number; // quante ne guadagna Giada (il piatto si vende nella bottega)
  umore: number; // quanto sono più contenti tutti
  cuoco: string | null; // null = l'ha cucinato Giada
}

/**
 * Cucina i funghi di un tipo (fino a 3). Se cucina Giada è un piatto semplice che fa un po' contenti tutti;
 * se lo prepara un animale cuoco è un piatto speciale: tutti più contenti e la bottega lo vende (castagne).
 */
export function cucina(s: StatoGioco, fungo: string, cuoco: string | null): Piatto | null {
  const d = FUNGO[fungo];
  const f = s.funghi;
  const n = Math.min(PER_PIATTO, f?.cestino[fungo] ?? 0);
  if (!d || !f || !n || d.mangia !== 'si') return null;
  const chi = cuoco ? cuochi(s).find((a) => a.id === cuoco) : null;
  if (cuoco && !chi) return null;
  f.cestino[fungo] -= n;
  if (!f.cestino[fungo]) delete f.cestino[fungo];
  f.piatti += 1;
  const umore = chi ? 6 + n * 2 : 2 + n;
  const castagne = chi ? n * (1 + d.raro) : 0;
  for (const a of s.animali) if (a.fase !== 'uovo') a.umore = Math.min(100, a.umore + umore);
  if (chi) chi.umore = Math.min(100, chi.umore + 5);
  s.ghiande += castagne;
  return { nome: d.piatto ?? 'zuppa di funghi', funghi: n, castagne, umore, cuoco: chi?.id ?? null };
}

/** Rimette un fungo nel bosco (per quelli che non servono). */
export function lasciaNelBosco(s: StatoGioco, fungo: string): boolean {
  const f = s.funghi;
  if (!f?.cestino[fungo]) return false;
  f.cestino[fungo] -= 1;
  if (!f.cestino[fungo]) delete f.cestino[fungo];
  return true;
}
