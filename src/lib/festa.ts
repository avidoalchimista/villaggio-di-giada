// La festa di paese per il compleanno di Giada (24 luglio).
// Il villaggio si addobba, gli animali preparano una torta, fanno gli auguri uno per uno,
// Giada soffia le candeline e la sera ci sono i fuochi d'artificio.
// Se quel giorno Giada non apre il gioco, la torta la aspetta per qualche giorno.
import { aggiungiGiorni, giorniTra } from './date';
import { accorda } from './gioco';
import type { Animale, Evento, StatoGioco } from './tipi';

/** Mese-giorno del compleanno di Giada. */
export const COMPLEANNO = '07-24';
/** Per quanti giorni dopo il compleanno la festa la aspetta, se non è passata. */
export const GIORNI_DI_ATTESA = 3;
/** Il regalo del villaggio: 24 castagne, come il giorno del compleanno. */
export const CASTAGNE_IN_REGALO = 24;

/** Il compleanno dell'anno di quella data (AAAA-07-24). */
function compleannoDi(data: string): string {
  return `${data.slice(0, 4)}-${COMPLEANNO}`;
}

export function eCompleanno(data: string): boolean {
  return data.slice(5) === COMPLEANNO;
}

/** Il giorno prima: gli animali preparano di nascosto. */
export function eVigilia(data: string): boolean {
  return eCompleanno(aggiungiGiorni(data, 1));
}

/** Quante feste ha già avuto (le date in cui ha soffiato le candeline). */
function feste(s: StatoGioco): string[] {
  return s.compleanni ?? [];
}

/** Quest'anno la festa c'è già stata? */
export function festeggiatoQuestAnno(s: StatoGioco, data: string): boolean {
  return feste(s).some((d) => d.slice(0, 4) === data.slice(0, 4) && d >= compleannoDi(data));
}

/** Oggi c'è una festa da fare: è il compleanno (o pochi giorni dopo) e non si è ancora festeggiato. */
export function festaDaFare(s: StatoGioco, data: string): boolean {
  const g = giorniTra(compleannoDi(data), data);
  return g >= 0 && g <= GIORNI_DI_ATTESA && !festeggiatoQuestAnno(s, data);
}

/** Il villaggio oggi è addobbato: festa ancora da fare, oppure fatta proprio oggi. */
export function villaggioInFesta(s: StatoGioco, data: string): boolean {
  return festaDaFare(s, data) || feste(s).includes(data);
}

/** La festa è in ritardo: Giada non è passata il 24 e gli animali l'hanno aspettata. */
export function festaInRitardo(data: string): boolean {
  return !eCompleanno(data);
}

/** Che compleanno è nel villaggio: 1 = il primo festeggiato qui. */
export function quantaFesta(s: StatoGioco): number {
  return feste(s).length + 1;
}

/** "la seconda festa": al femminile. */
const ORDINALI = ['prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava', 'nona', 'decima'];
export function ordinale(n: number): string {
  return ORDINALI[n - 1] ?? `${n}ª`;
}

// ---------- gli auguri: ognuno a modo suo ----------

const AUGURI: Record<string, string[]> = {
  sognatore: [
    'Tanti auguri, Giada! Stanotte ho sognato che la luna ti mandava un bacio. Secondo me era vero.',
    'Buon compleanno! Ho espresso un desiderio per te su una stella cadente. Non te lo dico, se no non vale.',
  ],
  allegro: [
    'TANTI AUGURI, GIADA! Oggi si balla fino a sera! E domani si balla perché ieri era il tuo compleanno!',
    'Buon compleanno! Ho già mangiato una fetta di torta per controllare che fosse buona. Lo è!',
  ],
  ordinato: [
    'Buon compleanno, Giada. Ho appeso i festoni io: tutti dritti, tutti alla stessa distanza. Li ho misurati due volte.',
    'Tanti auguri! Ho fatto una lista delle cose belle di te. È lunghissima. Ho dovuto attaccare un altro foglio.',
  ],
  dormiglione: [
    'Auguri, Giada… Oggi sono rimast{o} svegli{o} tutto il giorno per te. Beh, quasi tutto.',
    'Buon compleanno… Ti regalo il mio cuscino preferito. No, aspetta, quello mi serve. Ti regalo un abbraccio!',
  ],
  sportivo: [
    'Tanti auguri, Giada! Ho fatto il giro del villaggio di corsa per avvisare tutti. Due volte, per sicurezza!',
    'Buon compleanno! Oggi niente allenamento: oggi si festeggia te! Va bene, giusto un saltino. HOP!',
  ],
  brontolone: [
    'Uff… le feste fanno tanto rumore. Però… tanti auguri, Giada. Davvero. Non dirlo agli altri che sono contento.',
    'Hmpf. I festoni erano storti, li ho sistemati io. Comunque… buon compleanno. Ecco, l\'ho detto.',
  ],
  curioso: [
    'Tanti auguri! Quanti anni fai? E com\'è avere un anno in più? Ti senti diversa? Raccontami tutto!',
    'Buon compleanno, Giada! Ho scoperto che il 24 luglio è il giorno più bello dell\'anno. L\'ho studiato bene.',
  ],
  premuroso: [
    'Buon compleanno, Giada. Ti ho tenuto la fetta di torta più bella, quella con la fragola. È tua.',
    'Tanti auguri. Spero che quest\'anno ti porti tante cose belle, e che quando sei stanca ti ricordi di noi.',
  ],
};
const AUGURI_CUCCIOLO = ['Auguri, Giada! Auguri auguri auguri!', 'Tanti auguriii! Posso soffiare anch\'io una candelina? Una sola!', 'Buon compleanno! Ti ho disegnato una torta. È un po\' storta.'];

