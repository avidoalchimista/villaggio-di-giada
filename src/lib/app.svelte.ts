// Stato dell'app (Svelte 5) e operazioni principali.
import diz from '../dati/dizionario.json';
import { analizza, preparaDizionario, type VoceDizionario } from './analisi';
import { creaCopia, migra, type FileCopia } from './copia';
import { aggiungiGiorni, oggi } from './date';
import { chiediSpazioPersistente, db, leggiMeta, scriviMeta } from './db';
import { applicaVoce, nuovoStato, riassunto, simula } from './gioco';
import type { Analisi, Emozione, Evento, Forza, Punteggi, StatoGioco, VoceDiario } from './tipi';

export type Schermata = 'caricamento' | 'intro' | 'villaggio' | 'diario' | 'animale' | 'storia' | 'statistiche' | 'impostazioni';

export const app = $state({
  schermata: 'caricamento' as Schermata,
  stato: null as StatoGioco | null,
  voci: [] as VoceDiario[],
  mentreEriVia: [] as Evento[],
  animaleAperto: null as string | null,
  offsetGiorni: 0, // modalità sviluppatore
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
  chiediSpazioPersistente();
  app.offsetGiorni = await leggiMeta('offsetGiorni', 0);
  app.audio = await leggiMeta('audio', true);
  const riga = await db.stato.get('unico');
  if (!riga) {
    app.schermata = 'intro';
    return;
  }
  app.stato = riga.dati;
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
  app.schermata = 'villaggio';
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

export async function rinominaAnimale(id: string, nome: string) {
  const a = app.stato?.animali.find((x) => x.id === id);
  if (!a) return;
  a.nome = nome.trim().slice(0, 24);
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
