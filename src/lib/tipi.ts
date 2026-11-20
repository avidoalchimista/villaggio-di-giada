// Modello dati del Villaggio di Giada (vedi specifica, sezione 6).

export const VIRTU = ['coraggio', 'umanita', 'saggezza', 'giustizia', 'temperanza', 'trascendenza'] as const;
export type Virtu = (typeof VIRTU)[number];

export const EMOZIONI = ['gioia', 'fiducia', 'paura', 'sorpresa', 'tristezza', 'disgusto', 'rabbia', 'attesa'] as const;
export type Emozione = (typeof EMOZIONI)[number];

// 24 punti di forza VIA, raggruppati per virtù
export const FORZE_PER_VIRTU = {
  coraggio: ['coraggio', 'perseveranza', 'onesta', 'vitalita'],
  umanita: ['amore', 'gentilezza', 'intelligenza_sociale'],
  saggezza: ['creativita', 'curiosita', 'apertura_mentale', 'amore_apprendimento', 'prospettiva'],
  giustizia: ['lavoro_squadra', 'equita', 'leadership'],
  temperanza: ['perdono', 'umilta', 'prudenza', 'autocontrollo'],
  trascendenza: ['bellezza', 'gratitudine', 'speranza', 'umorismo', 'spiritualita'],
} as const;
export type Forza = (typeof FORZE_PER_VIRTU)[Virtu][number];
export const FORZE: Forza[] = Object.values(FORZE_PER_VIRTU).flat() as Forza[];

export function virtuDi(f: Forza): Virtu {
  for (const v of VIRTU) if ((FORZE_PER_VIRTU[v] as readonly string[]).includes(f)) return v;
  throw new Error('forza sconosciuta: ' + f);
}

export const SPECIE = ['volpe', 'daino', 'tasso', 'riccio', 'scoiattolo', 'lepre'] as const;
export type Specie = (typeof SPECIE)[number];

export const FASI = ['uovo', 'cucciolo', 'giovane', 'adulto', 'maestro'] as const;
export type Fase = (typeof FASI)[number];

export type Punteggi<K extends string> = Partial<Record<K, number>>;

export interface Analisi {
  forze: Punteggi<Forza>;
  emozioni: Punteggi<Emozione>;
  segnaliSeri: boolean;
}

export interface VoceDiario {
  id: string;
  data: string; // AAAA-MM-GG
  creata: number; // timestamp
  testo: string; // testo originale, mai modificato
  forze: Punteggi<Forza>; // confermati da Giada
  emozioni: Punteggi<Emozione>;
  giornataDifficile: boolean;
  riassunto: string;
}

export interface Ricordo {
  data: string;
  frase: string;
}

export interface Animale {
  id: string;
  nome: string;
  specie: Specie;
  sesso: 'f' | 'm';
  fase: Fase;
  xp: number;
  nutrimento: Record<Virtu, number>;
  umore: number; // 0..100
  addormentato: boolean;
  mestiere: string | null;
  vociPerSchiudersi: number; // solo per le uova
  nato: string; // data in cui è comparso l'uovo
  ricordi: Ricordo[];
  genitori: string[];
  abilita: string[]; // cose che ha imparato (pescare, cantare...)
  studio: { id: string; inizio: string; fine: string } | null; // cosa sta imparando ora
}

export interface Richiesta {
  animale: string;
  tipo: 'racconta' | 'costruisci' | 'nome' | 'insegna' | 'trova';
  virtu?: Virtu;
  costruzione?: string;
  data: string;
  scade: string;
}

export type StatoEdificio = 'attivo' | 'lento' | 'fermo';

export interface Edificio {
  tipo: string;
  gestore: string; // id animale
  stato: StatoEdificio;
  virtu: Virtu;
  costruito: string;
}

export interface Evento {
  data: string;
  tipo: 'uovo' | 'schiusa' | 'crescita' | 'mestiere' | 'edificio' | 'edificio_stato' | 'sonno' | 'risveglio' | 'storia' | 'ghiande' | 'costruzione' | 'richiesta' | 'abilita' | 'castagne';
  testo: string;
}

export interface StatoGioco {
  versioneSchema: number;
  inizio: string;
  ultimoAccesso: string; // ultima data simulata
  nomeVillaggio: string;
  profilo: Record<Forza, number>; // punti dal questionario
  totaleVirtu: Record<Virtu, number>; // nutrimento cumulato
  ultimoNutrimento: Record<Virtu, string | null>; // data dell'ultima voce che ha nutrito la virtù
  animali: Animale[];
  edifici: Edificio[];
  eventi: Evento[];
  capitoli: string[]; // id dei capitoli di storia sbloccati
  numeroVoci: number;
  ghiande: number; // la "moneta" del villaggio: si guadagna scrivendo, si spende per costruire
  costruzioni: { id: string; data: string }[];
  castagneMature: number; // castagne cadute sotto il castagno, da raccogliere toccandole
  richiesta: Richiesta | null; // al massimo una richiesta alla volta
  ultimaVoce: string | null; // data dell'ultima pagina di diario
  seme: number; // per la casualità deterministica
  contatore: number; // per gli id
  ultimoBackupRicordato: string | null;
}

export function zeriVirtu(): Record<Virtu, number> {
  return Object.fromEntries(VIRTU.map((v) => [v, 0])) as Record<Virtu, number>;
}
export function zeriForze(): Record<Forza, number> {
  return Object.fromEntries(FORZE.map((f) => [f, 0])) as Record<Forza, number>;
}
