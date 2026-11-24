// I posti lontani (i "biomi"): oltre il bosco ci sono altri paesaggi, ognuno con il suo villaggio.
// Il castoro, rosicchiando in giro, ogni mese o due trova un sentiero che porta a uno di questi posti
// e lo racconta a Giada. Da lì in poi, all'inizio del sentiero c'è un cartello; e con quel villaggio
// si può commerciare (per ora: comprare i loro pesci per l'acquario).
import { hash } from './caso';
import { aggiungiGiorni, giorniTra } from './date';
import type { DefPesce } from './pesca';
import type { Evento, StatoGioco } from './tipi';

export interface DefBioma {
  id: string;
  nome: string; // il posto
  villaggio: string; // il paese che c'è laggiù
  simbolo: string;
  angolo: number; // dove parte il sentiero, sul bordo del bosco (gradi: 90 = il viale d'ingresso)
  colore: string; // il colore della cartolina
  terra: string; // il colore del sentiero e del terreno laggiù
  descrizione: string;
  abitanti: string; // chi ci vive
  commercio: string; // cosa ci si scambia
  scoperta: string; // cosa dice il castoro quando trova il sentiero
  pesci: DefPesce[]; // i pesci che vendono per l'acquario
}

const p = (id: string, nome: string, colore: string, pancia: string, pinne: string, forma: DefPesce['forma'], cm: [number, number], raro: number, frase: string): DefPesce =>
  ({ id, nome, colore, pancia, pinne, forma, cm, raro, frase });

