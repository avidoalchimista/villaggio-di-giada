// Arredare il villaggio: Giada sposta le cose, toglie alberi e fiori, fa aiuole e semina,
// dipinge quadretti e disegna il sentiero. Tutto salvato in `stato.arredo`.
import { aggiungiGiorni, giorniTra } from './date';
import type { StatoGioco } from './tipi';

export interface Posto { x: number; z: number; r: number }
export interface Pianta { specie: string; piantata: string }
export interface Aiuola extends Posto { id: string; piante: (Pianta | null)[] }
export interface Quadretto extends Posto { id: string; disegno: string; cornice: number; fatto: string }

export type TipoFila = 'recinto' | 'siepe' | 'muretto' | 'lampione' | 'paletti';
export interface Oggetto extends Posto { id: string; tipo: 'cartello' | TipoFila; testo?: string }

export interface Arredo {
  /** dove Giada ha messo le cose: 'c:panchina', 'e:chiosco', 'b:<id animale>', 'castagno' */
  posti: Record<string, Posto>;
  /**
   * punti dove ha tolto alberi, fiori, sassi, cespugli: lì resta libero per tanto tempo
   * (con la data: dopo GIORNI_RICRESCITA giorni, se non c'è stato costruito niente, la natura ritorna)
   */
  tolti: [number, number, string?][];
  /** il terreno modellato con la pala: vertici ogni mezzo metro "i,j" → altezza in centimetri (sotto zero = acqua) */
  terreno?: Record<string, number>;
  /** dove Giada ha versato l'acqua nelle buche scavate: vertici "i,j" (la pala fa solo buche asciutte) */
  acqua?: Record<string, 1>;
  aiuole: Aiuola[];
  semi: Record<string, number>;
  quadretti: Quadretto[];
  /** cartelli e pezzi di recinto messi da Giada */
  oggetti: Oggetto[];
  /** le case che c'erano prima di "dove la metto?" hanno avuto il loro posto fissato (non si chiede per quelle) */
  caseFissate?: boolean;
  /** le case fissate prima delle postazioni di lavoro sono state allargate (almeno 8 metri l'una dall'altra) */
  caseLarghe?: boolean;
  /** celle da mezzo metro "i,j" → materiale (1 terra, 2 sassi, 3 mattoni, 4 ghiaia); null = sentiero di base */
  sentiero: Record<string, number> | null;
}

export function arredoVuoto(): Arredo {
  return { posti: {}, tolti: [], aiuole: [], semi: {}, quadretti: [], oggetti: [], sentiero: null };
}

export function arredoDi(s: StatoGioco): Arredo {
  s.arredo ??= arredoVuoto();
  s.arredo.oggetti ??= [];
  // i laghetti scavati prima che la pala facesse solo buche asciutte: l'acqua che c'era resta
  if (s.arredo.terreno && !s.arredo.acqua) {
    const acqua: Record<string, 1> = {};
    for (const [k, h] of Object.entries(s.arredo.terreno)) if (h / 100 < LIVELLO_ACQUA) acqua[k] = 1;
    s.arredo.acqua = acqua;
  }
  return s.arredo;
}

// ---------- prezzi ----------
// Come nei giochi cozy per telefono: le prime cose costano poco (una pagina di diario ne paga 1-2),
// le più belle richiedono qualche settimana di risparmi. Le entrate crescono da sole col tempo
// (più pagine con più punti di forza, animali che imparano a raccogliere castagne, richieste esaudite),
// quindi all'inizio si fa un po' di fatica e poi diventa sempre più facile.
export const PREZZI = {
  aiuola: 5,
  quadretto: 3,
  cartello: 4,
  recinto: 2,
  /** l'acqua per riempire le buche */
  acqua: 0,
  /** abbattere con l'accetta: un albero costa più di un cespuglio; fiori ed erba si tolgono gratis */
  albero: 3,
  cespuglio: 1,
  piccolo: 0,
  /** la pala: ogni palata (scavare o alzare) costa una castagna; spianare è gratis */
  palata: 1,
};

/**
 * Le cose che si mettono in fila (come le staccionate): si trascina il dito e se ne fanno tante in un colpo,
 * oppure si tocca e ne resta subito un'altra "fantasma" pronta, attaccata in fondo alla prima.
 * `passo` = quanto è lungo un pezzo (in metri).
 */
