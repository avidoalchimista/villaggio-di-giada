import { describe, expect, it } from 'vitest';
import { aggiungiGiorni } from './date';
import { applicaVoce, nuovoStato, REGOLE, riassunto, simula, speciePrimoUovo } from './gioco';
import { zeriForze, type Forza, type Punteggi, type StatoGioco, type VoceDiario } from './tipi';

const INIZIO = '2026-12-25';

function profilo(f: Punteggi<Forza>) {
  return { ...zeriForze(), ...f };
}

function voce(data: string, forze: Punteggi<Forza>, difficile = false): VoceDiario {
  return { id: data + Math.random(), data, creata: 0, testo: '', forze, emozioni: {}, giornataDifficile: difficile, riassunto: riassunto(forze, {}, difficile) };
}

function partita(): StatoGioco {
  return nuovoStato(INIZIO, profilo({ curiosita: 5 }), 'Prova', 42);
}

describe('inizio', () => {
  it('il primo uovo segue il questionario', () => {
    expect(speciePrimoUovo(profilo({ coraggio: 5 }))).toBe('tasso');
    expect(speciePrimoUovo(profilo({ bellezza: 5 }))).toBe('daino');
    expect(speciePrimoUovo(profilo({ curiosita: 5 }))).toBe('volpe');
  });

  it("l'uovo si schiude dopo le prime voci", () => {
    const s = partita();
    expect(s.animali[0].fase).toBe('uovo');
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    expect(s.animali[0].fase).toBe('uovo');
    const ev = applicaVoce(s, voce(aggiungiGiorni(INIZIO, 1), { curiosita: 1 }));
    expect(s.animali[0].fase).toBe('cucciolo');
    expect(ev.some((e) => e.tipo === 'schiusa')).toBe(true);
  });

  it('stesso seme, stesso risultato', () => {
    const a = partita();
    const b = partita();
    expect(a.animali[0].sesso).toBe(b.animali[0].sesso);
  });
});

describe('crescita', () => {
  it('cresce fino ad adulto e sceglie un mestiere coerente col nutrimento', () => {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 25; i++) {
      applicaVoce(s, voce(d, { gentilezza: 3 }));
      d = aggiungiGiorni(d, 1);
    }
    const volpe = s.animali[0];
    expect(volpe.fase).toBe('adulto');
    expect(volpe.mestiere).toBe('cuoco'); // nutrita soprattutto di umanità
  });

  it('non supera la fase massima della versione di Natale', () => {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 80; i++) {
      applicaVoce(s, voce(d, { curiosita: 5 }));
      d = aggiungiGiorni(d, 1);
    }
    expect(s.animali.every((a) => a.fase !== 'maestro')).toBe(true);
  });

  it('una virtù nutrita fa comparire nuove uova della sua specie', () => {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 5; i++) {
      applicaVoce(s, voce(d, { coraggio: 2 }));
      d = aggiungiGiorni(d, 1);
    }
    expect(s.animali.some((a) => a.specie === 'tasso')).toBe(true);
  });
});

describe('principi', () => {
  it('la giornata difficile non toglie niente', () => {
    const s = partita();
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    applicaVoce(s, voce(aggiungiGiorni(INIZIO, 1), { curiosita: 1 }));
    const prima = { xp: s.animali[0].xp, umore: s.animali[0].umore };
    applicaVoce(s, voce(aggiungiGiorni(INIZIO, 2), {}, true));
    expect(s.animali[0].xp).toBeGreaterThanOrEqual(prima.xp);
    expect(s.animali[0].umore).toBeGreaterThanOrEqual(prima.umore);
  });

  it('nessuno muore: dopo un anno di assenza tutti ci sono, addormentati, e si risvegliano', () => {
    const s = partita();
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    const n = s.animali.length;
    const ev = simula(s, aggiungiGiorni(INIZIO, 365));
    expect(s.animali.length).toBe(n);
    expect(s.animali.every((a) => a.fase === 'uovo' || a.addormentato)).toBe(true);
    expect(s.animali.every((a) => a.umore >= REGOLE.umore.minimo)).toBe(true);
    expect(ev.some((e) => e.tipo === 'sonno')).toBe(true);
    const ev2 = applicaVoce(s, voce(aggiungiGiorni(INIZIO, 365), { amore: 1 }));
    expect(s.animali.every((a) => !a.addormentato)).toBe(true);
    expect(ev2.some((e) => e.tipo === 'risveglio')).toBe(true);
  });
});

describe('edifici e simulazione', () => {
  function conChiosco(): StatoGioco {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 25; i++) {
      applicaVoce(s, voce(d, { gentilezza: 3, coraggio: 1 }));
      d = aggiungiGiorni(d, 1);
    }
    s.ultimoAccesso = aggiungiGiorni(d, -1);
    return s;
  }

  it('il chiosco apre quando c\'è un cuoco e almeno un cliente', () => {
    const s = conChiosco();
    expect(s.edifici.find((e) => e.tipo === 'chiosco')?.stato).toBe('attivo');
  });

  it('senza umanità il chiosco rallenta e poi si ferma; con una voce riparte', () => {
    const s = conChiosco();
    const base = s.ultimoAccesso;
    simula(s, aggiungiGiorni(base, REGOLE.edificio.giorniLento + 1));
    expect(s.edifici[0].stato).toBe('lento');
    simula(s, aggiungiGiorni(base, REGOLE.edificio.giorniFermo + 1));
    expect(s.edifici[0].stato).toBe('fermo');
    applicaVoce(s, voce(s.ultimoAccesso, { gentilezza: 2 }));
    expect(s.edifici[0].stato).toBe('attivo');
  });

  it('la simulazione è deterministica', () => {
    const a = conChiosco();
    const b = conChiosco();
    // gli id delle voci sono casuali ma non entrano nello stato
    simula(a, aggiungiGiorni(a.ultimoAccesso, 40));
    simula(b, aggiungiGiorni(b.ultimoAccesso, 40));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sblocca i capitoli della storia', () => {
    const s = conChiosco();
    expect(s.capitoli).toContain('c1');
    expect(s.capitoli).toContain('c3');
  });
});
