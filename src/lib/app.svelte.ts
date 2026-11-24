// Stato dell'app (Svelte 5) e operazioni principali.
import diz from '../dati/dizionario.json';
import { analizza, preparaDizionario, type VoceDizionario } from './analisi';
import { creaCopia, migra, type FileCopia } from './copia';
import { aggiungiGiorni, oggi } from './date';
import { chiediSpazioPersistente, db, leggiMeta, scriviMeta } from './db';
import {
  applicaVoce, controllaRichiesta, costruisci, faiCrescere, insegna, normalizzaStato, nuovoStato, raccogliCastagne, riassunto, simula, simulaGiorniConDiario,
} from './gioco';
import { GUIDA, type PaginaGuida } from '../dati/guida';
import { festeggia as festeggiaCompleanno } from './festa';
import { doveSiamo } from './telefono';
import { prendiPesce } from './pesca';
import { migliora, ritiraCassa } from './migliorie';
import type { Analisi, Emozione, Evento, Forza, Punteggi, StatoGioco, VoceDiario } from './tipi';

export type Schermata = 'caricamento' | 'intro' | 'villaggio' | 'diario' | 'animale' | 'storia' | 'statistiche' | 'impostazioni' | 'icona' | 'guida';

export const app = $state({
  schermata: 'caricamento' as Schermata,
  stato: null as StatoGioco | null,
  voci: [] as VoceDiario[],
  mentreEriVia: [] as Evento[],
  animaleAperto: null as string | null,
  offsetGiorni: 0, // modalità sviluppatore
  prova: false, // pannello prove visibile (solo sul telefono aperto con ?prova)
  guidaIconaVista: false, // la guida "metti l'icona sul telefono" è già stata mostrata
  datiAlSicuro: false, // il browser ha promesso di non cancellare i dati
  consigli: { n: 0, giorno: '' }, // "Lo sapevi?" dei primi giorni: quanti mostrati e l'ultimo giorno
  audio: true,
  capitoliLetti: [] as string[], // per il «NUOVO!» sulla Storia
  // dialoghi da mostrare nel villaggio (es. dopo una pagina di diario) e festa degli animali
  codaDialoghi: [] as RigaDialogo[],
  festa: 0,
  // modalità prova: 1 = mostra la festa di compleanno di Giada adesso, 2 = già vista (restano gli addobbi)
  provaCompleanno: 0,
});

export interface RigaDialogo {
  chi: string; // nome mostrato sull'etichetta
  testo: string;
  voce?: 'corvo' | 'animale' | 'narratore';
  audioId?: string; // battuta registrata del corvo
}

const regole = preparaDizionario(diz.voci as VoceDizionario[]);

export function dataDiOggi(): string {
  return aggiungiGiorni(oggi(), app.offsetGiorni);
}

async function salvaStato() {
  if (!app.stato) return;
  await db.stato.put({ id: 'unico', dati: $state.snapshot(app.stato) as StatoGioco });
}

/**
 * Indirizzi segreti per il telefono di prova (Giada non li vede mai):
 * ?prova  accende il pannello prove in Altro, e resta acceso su quel telefono
 * ?azzera cancella villaggio, diario, giorni simulati e pannello prove
 * Il parametro viene tolto subito dalla barra degli indirizzi.
 */
async function leggiLinkSegreti(): Promise<boolean> {
  const url = new URL(location.href);
  const azzera = url.searchParams.has('azzera');
  const prova = url.searchParams.has('prova');
  if (!azzera && !prova) return false;
  url.searchParams.delete('azzera');
  url.searchParams.delete('prova');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  if (azzera) {
    if (confirm('Cancello TUTTO il villaggio e il diario da questo telefono?')) {
      await azzeraTutto();
      return true;
    }
  } else {
    await scriviMeta('prova', true);
  }
  return false;
}

export async function avvia() {
  if (await leggiLinkSegreti()) return;
  chiediSpazioPersistente().then((ok) => (app.datiAlSicuro = ok));
  app.prova = await leggiMeta('prova', false);
  app.guidaIconaVista = await leggiMeta('guidaIcona', false);
  app.offsetGiorni = await leggiMeta('offsetGiorni', 0);
  app.audio = await leggiMeta('audio', true);
  app.consigli = await leggiMeta('consigli', { n: 0, giorno: '' });
  app.capitoliLetti = await leggiMeta<string[]>('capitoliLetti', []);
  const riga = await db.stato.get('unico');
  if (!riga) {
    // prima volta: se è un telefono e non è aperto dall'icona, prima mettiamo l'icona
    // (sull'iPhone l'icona ha dati suoi: meglio cominciare già da lì)
    const dove = doveSiamo();
    app.schermata = !app.guidaIconaVista && dove !== 'app' && dove !== 'computer' ? 'icona' : 'intro';
    return;
  }
  app.stato = normalizzaStato(riga.dati);
  app.voci = await db.voci.orderBy('data').reverse().toArray();
  aggiornaTempo();
  app.schermata = 'villaggio';
}