export const FILA: Record<TipoFila, { nome: string; simbolo: string; costo: number; passo: number }> = {
  recinto: { nome: 'Staccionata', simbolo: '🚧', costo: 2, passo: 2 },
  siepe: { nome: 'Siepe', simbolo: '🌳', costo: 2, passo: 1.5 },
  muretto: { nome: 'Muretto di sassi', simbolo: '🧱', costo: 3, passo: 1.5 },
  paletti: { nome: 'Paletti con la corda', simbolo: '🪢', costo: 1, passo: 2 },
  lampione: { nome: 'Lampioni', simbolo: '🏮', costo: 4, passo: 3 },
};
export const TIPI_FILA = Object.keys(FILA) as TipoFila[];

/**
 * I pezzi di una fila da (x0, z0) a (x1, z1): uno ogni `passo` metri, girati lungo la fila.
 * Se il tratto è più corto di un pezzo, ne viene uno solo (girato come `rDefault`).
 */
export function pezziFila(tipo: TipoFila, x0: number, z0: number, x1: number, z1: number, rDefault = 0): Posto[] {
  const { passo } = FILA[tipo];
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz);
  if (l < passo * 0.5) return [{ x: x0, z: z0, r: rDefault }];
  const n = Math.max(1, Math.round(l / passo));
  const ux = dx / l, uz = dz / l, r = Math.atan2(-uz, ux) || 0;
  const out: Posto[] = [];
  for (let k = 0; k < n; k++) out.push({ x: x0 + ux * passo * (k + 0.5), z: z0 + uz * passo * (k + 0.5), r });
  return out;
}

/** Mette una fila di pezzi (finché bastano le castagne e il posto). Restituisce quelli messi. */
export function nuovaFila(s: StatoGioco, tipo: TipoFila, pezzi: Posto[]): Oggetto[] {
  const a = arredoDi(s);
  const out: Oggetto[] = [];
  for (const p of pezzi) {
    if (s.ghiande < FILA[tipo].costo || a.oggetti.length >= MAX_OGGETTI) break;
    s.ghiande -= FILA[tipo].costo;
    const o: Oggetto = { id: nuovoId(s, tipo), tipo, x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, r: Math.round(p.r * 100) / 100 };
    a.oggetti.push(o);
    out.push(o);
  }
  return out;
}

/** Dopo quanti giorni dove è stato abbattuto un albero ricresce qualcosa (se è ancora libero). */
export const GIORNI_RICRESCITA = 120;

/** Il punto (x, z) è ancora sgombro? (tolto da meno di GIORNI_RICRESCITA giorni, o da prima che si segnasse la data) */
export function toltoAncora(t: [number, number, string?], oggi: string): boolean {
  return !t[2] || giorniTra(t[2], oggi) < GIORNI_RICRESCITA;
}

// ---------- semi e piante ----------

export interface DefPianta { id: string; nome: string; simbolo: string; costo: number; giorni: number; colore: string; alta?: boolean }

/** Semi che si comprano con le castagne. `giorni` = quanto ci mette a fiorire. */
export const PIANTE: DefPianta[] = [
  { id: 'margherita', nome: 'Margherite', simbolo: '🌼', costo: 2, giorni: 3, colore: '#ffffff' },
  { id: 'tulipano', nome: 'Tulipani', simbolo: '🌷', costo: 3, giorni: 4, colore: '#ff6f91' },
  { id: 'lavanda', nome: 'Lavanda', simbolo: '💜', costo: 3, giorni: 5, colore: '#a58be0' },
  { id: 'girasole', nome: 'Girasoli', simbolo: '🌻', costo: 4, giorni: 6, colore: '#ffcf33', alta: true },
  { id: 'fragola', nome: 'Fragole', simbolo: '🍓', costo: 4, giorni: 6, colore: '#ff4b4b' },
  { id: 'rosa', nome: 'Rose', simbolo: '🌹', costo: 5, giorni: 8, colore: '#e8364f', alta: true },
  { id: 'zucca', nome: 'Zucca', simbolo: '🎃', costo: 6, giorni: 10, colore: '#ff9a2e' },
  { id: 'melo', nome: 'Alberello di mele', simbolo: '🍎', costo: 10, giorni: 21, colore: '#e8364f', alta: true },
];

