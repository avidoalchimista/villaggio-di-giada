// I minigiochi delle botteghe: Giada tocca un animale che ha un mestiere e gli «dà una mano».
// Ogni bottega ha il suo gioco breve (spaccare la legna, decorare una torta, il tornio, la foto ricordo,
// le costellazioni, il giro in moto), che fa guadagnare qualche castagna. Vengono fuori piano piano:
// un gioco si apre solo quando nel villaggio c'è un animale con quel mestiere (cioè da adulto).
// Mai si perde: anche la partita peggiore dà una castagna e una frase gentile. Le cose fatte restano
// nel villaggio: il vaso sulla mensola, la torta in vetrina, la foto nell'album, la costellazione nel cielo.
import { hash } from './caso';
import type { Animale, StatoGioco } from './tipi';

export type IdMinigioco = 'legna' | 'torta' | 'tornio' | 'foto' | 'stelle' | 'moto';

export interface DefMinigioco {
  id: IdMinigioco;
  mestiere: string;
  nome: string;
  icona: string;
  /** Come si gioca, in una riga semplice (la prima volta lo spiega l'animale). */
  come: string;
  /** Cosa resta nel villaggio. */
  ricordo: string;
}

export const MINIGIOCHI: DefMinigioco[] = [
  { id: 'legna', mestiere: 'taglialegna', nome: 'Spacca la legna', icona: '🪓', come: 'Tocca quando la luce è sopra la crepa del ciocco: più sei precisa, più pezzi di legna!', ricordo: 'La legna va nella catasta accanto alla casa.' },
  { id: 'torta', mestiere: 'pasticcere', nome: 'Decora la torta', icona: '🎂', come: 'Copia il disegno del biglietto: scegli panna o fragola e tocca la torta dove vanno.', ricordo: 'La torta resta in vetrina, dentro la pasticceria.' },
  { id: 'tornio', mestiere: 'vasaio', nome: 'Il tornio', icona: '🏺', come: "Tieni il dito sull'argilla mentre gira: verso fuori la allarghi, verso dentro la stringi, in alto la allunghi.", ricordo: 'Il vaso resta dal vasaio, sul suo scaffale fuori casa: puoi farne tanti.' },
  { id: 'foto', mestiere: 'fotografo', nome: 'Foto ricordo', icona: '📷', come: 'Scatta quando sorridono tutti! Hai tre foto.', ricordo: "La foto più bella va nell'album, nel diario." },
  { id: 'stelle', mestiere: 'astronomo', nome: 'Unisci le stelle', icona: '✨', come: 'Trascina il dito da una stella brillante all’altra per disegnare la costellazione.', ricordo: 'La costellazione resta nel cielo del villaggio, di notte.' },
  { id: 'moto', mestiere: 'motociclista', nome: 'Giro in moto', icona: '🏍', come: 'Guida la moto sul sentiero: raccogli le lettere e schiva le pozzanghere. Inclina il telefono o tocca a destra e a sinistra.', ricordo: 'Le lettere arrivano a tutti: il villaggio è contento.' },
];

const PER_MESTIERE = new Map(MINIGIOCHI.map((m) => [m.mestiere, m]));
const PER_ID = new Map(MINIGIOCHI.map((m) => [m.id, m]));

export function minigiocoDi(mestiere: string | null | undefined): DefMinigioco | undefined {
  return mestiere ? PER_MESTIERE.get(mestiere) : undefined;
}
export function defMinigioco(id: string): DefMinigioco | undefined {
  return PER_ID.get(id as IdMinigioco);
}

/** Le partite che pagano, al giorno, per ogni bottega: così il diario resta il modo principale per guadagnare. */
export const PARTITE_PAGATE = 3;

// ---------- le cose che restano ----------

export interface Vaso {
  data: string;
  profilo: number[]; // raggi dal fondo alla bocca (8 punti)
  alto: number; // altezza
  colore: string;
}
export interface PezzoTorta { x: number; y: number; tipo: Decoro } // x, y tra -1 e 1 sul piano della torta
export type Decoro = 'panna' | 'fragola' | 'cioccolato' | 'mirtillo';
export interface Torta { data: string; base: string; pezzi: PezzoTorta[] }
export interface FotoAlbum { data: string; foto: string; chi: string[] } // foto: immagine jpeg piccola (data URL)
export interface Costellazione { data: string; nome: string; forma: string; punti: [number, number][]; linee: [number, number][] }

