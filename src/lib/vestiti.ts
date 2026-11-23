// Vestiti che gli animali si fanno da soli crescendo. Giada non compra niente: è una sorpresa.
// Ogni capo è una combinazione di forma (berretto, salopette, cravatta...), colore e motivo
// (righe, quadri, pois...): migliaia di combinazioni, e ognuno ha i suoi gusti.
// Chi ha un mestiere, mentre lavora, si mette la divisa (vedi mestieri.ts).
import { hash, rng } from './caso';
import type { Animale, Virtu } from './tipi';
import { VIRTU } from './tipi';

export type Parte = 'collo' | 'testa' | 'corpo' | 'schiena';
export type Motivo = 'tinta' | 'righe' | 'quadri' | 'pois' | 'cuori' | 'stelle' | 'macchie' | 'bande';

export interface Forma {
  id: string;
  parte: Parte;
  nome: string; // "berretto di lana", "salopette"...
  f: boolean; // femminile ("una salopette rossa")
  motivi: boolean; // si può fare a righe, quadri, pois
  lavoro?: boolean; // solo per le divise da lavoro
  raro?: boolean; // capita poco (i cappelli "da fiaba")
}

const fo = (id: string, parte: Parte, nome: string, f: boolean, motivi = true, extra: Partial<Forma> = {}): Forma => ({ id, parte, nome, f, motivi, ...extra });

export const FORME: Forma[] = [
  // testa
  fo('berretto', 'testa', 'berretto di lana col pompon', false),
  fo('cuffia', 'testa', 'cuffia coi paraorecchie', true),
  fo('paglia', 'testa', 'cappello di paglia', false, false),
  fo('coppola', 'testa', 'coppola', true),
  fo('bombetta', 'testa', 'bombetta', true, false),
  fo('basco', 'testa', 'basco', false),
  fo('fazzoletto', 'testa', 'fazzoletto in testa', false),
  fo('fiocco', 'testa', 'fiocco', false),
  fo('pescatora', 'testa', 'cappello da pioggia', false),
  fo('visiera', 'testa', 'cappellino con la visiera', false),
  fo('tesa', 'testa', 'cappello con la tesa', false, false),
  fo('fascia-testa', 'testa', 'fascia per la fronte', true),
  fo('puntuto', 'testa', 'berretto a punta', false, true, { raro: true }),
  fo('piuma', 'testa', 'cappello con la piuma', false, false, { raro: true }),
  // collo
  fo('sciarpa', 'collo', 'sciarpa', true),
  fo('bandana', 'collo', 'bandana', true),
  fo('papillon', 'collo', 'papillon', false),
  fo('cravatta', 'collo', 'cravatta', true),
  fo('collana', 'collo', 'collana di perline', true, false),
  fo('colletto', 'collo', 'colletto tondo', false),
  fo('foulard', 'collo', 'foulard', false),
  fo('fazzoletto-collo', 'collo', 'fazzoletto al collo', false),
  // corpo
  fo('maglione', 'corpo', 'maglione', false),
  fo('gilet', 'corpo', 'gilet', false),
  fo('salopette', 'corpo', 'salopette', true),
  fo('camicia', 'corpo', 'camicia', true),
  fo('felpa', 'corpo', 'felpa col cappuccio', true),
  fo('giacca', 'corpo', 'giacca coi bottoni', true),
  fo('vestitino', 'corpo', 'vestitino a campana', false),
  fo('canottiera', 'corpo', 'maglietta', true),
  // schiena
  fo('zainetto', 'schiena', 'zainetto', false),
  fo('mantella', 'schiena', 'mantella', true, true, { raro: true }),
  fo('tracolla', 'schiena', 'borsa a tracolla', true),
  fo('cestino', 'schiena', 'cestino da portare in spalla', false, false),
  fo('marsupio', 'schiena', 'marsupio', false),
  // solo da lavoro
  fo('casco', 'testa', 'casco da moto', false, false, { lavoro: true }),
  fo('toque', 'testa', 'cappello da cuoco', false, false, { lavoro: true }),
  fo('bustina', 'testa', 'cappellino da fornaio', true, false, { lavoro: true }),
  fo('elmo', 'testa', 'elmo da pompiere', false, false, { lavoro: true }),
  fo('cerata-cappello', 'testa', 'cappello impermeabile', false, false, { lavoro: true }),
  fo('velo', 'testa', 'cappello con il velo per le api', false, false, { lavoro: true }),
  fo('caschetto', 'testa', 'caschetto da cantiere', false, false, { lavoro: true }),
  fo('coloniale', 'testa', 'casco da esploratore', false, false, { lavoro: true }),
  fo('occhialoni', 'testa', 'occhialoni da inventore', false, false, { lavoro: true }),
  fo('stetoscopio', 'collo', 'stetoscopio', false, false, { lavoro: true }),
  fo('metro', 'collo', 'metro da sarta', false, false, { lavoro: true }),
  fo('macchina-foto', 'collo', 'macchina fotografica', true, false, { lavoro: true }),
  fo('fascia', 'collo', 'fascia da sindaco', true, false, { lavoro: true }),
  fo('fischietto', 'collo', 'fischietto', false, false, { lavoro: true }),
  fo('grembiule', 'corpo', 'grembiule', false, true, { lavoro: true }),
  fo('giubbotto', 'corpo', 'giubbotto di pelle', false, false, { lavoro: true }),
  fo('cerata', 'corpo', 'cerata', true, false, { lavoro: true }),
  fo('camice', 'corpo', 'camice', false, false, { lavoro: true }),
  fo('tuta', 'corpo', 'tuta da lavoro', true, false, { lavoro: true }),
  fo('giaccone', 'corpo', 'giaccone da pompiere', false, true, { lavoro: true }),
  fo('sacca', 'schiena', 'sacca della posta', true, false, { lavoro: true }),
];

