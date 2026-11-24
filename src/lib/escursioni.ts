// Le escursioni: dopo una giornata particolare (molto bella, o pesante, o di paura, o di rabbia)
// Giada può partire con il suo animale del cuore per uno dei posti lontani scoperti dal castoro.
// Laggiù conoscono qualcuno del posto, che racconta come fanno loro quando si sentono così.
// Niente prediche: storie, abitudini del posto, un piccolo dono. E l'animale se ne ricorda.
import { giorniTra } from './date';
import { BIOMA, biomiScoperti, type DefBioma } from './biomi';
import type { Animale, Emozione, StatoGioco, VoceDiario } from './tipi';

export type Giornata = 'triste' | 'paura' | 'rabbia' | 'stanca' | 'felice';

export const NOME_GIORNATA: Record<Giornata, string> = {
  triste: 'una giornata triste',
  paura: 'una giornata di paura',
  rabbia: 'una giornata di rabbia',
  stanca: 'una giornata pesante',
  felice: 'una giornata bellissima',
};

const CATEGORIA: Record<Emozione, Giornata> = {
  tristezza: 'triste', paura: 'paura', attesa: 'paura', rabbia: 'rabbia', disgusto: 'rabbia', gioia: 'felice', fiducia: 'felice', sorpresa: 'felice',
};

/** Per quanti giorni dopo la pagina si può partire. */
export const GIORNI_PER_PARTIRE = 3;

/**
 * Che giornata è stata, se è stata "particolare": un'emozione forte (3 su 3), più emozioni belle insieme,
 * o una giornata segnata come difficile. Le giornate normali non aprono escursioni.
 */
export function giornataParticolare(v: Pick<VoceDiario, 'emozioni' | 'giornataDifficile'>): Giornata | null {
  const lista = (Object.entries(v.emozioni) as [Emozione, number][]).filter(([, n]) => (n ?? 0) > 0).sort((a, b) => b[1] - a[1]);
  const forte = lista.find(([, n]) => n >= 3);
  const negative = lista.filter(([e]) => CATEGORIA[e] !== 'felice');
  if (v.giornataDifficile) {
    // difficile: quale emozione negativa c'era di più (se nessuna, è stata pesante)
    return negative.length ? CATEGORIA[negative[0][0]] : 'stanca';
  }
  if (forte) return CATEGORIA[forte[0]];
  const belle = lista.filter(([e]) => CATEGORIA[e] === 'felice').reduce((t, [, n]) => t + n, 0);
  if (belle >= 4) return 'felice';
  return null;
}

export interface Escursione {
  voce: string; // la pagina del diario che l'ha aperta
  data: string;
  luogo: string;
  animale: string;
  giornata: Giornata;
}

export function escursioniFatte(s: StatoGioco): Escursione[] {
  return s.escursioni ?? [];
}

/** L'escursione che si può fare adesso (la pagina particolare più recente, degli ultimi giorni, non ancora usata). */
export function escursionePossibile(s: StatoGioco, voci: VoceDiario[], oggi: string): { voce: VoceDiario; giornata: Giornata } | null {
  if (!biomiScoperti(s).length || !s.animali.some((a) => a.fase !== 'uovo')) return null;
  const fatte = new Set(escursioniFatte(s).map((e) => e.voce));
  // una al giorno basta: dopo un'escursione si riposa fino a domani
  if (escursioniFatte(s).some((e) => e.data === oggi)) return null;
  const ordinate = [...voci].sort((a, b) => (a.data === b.data ? b.creata - a.creata : a.data < b.data ? 1 : -1));
  for (const v of ordinate) {
    const g = giorniTra(v.data, oggi);
    if (g < 0) continue;
    if (g > GIORNI_PER_PARTIRE) break;
    if (fatte.has(v.id)) continue;
    const giornata = giornataParticolare(v);
    if (giornata) return { voce: v, giornata };
  }
  return null;
}

/** L'animale del cuore di Giada (quello che parte con lei), se c'è ancora ed è nato. */
export function compagno(s: StatoGioco): Animale | null {
  const a = s.animali.find((x) => x.id === s.compagno);
  return a && a.fase !== 'uovo' ? a : null;
}

export interface Abitante {
  nome: string;
  specie: 'lepre' | 'papera' | 'asino' | 'daino' | 'cavallo' | 'uccellino';
  manto: number;
  saluto: string;
  dono: string; // cosa regala per ricordo
  parole: Record<Giornata, string[]>; // cosa racconta, a seconda della giornata
}

