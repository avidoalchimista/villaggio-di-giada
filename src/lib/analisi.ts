// Motore di analisi del diario: tutto sul dispositivo, a regole, nessuna chiamata di rete.
// Simbolismo di gioco, non diagnosi.

import type { Analisi, Emozione, Forza, Punteggi } from './tipi';

export interface VoceDizionario {
  p: string;
  f?: Punteggi<Forza>;
  e?: Punteggi<Emozione>;
}

interface Regola {
  re: RegExp;
  voce: VoceDizionario;
}

const NEGAZIONI = new Set(['non', 'mai', 'nessun', 'nessuno', 'nessuna', 'senza', 'neanche', 'nemmeno', 'neppure', 'ne']);
const INTENSI: [RegExp, number][] = [
  [/\b(tantissim\w*|moltissim\w*|davvero tanto|un sacco|troppo|super|da morire)\b/, 1.6],
  [/\b(molto|tanto|davvero|proprio|veramente|parecchio)\b/, 1.3],
  [/\b(un po'?|un pochino|poco|leggermente|appena)\b/, 0.5],
];

// Frasi che indicano un malessere serio: il corvo suggerisce con delicatezza di parlarne con qualcuno.
const SEGNALI_SERI = [
  'farla finita', 'voglio morire', 'vorrei morire', 'non voglio piu vivere', 'togliermi la vita',
  'farmi del male', 'mi faccio del male', 'non ha senso vivere',
  'vorrei sparire', 'meglio se non ci fossi', 'nessuno sentirebbe la mia mancanza',
];

export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // via gli accenti
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»"]/g, ' ')
    .replace(/[ \t]+/g, ' ');
}

function compila(p: string): RegExp {
  const corpo = p
    .split(' ')
    .map((parola) => parola.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '*' ? '*' : '\\' + c)).replace(/\*/g, "[a-z']*"))
    .join('\\s+');
  return new RegExp(`(?<![a-z'])${corpo}(?![a-z])`, 'g');
}

export function preparaDizionario(voci: VoceDizionario[]): Regola[] {
  return voci.map((voce) => ({ re: compila(voce.p), voce }));
}

function aggiungi<K extends string>(dest: Punteggi<K>, src: Punteggi<K> | undefined, k: number) {
  if (!src) return;
  for (const [chiave, val] of Object.entries(src) as [K, number][]) {
    dest[chiave] = (dest[chiave] ?? 0) + val * k;
  }
}

function paroleIndietro(testo: string, fine: number, n: number): string[] {
  return testo.slice(0, fine).split(/[\s,]+/).filter(Boolean).slice(-n);
}

function negata(frase: string, inizio: number): boolean {
  // "non ... X" entro 3 parole prima; "ne" solo se seguito da altro "ne" non lo gestiamo
  return paroleIndietro(frase, inizio, 3).some((w) => NEGAZIONI.has(w) && w !== 'ne');
}

function intensita(frase: string, inizio: number, fine: number): number {
  const intorno = paroleIndietro(frase, inizio, 3).join(' ') + ' ' + frase.slice(fine, fine + 25);
  for (const [re, k] of INTENSI) if (re.test(intorno)) return k;
  return 1;
}

export function analizzaFrase(frase: string, regole: Regola[]): Analisi {
  const forze: Punteggi<Forza> = {};
  const emozioni: Punteggi<Emozione> = {};

  // tutte le corrispondenze; a parità di posizione vince l'espressione più lunga
  const trovate: { i: number; j: number; voce: VoceDizionario }[] = [];
  for (const { re, voce } of regole) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(frase))) trovate.push({ i: m.index, j: m.index + m[0].length, voce });
  }
  trovate.sort((a, b) => b.j - b.i - (a.j - a.i) || a.i - b.i);
  const prese: typeof trovate = [];
  for (const t of trovate) if (!prese.some((p) => t.i < p.j && p.i < t.j)) prese.push(t);

  let pauraNegata = false;
  for (const { i, j, voce } of prese) {
    const k = intensita(frase, i, j);
    if (negata(frase, i)) {
      if (voce.e?.paura) pauraNegata = true;
      continue; // "non ero felice": la parola non conta
    }
    aggiungi(forze, voce.f, k);
    aggiungi(emozioni, voce.e, k);
  }

  // Regole composte
  if (pauraNegata) forze.coraggio = (forze.coraggio ?? 0) + 1; // "non ho avuto paura"
  if ((emozioni.paura ?? 0) > 0 && /\b(ma|pero|comunque|lo stesso|alla fine)\b.*\b(l'ho fatt\w|ce l'ho fatta|ho deciso|sono andat\w|ho fatto|ci sono riuscit\w|l'ho detto)\b/.test(frase)) {
    forze.coraggio = (forze.coraggio ?? 0) + 3; // "avevo paura ma l'ho fatto"
  }
  if ((emozioni.rabbia ?? 0) > 0 && /\b(ho respirato|mi sono calmat\w|ho contato|non ho risposto|me ne sono andat\w)\b/.test(frase)) {
    forze.autocontrollo = (forze.autocontrollo ?? 0) + 2;
  }
  if ((emozioni.tristezza ?? 0) > 0 && /\b(ho chiamato|ho parlato con|ne ho parlato|mi sono confidat\w|ho scritto a)\b/.test(frase)) {
    forze.intelligenza_sociale = (forze.intelligenza_sociale ?? 0) + 1;
    forze.coraggio = (forze.coraggio ?? 0) + 1;
  }

  return { forze, emozioni, segnaliSeri: SEGNALI_SERI.some((s) => frase.includes(s)) };
}

export function analizza(testo: string, regole: Regola[]): Analisi {
  const tot: Analisi = { forze: {}, emozioni: {}, segnaliSeri: false };
  const norm = normalizza(testo);
  // le regole composte guardano anche oltre il "ma": analizziamo per frasi intere separate solo da . ! ? ; a capo
  for (const f of norm.split(/[.!?;\n]+/).map((s) => s.trim()).filter(Boolean)) {
    const a = analizzaFrase(f, regole);
    aggiungi(tot.forze, a.forze, 1);
    aggiungi(tot.emozioni, a.emozioni, 1);
    tot.segnaliSeri ||= a.segnaliSeri;
  }
  tot.segnaliSeri ||= SEGNALI_SERI.some((s) => norm.includes(s));
  // tristezza in una frase e "ne ho parlato" in quella dopo: cercare qualcuno è un atto di coraggio
  if ((tot.emozioni.tristezza ?? 0) > 0 && !(tot.forze.intelligenza_sociale ?? 0) &&
      /\b(ho chiamato|ho parlato con|ne ho parlato|mi sono confidat\w|ho scritto a)\b/.test(norm)) {
    tot.forze.intelligenza_sociale = 1;
    tot.forze.coraggio = (tot.forze.coraggio ?? 0) + 1;
  }
  // arrotondo a un decimale
  for (const o of [tot.forze, tot.emozioni] as Record<string, number>[]) for (const k in o) o[k] = Math.round(o[k] * 10) / 10;
  return tot;
}

/** Le chiavi più forti, per i chip di conferma. */
export function principali<K extends string>(p: Punteggi<K>, n: number, soglia = 1): K[] {
  return (Object.entries(p) as [K, number][])
    .filter(([, v]) => v >= soglia)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
