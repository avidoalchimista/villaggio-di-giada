// La pesca al laghetto: Giada lancia la lenza, aspetta che il galleggiante vada giù e tira su.
// Ogni pesce finisce nel suo quaderno dei pesci; i primi pesci del giorno danno qualche ghianda.
import { hash, rng } from './caso';
import { REGOLE } from './gioco';
import type { Pescato, StatoGioco } from './tipi';

export type Momento = 'mattina' | 'giorno' | 'sera' | 'notte';

export interface DefPesce {
  id: string;
  nome: string;
  colore: string; // corpo
  pancia: string;
  pinne: string;
  forma: 'lungo' | 'tondo' | 'normale' | 'serpente' | 'cosa';
  cm: [number, number]; // da … a
  raro: number; // 1 comune … 5 rarissimo
  quando?: Momento[]; // se c'è solo in certi momenti
  frase: string;
}

/** I pesci del laghetto (e un paio di sorprese). */
export const PESCI: DefPesce[] = [
  { id: 'alborella', nome: 'Alborella', colore: '#b8c8d8', pancia: '#f4f8fc', pinne: '#9ab0c4', forma: 'lungo', cm: [8, 15], raro: 1, frase: 'Piccola e argentata, guizza in gruppo vicino alla riva.' },
  { id: 'carpa', nome: 'Carpa', colore: '#c89a4a', pancia: '#f2dca0', pinne: '#a8743a', forma: 'normale', cm: [30, 70], raro: 1, frase: 'Ha i baffetti e ama il fondo morbido.' },
  { id: 'persico', nome: 'Pesce persico', colore: '#9ab04a', pancia: '#f4e6a8', pinne: '#e0603a', forma: 'normale', cm: [15, 35], raro: 2, frase: 'Ha le strisce come un pigiama e le pinne arancioni.' },
  { id: 'tinca', nome: 'Tinca', colore: '#6a8a3a', pancia: '#d8d88a', pinne: '#4a6a2a', forma: 'tondo', cm: [20, 45], raro: 2, frase: 'Verde come le ninfee, con gli occhi rossi.' },
  { id: 'cavedano', nome: 'Cavedano', colore: '#8a98a8', pancia: '#eef0f2', pinne: '#c87a5a', forma: 'normale', cm: [20, 50], raro: 2, quando: ['mattina', 'giorno'], frase: 'Mangia di tutto, anche le ciliegie cadute in acqua!' },
  { id: 'scardola', nome: 'Scardola', colore: '#c8b45a', pancia: '#f8eccc', pinne: '#e04a3a', forma: 'tondo', cm: [15, 30], raro: 2, frase: 'Ha le pinne rosse come le fragole.' },
  { id: 'trota', nome: 'Trota', colore: '#9aa86a', pancia: '#f6e8e0', pinne: '#7a8a5a', forma: 'lungo', cm: [25, 55], raro: 3, quando: ['mattina'], frase: 'Ha i puntini rossi e ama l\'acqua fresca del mattino.' },
  { id: 'pescegatto', nome: 'Pesce gatto', colore: '#4a4440', pancia: '#a89c90', pinne: '#3a3430', forma: 'normale', cm: [20, 45], raro: 3, quando: ['sera', 'notte'], frase: 'Esce quando fa buio e ha i baffi da gatto.' },
  { id: 'anguilla', nome: 'Anguilla', colore: '#5a5a3a', pancia: '#c8c09a', pinne: '#4a4a2a', forma: 'serpente', cm: [40, 90], raro: 3, quando: ['notte'], frase: 'Lunga lunga, scivola via come un nastro.' },
  { id: 'luccio', nome: 'Luccio', colore: '#7a8a4a', pancia: '#e8e4c0', pinne: '#a07a3a', forma: 'lungo', cm: [50, 110], raro: 4, frase: 'Il re del laghetto, con il muso a becco d\'anatra.' },
  { id: 'pescerosso', nome: 'Pesce rosso', colore: '#f07a2a', pancia: '#ffc070', pinne: '#ff9a4a', forma: 'tondo', cm: [6, 14], raro: 4, frase: 'Chissà chi l\'ha lasciato qui… sembra contento!' },
  { id: 'storione', nome: 'Storione', colore: '#7a8090', pancia: '#d8dce4', pinne: '#5a6070', forma: 'lungo', cm: [80, 150], raro: 5, frase: 'Antichissimo, con le placche sulla schiena. Rarissimo!' },
  { id: 'stivale', nome: 'Uno stivale', colore: '#4a7a3a', pancia: '#3a5a2a', pinne: '#2a3a1a', forma: 'cosa', cm: [30, 30], raro: 2, frase: 'Uno stivale di gomma! Chissà di chi è…' },
  { id: 'bottiglia', nome: 'Un messaggio in bottiglia', colore: '#8ac8b8', pancia: '#fff4d8', pinne: '#c8a46a', forma: 'cosa', cm: [20, 20], raro: 4, frase: 'Dentro c\'è un bigliettino del corvo: «Brava Giada, cra!»' },
];

export function pescato(s: StatoGioco): Pescato {
  s.pesca ??= { presi: {}, giorno: '', oggi: 0 };
  return s.pesca;
}

/** I pesci che abboccano in questo momento (gli altri dormono o non ci sono). */
export function pesciDelMomento(m: Momento): DefPesce[] {
  return PESCI.filter((p) => !p.quando || p.quando.includes(m));
}

/**
 * Cosa abbocca: i comuni spesso, i rari di rado. `r` è un numero tra 0 e 1
 * (in gioco Math.random, nelle prove fisso).
 */
export function cosaAbbocca(m: Momento, r: number, r2: number): { pesce: DefPesce; cm: number } {
  const lista = pesciDelMomento(m);
  const pesi = lista.map((p) => 1 / (p.raro * p.raro));
  const tot = pesi.reduce((a, b) => a + b, 0);
  let x = r * tot;
  let pesce = lista[lista.length - 1];
  for (let i = 0; i < lista.length; i++) {
    x -= pesi[i];
    if (x < 0) { pesce = lista[i]; break; }
  }
  const cm = Math.round(pesce.cm[0] + (pesce.cm[1] - pesce.cm[0]) * r2 * r2);
  return { pesce, cm };
}

/** Mette il pesce nel quaderno; ritorna le ghiande guadagnate e se è la prima volta. */
export function prendiPesce(s: StatoGioco, id: string, cm: number, oggi: string): { ghiande: number; nuovo: boolean; record: boolean } {
  const p = pescato(s);
  if (p.giorno !== oggi) { p.giorno = oggi; p.oggi = 0; }
  p.oggi += 1;
  const prima = p.presi[id];
  const nuovo = !prima;
  const record = !!prima && cm > prima.record;
  p.presi[id] = { n: (prima?.n ?? 0) + 1, record: Math.max(prima?.record ?? 0, cm) };
  const ghiande = p.oggi <= REGOLE.pesca.pesciPagatiAlGiorno ? REGOLE.pesca.ghiandePerPesce : 0;
  s.ghiande += ghiande;
  return { ghiande, nuovo, record };
}

/** Quanto aspetta il galleggiante prima che qualcuno abbocchi (secondi): sempre un po' diverso. */
export function attesa(seme: number): number {
  return 1.8 + rng(hash(String(seme)))() * 4.5;
}