export const COSTO_AIUOLA = PREZZI.aiuola;
export const COSTO_QUADRETTO = PREZZI.quadretto;
export const MAX_OGGETTI = 160;
export const POSTI_AIUOLA = 3;
export const MAX_AIUOLE = 12;
export const MAX_QUADRETTI = 12;

/** 0 seme, 1 germoglio, 2 piantina, 3 fiorita (o con i frutti). */
export function fasePianta(p: Pianta, oggi: string): number {
  const def = PIANTE.find((d) => d.id === p.specie);
  const g = Math.max(0, giorniTra(p.piantata, oggi));
  if (!def || g >= def.giorni) return 3;
  if (g === 0) return 0;
  return g < def.giorni / 2 ? 1 : 2;
}

export function giorniAllaFioritura(p: Pianta, oggi: string): number {
  const def = PIANTE.find((d) => d.id === p.specie);
  return def ? Math.max(0, giorniTra(oggi, aggiungiGiorni(p.piantata, def.giorni))) : 0;
}

export function compraSemi(s: StatoGioco, specie: string): boolean {
  const def = PIANTE.find((d) => d.id === specie);
  if (!def || s.ghiande < def.costo) return false;
  const a = arredoDi(s);
  s.ghiande -= def.costo;
  a.semi[specie] = (a.semi[specie] ?? 0) + 1;
  return true;
}

export function pianta(s: StatoGioco, aiuola: string, posto: number, specie: string, oggi: string): boolean {
  const a = arredoDi(s);
  const ai = a.aiuole.find((x) => x.id === aiuola);
  if (!ai || ai.piante[posto] || !(a.semi[specie] > 0)) return false;
  a.semi[specie] -= 1;
  if (!a.semi[specie]) delete a.semi[specie];
  ai.piante[posto] = { specie, piantata: oggi };
  return true;
}

export function togliPianta(s: StatoGioco, aiuola: string, posto: number) {
  const ai = arredoDi(s).aiuole.find((x) => x.id === aiuola);
  if (ai) ai.piante[posto] = null;
}

function nuovoId(s: StatoGioco, p: string) {
  s.contatore += 1;
  return `${p}${s.contatore}`;
}

export function nuovaAiuola(s: StatoGioco, x: number, z: number): Aiuola | null {
  const a = arredoDi(s);
  if (s.ghiande < COSTO_AIUOLA || a.aiuole.length >= MAX_AIUOLE) return null;
  s.ghiande -= COSTO_AIUOLA;
  const ai: Aiuola = { id: nuovoId(s, 'aiuola'), x, z, r: 0, piante: Array(POSTI_AIUOLA).fill(null) };
  a.aiuole.push(ai);
  return ai;
}

export function nuovoQuadretto(s: StatoGioco, disegno: string, cornice: number, x: number, z: number, oggi: string): Quadretto | null {
  const a = arredoDi(s);
  if (s.ghiande < COSTO_QUADRETTO || a.quadretti.length >= MAX_QUADRETTI) return null;
  s.ghiande -= COSTO_QUADRETTO;
  const q: Quadretto = { id: nuovoId(s, 'quadro'), x, z, r: 0, disegno, cornice, fatto: oggi };
  a.quadretti.push(q);
  return q;
}

export function nuovoOggetto(s: StatoGioco, tipo: Oggetto['tipo'], x: number, z: number, testo?: string): Oggetto | null {
  const a = arredoDi(s);
  const costo = tipo === 'cartello' ? PREZZI.cartello : FILA[tipo].costo;
  if (s.ghiande < costo || a.oggetti.length >= MAX_OGGETTI) return null;
  s.ghiande -= costo;
  const o: Oggetto = { id: nuovoId(s, tipo), tipo, x, z, r: 0, ...(testo ? { testo: testo.slice(0, 18) } : {}) };
  a.oggetti.push(o);
  return o;
}

/** Mette via un'aiuola o un quadretto. I semi piantati tornano nel sacchetto se non erano ancora spuntati. */
export function metteVia(s: StatoGioco, chiave: string, oggi: string) {
  const a = arredoDi(s);
  const ai = a.aiuole.find((x) => 'a:' + x.id === chiave);
  if (ai) {
    for (const p of ai.piante) if (p && fasePianta(p, oggi) === 0) a.semi[p.specie] = (a.semi[p.specie] ?? 0) + 1;
    a.aiuole = a.aiuole.filter((x) => x !== ai);
  }
  a.quadretti = a.quadretti.filter((x) => 'q:' + x.id !== chiave);
  a.oggetti = a.oggetti.filter((x) => 'o:' + x.id !== chiave);
}