/** I posti lontani, nell'ordine in cui il castoro li scopre. */
export const BIOMI: DefBioma[] = [
  {
    id: 'neve', nome: 'Le Montagne di Neve', villaggio: 'Borgo Fiocco', simbolo: '🏔️', angolo: 150, colore: '#7ab0d8', terra: '#eef4fa',
    descrizione: 'Su in alto, dove fa freddo e nevica quasi sempre. Le case hanno i tetti bianchi e i camini che fumano.',
    abitanti: 'lepri bianche, ermellini e marmotte', commercio: 'pesci dei laghi gelati, lana calda, cioccolata',
    scoperta: 'Giada! Giada! Rosicchiando un albero ho visto un sentiero nascosto: sale sale… fino alle Montagne di Neve! Lassù c\'è un villaggio, Borgo Fiocco. Ho messo un cartello all\'inizio del sentiero.',
    pesci: [
      p('salmerino', 'Salmerino alpino', '#7a8aa0', '#f4a070', '#e8704a', 'lungo', [20, 40], 2, 'Vive nei laghi di montagna, sotto il ghiaccio. La pancia è arancione come un tramonto.'),
      p('salmone', 'Salmone', '#9aa8b8', '#f4c8b8', '#7a8898', 'lungo', [50, 90], 3, 'Risale i torrenti saltando le cascate, controcorrente!'),
      p('pesceghiaccio', 'Pesce ghiaccio', '#d8eef8', '#ffffff', '#b0d8ee', 'lungo', [20, 45], 4, 'È quasi trasparente, come un pezzetto di ghiaccio che nuota.'),
    ],
  },
  {
    id: 'mare', nome: 'La Costa del Mare', villaggio: 'Porto Conchiglia', simbolo: '🌊', angolo: 30, colore: '#3a9ad0', terra: '#f2e2b0',
    descrizione: 'Il sentiero scende fino alla spiaggia: sabbia, conchiglie, barchette colorate e il faro bianco e rosso.',
    abitanti: 'papere di mare, gabbiani e foche', commercio: 'pesci del mare, conchiglie, sale',
    scoperta: 'Sniff sniff… sento odore di sale! Giada, dietro gli alberi ho trovato un sentiero che scende fino al mare! C\'è un porto, Porto Conchiglia, con le barche colorate. Ho messo un cartello.',
    pesci: [
      p('pagliaccio', 'Pesce pagliaccio', '#f07a2a', '#ffffff', '#1a1a1a', 'tondo', [6, 11], 2, 'Arancione con le strisce bianche, vive tra i tentacoli degli anemoni.'),
      p('cavalluccio', 'Cavalluccio marino', '#f2c04a', '#ffe08a', '#e0a030', 'cavalluccio', [8, 15], 3, 'Nuota in piedi! E il papà tiene le uova nel marsupio.'),
      p('medusa', 'Medusa', '#e8b8f0', '#ffffff', '#c890e0', 'medusa', [10, 30], 3, 'Sembra un ombrellino di gelatina che balla. Meglio guardarla attraverso il vetro!'),
      p('stella', 'Stella marina', '#f06a4a', '#ffb08a', '#d04a2a', 'stella', [10, 25], 2, 'Ha cinque braccia e se ne perde una… le ricresce!'),
    ],
  },
  {
    id: 'fiume', nome: 'Il Fiume delle Cascate', villaggio: 'Ponte dei Salici', simbolo: '💦', angolo: 215, colore: '#5aa878', terra: '#b89a6a',
    descrizione: 'Un fiume largo con tre cascate, i salici che toccano l\'acqua e un mulino ad acqua che gira giorno e notte.',
    abitanti: 'asini mugnai, lontre e aironi', commercio: 'pesci di fiume, farina del mulino, cesti di vimini',
    scoperta: 'Giada, senti che rumore? È una cascata! Ho trovato un sentiero che porta al Fiume delle Cascate. C\'è un paese con i salici, Ponte dei Salici: le lontre ti salutano!',
    pesci: [
      p('barbo', 'Barbo', '#a89a6a', '#efe6c8', '#c88a5a', 'lungo', [25, 60], 2, 'Ha quattro baffi per cercare il cibo tra i sassi del fiume.'),
      p('gambero', 'Gambero di fiume', '#8a5a3a', '#c89070', '#6a4a2a', 'gambero', [8, 14], 3, 'Cammina all\'indietro e ha due chele piccoline.'),
      p('temolo', 'Temolo', '#8a98a0', '#e8ecef', '#a05a8a', 'normale', [25, 45], 3, 'Ha una pinna sulla schiena grande come una bandiera viola.'),
    ],
  },
  {
    id: 'ciliegi', nome: 'Il Giardino dei Ciliegi', villaggio: 'Petali Rosa', simbolo: '🌸', angolo: 325, colore: '#e88aa8', terra: '#d8b8a0',
    descrizione: 'Colline piene di ciliegi in fiore, ponticelli rossi e laghetti tranquilli dove si specchiano le lanterne.',
    abitanti: 'daini, gru e scoiattoli volanti', commercio: 'carpe koi, tè, ventagli di carta',
    scoperta: 'Giada! Oggi mi è caduto un petalo rosa sul naso… e seguendo i petali ho trovato un sentiero! Porta al Giardino dei Ciliegi, dove c\'è il villaggio di Petali Rosa.',
    pesci: [
      p('koi', 'Carpa koi', '#ffffff', '#fff4ec', '#f05a3a', 'normale', [30, 70], 2, 'Bianca con le macchie rosse: dicono che porti fortuna.'),
      p('koidorata', 'Koi dorata', '#f2c43a', '#ffe48a', '#e0a020', 'normale', [30, 70], 4, 'Tutta d\'oro, brilla quando passa sotto il sole.'),
      p('combattente', 'Pesce combattente', '#4a5ad8', '#7a8af0', '#d83a7a', 'tondo', [5, 8], 3, 'Le sue pinne lunghe sembrano un vestito da ballo.'),
    ],
  },
  {
    id: 'oasi', nome: 'L\'Oasi delle Palme', villaggio: 'Duna Dorata', simbolo: '🌴', angolo: 245, colore: '#e0a84a', terra: '#f0d090',
    descrizione: 'In mezzo al deserto caldo, un laghetto verde con le palme, i datteri e le tende colorate.',
    abitanti: 'cavalli del deserto, cammelli e fennec', commercio: 'pesci dell\'oasi, datteri, tappeti',
    scoperta: 'Che caldo! Giada, ho trovato un sentiero di sabbia che va lontano lontano, fino all\'Oasi delle Palme. Laggiù c\'è Duna Dorata: i fennec hanno le orecchie più grandi delle mie!',
    pesci: [
      p('arcobaleno', 'Pesce arcobaleno', '#5ab0e0', '#f0e070', '#f07a5a', 'normale', [6, 12], 3, 'Cambia colore quando nuota: azzurro, giallo, rosso…'),
      p('neon', 'Pesce neon', '#3ab8f0', '#f04a5a', '#a0e0ff', 'lungo', [3, 5], 2, 'Piccolissimo, con una striscia che si accende come una lucina.'),
      p('discus', 'Pesce disco', '#e0703a', '#f4c070', '#5a8ad0', 'disco', [12, 20], 4, 'Tondo e piatto come un piattino decorato.'),
    ],
  },
  {
    id: 'coralli', nome: 'L\'Isola dei Coralli', villaggio: 'Baia Turchese', simbolo: '🐢', angolo: 290, colore: '#2ac0b8', terra: '#f6ead0',
    descrizione: 'Un\'isoletta con l\'acqua turchese e il fondale pieno di coralli. Ci si arriva con la zattera dal fondo del sentiero.',
    abitanti: 'pappagalli, tartarughe e delfini', commercio: 'pesci tropicali, noci di cocco, perle',
    scoperta: 'Giada, non ci crederai! Il sentiero più lungo che abbia mai trovato: arriva al mare e lì c\'è una zattera che porta all\'Isola dei Coralli! Gli abitanti di Baia Turchese ci aspettano.',
    pesci: [
      p('chirurgo', 'Pesce chirurgo blu', '#2a6ad8', '#f2d03a', '#1a2a6a', 'tondo', [15, 30], 2, 'Blu come il mare profondo, con la coda gialla.'),
      p('farfalla', 'Pesce farfalla', '#f8e04a', '#ffffff', '#1a1a1a', 'disco', [10, 18], 3, 'Ha un finto occhio vicino alla coda per confondere chi lo insegue.'),
      p('tartaruga', 'Tartarughina marina', '#6a9a5a', '#d8d0a0', '#8aaa6a', 'tartaruga', [20, 40], 5, 'Nuota piano piano con le zampe a pinna. È la più amata dell\'acquario!'),
    ],
  },
];

