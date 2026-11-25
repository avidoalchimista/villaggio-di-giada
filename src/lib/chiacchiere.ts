// Due chiacchiere con un animale, faccia a faccia: chi è, da quale pagina del diario è nato,
// che emozioni porta con sé, e un consiglio (se Giada vuole, anche su una cosa che gli racconta).
// I consigli sono gentili e semplici, mai prediche. Se in quello che Giada scrive c'è una frase
// di malessere serio (autolesionismo), l'animale non dà consigli: arriva il corvo col discorso serio di sempre.

import frasi from '../dati/frasi.json';
import { haSegnaliSeri } from './analisi';
import { carattereDi, nomeCarattere } from './carattere';
import { EMOZIONE, NOME_VIRTU } from './etichette';
import { accorda, conArticolo, NOME_MANTO, REGOLE } from './gioco';
import { hash } from './caso';
import { defMestiere, nomeMestiere } from './mestieri';
import { indossati } from './vestiti';
import { giorniTra } from './date';
import { VIRTU, type Animale, type Emozione, type Evento, type VoceDiario } from './tipi';

export type Domanda = 'chi' | 'pagina' | 'emozioni' | 'consiglio';

export interface Battuta {
  chi: 'animale' | 'corvo';
  testo: string;
}

export const DOMANDE: { id: Domanda; icona: string; testo: (a: Animale) => string }[] = [
  { id: 'chi', icona: '🐾', testo: () => 'Raccontami di te' },
  { id: 'pagina', icona: '📖', testo: (a) => accorda('Da che pagina sei nat{o}?', a) },
  { id: 'emozioni', icona: '💛', testo: () => 'Che emozioni porti?' },
  { id: 'consiglio', icona: '🌱', testo: () => 'Mi dai un consiglio?' },
];

const a_ = (t: string, a: Pick<Animale, 'sesso'>): Battuta => ({ chi: 'animale', testo: accorda(t, a) });

/** Da terza persona a prima: "la sua poltrona" → "la mia poltrona". */
function mio(t: string): string {
  return t.replace(/\bsua\b/g, 'mia').replace(/\bsuo\b/g, 'mio').replace(/\bsuoi\b/g, 'miei').replace(/\bsue\b/g, 'mie');
}