/** Chi si incontra in ogni posto lontano. */
export const ABITANTI: Record<string, Abitante> = {
  neve: {
    nome: 'Nonna Fiocca', specie: 'lepre', manto: 2,
    saluto: 'Oh, che bella sorpresa! Benvenuti a Borgo Fiocco. Entrate, entrate: c\'è la cioccolata calda sul fuoco.',
    dono: 'una sciarpa di lana a righe',
    parole: {
      triste: [
        'Anche quassù certi giorni il sole non esce proprio. Allora accendiamo il camino e stiamo vicini, senza dover per forza parlare.',
        'La neve non si toglie con la fretta: si scioglie piano, quando è il suo momento. E sotto, intanto, i semi aspettano la primavera.',
      ],
      paura: [
        'Quando ero piccola avevo una paura tremenda della valanga. Mio papà mi ha insegnato un trucco: si guarda solo il prossimo passo.',
        'Tutto il sentiero insieme fa paura. Un passo solo, no. E poi un altro. E un altro ancora… e a un certo punto ti giri e sei arrivata in cima.',
      ],
      rabbia: [
        'Sai cosa facciamo a Borgo Fiocco quando siamo arrabbiati? Usciamo e tiriamo palle di neve contro il grande pino. Tante tante!',
        'Poi ci buttiamo sulla neve a ridere col fiatone. La rabbia deve uscire da qualche parte: meglio su un albero, che tanto non si offende.',
      ],
      stanca: [
        'Le marmotte qui dormono tutto l\'inverno, e nessuno dice loro che sono pigre. Anche le montagne, d\'inverno, stanno ferme sotto la neve.',
        'Riposare è una cosa seria. Stasera coperta, cioccolata e niente altro: è tutto quello che c\'è da fare.',
      ],
      felice: [
        'Che bello vederti così! Quassù, quando qualcuno è felice, suoniamo la campanella della piazza: dlin dlon! Così lo sa tutto il borgo.',
        'Una gioia che si racconta scalda più del camino. Torna a trovarci, e portaci un po\' di quel sorriso.',
      ],
    },
  },
  mare: {
    nome: 'Capitana Piuma', specie: 'papera', manto: 0,
    saluto: 'Ahoy! Benvenuti a Porto Conchiglia! Io sono la capitana della barchetta gialla. Venite, sediamoci sul molo.',
    dono: 'una conchiglia dove si sente il mare',
    parole: {
      triste: [
        'Hai visto le onde? Vanno e vengono, vanno e vengono. Anche i giorni grigi sono così: arrivano, ma poi si ritirano.',
        'Quando sono giù vengo qui sul molo e lascio che il vento mi spettini le piume. Non risolve niente… ma fa compagnia.',
      ],
      paura: [
        'La prima volta che sono uscita in mare con la tempesta tremavo come una foglia. Sai cos\'ho fatto? Ho guardato il faro.',
        'Quando hai paura, cerca la tua luce del faro: una persona, un posto, una canzone. Non toglie le onde, ma ti dice dov\'è casa.',
      ],
      rabbia: [
        'Il mare a volte si arrabbia tantissimo: onde alte così, schiuma dappertutto! E nessuno gli dice che non deve.',
        'Poi, piano piano, torna liscio come uno specchio. La rabbia passa, se la lasci passare. Intanto, facciamo una corsa sulla spiaggia?',
      ],
      stanca: [
        'Anche le barche, dopo un viaggio lungo, tornano in porto e si fanno cullare. Nessuno pretende che navighino sempre.',
        'Stasera sei in porto. Ancorati, e lascia che le onde ti cullino.',
      ],
      felice: [
        'Si vede da lontano che sei contenta! Sembri il sole sull\'acqua alle cinque del pomeriggio.',
        'Qui al porto, le giornate belle le scriviamo sulle vele. Così, quando partiamo, le portiamo con noi in giro per il mare!',
      ],
    },
  },
  fiume: {
    nome: 'Zio Mugnaio', specie: 'asino', manto: 1,
    saluto: 'Buongiorno, buongiorno! Benvenuti a Ponte dei Salici. Sentite che bel rumore fa la ruota del mulino?',
    dono: 'un sacchettino di farina per fare i biscotti',
    parole: {
      triste: [
        'La mia ruota gira con l\'acqua che passa: quella allegra e quella torbida, tutta. E con tutta l\'acqua fa farina buona.',
        'Le giornate tristi passano sotto il ponte come il fiume. Tu non devi trattenerle e non devi spingerle: passano da sole.',
      ],
      paura: [
        'Vedi quel ponte? La prima volta che l\'ho attraversato avevo le zampe che tremavano. Lo guardavo e mi sembrava lunghissimo.',
        'Allora mi sono fatto accompagnare da un amico. Le cose che fanno paura, in due diventano la metà.',
      ],
      rabbia: [
        'Quando sono arrabbiato vengo a lanciare i sassi piatti nel fiume. Uno, due, tre rimbalzi! Ci vuole concentrazione, sai?',
        'E mentre conto i rimbalzi, la rabbia si mette in fila e aspetta. A volte, quando ho finito, se n\'è andata.',
      ],
      stanca: [
        'Anche il mulino, la sera, si ferma. Chiudo la paratia, la ruota rallenta… e tutto il paese sente il silenzio.',
        'Domani gira di nuovo. Ma stasera no: stasera si sta.',
      ],
      felice: [
        'Ah, che bella faccia contenta! Con una giornata così si potrebbe fare il pane per tutto il paese.',
        'Lo sai? Le giornate felici sono come la farina: se le metti da parte, poi ci fai i biscotti nei giorni grigi.',
      ],
    },
  },
  ciliegi: {
    nome: 'Maestro Petalo', specie: 'daino', manto: 0,
    saluto: 'Benvenuti a Petali Rosa. Sedetevi sotto il ciliegio, il tè è appena pronto. Guardate come cadono i petali.',
    dono: 'un ventaglio di carta dipinto con i fiori',
    parole: {
      triste: [
        'I fiori di ciliegio durano pochi giorni, e poi cadono. Qui nessuno si arrabbia con loro: li guardiamo cadere, e diciamo che è bello lo stesso.',
        'Anche essere tristi fa parte delle stagioni. Non bisogna cacciarla via: basta sedersi accanto, come accanto a un amico.',
      ],
      paura: [
        'Prova con me: tre respiri lenti, come il vento tra i rami. Dentro… e fuori. Dentro… e fuori. Dentro… e fuori.',
        'La paura è come un uccellino spaventato: se corri, scappa sbattendo le ali. Se stai ferma e respiri, piano piano si posa.',
      ],
      rabbia: [
        'Nel mio giardino c\'è un sasso grande, quello lì. Quando ero giovane e mi arrabbiavo, gli raccontavo tutto. Ad alta voce!',
        'Il sasso ascolta sempre e non risponde mai male. Dopo, la rabbia era più piccola. Vuoi provare anche tu?',
      ],
      stanca: [
        'Nel giardino, l\'albero più bello non è quello che fiorisce sempre: è quello che sa quando riposare.',
        'Una tazza di tè, una coperta, e lasciare che la giornata si spenga piano, come una lanterna.',
      ],
      felice: [
        'Oggi brilli come una lanterna di carta! Qui, quando siamo felici, scriviamo un desiderio e lo appendiamo ai rami.',
        'Scrivi anche tu il tuo: il vento lo porta lontano, e un pezzetto della tua gioia arriva a qualcuno che ne ha bisogno.',
      ],
    },
  },
  oasi: {
    nome: 'Zefiro', specie: 'cavallo', manto: 2,
    saluto: 'Benvenuti a Duna Dorata, viaggiatori! Avete fatto tanta strada. Bevete, c\'è l\'acqua fresca della fonte.',
    dono: 'un vasetto di sabbia dorata con un dattero',
    parole: {
      triste: [
        'Nel deserto si cammina tanto prima di trovare l\'oasi. A volte sembra che non arrivi mai. Ma l\'acqua c\'è, anche quando non si vede.',
        'Stasera fermati qui con noi, all\'ombra delle palme. Nessuno ha fretta, a Duna Dorata.',
      ],
      paura: [
        'Le notti nel deserto sono buie buie. Quando avevo paura, la mia mamma mi faceva contare le stelle.',
        'Più stelle contavo, più mi accorgevo che non ero solo. C\'è sempre più luce di quanta sembri, se guardi in su.',
      ],
      rabbia: [
        'Hai mai visto una tempesta di sabbia? Arriva, gira gira, solleva tutto… e poi si posa. E le dune hanno una forma nuova.',
        'Corri con me fino a quella duna e ritorno, più veloce che puoi! Pronti… via! Dopo, si respira meglio.',
      ],
      stanca: [
        'I cammelli, nelle ore calde, si sdraiano e non fanno proprio niente. E sono i più saggi del deserto.',
        'Fai come loro: sdraiati all\'ombra e lascia che la giornata si raffreddi.',
      ],
      felice: [
        'Ah, la felicità! Qui diciamo che è come un\'oasi: quando la trovi, chiami gli amici a bere insieme.',
        'Stasera accendiamo il fuoco e suoniamo i tamburi per te. Bum bum ba-bum!',
      ],
    },
  },
  coralli: {
    nome: 'Coco', specie: 'uccellino', manto: 1,
    saluto: 'Benvenuti, benvenuti, BENVENUTI a Baia Turchese! Io sono Coco, ripeto sempre tutto tre volte! Tre volte!',
    dono: 'una perla piccola piccola, rosa come il tramonto',
    parole: {
      triste: [
        'La mia amica tartaruga dice sempre: quando il mare è mosso in superficie, sotto, in fondo, è calmo calmo.',
        'Anche dentro di te c\'è un posto calmo, sotto le onde. Ci si arriva piano, scendendo giù giù, respirando.',
      ],
      paura: [
        'Io ho paura dei granchi. Sì, io, un pappagallo! Ma sai cosa ho scoperto? Anche loro hanno paura di me!',
        'Le cose che fanno paura, a guardarle da vicino, diventano a volte più piccole. A volte. Non sempre. Ma a volte sì!',
      ],
      rabbia: [
        'Quando sono arrabbiato, strillo dalla cima della palma: CRAAAA! Tutta la baia mi sente. E poi mi sento meglio, meglio, meglio!',
        'Prova anche tu, qui nessuno si spaventa. Dopo, facciamo un tuffo tra i coralli per rinfrescarci.',
      ],
      stanca: [
        'I delfini dormono con un occhio solo, sai? Metà cervello riposa e metà nuota. Ma tu non sei un delfino!',
        'Tu stasera puoi chiudere tutti e due gli occhi. Tutti e due. Tutti e due!',
      ],
      felice: [
        'Che bello, che bello, che bello! Si vede che è stata una giornata speciale!',
        'Qui, quando qualcuno è felice, i delfini fanno i salti fuori dall\'acqua. Guarda, guarda laggiù… SPLASH!',
      ],
    },
  },
};

