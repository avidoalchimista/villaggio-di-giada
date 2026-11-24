// Il castoro: dopo qualche giorno arriva al limite del bosco e si mette a rosicchiare un albero,
// con tutta la calma del mondo: ci mette una settimana per albero. Quando l'albero cade, lo racconta a Giada.
// Gli alberi caduti restano come ceppi; dopo un po' ricrescono (così il bosco non sparisce mai).
import { hash } from './caso';
import { giorniTra } from './date';
import type { Evento, StatoGioco } from './tipi';

export interface Castoro {
  arrivo: string; // il giorno in cui è arrivato
  albero: number; // l'albero che sta rosicchiando, come angolo (in gradi) sul bordo del bosco
  inizio: string; // da quando lo rosicchia
  tagliati: number[]; // gli ultimi alberi caduti (angoli): lì c'è un ceppo
  totale: number; // quanti alberi ha fatto cadere in tutto
}

/** Dopo quanti giorni di villaggio arriva il castoro. */
export const GIORNI_PRIMA_DEL_CASTORO = 10;
/** Quanto ci mette a rosicchiare un albero. */
export const GIORNI_PER_ALBERO = 7;
/** Quanti ceppi restano: i più vecchi ricrescono. */
export const CEPPI = 5;

/** Il prossimo albero: lontano dal viale d'ingresso (davanti, a 90°) e dagli ultimi caduti. */
function prossimoAlbero(s: StatoGioco, c: Pick<Castoro, 'tagliati' | 'totale' | 'albero'> | null): number {
  const vicino = c?.albero;
  for (let k = 0; k < 40; k++) {
    // di solito l'albero accanto all'ultimo (il castoro non fa molta strada), ogni tanto uno nuovo
    const base = vicino !== undefined && k < 20 ? vicino + 25 + (hash(`${s.seme}:${c?.totale}:${k}`) % 40) - 20 : hash(`${s.seme}:castoro:${c?.totale ?? 0}:${k}`) % 360;
    const a = ((Math.round(base) % 360) + 360) % 360;
    const dalViale = Math.abs(((a - 90 + 540) % 360) - 180);
    if (dalViale < 35) continue;
    if (c?.tagliati.some((t) => Math.abs(((a - t + 540) % 360) - 180) < 12)) continue;
    return a;
  }
  return 270;
}

/** Quanto ha rosicchiato dell'albero di adesso: da 0 (appena cominciato) a 1 (sta per cadere). */
export function avanzamento(c: Castoro, oggi: string): number {
  return Math.max(0, Math.min(1, giorniTra(c.inizio, oggi) / GIORNI_PER_ALBERO));
}

/** Quanti giorni mancano perché cada l'albero di adesso. */
export function giorniAllAlbero(c: Castoro, oggi: string): number {
  return Math.max(1, GIORNI_PER_ALBERO - giorniTra(c.inizio, oggi));
}

/** Un giorno per il castoro: arriva, o rosicchia, o fa cadere l'albero e lo racconta. */
export function castoroDelGiorno(s: StatoGioco, giorno: string, out: Evento[]) {
  const racconta = (testo: string) => {
    const e: Evento = { data: giorno, tipo: 'castoro', testo };
    s.eventi.push(e);
    if (s.eventi.length > 500) s.eventi.splice(0, s.eventi.length - 500);
    out.push(e);
  };
  if (!s.castoro) {
    if (giorniTra(s.inizio, giorno) < GIORNI_PRIMA_DEL_CASTORO || !s.animali.some((a) => a.fase !== 'uovo')) return;
    s.castoro = { arrivo: giorno, albero: prossimoAlbero(s, null), inizio: giorno, tagliati: [], totale: 0 };
    racconta('Ciao Giada! Sono un castoro, sono appena arrivato al limite del bosco. Mi piace tanto rosicchiare gli alberi… ma piano piano: uno a settimana! Ti dirò quando ne cade uno.');
    return;
  }
  const c = s.castoro;
  if (giorniTra(c.inizio, giorno) < GIORNI_PER_ALBERO) return;
  c.tagliati.push(c.albero);
  if (c.tagliati.length > CEPPI) c.tagliati.splice(0, c.tagliati.length - CEPPI);
  c.totale++;
  c.albero = prossimoAlbero(s, c);
  c.inizio = giorno;
  const quanti = c.totale === 1 ? 'il mio primo albero' : `il mio ${c.totale}° albero`;
  racconta(`Crunch crunch… TONF! Giada, ho finito di rosicchiare ${quanti}: è caduto giù al limite del bosco. Ora ne comincio un altro, con calma.`);
}
