import { describe, expect, it } from 'vitest';
import { nuovoStato, simula } from './gioco';
import { cassaMassima, livelloCasa, migliora, motivoMiglioria, ritiraCassa } from './migliorie';
import { aggiungiGiorni } from './date';
import { zeriForze, type StatoGioco } from './tipi';

function villaggio(): StatoGioco {
  const s = nuovoStato('2026-01-01', zeriForze(), 'Prova', 7);
  const a = s.animali[0];
  a.fase = 'giovane';
  a.mestiere = 'fornaio';
  a.nome = 'Bruna';
  s.ghiande = 200;
  s.numeroVoci = 40;
  s.ultimaVoce = '2026-01-01';
  return s;
}

describe('migliorare le case', () => {
  it('parte da casetta e sale di un livello alla volta spendendo castagne', () => {
    const s = villaggio();
    const a = s.animali[0];
    expect(livelloCasa(a)).toBe(1);
    expect(migliora(s, a.id, '2026-01-01')).not.toBeNull();
    expect(livelloCasa(a)).toBe(2);
    expect(s.ghiande).toBe(185);
    expect(migliora(s, a.id, '2026-01-01')).not.toBeNull();
    expect(livelloCasa(a)).toBe(3);
    // la bottega famosa vuole un adulto
    expect(motivoMiglioria(s, a)).toMatch(/adulto/);
    expect(migliora(s, a.id, '2026-01-01')).toBeNull();
    a.fase = 'adulto';
    expect(migliora(s, a.id, '2026-01-01')).not.toBeNull();
    expect(livelloCasa(a)).toBe(4);
    expect(migliora(s, a.id, '2026-01-01')).toBeNull();
  });

  it('senza castagne o senza mestiere non si migliora', () => {
    const s = villaggio();
    s.ghiande = 3;
    expect(motivoMiglioria(s, s.animali[0])).toMatch(/Mancano 12/);
    s.ghiande = 100;
    s.animali[0].mestiere = null;
    expect(migliora(s, s.animali[0].id, '2026-01-01')).toBeNull();
  });

  it('la bottega migliorata mette da parte castagne nei giorni svegli, fino a una cassa piena', () => {
    const s = villaggio();
    const a = s.animali[0];
    simula(s, '2026-01-03');
    expect(a.cassa ?? 0).toBe(0); // la casetta non vende
    migliora(s, a.id, '2026-01-03');
    migliora(s, a.id, '2026-01-03');
    s.ultimaVoce = '2026-01-03';
    simula(s, '2026-01-05');
    expect(a.cassa).toBe(4);
    // senza diario da tanti giorni la cassa resta ferma, ma non si svuota
    simula(s, aggiungiGiorni('2026-01-05', 30));
    expect(a.cassa).toBeLessThanOrEqual(cassaMassima(a));
    expect(a.cassa).toBeGreaterThanOrEqual(4);
    const prima = s.ghiande;
    const n = ritiraCassa(s, a.id);
    expect(s.ghiande).toBe(prima + n);
    expect(a.cassa).toBe(0);
  });
});
