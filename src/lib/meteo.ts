// Il tempo che fa nel bosco: cambia a caso, ma in modo credibile (stagioni, e non salta di continuo).
// Sempre uguale per lo stesso giorno e la stessa fascia oraria, così riaprendo l'app non cambia di colpo.
import { hash, rng } from './caso';

export type Meteo = 'sole' | 'nuvole' | 'pioggia' | 'temporale' | 'neve' | 'nebbia' | 'vento';

export const NOME_METEO: Record<Meteo, { nome: string; icona: string }> = {
  sole: { nome: 'Sereno', icona: '☀️' },
  nuvole: { nome: 'Nuvoloso', icona: '☁️' },
  pioggia: { nome: 'Pioggia', icona: '🌧️' },
  temporale: { nome: 'Temporale', icona: '⛈️' },
  neve: { nome: 'Neve', icona: '❄️' },
  nebbia: { nome: 'Nebbia', icona: '🌫️' },
  vento: { nome: 'Vento', icona: '🍃' },
};

type Pesi = Partial<Record<Meteo, number>>;
const STAGIONI: Record<'inverno' | 'primavera' | 'estate' | 'autunno', Pesi> = {
  inverno: { sole: 22, nuvole: 22, neve: 22, nebbia: 16, pioggia: 12, vento: 6 },
  primavera: { sole: 40, nuvole: 22, pioggia: 22, vento: 10, temporale: 6 },
  estate: { sole: 62, nuvole: 14, temporale: 10, vento: 8, pioggia: 6 },
  autunno: { sole: 24, nuvole: 26, pioggia: 24, nebbia: 14, vento: 12 },
};

export function stagione(data: string): keyof typeof STAGIONI {
  const m = Number(data.slice(5, 7));
  return m === 12 || m <= 2 ? 'inverno' : m <= 5 ? 'primavera' : m <= 8 ? 'estate' : 'autunno';
}

function estrai(pesi: Pesi, r: number): Meteo {
  const voci = Object.entries(pesi) as [Meteo, number][];
  const tot = voci.reduce((a, [, p]) => a + p, 0);
  let x = r * tot;
  for (const [m, p] of voci) if ((x -= p) <= 0) return m;
  return voci[0][0];
}

/** Il tempo di una data e di un'ora (fasce di 4 ore). Ogni fascia somiglia alla precedente. */
export function meteo(data: string, ora: number, seme = 0): Meteo {
  const pesi = STAGIONI[stagione(data)];
  const baseGiorno = estrai(pesi, rng(hash(data) ^ seme)());
  const fascia = Math.floor(ora / 4);
  let m = baseGiorno;
  for (let f = 1; f <= fascia; f++) {
    const r = rng(hash(`${data}#${f}`) ^ seme);
    // 70% delle volte il tempo resta com'era; altrimenti cambia secondo la stagione
    if (r() > 0.7) m = estrai(pesi, r());
  }
  return m;
}
