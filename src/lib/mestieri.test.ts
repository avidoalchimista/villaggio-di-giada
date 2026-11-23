import { describe, expect, it } from 'vitest';
import { capo, FORME } from './vestiti';
import { defMestiere, MESTIERI, mestieriDi, nomeMestiere, scegliTra } from './mestieri';
import { VIRTU } from './tipi';

describe('mestieri', () => {
  it('sono tanti, almeno sei per ogni virtù, tutti diversi e con l\'insegna scritta', () => {
    expect(MESTIERI.length).toBeGreaterThanOrEqual(36);
    expect(new Set(MESTIERI.map((m) => m.id)).size).toBe(MESTIERI.length);
    for (const v of VIRTU) expect(mestieriDi(v).length).toBeGreaterThanOrEqual(6);
    for (const m of MESTIERI) {
      expect(m.insegna.length).toBeGreaterThan(2);
      expect(m.attrezzi.length).toBeGreaterThanOrEqual(3);
    }
    // tutte le insegne sono diverse: dalla scritta si capisce cosa fanno
    expect(new Set(MESTIERI.map((m) => m.insegna)).size).toBe(MESTIERI.length);
  });

  it('le divise sono fatte di capi veri', () => {
    for (const m of MESTIERI) for (const id of Object.values(m.divisa)) expect(capo(id!), `${m.id}: ${id}`).toBeTruthy();
  });

  it('i nomi vanno al femminile e i mestieri di una volta si ritrovano', () => {
    expect(nomeMestiere({ mestiere: 'pescatore', sesso: 'f' })).toBe('pescatrice');
    expect(nomeMestiere({ mestiere: 'fabbro', sesso: 'm' })).toBe('fabbro');
    expect(defMestiere('cuoco')).toBeTruthy();
    expect(defMestiere('artigiano')?.m).toBe('falegname');
  });

  it('nella stessa virtù ognuno fa un mestiere diverso, scelto da chi è', () => {
    const presi = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const m = scegliTra({ id: 'a' + i }, 'coraggio', presi)!;
      expect(presi.has(m)).toBe(false);
      presi.add(m);
    }
    expect(scegliTra({ id: 'z' }, 'coraggio', presi)).toBeNull();
    expect(scegliTra({ id: 'x' }, 'trascendenza', new Set())).toBe(scegliTra({ id: 'x' }, 'trascendenza', new Set()));
  });

  it('ci sono forme per ogni parte del corpo', () => {
    for (const p of ['testa', 'collo', 'corpo', 'schiena']) expect(FORME.filter((f) => f.parte === p && !f.lavoro).length).toBeGreaterThanOrEqual(5);
  });
});