// ---------- posti ----------

export const PASSO_GRIGLIA = 0.5;
export const aGriglia = (v: number) => Math.round(v / PASSO_GRIGLIA) * PASSO_GRIGLIA;

export function sposta(s: StatoGioco, chiave: string, p: Posto) {
  const a = arredoDi(s);
  const q = { x: aGriglia(p.x), z: aGriglia(p.z), r: Math.round(p.r * 100) / 100 };
  const ai = a.aiuole.find((x) => 'a:' + x.id === chiave) ?? a.quadretti.find((x) => 'q:' + x.id === chiave) ?? a.oggetti.find((x) => 'o:' + x.id === chiave);
  if (ai) Object.assign(ai, q);
  else a.posti[chiave] = q;
}

/**
 * Allarga il villaggio: le case (e gli edifici) messe a meno di `minimo` metri l'una dall'altra si spostano
 * un poco, il minimo indispensabile, finché ognuna ha spazio per la sua postazione di lavoro davanti.
 * Le case girate da Giada restano girate. Restituisce quante ne ha spostate.
 */
export function allargaCase(a: Arredo, minimo = 8): number {
  const chiavi = Object.keys(a.posti).filter((k) => k.startsWith('b:') || k.startsWith('e:'));
  const prima = new Map(chiavi.map((k) => [k, { ...a.posti[k] }]));
  for (let giro = 0; giro < 60; giro++) {
    let tutto = true;
    for (let i = 0; i < chiavi.length; i++)
      for (let j = i + 1; j < chiavi.length; j++) {
        const p = a.posti[chiavi[i]], q = a.posti[chiavi[j]];
        let dx = q.x - p.x, dz = q.z - p.z;
        let d = Math.hypot(dx, dz);
        if (d >= minimo - 0.01) continue;
        tutto = false;
        if (d < 1e-3) { dx = 1; dz = 0; d = 1; }
        const spinta = (minimo - d) / 2 + 0.02;
        p.x -= (dx / d) * spinta; p.z -= (dz / d) * spinta;
        q.x += (dx / d) * spinta; q.z += (dz / d) * spinta;
      }
    if (tutto) break;
  }
  let n = 0;
  for (const k of chiavi) {
    const p = a.posti[k], q = prima.get(k)!;
    p.x = Math.round(p.x * 100) / 100;
    p.z = Math.round(p.z * 100) / 100;
    if (Math.hypot(p.x - q.x, p.z - q.z) > 0.01) {
      n++;
      // la casa guarda ancora verso il centro (se Giada non l'aveva girata a modo suo)
      if (Math.abs(Math.atan2(Math.sin(q.r - Math.atan2(-q.x, -q.z)), Math.cos(q.r - Math.atan2(-q.x, -q.z)))) < 0.05) p.r = Math.atan2(-p.x, -p.z);
    }
  }
  return n;
}

