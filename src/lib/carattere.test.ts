import { describe, expect, it } from 'vitest';
import { CARATTERI, carattereDi, cosaFaInCasa, fraseCarattere, momentoDa } from './carattere';
import { normalizzaStato, nuovoStato, simulaGiorniConDiario } from './gioco';
import { zeriForze, type StatoGioco } from './tipi';

function villaggio(giorni: number): StatoGioco {
  const s = nuovoStato('2026-01-01', zeriForze(), 'Prova', 1234);
  simulaGiorniConDiario(s, '2026-01-01', giorni, 1);
  return s;
}

describe('carattere degli animali', () => {
  it('ognuno ha un carattere: i primi otto tutti diversi, poi ogni carattere al massimo due volte', () => {
    const s = villaggio(400);
    expect(s.animali.length).toBeGreaterThan(8);
    const c = s.animali.map((a) => a.carattere);
    expect(c.every(Boolean)).toBe(true);
    expect(new Set(c.slice(0, 8)).size).toBe(8);
    for (const x of new Set(c)) expect(c.filter((y) => y === x).length).toBeLessThanOrEqual(2);
  });

  it('chi è stato salvato prima del carattere ne riceve uno con la migrazione', () => {
    const s = villaggio(120);
    for (const a of s.animali) delete a.carattere;
    normalizzaStato(s);
    const c = s.animali.map((a) => a.carattere);
    expect(c.every((x) => CARATTERI.some((k) => k.id === x))).toBe(true);
    expect(new Set(c).size).toBe(Math.min(c.length, CARATTERI.length));
  });

  it('di notte dormono, a pranzo mangiano o cucinano, al lavoro chi ha un mestiere sta al banco', () => {
    const s = villaggio(300);
    const a = s.animali.find((x) => x.mestiere)!;
    a.addormentato = false;
    expect(cosaFaInCasa(a, 'notte').gesto).toBe('dorme');
    expect(['mangia', 'cucina']).toContain(cosaFaInCasa(a, 'pranzo').gesto);
    expect(cosaFaInCasa(a, 'lavoro').posto).toBe('lavoro');
  });

  it('le frasi sono accordate al sesso e non restano segnaposto', () => {
    for (const c of CARATTERI) {
      for (const sesso of ['f', 'm'] as const) {
        const a = { id: 'x', carattere: c.id, sesso, fase: 'adulto', addormentato: false, mestiere: null } as never;
        for (const m of ['mattina', 'lavoro', 'pranzo', 'sera', 'notte'] as const) {
          for (let k = 0; k < 6; k++) expect(fraseCarattere(a, m, k)).not.toMatch(/[{}]/);
          expect(cosaFaInCasa(a, m).testo).not.toMatch(/[{}]/);
        }
      }
    }
    expect(carattereDi({ id: 'a9' }).id).toBeTruthy();
  });

  it('le ore della giornata', () => {
    expect(momentoDa(8)).toBe('mattina');
    expect(momentoDa(10)).toBe('lavoro');
    expect(momentoDa(13)).toBe('pranzo');
    expect(momentoDa(19)).toBe('sera');
    expect(momentoDa(23)).toBe('notte');
  });
});
