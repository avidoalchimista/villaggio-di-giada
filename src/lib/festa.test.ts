import { describe, expect, it } from 'vitest';
import { CARATTERI } from './carattere';
import { auguriDi, CASTAGNE_IN_REGALO, eCompleanno, eVigilia, festaDaFare, festeggia, invitati, villaggioInFesta } from './festa';
import { nuovoStato, simulaGiorniConDiario } from './gioco';
import { zeriForze, type StatoGioco } from './tipi';

function villaggio(giorni: number): StatoGioco {
  const s = nuovoStato('2026-01-01', zeriForze(), 'Prova', 1234);
  simulaGiorniConDiario(s, '2026-01-01', giorni, 1);
  return s;
}

describe('festa di compleanno di Giada', () => {
  it('il 24 luglio è il compleanno, il 23 la vigilia', () => {
    expect(eCompleanno('2027-07-24')).toBe(true);
    expect(eCompleanno('2027-07-25')).toBe(false);
    expect(eVigilia('2027-07-23')).toBe(true);
    expect(eVigilia('2027-07-24')).toBe(false);
  });

  it('la festa la aspetta qualche giorno, poi si festeggia una volta sola all\'anno', () => {
    const s = villaggio(60);
    expect(festaDaFare(s, '2027-07-23')).toBe(false);
    expect(festaDaFare(s, '2027-07-24')).toBe(true);
    expect(festaDaFare(s, '2027-07-27')).toBe(true);
    expect(festaDaFare(s, '2027-07-28')).toBe(false);
    const prima = s.ghiande;
    festeggia(s, '2027-07-25');
    expect(s.ghiande).toBe(prima + CASTAGNE_IN_REGALO);
    expect(festaDaFare(s, '2027-07-26')).toBe(false);
    // gli addobbi restano il giorno della festa, non il giorno dopo
    expect(villaggioInFesta(s, '2027-07-25')).toBe(true);
    expect(villaggioInFesta(s, '2027-07-26')).toBe(false);
    // l'anno dopo si rifà
    expect(festaDaFare(s, '2028-07-24')).toBe(true);
  });

  it('dopo la festa ogni animale se la ricorda', () => {
    const s = villaggio(200);
    festeggia(s, '2026-07-24');
    const nati = s.animali.filter((a) => a.fase !== 'uovo');
    expect(nati.length).toBeGreaterThan(0);
    for (const a of nati) expect(a.ricordi.at(-1)?.frase).toContain('grande festa');
    festeggia(s, '2027-07-24');
    expect(nati[0].ricordi.at(-1)?.frase).toContain('la seconda insieme');
  });

  it('ognuno fa gli auguri a modo suo, e ci sono auguri per ogni carattere', () => {
    const s = villaggio(400);
    const grandi = invitati(s, 4);
    expect(grandi.length).toBeGreaterThan(0);
    for (const c of CARATTERI) {
      const a = { ...grandi[0], carattere: c.id, fase: 'adulto' as const };
      const t = auguriDi(a, 0);
      expect(t.length).toBeGreaterThan(10);
      expect(t).not.toMatch(/\{o\}|\{lo\}/);
    }
  });
});
