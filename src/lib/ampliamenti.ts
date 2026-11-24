// Le case che crescono da sole: col passare del tempo ogni animale con un mestiere impara a costruire
// e aggiunge un pezzo nuovo alla sua casa (il patio, lo stendino, il capanno degli attrezzi...).
// È diverso dalle migliorie (migliorie.ts), che paga Giada con le castagne: qui è l'animale che cresce.
// Come per le casse delle botteghe, si va avanti solo nei giorni in cui il villaggio è sveglio.

import { hash } from './caso';
import { giorniTra } from './date';
import { REGOLE } from './gioco';
import type { Animale, Evento, StatoGioco } from './tipi';

export interface DefAmpliamento {
  id: string;
  nome: string;
  /** "ha costruito ..." */
  frase: string;
}

export const AMPLIAMENTI: DefAmpliamento[] = [
  { id: 'patio', nome: 'Il patio', frase: 'il patio di legno davanti alla porta, con due sedie' },
  { id: 'stendino', nome: 'Lo stendino', frase: 'lo stendino per i panni di fianco alla casa' },
  { id: 'capanno', nome: 'Il capanno', frase: 'il capanno degli attrezzi dietro la casa' },
  { id: 'pergola', nome: 'La pergola', frase: 'una pergola con la vite rampicante sul patio' },
  { id: 'orto', nome: "L'orticello", frase: "l'orticello sul retro, con le carote e l'insalata" },
  { id: 'abbaino', nome: "L'abbaino", frase: 'una finestrella sul tetto, per guardare le stelle' },
];

/** Ogni quanti giorni (di villaggio sveglio) un animale aggiunge un pezzo alla sua casa. */
export const GIORNI_AMPLIAMENTO = 14;

/** In che ordine li costruisce questo animale: il patio sempre per primo, poi a modo suo. */
export function ordineAmpliamenti(a: Pick<Animale, 'id'>): string[] {
  const resto = AMPLIAMENTI.slice(1).map((d) => d.id);
  const h = hash(a.id + 'ampliamenti');
  resto.sort((x, y) => (hash(x + h) % 97) - (hash(y + h) % 97));
  return ['patio', ...resto];
}

export function prossimoAmpliamento(a: Pick<Animale, 'id' | 'ampliamenti'>): DefAmpliamento | null {
  const fatti = new Set(a.ampliamenti ?? []);
  const id = ordineAmpliamenti(a).find((x) => !fatti.has(x));
  return id ? AMPLIAMENTI.find((d) => d.id === id)! : null;
}

/** Chi può costruire: ha una casa (un mestiere), è almeno giovane, è sveglio. */
function costruttore(a: Animale): boolean {
  return !!a.mestiere && !a.addormentato && (a.fase === 'giovane' || a.fase === 'adulto' || a.fase === 'maestro');
}

/** Un giorno che passa: chi è pronto aggiunge un pezzo alla sua casa. */
export function ampliamentiDelGiorno(s: StatoGioco, giorno: string, out: Evento[], evento: (s: StatoGioco, data: string, tipo: Evento['tipo'], testo: string, out: Evento[], animale?: string) => void, nome: (a: Animale) => string) {
  const vivo = giorniTra(s.ultimaVoce ?? s.inizio, giorno) < REGOLE.castagno.giorniSenzaDiario;
  for (const a of s.animali) {
    if (!costruttore(a)) continue;
    if (!a.giorniCantiere) a.giorniCantiere = 0;
    if (!vivo) continue;
    a.giorniCantiere += 1;
    if (a.giorniCantiere < GIORNI_AMPLIAMENTO) continue;
    const d = prossimoAmpliamento(a);
    if (!d) continue;
    a.giorniCantiere = 0;
    a.ampliamenti = [...(a.ampliamenti ?? []), d.id];
    const f = a.sesso === 'f';
    evento(s, giorno, 'casa', `${nome(a)} ha imparato a costruire da sol${f ? 'a' : 'o'} ${d.frase}!`, out, a.id);
  }
}
