// Regole del villaggio: uova, crescita, mestieri, edifici, umore, tempo che passa.
// Tutte le funzioni sono deterministiche (casualità con seme) e testabili.
// Principi: nessun animale muore; la tristezza non si punisce mai.

import regoleJson from '../dati/regole.json';
import storiaJson from '../dati/storia.json';
import { rng } from './caso';
import { aggiungiGiorni, giorniTra } from './date';
import { NOME_SPECIE, NOME_VIRTU, RIASSUNTO_EMOZIONE, RIASSUNTO_FORZA } from './etichette';
import {
  FASI, VIRTU, virtuDi, zeriVirtu,
  type Animale, type Edificio, type Emozione, type Evento, type Fase, type Forza,
  type Punteggi, type Specie, type StatoGioco, type Virtu, type VoceDiario,
} from './tipi';

export const SCHEMA = 1;

interface DefEdificio { tipo: string; nome: string; gestore: string; virtu: Virtu; utentiMinimi: number; dopoNatale?: boolean }
interface Regole {
  specieVirtu: Record<Specie, Virtu>;
  specieDisponibili: Specie[];
  faseMassima: Fase;
  sogliaFase: Record<'giovane' | 'adulto' | 'maestro', number>;
  vociPrimoUovo: number;
  vociAltreUova: number;
  soglieUova: number[];
  maxAnimali: number;
  xpBase: number;
  quotaAltreVirtu: number;
  umore: { iniziale: number; perVoce: number; caloGiorno: number; minimo: number; giorniPerAddormentarsi: number };
  edificio: { giorniLento: number; giorniFermo: number };
  mestieri: Record<Virtu, string[]>;
  mestieriAttivi: string[];
  edifici: DefEdificio[];
}
export const REGOLE = regoleJson as unknown as Regole;

interface Capitolo { id: string; titolo: string; testo: string; condizioni: { giorni?: number; animali?: number; edifici?: number; adulti?: number; voci?: number } }
export const STORIA = storiaJson.capitoli as Capitolo[];

// ---------- utilità ----------

function nuovoId(s: StatoGioco, prefisso: string): string {
  s.contatore += 1;
  return `${prefisso}${s.contatore}`;
}

function casuale(s: StatoGioco): number {
  s.seme = (Math.imul(s.seme ^ 0x9e3779b9, 0x85ebca6b) + 1) >>> 0;
  return rng(s.seme)();
}

export function nomeSpecie(a: Pick<Animale, 'specie' | 'sesso'>): string {
  return NOME_SPECIE[a.specie][a.sesso];
}

/** Accorda le frasi al sesso dell'animale: {o} → a/o, {lo} → la/lo. */
export function accorda(testo: string, a: Pick<Animale, 'sesso'>): string {
  const f = a.sesso === 'f';
  return testo.replaceAll('{o}', f ? 'a' : 'o').replaceAll('{lo}', f ? 'la' : 'lo');
}

/** "la volpe" / "il daino" / "lo scoiattolo" */
export function conArticolo(a: Pick<Animale, 'specie' | 'sesso'>): string {
  const n = nomeSpecie(a);
  if (a.sesso === 'f') return 'la ' + n;
  return /^(s[bcdfgklmnpqrtv]|z|gn|ps|x|y)/.test(n) ? 'lo ' + n : 'il ' + n;
}

function evento(s: StatoGioco, data: string, tipo: Evento['tipo'], testo: string, out: Evento[]) {
  const e = { data, tipo, testo };
  s.eventi.push(e);
  if (s.eventi.length > 500) s.eventi.splice(0, s.eventi.length - 500);
  out.push(e);
}

function specieDaVirtu(v: Virtu): Specie | null {
  const sp = (Object.entries(REGOLE.specieVirtu) as [Specie, Virtu][]).find(([, vv]) => vv === v)?.[0];
  return sp && REGOLE.specieDisponibili.includes(sp) ? sp : null;
}

function indiceFase(f: Fase) {
  return FASI.indexOf(f);
}

// ---------- creazione ----------

export function profiloVirtu(profilo: Record<Forza, number>): Record<Virtu, number> {
  const r = zeriVirtu();
  for (const [f, v] of Object.entries(profilo) as [Forza, number][]) r[virtuDi(f)] += v;
  return r;
}

