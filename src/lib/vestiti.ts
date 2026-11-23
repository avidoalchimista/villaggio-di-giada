// Vestiti che gli animali si fanno da soli crescendo, secondo il loro carattere
// (la virtù più nutrita in quel momento). Giada non compra niente: è una sorpresa.
import type { Animale, Virtu } from './tipi';
import { VIRTU } from './tipi';

export type Parte = 'collo' | 'testa' | 'corpo' | 'schiena';

export interface Capo { id: string; nome: string; parte: Parte; colore: string; virtu: Virtu }

const c = (id: string, nome: string, parte: Parte, colore: string, virtu: Virtu): Capo => ({ id, nome, parte, colore, virtu });

/** Per ogni carattere, un capo per ogni parte del corpo. */
export const CAPI: Capo[] = [
  // coraggio: rosso e pelle, da avventuriero
  c('bandana-rossa', 'una bandana rossa', 'collo', '#d8443a', 'coraggio'),
  c('berretto-lana', 'un berretto di lana con il pompon', 'testa', '#d8443a', 'coraggio'),
  c('gilet-pelle', 'un gilet di pelle', 'corpo', '#8a5a36', 'coraggio'),
  c('mantello-rosso', 'un mantello rosso', 'schiena', '#c8343a', 'coraggio'),
  // umanità: rosa e caldo, da abbracci
  c('sciarpa-rosa', 'una sciarpa rosa', 'collo', '#f28aa8', 'umanita'),
  c('coroncina-fiori', 'una coroncina di fiori', 'testa', '#f6a8c0', 'umanita'),
  c('maglione-rosa', 'un maglioncino rosa con il cuore', 'corpo', '#f4a0b8', 'umanita'),
  c('borsa-bacche', 'una borsa per le bacche da dividere', 'schiena', '#c88a5a', 'umanita'),
  // saggezza: blu e viola, da studioso
  c('sciarpa-viola', 'una sciarpa viola', 'collo', '#8a5ac8', 'saggezza'),
  c('cappello-punta', 'un cappello a punta con le stelle', 'testa', '#3a5aa8', 'saggezza'),
  c('maglione-blu', 'un maglione blu', 'corpo', '#4a6ab8', 'saggezza'),
  c('mantella-blu', 'una mantella blu', 'schiena', '#34509a', 'saggezza'),
  // giustizia: verde e marrone, ordinato
  c('papillon', 'un papillon', 'collo', '#2a6ac8', 'giustizia'),
  c('cappello-tesa', 'un cappello con la tesa', 'testa', '#7a5232', 'giustizia'),
  c('gilet-verde', 'un gilet verde con i bottoni', 'corpo', '#3f8a5a', 'giustizia'),
  c('borsa-tracolla', 'una borsa a tracolla', 'schiena', '#8a6a3a', 'giustizia'),
  // temperanza: menta e salvia, calmo
  c('sciarpa-menta', 'una sciarpetta color menta', 'collo', '#7ad0b0', 'temperanza'),
  c('berretto-punta', 'un berretto verde a punta', 'testa', '#5aa86a', 'temperanza'),
  c('maglione-righe', 'un maglione a righe', 'corpo', '#8ac0a0', 'temperanza'),
  c('cestino', 'un cestino da portare sulla schiena', 'schiena', '#b8925a', 'temperanza'),
  // trascendenza: azzurro e oro, sognatore
  c('ghirlanda-fiori', 'una ghirlanda di fiori al collo', 'collo', '#ffd166', 'trascendenza'),
  c('coroncina-stelle', 'una coroncina di stelline', 'testa', '#f2c230', 'trascendenza'),
  c('maglione-stella', 'un maglioncino azzurro con la stella', 'corpo', '#8fc8f0', 'trascendenza'),
  c('mantella-stelle', 'una mantella azzurra con le stelle', 'schiena', '#5a8ad8', 'trascendenza'),
];

/** Quando si fa un capo nuovo (punti di crescita): una sciarpetta già da cucciolo dopo pochi giorni, poi via via per un anno e più. */
export const SOGLIE_CAPI = [10, 35, 80, 140, 240, 360, 500, 660, 840];
const ORDINE_PARTI: Parte[] = ['collo', 'testa', 'corpo', 'schiena'];

export function capo(id: string): Capo | undefined {
  return CAPI.find((x) => x.id === id);
}

/** Il carattere di oggi: le virtù dalla più nutrita alla meno. */
function caratteri(a: Animale): Virtu[] {
  return [...VIRTU].sort((x, y) => (a.nutrimento?.[y] ?? 0) - (a.nutrimento?.[x] ?? 0));
}

/** Il prossimo capo che l'animale si fa: prima riempie collo, testa, corpo e schiena, poi rinnova. */
export function prossimoCapo(a: Animale, giaFatti: string[]): Capo {
  const n = giaFatti.length;
  const parte = ORDINE_PARTI[n % ORDINE_PARTI.length];
  for (const v of caratteri(a)) {
    const k = CAPI.find((x) => x.virtu === v && x.parte === parte && !giaFatti.includes(x.id));
    if (k) return k;
  }
  return CAPI.find((x) => x.parte === parte)!;
}

/**
 * Capi nuovi da aggiungere ora (in base ai punti di crescita). Restituisce solo quelli nuovi;
 * per gli animali che non avevano ancora il guardaroba lo riempie senza annunciarlo.
 */
export function aggiornaGuardaroba(a: Animale): Capo[] {
  if (a.fase === 'uovo') {
    a.vestiti ??= [];
    return [];
  }
  const primaVolta = !a.vestiti;
  const fatti = a.vestiti ?? [];
  const nuovi: Capo[] = [];
  const dovuti = SOGLIE_CAPI.filter((s) => a.xp >= s).length;
  while (fatti.length < dovuti) {
    const k = prossimoCapo(a, fatti);
    fatti.push(k.id);
    nuovi.push(k);
  }
  a.vestiti = fatti;
  return primaVolta ? [] : nuovi;
}

/** Cosa indossa adesso: per ogni parte, l'ultimo capo fatto. */
export function indossati(a: Animale): Capo[] {
  const perParte = new Map<Parte, Capo>();
  for (const id of a.vestiti ?? []) {
    const k = capo(id);
    if (k) perParte.set(k.parte, k);
  }
  return [...perParte.values()];
}