/** Abbatte un albero o toglie un cespuglio, un sasso, dei fiori. Costa qualche castagna. */
export function togliNatura(s: StatoGioco, x: number, z: number, costo: number, oggi?: string): boolean {
  if (s.ghiande < costo) return false;
  s.ghiande -= costo;
  const t: [number, number, string?] = [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
  if (oggi) t.push(oggi);
  arredoDi(s).tolti.push(t);
  return true;
}

// ---------- la pala: scavare laghetti e alzare montagnole ----------

/** Il terreno modellabile: da -LATO_TERRENO/2 a +LATO_TERRENO/2 metri, un vertice ogni PASSO_TERRENO. */
export const LATO_TERRENO = 60;
export const PASSO_TERRENO = 0.5;
export const N_TERRENO = LATO_TERRENO / PASSO_TERRENO; // 120 quadretti per lato
/** Sotto questa altezza (in metri) c'è acqua. */
export const LIVELLO_ACQUA = -0.12;
const MIN_CM = -80, MAX_CM = 200;

/** Altezza del terreno in (x, z), in metri (tra i vertici: una media pesata). */
export function altezzaTerreno(t: Record<string, number> | undefined, x: number, z: number): number {
  if (!t) return 0;
  const fx = x / PASSO_TERRENO, fz = z / PASSO_TERRENO;
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const h = (a: number, b: number) => t[`${a},${b}`] ?? 0;
  const cm = h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
  return cm / 100;
}

export type Palata = 'scava' | 'alza' | 'spiana';

/**
 * Una palata in (x, z): scava (giù), alza (su) o spiana (verso il prato piatto), morbida ai bordi.
 * `libero(x, z)` dice dove si può toccare (non sotto le case e le costruzioni).
 * Restituisce false se non è cambiato niente o mancano le castagne.
 */
export function palata(s: StatoGioco, x: number, z: number, cosa: Palata, libero: (x: number, z: number) => boolean = () => true, raggio = 1.4): boolean {
  const costo = cosa === 'spiana' ? 0 : PREZZI.palata;
  if (s.ghiande < costo) return false;
  const a = arredoDi(s);
  a.acqua ??= {}; // (prima del terreno: le buche nuove nascono asciutte)
  a.terreno ??= {};
  const t = a.terreno;
  const r = Math.ceil(raggio / PASSO_TERRENO), ci = Math.round(x / PASSO_TERRENO), cj = Math.round(z / PASSO_TERRENO);
  const h = N_TERRENO / 2 - 2; // il bordo resta piatto (si attacca al prato di fuori)
  let cambiato = false;
  for (let i = ci - r; i <= ci + r; i++)
    for (let j = cj - r; j <= cj + r; j++) {
      if (Math.abs(i) > h || Math.abs(j) > h) continue;
      const px = i * PASSO_TERRENO, pz = j * PASSO_TERRENO;
      const d = Math.hypot(px - x, pz - z) / raggio;
      if (d >= 1 || !libero(px, pz)) continue;
      const peso = (1 - d * d) ** 2;
      const k = `${i},${j}`, prima = t[k] ?? 0;
      let dopo: number;
      if (cosa === 'spiana') dopo = prima * (1 - 0.6 * peso);
      else dopo = prima + (cosa === 'alza' ? 1 : -1) * 14 * peso;
      dopo = Math.round(Math.max(MIN_CM, Math.min(MAX_CM, dopo)));
      if (Math.abs(dopo) < 2) dopo = 0;
      if (dopo === prima) continue;
      if (dopo) t[k] = dopo; else delete t[k];
      if (a.acqua?.[k] && dopo / 100 >= LIVELLO_ACQUA) delete a.acqua[k]; // alzando, l'acqua lì se ne va
      cambiato = true;
    }
  if (cambiato) s.ghiande -= costo;
  return cambiato;
}

// ---------- l'acqua: si versa nelle buche (la pala fa solo buche asciutte) ----------

/** In questo vertice del terreno c'è una buca abbastanza profonda per tenere l'acqua? */
const buca = (t: Record<string, number>, k: string) => (t[k] ?? 0) / 100 < LIVELLO_ACQUA;

/** Il vertice "i,j" più vicino a (x, z). */
export const verticeVicino = (x: number, z: number) => `${Math.round(x / PASSO_TERRENO)},${Math.round(z / PASSO_TERRENO)}`;

/** C'è acqua in (x, z)? (buca abbastanza profonda e Giada ci ha versato l'acqua) */
export function conAcqua(a: Arredo | undefined, x: number, z: number): boolean {
  if (!a?.acqua || !a.terreno) return false;
  if (altezzaTerreno(a.terreno, x, z) >= LIVELLO_ACQUA) return false;
  const fx = x / PASSO_TERRENO, fz = z / PASSO_TERRENO, i = Math.floor(fx), j = Math.floor(fz);
  return !!(a.acqua[`${i},${j}`] || a.acqua[`${i + 1},${j}`] || a.acqua[`${i},${j + 1}`] || a.acqua[`${i + 1},${j + 1}`]);
}

/**
 * Versa l'acqua nella buca sotto (x, z): si riempie tutta la buca (i vertici collegati sotto il livello dell'acqua).
 * Restituisce quanti vertici si sono riempiti (0 = lì non c'è una buca, o era già piena).
 */
export function versaAcqua(s: StatoGioco, x: number, z: number): number {
  const a = arredoDi(s);
  const t = a.terreno ?? {};
  // la buca più vicina entro un metro (il dito non è mai preciso)
  let partenza: string | null = null;
  for (let d = 0; d <= 2 && !partenza; d++)
    for (let di = -d; di <= d && !partenza; di++)
      for (let dj = -d; dj <= d; dj++) {
        const k = `${Math.round(x / PASSO_TERRENO) + di},${Math.round(z / PASSO_TERRENO) + dj}`;
        if (buca(t, k)) { partenza = k; break; }
      }
  if (!partenza) return 0;
  a.acqua ??= {};
  const coda = [partenza], visti = new Set(coda);
  let n = 0;
  while (coda.length && visti.size < 4000) {
    const k = coda.pop()!;
    if (!a.acqua[k]) { a.acqua[k] = 1; n++; }
    const [i, j] = k.split(',').map(Number);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = `${i + di},${j + dj}`;
      if (!visti.has(q) && buca(t, q)) { visti.add(q); coda.push(q); }
    }
  }
  return n;
}