export interface Botteghe {
  giorno: string; // ultimo giorno in cui si è giocato
  partite: Record<string, number>; // partite di oggi per minigioco
  fatte: Record<string, number>; // partite in tutto (la prima volta l'animale spiega)
  vasi: Record<string, Vaso[]>; // per vasaio (id animale): fuori sullo scaffale (al massimo VASI_FUORI), in casa gli ultimi 5
  torte: Record<string, Torta>; // per pasticcere: l'ultima torta in vetrina
  stelle: Costellazione[]; // al massimo 6 nel cielo
  album?: FotoAlbum[]; // le foto ricordo più belle (al massimo 12), nel diario
  legna: number; // pezzi di legna spaccati in tutto
  lettere: number; // lettere consegnate in tutto
}

export function botteghe(s: StatoGioco): Botteghe {
  s.botteghe ??= { giorno: '', partite: {}, fatte: {}, vasi: {}, torte: {}, stelle: [], legna: 0, lettere: 0 };
  return s.botteghe;
}

/** Il minigioco che questo animale può fare adesso (se c'è). Da addormentato no. */
export function puoAiutare(a: Pick<Animale, 'mestiere' | 'fase' | 'addormentato'>): DefMinigioco | undefined {
  if (a.addormentato || a.fase === 'uovo' || a.fase === 'cucciolo' || a.fase === 'giovane') return undefined;
  return minigiocoDi(a.mestiere);
}

/** Le botteghe del villaggio che hanno già un minigioco aperto (per il pannello e le novità). */
export function minigiochiAperti(s: StatoGioco): DefMinigioco[] {
  const ids = new Set<IdMinigioco>();
  for (const a of s.animali) {
    const m = puoAiutare({ ...a, addormentato: false });
    if (m) ids.add(m.id);
  }
  return MINIGIOCHI.filter((m) => ids.has(m.id));
}

/** Da 0 (partita storta) a 1 (perfetta) → castagne da 1 a 5. */
export function castagnePer(punti: number): number {
  const p = Math.max(0, Math.min(1, Number.isFinite(punti) ? punti : 0));
  return 1 + Math.round(p * 4);
}

/** Quante stelline (1-3) per com'è andata. */
export function stellinePer(punti: number): number {
  return punti >= 0.8 ? 3 : punti >= 0.45 ? 2 : 1;
}

export function partiteOggi(s: StatoGioco, id: IdMinigioco, oggi: string): number {
  const b = s.botteghe; // (solo lettura: si usa anche dentro i $derived)
  return b && b.giorno === oggi ? b.partite[id] ?? 0 : 0;
}

/**
 * Fine partita: conta la partita e paga le castagne (solo le prime PARTITE_PAGATE del giorno per bottega).
 * Ritorna le castagne date e quante partite pagate restano oggi.
 */
export function premiaPartita(s: StatoGioco, id: IdMinigioco, punti: number, oggi: string): { castagne: number; restano: number; prima: boolean } {
  const b = botteghe(s);
  if (b.giorno !== oggi) { b.giorno = oggi; b.partite = {}; }
  const n = (b.partite[id] ?? 0) + 1;
  b.partite[id] = n;
  const prima = !b.fatte[id];
  b.fatte[id] = (b.fatte[id] ?? 0) + 1;
  const castagne = n <= PARTITE_PAGATE ? castagnePer(punti) : 0;
  s.ghiande += castagne;
  return { castagne, restano: Math.max(0, PARTITE_PAGATE - n), prima };
}

export function salvaVaso(s: StatoGioco, animale: string, v: Vaso) {
  const b = botteghe(s);
  const l = (b.vasi[animale] ??= []);
  l.push(v);
  while (l.length > VASI_FUORI) l.shift(); // scaffale e fila per terra pieni: il più vecchio va regalato
}
/** Quanti vasi restano dal vasaio: 15 sullo scaffale fuori e altri 12 in fila per terra davanti. */
export const VASI_FUORI = 27;
export function salvaTorta(s: StatoGioco, animale: string, t: Torta) {
  botteghe(s).torte[animale] = t;
}
export const FOTO_ALBUM = 12;
export function salvaFoto(s: StatoGioco, f: FotoAlbum) {
  const b = botteghe(s);
  const l = (b.album ??= []);
  l.push(f);
  while (l.length > FOTO_ALBUM) l.shift();
}
export function salvaCostellazione(s: StatoGioco, c: Costellazione) {
  const b = botteghe(s);
  b.stelle.push(c);
  while (b.stelle.length > 6) b.stelle.shift();
}

