// I mestieri del villaggio: ognuno con la sua insegna, la sua bottega, gli attrezzi fuori dalla porta,
// la divisa da lavoro e il suo modo di passare la giornata. Il mestiere segue la virtù più nutrita
// (vedi gioco.ts, scegliMestiere): dentro la stessa virtù ce ne sono tanti, e ognuno nel villaggio fa il suo.
import { hash } from './caso';
import type { Animale, Virtu } from './tipi';
import type { Parte } from './vestiti';

/** Dove lavora: davanti a casa, in giro per il villaggio, all'acqua, nell'orto, nel bosco, in piazza. */
export type Dove = 'casa' | 'giro' | 'acqua' | 'orto' | 'bosco' | 'piazza';
/** Il gesto che fa mentre lavora. */
export type Gesto =
  | 'martella' | 'mescola' | 'impasta' | 'cuce' | 'pesca' | 'dipinge' | 'suona' | 'legge' | 'scrive' | 'pianta'
  | 'vende' | 'avvita' | 'taglia' | 'annaffia' | 'guarda' | 'consegna' | 'foto' | 'racconta' | 'saluta' | 'cura'
  | 'sega' | 'zangola' | 'timbra';

export interface DefMestiere {
  id: string;
  m: string; // nome al maschile
  f: string; // nome al femminile
  virtu: Virtu;
  insegna: string; // cosa c'è scritto sopra la porta
  simbolo: string;
  cosa: string; // cosa fa, in parole semplici ("ripara le moto")
  colore: string; // colore dell'insegna e dei dettagli
  tenda: [string, string] | null; // tendone a strisce sopra la vetrina (le botteghe), o niente
  attrezzi: string[]; // cosa tiene fuori dalla porta (vedi scena/botteghe.ts)
  divisa: Partial<Record<Parte, string>>; // cosa si mette per lavorare (id dei capi, vedi vestiti.ts)
  occhiali?: boolean;
  inMano: string | null; // attrezzo in mano mentre lavora
  lavoro: { dove: Dove; gesto: Gesto; fumetti: string[]; mezzo?: 'moto' | 'bici' };
  /**
   * La postazione di lavoro, allestita fuori dalla porta (vedi scena/botteghe.ts): il banco, l'incudine,
   * la madia, la macchina da cucire... I gesti del mestiere si fanno solo lì, in piedi dietro al banco.
   */
  postazione: string;
}

// la postazione di ognuno (l'attrezzo grande dove lavora: vedi creaPostazione in scena/botteghe.ts)
const POSTAZIONE: Record<string, string> = {
  fabbro: 'incudine', motociclista: 'moto-cavalletto', pompiere: 'idrante', taglialegna: 'ceppo', guardaboschi: 'piantine',
  esploratore: 'tavolo-mappe', cuoco: 'pentolone', fornaio: 'madia', pasticcere: 'banco-dolci', gelataio: 'carretto-gelati',
  guaritore: 'banco-erbe', postino: 'banco-posta', locandiere: 'bancone', artigiano: 'banco-falegname', bibliotecario: 'banco-libri',
  orologiaio: 'banco-orologi', astronomo: 'telescopio', inventore: 'banco-invenzioni', maestro: 'lavagna', costruttore: 'muretto',
  mercante: 'bancone', mesticheria: 'bancone', fruttivendolo: 'bancone', calzolaio: 'banco-calzolaio', capovillaggio: 'scrivania',
  giardiniere: 'banco-vasi', pescatore: 'rete-stesa', apicoltore: 'alveare', contadino: 'orto', mugnaio: 'macina', lattaio: 'zangola',
  musicista: 'leggio', pittore: 'cavalletto', cantastorie: 'teatrino', sarto: 'macchina-cucire', vasaio: 'tornio', fotografo: 'treppiede',
};
const d = (x: Omit<DefMestiere, 'postazione'>): DefMestiere => ({ ...x, postazione: POSTAZIONE[x.id] ?? 'banco' });

