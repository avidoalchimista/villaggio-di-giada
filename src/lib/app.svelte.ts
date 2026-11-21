// Stato dell'app (Svelte 5) e operazioni principali.
import diz from '../dati/dizionario.json';
import { analizza, preparaDizionario, type VoceDizionario } from './analisi';
import { creaCopia, migra, type FileCopia } from './copia';
import { aggiungiGiorni, oggi } from './date';
import { chiediSpazioPersistente, db, leggiMeta, scriviMeta } from './db';
import {
  applicaVoce, controllaRichiesta, costruisci, faiCrescere, insegna, normalizzaStato, nuovoStato, raccogliCastagne, riassunto, simula,
} from './gioco';
import { GUIDA, type PaginaGuida } from '../dati/guida';
import { doveSiamo } from './telefono';
import type { Analisi, Emozione, Evento, Forza, Punteggi, StatoGioco, VoceDiario } from './tipi';

export type Schermata = 'caricamento' | 'intro' | 'villaggio' | 'diario' | 'animale' | 'storia' | 'statistiche' | 'impostazioni' | 'icona' | 'guida';

export const app = $state({
  schermata: 'caricamento' as Schermata,
  stato: null as StatoGioco | null,
  voci: [] as VoceDiario[],
  mentreEriVia: [] as Evento[],
  animaleAperto: null as string | null,
  offsetGiorni: 0, // modalità sviluppatore
  guidaIconaVista: false, // la guida "metti l'icona sul telefono" è già stata mostrata
  datiAlSicuro: false, // il browser ha promesso di non cancellare i dati
  consigli: { n: 0, giorno: '' }, // "Lo sapevi?" dei primi giorni: quanti mostrati e l'ultimo giorno
  audio: true,
  // dialoghi da mostrare nel villaggio (es. dopo una pagina di diario) e festa degli animali
  codaDialoghi: [] as RigaDialogo[],
  festa: 0,
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

export async function avvia() {
  chiediSpazioPersistente().then((ok) => (app.datiAlSicuro = ok));
  app.guidaIconaVista = await leggiMeta('guidaIcona', false);
  app.offsetGiorni = await leggiMeta('offsetGiorni', 0);
  app.audio = await leggiMeta('audio', true);
  app.consigli = await leggiMeta('consigli', { n: 0, giorno: '' });
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

export async function insegnaQui(animale: string, abilita: string): Promise<Evento | null> {
  if (!app.stato) return null;
  const ev = insegna(app.stato, animale, abilita, dataDiOggi());
  if (ev) await salvaStato();
  return ev;
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

export function chiudiMentreEriVia() {
  app.mentreEriVia = [];
}

export function vai(s: Schermata, animale?: string) {
  app.schermata = s;
  if (animale) app.animaleAperto = animale;
  window.scrollTo(0, 0);
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

export async function azzeraTutto() {
  await db.delete();
  location.reload();
}
