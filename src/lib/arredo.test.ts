import { describe, expect, it } from 'vitest';
import {
  compraSemi, dipingiSentiero, fasePianta, giorniAllaFioritura, metteVia, nuovaAiuola, nuovoOggetto, pianta, PREZZI, sposta, togliNatura,
} from './arredo';
import { aggiungiGiorni } from './date';
import { emozioneDellaPagina, normalizzaStato, nuovoStato } from './gioco';
import { postiCase } from '../scena/scena';
import { zeriForze } from './tipi';

const OGGI = '2026-12-25';
const partita = () => {
  const s = nuovoStato(OGGI, zeriForze(), 'Prova', 7);
  s.ghiande = 100;
  return s;
};

describe('arredo', () => {
  it('le aiuole costano castagne e i semi crescono nel tempo', () => {
    const s = partita();
    const ai = nuovaAiuola(s, 2, 3)!;
    expect(s.ghiande).toBe(100 - PREZZI.aiuola);
    expect(pianta(s, ai.id, 0, 'girasole', OGGI)).toBe(false); // senza semi no
    expect(compraSemi(s, 'girasole')).toBe(true);
    expect(pianta(s, ai.id, 0, 'girasole', OGGI)).toBe(true);
    const p = ai.piante[0]!;
    expect(fasePianta(p, OGGI)).toBe(0);
    expect(fasePianta(p, aggiungiGiorni(OGGI, 1))).toBe(1);
    expect(fasePianta(p, aggiungiGiorni(OGGI, 4))).toBe(2);
    expect(fasePianta(p, aggiungiGiorni(OGGI, 6))).toBe(3);
    expect(giorniAllaFioritura(p, aggiungiGiorni(OGGI, 2))).toBe(4);
    expect(s.arredo!.semi.girasole).toBeUndefined();
  });

  it('mettere via un\'aiuola restituisce i semi non ancora spuntati', () => {
    const s = partita();
    const ai = nuovaAiuola(s, 0, 0)!;
    compraSemi(s, 'margherita');
    pianta(s, ai.id, 1, 'margherita', OGGI);
    metteVia(s, 'a:' + ai.id, OGGI);
    expect(s.arredo!.aiuole).toHaveLength(0);
    expect(s.arredo!.semi.margherita).toBe(1);
  });

  it("l'accetta costa e senza castagne non si abbatte", () => {
    const s = partita();
    s.ghiande = 2;
    expect(togliNatura(s, 5, 5, PREZZI.albero)).toBe(false);
    expect(togliNatura(s, 5, 5, PREZZI.cespuglio)).toBe(true);
    expect(s.arredo!.tolti).toEqual([[5, 5]]);
  });

  it('spostare mette le cose sulla griglia da mezzo metro', () => {
    const s = partita();
    sposta(s, 'c:panchina', { x: 1.27, z: -3.8, r: 0.5 });
    expect(s.arredo!.posti['c:panchina']).toEqual({ x: 1.5, z: -4, r: 0.5 });
    const o = nuovoOggetto(s, 'cartello', 0, 0, 'Al laghetto')!;
    sposta(s, 'o:' + o.id, { x: 3.1, z: 2, r: 0 });
    expect(s.arredo!.oggetti[0].x).toBe(3);
  });

  it('il sentiero si disegna e si cancella; quello comprato fa da base', () => {
    const s = partita();
    s.costruzioni.push({ id: 'sentiero', data: OGGI });
    expect(dipingiSentiero(s, 6, 6, 3)).toBe(true);
    const sent = s.arredo!.sentiero!;
    expect(Object.values(sent)).toContain(1); // anello di base
    expect(sent['12,12']).toBe(3);
    dipingiSentiero(s, 6, 6, 0);
    expect(sent['12,12']).toBeUndefined();
  });

  it('i salvataggi vecchi ricevono un arredo vuoto', () => {
    const s = partita();
    delete s.arredo;
    expect(normalizzaStato(s).arredo?.oggetti).toEqual([]);
  });

  it('la casa prende l\'emozione più forte della pagina', () => {
    expect(emozioneDellaPagina({ emozioni: { gioia: 1, paura: 3 } }, { id: 'a1' })).toBe('paura');
    expect(['gioia', 'fiducia', 'attesa', 'sorpresa']).toContain(emozioneDellaPagina(null, { id: 'a1' }));
  });

  it('le case sono distanti almeno 8 metri (con la postazione di lavoro) e lasciano libero il viale', () => {
    for (const n of [1, 4, 8, 12]) {
      const p = postiCase(n, 22);
      expect(p).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        const [x, z] = p[i];
        expect(z < 0 || Math.abs(x) > 4).toBe(true); // mai davanti sul viale
        for (let j = 0; j < i; j++) expect(Math.hypot(x - p[j][0], z - p[j][1])).toBeGreaterThan(7.9);
      }
    }
  });
});
