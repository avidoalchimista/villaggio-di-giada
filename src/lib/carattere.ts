// Il carattere di ogni animale: si vede da come vive in casa, da cosa fa la sera, da come parla.
// Otto caratteri, ispirati ai giochi "cozy" di villaggi di animali e agli archetipi dei libri per bambini:
// ognuno ha abitudini, un modo di dire, cose che ama, cose che non sopporta e oggetti suoi in casa.
// Nel villaggio (al massimo 7 abitanti) ognuno ha un carattere diverso dagli altri.

import { hash } from './caso';
import type { Animale, Specie, StatoGioco } from './tipi';

export type Momento = 'mattina' | 'lavoro' | 'pranzo' | 'sera' | 'notte';

/** I posti della casa dove un animale può stare. */
export type Posto = 'letto' | 'tavolo' | 'finestra' | 'cucina' | 'hobby' | 'lavoro' | 'tappeto';

/** Le cose che si vedono fare in casa (l'animazione la fa la scena dell'interno). */
export type Gesto =
  | 'dorme' | 'mangia' | 'cucina' | 'legge' | 'scrive' | 'guarda' | 'balla' | 'ginnastica' | 'salta' | 'maglia'
  | 'spolvera' | 'annaffia' | 'osserva' | 'seduto' | 'lavora' | 'stiracchia' | 'canta' | 'beve';

export interface AttivitaCasa {
  gesto: Gesto;
  posto: Posto;
  testo: string; // "sta guardando le stelle col cannocchiale" (dopo il nome)
  fumetto?: string;
}

/** Il pezzo d'arredo più importante, quello che racconta il carattere. */
export type Arredo =
  | 'telescopio' | 'grammofono' | 'scaffale' | 'cuscinone' | 'attrezzi' | 'dondolo' | 'vetrina' | 'piante';

export interface Carattere {
  id: string;
  nome: { f: string; m: string };
  emoji: string;
  descrizione: string; // con {nome} e {o}
  ama: string;
  nonSopporta: string;
  intercalare: string; // il suo modo di dire
  arredo: Arredo;
  decorazioni: string[]; // cose appese e sparse per casa (le disegna la scena)
  muro: string; // colore della carta da parati
  coperta: string; // colore della coperta del letto
  mattina: AttivitaCasa[];
  pranzo: AttivitaCasa;
  sera: AttivitaCasa[];
  gioco: AttivitaCasa; // cosa fa quando gli altri lavorano (i piccoli, o chi non ha un mestiere)
  frasi: Record<Momento | 'sempre', string[]>;
}

