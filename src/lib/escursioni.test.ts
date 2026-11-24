import { describe, expect, it } from 'vitest';
import { trovaSentiero } from './biomi';
import { GIORNI_PRIMA_DEL_CASTORO } from './castoro';
import { aggiungiGiorni } from './date';
import { ABITANTI, compagno, escursionePossibile, fai, giornataParticolare, raccontoEscursione } from './escursioni';
import { nuovoStato, simulaGiorniConDiario } from './gioco';
import { BIOMI } from './biomi';
import type { VoceDiario } from './tipi';
import { zeriForze } from './tipi';

const INIZIO = '2026-12-25';
const voce = (id: string, data: string, emozioni: VoceDiario['emozioni'], difficile = false): VoceDiario =>
  ({ id, data, creata: 0, testo: '', forze: {}, emozioni, giornataDifficile: difficile, riassunto: '' });

const pronta = () => {
  const s = nuovoStato(INIZIO, { ...zeriForze(), curiosita: 5 }, 'Prova', 7);
  simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 5);
  return s;
};

describe('le escursioni', () => {
  it('solo le giornate particolari aprono una gita', () => {
    expect(giornataParticolare(voce('a', INIZIO, { gioia: 1 }))).toBeNull();
    expect(giornataParticolare(voce('a', INIZIO, { tristezza: 2 }))).toBeNull();
    expect(giornataParticolare(voce('a', INIZIO, { tristezza: 3 }))).toBe('triste');
    expect(giornataParticolare(voce('a', INIZIO, { paura: 3, gioia: 1 }))).toBe('paura');
    expect(giornataParticolare(voce('a', INIZIO, { rabbia: 3 }))).toBe('rabbia');
    expect(giornataParticolare(voce('a', INIZIO, { gioia: 2, fiducia: 2 }))).toBe('felice');
    expect(giornataParticolare(voce('a', INIZIO, {}, true))).toBe('stanca');
    expect(giornataParticolare(voce('a', INIZIO, { tristezza: 1 }, true))).toBe('triste');
  });

  it('serve almeno un sentiero scoperto; la pagina vale per tre giorni e una volta sola', () => {
    const s = pronta();
    const oggi = s.ultimoAccesso;
    const v = voce('v1', oggi, { gioia: 3 });
    expect(escursionePossibile(s, [v], oggi)).toBeNull(); // nessun sentiero ancora
    trovaSentiero(s, oggi, []);
    expect(escursionePossibile(s, [v], oggi)?.giornata).toBe('felice');
    expect(escursionePossibile(s, [v], aggiungiGiorni(oggi, 3))).toBeTruthy();
    expect(escursionePossibile(s, [v], aggiungiGiorni(oggi, 4))).toBeNull();
    const a = s.animali.find((x) => x.fase !== 'uovo')!;
    const prima = a.ricordi.length;
    expect(fai(s, 'v1', 'neve', a.id, 'felice', oggi)).toBeTruthy();
    expect(a.ricordi.length).toBe(prima + 1);
    expect(compagno(s)?.id).toBe(a.id);
    expect(escursionePossibile(s, [v], aggiungiGiorni(oggi, 1))).toBeNull(); // già fatta
    expect(fai(s, 'v1', 'neve', a.id, 'felice', oggi)).toBeNull();
  });

  it('ogni posto ha qualcuno da incontrare, con parole per ogni giornata', () => {
    const s = pronta();
    const a = s.animali.find((x) => x.fase !== 'uovo')!;
    for (const b of BIOMI) {
      expect(ABITANTI[b.id]).toBeTruthy();
      for (const g of ['triste', 'paura', 'rabbia', 'stanca', 'felice'] as const) {
        const r = raccontoEscursione(b.id, g, a, 'Lui')!;
        expect(r.righe.length).toBeGreaterThanOrEqual(5);
        for (const x of r.righe) expect(x.testo.length).toBeGreaterThan(10);
      }
    }
  });
});