function giorno(data: string): string {
  return new Date(data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- chi sei ----------

export function chiSei(a: Animale, oggi: string): Battuta[] {
  const c = carattereDi(a);
  const nome = a.nome || conArticolo(a);
  const manto = NOME_MANTO[a.specie][a.aspetto?.manto ?? 0];
  const out: Battuta[] = [a_(`Sono ${nome}, ${conArticolo(a)} ${manto}. Tutti dicono che sono un tipo ${nomeCarattere(a).toLowerCase()}… ${c.intercalare}`, a)];
  out.push(a_(`Mi piacciono ${mio(c.ama)}. E non sopporto ${mio(c.nonSopporta)}!`, a));
  const m = defMestiere(a.mestiere);
  if (m) out.push(a_(`Lavoro come ${nomeMestiere(a)}: è il mestiere di chi ${m.cosa}. La mia bottega si chiama «${m.insegna.toLowerCase()}».`, a));
  else if (a.fase === 'cucciolo' || a.fase === 'giovane') out.push(a_('Sono ancora piccol{o}: passo le giornate a giocare e a guardare come lavorano i grandi. Un giorno sceglierò anch\'io un mestiere!', a));
  else out.push(a_('Un mestiere tutto mio non ce l\'ho ancora: per ora do una mano dove serve.', a));
  const capi = a.vestiti?.length ? indossati(a) : [];
  const sa = (a.abilita ?? []).map((x) => REGOLE.abilita.find((d) => d.id === x)?.nome.toLowerCase()).filter(Boolean);
  const fatto = capi.length ? (/^(una|la)\b/.test(capi[0].nome) ? 'me la sono fatta' : 'me lo sono fatto') : '';
  if (capi.length && sa.length) out.push(a_(`Ho imparato tante cose: ${sa.join(', ')}. E guarda: ${capi[0].nome}! ${fatto.charAt(0).toUpperCase() + fatto.slice(1)} da sol{o}, ti piace?`, a));
  else if (capi.length) out.push(a_(`Guarda: ${capi[0].nome}! ${fatto.charAt(0).toUpperCase() + fatto.slice(1)} da sol{o}, crescendo.`, a));
  else if (sa.length) out.push(a_(`Grazie a te ho imparato: ${sa.join(', ')}.`, a));
  const giorni = Math.max(0, giorniTra(a.nato, oggi));
  out.push(a_(giorni < 2 ? 'Sono arrivat{o} da pochissimo, ma qui mi sento già a casa.' : `Sono nel villaggio da ${giorni} giorni, e ogni giorno mi piace di più.`, a));
  return out;
}

// ---------- da che pagina sei nato ----------

/** La pagina del diario da cui è nato: quella salvata, o (per i villaggi di prima) quella del giorno della schiusa. */
export function paginaDi(a: Animale, voci: VoceDiario[], eventi: Evento[]): VoceDiario | null {
  if (a.pagina) {
    const v = voci.find((x) => x.id === a.pagina);
    if (v) return v;
  }
  const schiusa = eventi.find((e) => e.tipo === 'schiusa' && e.animale === a.id);
  if (!schiusa) return null;
  const quelGiorno = voci.filter((v) => v.data === schiusa.data);
  if (!quelGiorno.length) return null;
  // se quel giorno le pagine erano più d'una, quella con l'emozione che si porta dietro
  return quelGiorno.find((v) => (v.emozioni[a.emozione ?? 'gioia'] ?? 0) > 0) ?? quelGiorno[0];
}

/** Un pezzetto della pagina da ricordare: una frase vera di Giada, non troppo lunga, mai una frase seria. */
export function estratto(testo: string, emozione?: Emozione): string | null {
  const frasiPagina = testo.split(/(?<=[.!?])\s+|\n+/).map((f) => f.trim()).filter((f) => f.length >= 12 && !haSegnaliSeri(f));
  if (!frasiPagina.length) return null;
  // meglio la frase che parla dell'emozione della pagina (se si riconosce), altrimenti la prima
  const parole: Partial<Record<Emozione, RegExp>> = {
    gioia: /felic|content|ridere|risat|bell|gioia|allegr|evviva/i,
    fiducia: /sicur|fidat|abbracc|insieme|tranquill/i,
    paura: /paura|ansia|agitat|preoccup|spaventat/i,
    sorpresa: /sorpres|incredibil|inaspettat|non ci credo|wow/i,
    tristezza: /trist|piant|piang|giù|malincon|mancanz/i,
    rabbia: /arrabb|rabbia|nervos|furios|odio/i,
    disgusto: /schif|disgust|che orrore/i,
    attesa: /aspett|non vedo l'ora|domani|presto/i,
  };
  const re = emozione ? parole[emozione] : undefined;
  let f = (re && frasiPagina.find((x) => re.test(x))) || frasiPagina[0];
  if (f.length > 150) f = f.slice(0, 147).replace(/\s+\S*$/, '') + '…';
  return f;
}

const PORTO: Record<Emozione, string> = {
  gioia: 'una gioia che mi fa saltellare',
  fiducia: 'tanta fiducia: so che qui siamo al sicuro, tutti insieme',
  paura: 'un po\' di paura, e il coraggio che serve per andare avanti lo stesso',
  sorpresa: 'la sorpresa: ogni mattina mi aspetto qualcosa di nuovo',
  tristezza: 'un po\' di malinconia, che mi aiuta ad accorgermi di chi ha bisogno di compagnia',
  disgusto: 'il «questo no, grazie!»: so riconoscere quello che non mi fa bene',
  rabbia: 'un po\' di fuoco, quello che serve per difendere chi voglio bene',
  attesa: 'l\'attesa delle cose belle, che a volte arrivano piano piano',
};

export function daChePagina(a: Animale, pagina: VoceDiario | null, oggi: string): Battuta[] {
  const out: Battuta[] = [];
  if (a.fase === 'uovo') return [a_('Toc toc… sono ancora nell\'uovo! Mi servono le tue pagine per uscire.', a)];
  const emo = a.emozione ?? 'gioia';
  const quando = pagina ? pagina.data : a.nato;
  const giorni = giorniTra(quando, oggi);
  const ieri = giorni === 0 ? 'oggi' : giorni === 1 ? 'ieri' : `il ${giorno(quando)}`;
  out.push(a_(`Il mio uovo è comparso il ${giorno(a.nato)}. Sono uscit{o} ${ieri}, mentre scrivevi una pagina del tuo diario.`, a));
  const pezzo = pagina ? estratto(pagina.testo, emo) : null;
  if (pezzo) out.push(a_(`Quel giorno avevi scritto: «${pezzo}»`, a));
  else if (pagina?.riassunto) out.push(a_(`Il corvo me l'ha raccontata così: «${pagina.riassunto}»`, a));
  if (pagina?.giornataDifficile) out.push(a_('Era una giornata difficile, eppure l\'hai scritta lo stesso. Io sono nat{o} da quel coraggio.', a));
  out.push(a_(`Da quella pagina mi è rimasta la ${EMOZIONE[emo].nome}. Per questo la mia casa ha i colori che ha!`, a));
  return out;
}

// ---------- che emozioni porti ----------

export function emozioniCheporto(a: Animale): Battuta[] {
  const emo = a.emozione ?? 'gioia';
  const out: Battuta[] = [a_(`Dentro di me porto ${PORTO[emo]}.`, a)];
  const tot = VIRTU.reduce((t, v) => t + a.nutrimento[v], 0);
  if (tot > 0) {
    const [prima, seconda] = [...VIRTU].sort((x, y) => a.nutrimento[y] - a.nutrimento[x]);
    const bis = a.nutrimento[seconda] > a.nutrimento[prima] * 0.5 ? ` e la tua ${NOME_VIRTU[seconda].toLowerCase()}` : '';
    out.push(a_(`Mi ha fatto crescere soprattutto la tua ${NOME_VIRTU[prima].toLowerCase()}${bis}: ogni volta che la racconti nel diario, io la sento.`, a));
  }
  if (a.ricordi.length) {
    const r = a.ricordi[a.ricordi.length - 1];
    out.push(a_(`L'ultima pagina che mi è rimasta nel cuore: «${r.frase}»`, a));
  }
  if (a.umore < 45) out.push(a_('Oggi sono un po\' giù… ma quando passi a trovarmi mi torna il sorriso.', a));
  else if (a.umore > 80) out.push(a_('E adesso? Adesso sono contentissim{o}, perché sei qui!', a));
  return out;
}

// ---------- un consiglio ----------

const CONSIGLI: Record<Emozione | 'nessuna', string[]> = {
  tristezza: [
    'Quando ho il cuore pesante mi siedo vicino a qualcuno a cui voglio bene, anche senza parlare. Non devi far finta di stare bene: le giornate grigie passano, come le nuvole.',
    'Le lacrime non sono una cosa brutta: lavano via un po\' di peso. Poi, piano piano, fai una cosa piccola che ti fa bene: una tazza calda, una canzone, una passeggiata.',
    'Se ti senti triste, prova a raccontarlo a una persona di cui ti fidi. Le cose dette in due pesano la metà.',
  ],
  rabbia: [
    'Quando mi arrabbio faccio tre respiri lunghi, così: uno… due… tre. Poi decido cosa fare. La rabbia dice che una cosa ti importa: ascoltala, ma non lasciarle il timone.',
    'Io, quando sono arrabbiat{o}, vado a correre intorno al castagno finché mi passa un po\'. Poi ne parlo con calma: si capisce tutto meglio.',
  ],
  paura: [
    'Anche io ho paura, a volte. Un passo piccolo alla volta: il primo è il più difficile, gli altri vengono dietro.',
    'Quando ho paura penso a tutte le volte che ce l\'ho fatta. Ce ne sono tante, sai? Anche tu ne hai scritte un sacco nel diario.',
  ],
  disgusto: [
    'Se una cosa non ti piace, va bene dirlo. Puoi stare lontana da quello che ti fa stare male e tenerti vicino quello che ti fa bene.',
    'Non tutto deve piacerti per forza! Sapere cosa non vuoi è già un modo per capire cosa vuoi.',
  ],
  sorpresa: [
    'Le sorprese scombinano i piani! Prenditi un momento per capire cosa è cambiato, poi guarda se dentro c\'è nascosto qualcosa di bello.',
  ],
  attesa: [
    'Aspettare è difficile. Io intanto faccio una cosa che mi piace, così il tempo passa più leggero.',
    'Le cose belle a volte arrivano piano piano, come le castagne: prima il fiore, poi il riccio, poi la castagna. Intanto goditi il fiore.',
  ],
  gioia: [
    'Che bello! Tienitela stretta: scrivila nel diario, così quando serve la ritrovi.',
    'Quando sono felice lo dico a tutti, così la gioia si moltiplica. Raccontala a qualcuno!',
  ],
  fiducia: [
    'Sentirsi al sicuro è prezioso. Di\' grazie a chi ti fa sentire così: gli farà tanto piacere.',
  ],
  nessuna: [
    'Ogni giorno, prima di dormire, pensa a una cosa bella che è successa. Anche piccolissima. Vedrai che ce n\'è sempre una.',
    'Bevi un bicchiere d\'acqua, guarda fuori dalla finestra e fai un respiro lungo. Funziona più di quanto pensi!',
    'Non devi fare tutto e subito. Una cosa alla volta, con calma, come facciamo noi nel villaggio.',
    'Sii gentile con te stessa, come lo sei con noi. Te lo meriti.',
  ],
};

/** Il consiglio "a modo suo": ogni carattere ne ha uno suo, da aggiungere a quello comune. */
const A_MODO_MIO: Record<string, string> = {
  sognatore: 'E stasera guarda il cielo: scegli una stella e dalle il tuo nome. Io faccio sempre così.',
  allegro: 'E se proprio non sai cosa fare, metti una canzone e balla! Anche da sola, anche male: funziona!',
  ordinato: 'Io, quando ho la testa in disordine, scrivo una lista. Tre cose, non di più. Poi ne faccio una.',
  dormiglione: 'E poi… una bella dormita sistema tante cose. Fidati di me, sono un esperto.',
  sportivo: 'E poi muoviti un po\'! Due passi all\'aria aperta e la testa si schiarisce.',
  brontolone: 'Uff… lo so, lo so, sembro brontolone. Però a te voglio bene davvero, ecco.',
  curioso: 'E fatti una domanda nuova: «Cosa posso imparare da questa cosa?». Le risposte arrivano!',
  premuroso: 'Hai mangiato? Hai bevuto? Prima di tutto quello, poi il resto. Te lo dico perché ti voglio bene.',
};

/** Quale emozione c'è in una cosa che Giada racconta (con l'analisi del diario). */
export type Analizzatore = (testo: string) => { emozioni: Partial<Record<Emozione, number>>; segnaliSeri: boolean };

/**
 * Un consiglio. Se Giada ha raccontato qualcosa, si risponde a quello; altrimenti l'animale ne dà uno suo.
 * Con frasi di autolesionismo niente consigli: parla il corvo, col discorso serio di sempre.
 */
export function consiglio(a: Animale, k: number, racconto?: string, analizza?: Analizzatore): Battuta[] {
  const c = carattereDi(a);
  if (racconto?.trim()) {
    const an = analizza?.(racconto) ?? { emozioni: {}, segnaliSeri: haSegnaliSeri(racconto) };
    if (an.segnaliSeri || haSegnaliSeri(racconto)) {
      return [
        a_('Grazie di avermelo detto. Mi sembra una cosa troppo grande per un animaletto come me… chiamo il corvo, va bene?', a),
        { chi: 'corvo', testo: frasi.corvo.segnali_seri },
      ];
    }
    const emo = (Object.entries(an.emozioni) as [Emozione, number][]).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1])[0]?.[0];
    const lista = CONSIGLI[emo ?? 'nessuna'];
    const capito = emo ? `Mi sembra che ti senta ${{ gioia: 'felice', fiducia: 'al sicuro', paura: 'un po\' spaventata', sorpresa: 'sorpresa', tristezza: 'triste', disgusto: 'infastidita', rabbia: 'arrabbiata', attesa: 'in attesa di qualcosa' }[emo]}. ` : 'Ti ho ascoltata. ';
    return [
      a_(capito + lista[(k + hash(a.id)) % lista.length], a),
      a_(A_MODO_MIO[c.id] ?? c.intercalare, a),
    ];
  }
  const lista = [...CONSIGLI.nessuna, ...CONSIGLI[a.emozione ?? 'gioia']];
  return [a_(lista[(k + hash(a.id)) % lista.length], a), a_(A_MODO_MIO[c.id] ?? c.intercalare, a)];
}
