import { describe, expect, it } from 'vitest';
import { nuovoStato } from './gioco';
import { cosaAbbocca, esperto, finestraAbbocco, misura, nuovaLotta, passoLotta, PESCI, pesciDelMomento, prendiPesce, recuperoDaSolo, tiraLenza } from './pesca';
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

describe('pesca vista da fuori', () => {
  const carpa = PESCI.find((p) => p.id === 'carpa')!;
  const storione = PESCI.find((p) => p.id === 'storione')!;
  const fisso = () => 0.5;

  // gioca il recupero: tocca `tps` volte al secondo, e se `paziente` si ferma durante gli strattoni
  function gioca(pesce: typeof carpa, tps: number, paziente: boolean, bravo = false) {
    const l = nuovaLotta(pesce, bravo, fisso);
    const dt = 1 / 60;
    let prossimoTocco = 0;
    for (let t = 0; t < 60 && !l.esito; t += dt) {
      passoLotta(l, dt, fisso);
      prossimoTocco -= dt;
      const aspetta = paziente && (l.strattone > 0 || l.tensione > 0.7);
      if (prossimoTocco <= 0 && !aspetta) { tiraLenza(l); prossimoTocco = 1 / tps; }
    }
    return l.esito;
  }

  it('chi tocca con calma e si ferma agli strattoni tira su il pesce', () => {
    expect(gioca(carpa, 5, true)).toBe('preso');
    expect(gioca(storione, 5, true)).toBe('preso');
  });

  it('chi tocca come un matto senza fermarsi rompe la lenza', () => {
    expect(gioca(carpa, 12, false)).toBe('rotta');
  });

  it('chi non tocca mai lascia scappare il pesce', () => {
    expect(gioca(carpa, 0.0001, false)).toBe('scappato');
  });

  it('chi è bravo a pescare ha più tempo per ferrare e perde meno pesci', () => {
    expect(esperto({ abilita: ['pescare'], mestiere: null })).toBe(true);
    expect(esperto({ abilita: [], mestiere: 'pescatore' })).toBe(true);
    expect(esperto({ abilita: [], mestiere: null })).toBe(false);
    expect(finestraAbbocco(true)).toBeGreaterThan(finestraAbbocco(false));
    let bravi = 0, altri = 0;
    for (let i = 0; i < 100; i++) { if (recuperoDaSolo(true, 2, i / 100)) bravi++; if (recuperoDaSolo(false, 2, i / 100)) altri++; }
    expect(bravi).toBeGreaterThan(altri);
    expect(altri).toBeGreaterThan(70);
  });

  it('tirando da sé si prendono pesci più grossi', () => {
    expect(misura(carpa, 0.5, true)).toBeGreaterThan(misura(carpa, 0.5, false));
    expect(misura(carpa, 1, true)).toBe(carpa.cm[1]);
  });
});
