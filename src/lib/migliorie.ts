// Migliorare le case-bottega degli animali con le castagne.
// Ogni casa parte "casetta" (livello 1) e si può far crescere fino al livello 4.
// Da fuori si vede (portico, stanza in più col camino, bandierine e giardino), dentro arrivano cose nuove,
// e la bottega comincia a vendere: mette da parte qualche castagna al giorno per Giada.
// Principio del gioco: niente colpe. La cassa si riempie solo nei giorni in cui il villaggio è sveglio,
// ma non si svuota mai da sola.

import { giorniTra } from './date';
import { REGOLE } from './gioco';
import { FASI, type Animale, type Evento, type Fase, type StatoGioco } from './tipi';

export interface DefLivelloCasa {
  livello: number;
  nome: string;
  descrizione: string;
  costo: number;
  /** il proprietario deve essere cresciuto almeno fin qui */
  fase?: Fase;
  /** pagine di diario scritte in tutto */
  pagine?: number;
  /** castagne che la bottega mette da parte ogni giorno */
  incasso: number;
}

export const LIVELLI_CASA: DefLivelloCasa[] = [
  { livello: 1, nome: 'La casetta', descrizione: 'La prima casa, con l\'insegna del mestiere.', costo: 0, incasso: 0 },
  {
    livello: 2, nome: 'La casa col portico', costo: 15, fase: 'giovane', incasso: 1,
    descrizione: 'Un portico di legno davanti alla porta e i vasi di fiori alle finestre. La bottega comincia a vendere: 1 castagna al giorno.',
  },
  {
    livello: 3, nome: 'La casa col camino', costo: 35, fase: 'giovane', pagine: 15, incasso: 2,
    descrizione: 'Una stanza in più col camino che fuma e due lanterne. Dentro arrivano piante e lucine. La bottega vende di più: 2 castagne al giorno.',
  },
  {
    livello: 4, nome: 'La bottega famosa', costo: 70, fase: 'adulto', pagine: 30, incasso: 3,
    descrizione: 'Bandierine, la stella sul tetto e un giardino fiorito: vengono da lontano a comprare! 3 castagne al giorno.',
  },
];

export const LIVELLO_MASSIMO = LIVELLI_CASA.length;

/** Quanto può contenere la cassa prima di essere piena (non si perde niente: smette solo di salire). */
export const CASSA_GIORNI = 7;

export function livelloCasa(a: Pick<Animale, 'livelloCasa'>): number {
  return Math.min(LIVELLO_MASSIMO, Math.max(1, a.livelloCasa ?? 1));
}

export function defLivello(n: number): DefLivelloCasa {
  return LIVELLI_CASA[Math.min(LIVELLO_MASSIMO, Math.max(1, n)) - 1];
}

export function prossimoLivello(a: Pick<Animale, 'livelloCasa'>): DefLivelloCasa | null {
  const n = livelloCasa(a);
  return n >= LIVELLO_MASSIMO ? null : LIVELLI_CASA[n];
}

export function cassaMassima(a: Pick<Animale, 'livelloCasa'>): number {
  return defLivello(livelloCasa(a)).incasso * CASSA_GIORNI;
}

/** Perché non si può ancora migliorare (frase per Giada), oppure '' se si può. */
export function motivoMiglioria(s: StatoGioco, a: Animale): string {
  const p = prossimoLivello(a);
  if (!p) return 'È già la casa più bella del villaggio!';
  if (!a.mestiere) return 'Prima deve trovare un mestiere.';
  if (p.fase && FASI.indexOf(a.fase) < FASI.indexOf(p.fase)) return `Quando sarà ${p.fase === 'adulto' ? 'adulto' : 'più grande'}.`;
  if (p.pagine && s.numeroVoci < p.pagine) return `Dopo ${p.pagine} pagine di diario (ora ${s.numeroVoci}).`;
  if (s.ghiande < p.costo) return `Mancano ${p.costo - s.ghiande} castagne.`;
  return '';
}

/** Migliora la casa se si può: spende le castagne e restituisce l'evento, altrimenti null. */
export function migliora(s: StatoGioco, id: string, data: string): Evento | null {
  const a = s.animali.find((x) => x.id === id);
  if (!a || motivoMiglioria(s, a)) return null;
  const p = prossimoLivello(a)!;
  s.ghiande -= p.costo;
  a.livelloCasa = p.livello;
  a.cassa ??= 0;
  const nome = a.nome || 'Il suo abitante';
  const e: Evento = { data, tipo: 'costruzione', testo: `${nome} ha una casa nuova: ${p.nome.charAt(0).toLowerCase() + p.nome.slice(1)}!`, animale: a.id };
  s.eventi.push(e);
  return e;
}

/** Un giorno che passa: le botteghe migliorate vendono e mettono da parte castagne (solo se il villaggio è sveglio). */
export function incassiDelGiorno(s: StatoGioco, giorno: string) {
  const vivo = giorniTra(s.ultimaVoce ?? s.inizio, giorno) < REGOLE.castagno.giorniSenzaDiario;
  if (!vivo) return;
  for (const a of s.animali) {
    if (!a.mestiere || a.addormentato) continue;
    const d = defLivello(livelloCasa(a));
    if (!d.incasso) continue;
    a.cassa = Math.min(cassaMassima(a), (a.cassa ?? 0) + d.incasso);
  }
}

/** Giada entra in casa: il proprietario le dà quello che ha messo da parte. */
export function ritiraCassa(s: StatoGioco, id: string): number {
  const a = s.animali.find((x) => x.id === id);
  const n = a?.cassa ?? 0;
  if (!a || n <= 0) return 0;
  a.cassa = 0;
  s.ghiande += n;
  return n;
}