export const MESTIERI: DefMestiere[] = [
  // ---------- coraggio ----------
  d({ id: 'fabbro', m: 'fabbro', f: 'fabbra', virtu: 'coraggio', insegna: 'FABBRO', simbolo: '⚒', cosa: 'batte il ferro sull\'incudine', colore: '#5a5a66', tenda: null,
    attrezzi: ['forgia', 'incudine', 'ferri'], divisa: { testa: 'fazzoletto:grigio:tinta', corpo: 'grembiule:marrone:tinta' },
    inMano: 'martello', lavoro: { dove: 'casa', gesto: 'martella', fumetti: ['⚒', '✦', '🔥'] } }),
  d({ id: 'motociclista', m: 'motociclista', f: 'motociclista', virtu: 'coraggio', insegna: 'OFFICINA MOTO', simbolo: '🏍', cosa: 'ripara le moto e fa il giro del villaggio', colore: '#d8443a', tenda: null,
    attrezzi: ['moto', 'gomme', 'tanica'], divisa: { testa: 'casco:rosso:tinta', corpo: 'giubbotto:nero:tinta', collo: 'bandana:rosso:pois:panna' },
    inMano: 'chiave', lavoro: { dove: 'giro', gesto: 'avvita', fumetti: ['💨', '🏍', '♪'], mezzo: 'moto' } }),
  d({ id: 'pompiere', m: 'pompiere', f: 'pompiera', virtu: 'coraggio', insegna: 'POMPIERI', simbolo: '🚒', cosa: 'controlla che non ci siano fuochi accesi', colore: '#c8343a', tenda: null,
    attrezzi: ['idrante', 'scala', 'secchio'], divisa: { testa: 'elmo:rosso:tinta', corpo: 'giaccone:rosso:bande:giallo' },
    inMano: 'secchio', lavoro: { dove: 'giro', gesto: 'annaffia', fumetti: ['💧', '!', '✓'] } }),
  d({ id: 'taglialegna', m: 'taglialegna', f: 'taglialegna', virtu: 'coraggio', insegna: 'LEGNA DA ARDERE', simbolo: '🪓', cosa: 'spacca la legna per l\'inverno', colore: '#8a5a36', tenda: null,
    attrezzi: ['legna', 'ceppo', 'carriola'], divisa: { testa: 'berretto:verde:tinta', corpo: 'camicia:rosso:quadri:nero' },
    inMano: 'ascia', lavoro: { dove: 'bosco', gesto: 'taglia', fumetti: ['🪓', '🌲', '!'] } }),
  d({ id: 'guardaboschi', m: 'guardaboschi', f: 'guardaboschi', virtu: 'coraggio', insegna: 'GUARDIA FORESTALE', simbolo: '🌲', cosa: 'veglia sul bosco e sugli alberi', colore: '#3f7a4a', tenda: null,
    attrezzi: ['cartello-bosco', 'lanterna', 'pino'], divisa: { testa: 'tesa:verde:tinta', corpo: 'giacca:verde:tinta', collo: 'fischietto:giallo:tinta' },
    inMano: 'binocolo', lavoro: { dove: 'bosco', gesto: 'pianta', fumetti: ['🌲', '👀', '✿'] } }),
  d({ id: 'esploratore', m: 'esploratore', f: 'esploratrice', virtu: 'coraggio', insegna: 'ESPLORATORI', simbolo: '🧭', cosa: 'va a scoprire i sentieri del bosco', colore: '#c8a030', tenda: null,
    attrezzi: ['tenda-campo', 'mappa', 'zaino'], divisa: { testa: 'coloniale:panna:tinta', corpo: 'gilet:senape:tinta', schiena: 'zainetto:verde:tinta' },
    inMano: 'cannocchiale', lavoro: { dove: 'bosco', gesto: 'scrive', fumetti: ['🧭', '?', '!'] } }),

  // ---------- umanità ----------
  d({ id: 'cuoco', m: 'cuoco', f: 'cuoca', virtu: 'umanita', insegna: 'TRATTORIA', simbolo: '🍲', cosa: 'cucina la zuppa per tutti', colore: '#d8443a', tenda: ['#d8443a', '#fff4e0'],
    attrezzi: ['pentolone', 'tavolino', 'botte'], divisa: { testa: 'toque:bianco:tinta', corpo: 'grembiule:bianco:tinta', collo: 'fazzoletto-collo:rosso:tinta' },
    inMano: 'mestolo', lavoro: { dove: 'casa', gesto: 'mescola', fumetti: ['🍲', '♨', '♥'] } }),
  d({ id: 'fornaio', m: 'fornaio', f: 'fornaia', virtu: 'umanita', insegna: 'FORNO', simbolo: '🥖', cosa: 'sforna il pane caldo', colore: '#c8803a', tenda: ['#f2c230', '#fff4e0'],
    attrezzi: ['forno', 'sacchi', 'pane'], divisa: { testa: 'bustina:bianco:tinta', corpo: 'grembiule:panna:tinta' },
    inMano: 'pala', lavoro: { dove: 'casa', gesto: 'impasta', fumetti: ['🥖', '♨', '☺'] } }),
  d({ id: 'pasticcere', m: 'pasticcere', f: 'pasticcera', virtu: 'umanita', insegna: 'PASTICCERIA', simbolo: '🧁', cosa: 'prepara torte e biscotti', colore: '#e0607a', tenda: ['#f28aa8', '#ffffff'],
    attrezzi: ['torta', 'tavolino', 'ombrellone'], divisa: { testa: 'toque:bianco:tinta', corpo: 'grembiule:rosa:righe:bianco' },
    inMano: 'frusta', lavoro: { dove: 'casa', gesto: 'mescola', fumetti: ['🧁', '♥', '✿'] } }),
  d({ id: 'gelataio', m: 'gelataio', f: 'gelataia', virtu: 'umanita', insegna: 'GELATI', simbolo: '🍦', cosa: 'fa il gelato alla castagna', colore: '#5aa0d8', tenda: ['#7fb8e8', '#ffffff'],
    attrezzi: ['carretto-gelati', 'ombrellone', 'tavolino'], divisa: { testa: 'paglia:panna:tinta', corpo: 'grembiule:azzurro:righe:bianco', collo: 'papillon:rosso:tinta' },
    inMano: 'cono', lavoro: { dove: 'casa', gesto: 'vende', fumetti: ['🍦', '♥', '☺'] } }),
  d({ id: 'guaritore', m: 'dottore', f: 'dottoressa', virtu: 'umanita', insegna: 'AMBULATORIO', simbolo: '✚', cosa: 'cura chi ha il raffreddore', colore: '#3f9a6a', tenda: null,
    attrezzi: ['croce', 'erbe', 'panca'], divisa: { corpo: 'camice:bianco:tinta', collo: 'stetoscopio:grigio:tinta' }, occhiali: true,
    inMano: 'valigetta', lavoro: { dove: 'giro', gesto: 'cura', fumetti: ['✚', '♥', '☺'] } }),
  d({ id: 'postino', m: 'postino', f: 'postina', virtu: 'umanita', insegna: 'POSTA', simbolo: '✉', cosa: 'porta le lettere a tutti', colore: '#3a5aa8', tenda: null,
    attrezzi: ['buca-lettere', 'pacchi', 'bici'], divisa: { testa: 'visiera:blu:tinta', corpo: 'giacca:blu:tinta', schiena: 'sacca:marrone:tinta' },
    inMano: 'lettera', lavoro: { dove: 'giro', gesto: 'timbra', fumetti: ['✉', '♥', '!'], mezzo: 'bici' } }),
  d({ id: 'locandiere', m: 'locandiere', f: 'locandiera', virtu: 'umanita', insegna: 'LOCANDA', simbolo: '🍵', cosa: 'serve tè caldo e frittelle', colore: '#8a2a3a', tenda: ['#8a2a3a', '#f4ecd8'],
    attrezzi: ['tavolino', 'botte', 'lanterna'], divisa: { corpo: 'gilet:bordeaux:tinta', collo: 'papillon:nero:tinta' },
    inMano: 'vassoio', lavoro: { dove: 'casa', gesto: 'vende', fumetti: ['🍵', '☺', '♪'] } }),

  // ---------- saggezza ----------
  d({ id: 'artigiano', m: 'falegname', f: 'falegname', virtu: 'saggezza', insegna: 'FALEGNAMERIA', simbolo: '🪚', cosa: 'costruisce sedie e tavoli di legno', colore: '#a06a40', tenda: null,
    attrezzi: ['assi', 'sedia', 'cavalletto-sega'], divisa: { testa: 'coppola:marrone:tinta', corpo: 'salopette:blu:tinta' },
    inMano: 'sega', lavoro: { dove: 'casa', gesto: 'sega', fumetti: ['🪚', '✦', '☺'] } }),
  d({ id: 'bibliotecario', m: 'bibliotecario', f: 'bibliotecaria', virtu: 'saggezza', insegna: 'BIBLIOTECA', simbolo: '📚', cosa: 'mette in ordine i libri e li presta', colore: '#5a3f8a', tenda: null,
    attrezzi: ['libri', 'panca', 'lanterna'], divisa: { corpo: 'giacca:verde:tinta', collo: 'cravatta:bordeaux:righe:panna' }, occhiali: true,
    inMano: 'libro', lavoro: { dove: 'casa', gesto: 'legge', fumetti: ['📚', '…', '!'] } }),
  d({ id: 'orologiaio', m: 'orologiaio', f: 'orologiaia', virtu: 'saggezza', insegna: 'OROLOGERIA', simbolo: '⏰', cosa: 'aggiusta orologi e carillon', colore: '#c8a030', tenda: ['#3a5aa8', '#f4ecd8'],
    attrezzi: ['orologio', 'ingranaggi', 'panca'], divisa: { corpo: 'gilet:grigio:tinta', collo: 'papillon:blu:pois:bianco' }, occhiali: true,
    inMano: 'lente', lavoro: { dove: 'casa', gesto: 'avvita', fumetti: ['⏰', '⚙', '✦'] } }),
  d({ id: 'astronomo', m: 'astronomo', f: 'astronoma', virtu: 'saggezza', insegna: 'OSSERVATORIO', simbolo: '🔭', cosa: 'studia le stelle e la luna', colore: '#34509a', tenda: null,
    attrezzi: ['telescopio', 'mappamondo', 'libri'], divisa: { testa: 'basco:blu:tinta', schiena: 'mantella:blu:stelle:giallo' },
    inMano: 'cannocchiale', lavoro: { dove: 'casa', gesto: 'guarda', fumetti: ['★', '☾', '✦'] } }),
  d({ id: 'inventore', m: 'inventore', f: 'inventrice', virtu: 'saggezza', insegna: 'INVENZIONI', simbolo: '💡', cosa: 'inventa macchine strampalate', colore: '#f08a30', tenda: null,
    attrezzi: ['ingranaggi', 'girandola', 'cassa'], divisa: { testa: 'occhialoni:marrone:tinta', corpo: 'tuta:arancio:tinta' },
    inMano: 'chiave', lavoro: { dove: 'casa', gesto: 'avvita', fumetti: ['💡', '⚙', '!'] } }),
  d({ id: 'maestro', m: 'maestro', f: 'maestra', virtu: 'saggezza', insegna: 'SCUOLA', simbolo: '✏', cosa: 'insegna a leggere ai piccoli', colore: '#3f8a5a', tenda: null,
    attrezzi: ['lavagna', 'campanella', 'banchetti'], divisa: { corpo: 'giacca:marrone:quadri:senape', collo: 'cravatta:verde:tinta' }, occhiali: true,
    inMano: 'libro', lavoro: { dove: 'casa', gesto: 'scrive', fumetti: ['✏', 'A', '?'] } }),

  // ---------- giustizia ----------
  d({ id: 'costruttore', m: 'muratore', f: 'muratrice', virtu: 'giustizia', insegna: 'COSTRUZIONI', simbolo: '🔨', cosa: 'aggiusta tetti e muretti', colore: '#f2a030', tenda: null,
    attrezzi: ['mattoni', 'carriola', 'scala'], divisa: { testa: 'caschetto:giallo:tinta', corpo: 'salopette:arancio:tinta' },
    inMano: 'martello', lavoro: { dove: 'giro', gesto: 'martella', fumetti: ['🔨', '🧱', '✓'] } }),
  d({ id: 'mercante', m: 'bottegaio', f: 'bottegaia', virtu: 'giustizia', insegna: 'EMPORIO', simbolo: '⚖', cosa: 'vende un po\' di tutto', colore: '#3f8a5a', tenda: ['#3f8a5a', '#fff4e0'],
    attrezzi: ['bancone', 'sacchi', 'cassette-frutta'], divisa: { testa: 'coppola:verde:quadri:panna', corpo: 'grembiule:verde:tinta' },
    inMano: 'cesto', lavoro: { dove: 'casa', gesto: 'vende', fumetti: ['⚖', '☺', '🌰'] } }),
  d({ id: 'mesticheria', m: 'mesticatore', f: 'mesticatrice', virtu: 'giustizia', insegna: 'MESTICHERIA', simbolo: '🖌', cosa: 'vende colori, vernici, chiodi e scope', colore: '#3a5aa8', tenda: ['#3a5aa8', '#f2c230'],
    attrezzi: ['barattoli', 'scope', 'scala'], divisa: { testa: 'coppola:grigio:tinta', corpo: 'grembiule:blu:tinta' },
    inMano: 'pennello', lavoro: { dove: 'casa', gesto: 'vende', fumetti: ['🖌', '🔩', '☺'] } }),
  d({ id: 'fruttivendolo', m: 'fruttivendolo', f: 'fruttivendola', virtu: 'giustizia', insegna: 'FRUTTA E VERDURA', simbolo: '🍎', cosa: 'vende mele, pere e zucche', colore: '#f08a30', tenda: ['#f08a30', '#ffffff'],
    attrezzi: ['cassette-frutta', 'zucche', 'bilancia'], divisa: { testa: 'paglia:panna:tinta', corpo: 'grembiule:verde:righe:bianco' },
    inMano: 'mela', lavoro: { dove: 'casa', gesto: 'vende', fumetti: ['🍎', '🍐', '☺'] } }),
  d({ id: 'calzolaio', m: 'calzolaio', f: 'calzolaia', virtu: 'giustizia', insegna: 'CALZOLAIO', simbolo: '👢', cosa: 'ripara scarponi e pantofole', colore: '#7a4a2a', tenda: ['#7a4a2a', '#f4ecd8'],
    attrezzi: ['stivalone', 'scarpe', 'sgabello'], divisa: { corpo: 'grembiule:marrone:tinta', testa: 'basco:nero:tinta' }, occhiali: true,
    inMano: 'martello', lavoro: { dove: 'casa', gesto: 'martella', fumetti: ['👢', '✦', '☺'] } }),
  d({ id: 'capovillaggio', m: 'sindaco', f: 'sindaca', virtu: 'giustizia', insegna: 'MUNICIPIO', simbolo: '★', cosa: 'si assicura che tutti stiano bene', colore: '#2a6ac8', tenda: null,
    attrezzi: ['bandiera', 'campanella', 'panca'], divisa: { testa: 'bombetta:nero:tinta', corpo: 'giacca:blu:tinta', collo: 'fascia:verde:tinta' },
    inMano: null, lavoro: { dove: 'giro', gesto: 'timbra', fumetti: ['★', '☺', '♥'] } }),

  // ---------- temperanza ----------
  d({ id: 'giardiniere', m: 'giardiniere', f: 'giardiniera', virtu: 'temperanza', insegna: 'VIVAIO', simbolo: '🌱', cosa: 'cura i fiori e le piantine', colore: '#4f9a3c', tenda: ['#4f9a3c', '#ffffff'],
    attrezzi: ['vasi-fiori', 'annaffiatoio', 'rastrello'], divisa: { testa: 'paglia:panna:tinta', corpo: 'salopette:verde:tinta' },
    inMano: 'annaffiatoio', lavoro: { dove: 'orto', gesto: 'annaffia', fumetti: ['🌱', '✿', '💧'] } }),
  d({ id: 'pescatore', m: 'pescatore', f: 'pescatrice', virtu: 'temperanza', insegna: 'PESCHERIA', simbolo: '🐟', cosa: 'pesca con pazienza e racconta storie di pesci', colore: '#3f86c8', tenda: ['#3f86c8', '#ffffff'],
    attrezzi: ['rete', 'barchetta', 'remi'], divisa: { testa: 'cerata-cappello:giallo:tinta', corpo: 'cerata:giallo:tinta' },
    inMano: 'canna', lavoro: { dove: 'acqua', gesto: 'pesca', fumetti: ['🐟', '~', '!'] } }),
  d({ id: 'apicoltore', m: 'apicoltore', f: 'apicoltrice', virtu: 'temperanza', insegna: 'MIELE', simbolo: '🍯', cosa: 'si occupa delle api e del miele', colore: '#e0a020', tenda: ['#f2c230', '#5a3f20'],
    attrezzi: ['alveare', 'alveare', 'vasetti'], divisa: { testa: 'velo:bianco:tinta', corpo: 'camice:bianco:tinta' },
    inMano: 'vasetto', lavoro: { dove: 'orto', gesto: 'cura', fumetti: ['🐝', '🍯', '✿'] } }),
  d({ id: 'contadino', m: 'contadino', f: 'contadina', virtu: 'temperanza', insegna: 'ORTO E CAMPI', simbolo: '🥕', cosa: 'coltiva carote, zucche e insalata', colore: '#7a9a3c', tenda: null,
    attrezzi: ['spaventapasseri', 'carriola', 'zucche'], divisa: { testa: 'paglia:giallo:tinta', corpo: 'salopette:blu:tinta', collo: 'bandana:rosso:tinta' },
    inMano: 'zappa', lavoro: { dove: 'orto', gesto: 'pianta', fumetti: ['🥕', '🌱', '☀'] } }),
  d({ id: 'mugnaio', m: 'mugnaio', f: 'mugnaia', virtu: 'temperanza', insegna: 'FARINA', simbolo: '🌾', cosa: 'macina il grano per il pane', colore: '#c8a050', tenda: null,
    attrezzi: ['macina', 'sacchi', 'covone'], divisa: { testa: 'coppola:panna:tinta', corpo: 'gilet:marrone:tinta' },
    inMano: 'sacco', lavoro: { dove: 'casa', gesto: 'mescola', fumetti: ['🌾', '☁', '☺'] } }),
  d({ id: 'lattaio', m: 'lattaio', f: 'lattaia', virtu: 'temperanza', insegna: 'LATTE E FORMAGGI', simbolo: '🧀', cosa: 'fa il formaggio e lo fa assaggiare', colore: '#5aa0d8', tenda: ['#7fb8e8', '#ffffff'],
    attrezzi: ['bidoni', 'formaggi', 'panca'], divisa: { testa: 'fazzoletto:azzurro:quadri:bianco', corpo: 'grembiule:azzurro:tinta' },
    inMano: 'secchio', lavoro: { dove: 'casa', gesto: 'zangola', fumetti: ['🧀', '🥛', '☺'] } }),

  // ---------- trascendenza ----------
  d({ id: 'musicista', m: 'musicista', f: 'musicista', virtu: 'trascendenza', insegna: 'MUSICA', simbolo: '♪', cosa: 'suona il violino in piazza', colore: '#8a5ac8', tenda: null,
    attrezzi: ['tamburo', 'leggio', 'arpa', 'contrabbasso'], divisa: { testa: 'bombetta:nero:tinta', corpo: 'gilet:bordeaux:tinta', collo: 'papillon:rosso:tinta' },
    inMano: 'violino', lavoro: { dove: 'piazza', gesto: 'suona', fumetti: ['♪', '♫', '♬'] } }),
  d({ id: 'pittore', m: 'pittore', f: 'pittrice', virtu: 'trascendenza', insegna: 'PITTURA', simbolo: '🎨', cosa: 'dipinge il villaggio', colore: '#e0607a', tenda: null,
    attrezzi: ['cavalletto', 'tele', 'barattoli'], divisa: { testa: 'basco:bordeaux:tinta', corpo: 'grembiule:panna:macchie', collo: 'foulard:giallo:tinta' },
    inMano: 'pennello', lavoro: { dove: 'piazza', gesto: 'dipinge', fumetti: ['🎨', '✿', '☺'] } }),
  d({ id: 'cantastorie', m: 'cantastorie', f: 'cantastorie', virtu: 'trascendenza', insegna: 'TEATRINO', simbolo: '📜', cosa: 'racconta storie con le marionette', colore: '#8a5ac8', tenda: null,
    attrezzi: ['teatrino', 'panca', 'lanterna'], divisa: { testa: 'piuma:viola:tinta', schiena: 'mantella:viola:tinta' },
    inMano: 'pergamena', lavoro: { dove: 'piazza', gesto: 'racconta', fumetti: ['📜', '!', '☺'] } }),
  d({ id: 'sarto', m: 'sarto', f: 'sarta', virtu: 'trascendenza', insegna: 'SARTORIA', simbolo: '✂', cosa: 'cuce vestiti per tutti', colore: '#c05a90', tenda: ['#c05a90', '#ffffff'],
    attrezzi: ['manichino', 'rocchetti', 'stoffe'], divisa: { corpo: 'gilet:lilla:tinta', collo: 'metro:giallo:tinta' }, occhiali: true,
    inMano: 'ago', lavoro: { dove: 'casa', gesto: 'cuce', fumetti: ['✂', '🧵', '♥'] } }),
  d({ id: 'vasaio', m: 'vasaio', f: 'vasaia', virtu: 'trascendenza', insegna: 'CERAMICHE', simbolo: '🏺', cosa: 'modella vasi e tazze di argilla', colore: '#c8603a', tenda: null,
    attrezzi: ['tornio', 'vasi', 'sgabello'], divisa: { testa: 'fazzoletto:arancio:tinta', corpo: 'grembiule:marrone:macchie' },
    inMano: 'vasetto', lavoro: { dove: 'casa', gesto: 'impasta', fumetti: ['🏺', '✦', '☺'] } }),
  d({ id: 'fotografo', m: 'fotografo', f: 'fotografa', virtu: 'trascendenza', insegna: 'FOTOGRAFIE', simbolo: '📷', cosa: 'fa le foto ricordo a tutti', colore: '#5a5a66', tenda: null,
    attrezzi: ['treppiede', 'cornici', 'panca'], divisa: { testa: 'coppola:grigio:quadri:nero', corpo: 'gilet:senape:tinta', collo: 'macchina-foto:nero:tinta' },
    inMano: null, lavoro: { dove: 'giro', gesto: 'foto', fumetti: ['📷', '✦', '☺'] } }),
];

