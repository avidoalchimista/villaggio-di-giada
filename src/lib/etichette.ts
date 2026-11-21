import type { Emozione, Fase, Forza, Specie, Virtu } from './tipi';

export const NOME_VIRTU: Record<Virtu, string> = {
  coraggio: 'Coraggio',
  umanita: 'Umanità',
  saggezza: 'Saggezza',
  giustizia: 'Giustizia',
  temperanza: 'Temperanza',
  trascendenza: 'Trascendenza',
};

export const NOME_FORZA: Record<Forza, string> = {
  coraggio: 'coraggio',
  perseveranza: 'perseveranza',
  onesta: 'onestà',
  vitalita: 'vitalità',
  amore: 'amore',
  gentilezza: 'gentilezza',
  intelligenza_sociale: 'intelligenza sociale',
  creativita: 'creatività',
  curiosita: 'curiosità',
  apertura_mentale: 'apertura mentale',
  amore_apprendimento: 'voglia di imparare',
  prospettiva: 'prospettiva',
  lavoro_squadra: 'lavoro di squadra',
  equita: 'equità',
  leadership: 'guida',
  perdono: 'perdono',
  umilta: 'umiltà',
  prudenza: 'prudenza',
  autocontrollo: 'autocontrollo',
  bellezza: 'senso del bello',
  gratitudine: 'gratitudine',
  speranza: 'speranza',
  umorismo: 'umorismo',
  spiritualita: 'spiritualità',
};

// Colori della ruota di Plutchik (linguaggio di gioco)
export const EMOZIONE: Record<Emozione, { nome: string; colore: string }> = {
  gioia: { nome: 'gioia', colore: '#f2c230' },
  fiducia: { nome: 'fiducia', colore: '#8cc63f' },
  paura: { nome: 'paura', colore: '#2e8b57' },
  sorpresa: { nome: 'sorpresa', colore: '#3aa6c9' },
  tristezza: { nome: 'tristezza', colore: '#3f6fb5' },
  disgusto: { nome: 'disgusto', colore: '#8e5ea2' },
  rabbia: { nome: 'rabbia', colore: '#d6453d' },
  attesa: { nome: 'attesa', colore: '#ee8a2f' },
};

export const COLORE_VIRTU: Record<Virtu, string> = {
  coraggio: '#c0583a',
  umanita: '#d98c8c',
  saggezza: '#d9a441',
  giustizia: '#6a8caf',
  temperanza: '#7a9a6b',
  trascendenza: '#9b7bb8',
};

export const NOME_SPECIE: Record<Specie, { f: string; m: string }> = {
  volpe: { f: 'volpe', m: 'volpe' },
  daino: { f: 'daina', m: 'daino' },
  tasso: { f: 'tassa', m: 'tasso' },
  riccio: { f: 'riccia', m: 'riccio' },
  scoiattolo: { f: 'scoiattola', m: 'scoiattolo' },
  lepre: { f: 'lepre', m: 'lepre' },
};

export const NOME_FASE: Record<Fase, string> = {
  uovo: 'uovo',
  cucciolo: 'cucciolo',
  giovane: 'giovane',
  adulto: 'adulto',
  maestro: 'maestro',
};

// Riassunti brevi per i ricordi degli animali (il diario originale non si tocca)
export const RIASSUNTO_FORZA: Record<Forza, string> = {
  coraggio: 'ha affrontato una paura',
  perseveranza: 'non ha mollato',
  onesta: 'è stata sincera',
  vitalita: 'si è mossa piena di energia',
  amore: 'ha dato e ricevuto affetto',
  gentilezza: 'si è presa cura di qualcuno',
  intelligenza_sociale: 'ha ascoltato e capito gli altri',
  creativita: 'ha creato qualcosa',
  curiosita: 'ha scoperto qualcosa di nuovo',
  apertura_mentale: 'ha guardato le cose da un altro lato',
  amore_apprendimento: 'ha imparato qualcosa',
  prospettiva: 'ha visto le cose dall\'alto',
  lavoro_squadra: 'ha lavorato insieme agli altri',
  equita: 'è stata giusta',
  leadership: 'ha guidato gli altri',
  perdono: 'ha perdonato',
  umilta: 'ha riconosciuto un errore',
  prudenza: 'ci ha pensato bene',
  autocontrollo: 'ha tenuto la calma',
  bellezza: 'si è fermata davanti a qualcosa di bello',
  gratitudine: 'ha detto grazie',
  speranza: 'ha guardato avanti con fiducia',
  umorismo: 'ha riso',
  spiritualita: 'ha trovato un po\' di pace',
};

export const RIASSUNTO_EMOZIONE: Record<Emozione, string> = {
  gioia: 'era felice',
  fiducia: 'si sentiva al sicuro',
  paura: 'aveva paura',
  sorpresa: 'è stata sorpresa',
  tristezza: 'era triste',
  disgusto: 'qualcosa non le è piaciuto',
  rabbia: 'era arrabbiata',
  attesa: 'aspettava qualcosa',
};

// Icone da gioco per le schermate (finché non arrivano i disegni veri)
export const SIMBOLO_SPECIE: Record<Specie, string> = {
  volpe: '🦊',
  daino: '🦌',
  tasso: '🦡',
  riccio: '🦔',
  scoiattolo: '🐿️',
  lepre: '🐇',
};
