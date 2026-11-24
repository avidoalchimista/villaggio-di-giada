// L'acquario: un edificio grande, da costruire con tante castagne. Dentro nuotano i pesci
// che Giada pesca al laghetto (ogni pesce preso ci va a finire, pian piano si riempie),
// e quelli comprati dai villaggi dei posti lontani che il castoro ha scoperto.
import { BIOMI, biomiScoperti } from './biomi';
import { PESCI, type DefPesce } from './pesca';
import type { StatoGioco } from './tipi';

export interface PesceInVasca {
  id: string; // il tipo di pesce
  cm: number;
  da: string; // 'laghetto' oppure l'id del posto lontano da cui è arrivato
  data: string;
}

export interface Acquario {
  pesci: PesceInVasca[];
}

/** Quanti pesci ci stanno: oltre, quelli di un tipo già pieno tornano nel laghetto. */
export const POSTI_VASCA = 40;
/** Quanti pesci uguali al massimo (così c'è varietà). */
export const UGUALI_MAX = 3;

/** Tutti i pesci che possono stare nell'acquario: quelli del laghetto (non lo stivale!) e quelli dei posti lontani. */
export const PESCI_ACQUARIO: DefPesce[] = [...PESCI.filter((p) => p.forma !== 'cosa'), ...BIOMI.flatMap((b) => b.pesci)];
export const PESCE = Object.fromEntries(PESCI_ACQUARIO.map((p) => [p.id, p])) as Record<string, DefPesce>;

export function haAcquario(s: StatoGioco): boolean {
  return s.costruzioni.some((c) => c.id === 'acquario');
}

export function acquarioDi(s: StatoGioco): Acquario {
  s.acquario ??= { pesci: [] };
  return s.acquario;
}

/** Il prezzo di un pesce dei posti lontani: più è raro, più costa. */
export function prezzoPesce(p: DefPesce): number {
  return 4 + p.raro * 4;
}

/**
 * Mette un pesce nella vasca. Ritorna come è andata: 'dentro', oppure 'pieno' se ce ne sono già
 * abbastanza di quel tipo (o la vasca è piena) e allora torna a nuotare nel laghetto.
 */
export function mettiInVasca(s: StatoGioco, id: string, cm: number, da: string, oggi: string): 'dentro' | 'pieno' | 'no' {
  if (!haAcquario(s) || !PESCE[id]) return 'no';
  const a = acquarioDi(s);
  const uguali = a.pesci.filter((x) => x.id === id);
  if (a.pesci.length >= POSTI_VASCA || uguali.length >= UGUALI_MAX) {
    // se è più grande del più piccolo di quelli uguali, prende il suo posto (il piccolo torna nel laghetto)
    const piccolo = uguali.sort((x, y) => x.cm - y.cm)[0];
    if (piccolo && cm > piccolo.cm && da === 'laghetto' && piccolo.da === 'laghetto') {
      Object.assign(piccolo, { cm, data: oggi });
      return 'dentro';
    }
    return 'pieno';
  }
  a.pesci.push({ id, cm, da, data: oggi });
  return 'dentro';
}

/**
 * Appena costruito, l'acquario non è vuoto: gli animali ci mettono un pesce di ogni tipo
 * che Giada ha già trovato al laghetto (della misura più grande che ha preso).
 */
export function riempiAllInizio(s: StatoGioco, oggi: string): number {
  let n = 0;
  for (const [id, x] of Object.entries(s.pesca?.presi ?? {})) {
    if (!PESCE[id] || acquarioDi(s).pesci.some((p) => p.id === id)) continue;
    if (mettiInVasca(s, id, x.record, 'laghetto', oggi) === 'dentro') n++;
  }
  return n;
}

/** I pesci in vendita: quelli dei posti lontani già scoperti. */
export function pesciInVendita(s: StatoGioco): { luogo: (typeof BIOMI)[number]; pesci: DefPesce[] }[] {
  return biomiScoperti(s).map((luogo) => ({ luogo, pesci: luogo.pesci }));
}

/** Compra un pesce da un villaggio lontano: arriva con il carretto e va dritto nella vasca. */
export function compraPesce(s: StatoGioco, id: string, oggi: string): 'ok' | 'castagne' | 'pieno' | 'no' {
  const vendita = pesciInVendita(s).find((v) => v.pesci.some((p) => p.id === id));
  const p = PESCE[id];
  if (!vendita || !p || !haAcquario(s)) return 'no';
  const prezzo = prezzoPesce(p);
  if (s.ghiande < prezzo) return 'castagne';
  const a = acquarioDi(s);
  if (a.pesci.length >= POSTI_VASCA || a.pesci.filter((x) => x.id === id).length >= UGUALI_MAX) return 'pieno';
  // la misura: una via di mezzo, un po' diversa ogni volta
  const k = ((a.pesci.length * 7 + id.length * 3) % 10) / 10;
  const cm = Math.round(p.cm[0] + (p.cm[1] - p.cm[0]) * (0.3 + k * 0.5));
  s.ghiande -= prezzo;
  a.pesci.push({ id, cm, da: vendita.luogo.id, data: oggi });
  return 'ok';
}