const PER_ID = new Map(MESTIERI.map((m) => [m.id, m]));
// nomi di una volta, per i salvataggi vecchi
const ALIAS: Record<string, string> = { guardia: 'guardaboschi', 'custode delle scorte': 'mugnaio' };

export function defMestiere(id: string | null | undefined): DefMestiere | undefined {
  if (!id) return undefined;
  return PER_ID.get(id) ?? PER_ID.get(ALIAS[id] ?? '');
}

export function mestieriDi(v: Virtu): DefMestiere[] {
  return MESTIERI.filter((m) => m.virtu === v);
}

export function virtuMestiere(id: string | null | undefined): Virtu | undefined {
  return defMestiere(id)?.virtu;
}

/** "pescatrice", "fabbro", "dottoressa"... */
export function nomeMestiere(a: Pick<Animale, 'mestiere' | 'sesso'>): string {
  const d = defMestiere(a.mestiere);
  if (!d) return a.mestiere ?? '';
  return a.sesso === 'f' ? d.f : d.m;
}

/** Il simbolo (per i fumetti e le insegne). */
export function simboloMestiere(id: string | null | undefined): string {
  return defMestiere(id)?.simbolo ?? '★';
}

/**
 * Sceglie un mestiere nella virtù data, diverso da quelli già presi nel villaggio.
 * La scelta dipende da chi è l'animale (sempre la stessa per lo stesso animale), non dal caso.
 */
export function scegliTra(a: Pick<Animale, 'id'>, v: Virtu, presi: Set<string>): string | null {
  const liberi = mestieriDi(v).filter((m) => !presi.has(m.id));
  if (!liberi.length) return null;
  return liberi[hash(a.id + ':mestiere') % liberi.length].id;
}
