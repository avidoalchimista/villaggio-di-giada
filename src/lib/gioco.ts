// Regole del villaggio: uova, crescita, mestieri, edifici, umore, tempo che passa.
// Tutte le funzioni sono deterministiche (casualità con seme) e testabili.
// Principi: nessun animale muore; la tristezza non si punisce mai.

import regoleJson from '../dati/regole.json';
import storiaJson from '../dati/storia.json';
import { arredoDi, arredoVuoto } from './arredo';
import { rng } from './caso';
import { aggiornaGuardaroba } from './vestiti';
import { defMestiere, nomeMestiere, scegliTra, virtuMestiere } from './mestieri';
import { scegliCarattere } from './carattere';
import { aggiungiGiorni, giorniTra } from './date';
import { NOME_SPECIE, NOME_VIRTU, RIASSUNTO_EMOZIONE, RIASSUNTO_FORZA } from './etichette';
import {
  EMOZIONI, FASI, FORZE, VIRTU, virtuDi, zeriVirtu,
  type Animale, type Edificio, type Emozione, type Evento, type Fase, type Forza,
  type Aspetto, type Punteggi, type Richiesta, type Specie, type StatoGioco, type Virtu, type VoceDiario,
} from './tipi';

export const SCHEMA = 5;

/** Segni particolari: nel villaggio non ce ne sono mai due uguali. */
export const TRATTI = [
  'orecchio piegato', 'occhi di due colori', 'ciuffo ribelle', 'macchia a cuore', 'lentiggini', 'stellina in fronte',
  'calzini bianchi', 'coda extra folta', 'fiocco rosso', 'bandana blu', 'occhiali tondi', 'collana di bacche',
  'cappellino di foglia', 'campanellino', 'macchia sull\'occhio', 'punta della coda scura',
  'nasino a cuore', 'fiore all\'orecchio', 'corona di margherite', 'sciarpa a righe', 'baffi lunghi', 'dentino sporgente',
  'neo sulla guancia', 'sopracciglia folte', 'zainetto', 'nastro sulla coda', 'una zampa bianca', 'pancia a pois',
  'orecchino d\'oro', 'ghianda al collo', 'cappellino a fungo', 'striscia sul dorso',
] as const;
export const NUMERO_MANTI = 4;
export const NOME_MANTO: Record<Specie, string[]> = {
  volpe: ['rossa', 'dorata', 'argentata', 'bruciata'],
  daino: ['nocciola', 'fulvo', 'chiaro', 'cioccolato'],
  tasso: ['grigio', 'miele', 'scuro', 'quasi bianco'],
  riccio: ['sabbia', 'castano', 'biondo', 'scuro'],
  scoiattolo: ['rosso', 'grigio', 'nero', 'dorato'],
  lepre: ['grigia', 'sabbia', 'bianca', 'bruna'],
};

export interface DefAbilita { id: string; nome: string; giorni: number; simbolo: string; frase: string; richiede?: string; luogo?: string }

export interface DefCostruzione { id: string; nome: string; descrizione: string; costo: number; richiede?: string; pagine?: number }

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
  edifici: DefEdificio[];
  ghiande: { perPagina: number; perPuntoForza: number; massimoPerPagina: number };
  costruzioni: DefCostruzione[];
  castagno: { perGiorno: number; massimo: number; giorniSenzaDiario: number };
  richieste: { probabilitaAlGiorno: number; durataGiorni: number; premio: number };
  abilita: DefAbilita[];
}
export const REGOLE = regoleJson as unknown as Regole;

export interface Capitolo { id: string; titolo: string; testo: string; condizioni: { giorni?: number; animali?: number; edifici?: number; adulti?: number; voci?: number } }
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
  // volpe e lepre sono femminili anche per i maschi: "la volpe", non "il volpe"
  if (a.sesso === 'f' || n === NOME_SPECIE[a.specie].f) return 'la ' + n;
  return /^(s[bcdfgklmnpqrtv]|z|gn|ps|x|y)/.test(n) ? 'lo ' + n : 'il ' + n;
}

/** Gli eventi importanti che il villaggio mostra in primo piano appena Giada guarda la radura. */
const SORPRESE: Evento['tipo'][] = ['uovo', 'schiusa', 'crescita', 'mestiere', 'edificio', 'storia', 'abilita'];

