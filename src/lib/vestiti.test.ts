import { describe, expect, it } from 'vitest';
import type { Animale } from './tipi';
import { aggiornaGuardaroba, capo, indossati, SOGLIE_CAPI } from './vestiti';

const animale = (xp: number, fase: Animale['fase'], vestiti?: string[]): Animale =>
  ({ id: 'a1', fase, xp, vestiti, nutrimento: { coraggio: 1, umanita: 9, saggezza: 2, giustizia: 0, temperanza: 0, trascendenza: 3 } }) as unknown as Animale;

describe('vestiti che si fanno da soli', () => {
  it('appena nato non ha niente, dopo pochi giorni il cucciolo si fa la prima sciarpetta secondo il carattere', () => {
    const a = animale(2, 'cucciolo');
    expect(aggiornaGuardaroba(a)).toEqual([]);
    a.xp = SOGLIE_CAPI[0];
    const nuovi = aggiornaGuardaroba(a);
    expect(nuovi).toHaveLength(1);
    expect(nuovi[0].virtu).toBe('umanita');
    expect(nuovi[0].parte).toBe('collo');
  });

  it('in un anno e mezzo si veste da capo a piedi, una parte alla volta', () => {
    const a = animale(0, 'cucciolo');
    aggiornaGuardaroba(a);
    a.fase = 'adulto';
    a.xp = SOGLIE_CAPI[SOGLIE_CAPI.length - 1];
    expect(aggiornaGuardaroba(a)).toHaveLength(SOGLIE_CAPI.length);
    expect(new Set(a.vestiti).size).toBe(SOGLIE_CAPI.length);
    expect(indossati(a).map((k) => k.parte).sort()).toEqual(['collo', 'corpo', 'schiena', 'testa']);
  });

  it('chi era già grande prima del guardaroba lo riceve senza annunci', () => {
    const a = animale(130, 'adulto');
    expect(aggiornaGuardaroba(a)).toEqual([]);
    expect(a.vestiti).toHaveLength(3);
    expect(a.vestiti!.every((id) => capo(id))).toBe(true);
  });
});
