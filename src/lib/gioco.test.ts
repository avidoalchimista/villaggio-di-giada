import { describe, expect, it } from 'vitest';
import { aggiungiGiorni } from './date';
import {
  applicaVoce, controllaRichiesta, costruisci, faiCrescere, insegna, normalizzaStato, nuovoStato, raccogliCastagne, REGOLE, riassunto,
  SCHEMA, simula, speciePrimoUovo,
} from './gioco';
import { meteo } from './meteo';
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
    for (let i = 0; i < 70; i++) {
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
    for (let i = 0; i < 8; i++) {
      applicaVoce(s, voce(d, { coraggio: 2 }));
      d = aggiungiGiorni(d, 1);
    }
    expect(s.animali.some((a) => a.specie === 'tasso')).toBe(true);
  });

  it('crescita lenta: dopo 10 pagine il primo cucciolo è ancora cucciolo', () => {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 10; i++) {
      applicaVoce(s, voce(d, { curiosita: 2, gentilezza: 1 }));
      d = aggiungiGiorni(d, 1);
    }
    expect(s.animali[0].fase).toBe('cucciolo');
  });

  it('mai più di sette abitanti', () => {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 400; i++) {
      applicaVoce(s, voce(d, { coraggio: 3, curiosita: 3, bellezza: 3, gentilezza: 3 }));
      d = aggiungiGiorni(d, 1);
    }
    expect(s.animali.length).toBe(7);
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

describe('ghiande e costruzioni', () => {
  it('si parte senza niente e ogni pagina dà ghiande, anche le giornate difficili', () => {
    const s = partita();
    expect(s.ghiande).toBe(0);
    expect(s.costruzioni).toEqual([]);
    applicaVoce(s, voce(INIZIO, {}, true));
    expect(s.ghiande).toBe(REGOLE.ghiande.perPagina);
    applicaVoce(s, voce(INIZIO, { coraggio: 30 }));
    expect(s.ghiande).toBe(REGOLE.ghiande.perPagina + REGOLE.ghiande.massimoPerPagina);
  });

  it('si costruisce solo con abbastanza ghiande e con i requisiti', () => {
    const s = partita();
    expect(costruisci(s, 'sentiero', INIZIO)).toBeNull();
    s.ghiande = 100;
    expect(costruisci(s, 'lanterne', INIZIO)).toBeNull(); // serve prima il sentiero
    expect(costruisci(s, 'sentiero', INIZIO)?.tipo).toBe('costruzione');
    expect(s.ghiande).toBe(100 - 6);
    expect(costruisci(s, 'sentiero', INIZIO)).toBeNull(); // già fatto
    expect(costruisci(s, 'lanterne', INIZIO)).not.toBeNull();
    expect(costruisci(s, 'mulino', INIZIO)).toBeNull(); // servono 45 pagine
  });

  it('uno stato salvato con la versione 1 viene aggiornato senza perdere niente', () => {
    const s = partita() as unknown as Record<string, unknown>;
    delete s.ghiande;
    delete s.costruzioni;
    s.versioneSchema = 1;
    s.numeroVoci = 4;
    const n = normalizzaStato(s as unknown as StatoGioco);
    expect(n.ghiande).toBe(4 * REGOLE.ghiande.perPagina);
    expect(n.costruzioni).toEqual([]);
    expect(n.versioneSchema).toBe(SCHEMA);
    expect(n.castagneMature).toBe(0);
    expect(n.animali[0].abilita).toEqual([]);
  });
});

describe('vita del villaggio', () => {
  function conCucciolo(): StatoGioco {
    const s = partita();
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    applicaVoce(s, voce(INIZIO, { curiosita: 1 }));
    s.ultimoAccesso = INIZIO;
    return s;
  }

  it('il castagno matura solo nei giorni in cui Giada ha scritto da poco', () => {
    const s = conCucciolo();
    simula(s, aggiungiGiorni(INIZIO, 3));
    expect(s.castagneMature).toBe(3);
    simula(s, aggiungiGiorni(INIZIO, 30));
    expect(s.castagneMature).toBeLessThanOrEqual(REGOLE.castagno.massimo);
    const prima = s.ghiande;
    expect(raccogliCastagne(s)).toBe(s.ghiande - prima);
    expect(s.castagneMature).toBe(0);
  });

  it('si insegna solo dai giovani in su; si impara in qualche giorno, e chi dorme si ferma', () => {
    const s = conCucciolo();
    const a = s.animali[0];
    expect(insegna(s, a.id, 'cantare', INIZIO)).toBeNull(); // è un cucciolo
    a.fase = 'giovane';
    expect(insegna(s, a.id, 'pescare', INIZIO)).toBeNull(); // serve il laghetto
    expect(insegna(s, a.id, 'cantare', INIZIO)).not.toBeNull();
    expect(insegna(s, a.id, 'ballare', INIZIO)).toBeNull(); // sta già imparando
    simula(s, aggiungiGiorni(INIZIO, 2));
    expect(a.abilita).toContain('cantare');
    expect(a.studio).toBeNull();
  });

  it('le richieste arrivano ogni tanto, una alla volta, e soddisfarle regala castagne', () => {
    const s = conCucciolo();
    let giorni = 0;
    while (!s.richiesta && giorni < 30) {
      giorni++;
      applicaVoce(s, voce(aggiungiGiorni(INIZIO, giorni), {}));
      simula(s, aggiungiGiorni(INIZIO, giorni));
    }
    expect(s.richiesta).not.toBeNull();
    // la soddisfo direttamente
    const r = s.richiesta!;
    r.tipo = 'trova';
    const prima = s.ghiande;
    const out: never[] = [];
    controllaRichiesta(s, INIZIO, out, { trova: r.animale });
    expect(s.richiesta).toBeNull();
    expect(s.ghiande).toBe(prima + REGOLE.richieste.premio);
  });

  it('modalità prova: faiCrescere porta tutti avanti di una fase', () => {
    const s = conCucciolo();
    faiCrescere(s, INIZIO);
    expect(s.animali[0].fase).toBe('giovane');
    faiCrescere(s, INIZIO);
    expect(s.animali[0].fase).toBe('adulto');
    expect(s.animali[0].mestiere).not.toBeNull();
  });
});

describe('meteo', () => {
  it('stesso giorno e stessa ora, stesso tempo; non nevica in estate', () => {
    expect(meteo('2026-12-25', 10)).toBe(meteo('2026-12-25', 10));
    for (let g = 1; g <= 31; g++) for (const h of [3, 9, 15, 21]) expect(meteo(`2027-07-${String(g).padStart(2, '0')}`, h)).not.toBe('neve');
  });
  it('in un mese d\'inverno capitano tempi diversi', () => {
    const visti = new Set<string>();
    for (let g = 1; g <= 31; g++) visti.add(meteo(`2026-12-${String(g).padStart(2, '0')}`, 12));
    expect(visti.size).toBeGreaterThan(3);
  });
});

describe('edifici e simulazione', () => {
  function conChiosco(): StatoGioco {
    const s = partita();
    let d = INIZIO;
    for (let i = 0; i < 80; i++) {
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
