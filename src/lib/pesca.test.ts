import { describe, expect, it } from 'vitest';
import { nuovoStato } from './gioco';
import { cosaAbbocca, PESCI, pesciDelMomento, prendiPesce } from './pesca';
import { conArticolo } from './gioco';
import { zeriForze } from './tipi';

const stato = () => nuovoStato('2026-12-25', zeriForze(), 'Prova', 1);

describe('pesca', () => {
  it('di notte esce il pesce gatto, la mattina la trota', () => {
    expect(pesciDelMomento('notte').some((p) => p.id === 'pescegatto')).toBe(true);
    expect(pesciDelMomento('giorno').some((p) => p.id === 'trota')).toBe(false);
    expect(pesciDelMomento('mattina').some((p) => p.id === 'trota')).toBe(true);
  });

  it('i pesci comuni abboccano più spesso dei rari, e la misura sta nei limiti', () => {
    const conta: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) {
      const { pesce, cm } = cosaAbbocca('giorno', (i * 0.6180339) % 1, (i * 0.381966) % 1);
      conta[pesce.id] = (conta[pesce.id] ?? 0) + 1;
      expect(cm).toBeGreaterThanOrEqual(pesce.cm[0]);
      expect(cm).toBeLessThanOrEqual(pesce.cm[1]);
    }
    expect(conta.carpa).toBeGreaterThan(conta.storione ?? 0);
  });

  it('il quaderno ricorda i pesci e solo i primi del giorno danno la ghianda', () => {
    const s = stato();
    const prima = s.ghiande;
    const r = prendiPesce(s, 'carpa', 40, '2026-12-25');
    expect(r.nuovo).toBe(true);
    for (let i = 0; i < 6; i++) prendiPesce(s, 'carpa', 30 + i * 10, '2026-12-25');
    expect(s.ghiande - prima).toBe(5);
    expect(s.pesca!.presi.carpa).toEqual({ n: 7, record: 80 });
    expect(prendiPesce(s, 'tinca', 20, '2026-12-26').ghiande).toBe(1); // giorno nuovo
    expect(PESCI.length).toBeGreaterThanOrEqual(12);
  });

  it('gli articoli dei nuovi animali', () => {
    expect(conArticolo({ specie: 'asino', sesso: 'm' })).toBe("l'asinello");
    expect(conArticolo({ specie: 'uccellino', sesso: 'f' })).toBe("l'uccellina");
    expect(conArticolo({ specie: 'papera', sesso: 'm' })).toBe('il papero');
    expect(conArticolo({ specie: 'maiale', sesso: 'f' })).toBe('la maialina');
  });
});
