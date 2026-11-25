import { describe, expect, it } from 'vitest';
import { applicaVoce, nuovoStato, riassunto } from './gioco';
import { chiSei, consiglio, daChePagina, emozioniCheporto, estratto, paginaDi } from './chiacchiere';
import { zeriForze, type StatoGioco, type VoceDiario } from './tipi';

function voce(id: string, data: string, testo: string, difficile = false): VoceDiario {
  const forze = { gentilezza: 2 };
  const emozioni = { gioia: 2 };
  return { id, data, creata: 0, testo, forze, emozioni, giornataDifficile: difficile, riassunto: riassunto(forze, emozioni, difficile) };
}

function conCucciolo(): { s: StatoGioco; voci: VoceDiario[] } {
  const s = nuovoStato('2026-12-25', { ...zeriForze(), curiosita: 5 }, 'Prova', 42);
  const voci: VoceDiario[] = [];
  for (let i = 0; i < 6 && s.animali[0].fase === 'uovo'; i++) {
    const v = voce('v' + i, `2026-12-${26 + i}`, `Oggi ho riso tantissimo con Marta al parco. Che bella giornata numero ${i}!`);
    voci.push(v);
    applicaVoce(s, v);
  }
  return { s, voci };
}

describe('chiacchiere con un animale', () => {
  it('si ricorda la pagina da cui è nato', () => {
    const { s, voci } = conCucciolo();
    const a = s.animali[0];
    expect(a.fase).toBe('cucciolo');
    expect(a.pagina).toBe(voci[voci.length - 1].id);
    expect(paginaDi(a, voci, s.eventi)?.id).toBe(a.pagina);
    // i villaggi di prima non hanno la pagina salvata: si trova dal giorno della schiusa
    const vecchio = { ...a, pagina: undefined };
    expect(paginaDi(vecchio, voci, s.eventi)?.id).toBe(a.pagina);
    const testo = daChePagina(a, paginaDi(a, voci, s.eventi), '2027-01-10').map((b) => b.testo).join(' ');
    expect(testo).toContain('avevi scritto: «Che bella giornata');
    expect(testo).not.toMatch(/\{o\}/);
  });

  it('non ripete mai una frase seria della pagina', () => {
    expect(estratto('A volte vorrei farla finita. Però oggi ho visto il mare ed era bellissimo.')).toBe('Però oggi ho visto il mare ed era bellissimo.');
    expect(estratto('Voglio morire.')).toBeNull();
  });

  it('racconta di sé e delle sue emozioni', () => {
    const { s } = conCucciolo();
    const a = s.animali[0];
    a.nome = 'Pepe';
    const tutto = [...chiSei(a, '2027-01-10'), ...emozioniCheporto(a)].map((b) => b.testo).join(' ');
    expect(tutto).toContain('Pepe');
    expect(tutto).not.toMatch(/\{o\}|undefined/);
  });

  it('con le frasi di autolesionismo arriva il corvo col discorso serio', () => {
    const { s } = conCucciolo();
    const r = consiglio(s.animali[0], 0, 'Mi viene voglia di farmi del male');
    expect(r.some((b) => b.chi === 'corvo' && b.testo.includes('112'))).toBe(true);
  });

  it('a uno sfogo normale risponde con un consiglio, senza allarmi', () => {
    const { s } = conCucciolo();
    const r = consiglio(s.animali[0], 1, 'Non ce la faccio più con questo lavoro', () => ({ emozioni: { rabbia: 2 }, segnaliSeri: false }));
    expect(r.every((b) => b.chi === 'animale')).toBe(true);
    expect(r[0].testo).toContain('arrabbiata');
  });
});