/** Specie del primo uovo: la virtù più forte nel questionario, tra le specie disponibili. */
export function speciePrimoUovo(profilo: Record<Forza, number>): Specie {
  const pv = profiloVirtu(profilo);
  const ordinate = [...REGOLE.specieDisponibili].sort((a, b) => pv[REGOLE.specieVirtu[b]] - pv[REGOLE.specieVirtu[a]]);
  return ordinate[0];
}

function nuovoUovo(s: StatoGioco, specie: Specie, data: string, voci: number): Animale {
  const a: Animale = {
    id: nuovoId(s, 'a'),
    nome: '',
    specie,
    sesso: casuale(s) < 0.5 ? 'f' : 'm',
    fase: 'uovo',
    xp: 0,
    nutrimento: zeriVirtu(),
    umore: REGOLE.umore.iniziale,
    addormentato: false,
    mestiere: null,
    vociPerSchiudersi: voci,
    nato: data,
    ricordi: [],
    genitori: [],
  };
  s.animali.push(a);
  return a;
}

export function nuovoStato(data: string, profilo: Record<Forza, number>, nomeVillaggio: string, seme: number): StatoGioco {
  const s: StatoGioco = {
    versioneSchema: SCHEMA,
    inizio: data,
    ultimoAccesso: data,
    nomeVillaggio,
    profilo,
    totaleVirtu: zeriVirtu(),
    ultimoNutrimento: Object.fromEntries(VIRTU.map((v) => [v, null])) as Record<Virtu, string | null>,
    animali: [],
    edifici: [],
    eventi: [],
    capitoli: [],
    numeroVoci: 0,
    ultimaVoce: null,
    seme: seme >>> 0,
    contatore: 0,
    ultimoBackupRicordato: null,
  };
  const uovo = nuovoUovo(s, speciePrimoUovo(profilo), data, REGOLE.vociPrimoUovo);
  s.eventi.push({ data, tipo: 'uovo', testo: `Nel bosco è comparso un uovo: dentro c'è ${conArticolo(uovo)}.` });
  return s;
}

// ---------- diario ----------

export function nutrimentoDaVoce(forze: Punteggi<Forza>): Record<Virtu, number> {
  const n = zeriVirtu();
  for (const [f, v] of Object.entries(forze) as [Forza, number][]) if (v > 0) n[virtuDi(f)] += v;
  return n;
}