/** Gli auguri di un animale, a modo suo (i cuccioli sono piccoli e dicono cose da piccoli). */
export function auguriDi(a: Animale, k: number): string {
  const lista = a.fase === 'cucciolo' ? AUGURI_CUCCIOLO : (AUGURI[a.carattere ?? ''] ?? AUGURI.allegro);
  return accorda(lista[Math.abs(k) % lista.length], a);
}

/** Chi ha fatto la torta: chi fa il pasticcere, il fornaio o il cuoco; altrimenti lo fanno tutti insieme. */
export function chiHaFattoLaTorta(s: StatoGioco): Animale | null {
  for (const m of ['pasticcere', 'fornaio', 'cuoco', 'locandiere']) {
    const a = s.animali.find((x) => x.mestiere === m && x.fase !== 'uovo');
    if (a) return a;
  }
  return null;
}

/** Chi suona alla festa (se c'è un musicista). */
export function chiSuona(s: StatoGioco): Animale | null {
  return s.animali.find((x) => x.mestiere === 'musicista' && x.fase !== 'uovo' && !x.addormentato) ?? null;
}

/** Gli invitati che fanno gli auguri uno per uno (al massimo `max`, gli altri cantano tutti insieme). */
export function invitati(s: StatoGioco, max = 4): Animale[] {
  const svegli = s.animali.filter((a) => a.fase !== 'uovo' && !a.addormentato);
  // prima i più grandi e chi ha più ricordi con Giada
  return [...svegli].sort((a, b) => b.xp - a.xp || b.ricordi.length - a.ricordi.length).slice(0, max);
}

/**
 * Giada ha soffiato le candeline: la festa è fatta.
 * Il villaggio le regala le castagne e ognuno se lo ricorda.
 */
export function festeggia(s: StatoGioco, data: string): Evento {
  const n = quantaFesta(s);
  s.compleanni = [...feste(s), data];
  s.ghiande += CASTAGNE_IN_REGALO;
  for (const a of s.animali) {
    if (a.fase === 'uovo') continue;
    a.ricordi.push({ data, frase: `Giada ha compiuto gli anni e abbiamo fatto una grande festa${n > 1 ? `, la ${ordinale(n)} insieme` : ''}.` });
    a.umore = Math.min(100, a.umore + 20);
  }
  const e: Evento = { data, tipo: 'compleanno', testo: `Festa di compleanno per Giada! Il villaggio ti ha regalato ${CASTAGNE_IN_REGALO} castagne` };
  s.eventi.push(e);
  return e;
}

/** Il corvo, il giorno prima, si lascia scappare qualcosa. */
export const FRASI_VIGILIA = [
  'Psst… Gli animali stanno preparando qualcosa per domani. Io non ho detto niente, cra!',
  'Hai visto come bisbigliano tutti? Domani è un giorno speciale… ma è un segreto!',
];

/** Cosa dice un animale se lo si tocca il giorno della festa (dopo le candeline). */
export function fraseDiFesta(a: Animale, k: number): string {
  const l = [
    'Che bella festa! Grazie di essere venuta, Giada.',
    'Hai visto la torta? Ne è rimasta ancora un po\'!',
    'Stasera ci sono i fuochi d\'artificio! Guarda in alto quando viene buio.',
    'Buon compleanno ancora! Oggi è il giorno più bello dell\'estate.',
    auguriDi(a, k + 1),
  ];
  return l[Math.abs(k) % l.length];
}