/** Simula i giorni passati dall'ultimo accesso e prepara il riepilogo "mentre eri via". */
export function aggiornaTempo() {
  if (!app.stato) return;
  const ev = simula(app.stato, dataDiOggi());
  if (ev.length) app.mentreEriVia = [...app.mentreEriVia, ...ev];
  salvaStato();
}

export async function iniziaPartita(profilo: Record<Forza, number>, nomeVillaggio: string) {
  const seme = (crypto.getRandomValues(new Uint32Array(1))[0] ^ Date.now()) >>> 0;
  app.stato = nuovoStato(dataDiOggi(), profilo, nomeVillaggio.trim() || 'Il villaggio', seme);
  app.voci = [];
  await salvaStato();
  await scriviMeta('introInCorso', null);
  chiediSpazioPersistente().then((ok) => (app.datiAlSicuro = ok));
  app.schermata = 'guida'; // la prima volta il corvo spiega come si gioca
}

/** Nei primi giorni, un "Lo sapevi?" al giorno dalla guida (dal secondo giorno in poi). */
export function prendiConsiglio(): PaginaGuida | null {
  const s = app.stato;
  const oggi = dataDiOggi();
  if (!s || s.inizio === oggi || app.consigli.giorno === oggi || app.consigli.n >= GUIDA.length) return null;
  const p = GUIDA[app.consigli.n];
  app.consigli = { n: app.consigli.n + 1, giorno: oggi };
  scriviMeta('consigli', $state.snapshot(app.consigli));
  return p;
}

/** Chiude la guida dell'icona e non la ripropone più da sola. */
export async function chiudiGuidaIcona() {
  app.guidaIconaVista = true;
  await scriviMeta('guidaIcona', true);
  vai(app.stato ? 'villaggio' : 'intro');
}

export function analizzaTesto(testo: string): Analisi {
  return analizza(testo, regole);
}

export async function salvaVoce(testo: string, forze: Punteggi<Forza>, emozioni: Punteggi<Emozione>, difficile: boolean): Promise<{ voce: VoceDiario; eventi: Evento[] }> {
  if (!app.stato) throw new Error('nessuna partita');
  aggiornaTempo();
  const voce: VoceDiario = {
    id: crypto.randomUUID(),
    data: dataDiOggi(),
    creata: Date.now(),
    testo,
    forze,
    emozioni,
    giornataDifficile: difficile,
    riassunto: riassunto(forze, emozioni, difficile),
  };
  const eventi = applicaVoce(app.stato, voce);
  await db.voci.put(voce);
  app.voci = [voce, ...app.voci];
  await salvaStato();
  return { voce, eventi };
}

export async function costruisciQui(id: string): Promise<Evento | null> {
  if (!app.stato) return null;
  const ev = costruisci(app.stato, id, dataDiOggi());
  if (ev) await salvaStato();
  return ev;
}

/** Migliora la casa-bottega di un animale con le castagne. */
export async function miglioraCasa(id: string): Promise<Evento | null> {
  if (!app.stato) return null;
  const ev = migliora(app.stato, id, dataDiOggi());
  if (ev) await salvaStato();
  return ev;
}

/** Entrando in casa, Giada ritira le castagne che la bottega ha messo da parte. */
export async function ritiraIncasso(id: string): Promise<number> {
  if (!app.stato) return 0;
  const n = ritiraCassa(app.stato, id);
  if (n) await salvaStato();
  return n;
}

export async function rinominaAnimale(id: string, nome: string): Promise<Evento[]> {
  const a = app.stato?.animali.find((x) => x.id === id);
  if (!a || !app.stato) return [];
  a.nome = nome.trim().slice(0, 24);
  const out: Evento[] = [];
  controllaRichiesta(app.stato, dataDiOggi(), out, { nome: id });
  await salvaStato();
  return out;
}

/** Giada è passata a salutare un animale: se era la sua richiesta, è contento. */
export async function salutaAnimale(id: string): Promise<Evento[]> {
  if (!app.stato) return [];
  const out: Evento[] = [];
  controllaRichiesta(app.stato, dataDiOggi(), out, { trova: id });
  if (out.length) await salvaStato();
  return out;
}

export async function raccogliQui(): Promise<number> {
  if (!app.stato) return 0;
  const n = raccogliCastagne(app.stato);
  if (n) await salvaStato();
  return n;
}

/** Giada ha preso un pesce al laghetto. */
export async function pescaQui(id: string, cm: number) {
  if (!app.stato) return null;
  const r = prendiPesce(app.stato, id, cm, dataDiOggi());
  await salvaStato();
  return r;
}

export async function insegnaQui(animale: string, abilita: string): Promise<Evento | null> {
  if (!app.stato) return null;
  const ev = insegna(app.stato, animale, abilita, dataDiOggi());
  if (ev) await salvaStato();
  return ev;
}