export function riassunto(forze: Punteggi<Forza>, emozioni: Punteggi<Emozione>, difficile: boolean): string {
  const f = (Object.entries(forze) as [Forza, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
  const e = (Object.entries(emozioni) as [Emozione, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (difficile && f) return `Giada ha avuto una giornata difficile, ma ${RIASSUNTO_FORZA[f]}.`;
  if (difficile) return 'Giada ha avuto una giornata difficile e ce l\'ha raccontata.';
  if (f && e) return `Giada ${RIASSUNTO_FORZA[f]} e ${RIASSUNTO_EMOZIONE[e]}.`;
  if (f) return `Giada ${RIASSUNTO_FORZA[f]}.`;
  if (e) return `Giada ${RIASSUNTO_EMOZIONE[e]}.`;
  return 'Giada ci ha raccontato la sua giornata.';
}

/** Applica una voce confermata. Muta lo stato e restituisce gli eventi nuovi. */
export function applicaVoce(s: StatoGioco, voce: VoceDiario): Evento[] {
  const out: Evento[] = [];
  const data = voce.data;
  const nutr = nutrimentoDaVoce(voce.forze);
  const prima = { ...s.totaleVirtu };
  s.numeroVoci += 1;
  if (!s.ultimaVoce || data > s.ultimaVoce) s.ultimaVoce = data;

  for (const v of VIRTU) {
    s.totaleVirtu[v] += nutr[v];
    if (nutr[v] > 0) s.ultimoNutrimento[v] = data;
  }

  for (const a of s.animali) {
    if (a.addormentato) {
      a.addormentato = false;
      evento(s, data, 'risveglio', `${cap(nomeAnimale(a))} si è svegliat${a.sesso === 'f' ? 'a' : 'o'}: le sei mancata.`, out);
    }
    a.umore = Math.min(100, a.umore + REGOLE.umore.perVoce);

    if (a.fase === 'uovo') {
      a.vociPerSchiudersi -= 1;
      if (a.vociPerSchiudersi <= 0) {
        a.fase = 'cucciolo';
        const f = a.sesso === 'f';
        evento(s, data, 'schiusa', `L'uovo si è schiuso: è nat${f ? 'a' : 'o'} ${conArticolo(a)}! Puoi ${f ? 'darle' : 'dargli'} un nome.`, out);
      }
      continue;
    }

    const propria = REGOLE.specieVirtu[a.specie];
    let xp = REGOLE.xpBase;
    for (const v of VIRTU) {
      const quota = v === propria ? nutr[v] : nutr[v] * REGOLE.quotaAltreVirtu;
      a.nutrimento[v] += quota;
      xp += quota;
    }
    a.xp = Math.round((a.xp + xp) * 10) / 10;
    a.ricordi.push({ data, frase: voce.riassunto });
    if (a.ricordi.length > 60) a.ricordi.shift();
    cresci(s, a, data, out);
  }

  // nuove uova quando una virtù supera una soglia
  for (const v of VIRTU) {
    for (const soglia of REGOLE.soglieUova) {
      if (prima[v] < soglia && s.totaleVirtu[v] >= soglia && s.animali.length < REGOLE.maxAnimali) {
        const sp = specieDaVirtu(v);
        if (!sp) continue;
        const u = nuovoUovo(s, sp, data, REGOLE.vociAltreUova);
        evento(s, data, 'uovo', `Il corvo ha trovato un uovo nuovo: dentro c'è ${conArticolo(u)}.`, out);
      }
    }
  }

  aggiornaEdifici(s, data, out);
  sbloccaStoria(s, data, out);
  return out;
}

function cap(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function nomeAnimale(a: Animale): string {
  return a.nome || conArticolo(a);
}

function cresci(s: StatoGioco, a: Animale, data: string, out: Evento[]) {
  const max = indiceFase(REGOLE.faseMassima);
  const passi: [Fase, number][] = [
    ['giovane', REGOLE.sogliaFase.giovane],
    ['adulto', REGOLE.sogliaFase.adulto],
    ['maestro', REGOLE.sogliaFase.maestro],
  ];
  for (const [fase, soglia] of passi) {
    if (indiceFase(fase) > max) break;
    if (indiceFase(a.fase) < indiceFase(fase) && a.xp >= soglia) {
      a.fase = fase;
      evento(s, data, 'crescita', `${cap(nomeAnimale(a))} è cresciut${a.sesso === 'f' ? 'a' : 'o'}: ora è ${fase === 'giovane' ? 'giovane' : fase}.`, out);
      if (fase === 'adulto' && !a.mestiere) scegliMestiere(s, a, data, out);
    }
  }
}

/** Il mestiere segue il nutrimento ricevuto: la virtù più nutrita con un mestiere disponibile. */
export function scegliMestiere(s: StatoGioco, a: Animale, data: string, out: Evento[]) {
  const ordine = [...VIRTU].sort((x, y) => a.nutrimento[y] - a.nutrimento[x]);
  const giaPresi = new Set(s.animali.map((b) => b.mestiere).filter(Boolean));
  for (const v of ordine) {
    const possibili = REGOLE.mestieri[v].filter((m) => REGOLE.mestieriAttivi.includes(m));
    if (!possibili.length) continue;
    a.mestiere = possibili.find((m) => !giaPresi.has(m)) ?? possibili[0];
    evento(s, data, 'mestiere', `${cap(nomeAnimale(a))} ha scelto un mestiere: ${a.mestiere}.`, out);
    return;
  }
}

// ---------- edifici ----------

export function aggiornaEdifici(s: StatoGioco, data: string, out: Evento[]) {
  const svegli = s.animali.filter((a) => a.fase !== 'uovo');
  for (const def of REGOLE.edifici) {
    if (def.dopoNatale) continue;
    const esiste = s.edifici.find((e) => e.tipo === def.tipo);
    if (!esiste) {
      const gestore = s.animali.find((a) => a.mestiere === def.gestore);
      if (!gestore) continue;
      const utenti = svegli.filter((a) => a.id !== gestore.id).length;
      if (utenti >= def.utentiMinimi) {
        s.edifici.push({ tipo: def.tipo, gestore: gestore.id, stato: 'attivo', virtu: def.virtu, costruito: data });
        evento(s, data, 'edificio', `${cap(nomeAnimale(gestore))} ha aperto ${def.nome.toLowerCase()}!`, out);
      }
      continue;
    }
    const ultimo = s.ultimoNutrimento[def.virtu];
    const giorni = ultimo ? giorniTra(ultimo, data) : giorniTra(esiste.costruito, data);
    const nuovo: Edificio['stato'] =
      giorni >= REGOLE.edificio.giorniFermo ? 'fermo' : giorni >= REGOLE.edificio.giorniLento ? 'lento' : 'attivo';
    if (nuovo !== esiste.stato) {
      const g = s.animali.find((a) => a.id === esiste.gestore);
      const chi = g ? cap(nomeAnimale(g)) : 'Il gestore';
      const virtu = NOME_VIRTU[def.virtu].toLowerCase();
      const testo =
        nuovo === 'attivo'
          ? `${def.nome} è di nuovo pieno di vita.`
          : nuovo === 'lento'
            ? `${def.nome} va più piano. ${chi} dice che servirebbe un po' di ${virtu}.`
            : `${def.nome} si è fermato. ${chi} aspetta che torni un po' di ${virtu}.`;
      esiste.stato = nuovo;
      evento(s, data, 'edificio_stato', testo, out);
    }
  }
}

// ---------- storia ----------

export function sbloccaStoria(s: StatoGioco, data: string, out: Evento[]) {
  const giorni = giorniTra(s.inizio, data);
  const nati = s.animali.filter((a) => a.fase !== 'uovo').length;
  const adulti = s.animali.filter((a) => indiceFase(a.fase) >= indiceFase('adulto')).length;
  const nVoci = s.numeroVoci;
  for (const c of STORIA) {
    if (s.capitoli.includes(c.id)) continue;
    const k = c.condizioni;
    if ((k.giorni ?? 0) > giorni) continue;
    if ((k.animali ?? 0) > nati) continue;
    if ((k.adulti ?? 0) > adulti) continue;
    if ((k.edifici ?? 0) > s.edifici.length) continue;
    if ((k.voci ?? 0) > nVoci) continue;
    s.capitoli.push(c.id);
    evento(s, data, 'storia', `Nuovo capitolo: ${c.titolo}`, out);
  }
}

// ---------- tempo che passa ----------

/**
 * Simula i giorni da ultimoAccesso (escluso) a `fino` (incluso).
 * Restituisce gli eventi per il riepilogo "mentre eri via".
 * Nessuno muore: l'umore scende fino a un minimo e gli animali si addormentano.
 */
export function simula(s: StatoGioco, fino: string): Evento[] {
  const out: Evento[] = [];
  const n = giorniTra(s.ultimoAccesso, fino);
  if (n <= 0) return out;
  for (let i = 1; i <= n; i++) {
    const giorno = aggiungiGiorni(s.ultimoAccesso, i);
    const assenza = giorniTra(s.ultimaVoce ?? s.inizio, giorno);
    for (const a of s.animali) {
      if (a.fase === 'uovo') continue;
      a.umore = Math.max(REGOLE.umore.minimo, a.umore - REGOLE.umore.caloGiorno);
      if (!a.addormentato && assenza >= REGOLE.umore.giorniPerAddormentarsi) {
        a.addormentato = true;
        evento(s, giorno, 'sonno', `${cap(nomeAnimale(a))} si è addormentat${a.sesso === 'f' ? 'a' : 'o'} aspettandoti. Basta una pagina di diario per svegliarl${a.sesso === 'f' ? 'a' : 'o'}.`, out);
      }
    }
    aggiornaEdifici(s, giorno, out);
    sbloccaStoria(s, giorno, out);
  }
  s.ultimoAccesso = fino;
  return out;
}

// ---------- coppie e cuccioli (dopo Natale, logica già pronta) ----------

export function puoFormareCoppia(a: Animale, b: Animale): boolean {
  return a.specie === b.specie && a.sesso !== b.sesso && a.fase !== 'uovo' && indiceFase(a.fase) >= 3 && indiceFase(b.fase) >= 3;
}