function evento(s: StatoGioco, data: string, tipo: Evento['tipo'], testo: string, out: Evento[], animale?: string) {
  const e: Evento = animale ? { data, tipo, testo, animale } : { data, tipo, testo };
  s.eventi.push(e);
  if (s.eventi.length > 500) s.eventi.splice(0, s.eventi.length - 500);
  out.push(e);
  // resta "da vedere" finché non viene mostrato (anche se l'app si chiude prima)
  if (SORPRESE.includes(tipo) && (animale || tipo === 'storia')) {
    s.sorprese ??= [];
    s.sorprese.push(e);
    if (s.sorprese.length > 12) s.sorprese.splice(0, s.sorprese.length - 12);
  }
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

/**
 * Aspetto di un nuovo animale: mantello diverso dagli altri della sua specie,
 * segno particolare diverso da quello di tutti gli altri abitanti, corporatura, occhi e orecchie suoi.
 */
export function nuovoAspetto(s: StatoGioco, specie: Specie, sesso: 'f' | 'm', escludi?: Animale): Aspetto {
  const altri = s.animali.filter((x) => x !== escludi && x.aspetto);
  const mantiUsati = altri.filter((x) => x.specie === specie).map((x) => x.aspetto.manto);
  const mantiLiberi = Array.from({ length: NUMERO_MANTI }, (_, i) => i).filter((i) => !mantiUsati.includes(i));
  const trattiUsati = altri.map((x) => x.aspetto.tratto);
  const trattiLiberi = TRATTI.filter((t) => !trattiUsati.includes(t));
  const pesca = <T,>(l: readonly T[], tutti: readonly T[]) => (l.length ? l : tutti)[Math.floor(casuale(s) * (l.length || tutti.length))];
  return {
    manto: pesca(mantiLiberi, [0, 1, 2, 3]),
    tratto: pesca(trattiLiberi, TRATTI),
    forma: casuale(s) * 2 - 1,
    occhi: casuale(s),
    orecchie: casuale(s),
    taglia: (0.92 + casuale(s) * 0.16) * (sesso === 'm' ? 1.04 : 0.96),
    lato: casuale(s) < 0.5 ? -1 : 1,
  };
}

function nuovoUovo(s: StatoGioco, specie: Specie, data: string, voci: number): Animale {
  const sesso = casuale(s) < 0.5 ? 'f' : 'm';
  const a: Animale = {
    id: nuovoId(s, 'a'),
    nome: '',
    specie,
    sesso,
    aspetto: nuovoAspetto(s, specie, sesso),
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
    abilita: [],
    studio: null,
  };
  a.carattere = scegliCarattere(s, a);
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
    ghiande: 0,
    costruzioni: [],
    castagneMature: 0,
    richiesta: null,
    seme: seme >>> 0,
    contatore: 0,
    ultimoBackupRicordato: null,
    arredo: arredoVuoto(),
    sorprese: [],
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
  const g = ghiandeDaVoce(voce.forze);
  s.ghiande += g;
  evento(s, data, 'ghiande', `Gli animali hanno raccolto ${g} castagne.`, out);
  controllaRichiesta(s, data, out, { voce });

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
        a.emozione = emozioneDellaPagina(voce, a);
        const f = a.sesso === 'f';
        evento(s, data, 'schiusa', `L'uovo si è schiuso: è nat${f ? 'a' : 'o'} ${conArticolo(a)}! Puoi ${f ? 'darle' : 'dargli'} un nome.`, out, a.id);
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
        evento(s, data, 'uovo', `Il corvo ha trovato un uovo nuovo: dentro c'è ${conArticolo(u)}.`, out, u.id);
      }
    }
  }

  aggiornaEdifici(s, data, out);
  sbloccaStoria(s, data, out);
  return out;
}

/** L'emozione più forte della pagina (se non ce n'è nessuna, una tranquilla che dipende dall'animale). */
export function emozioneDellaPagina(voce: Pick<VoceDiario, 'emozioni'> | null, a: Pick<Animale, 'id'>): Emozione {
  const lista = Object.entries(voce?.emozioni ?? {}).filter(([, v]) => (v ?? 0) > 0).sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0));
  if (lista.length) return lista[0][0] as Emozione;
  const tranquille: Emozione[] = ['gioia', 'fiducia', 'attesa', 'sorpresa'];
  let h = 0;
  for (const c of a.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tranquille[h % tranquille.length];
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
      evento(s, data, 'crescita', `${cap(nomeAnimale(a))} è cresciut${a.sesso === 'f' ? 'a' : 'o'}: ora è ${fase === 'giovane' ? 'giovane' : fase}.`, out, a.id);
      if (fase === 'adulto' && !a.mestiere) scegliMestiere(s, a, data, out);
    }
  }
  // crescendo si fa da solo qualcosa da mettersi, secondo il suo carattere
  const f = a.sesso === 'f';
  for (const k of aggiornaGuardaroba(a)) {
    evento(s, data, 'crescita', `${cap(nomeAnimale(a))} si è fatt${f ? 'a' : 'o'} da sol${f ? 'a' : 'o'} ${k.nome}.`, out);
  }
}

