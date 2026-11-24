import { describe, expect, it } from 'vitest';
import {
  compraSemi, dipingiSentiero, fasePianta, giorniAllaFioritura, metteVia, nuovaAiuola, nuovoOggetto, pianta, PREZZI, sposta, togliNatura,
  altezzaTerreno, arredoDi, arredoVuoto, conAcqua, FILA, GIORNI_RICRESCITA, LIVELLO_ACQUA, nuovaFila, palata, pezziFila, togliAcqua, toltoAncora, versaAcqua,
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

describe('la pala e gli alberi abbattuti', () => {
  const stato = () => ({ ghiande: 10, arredo: arredoVuoto() }) as unknown as Parameters<typeof palata>[0];

  it('scavare fa una buca (asciutta: l\'acqua si versa a parte) e costa una castagna a palata', () => {
    const s = stato();
    for (let k = 0; k < 3; k++) palata(s, 4, 4, 'scava');
    expect(s.ghiande).toBe(7);
    expect(altezzaTerreno(s.arredo!.terreno, 4, 4)).toBeLessThan(LIVELLO_ACQUA);
    expect(altezzaTerreno(s.arredo!.terreno, 8, 8)).toBe(0);
  });

  it('alzare fa una montagnola, spianare la riporta giù gratis', () => {
    const s = stato();
    for (let k = 0; k < 5; k++) palata(s, -3, 2, 'alza');
    expect(altezzaTerreno(s.arredo!.terreno, -3, 2)).toBeGreaterThan(0.5);
    const g = s.ghiande;
    for (let k = 0; k < 20; k++) palata(s, -3, 2, 'spiana');
    expect(s.ghiande).toBe(g);
    expect(Math.abs(altezzaTerreno(s.arredo!.terreno, -3, 2))).toBeLessThan(0.05);
  });

  it('non si scava dove non è libero, né senza castagne', () => {
    const s = stato();
    expect(palata(s, 0, 0, 'scava', () => false)).toBe(false);
    s.ghiande = 0;
    expect(palata(s, 0, 0, 'scava')).toBe(false);
  });

  it("dove è stato abbattuto un albero resta libero a lungo, poi la natura torna", () => {
    expect(toltoAncora([1, 2, '2026-01-01'], '2026-03-01')).toBe(true);
    expect(toltoAncora([1, 2, '2026-01-01'], aggiungiGiorni('2026-01-01', GIORNI_RICRESCITA + 1))).toBe(false);
    expect(toltoAncora([1, 2], '2030-01-01')).toBe(true); // quelli di prima restano liberi per sempre
  });
});

describe("l'acqua nelle buche e le cose in fila", () => {
  const stato = () => ({ ghiande: 50, contatore: 0, arredo: arredoVuoto(), costruzioni: [] }) as unknown as Parameters<typeof palata>[0];

  it('la pala fa solo una buca asciutta; versando l\'acqua si riempie tutta la buca, e si può togliere', () => {
    const s = stato();
    for (let k = 0; k < 3; k++) palata(s, 4, 4, 'scava');
    expect(conAcqua(s.arredo, 4, 4)).toBe(false);
    expect(versaAcqua(s, 10, 10)).toBe(0); // lì non c'è una buca
    const n = versaAcqua(s, 4.3, 4);
    expect(n).toBeGreaterThan(4);
    expect(conAcqua(s.arredo, 4, 4)).toBe(true);
    expect(conAcqua(s.arredo, 7, 4)).toBe(false);
    expect(versaAcqua(s, 4, 4)).toBe(0); // già piena
    expect(togliAcqua(s, 4, 4)).toBe(n);
    expect(conAcqua(s.arredo, 4, 4)).toBe(false);
  });

  it('alzando il terreno dove c\'è acqua, l\'acqua lì se ne va', () => {
    const s = stato();
    for (let k = 0; k < 3; k++) palata(s, 0, 0, 'scava');
    versaAcqua(s, 0, 0);
    for (let k = 0; k < 6; k++) palata(s, 0, 0, 'alza');
    expect(conAcqua(s.arredo, 0, 0)).toBe(false);
  });

  it('i salvataggi con i laghetti scavati prima tengono la loro acqua', () => {
    const s = stato();
    for (let k = 0; k < 3; k++) palata(s, 2, 2, 'scava');
    delete s.arredo!.acqua;
    expect(conAcqua(arredoDi(s), 2, 2)).toBe(true);
  });

  it('trascinando si mettono tanti pezzi in fila, girati lungo la fila, finché bastano le castagne', () => {
    const pezzi = pezziFila('recinto', 0, 0, 8, 0);
    expect(pezzi).toHaveLength(4);
    expect(pezzi[0]).toMatchObject({ x: 1, z: 0, r: 0 });
    expect(pezzi[3].x).toBe(7);
    const verticale = pezziFila('recinto', 0, 0, 0, 4);
    expect(Math.abs(Math.cos(verticale[0].r))).toBeLessThan(1e-9); // girati di 90°
    expect(pezziFila('siepe', 1, 1, 1.2, 1, 0.5)).toEqual([{ x: 1, z: 1, r: 0.5 }]); // un tocco: un pezzo solo
    const s = stato();
    s.ghiande = 5;
    const messi = nuovaFila(s, 'recinto', pezzi);
    expect(messi).toHaveLength(2);
    expect(s.ghiande).toBe(1);
    expect(s.arredo!.oggetti.map((o) => o.tipo)).toEqual(['recinto', 'recinto']);
    expect(FILA.lampione.costo).toBeGreaterThan(FILA.paletti.costo);
  });
});
