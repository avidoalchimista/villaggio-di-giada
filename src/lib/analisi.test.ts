import { describe, expect, it } from 'vitest';
import diz from '../dati/dizionario.json';
import { EMOZIONI, FORZE } from './tipi';
import { analizza, normalizza, preparaDizionario, principali, type VoceDizionario } from './analisi';

const R = preparaDizionario(diz.voci as VoceDizionario[]);

describe('normalizzazione', () => {
  it('toglie accenti e apostrofi tipografici', () => {
    expect(normalizza('Perché L’HO fatto? Così!')).toBe("perche l'ho fatto? cosi!");
  });
});

describe('dizionario', () => {
  it('riconosce parole ed espressioni', () => {
    const a = analizza('Oggi ho aiutato la mia vicina ed ero felice.', R);
    expect(a.forze.gentilezza).toBeGreaterThan(0);
    expect(a.emozioni.gioia).toBeGreaterThan(0);
  });

  it("l'espressione lunga vince sulla parola singola", () => {
    const a = analizza('Ho avuto il coraggio di parlare.', R);
    expect(a.forze.coraggio).toBe(3); // non 3 + 2
  });

  it('i finali con * funzionano', () => {
    expect(analizza('Ero spaventata.', R).emozioni.paura).toBe(3);
    expect(analizza('Ero spaventatissima.', R).emozioni.paura).toBe(3);
  });

  it("non riconosce pezzi dentro altre parole", () => {
    const a = analizza('Ho visto un ombrellone.', R); // "bell*" non deve scattare
    expect(a.forze.bellezza).toBeUndefined();
  });

  it('ogni voce usa solo forze ed emozioni esistenti, senza doppioni', () => {
    const viste = new Set<string>();
    for (const v of diz.voci as VoceDizionario[]) {
      expect(viste.has(v.p), `doppione: ${v.p}`).toBe(false);
      viste.add(v.p);
      for (const k of Object.keys(v.f ?? {})) expect(FORZE, v.p).toContain(k);
      for (const k of Object.keys(v.e ?? {})) expect(EMOZIONI, v.p).toContain(k);
    }
  });

  it('le voci nuove non scattano su parole simili', () => {
    const a = analizza('Ho fatto un puzzle e ho mangiato al buffet.', R); // "puzza", "buffo"
    expect(a.emozioni).toEqual({});
    expect(a.forze).toEqual({});
  });
});

describe('negazioni', () => {
  it('"non ero felice" non conta come gioia', () => {
    expect(analizza('Non ero felice.', R).emozioni.gioia).toBeUndefined();
  });
  it('"non ho avuto paura" diventa un po\' di coraggio', () => {
    const a = analizza('Non ho avuto paura.', R);
    expect(a.emozioni.paura).toBeUndefined();
    expect(a.forze.coraggio).toBe(1);
  });
});

describe('intensificatori', () => {
  it('"tantissimo" alza, "un po\'" abbassa', () => {
    const forte = analizza('Ero tantissimo arrabbiata.', R).emozioni.rabbia!;
    const base = analizza('Ero arrabbiata.', R).emozioni.rabbia!;
    const piano = analizza("Ero un po' arrabbiata.", R).emozioni.rabbia!;
    expect(forte).toBeGreaterThan(base);
    expect(piano).toBeLessThan(base);
  });
});

describe('regole composte', () => {
  it('paura + azione = coraggio', () => {
    const a = analizza("Avevo paura ma l'ho fatto lo stesso.", R);
    expect(a.emozioni.paura).toBeGreaterThan(0);
    expect(a.forze.coraggio).toBeGreaterThanOrEqual(3);
  });
  it('rabbia + calma = autocontrollo', () => {
    const a = analizza('Ero arrabbiata ma ho respirato e non ho risposto.', R);
    expect(a.forze.autocontrollo).toBeGreaterThanOrEqual(2);
  });
  it('tristezza + parlarne = intelligenza sociale', () => {
    const a = analizza('Ero triste e ne ho parlato con mia sorella.', R);
    expect(a.forze.intelligenza_sociale).toBeGreaterThan(0);
  });
  it('vale anche se "ne ho parlato" è nella frase dopo', () => {
    const a = analizza('Giornata no, ero triste. Però ne ho parlato con mia sorella.', R);
    expect(a.forze.intelligenza_sociale).toBeGreaterThan(0);
  });
});

describe('segnali seri', () => {
  it('riconosce le frasi di malessere serio', () => {
    expect(analizza('Non ce la faccio più.', R).segnaliSeri).toBe(true);
    expect(analizza('Oggi giornata no, ma domani va meglio.', R).segnaliSeri).toBe(false);
  });
});

describe('principali', () => {
  it('ordina e filtra', () => {
    expect(principali({ a: 3, b: 0.5, c: 2 }, 2)).toEqual(['a', 'c']);
  });
});
