import { describe, expect, it } from 'vitest';
import { allargaCase, arredoVuoto } from './arredo';
import { avanzamento, CEPPI, GIORNI_PER_ALBERO, GIORNI_PRIMA_DEL_CASTORO, giorniAllAlbero } from './castoro';
import { aggiungiGiorni } from './date';
import { nuovoStato, simulaGiorniConDiario } from './gioco';
import { defMestiere, MESTIERI } from './mestieri';
import { zeriForze } from './tipi';

const INIZIO = '2026-12-25';
const partita = () => nuovoStato(INIZIO, { ...zeriForze(), curiosita: 5 }, 'Prova', 7);

describe('il castoro', () => {
  it('arriva dopo qualche giorno e lo racconta lui', () => {
    const s = partita();
    const { eventi } = simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + 2);
    expect(s.castoro).toBeTruthy();
    expect(eventi.some((e) => e.tipo === 'castoro' && e.testo.includes('castoro'))).toBe(true);
  });

  it('rosicchia un albero a settimana, e ogni volta lo dice a Giada', () => {
    const s = partita();
    const giorni = GIORNI_PRIMA_DEL_CASTORO + GIORNI_PER_ALBERO * 3 + 1;
    const { eventi } = simulaGiorniConDiario(s, INIZIO, giorni);
    const c = s.castoro!;
    expect(c.totale).toBe(3);
    expect(eventi.filter((e) => e.tipo === 'castoro' && e.testo.includes('TONF'))).toHaveLength(3);
    // a metà settimana l'albero è rosicchiato a metà
    const oggi = aggiungiGiorni(INIZIO, giorni);
    expect(avanzamento(c, oggi)).toBeGreaterThan(0);
    expect(avanzamento(c, oggi)).toBeLessThan(1);
    expect(giorniAllAlbero(c, oggi)).toBeGreaterThanOrEqual(1);
  });

  it('non tocca mai gli alberi del viale e il bosco ricresce (restano pochi ceppi)', () => {
    const s = partita();
    simulaGiorniConDiario(s, INIZIO, GIORNI_PRIMA_DEL_CASTORO + GIORNI_PER_ALBERO * 12);
    const c = s.castoro!;
    expect(c.totale).toBe(12);
    expect(c.tagliati.length).toBe(CEPPI);
    for (const a of [...c.tagliati, c.albero]) expect(Math.abs(((a - 90 + 540) % 360) - 180)).toBeGreaterThanOrEqual(35);
  });
});

describe('le postazioni di lavoro', () => {
  it('ogni mestiere ha la sua postazione', () => {
    for (const m of MESTIERI) expect(m.postazione, m.id).toBeTruthy();
    expect(defMestiere('artigiano')?.postazione).toBe('banco-falegname');
    expect(defMestiere('fornaio')?.postazione).toBe('madia');
    expect(defMestiere('fabbro')?.postazione).toBe('incudine');
    expect(defMestiere('sarto')?.postazione).toBe('macchina-cucire');
  });

  it('le case troppo vicine si allargano, quelle lontane restano dove sono', () => {
    const a = arredoVuoto();
    a.posti['b:1'] = { x: 0, z: -10, r: 0 };
    a.posti['b:2'] = { x: 5, z: -10, r: 0.3 };
    a.posti['b:3'] = { x: -20, z: 0, r: 1 };
    a.posti['castagno'] = { x: 0, z: -9, r: 0 };
    expect(allargaCase(a)).toBe(2);
    const d = Math.hypot(a.posti['b:1'].x - a.posti['b:2'].x, a.posti['b:1'].z - a.posti['b:2'].z);
    expect(d).toBeGreaterThanOrEqual(7.95);
    expect(a.posti['b:3']).toEqual({ x: -20, z: 0, r: 1 });
    expect(a.posti['castagno']).toEqual({ x: 0, z: -9, r: 0 });
    expect(a.posti['b:2'].r).toBe(0.3); // girata da Giada: resta girata
  });
});