export const CARATTERI: Carattere[] = [
  {
    id: 'sognatore',
    nome: { f: 'Sognatrice', m: 'Sognatore' },
    emoji: '🌙',
    descrizione: '{nome} ha sempre la testa tra le nuvole. Guarda le stelle, inventa poesie e dà un nome a ogni nuvola che passa.',
    ama: 'le notti limpide e le parole che suonano bene',
    nonSopporta: 'chi dice che le stelle sono solo puntini',
    intercalare: 'Che meraviglia…',
    arredo: 'telescopio',
    decorazioni: ['stelle', 'poesie', 'lucine'],
    muro: '#b9c4e8',
    coperta: '#5d6fb8',
    mattina: [
      { gesto: 'guarda', posto: 'finestra', testo: 'guarda fuori dalla finestra e dà un nome alle nuvole', fumetto: '☁' },
      { gesto: 'scrive', posto: 'tavolo', testo: 'scrive una poesia sul sogno di stanotte', fumetto: '✎' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'mangia piano piano, guardando il cielo', fumetto: '♥' },
    sera: [
      { gesto: 'osserva', posto: 'hobby', testo: 'guarda le stelle col cannocchiale', fumetto: '★' },
      { gesto: 'scrive', posto: 'tavolo', testo: 'scrive i nomi delle stelle nel suo quaderno', fumetto: '✎' },
    ],
    gioco: { gesto: 'guarda', posto: 'finestra', testo: 'sogna a occhi aperti davanti alla finestra', fumetto: '☁' },
    frasi: {
      mattina: ['Stanotte ho sognato di volare sopra il bosco. Tu cosa hai sognato?', 'Quella nuvola sembra un coniglio che sbadiglia. La vedi?'],
      lavoro: ['Mentre lavoro mi vengono in mente le rime più belle.', 'Ho trovato una parola nuova: «crepuscolo». Non è bellissima?'],
      pranzo: ['Il pane sa di sole, oggi.', 'Mangio piano, così il pranzo dura di più.'],
      sera: ['Guarda, la prima stella! Esprimi un desiderio, svelta!', 'Stasera la luna è un sorriso. Si vede che ha avuto una bella giornata.'],
      notte: ['Zzz… le stelle… zzz…', 'Mmh… ancora un po\' di sogno…'],
      sempre: ['Che meraviglia… scusa, mi ero perso{o} a guardare il cielo.', 'Secondo te le stelle ci guardano anche loro?', 'Ti scrivo una poesia, un giorno. Promesso.'],
    },
  },
  {
    id: 'allegro',
    nome: { f: 'Burlona', m: 'Burlone' },
    emoji: '🎉',
    descrizione: '{nome} non sta mai ferm{o}: canta, balla, fa scherzi e ride così forte che si sente da tutto il villaggio.',
    ama: 'le feste, la musica e le bandierine colorate',
    nonSopporta: 'il silenzio troppo lungo',
    intercalare: 'Evviva!',
    arredo: 'grammofono',
    decorazioni: ['bandierine', 'palloncini', 'quadri'],
    muro: '#ffd3b0',
    coperta: '#ff7a8a',
    mattina: [
      { gesto: 'balla', posto: 'tappeto', testo: 'balla col primo disco della giornata', fumetto: '♪' },
      { gesto: 'canta', posto: 'hobby', testo: 'canta sotto la doccia… cioè, davanti al grammofono', fumetto: '♪' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'mangia e racconta barzellette al piatto', fumetto: '☺' },
    sera: [
      { gesto: 'balla', posto: 'tappeto', testo: 'fa una festa da ballo tutta da sol{o}', fumetto: '♪' },
      { gesto: 'canta', posto: 'hobby', testo: 'prova una canzone nuova per la festa del villaggio', fumetto: '♫' },
    ],
    gioco: { gesto: 'salta', posto: 'tappeto', testo: 'salta sul tappeto come su un trampolino', fumetto: '!' },
    frasi: {
      mattina: ['Buongiorno! Oggi è il giorno perfetto per una festa. Come ieri. E come domani!', 'Ho messo il disco più allegro che ho. Balli con me?'],
      lavoro: ['Lavorare cantando è il doppio più veloce. L\'ho misurato!', 'Sai qual è il colmo per un riccio? Essere spinoso con gli amici! Ahah!'],
      pranzo: ['Pranzo! La seconda cosa più bella dopo la merenda!', 'Ho fatto la faccina col purè. Guarda!'],
      sera: ['Festa da ballo! Sei invitata, anzi, sei l\'ospite d\'onore!', 'Ho imparato un passo nuovo: si chiama «la giravolta della castagna».'],
      notte: ['Zzz… evviva… zzz…', 'Ronf… balla… ronf…'],
      sempre: ['Evviva, sei venuta!', 'Ridere fa bene alla pancia. E pure alle orecchie.', 'Se ti annoi, chiamami. Io non mi annoio mai!'],
    },
  },
  {
    id: 'ordinato',
    nome: { f: 'Precisina', m: 'Precisino' },
    emoji: '📏',
    descrizione: '{nome} ha un posto per ogni cosa e ogni cosa al suo posto. Etichetta i barattoli, conta le castagne e non è mai in ritardo.',
    ama: 'le liste, i barattoli tutti uguali e l\'odore di pulito',
    nonSopporta: 'le briciole sul tavolo',
    intercalare: 'Ogni cosa al suo posto!',
    arredo: 'scaffale',
    decorazioni: ['orologio', 'quadri', 'tappetino'],
    muro: '#cfe6d4',
    coperta: '#4f9a7a',
    mattina: [
      { gesto: 'spolvera', posto: 'hobby', testo: 'spolvera i barattoli, uno per uno', fumetto: '✦' },
      { gesto: 'spolvera', posto: 'letto', testo: 'rifà il letto, senza nemmeno una piega', fumetto: '✓' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'pranza all\'ora esatta, con il tovagliolo piegato a triangolo', fumetto: '✓' },
    sera: [
      { gesto: 'scrive', posto: 'tavolo', testo: 'scrive la lista delle cose da fare domani', fumetto: '✎' },
      { gesto: 'spolvera', posto: 'hobby', testo: 'mette in fila i barattoli dal più alto al più basso', fumetto: '✦' },
    ],
    gioco: { gesto: 'spolvera', posto: 'tappeto', testo: 'mette in ordine i giochi di tutti', fumetto: '✓' },
    frasi: {
      mattina: ['Sono le sette e un quarto. Perfetto, come sempre.', 'Oggi in lista ho dodici cose. Ne ho già fatte tre!'],
      lavoro: ['Un lavoro fatto bene è un lavoro fatto una volta sola.', 'Ho messo in ordine anche gli attrezzi del vicino. Non se n\'è accorto.'],
      pranzo: ['Il tovagliolo va a sinistra. Sempre.', 'Ho diviso le castagne in mucchietti da cinque. Così si contano meglio.'],
      sera: ['Domani: spolverare, contare, sistemare. E salutare te!', 'Ho trovato una briciola. Era lì da stamattina! Inaccettabile.'],
      notte: ['Zzz… uno, due, tre barattoli… zzz…', 'Ronf… tutto in ordine… ronf…'],
      sempre: ['Ogni cosa al suo posto!', 'Ho fatto una lista delle cose belle di oggi. Ci sei anche tu.', 'Se ti serve qualcosa, so esattamente dov\'è.'],
    },
  },
  {
    id: 'dormiglione',
    nome: { f: 'Dormigliona', m: 'Dormiglione' },
    emoji: '😴',
    descrizione: '{nome} ama la calma più di ogni cosa: sonnellini, coperte morbide e merende. Non ha mai fretta, ma è il miglior amico per stare tranquilli.',
    ama: 'i cuscini, le merende e i pomeriggi di pioggia',
    nonSopporta: 'le sveglie e chi corre per casa',
    intercalare: 'Ancora cinque minuti…',
    arredo: 'cuscinone',
    decorazioni: ['biscotti', 'coperte', 'lucine'],
    muro: '#e9d6f0',
    coperta: '#a77bc4',
    mattina: [
      { gesto: 'dorme', posto: 'letto', testo: 'dorme ancora: «ancora cinque minuti…»', fumetto: 'z' },
      { gesto: 'stiracchia', posto: 'letto', testo: 'si stiracchia lunghissim{o} e sbadiglia', fumetto: '~' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'si gusta il pranzo, e già pensa alla merenda', fumetto: '♥' },
    sera: [
      { gesto: 'dorme', posto: 'hobby', testo: 'fa un sonnellino sul cuscinone', fumetto: 'z' },
      { gesto: 'beve', posto: 'hobby', testo: 'beve una tazza di latte e miele, sotto la coperta', fumetto: '♨' },
    ],
    gioco: { gesto: 'dorme', posto: 'hobby', testo: 'fa un pisolino mentre gli altri giocano', fumetto: 'z' },
    frasi: {
      mattina: ['Mmh… è già mattina? Ma era appena notte…', 'Ancora cinque minuti… anzi, dieci.'],
      lavoro: ['Lavoro piano piano. Le cose fatte di fretta si rompono.', 'Dopo questo, un pisolino. Me lo sono meritato.'],
      pranzo: ['Il pranzo è buono. Ma la merenda… la merenda è un\'altra cosa.', 'Dopo mangiato si sta così bene sdraiati…'],
      sera: ['Vieni sul cuscinone, c\'è posto per due.', 'Senti la pioggia? È il suono più rilassante del mondo.'],
      notte: ['Zzz… ronf… zzz…', 'Mmh… biscotti… zzz…'],
      sempre: ['Ancora cinque minuti…', 'Non c\'è fretta. Non c\'è mai fretta.', 'Ti va un biscotto? Ne tengo sempre uno di scorta.'],
    },
  },
  {
    id: 'sportivo',
    nome: { f: 'Sportiva', m: 'Sportivo' },
    emoji: '⚡',
    descrizione: '{nome} ha energia da vendere: corre, salta, fa le flessioni e sfida tutti a gara. Quando perde ride e dice «la rivincita domani!».',
    ama: 'correre nel prato, le gare e le colazioni abbondanti',
    nonSopporta: 'stare sedut{o} troppo a lungo',
    intercalare: 'Un altro giro!',
    arredo: 'attrezzi',
    decorazioni: ['coppe', 'palla', 'quadri'],
    muro: '#cfe8f6',
    coperta: '#e85a4a',
    mattina: [
      { gesto: 'ginnastica', posto: 'tappeto', testo: 'fa le flessioni: «…diciannove, venti!»', fumetto: '!' },
      { gesto: 'salta', posto: 'tappeto', testo: 'salta la corda prima di colazione', fumetto: '⚡' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'mangia una montagna di pappa: serve energia!', fumetto: '!' },
    sera: [
      { gesto: 'ginnastica', posto: 'hobby', testo: 'solleva i pesi fatti con due ghiande giganti', fumetto: '⚡' },
      { gesto: 'stiracchia', posto: 'tappeto', testo: 'fa gli esercizi di allungamento per domani', fumetto: '~' },
    ],
    gioco: { gesto: 'salta', posto: 'tappeto', testo: 'fa una gara di salti con chi ci sta', fumetto: '⚡' },
    frasi: {
      mattina: ['Venti flessioni prima di colazione! Ne fai una con me?', 'Oggi corro fino al castagno e ritorno. Due volte!'],
      lavoro: ['Lavorare è come allenarsi, ma si costruiscono cose!', 'Scommetto che finisco prima del tramonto!'],
      pranzo: ['Pappa doppia! Serve energia!', 'Mangio veloce, così ho più tempo per correre.'],
      sera: ['Un ultimo giro di esercizi e poi a nanna. Forse.', 'Domani gara di salti. Sei la giudice!'],
      notte: ['Zzz… un altro giro… zzz…', 'Ronf… venti… ventuno… ronf…'],
      sempre: ['Un altro giro!', 'Gara fino a quell\'albero? Pronti… via!', 'Se perdo, la rivincita domani!'],
    },
  },
  {
    id: 'brontolone',
    nome: { f: 'Brontolona', m: 'Brontolone' },
    emoji: '🧶',
    descrizione: '{nome} sbuffa, brontola e dice che tutto era meglio prima. Ma di nascosto lavora a maglia sciarpe e calzini per tutto il villaggio.',
    ama: 'il tè caldo, la sua poltrona e (in segreto) fare regali',
    nonSopporta: 'il rumore e chi si siede sulla sua poltrona',
    intercalare: 'Uff… però…',
    arredo: 'dondolo',
    decorazioni: ['gomitoli', 'regali', 'quadri'],
    muro: '#e8d8b8',
    coperta: '#8a6a4a',
    mattina: [
      { gesto: 'beve', posto: 'hobby', testo: 'beve il tè sul dondolo e brontola contro il tempo', fumetto: '♨' },
      { gesto: 'legge', posto: 'tavolo', testo: 'legge il giornale del bosco: «Ai miei tempi…»', fumetto: '…' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'dice che la minestra è troppo calda, poi ne prende ancora', fumetto: '…' },
    sera: [
      { gesto: 'maglia', posto: 'hobby', testo: 'lavora a maglia una sciarpa… per qualcun altro', fumetto: '♥' },
      { gesto: 'maglia', posto: 'hobby', testo: 'incarta di nascosto un regalino per un amico', fumetto: '🎁' },
    ],
    gioco: { gesto: 'maglia', posto: 'hobby', testo: 'sferruzza e brontola, ma è content{o}', fumetto: '…' },
    frasi: {
      mattina: ['Uff, è presto. Però… il tè è venuto buono.', 'Ai miei tempi le castagne erano più grosse. Però anche queste…'],
      lavoro: ['Lavorare, lavorare… Uff. Però è venuto bene, eh.', 'Non guardarmi mentre lavoro. Va bene, guarda pure.'],
      pranzo: ['Troppo calda. Troppo salata. Ne prendo ancora un po\'.', 'Hmpf. Buona.'],
      sera: ['Questa sciarpa? Non è per nessuno. …Va bene, è per te.', 'Non dirlo a nessuno che faccio i calzini per tutti.'],
      notte: ['Zzz… uff… zzz…', 'Ronf… ai miei tempi… ronf…'],
      sempre: ['Uff… però sono content{o} che sei passata.', 'Non mi piacciono le visite. Tranne le tue.', 'Siediti. Non sulla mia poltrona.'],
    },
  },
  {
    id: 'curioso',
    nome: { f: 'Curiosona', m: 'Curiosone' },
    emoji: '🔍',
    descrizione: '{nome} vuole sapere il perché di tutto. Colleziona sassi, piume e conchiglie, disegna mappe e fa mille domande.',
    ama: 'le scoperte, le mappe e le domande difficili',
    nonSopporta: 'le risposte «perché sì»',
    intercalare: 'E questo cos\'è?',
    arredo: 'vetrina',
    decorazioni: ['mappa', 'libri', 'piume'],
    muro: '#f2e2b8',
    coperta: '#d98a3a',
    mattina: [
      { gesto: 'osserva', posto: 'hobby', testo: 'studia con la lente un sasso nuovo della collezione', fumetto: '?' },
      { gesto: 'legge', posto: 'tavolo', testo: 'legge un libro sugli insetti, a testa in giù', fumetto: '?' },
    ],
    pranzo: { gesto: 'mangia', posto: 'tavolo', testo: 'mangia e intanto si chiede da dove viene il miele', fumetto: '?' },
    sera: [
      { gesto: 'scrive', posto: 'tavolo', testo: 'disegna la mappa dei posti scoperti oggi', fumetto: '✎' },
      { gesto: 'osserva', posto: 'hobby', testo: 'mette in vetrina una piuma trovata nel bosco', fumetto: '!' },
    ],
    gioco: { gesto: 'osserva', posto: 'tappeto', testo: 'osserva una formica con la lente', fumetto: '?' },
    frasi: {
      mattina: ['Sai perché la rugiada sta sulle foglie? Io no, ma lo scoprirò!', 'Ho trovato un sasso a forma di cuore. Va nella collezione!'],
      lavoro: ['E se provassi a farlo al contrario? Vediamo cosa succede…', 'Ho una domanda. Anzi, sette.'],
      pranzo: ['Da dove viene il miele? E perché è appiccicoso?', 'Ho assaggiato una cosa nuova. Era strana! Rifarei.'],
      sera: ['Sulla mia mappa c\'è un posto ancora bianco. Domani ci vado!', 'Questa piuma è del corvo? Gliela restituisco… dopo averla studiata.'],
      notte: ['Zzz… perché… zzz…', 'Ronf… una mappa… ronf…'],
      sempre: ['E questo cos\'è?', 'Mi fai una domanda difficile? Mi piacciono!', 'Ogni giorno si scopre qualcosa. Oggi, per esempio, tu!'],
    },
  },
  {
    id: 'premuroso',
    nome: { f: 'Premurosa', m: 'Premuroso' },
    emoji: '💛',
    descrizione: '{nome} si prende cura di tutti: cucina zuppe per chi è raffreddato, annaffia le piante dei vicini e si ricorda i compleanni di ognuno.',
    ama: 'cucinare per gli altri, le piante e gli abbracci',
    nonSopporta: 'vedere qualcuno triste da solo',
    intercalare: 'Hai mangiato?',
    arredo: 'piante',
    decorazioni: ['foto', 'vasetti', 'coperte'],
    muro: '#f6dcc8',
    coperta: '#e89a5a',
    mattina: [
      { gesto: 'annaffia', posto: 'hobby', testo: 'annaffia le piantine e parla con loro', fumetto: '✿' },
      { gesto: 'cucina', posto: 'cucina', testo: 'prepara la colazione per chi passa', fumetto: '♨' },
    ],
    pranzo: { gesto: 'cucina', posto: 'cucina', testo: 'cucina una zuppa grande grande, per tutti', fumetto: '♨' },
    sera: [
      { gesto: 'cucina', posto: 'cucina', testo: 'prepara i biscotti per gli amici di domani', fumetto: '♥' },
      { gesto: 'maglia', posto: 'tavolo', testo: 'cuce una toppa sul cuscino di un amico', fumetto: '♥' },
    ],
    gioco: { gesto: 'annaffia', posto: 'hobby', testo: 'si prende cura delle piantine di tutti', fumetto: '✿' },
    frasi: {
      mattina: ['Buongiorno! Hai fatto colazione? Ho preparato i biscotti.', 'Le piantine stamattina sono felici. Gliel\'ho chiesto.'],
      lavoro: ['Lavoro, ma se qualcuno ha bisogno, mollo tutto e arrivo.', 'Ho portato una tazza di tè a chi lavorava accanto a me.'],
      pranzo: ['C\'è zuppa per tutti! Prendi pure, ce n\'è tanta.', 'Hai mangiato? Davvero? Prendi un altro po\', dai.'],
      sera: ['Domani è il compleanno di qualcuno? Me lo segno!', 'Se una giornata è stata storta, la zuppa aiuta. E anche raccontarla.'],
      notte: ['Zzz… hai mangiato?… zzz…', 'Ronf… biscotti per tutti… ronf…'],
      sempre: ['Hai mangiato?', 'Se sei stanca, siediti un po\'. Ti porto qualcosa.', 'Mi piace quando passi a trovarmi.'],
    },
  },
];

const PER_ID = new Map(CARATTERI.map((c) => [c.id, c]));

/** I caratteri che si addicono di più a ogni specie (si sceglie tra questi se sono liberi). */
const AFFINI: Record<Specie, string[]> = {
  volpe: ['curioso', 'ordinato', 'allegro'],
  daino: ['sognatore', 'premuroso'],
  tasso: ['brontolone', 'dormiglione', 'ordinato'],
  riccio: ['dormiglione', 'premuroso', 'brontolone'],
  scoiattolo: ['sportivo', 'allegro', 'curioso'],
  lepre: ['allegro', 'sportivo', 'sognatore'],
};

/**
 * Sceglie il carattere di un animale nuovo: uno che nessun altro ha ancora, possibilmente adatto alla specie.
 * Non usa il generatore casuale del gioco (così la simulazione non cambia): decide l'id dell'animale.
 */
export function scegliCarattere(s: StatoGioco, a: Animale): string {
  const usati = new Map<string, number>();
  for (const b of s.animali) if (b !== a && b.carattere) usati.set(b.carattere, (usati.get(b.carattere) ?? 0) + 1);
  const meno = Math.min(...CARATTERI.map((c) => usati.get(c.id) ?? 0));
  const liberi = CARATTERI.filter((c) => (usati.get(c.id) ?? 0) === meno).map((c) => c.id);
  const affini = AFFINI[a.specie].filter((id) => liberi.includes(id));
  const tra = affini.length ? affini : liberi;
  return tra[hash(a.id + a.specie) % tra.length];
}

/** Il carattere dell'animale (se manca, ne calcola uno stabile dall'id). */
export function carattereDi(a: Pick<Animale, 'id' | 'carattere'>): Carattere {
  return PER_ID.get(a.carattere ?? '') ?? CARATTERI[hash(a.id) % CARATTERI.length];
}

export function nomeCarattere(a: Pick<Animale, 'id' | 'carattere' | 'sesso'>): string {
  return carattereDi(a).nome[a.sesso];
}

function accordaSesso(t: string, sesso: 'f' | 'm') {
  return t.replaceAll('{o}', sesso === 'f' ? 'a' : 'o');
}

export function descrizioneCarattere(a: Animale, nome: string): string {
  const t = accordaSesso(carattereDi(a).descrizione.replace('{nome}', nome), a.sesso);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Cosa fa in casa in questo momento. `turno` fa cambiare attività ogni tanto (stessa ora = stessa scelta). */
export function cosaFaInCasa(a: Animale, momento: Momento, turno = 0): AttivitaCasa {
  const c = carattereDi(a);
  const piccolo = a.fase === 'cucciolo' || a.fase === 'giovane';
  let att: AttivitaCasa;
  if (a.addormentato || momento === 'notte') att = { gesto: 'dorme', posto: 'letto', testo: 'dorme nel suo lettino', fumetto: 'z' };
  else if (momento === 'pranzo') att = c.pranzo;
  else if (momento === 'lavoro') {
    if (a.mestiere) att = { gesto: 'lavora', posto: 'lavoro', testo: `lavora al suo banco da ${a.mestiere}` };
    else att = c.gioco;
  } else {
    const l = momento === 'mattina' ? c.mattina : c.sera;
    att = l[(hash(a.id) + turno) % l.length];
  }
  // i piccoli non cucinano e non lavorano a maglia: giocano a farlo
  if (piccolo && att.gesto === 'cucina') att = { ...att, gesto: 'seduto', posto: 'tavolo', testo: 'aspetta la pappa battendo il cucchiaio', fumetto: '♪' };
  if (a.addormentato && momento !== 'notte') att = { gesto: 'dorme', posto: 'letto', testo: 'dorme da un po\': ha bisogno delle tue pagine per svegliarsi', fumetto: 'z' };
  return { ...att, testo: accordaSesso(att.testo, a.sesso) };
}

/** Una frase da dire quando Giada lo tocca, adatta al momento della giornata e al suo carattere. */
export function fraseCarattere(a: Animale, momento: Momento, k: number): string {
  const c = carattereDi(a);
  const l = [...c.frasi[momento], ...(momento === 'notte' ? [] : c.frasi.sempre)];
  return accordaSesso(l[Math.abs(k) % l.length], a.sesso);
}

/** Che momento è a quest'ora (stessa divisione della radura). */
export function momentoDa(h: number): Momento {
  if (h >= 21.5 || h < 7) return 'notte';
  if (h < 9) return 'mattina';
  if (h >= 12.5 && h < 14) return 'pranzo';
  if (h >= 18) return 'sera';
  return 'lavoro';
}