const FORMA = new Map(FORME.map((x) => [x.id, x]));

export interface Colore { hex: string; m: string; f: string }
export const COLORI: Record<string, Colore> = {
  rosso: { hex: '#d8443a', m: 'rosso', f: 'rossa' },
  arancio: { hex: '#f08a30', m: 'arancione', f: 'arancione' },
  giallo: { hex: '#f2c230', m: 'giallo', f: 'gialla' },
  senape: { hex: '#c8a030', m: 'color senape', f: 'color senape' },
  verde: { hex: '#4f9a5a', m: 'verde', f: 'verde' },
  menta: { hex: '#7ad0b0', m: 'verde menta', f: 'verde menta' },
  turchese: { hex: '#30a8b0', m: 'turchese', f: 'turchese' },
  azzurro: { hex: '#7fb8e8', m: 'azzurro', f: 'azzurra' },
  blu: { hex: '#3a5aa8', m: 'blu', f: 'blu' },
  viola: { hex: '#8a5ac8', m: 'viola', f: 'viola' },
  lilla: { hex: '#c0a0e0', m: 'lilla', f: 'lilla' },
  rosa: { hex: '#f28aa8', m: 'rosa', f: 'rosa' },
  bordeaux: { hex: '#8a2a3a', m: 'bordeaux', f: 'bordeaux' },
  marrone: { hex: '#8a5a36', m: 'marrone', f: 'marrone' },
  panna: { hex: '#f4ecd8', m: 'color panna', f: 'color panna' },
  bianco: { hex: '#fbfbf6', m: 'bianco', f: 'bianca' },
  grigio: { hex: '#8a8a90', m: 'grigio', f: 'grigia' },
  nero: { hex: '#2e2a2e', m: 'nero', f: 'nera' },
};

const NOMI_MOTIVO: Record<Motivo, string> = {
  tinta: '', righe: ' a righe', quadri: ' a quadri', pois: ' a pois', cuori: ' con i cuoricini', stelle: ' con le stelline', macchie: ' tutto macchiato', bande: ' con le bande',
};

/** I colori che piacciono a chi è nutrito di una certa virtù. */
const GUSTI: Record<Virtu, string[]> = {
  coraggio: ['rosso', 'arancio', 'marrone', 'senape', 'nero'],
  umanita: ['rosa', 'lilla', 'rosso', 'panna', 'bordeaux'],
  saggezza: ['blu', 'viola', 'turchese', 'grigio', 'bordeaux'],
  giustizia: ['verde', 'marrone', 'blu', 'senape', 'panna'],
  temperanza: ['menta', 'verde', 'azzurro', 'panna', 'turchese'],
  trascendenza: ['azzurro', 'giallo', 'lilla', 'turchese', 'rosa'],
};
const MOTIVI_LIBERI: Motivo[] = ['tinta', 'tinta', 'tinta', 'righe', 'righe', 'quadri', 'pois', 'cuori', 'stelle'];
const SECONDI = ['panna', 'bianco', 'giallo', 'rosso', 'blu', 'verde', 'rosa', 'nero'];

export interface Capo {
  id: string; // "forma:colore:motivo:colore2"
  forma: string;
  parte: Parte;
  colore: string; // esadecimale
  colore2: string;
  motivo: Motivo;
  nome: string; // "una sciarpa gialla a righe"
  virtu?: Virtu; // il gusto da cui è nato
}

