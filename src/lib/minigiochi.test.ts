import { describe, expect, it } from 'vitest';
import {
  ARGILLA_INIZIO, castagnePer, colpoLegna, COSTELLAZIONI, costellazioneDa, disegnoTorta, FORME_VASO, lineaGiusta, MINIGIOCHI,
  minigiocoDi, minigiochiAperti, modellaVaso, PARTITE_PAGATE, premiaPartita, puoAiutare, puntiStelle, salvaCostellazione, salvaVaso,
  somiglianzaTorta, somiglianzaVaso,
} from './minigiochi';
import { MESTIERI } from './mestieri';
import { nuovoStato } from './gioco';
import { zeriForze } from './tipi';

const OGGI = '2027-01-10';
const stato = () => nuovoStato('2026-12-25', { ...zeriForze(), gentilezza: 5 }, 'Prova', 3);

describe('i minigiochi delle botteghe', () => {
  it('ogni minigioco è di un mestiere che esiste davvero', () => {
    for (const m of MINIGIOCHI) expect(MESTIERI.some((x) => x.id === m.mestiere)).toBe(true);
    expect(minigiocoDi('motociclista')?.id).toBe('moto');
    expect(minigiocoDi('cuoco')).toBeUndefined();
  });

  it('si aprono solo con un animale grande e sveglio che fa quel mestiere', () => {
    expect(puoAiutare({ mestiere: 'vasaio', fase: 'adulto', addormentato: false })?.id).toBe('tornio');
    expect(puoAiutare({ mestiere: 'vasaio', fase: 'adulto', addormentato: true })).toBeUndefined();
    expect(puoAiutare({ mestiere: null, fase: 'maestro', addormentato: false })).toBeUndefined();
    const s = stato();
    expect(minigiochiAperti(s)).toEqual([]);
    s.animali[0].fase = 'adulto';
    s.animali[0].mestiere = 'fotografo';
    expect(minigiochiAperti(s).map((m) => m.id)).toEqual(['foto']);
  });

  it('mai si perde: da 1 a 5 castagne, solo le prime partite del giorno pagano', () => {
    expect(castagnePer(0)).toBe(1);
    expect(castagnePer(1)).toBe(5);
    expect(castagnePer(NaN)).toBe(1);
    const s = stato();
    const prima = s.ghiande;
    const r1 = premiaPartita(s, 'legna', 1, OGGI);
    expect(r1).toEqual({ castagne: 5, restano: PARTITE_PAGATE - 1, prima: true });
    premiaPartita(s, 'legna', 0, OGGI);
    premiaPartita(s, 'legna', 0, OGGI);
    const r4 = premiaPartita(s, 'legna', 1, OGGI);
    expect(r4.castagne).toBe(0);
    expect(s.ghiande).toBe(prima + 5 + 1 + 1);
    // un'altra bottega ha il suo conto, e il giorno dopo si riparte
    expect(premiaPartita(s, 'moto', 0.5, OGGI).castagne).toBe(3);
    expect(premiaPartita(s, 'legna', 1, '2027-01-11').castagne).toBe(5);
  });

  it('spacca la legna: più vicino alla crepa, più pezzi', () => {
    expect(colpoLegna(0).pezzi).toBe(4);
    expect(colpoLegna(0.1).pezzi).toBe(3);
    expect(colpoLegna(-0.2).pezzi).toBe(2);
    expect(colpoLegna(0.5).pezzi).toBe(1);
  });

  it('la torta copiata bene somiglia, quella vuota no', () => {
    for (let seme = 0; seme < 20; seme++) {
      const d = disegnoTorta(seme, 1 + (seme % 4));
      expect(d.length).toBeGreaterThanOrEqual(6);
      expect(somiglianzaTorta(d, d)).toBe(1);
      expect(somiglianzaTorta(d, [])).toBe(0);
      const spostata = d.map((p) => ({ ...p, x: p.x + 0.15 }));
      expect(somiglianzaTorta(d, spostata)).toBeGreaterThan(0.7);
    }
  });

  it('il tornio: si modella liscio e la forma giusta vale il massimo', () => {
    const p = [...ARGILLA_INIZIO.profilo];
    modellaVaso(p, 0.5, 0.1);
    expect(p[4]).toBeGreaterThan(p[0]);
    expect(p[0]).toBeCloseTo(ARGILLA_INIZIO.profilo[0]);
    for (const f of FORME_VASO) {
      expect(somiglianzaVaso(f.profilo, f.alto, f)).toBe(1);
      expect(somiglianzaVaso(ARGILLA_INIZIO.profilo, ARGILLA_INIZIO.alto, f)).toBeLessThan(0.8);
    }
  });

  it('le costellazioni: linee giuste in tutti e due i versi, e non si ripete quella appena fatta', () => {
    for (const c of COSTELLAZIONI) for (const [a, b] of c.linee) {
      expect(c.punti[a]).toBeDefined();
      expect(c.punti[b]).toBeDefined();
      expect(lineaGiusta(c, b, a)).toBeGreaterThanOrEqual(0);
    }
    const c = costellazioneDa(0, 1, ['casetta']);
    expect(c.id).not.toBe('casetta');
    expect(puntiStelle(5, 0, 5)).toBe(1);
    expect(puntiStelle(200, 3, 5)).toBe(0);
  });

  it('le cose che restano non riempiono il villaggio all\'infinito', () => {
    const s = stato();
    for (let i = 0; i < 9; i++) salvaVaso(s, 'a1', { data: OGGI, profilo: [...ARGILLA_INIZIO.profilo], alto: 1, colore: '#fff' });
    expect(s.botteghe!.vasi.a1.length).toBe(5);
    for (let i = 0; i < 9; i++) salvaCostellazione(s, { data: OGGI, nome: 'x' + i, forma: 'cuore', punti: [], linee: [] });
    expect(s.botteghe!.stelle.length).toBe(6);
    expect(s.botteghe!.stelle[5].nome).toBe('x8');
  });
});