export const BIOMA = Object.fromEntries(BIOMI.map((b) => [b.id, b])) as Record<string, DefBioma>;

/** Dopo quanti giorni dall'arrivo del castoro trova il primo sentiero (da … a). */
export const PRIMO_SENTIERO: [number, number] = [25, 35];
/** Ogni quanto trova i sentieri dopo il primo: da un mese a due. */
export const TRA_I_SENTIERI: [number, number] = [30, 60];

export interface Sentiero { id: string; data: string }

export function sentieriDi(s: StatoGioco): Sentiero[] {
  return s.castoro?.sentieri ?? [];
}

/** I posti lontani già scoperti. */
export function biomiScoperti(s: StatoGioco): DefBioma[] {
  return sentieriDi(s).map((x) => BIOMA[x.id]).filter(Boolean);
}

function fraGiorni(s: StatoGioco, quale: number, [da, a]: [number, number]): number {
  return da + (hash(`${s.seme}:sentiero:${quale}`) % (a - da + 1));
}

/** Il giorno in cui il castoro trova il prossimo sentiero (null se li ha già trovati tutti). */
export function prossimoSentiero(s: StatoGioco): string | null {
  const c = s.castoro;
  if (!c) return null;
  const trovati = c.sentieri ?? [];
  if (trovati.length >= BIOMI.length) return null;
  if (c.prossimoSentiero) return c.prossimoSentiero;
  const ultimo = trovati.at(-1)?.data ?? c.arrivo;
  return aggiungiGiorni(ultimo, fraGiorni(s, trovati.length, trovati.length ? TRA_I_SENTIERI : PRIMO_SENTIERO));
}

/** Il castoro trova il sentiero per il prossimo posto lontano e lo racconta. */
export function trovaSentiero(s: StatoGioco, giorno: string, out: Evento[]): DefBioma | null {
  const c = s.castoro;
  if (!c) return null;
  c.sentieri ??= [];
  const b = BIOMI.find((x) => !c.sentieri!.some((t) => t.id === x.id));
  if (!b) return null;
  c.sentieri.push({ id: b.id, data: giorno });
  c.prossimoSentiero = undefined;
  c.prossimoSentiero = prossimoSentiero(s) ?? undefined;
  const e: Evento = { data: giorno, tipo: 'sentiero', testo: b.scoperta, luogo: b.id };
  s.eventi.push(e);
  if (s.eventi.length > 500) s.eventi.splice(0, s.eventi.length - 500);
  out.push(e);
  // si fa vedere in primo piano, come una schiusa: la telecamera va sul sentiero nuovo
  s.sorprese ??= [];
  s.sorprese.push(e);
  if (s.sorprese.length > 12) s.sorprese.splice(0, s.sorprese.length - 12);
  return b;
}

/** Un giorno che passa: se è il giorno giusto, il castoro trova un sentiero nuovo. */
export function sentieriDelGiorno(s: StatoGioco, giorno: string, out: Evento[]) {
  const quando = prossimoSentiero(s);
  if (!quando || giorniTra(quando, giorno) < 0) return;
  trovaSentiero(s, giorno, out);
}

/** Gli angoli dei sentieri già trovati (il castoro non rosicchia gli alberi lì davanti). */
export function angoliSentieri(s: Pick<StatoGioco, 'castoro'>): number[] {
  return (s.castoro?.sentieri ?? []).map((x) => BIOMA[x.id]?.angolo).filter((a): a is number => a !== undefined);
}