/** Legge un capo dal suo id ("sciarpa:giallo:righe:panna"). */
export function capo(id: string): Capo | undefined {
  const [f, c, m = 'tinta', c2 = 'panna', v] = id.split(':');
  const forma = FORMA.get(f);
  const col = COLORI[c];
  if (!forma || !col) return undefined;
  const motivo = (m in NOMI_MOTIVO ? m : 'tinta') as Motivo;
  const art = forma.f ? 'una' : 'un';
  const agg = forma.f ? col.f : col.m;
  const nomeMotivo = forma.f && motivo === 'macchie' ? ' tutta macchiata' : NOMI_MOTIVO[motivo];
  return {
    id, forma: f, parte: forma.parte, colore: col.hex, colore2: (COLORI[c2] ?? COLORI.panna).hex, motivo,
    nome: `${art} ${forma.nome} ${agg}${nomeMotivo}`,
    virtu: (VIRTU as readonly string[]).includes(v) ? (v as Virtu) : undefined,
  };
}

/** Quando si fa un capo nuovo (punti di crescita): una sciarpetta già da cucciolo dopo pochi giorni, poi via via per un anno e più. */
export const SOGLIE_CAPI = [10, 35, 80, 140, 240, 360, 500, 660, 840];
const ORDINE_PARTI: Parte[] = ['collo', 'testa', 'corpo', 'schiena'];

/** Il carattere di oggi: le virtù dalla più nutrita alla meno. */
function caratteri(a: Animale): Virtu[] {
  return [...VIRTU].sort((x, y) => (a.nutrimento?.[y] ?? 0) - (a.nutrimento?.[x] ?? 0));
}

/**
 * Il prossimo capo che l'animale si fa: prima riempie collo, testa, corpo e schiena, poi rinnova.
 * Forma, colore e motivo dipendono da chi è (sempre gli stessi per lo stesso animale) e dai suoi gusti.
 */
export function prossimoCapo(a: Animale, giaFatti: string[]): Capo {
  const n = giaFatti.length;
  const parte = ORDINE_PARTI[n % ORDINE_PARTI.length];
  const r = rng(hash(`${a.id}:capo:${n}`));
  const virtu = caratteri(a)[r() < 0.75 ? 0 : 1];
  const gia = giaFatti.map((id) => id.split(':')[0]);
  const forme = FORME.filter((x) => x.parte === parte && !x.lavoro && !gia.includes(x.id) && (!x.raro || r() < 0.25));
  const tutte = forme.length ? forme : FORME.filter((x) => x.parte === parte && !x.lavoro);
  const forma = tutte[Math.floor(r() * tutte.length)];
  const gusti = GUSTI[virtu];
  const colore = r() < 0.8 ? gusti[Math.floor(r() * gusti.length)] : Object.keys(COLORI)[Math.floor(r() * Object.keys(COLORI).length)];
  const motivo: Motivo = forma.motivi ? MOTIVI_LIBERI[Math.floor(r() * MOTIVI_LIBERI.length)] : 'tinta';
  const secondi = SECONDI.filter((c) => c !== colore);
  const colore2 = secondi[Math.floor(r() * secondi.length)];
  return capo(`${forma.id}:${colore}:${motivo}:${colore2}:${virtu}`)!;
}

/**
 * Capi nuovi da aggiungere ora (in base ai punti di crescita). Restituisce solo quelli nuovi;
 * per gli animali che non avevano ancora il guardaroba (o lo avevano del tipo vecchio) lo rifà senza annunciarlo.
 */
export function aggiornaGuardaroba(a: Animale): Capo[] {
  if (a.fase === 'uovo') {
    a.vestiti ??= [];
    return [];
  }
  const vecchio = a.vestiti?.some((id) => !capo(id));
  const primaVolta = !a.vestiti || vecchio;
  const fatti = vecchio ? [] : (a.vestiti ?? []);
  const nuovi: Capo[] = [];
  const dovuti = SOGLIE_CAPI.filter((s) => a.xp >= s).length;
  while (fatti.length < dovuti) {
    const k = prossimoCapo(a, fatti);
    fatti.push(k.id);
    nuovi.push(k);
  }
  a.vestiti = fatti;
  return primaVolta ? [] : nuovi;
}

/** Cosa indossa adesso: per ogni parte, l'ultimo capo fatto. */
export function indossati(a: Animale): Capo[] {
  const perParte = new Map<Parte, Capo>();
  for (const id of a.vestiti ?? []) {
    const k = capo(id);
    if (k) perParte.set(k.parte, k);
  }
  return [...perParte.values()];
}

/** Vestiti più la divisa da lavoro: la divisa prende il posto dei capi sulla stessa parte. */
export function conDivisa(capi: Capo[], divisa: Partial<Record<Parte, string>> | undefined): Capo[] {
  if (!divisa) return capi;
  const perParte = new Map<Parte, Capo>(capi.map((k) => [k.parte, k]));
  for (const id of Object.values(divisa)) {
    const k = id ? capo(id) : undefined;
    if (k) perParte.set(k.parte, k);
  }
  return [...perParte.values()];
}