/**
 * Il mestiere segue il nutrimento ricevuto: la virtù più nutrita sceglie la famiglia di mestieri
 * (vedi mestieri.ts), e dentro ognuno fa il suo, diverso da quello degli altri.
 */
export function scegliMestiere(s: StatoGioco, a: Animale, data: string, out: Evento[]) {
  const ordine = [...VIRTU].sort((x, y) => a.nutrimento[y] - a.nutrimento[x]);
  const giaPresi = new Set(s.animali.map((b) => b.mestiere).filter((m): m is string => !!m));
  for (const v of ordine) {
    const m = scegliTra(a, v, giaPresi);
    if (!m) continue;
    a.mestiere = m;
    const d = defMestiere(m)!;
    evento(s, data, 'mestiere', `${cap(nomeAnimale(a))} ha scelto un mestiere: fa ${a.sesso === 'f' ? "la" : "il"} ${nomeMestiere(a)} e ${d.cosa}.`, out, a.id);
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
      // lo apre chi fa quel mestiere, o un mestiere della stessa famiglia (umanità per il chiosco...)
      const gestore = s.animali.find((a) => a.mestiere === def.gestore) ?? s.animali.find((a) => virtuMestiere(a.mestiere) === def.virtu);
      if (!gestore) continue;
      const utenti = svegli.filter((a) => a.id !== gestore.id).length;
      if (utenti >= def.utentiMinimi) {
        s.edifici.push({ tipo: def.tipo, gestore: gestore.id, stato: 'attivo', virtu: def.virtu, costruito: data });
        evento(s, data, 'edificio', `${cap(nomeAnimale(gestore))} ha aperto ${def.nome.toLowerCase()}!`, out, gestore.id);
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

export interface Requisito { chiave: keyof Capitolo['condizioni']; testo: string; ora: number; serve: number }

/** Cosa manca per sbloccare un capitolo: una riga per ogni condizione, con a che punto si è. */
export function requisitiCapitolo(s: StatoGioco, c: Capitolo, data: string): Requisito[] {
  const ora: Record<keyof Capitolo['condizioni'], number> = {
    giorni: giorniTra(s.inizio, data),
    animali: s.animali.filter((a) => a.fase !== 'uovo').length,
    adulti: s.animali.filter((a) => indiceFase(a.fase) >= indiceFase('adulto')).length,
    edifici: s.edifici.length,
    voci: s.numeroVoci,
  };
  const testi: Record<keyof Capitolo['condizioni'], (n: number) => string> = {
    giorni: (n) => `${n} giorni nel bosco`,
    animali: (n) => (n === 1 ? 'Il primo animale nato' : `${n} animali nati`),
    adulti: (n) => (n === 1 ? 'Un animale adulto' : `${n} animali adulti`),
    edifici: (n) => (n === 1 ? 'Il primo edificio aperto' : `${n} edifici aperti`),
    voci: (n) => `${n} pagine di diario`,
  };
  return (Object.entries(c.condizioni) as [keyof Capitolo['condizioni'], number][])
    .filter(([, n]) => n > 0)
    .map(([k, n]) => ({ chiave: k, testo: testi[k](n), ora: Math.min(ora[k], n), serve: n }));
}

export function sbloccaStoria(s: StatoGioco, data: string, out: Evento[]) {
  for (const c of STORIA) {
    if (s.capitoli.includes(c.id)) continue;
    if (requisitiCapitolo(s, c, data).some((r) => r.ora < r.serve)) continue;
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
    vitaDelGiorno(s, giorno, out);
  }
  s.ultimoAccesso = fino;
  return out;
}

// ---------- ghiande e costruzioni ----------

/** Ogni pagina dà ghiande; un po' di più se ci sono punti di forza. Mai meno per una giornata difficile. */
export function ghiandeDaVoce(forze: Punteggi<Forza>): number {
  const r = REGOLE.ghiande;
  const punti = Object.values(forze).reduce((a, b) => a + (b ?? 0), 0);
  return Math.min(r.massimoPerPagina, r.perPagina + Math.floor(punti * r.perPuntoForza));
}

export type StatoCostruzione = 'fatta' | 'pronta' | 'poche_ghiande' | 'bloccata';

export function statoCostruzione(s: StatoGioco, c: DefCostruzione): StatoCostruzione {
  if (s.costruzioni.some((x) => x.id === c.id)) return 'fatta';
  if (c.richiede && !s.costruzioni.some((x) => x.id === c.richiede)) return 'bloccata';
  if (c.pagine && s.numeroVoci < c.pagine) return 'bloccata';
  return s.ghiande >= c.costo ? 'pronta' : 'poche_ghiande';
}

/** Costruisce se ci sono le ghiande e i requisiti. Restituisce l'evento, o null. */
export function costruisci(s: StatoGioco, id: string, data: string): Evento | null {
  const c = REGOLE.costruzioni.find((x) => x.id === id);
  if (!c || statoCostruzione(s, c) !== 'pronta') return null;
  s.ghiande -= c.costo;
  s.costruzioni.push({ id, data });
  const out: Evento[] = [];
  evento(s, data, 'costruzione', `Gli animali hanno costruito ${c.nome.charAt(0).toLowerCase() + c.nome.slice(1)}!`, out);
  controllaRichiesta(s, data, out, { costruzione: id });
  return out[0];
}

// ---------- vita del villaggio: castagno, richieste, abilità ----------

/** Un giorno che passa: il castagno matura, si impara, ogni tanto qualcuno chiede qualcosa. */
export function vitaDelGiorno(s: StatoGioco, giorno: string, out: Evento[]) {
  const svegli = s.animali.filter((a) => a.fase !== 'uovo' && !a.addormentato);
  const vivo = giorniTra(s.ultimaVoce ?? s.inizio, giorno) < REGOLE.castagno.giorniSenzaDiario;

  // il castagno: matura solo finché il villaggio è sveglio (Giada ha scritto da poco)
  if (vivo) {
    const raccoglitori = svegli.filter((a) => a.abilita.includes('raccogliere')).length;
    s.castagneMature = Math.min(REGOLE.castagno.massimo, s.castagneMature + REGOLE.castagno.perGiorno + raccoglitori);
  }

  // chi studia va avanti solo da sveglio; chi dorme riprende quando si sveglia
  for (const a of s.animali) {
    if (!a.studio) continue;
    if (a.addormentato) {
      a.studio.fine = aggiungiGiorni(a.studio.fine, 1);
      continue;
    }
    if (giorno >= a.studio.fine) {
      const def = REGOLE.abilita.find((x) => x.id === a.studio!.id);
      a.abilita.push(a.studio.id);
      a.studio = null;
      if (def) evento(s, giorno, 'abilita', `${cap(nomeAnimale(a))} ${def.frase}!`, out, a.id);
    }
  }

  // richieste: una alla volta, scadono senza conseguenze
  if (s.richiesta && giorno > s.richiesta.scade) s.richiesta = null;
  if (!s.richiesta && vivo && svegli.length && casuale(s) < REGOLE.richieste.probabilitaAlGiorno) {
    s.richiesta = nuovaRichiesta(s, svegli, giorno);
  }
}

function nuovaRichiesta(s: StatoGioco, svegli: Animale[], giorno: string): Richiesta | null {
  const a = svegli[Math.floor(casuale(s) * svegli.length)];
  const scade = aggiungiGiorni(giorno, REGOLE.richieste.durataGiorni);
  const base = { animale: a.id, data: giorno, scade };
  const possibili: Richiesta[] = [];
  if (!a.nome) possibili.push({ ...base, tipo: 'nome' });
  possibili.push({ ...base, tipo: 'trova' });
  possibili.push({ ...base, tipo: 'racconta', virtu: VIRTU[Math.floor(casuale(s) * VIRTU.length)] });
  const daFare = REGOLE.costruzioni.find((c) => statoCostruzione(s, c) === 'pronta' || statoCostruzione(s, c) === 'poche_ghiande');
  if (daFare) possibili.push({ ...base, tipo: 'costruisci', costruzione: daFare.id });
  if (a.fase !== 'cucciolo' && !a.studio && abilitaPossibili(s, a).length) possibili.push({ ...base, tipo: 'insegna' });
  return possibili[Math.floor(casuale(s) * possibili.length)];
}

/** Se la richiesta in corso è soddisfatta, premio e festa. */
export function controllaRichiesta(
  s: StatoGioco,
  data: string,
  out: Evento[],
  fatto: { voce?: VoceDiario; costruzione?: string; nome?: string; insegna?: string; trova?: string },
) {
  const r = s.richiesta;
  if (!r) return;
  const a = s.animali.find((x) => x.id === r.animale);
  if (!a) {
    s.richiesta = null;
    return;
  }
  let ok = false;
  if (r.tipo === 'racconta' && fatto.voce) ok = Object.entries(fatto.voce.forze).some(([f, v]) => (v ?? 0) > 0 && virtuDi(f as Forza) === r.virtu);
  if (r.tipo === 'costruisci') ok = fatto.costruzione === r.costruzione || s.costruzioni.some((c) => c.id === r.costruzione);
  if (r.tipo === 'nome') ok = fatto.nome === a.id || !!a.nome;
  if (r.tipo === 'insegna') ok = fatto.insegna === a.id;
  if (r.tipo === 'trova') ok = fatto.trova === a.id;
  if (!ok) return;
  s.richiesta = null;
  s.ghiande += REGOLE.richieste.premio;
  a.umore = Math.min(100, a.umore + 10);
  evento(s, data, 'richiesta', `${cap(nomeAnimale(a))} è felicissim${a.sesso === 'f' ? 'a' : 'o'}! Per ringraziarti ti regala ${REGOLE.richieste.premio} castagne.`, out);
}

export function testoRichiesta(s: StatoGioco, r: Richiesta): string {
  switch (r.tipo) {
    case 'nome': return 'Sai… non ho ancora un nome. Me ne daresti uno?';
    case 'trova': return 'Mi sei mancata! Passi a salutarmi ogni tanto? Toccami quando mi vedi.';
    case 'racconta': return `Mi racconti nel diario di una volta in cui hai avuto ${({ coraggio: 'coraggio', umanita: 'cura per qualcuno', saggezza: 'voglia di scoprire qualcosa', giustizia: 'spirito di squadra', temperanza: 'pazienza', trascendenza: 'un momento bello da ricordare' } as Record<Virtu, string>)[r.virtu!]}?`;
    case 'costruisci': {
      const c = REGOLE.costruzioni.find((x) => x.id === r.costruzione);
      return `Sogno ${c ? c.nome.charAt(0).toLowerCase() + c.nome.slice(1) : 'qualcosa di nuovo'} nel villaggio… Lo costruiamo quando avremo le castagne?`;
    }
    case 'insegna': return 'Mi annoio un pochino… Mi insegni qualcosa di nuovo?';
  }
}

/** Eventi che contano davvero per vedere come si sviluppa il villaggio (niente castagne giornaliere). */
const EVENTI_IMPORTANTI: Evento['tipo'][] = ['uovo', 'schiusa', 'crescita', 'mestiere', 'edificio', 'storia', 'abilita'];

/**
 * Solo per la modalità prova: fa passare `giorni` giorni dopo `da` come se Giada scrivesse
 * il diario in `quota` dei giorni (0..1), con punti di forza ed emozioni a caso.
 * Le pagine finte passano dalle stesse regole di quelle vere, quindi si vedono schiuse,
 * crescita, mestieri, edifici e capitoli come succederebbe davvero.
 */
export function simulaGiorniConDiario(s: StatoGioco, da: string, giorni: number, quota = 0.8): { eventi: Evento[]; voci: VoceDiario[] } {
  const eventi: Evento[] = [];
  const voci: VoceDiario[] = [];
  for (let i = 1; i <= giorni; i++) {
    const giorno = aggiungiGiorni(da, i);
    eventi.push(...simula(s, giorno));
    if (casuale(s) >= quota) continue;
    const forze: Punteggi<Forza> = {};
    const quante = 1 + Math.floor(casuale(s) * 3);
    for (let k = 0; k < quante; k++) forze[FORZE[Math.floor(casuale(s) * FORZE.length)]] = 1 + Math.floor(casuale(s) * 3);
    const emozioni: Punteggi<Emozione> = { [EMOZIONI[Math.floor(casuale(s) * EMOZIONI.length)]]: 1 + Math.floor(casuale(s) * 3) };
    const difficile = casuale(s) < 0.1;
    const voce: VoceDiario = {
      id: `prova-${giorno}-${s.numeroVoci}`,
      data: giorno,
      creata: Date.now(),
      testo: 'Pagina finta della modalità prova.',
      forze,
      emozioni,
      giornataDifficile: difficile,
      riassunto: riassunto(forze, emozioni, difficile),
    };
    eventi.push(...applicaVoce(s, voce));
    voci.push(voce);
  }
  return { eventi: eventi.filter((e) => EVENTI_IMPORTANTI.includes(e.tipo)), voci };
}

/** Solo per la modalità prova: tutti salgono di una fase (le uova si schiudono). */
export function faiCrescere(s: StatoGioco, data: string): Evento[] {
  const out: Evento[] = [];
  for (const a of s.animali) {
    if (a.fase === 'uovo') {
      a.fase = 'cucciolo';
      evento(s, data, 'schiusa', `È nat${a.sesso === 'f' ? 'a' : 'o'} ${conArticolo(a)}!`, out, a.id);
      continue;
    }
    const prossima = a.fase === 'cucciolo' ? REGOLE.sogliaFase.giovane : a.fase === 'giovane' ? REGOLE.sogliaFase.adulto : null;
    if (prossima === null) continue;
    a.xp = Math.max(a.xp, prossima);
    cresci(s, a, data, out);
  }
  aggiornaEdifici(s, data, out);
  return out;
}

/** Raccolta delle castagne cadute sotto il castagno. */
export function raccogliCastagne(s: StatoGioco): number {
  const n = s.castagneMature;
  s.ghiande += n;
  s.castagneMature = 0;
  return n;
}

export function abilitaPossibili(s: StatoGioco, a: Animale): DefAbilita[] {
  return REGOLE.abilita.filter((d) => !a.abilita.includes(d.id) && (!d.richiede || s.costruzioni.some((c) => c.id === d.richiede)));
}

/** Giada mette un animale a imparare qualcosa: ci vogliono alcuni giorni. */
export function insegna(s: StatoGioco, animaleId: string, abilitaId: string, data: string): Evento | null {
  const a = s.animali.find((x) => x.id === animaleId);
  const d = REGOLE.abilita.find((x) => x.id === abilitaId);
  if (!a || !d || a.fase === 'uovo' || a.fase === 'cucciolo' || a.studio || !abilitaPossibili(s, a).some((x) => x.id === abilitaId)) return null;
  a.studio = { id: abilitaId, inizio: data, fine: aggiungiGiorni(data, d.giorni) };
  const out: Evento[] = [];
  evento(s, data, 'abilita', `${cap(nomeAnimale(a))} ha cominciato a imparare: ${d.nome.toLowerCase()}. Ci vorranno ${d.giorni} giorni.`, out);
  controllaRichiesta(s, data, out, { insegna: a.id });
  return out[0];
}

/** Porta uno stato salvato con una versione vecchia dell'app alla versione attuale. */
export function normalizzaStato(s: StatoGioco): StatoGioco {
  if ((s.versioneSchema ?? 1) < 2) {
    s.ghiande ??= s.numeroVoci * REGOLE.ghiande.perPagina;
    s.costruzioni ??= [];
  }
  if ((s.versioneSchema ?? 1) < 3) {
    s.castagneMature ??= 0;
    s.richiesta ??= null;
    for (const a of s.animali) {
      a.abilita ??= [];
      a.studio ??= null;
    }
  }
  if ((s.versioneSchema ?? 1) < 4) {
    for (const a of s.animali) if (!a.aspetto) a.aspetto = nuovoAspetto(s, a.specie, a.sesso, a);
  }
  arredoDi(s); // arredo (anche per i salvataggi di prima)
  s.sorprese ??= [];
  // il carattere è arrivato dopo: chi non ce l'ha ne riceve uno, diverso da quello degli altri
  for (const a of s.animali) if (!a.carattere) a.carattere = scegliCarattere(s, a);
  s.versioneSchema = SCHEMA;
  return s;
}

// ---------- coppie e cuccioli (dopo Natale, logica già pronta) ----------

export function puoFormareCoppia(a: Animale, b: Animale): boolean {
  return a.specie === b.specie && a.sesso !== b.sesso && a.fase !== 'uovo' && indiceFase(a.fase) >= 3 && indiceFase(b.fase) >= 3;
}
