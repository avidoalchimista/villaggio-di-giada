import { describe, expect, it } from 'vitest';
import { AMPLIAMENTI, GIORNI_AMPLIAMENTO, ordineAmpliamenti, prossimoAmpliamento } from './ampliamenti';
import { aggiungiGiorni } from './date';
import { nuovoStato, simula } from './gioco';
import { zeriForze } from './tipi';

describe('le case che crescono da sole', () => {
  it('il patio viene sempre per primo, poi ognuno a modo suo, senza ripetersi', () => {
    for (const id of ['a', 'b', 'volpe1', 'riccio7']) {
      const o = ordineAmpliamenti({ id });
      expect(o[0]).toBe('patio');
      expect(new Set(o).size).toBe(AMPLIAMENTI.length);
    }
    expect(ordineAmpliamenti({ id: 'a' })).not.toEqual(ordineAmpliamenti({ id: 'zz9' }));
  });

  it('chi ha una casa aggiunge un pezzo ogni tanto, solo nei giorni in cui il villaggio è sveglio', () => {
    const s = nuovoStato('2026-01-01', zeriForze(), 'Prova', 7);
    const a = s.animali[0];
    a.fase = 'giovane';
    a.mestiere = 'fornaio';
    a.vociPerSchiudersi = 0;
    s.ultimaVoce = aggiungiGiorni('2026-01-01', GIORNI_AMPLIAMENTO + 1); // come se Giada scrivesse ogni giorno
    s.ultimoAccesso = '2026-01-01';
    const eventi = simula(s, aggiungiGiorni('2026-01-01', GIORNI_AMPLIAMENTO + 1));
    expect(a.ampliamenti).toEqual(['patio']);
    expect(eventi.some((e) => e.tipo === 'casa' && e.animale === a.id && /patio/.test(e.testo))).toBe(true);
    expect(prossimoAmpliamento(a)?.id).not.toBe('patio');
    // senza diario per tanto tempo il villaggio dorme: niente cantieri
    const prima = a.giorniCantiere;
    simula(s, aggiungiGiorni('2026-01-01', 200));
    expect((a.ampliamenti ?? []).length).toBeLessThan(AMPLIAMENTI.length);
    void prima;
  });
});
