// Il museo: un edificio da costruire con le castagne, con due sale.
// - I ritrovamenti: ogni giorno nel villaggio brilla per terra una cosa trovata (una piuma, un fossile,
//   una moneta antica...). Giada la tocca e la prende. Ogni tanto ne porta una anche chi torna dal bosco.
// - La sala dei funghi: Giada ci espone un fungo per specie, preso dal cestino (vedi funghi.ts).
// Ogni pezzo nuovo esposto porta qualche castagna: sono i biglietti dei visitatori.
// Le cose trovate prima di costruire il museo restano da parte e ci entrano tutte quando è pronto.
import { hash, rng } from './caso';
import { FUNGO } from './funghi';
import type { StatoGioco } from './tipi';

export interface DefRitrovamento {
  id: string;
  nome: string;
  icona: string;
  raro: number; // 1 comune … 5 rarissimo
  mesi?: number[]; // se si trova solo in certi mesi
  frase: string;
}

export const RITROVAMENTI: DefRitrovamento[] = [
  { id: 'piuma-ghiandaia', nome: 'Piuma di ghiandaia', icona: '🪶', raro: 1, frase: 'Ha le righe azzurre come il cielo.' },
  { id: 'pigna', nome: 'Pigna gigante', icona: '🌲', raro: 1, frase: 'Grande come una mano, ancora chiusa.' },
  { id: 'bottone', nome: "Bottone d'ottone", icona: '🔘', raro: 1, frase: 'Tutto lucido. Chissà da che giacca è caduto…' },
  { id: 'guscio', nome: 'Guscio di lumaca', icona: '🐌', raro: 1, frase: 'Vuoto: la lumaca ha traslocato.' },
  { id: 'sasso-cuore', nome: 'Sasso a cuore', icona: '🪨', raro: 2, frase: 'Un sasso a forma di cuore, liscio liscio.' },
  { id: 'quarzo', nome: 'Cristallo di quarzo', icona: '💎', raro: 2, frase: 'Trasparente come il ghiaccio.' },
  { id: 'biglia', nome: 'Biglia di vetro', icona: '🔵', raro: 2, frase: 'Con un ricciolo colorato dentro.' },
  { id: 'nido', nome: 'Nido vuoto', icona: '🪺', raro: 2, frase: 'Caduto da un ramo, già lasciato dagli uccellini.' },
  { id: 'foglia-pizzo', nome: 'Foglia di pizzo', icona: '🍂', raro: 2, mesi: [10, 11, 12, 1, 2, 3], frase: 'Così vecchia che è rimasta solo la trama, come un ricamo.' },
  { id: 'piuma-gufo', nome: 'Piuma di gufo', icona: '🪶', raro: 3, frase: 'Morbidissima: per questo il gufo vola senza fare rumore.' },
  { id: 'sasso-buco', nome: 'Sasso col buco', icona: '🪨', raro: 3, frase: 'Un sasso con un buco in mezzo: dicono che porti fortuna.' },
  { id: 'ammonite', nome: 'Ammonite', icona: '🐚', raro: 3, frase: 'Una conchiglia di pietra di milioni di anni fa, quando qui c\'era il mare.' },
  { id: 'chiave', nome: 'Chiave arrugginita', icona: '🗝️', raro: 3, frase: 'Chissà quale porta apriva…' },
  { id: 'corno', nome: 'Corno di cervo', icona: '🦌', raro: 3, mesi: [1, 2, 3, 4], frase: 'Il cervo lo perde a fine inverno e gli ricresce in primavera.' },
  { id: 'campanella', nome: "Campanella d'argento", icona: '🔔', raro: 3, frase: 'Tintinna ancora, piano piano.' },
  { id: 'vetro', nome: 'Vetro levigato', icona: '🟢', raro: 3, frase: "Un pezzetto di vetro verde, fatto liscio dall'acqua." },
  { id: 'dente', nome: 'Dente di squalo fossile', icona: '🦈', raro: 4, frase: 'Un dente di squalo, nel bosco! È rimasto qui da quando c\'era il mare.' },
  { id: 'ametista', nome: 'Ametista', icona: '💜', raro: 4, frase: 'Un cristallo viola che brilla al sole.' },
  { id: 'geode', nome: 'Geode', icona: '🔮', raro: 4, frase: 'Fuori sembra un sasso, dentro è pieno di cristalli.' },
  { id: 'freccia', nome: 'Punta di freccia', icona: '🔺', raro: 4, frase: 'Di pietra scheggiata, fatta da chi viveva qui tantissimo tempo fa.' },
  { id: 'stella-alpina', nome: 'Stella alpina', icona: '⚘', raro: 4, mesi: [6, 7, 8, 9], frase: 'Un fiore raro raro, portato dal vento dalla montagna.' },
  { id: 'moneta', nome: 'Moneta antica', icona: '🪙', raro: 5, frase: 'Antichissima, con la faccia di un imperatore.' },
  { id: 'ghianda-oro', nome: "Ghianda d'oro", icona: '🌰', raro: 5, frase: 'Tutta d\'oro! Il corvo dice che ne esiste una sola al mondo.' },
];
export const RITROVAMENTO = Object.fromEntries(RITROVAMENTI.map((r) => [r.id, r])) as Record<string, DefRitrovamento>;