/** Cosa dice l'animale di Giada al ritorno, a seconda della giornata. */
const RITORNO: Record<Giornata, string> = {
  triste: 'Grazie di avermi portato con te. Oggi non c\'era niente da aggiustare: era bello solo stare insieme.',
  paura: 'Sai, mentre camminavamo sul sentiero avevo un po\' paura anch\'io. Ma eravamo in due.',
  rabbia: 'Mi è piaciuto tanto! Mi sento più leggero. Tu?',
  stanca: 'Che bel viaggio… ora però facciamo i bravi e andiamo a riposare, eh?',
  felice: 'Che giornata! Me la ricorderò per sempre. Grazie di avermi portato con te!',
};

export interface Racconto {
  luogo: DefBioma;
  abitante: Abitante;
  righe: { chi: string; testo: string }[];
}

/** Il racconto dell'escursione (sempre lo stesso per la stessa pagina, ma diverso tra le pagine). */
export function raccontoEscursione(luogo: string, giornata: Giornata, a: Animale, chiAnimale: string): Racconto | null {
  const b = BIOMA[luogo];
  const ab = ABITANTI[luogo];
  if (!b || !ab) return null;
  return {
    luogo: b,
    abitante: ab,
    righe: [
      { chi: ab.nome, testo: ab.saluto },
      { chi: chiAnimale, testo: `Ciao! Io e Giada abbiamo avuto ${NOME_GIORNATA[giornata]}, e siamo ${a.sesso === 'f' ? 'venute' : 'venuti'} fin qui.` },
      ...ab.parole[giornata].map((testo) => ({ chi: ab.nome, testo })),
      { chi: ab.nome, testo: `Prima di andare, tenete: ${ab.dono}. Così vi ricordate di ${b.villaggio}.` },
      { chi: chiAnimale, testo: RITORNO[giornata] },
    ],
  };
}

/** Segna l'escursione come fatta: l'animale se la ricorda, e il dono resta. */
export function fai(s: StatoGioco, voce: string, luogo: string, animale: string, giornata: Giornata, oggi: string): Escursione | null {
  const a = s.animali.find((x) => x.id === animale);
  const b = BIOMA[luogo];
  const ab = ABITANTI[luogo];
  if (!a || !b || !ab || escursioniFatte(s).some((e) => e.voce === voce)) return null;
  const e: Escursione = { voce, data: oggi, luogo, animale, giornata };
  s.escursioni ??= [];
  s.escursioni.push(e);
  if (s.escursioni.length > 200) s.escursioni.splice(0, s.escursioni.length - 200);
  s.compagno = animale;
  a.ricordi.push({ data: oggi, frase: `Giada mi ha portato in escursione a ${b.villaggio}, e ${ab.nome} ci ha regalato ${ab.dono}.` });
  if (a.ricordi.length > 30) a.ricordi.splice(0, a.ricordi.length - 30);
  a.umore = Math.min(100, a.umore + 10);
  return e;
}