/**
 * Arredo: applica una modifica allo stato e salva. Mentre si disegna il sentiero col dito
 * arrivano tante modifiche di fila: il salvataggio aspetta che il dito si fermi un attimo.
 */
let timerArredo: ReturnType<typeof setTimeout> | undefined;
export function cambiaArredo<T>(f: (s: StatoGioco, oggi: string) => T, subito = true): T | undefined {
  if (!app.stato) return undefined;
  const r = f(app.stato, dataDiOggi());
  clearTimeout(timerArredo);
  if (subito) salvaStato();
  else timerArredo = setTimeout(salvaStato, 400);
  return r;
}

/** Giada ha soffiato le candeline: festa fatta, regalo di castagne e un ricordo per tutti. */
export async function soffiaCandeline(): Promise<Evento | null> {
  if (!app.stato) return null;
  const e = festeggiaCompleanno(app.stato, dataDiOggi());
  await salvaStato();
  return e;
}

/** Modalità prova: fa vedere subito la festa di compleanno di Giada, senza aspettare il 24 luglio. */
export function provaFestaDiCompleanno() {
  app.provaCompleanno = 1;
  vai('villaggio');
}

/** Modalità prova: castagne extra. */
export async function regalaCastagne(n: number) {
  if (!app.stato) return;
  app.stato.ghiande += n;
  await salvaStato();
}

/** Modalità prova: tutti crescono di una fase. */
export async function crescitaDiProva() {
  if (!app.stato) return;
  faiCrescere(app.stato, dataDiOggi());
  await salvaStato();
}

export async function rinominaVillaggio(nome: string) {
  if (!app.stato) return;
  app.stato.nomeVillaggio = nome.trim().slice(0, 40) || app.stato.nomeVillaggio;
  await salvaStato();
}

/** Una sorpresa è stata mostrata in primo piano: non la si rivede più. */
export async function segnaSorpresaVista(e: Evento) {
  if (!app.stato?.sorprese) return;
  app.stato.sorprese = app.stato.sorprese.filter((x) => !(x.data === e.data && x.tipo === e.tipo && x.testo === e.testo));
  await salvaStato();
}

export function chiudiMentreEriVia() {
  app.mentreEriVia = [];
}

export function vai(s: Schermata, animale?: string) {
  app.schermata = s;
  if (animale) app.animaleAperto = animale;
  window.scrollTo(0, 0);
}

export async function segnaCapitoloLetto(id: string) {
  if (app.capitoliLetti.includes(id)) return;
  app.capitoliLetti = [...app.capitoliLetti, id];
  await scriviMeta('capitoliLetti', $state.snapshot(app.capitoliLetti));
}

export async function impostaAudio(on: boolean) {
  app.audio = on;
  await scriviMeta('audio', on);
}

// ---------- copia di sicurezza ----------

export function esportaCopia(): FileCopia {
  return creaCopia($state.snapshot(app.stato) as StatoGioco, $state.snapshot(app.voci) as VoceDiario[]);
}

export async function segnaBackupFatto() {
  if (!app.stato) return;
  app.stato.ultimoBackupRicordato = dataDiOggi();
  await salvaStato();
}

export async function ripristina(testo: string) {
  const f = migra(JSON.parse(testo) as FileCopia);
  await db.transaction('rw', db.stato, db.voci, async () => {
    await db.voci.clear();
    await db.voci.bulkPut(f.voci);
    await db.stato.put({ id: 'unico', dati: f.stato });
  });
  app.stato = f.stato;
  app.voci = [...f.voci].sort((a, b) => (a.data < b.data ? 1 : -1));
  aggiornaTempo();
  app.schermata = 'villaggio';
}

// ---------- modalità sviluppatore ----------

export async function avanzaGiorni(n: number) {
  app.offsetGiorni += n;
  await scriviMeta('offsetGiorni', app.offsetGiorni);
  aggiornaTempo();
}

/**
 * Modalità prova: avanti di `giorni` giorni scrivendo pagine finte nell'80% dei giorni,
 * così si vedono gli sviluppi. Restituisce quanti eventi importanti sono successi.
 */
export async function avantiConDiario(giorni: number): Promise<{ pagine: number; eventi: number }> {
  if (!app.stato) return { pagine: 0, eventi: 0 };
  aggiornaTempo();
  const { eventi, voci } = simulaGiorniConDiario(app.stato, dataDiOggi(), giorni);
  app.offsetGiorni += giorni;
  await scriviMeta('offsetGiorni', app.offsetGiorni);
  await db.voci.bulkPut(voci);
  app.voci = [...voci.reverse(), ...app.voci];
  app.mentreEriVia = [...app.mentreEriVia, ...eventi];
  await salvaStato();
  return { pagine: voci.length, eventi: eventi.length };
}

/** Spegne il pannello prove su questo telefono (si riaccende con ?prova). */
export async function esciDallaProva() {
  app.prova = false;
  await scriviMeta('prova', false);
}

export async function azzeraTutto() {
  await db.delete();
  location.reload();
}
