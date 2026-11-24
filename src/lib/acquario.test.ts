import { describe, expect, it } from 'vitest';
import { acquarioDi, compraPesce, mettiInVasca, POSTI_VASCA, prezzoPesce, riempiAllInizio, UGUALI_MAX } from './acquario';
import { BIOMI, biomiScoperti, PRIMO_SENTIERO, TRA_I_SENTIERI, trovaSentiero } from './biomi';
import { GIORNI_PRIMA_DEL_CASTORO } from './castoro';
import { aggiungiGiorni, giorniTra } from './date';
import { costruisci, nuovoStato, simulaGiorniConDiario } from './gioco';
import { prendiPesce } from './pesca';
import type { Evento } from './tipi';
import { zeriForze } from './tipi';

const INIZIO = '2026-12-25';
const partita = () => nuovoStato(INIZIO, { ...zeriForze(), curiosita: 5 }, 'Prova', 7);

describe('i sentieri del castoro', () => {
  it('il primo dopo circa un mese dal suo arrivo, poi uno ogni uno-due mesi, e lo racconta', () => {
    const s = partita();
    const { eventi } = simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 400);
    const sentieri = s.castoro!.sentieri!;
    expect(sentieri.length).toBeGreaterThanOrEqual(5);
    const primo = giorniTra(s.castoro!.arrivo, sentieri[0].data);
    expect(primo).toBeGreaterThanOrEqual(PRIMO_SENTIERO[0]);
    expect(primo).toBeLessThanOrEqual(PRIMO_SENTIERO[1]);
    for (let i = 1; i < sentieri.length; i++) {
      const g = giorniTra(sentieri[i - 1].data, sentieri[i].data);
      expect(g).toBeGreaterThanOrEqual(TRA_I_SENTIERI[0]);
      expect(g).toBeLessThanOrEqual(TRA_I_SENTIERI[1]);
    }
    // nell'ordine: prima la neve, poi il mare
    expect(sentieri[0].id).toBe('neve');
    expect(sentieri[1].id).toBe('mare');
    const annunci = eventi.filter((e) => e.tipo === 'sentiero');
    expect(annunci).toHaveLength(sentieri.length);
    expect(annunci[0].luogo).toBe('neve');
    // e si vede in primo piano
    expect(s.sorprese.some((e) => e.tipo === 'sentiero')).toBe(true);
  });

  it('quando li ha trovati tutti, smette', () => {
    const s = partita();
    simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 2);
    const out: Evento[] = [];
    for (let i = 0; i < BIOMI.length + 2; i++) trovaSentiero(s, aggiungiGiorni(INIZIO, 20 + i), out);
    expect(biomiScoperti(s)).toHaveLength(BIOMI.length);
    expect(out).toHaveLength(BIOMI.length);
  });

  it('il castoro non rosicchia gli alberi dove passa un sentiero', () => {
    const s = partita();
    simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 365);
    for (const t of [...s.castoro!.tagliati, s.castoro!.albero])
      for (const b of biomiScoperti(s)) expect(Math.abs(((t - b.angolo + 540) % 360) - 180)).toBeGreaterThanOrEqual(14);
  });

  it('i sentieri non partono dal viale d\'ingresso e non si pestano i piedi', () => {
    for (const b of BIOMI) {
      expect(Math.abs(((b.angolo - 90 + 540) % 360) - 180)).toBeGreaterThanOrEqual(45);
      for (const c of BIOMI) if (c !== b) expect(Math.abs(((b.angolo - c.angolo + 540) % 360) - 180)).toBeGreaterThanOrEqual(25);
    }
  });
});

describe("l'acquario", () => {
  const conLaghetto = () => {
    const s = partita();
    s.ghiande = 500;
    costruisci(s, 'laghetto', INIZIO);
    return s;
  };

  it('si costruisce solo dopo il laghetto, con tante castagne', () => {
    const s = partita();
    s.ghiande = 500;
    expect(costruisci(s, 'acquario', INIZIO)).toBeNull();
    costruisci(s, 'laghetto', INIZIO);
    s.ghiande = 50;
    expect(costruisci(s, 'acquario', INIZIO)).toBeNull();
    s.ghiande = 200;
    expect(costruisci(s, 'acquario', INIZIO)).toBeTruthy();
  });

  it('appena costruito ci sono già i pesci pescati prima, uno per tipo (niente stivali)', () => {
    const s = conLaghetto();
    prendiPesce(s, 'carpa', 40, INIZIO);
    prendiPesce(s, 'carpa', 55, INIZIO);
    prendiPesce(s, 'tinca', 30, INIZIO);
    prendiPesce(s, 'stivale', 30, INIZIO);
    costruisci(s, 'acquario', INIZIO);
    expect(riempiAllInizio(s, INIZIO)).toBe(2);
    const v = acquarioDi(s).pesci;
    expect(v.map((p) => p.id).sort()).toEqual(['carpa', 'tinca']);
    expect(v.find((p) => p.id === 'carpa')!.cm).toBe(55);
  });

  it('i pesci pescati ci finiscono dentro, ma non troppi uguali', () => {
    const s = conLaghetto();
    expect(mettiInVasca(s, 'carpa', 30, 'laghetto', INIZIO)).toBe('no'); // non c'è ancora
    costruisci(s, 'acquario', INIZIO);
    for (let i = 0; i < UGUALI_MAX; i++) expect(mettiInVasca(s, 'carpa', 30 + i, 'laghetto', INIZIO)).toBe('dentro');
    expect(mettiInVasca(s, 'carpa', 20, 'laghetto', INIZIO)).toBe('pieno');
    // uno più grande prende il posto del più piccolo
    expect(mettiInVasca(s, 'carpa', 69, 'laghetto', INIZIO)).toBe('dentro');
    expect(acquarioDi(s).pesci.filter((p) => p.id === 'carpa').map((p) => p.cm).sort()).toEqual([31, 32, 69]);
    expect(mettiInVasca(s, 'stivale', 30, 'laghetto', INIZIO)).toBe('no');
    expect(acquarioDi(s).pesci.length).toBeLessThanOrEqual(POSTI_VASCA);
  });

  it('i pesci dei villaggi lontani si comprano solo dopo che il castoro ha trovato il sentiero', () => {
    const s = conLaghetto();
    costruisci(s, 'acquario', INIZIO);
    simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 2);
    s.ghiande = 100;
    expect(compraPesce(s, 'salmone', INIZIO)).toBe('no');
    trovaSentiero(s, INIZIO, []);
    const prima = s.ghiande;
    expect(compraPesce(s, 'salmone', INIZIO)).toBe('ok');
    expect(s.ghiande).toBe(prima - prezzoPesce(BIOMI[0].pesci[1]));
    expect(acquarioDi(s).pesci.at(-1)).toMatchObject({ id: 'salmone', da: 'neve' });
    expect(compraPesce(s, 'pagliaccio', INIZIO)).toBe('no'); // il mare non l'ha ancora trovato
    s.ghiande = 0;
    expect(compraPesce(s, 'salmerino', INIZIO)).toBe('castagne');
  });
});