// ---------- frasi dell'animale a fine partita ----------

const FRASI: Record<IdMinigioco, [string[], string[], string[]]> = {
  legna: [
    ['Il legno era duro oggi, ma ce l\'abbiamo fatta insieme!', 'Qualche colpo storto, ma la stufa sarà contenta lo stesso.'],
    ['Bella catasta! Quest\'inverno nessuno avrà freddo.', 'Brava, hai l\'occhio giusto!'],
    ['Che colpi! Sembravi una taglialegna vera!', 'Neanche io spacco così bene. Grazie Giada!'],
  ],
  torta: [
    ['È un po\' diversa dal disegno… ma secondo me è ancora più buona!', 'Le torte fatte con il cuore sono le più buone.'],
    ['Che bella! La metto subito in vetrina.', 'Quasi uguale al biglietto, brava!'],
    ['È identica! Anzi, è più bella!', 'La gente farà la fila per guardarla!'],
  ],
  tornio: [
    ['Ogni vaso storto ha la sua personalità!', 'Un po\' sbilenco, ma tiene i fiori benissimo.'],
    ['Che bel vaso! Lo metto sullo scaffale qui fuori.', 'Hai le mani da vasaia!'],
    ['Perfetto! Sembra quello del biglietto.', 'Lo faccio vedere a tutti, è bellissimo!'],
  ],
  foto: [
    ['Qualcuno aveva gli occhi chiusi… ma era felice lo stesso!', 'Le foto buffe sono le più belle da riguardare.'],
    ['Che bella foto! Va dritta nell\'album.', 'Quasi tutti sorridenti, brava!'],
    ['Sorridono tutti! È la foto più bella dell\'anno!', 'Questa la incornicio, promesso.'],
  ],
  stelle: [
    ['Il cielo è grande, ci si perde facilmente. Ma l\'abbiamo trovata!', 'Anche gli astronomi veri ci mettono un po\'.'],
    ['Eccola lì! Stanotte la cercherò col cannocchiale.', 'Brava, hai l\'occhio da astronoma!'],
    ['Che velocità! Le stelle ti conoscono già.', 'Una costellazione nuova, tutta tua!'],
  ],
  moto: [
    ['Qualche pozzanghera, ma ci siamo divertiti un sacco!', 'Che giro! Un po\' di fango non fa male a nessuno.'],
    ['Quante lettere! Il villaggio sarà contento.', 'Bella guida, Giada!'],
    ['Sei un fulmine! Tutte le lettere a casa!', 'Neanche io guido così bene!'],
  ],
};

export function fraseFine(id: IdMinigioco, punti: number, seme: number): string {
  const l = FRASI[id][stellinePer(punti) - 1];
  return l[Math.abs(seme) % l.length];
}

// ---------- spacca la legna ----------

/** Quanto è stato preciso il colpo: d = distanza tra la luce e la crepa (in larghezze di ciocco, 0 = centro). */
export function colpoLegna(d: number): { pezzi: number; voto: number } {
  const a = Math.abs(d);
  if (a < 0.06) return { pezzi: 4, voto: 1 };
  if (a < 0.14) return { pezzi: 3, voto: 0.7 };
  if (a < 0.26) return { pezzi: 2, voto: 0.4 };
  return { pezzi: 1, voto: 0.1 };
}

// ---------- decora la torta ----------

export const DECORI_PER_LIVELLO: Decoro[][] = [['panna', 'fragola'], ['panna', 'fragola'], ['panna', 'fragola', 'mirtillo'], ['panna', 'fragola', 'mirtillo', 'cioccolato']];