/** Toglie l'acqua dalla buca sotto (x, z) (tutta quella collegata). Restituisce quanti vertici ha svuotato. */
export function togliAcqua(s: StatoGioco, x: number, z: number): number {
  const a = arredoDi(s);
  if (!a.acqua) return 0;
  let partenza: string | null = null;
  for (let d = 0; d <= 2 && !partenza; d++)
    for (let di = -d; di <= d && !partenza; di++)
      for (let dj = -d; dj <= d; dj++) {
        const k = `${Math.round(x / PASSO_TERRENO) + di},${Math.round(z / PASSO_TERRENO) + dj}`;
        if (a.acqua[k]) { partenza = k; break; }
      }
  if (!partenza) return 0;
  const coda = [partenza];
  let n = 0;
  while (coda.length) {
    const k = coda.pop()!;
    if (!a.acqua[k]) continue;
    delete a.acqua[k];
    n++;
    const [i, j] = k.split(',').map(Number);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) coda.push(`${i + di},${j + dj}`);
  }
  return n;
}

// ---------- sentiero ----------

export const CELLA = 0.5;
export const LATO_SENTIERO = 128; // celle per lato: copre da -32 a +32 metri
export const MATERIALI_SENTIERO = [
  { id: 1, nome: 'Terra', colore: '#a8784c' },
  { id: 2, nome: 'Sassi', colore: '#9a948a' },
  { id: 3, nome: 'Mattoni', colore: '#b8573a' },
  { id: 4, nome: 'Ghiaia', colore: '#e2d6bc' },
];

/** Il sentiero comprato all'inizio (anello + viale), in celle: punto di partenza per disegnare. */
export function sentieroDiBase(): Record<string, number> {
  const out: Record<string, number> = {};
  const h = LATO_SENTIERO / 2;
  for (let i = -h; i < h; i++)
    for (let j = -h; j < h; j++) {
      const x = (i + 0.5) * CELLA, z = (j + 0.5) * CELLA;
      const d = Math.hypot(x, z);
      if (Math.abs(d - 1.95) < 0.45 || (Math.abs(x) < 0.55 && z > 1.9 && z < 10)) out[`${i},${j}`] = 1;
    }
  return out;
}

/** Dipinge (o cancella, materiale 0) un tondo di sentiero intorno al punto. */
export function dipingiSentiero(s: StatoGioco, x: number, z: number, materiale: number, raggio = 0.6): boolean {
  const a = arredoDi(s);
  if (!a.sentiero) a.sentiero = s.costruzioni.some((c) => c.id === 'sentiero') ? sentieroDiBase() : {};
  let cambiato = false;
  const r = Math.ceil(raggio / CELLA);
  const ci = Math.floor(x / CELLA), cj = Math.floor(z / CELLA);
  const h = LATO_SENTIERO / 2;
  for (let i = ci - r; i <= ci + r; i++)
    for (let j = cj - r; j <= cj + r; j++) {
      if (i < -h || j < -h || i >= h || j >= h) continue;
      if (Math.hypot((i + 0.5) * CELLA - x, (j + 0.5) * CELLA - z) > raggio) continue;
      const k = `${i},${j}`;
      if (materiale) {
        if (a.sentiero[k] !== materiale) { a.sentiero[k] = materiale; cambiato = true; }
      } else if (a.sentiero[k]) { delete a.sentiero[k]; cambiato = true; }
    }
  return cambiato;
}
