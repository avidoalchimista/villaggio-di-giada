import { describe, expect, it } from 'vitest';
import { cucina, FUNGHI, funghiDelMese, mandaAFunghi, motivoNo, raccolto, rientri, FUORI_MAX } from './funghi';
import { aggiungiRitrovamento, esponiFungo, prendiRitrovamento, RITROVAMENTI, ritrovamentoDelGiorno } from './museo';
import { costruisci, nuovoStato, simulaGiorniConDiario } from './gioco';
import { rng } from './caso';
import { zeriForze } from './tipi';

const INIZIO = '2026-12-25';
function villaggio() {
  const s = nuovoStato(INIZIO, { ...zeriForze(), gentilezza: 5 }, 'Prova', 3);
  simulaGiorniConDiario(s, INIZIO, 60);
  return s;
}
const OGGI = '2027-02-23';

describe('i funghi', () => {
  it('in ogni mese dell\'anno si trova almeno qualche fungo (anche d\'inverno)', () => {
    for (let m = 1; m <= 12; m++) expect(funghiDelMese(m).length).toBeGreaterThanOrEqual(5);
    expect(FUNGHI.length).toBeGreaterThanOrEqual(20);
  });

  it('d\'autunno se ne trovano di più che d\'inverno, e i rari sono rari', () => {
    const r = rng(1);
    let autunno = 0, inverno = 0, rari = 0, tot = 0;
    for (let i = 0; i < 300; i++) {
      const a = raccolto(10, false, r);
      const b = raccolto(1, false, r);
      autunno += Object.values(a).reduce((x, y) => x + y, 0);
      inverno += Object.values(b).reduce((x, y) => x + y, 0);
      for (const [id, n] of Object.entries(a)) { tot += n; if (FUNGHI.find((f) => f.id === id)!.raro >= 4) rari += n; }
    }
    expect(autunno).toBeGreaterThan(inverno);
    expect(rari / tot).toBeLessThan(0.1);
    expect(rari).toBeGreaterThan(0);
  });

  it('chi va nel bosco torna dopo un po\' (o il giorno dopo) con il cestino pieno', () => {
    const s = villaggio();
    const a = s.animali.find((x) => x.fase !== 'uovo' && x.fase !== 'cucciolo' && !x.addormentato)!;
    expect(a).toBeTruthy();
    const t0 = 1_000_000;
    expect(mandaAFunghi(s, a.id, t0, OGGI)).toBeTruthy();
    expect(motivoNo(s, a, OGGI)).toBe('è già nel bosco');
    expect(rientri(s, t0 + 60_000, OGGI)).toEqual([]); // dopo un minuto è ancora via
    const r = rientri(s, t0 + 60 * 60_000, OGGI);
    expect(r).toHaveLength(1);
    expect(Object.keys(s.funghi!.cestino).length).toBeGreaterThan(0);
    expect(motivoNo(s, a, OGGI)).toBe('ci è già andato oggi');
    // il giorno dopo può tornarci, e se l'app resta chiusa torna comunque
    expect(mandaAFunghi(s, a.id, t0, '2027-02-24')).toBeTruthy();
    expect(rientri(s, t0, '2027-02-25')).toHaveLength(1);
  });

  it('non più di tre alla volta nel bosco', () => {
    const s = villaggio();
    let n = 0;
    for (const a of s.animali) if (mandaAFunghi(s, a.id, 0, OGGI)) n++;
    expect(n).toBeLessThanOrEqual(FUORI_MAX);
  });

  it('si cucinano solo quelli buoni; il cuoco guadagna castagne, Giada no', () => {
    const s = villaggio();
    s.funghi = { fuori: [], cestino: { porcino: 4, muscaria: 1 }, trovati: {}, uscite: {}, piatti: 0 };
    expect(cucina(s, 'muscaria', null)).toBeNull();
    const prima = s.ghiande;
    const p = cucina(s, 'porcino', null)!;
    expect(p.funghi).toBe(3);
    expect(p.castagne).toBe(0);
    expect(s.ghiande).toBe(prima);
    expect(s.funghi.cestino.porcino).toBe(1);
    const cuoco = s.animali.find((a) => a.fase !== 'uovo')!;
    cuoco.mestiere = 'cuoco';
    cuoco.addormentato = false;
    const q = cucina(s, 'porcino', cuoco.id)!;
    expect(q.castagne).toBeGreaterThan(0);
    expect(s.ghiande).toBe(prima + q.castagne);
    expect(s.funghi.cestino.porcino).toBeUndefined();
  });
});

describe('il museo', () => {
  it('ogni giorno c\'è una cosa che brilla, sempre la stessa fino a quando Giada la prende', () => {
    const s = villaggio();
    const a = ritrovamentoDelGiorno(s, OGGI)!;
    expect(ritrovamentoDelGiorno(s, OGGI)).toEqual(a);
    s.seme += 7; // il resto del gioco va avanti
    expect(ritrovamentoDelGiorno(s, OGGI)!.id).toBe(a.id);
    const p = prendiRitrovamento(s, OGGI)!;
    expect(p.id).toBe(a.id);
    expect(p.castagne).toBe(0); // senza museo niente biglietti, ma la cosa resta da parte
    expect(ritrovamentoDelGiorno(s, OGGI)).toBeNull();
    expect(ritrovamentoDelGiorno(s, '2027-02-24')).toBeTruthy();
  });

  it('col museo i pezzi nuovi portano castagne, e i funghi si espongono dal cestino', () => {
    const s = villaggio();
    s.ghiande = 500;
    s.numeroVoci = Math.max(s.numeroVoci, 20);
    expect(costruisci(s, 'museo', OGGI)).toBeTruthy();
    const prima = s.ghiande;
    const p = aggiungiRitrovamento(s, RITROVAMENTI[0].id, OGGI)!;
    expect(p.nuovo).toBe(true);
    expect(s.ghiande).toBe(prima + p.castagne);
    expect(aggiungiRitrovamento(s, RITROVAMENTI[0].id, OGGI)!.castagne).toBe(1); // doppione
    s.funghi = { fuori: [], cestino: { ovolo: 1 }, trovati: { ovolo: 1 }, uscite: {}, piatti: 0 };
    expect(esponiFungo(s, 'ovolo')).toBeGreaterThan(0);
    expect(s.museo!.funghi).toEqual(['ovolo']);
    expect(esponiFungo(s, 'ovolo')).toBeNull();
  });
});