/** Il disegno da copiare: tanti pezzi su un cerchio e qualcuno al centro, sempre diverso. */
export function disegnoTorta(seme: number, livello: number): PezzoTorta[] {
  const tipi = DECORI_PER_LIVELLO[Math.max(0, Math.min(3, livello - 1))];
  let r = hash('torta' + seme);
  const caso = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const pezzi: PezzoTorta[] = [];
  const n = 5 + Math.floor(caso() * 2) + Math.min(2, livello - 1); // 5-8 intorno
  const giro = caso() * Math.PI;
  const a = tipi[Math.floor(caso() * tipi.length)];
  let b = tipi[Math.floor(caso() * tipi.length)];
  if (b === a) b = tipi[(tipi.indexOf(a) + 1) % tipi.length];
  const alterna = caso() < 0.5;
  for (let i = 0; i < n; i++) {
    const th = giro + (i / n) * Math.PI * 2;
    pezzi.push({ x: Math.cos(th) * 0.68, y: Math.sin(th) * 0.68, tipo: alterna && i % 2 ? b : a });
  }
  // al centro: uno, o tre in fila
  const c = tipi[Math.floor(caso() * tipi.length)];
  if (caso() < 0.5) pezzi.push({ x: 0, y: 0, tipo: c });
  else for (const x of [-0.25, 0, 0.25]) pezzi.push({ x, y: 0, tipo: x === 0 ? c : alterna ? a : b });
  return pezzi;
}

/**
 * Quanto la torta somiglia al biglietto (0-1): ogni pezzo del disegno cerca il pezzo messo più vicino
 * dello stesso tipo; i pezzi in più tolgono un pochino.
 */
export function somiglianzaTorta(modello: PezzoTorta[], fatta: PezzoTorta[]): number {
  if (!modello.length) return 0;
  const usati = new Set<number>();
  let somma = 0;
  for (const p of modello) {
    let migliore = -1, dmin = Infinity;
    fatta.forEach((q, i) => {
      if (usati.has(i) || q.tipo !== p.tipo) return;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < dmin) { dmin = d; migliore = i; }
    });
    if (migliore < 0) continue;
    usati.add(migliore);
    somma += Math.max(0, 1 - Math.max(0, dmin - 0.1) / 0.35);
  }
  const extra = Math.max(0, fatta.length - modello.length);
  return Math.max(0, Math.min(1, somma / modello.length - extra * 0.05));
}

// ---------- il tornio ----------

export const PUNTI_VASO = 8;

/** Le forme da copiare: raggi dal fondo alla bocca, e l'altezza. */
export const FORME_VASO: { id: string; nome: string; profilo: number[]; alto: number }[] = [
  { id: 'vaso', nome: 'un vaso panciuto', profilo: [0.3, 0.42, 0.5, 0.52, 0.46, 0.34, 0.26, 0.3], alto: 1.0 },
  { id: 'tazza', nome: 'una tazza larga', profilo: [0.34, 0.38, 0.42, 0.45, 0.47, 0.49, 0.5, 0.52], alto: 0.6 },
  { id: 'brocca', nome: 'una brocca alta', profilo: [0.32, 0.4, 0.44, 0.4, 0.3, 0.2, 0.18, 0.24], alto: 1.3 },
  { id: 'anfora', nome: "un'anfora", profilo: [0.18, 0.3, 0.44, 0.5, 0.44, 0.3, 0.17, 0.2], alto: 1.2 },
  { id: 'ciotola', nome: 'una ciotola', profilo: [0.22, 0.34, 0.44, 0.5, 0.54, 0.56, 0.58, 0.6], alto: 0.45 },
];

export const ARGILLA_INIZIO = { profilo: Array(PUNTI_VASO).fill(0.36) as number[], alto: 0.7 };

/** Quanto il vaso somiglia alla forma (0-1): raggi e altezza. */
export function somiglianzaVaso(profilo: number[], alto: number, forma: { profilo: number[]; alto: number }): number {
  let err = 0;
  for (let i = 0; i < PUNTI_VASO; i++) err += Math.abs((profilo[i] ?? 0) - forma.profilo[i]);
  err /= PUNTI_VASO; // 0 … ~0.3
  const errAlto = Math.abs(alto - forma.alto) / forma.alto;
  return Math.max(0, Math.min(1, 1 - err * 4.5 - errAlto * 0.9));
}

/**
 * Il dito preme l'argilla all'altezza `y` (0 fondo, 1 bocca): `dr` > 0 allarga, < 0 stringe.
 * Si muovono anche i punti vicini, più piano, così il vaso resta liscio.
 */
export function modellaVaso(profilo: number[], y: number, dr: number) {
  for (let i = 0; i < PUNTI_VASO; i++) {
    const d = Math.abs(i / (PUNTI_VASO - 1) - y) * (PUNTI_VASO - 1);
    const k = Math.max(0, 1 - d / 1.6);
    profilo[i] = Math.max(0.12, Math.min(0.7, profilo[i] + dr * k));
  }
}