export interface Museo {
  ritrovamenti: Record<string, string>; // id → giorno in cui è stato trovato
  funghi: string[]; // le specie esposte nella sala dei funghi
  giornoPreso: string; // ultimo giorno in cui Giada ha preso la cosa che brillava
  extra?: number; // solo per le prove: cambia la cosa del giorno
}

export function museoDi(s: StatoGioco): Museo {
  s.museo ??= { ritrovamenti: {}, funghi: [], giornoPreso: '' };
  return s.museo;
}

export function haMuseo(s: StatoGioco): boolean {
  return s.costruzioni.some((c) => c.id === 'museo');
}

/** I biglietti dei visitatori per un pezzo nuovo: più è raro, più castagne. */
export function biglietti(raro: number): number {
  return 2 + raro * 2;
}

const meseDi = (data: string) => Number(data.slice(5, 7));

/** Sceglie un ritrovamento: i rari capitano di rado; quelli che mancano escono più spesso. */
export function scegliRitrovamento(s: StatoGioco, mese: number, r: () => number): string {
  const ce = museoDi(s).ritrovamenti;
  const lista = RITROVAMENTI.filter((x) => !x.mesi || x.mesi.includes(mese));
  const pesi = lista.map((x) => (1 / (x.raro * x.raro)) * (ce[x.id] ? 0.25 : 1));
  const tot = pesi.reduce((a, b) => a + b, 0);
  let k = r() * tot;
  for (let i = 0; i < lista.length; i++) {
    k -= pesi[i];
    if (k < 0) return lista[i].id;
  }
  return lista[lista.length - 1].id;
}

/** La cosa che brilla oggi nel villaggio (null se Giada l'ha già presa). Sempre la stessa per tutto il giorno. */
export function ritrovamentoDelGiorno(s: StatoGioco, oggi: string): { id: string; angolo: number; distanza: number } | null {
  if (museoDi(s).giornoPreso === oggi) return null;
  const r = rng(hash(`${s.inizio}|${s.nomeVillaggio}|trovato|${oggi}|${museoDi(s).extra ?? 0}`));
  const id = scegliRitrovamento(s, meseDi(oggi), r);
  return { id, angolo: r() * Math.PI * 2, distanza: 0.35 + r() * 0.5 };
}

export interface Preso {
  id: string;
  nuovo: boolean; // non ce l'aveva ancora
  castagne: number; // biglietti (solo se va al museo ed è nuovo) o una castagna se è un doppione
}

/** Mette un ritrovamento nella collezione (e nel museo, se c'è). */
export function aggiungiRitrovamento(s: StatoGioco, id: string, oggi: string): Preso | null {
  const d = RITROVAMENTO[id];
  if (!d) return null;
  const m = museoDi(s);
  const nuovo = !m.ritrovamenti[id];
  let castagne = 0;
  if (nuovo) {
    m.ritrovamenti[id] = oggi;
    if (haMuseo(s)) castagne = biglietti(d.raro);
  } else castagne = 1; // un doppione: lo regala al corvo, che in cambio dà una castagna
  s.ghiande += castagne;
  return { id, nuovo, castagne };
}

/** Giada tocca la cosa che brilla: la prende. */
export function prendiRitrovamento(s: StatoGioco, oggi: string): Preso | null {
  const r = ritrovamentoDelGiorno(s, oggi);
  if (!r) return null;
  museoDi(s).giornoPreso = oggi;
  return aggiungiRitrovamento(s, r.id, oggi);
}

/** Espone un fungo nella sala dei funghi: ne prende uno dal cestino. */
export function esponiFungo(s: StatoGioco, id: string): number | null {
  const d = FUNGO[id];
  const m = museoDi(s);
  if (!d || !haMuseo(s) || m.funghi.includes(id) || !s.funghi?.cestino[id]) return null;
  s.funghi.cestino[id] -= 1;
  if (!s.funghi.cestino[id]) delete s.funghi.cestino[id];
  m.funghi.push(id);
  const castagne = biglietti(d.raro);
  s.ghiande += castagne;
  return castagne;
}

/** Quanti pezzi ci sono nel museo. */
export function pezziEsposti(s: StatoGioco): number {
  return haMuseo(s) ? Object.keys(s.museo?.ritrovamenti ?? {}).length + (s.museo?.funghi.length ?? 0) : 0;
}