export const SMALTI = ['#c8603a', '#3f7ab8', '#e8c040', '#5a9a5a', '#f2eee4', '#b05a9a', '#2e3a5a'];

// ---------- unisci le stelle ----------

export interface FormaStelle { id: string; nome: string; punti: [number, number][]; linee: [number, number][] }

/** Le costellazioni da disegnare (punti tra 0 e 1 nel riquadro del cielo). Prima le facili. */
export const COSTELLAZIONI: FormaStelle[] = [
  { id: 'casetta', nome: 'la Casetta', punti: [[0.3, 0.75], [0.7, 0.75], [0.7, 0.45], [0.5, 0.22], [0.3, 0.45]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  { id: 'aquilone', nome: "l'Aquilone", punti: [[0.5, 0.15], [0.72, 0.42], [0.5, 0.62], [0.28, 0.42], [0.58, 0.8], [0.45, 0.9]], linee: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5]] },
  { id: 'pesce', nome: 'il Pesce', punti: [[0.2, 0.5], [0.42, 0.32], [0.65, 0.42], [0.65, 0.58], [0.42, 0.68], [0.82, 0.3], [0.82, 0.7]], linee: [[0, 1], [1, 2], [2, 5], [5, 6], [6, 3], [3, 4], [4, 0]] },
  { id: 'cuore', nome: 'il Cuore', punti: [[0.5, 0.82], [0.22, 0.5], [0.3, 0.25], [0.5, 0.38], [0.7, 0.25], [0.78, 0.5]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]] },
  { id: 'volpe', nome: 'la Volpe', punti: [[0.25, 0.2], [0.38, 0.4], [0.62, 0.4], [0.75, 0.2], [0.68, 0.6], [0.5, 0.82], [0.32, 0.6]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]] },
  { id: 'castagna', nome: 'la Castagna', punti: [[0.5, 0.16], [0.7, 0.38], [0.75, 0.62], [0.5, 0.8], [0.25, 0.62], [0.3, 0.38], [0.5, 0.05]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [0, 6]] },
  { id: 'luna', nome: 'la Luna', punti: [[0.55, 0.12], [0.35, 0.25], [0.27, 0.5], [0.35, 0.75], [0.55, 0.88], [0.45, 0.65], [0.42, 0.5], [0.45, 0.35]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]] },
  { id: 'carro', nome: 'il Grande Carro', punti: [[0.12, 0.3], [0.28, 0.35], [0.42, 0.42], [0.55, 0.5], [0.58, 0.75], [0.85, 0.75], [0.85, 0.5]], linee: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
];

/** Quale costellazione disegnare oggi: le prime ai livelli bassi, poi anche le più difficili, senza ripetere l'ultima. */
export function costellazioneDa(seme: number, livello: number, gia: string[]): FormaStelle {
  const quante = Math.min(COSTELLAZIONI.length, 3 + livello * 2 - 1);
  const scelte = COSTELLAZIONI.slice(0, quante).filter((c) => !gia.includes(c.id));
  const lista = scelte.length ? scelte : COSTELLAZIONI.slice(0, quante);
  return lista[Math.abs(seme) % lista.length];
}

/** Una linea tra due stelle (in qualunque verso) è una di quelle della costellazione? */
export function lineaGiusta(f: FormaStelle, a: number, b: number): number {
  return f.linee.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Punteggio: veloce e senza tante linee sbagliate. */
export function puntiStelle(secondi: number, sbagli: number, linee: number): number {
  const tempoGiusto = 6 + linee * 3;
  const t = Math.max(0, Math.min(1, 1 - (secondi - tempoGiusto) / (tempoGiusto * 2)));
  return Math.max(0, Math.min(1, t - sbagli * 0.1));
}

// ---------- foto ricordo ----------

/** La foto: quanti sorridono e quanti guardano in camera. */
export function puntiFoto(sorridono: number, tutti: number): number {
  if (!tutti) return 0;
  return Math.max(0, Math.min(1, sorridono / tutti));
}

// ---------- giro in moto ----------

/** Quanto dura il giro (secondi): più lungo con la bottega più bella. */
export function durataGiro(livello: number): number {
  return 40 + Math.min(3, Math.max(0, livello - 1)) * 5;
}

export function puntiMoto(prese: number, totali: number, schizzi: number): number {
  if (!totali) return 0;
  return Math.max(0, Math.min(1, prese / totali - schizzi * 0.04 + 0.1));
}
