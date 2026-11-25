<script lang="ts">
  // Schermata principale: la radura in 3D. Si tocca un animale, il corvo, il quaderno, le uova, le castagne.
  import { onDestroy, onMount, untrack } from 'svelte';
  import APiedi from '../componenti/APiedi.svelte';
  import { chiSei, consiglio, daChePagina, DOMANDE, emozioniCheporto, paginaDi, type Battuta, type Domanda } from '../lib/chiacchiere';
  import { carattereDi, nomeCarattere } from '../lib/carattere';
  import Casa from '../componenti/Casa.svelte';
  import Pesca from '../componenti/Pesca.svelte';
  import Acquario from '../componenti/Acquario.svelte';
  import Museo from '../componenti/Museo.svelte';
  import Funghi from '../componenti/Funghi.svelte';
  import { FUNGO } from '../lib/funghi';
  import { RITROVAMENTO, haMuseo } from '../lib/museo';
  import Luogo from '../componenti/Luogo.svelte';
  import Escursione from '../componenti/Escursione.svelte';
  import { escursionePossibile, type Giornata } from '../lib/escursioni';
  import { BIOMA, type DefBioma } from '../lib/biomi';
  import Dialogo from '../componenti/Dialogo.svelte';
  import { fraseCarattere } from '../lib/carattere';
  import MenuCostruisci from '../componenti/MenuCostruisci.svelte';
  import Arredo from '../componenti/Arredo.svelte';
  import { leggiMeta, scriviMeta } from '../lib/db';
  import frasi from '../dati/frasi.json';
  import {
    analizzaTesto, app, cambiaArredo, chiudiMentreEriVia, prendiRitrovamentoQui, rientriQui, dataDiOggi, insegnaQui, prendiConsiglio, raccogliQui, rinominaAnimale, salutaAnimale, segnaBackupFatto, segnaSorpresaVista, soffiaCandeline, vai,
    type RigaDialogo,
  } from '../lib/app.svelte';
  import {
    auguriDi, CASTAGNE_IN_REGALO, chiHaFattoLaTorta, chiSuona, eVigilia, festaDaFare, festaInRitardo, fraseDiFesta, FRASI_VIGILIA, invitati, ordinale, quantaFesta, villaggioInFesta,
  } from '../lib/festa';
  import { giorniTra } from '../lib/date';
  import { allargaCase, arredoDi, sposta } from '../lib/arredo';
  import { giorniAllAlbero } from '../lib/castoro';
  import { nomeMestiere } from '../lib/mestieri';
  import * as THREE from 'three';
  import {
    abilitaPossibili, accorda, conArticolo, nomeAnimale, REGOLE, statoCostruzione, STORIA, testoRichiesta, type DefAbilita,
  } from '../lib/gioco';
  import { meteo as calcolaMeteo, NOME_METEO, type Meteo } from '../lib/meteo';
  import type { Animale, Evento } from '../lib/tipi';
  import { Scena, type Bersaglio } from '../scena/scena';

  // il villaggio resta montato anche quando si guarda un'altra pagina (diario, storia...): lì è solo fermo e nascosto
  let { attivo = true }: { attivo?: boolean } = $props();
  let canvas: HTMLCanvasElement;
  let scena = $state.raw<Scena | null>(null);
  let s = $derived(app.stato!);

  type DialogoAperto = { righe: RigaDialogo[]; animale?: Animale; tipo?: 'animale' | 'backup' | 'casa' | 'escursione'; chiave?: string };
  let dialogo = $state<DialogoAperto | null>(null);
  let chiediNome = $state<Animale | null>(null);
  let insegnaA = $state<Animale | null>(null);
  let nome = $state('');
  let erroreGrafica = $state(false);
  let menu = $state(false);
  let arreda = $state(false);
  let aiuolaDaAprire = $state<string | null>(null);
  let casaNuova = $state<string | null>(null); // la casa di cui Giada sceglie il posto
  const giaChiesto = new Set<string>(); // "più tardi": non si richiede finché non si riapre il villaggio
  let quadroAperto = $state<string | null>(null);
  // sbirciare dentro una casa (o nella tana dei piccoli sotto il grande albero)
  let casa = $state<{ proprietario: Animale | null; abitanti: Animale[] } | null>(null);
  function entra(proprietario: Animale | null) {
    const abitanti = proprietario ? [proprietario] : s.animali.filter((a) => a.fase !== 'uovo' && !a.mestiere);
    dialogo = null;
    casa = { proprietario, abitanti: JSON.parse(JSON.stringify(abitanti)) };
    scena?.sospendi(true);
  }
  function esci() {
    casa = null;
    scena?.sospendi(false);
  }
  // pescare al laghetto
  let pesca = $state<'mattina' | 'giorno' | 'sera' | 'notte' | null>(null);
  function vaiAPescare() {
    const m = scena?.momento() ?? 'lavoro';
    dialogo = null;
    pesca = m === 'mattina' || m === 'sera' || m === 'notte' ? m : 'giorno';
  }
  function smettiDiPescare() {
    pesca = null;
    scena?.finePesca();
  }
  // guardare i pesci dell'acquario, e la cartolina di un posto lontano
  let acquario = $state(false);
  function apriAcquario() {
    dialogo = null;
    if (scena?.inquadraAcquario()) acquario = true;
  }
  function chiudiAcquario() {
    acquario = false;
    scena?.fineCinema();
  }
  // il museo, e i funghi (chi mandare nel bosco, il cestino)
  let museo = $state(false);
  function apriMuseo() {
    dialogo = null;
    if (scena?.inquadraMuseo()) museo = true;
  }
  function chiudiMuseo() {
    museo = false;
    scena?.fineCinema();
  }
  let funghi = $state(false);
  let haFunghi = $derived(Object.values(s.funghi?.cestino ?? {}).some((n) => n > 0));
  let nelBosco = $derived(s.funghi?.fuori.length ?? 0);
  // chi torna dal bosco lo racconta appena si può (se sta succedendo altro, aspetta)
  let rientriDaDire: RigaDialogo[][] = [];
  async function controllaRientri() {
    const r = await rientriQui();
    for (const x of r) {
      const a = s.animali.find((y) => y.id === x.animale);
      if (!a) continue;
      const lista = Object.entries(x.funghi).map(([id, n]) => `${n > 1 ? n + ' × ' : ''}${FUNGO[id]?.nome.toLowerCase()}`).join(', ');
      const righe: RigaDialogo[] = [{ chi: chiDice(a), voce: 'animale', testo: lista ? `Sono tornat${a.sesso === 'f' ? 'a' : 'o'} dal bosco! Nel cestino ho messo: ${lista}. 🍄` : `Sono tornat${a.sesso === 'f' ? 'a' : 'o'} dal bosco… oggi niente funghi, ma che bella passeggiata!` }];
      if (x.preso) {
        const d = RITROVAMENTO[x.preso.id];
        righe.push({ chi: chiDice(a), voce: 'animale', testo: `E guarda cosa ho trovato per terra: ${d.icona} ${d.nome.toLowerCase()}! ${x.preso.nuovo ? (haMuseo(s) ? `Va nel museo (+${x.preso.castagne} 🌰).` : 'Lo teniamo per il museo.') : 'Ce l\'avevamo già: lo regalo al corvo (+1 🌰).'}` });
      }
      if (Object.keys(x.funghi).some((id) => FUNGO[id]?.mangia === 'veleno')) righe.push(corvo('', 'Cra! Attenzione: uno di quei funghi è velenoso. Quello non si cucina: si guarda soltanto, magari al museo.'));
      rientriDaDire.push(righe);
    }
    if (rientriDaDire.length && !dialogo && !sp && !fs && !casa && !pesca && !gita && !arreda && !menu) {
      dialogo = { righe: rientriDaDire.flat() };
      rientriDaDire = [];
      scena?.festeggia();
    }
  }
  let luogo = $state<DefBioma | null>(null);
  // l'escursione nei posti lontani: si apre dopo una giornata particolare scritta nel diario
  let gitaPossibile = $derived(escursionePossibile(s, app.voci, dataDiOggi()));
  let gita = $state<{ voce: string; giornata: Giornata } | null>(null);
  function apriGita() {
    const g = gitaPossibile;
    dialogo = null;
    if (g) gita = { voce: g.voce.id, giornata: g.giornata };
  }
  let tempo = $state<Meteo>('sole');
  // il compleanno di Giada: il villaggio è addobbato (e, se la festa non c'è ancora stata, la si fa appena entra)
  let inFesta = $derived(app.provaCompleanno > 0 || villaggioInFesta(s, dataDiOggi()));
  let puoCostruire = $derived(REGOLE.costruzioni.some((c) => statoCostruzione(s, c) === 'pronta'));
  const simbolo = (a: Animale) => (a.sesso === 'f' ? '♀' : '♂');

  const C = frasi.corvo as Record<string, string>;
  const corvo = (id: string, testo?: string): RigaDialogo => ({ chi: 'Corvo', testo: testo ?? C[id], voce: 'corvo', audioId: testo ? undefined : id });
  const scegli = <T,>(l: T[], k: number) => l[Math.abs(k) % l.length];
  // (il castoro racconta lui quello che fa)
  const dalCorvo = (eventi: Evento[]): RigaDialogo[] => eventi.map((e) => (e.tipo === 'castoro' || e.tipo === 'sentiero' ? { chi: 'Castoro', voce: 'animale' as const, testo: e.testo } : { chi: 'Corvo', voce: 'corvo' as const, testo: e.testo }));
  const chiDice = (a: Animale) => `${a.nome || nomeAnimale(a)} ${simbolo(a)}`;

  // ---------- due chiacchiere faccia a faccia (toccando un animale) ----------
  let faccia = $state<string | null>(null); // con chi si sta parlando in primo piano
  let giroDialogo = $state(0); // cambia a ogni risposta: il fumetto riparte dalla prima riga
  let consiglioAperto = $state(false);
  let testoConsiglio = $state('');
  let aPiedi = $state(false);
  $effect(() => {
    const id = dialogo?.tipo === 'animale' && !arreda ? (dialogo.animale?.id ?? null) : null;
    untrack(() => {
      if (id === faccia) return;
      if (faccia) scena?.fineCinema();
      consiglioAperto = false;
      faccia = id && scena?.parlaCon(id) ? id : null;
    });
  });
  // ---------- chi parla si vede da vicino (il corvo, il castoro, un animale) ----------
  let inPrimoPiano: string | null = null;
  function inquadraChiParla(r: RigaDialogo) {
    if (!scena || sp || fs || faccia || arreda || casa || pesca || acquario || museo || funghi || luogo || gita || aPiedi) return;
    if (!dialogo || dialogo.tipo === 'casa' || dialogo.tipo === 'animale') return; // (per la casa nuova si guarda il posto)
    let chi: string | null = null;
    if (r.voce === 'corvo') chi = 'corvo';
    else if (r.chi === 'Castoro') chi = 'castoro';
    else if (r.voce === 'animale') {
      const a = s.animali.find((x) => x.fase !== 'uovo' && chiDice(x) === r.chi);
      if (a) chi = 'a:' + a.id;
    }
    if (!chi || chi === inPrimoPiano) return;
    const ok = chi === 'corvo' ? scena.inquadraCorvo() : chi === 'castoro' ? scena.inquadraCastoro() : scena.inquadra({ tipo: 'animale', id: chi.slice(2) });
    if (ok) inPrimoPiano = chi;
  }
  // finito il fumetto si torna alla vista di sempre
  $effect(() => {
    const aperto = !!dialogo && dialogo.tipo !== 'animale';
    untrack(() => {
      if (aperto || !inPrimoPiano) return;
      inPrimoPiano = null;
      if (!dialogo && !sp && !fs) scena?.fineCinema();
    });
  });

  function rispondi(a: Animale, battute: Battuta[]) {
    dialogo = {
      righe: battute.map((b) => (b.chi === 'corvo' ? { chi: 'Corvo', voce: 'corvo' as const, testo: b.testo } : { chi: chiDice(a), voce: 'animale' as const, testo: b.testo })),
      animale: a,
      tipo: 'animale',
    };
    giroDialogo += 1;
    scena?.annuisci(a.id);
  }
  function chiedi(d: Domanda) {
    const a = dialogo?.animale;
    if (!a) return;
    if (d === 'chi') rispondi(a, chiSei(a, dataDiOggi()));
    else if (d === 'pagina') rispondi(a, daChePagina(a, paginaDi(a, app.voci, s.eventi), dataDiOggi()));
    else if (d === 'emozioni') rispondi(a, emozioniCheporto(a));
    else {
      rispondi(a, [{ chi: 'animale', testo: 'Certo! Se vuoi, raccontami cosa ti passa per la testa, e io ci penso su. Oppure te ne do uno io.' }]);
      testoConsiglio = '';
      consiglioAperto = true;
    }
  }
  function daiConsiglio() {
    const a = dialogo?.animale;
    if (!a) return;
    const t = testoConsiglio.trim();
    consiglioAperto = false;
    rispondi(a, consiglio(a, giroDialogo + s.numeroVoci, t || undefined, t ? analizzaTesto : undefined));
  }

  // ---------- primo piano: schiusa e sorprese "mentre eri via" ----------
  type Spettacolo = { passi: Evento[]; i: number; titolo: string; testo: string; pronto: boolean; nome: Animale | null };
  let sp = $state<Spettacolo | null>(null);
  let poi: DialogoAperto | null = null; // il dialogo da mostrare quando lo spettacolo è finito
  let dopoDialogo: (() => void) | null = null; // cosa fare quando si chiude il dialogo
  const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const nat = (a: Animale) => `nat${a.sesso === 'f' ? 'a' : 'o'}`;

  /** Le sorprese ancora da vedere che si possono mostrare (le altre si segnano come viste). */
  function sorpreseDaMostrare(): Evento[] {
    const tutte = s.sorprese ?? [];
    const ok = tutte.filter((e) => {
      if (e.tipo === 'storia') return true;
      if (e.tipo === 'sentiero') return !!e.luogo && !!BIOMA[e.luogo];
      const a = s.animali.find((x) => x.id === e.animale);
      if (!a) return false;
      if (e.tipo === 'uovo') return a.fase === 'uovo' || tutte.some((x) => x.tipo === 'schiusa' && x.animale === a.id);
      return a.fase !== 'uovo';
    });
    for (const e of tutte) if (!ok.includes(e)) segnaSorpresaVista(e);
    return ok;
  }

  async function avviaSpettacolo(passi: Evento[], titolo: string) {
    sp = { passi, i: 0, titolo, testo: '', pronto: false, nome: null };
    await pausa(400);
    mostraPasso();
  }

  async function mostraPasso() {
    if (!sp || !scena) return;
    const e = sp.passi[sp.i];
    sp.pronto = false;
    sp.nome = null;
    sp.testo = '';
    const a = s.animali.find((x) => x.id === e.animale);
    if (e.tipo === 'schiusa' && a) {
      sp.testo = 'Oh! Guarda l\'uovo…';
      await scena.schiusa(a.id, (fase) => {
        if (!sp) return;
        if (fase === 'crepa') sp.testo = 'Toc… toc… si sta crepando!';
        else if (fase === 'luce') sp.testo = 'Ci siamo…!';
        else if (fase === 'nato') sp.testo = `È ${nat(a)} ${conArticolo(a)}!`;
      });
      if (!sp) return;
      const ora = s.animali.find((x) => x.id === a.id);
      sp.testo = `È ${nat(a)} ${conArticolo(a)}! ${ora?.nome ? `Si chiama ${ora.nome}.` : `Come ${a.sesso === 'f' ? 'la' : 'lo'} vuoi chiamare?`}`;
      if (ora && !ora.nome) {
        sp.nome = ora;
        nome = '';
      }
    } else {
      if (e.tipo === 'sentiero' && e.luogo) scena.inquadraSentiero(e.luogo);
      else if (e.tipo === 'storia') scena.inquadra({ tipo: 'corvo' });
      else if (a && e.tipo === 'uovo') scena.inquadra({ tipo: 'uovo', id: a.id });
      else if (a && e.tipo === 'edificio') {
        const ed = s.edifici.find((x) => x.gestore === a.id);
        if (!(ed && scena.inquadra({ tipo: 'edificio', id: ed.tipo }))) scena.inquadra({ tipo: 'animale', id: a.id });
      } else if (a && e.tipo === 'casa') {
        if (!scena.inquadra({ tipo: 'casa', id: a.id })) scena.inquadra({ tipo: 'animale', id: a.id });
      } else if (a) scena.inquadra({ tipo: 'animale', id: a.id });
      await pausa(1200);
      if (!sp) return;
      sp.testo = e.tipo === 'storia' ? `${e.testo}. Il corvo ha una storia nuova da raccontarti!` : e.tipo === 'sentiero' ? `🦫 ${e.testo}` : e.tipo === 'casa' ? `🔨 ${e.testo}` : e.testo;
    }
    sp.pronto = true;
  }

  async function avanti() {
    if (!sp?.pronto) return;
    const e = sp.passi[sp.i];
    sp.pronto = false;
    await segnaSorpresaVista(e);
    if (sp.i + 1 < sp.passi.length) {
      sp.i += 1;
      mostraPasso();
    } else {
      scena?.fineCinema();
      scena?.festeggia();
      sp = null;
      if (poi) dialogo = poi;
      poi = null;
    }
  }

  /** «Salta»: le sorprese rimaste si danno per viste e si torna subito al villaggio. */
  async function saltaTutto() {
    if (!sp?.pronto) return;
    const resto = sp.passi.slice(sp.i);
    sp = null;
    for (const e of resto) await segnaSorpresaVista(e);
    scena?.lasciaTutti();
    scena?.fineCinema();
    if (poi) dialogo = poi;
    poi = null;
  }

  async function nomeNelloSpettacolo() {
    if (!sp?.nome || !nome.trim()) return;
    const a = sp.nome;
    const ev = await rinominaAnimale(a.id, nome);
    sp.nome = null;
    sp.testo = `${nome.trim()}… che bel nome! ${a.sesso === 'f' ? 'Le' : 'Gli'} piace tantissimo.`;
    scena?.festeggia();
    if (ev.length) poi = { righe: [...(poi?.righe ?? []), ...dalCorvo(ev)] };
  }

  function chiudiDialogo() {
    dialogo = null;
    const f = dopoDialogo;
    dopoDialogo = null;
    f?.();
  }

  // il tempo che fa: cambia a fasce di 4 ore, uguale per tutto il giorno a parità di ora
  function aggiornaMeteo() {
    tempo = inFesta ? 'sole' : calcolaMeteo(dataDiOggi(), new Date().getHours(), s.seme); // alla festa non piove
    scena?.impostaMeteo(tempo);
  }
  let timerMeteo: ReturnType<typeof setInterval> | undefined;
  let timerFunghi: ReturnType<typeof setInterval> | undefined;

  // conforto: se l'ultima pagina era di una giornata triste, qualcuno viene a consolarla
  const giaConfortati = new Set<string>();
  function serveConforto(): RigaDialogo[] | null {
    const v = app.voci[0];
    if (!v || giaConfortati.has(v.id) || giorniTra(v.data, dataDiOggi()) > 2) return null;
    const triste = v.giornataDifficile || (v.emozioni.tristezza ?? 0) >= 2 || (v.emozioni.paura ?? 0) >= 3;
    if (!triste) return null;
    const svegli = s.animali.filter((a) => a.fase !== 'uovo' && !a.addormentato);
    if (!svegli.length) return null;
    giaConfortati.add(v.id);
    const a = svegli[v.id.length % svegli.length];
    scena?.guardaAnimale(a.id);
    const belli = a.ricordi.filter((r) => !r.frase.includes('difficile'));
    const k = Date.now();
    const frase = belli.length >= 3
      ? scegli(frasi.conforto.conosciuto, k).replace('{ricordo}', scegli(belli, k).frase.replace(/^Giada /, '').replace(/\.$/, '') + '.')
      : scegli(frasi.conforto.generale, k);
    return [{ chi: chiDice(a), voce: 'animale', testo: `Giada… ho pensato a te. ${frase}` }];
  }

  // ---------- la festa di compleanno di Giada ----------
  type PassoFesta = { testo: string; chi?: string; bottone: string; soffia?: boolean };
  let fs = $state<{ passo: PassoFesta | null; pronto: boolean } | null>(null);
  let avantiFesta: (() => void) | null = null;
  /** Mostra un passo dello spettacolo e aspetta che Giada tocchi il bottone. */
  let giro = 0; // cambia uscendo dal villaggio: la festa lasciata a metà non va avanti da sola
  function passoFesta(p: PassoFesta, attesa = 900): Promise<void> {
    const g = giro;
    return new Promise((ok) => {
      fs = { passo: null, pronto: false };
      setTimeout(() => {
        if (g !== giro) return;
        if (!fs) return ok();
        fs = { passo: p, pronto: true };
        avantiFesta = ok;
      }, attesa);
    });
  }
  function toccaFesta() {
    if (!fs?.pronto) return;
    fs.pronto = false;
    const f = avantiFesta;
    avantiFesta = null;
    f?.();
  }

  const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  async function festaDiCompleanno() {
    if (!scena) return;
    const oggi = dataDiOggi();
    const n = quantaFesta(s);
    const tutti = invitati(s, 99);
    const chiFa = invitati(s, 4);
    const chef = chiHaFattoLaTorta(s);
    const musica = chiSuona(s);
    const k = Date.now();
    scena.impostaFesta(true);
    scena.radunaFesta(true);
    scena.inquadraFesta(false);
    const ritardo = festaInRitardo(oggi) && app.provaCompleanno !== 1;
    const quante = n > 1 ? ` È la ${ordinale(n)} festa che facciamo insieme!` : '';
    await passoFesta({
      chi: 'Corvo',
      testo: ritardo
        ? `Cra! Giada, finalmente! Il 24 luglio era il tuo compleanno e ti abbiamo aspettata: una festa così non si fa senza di te!${quante}`
        : `Cra! Lo sai che giorno è oggi? È il 24 luglio: il tuo compleanno! Tutto il villaggio ha preparato una festa per te.${quante}`,
      bottone: 'Avanti',
    }, 1600);
    scena.inquadraFesta(true);
    const torta = chef
      ? `${maiuscola(nomeAnimale(chef))} ha preparato una torta a tre piani, con la panna e le fragole. Ci ha lavorato tutta la notte!`
      : tutti.length
        ? 'Gli animali hanno preparato insieme una torta a tre piani, con la panna e le fragole!'
        : 'Ho preparato una torta a tre piani, con la panna e le fragole. Da solo! Beh… con un po\' di aiuto dalle formiche.';
    await passoFesta({ chi: 'Corvo', testo: musica ? `${torta} E ${nomeAnimale(musica)} suona per te!` : torta, bottone: 'Avanti' }, 1300);
    for (const [i, a] of chiFa.entries()) {
      scena.inquadra({ tipo: 'animale', id: a.id });
      await passoFesta({ chi: chiDice(a), testo: auguriDi(a, k + i), bottone: 'Avanti' }, 1100);
    }
    if (tutti.length > chiFa.length) {
      scena.inquadraFesta(false);
      await passoFesta({ chi: 'Corvo', testo: `E ci sono proprio tutti: ${tutti.length} amici del villaggio, venuti per te!`, bottone: 'Avanti' }, 1100);
    }
    scena.inquadraFesta(true);
    await passoFesta({ testo: 'Ora chiudi gli occhi, esprimi un desiderio… e soffia sulle candeline!', bottone: '🎂 Soffia!', soffia: true }, 1100);
    scena.soffiaCandeline();
    await soffiaCandeline();
    if (app.provaCompleanno === 1) app.provaCompleanno = 2;
    scena.inquadraFesta('cielo');
    await passoFesta({
      testo: tutti.length ? '♪ Tanti auguri a te, tanti auguri a te, tanti auguri, cara Giada, tanti auguri a te! ♪' : '♪ Tanti auguri a te! ♪ Cra cra!',
      chi: tutti.length ? 'Tutti insieme' : 'Corvo',
      bottone: 'Grazie!',
    }, 2200);
    scena.inquadraFesta(false);
    await passoFesta({
      chi: 'Corvo',
      testo: `Il villaggio ti regala ${CASTAGNE_IN_REGALO} castagne, come il giorno del tuo compleanno. E stasera, quando fa buio, guarda il cielo: ci sono i fuochi d'artificio!`,
      bottone: 'Che bello!',
    }, 600);
    fs = null;
    scena.fineCinema();
    // si balla ancora un po', poi ognuno torna alle sue cose (gli addobbi restano tutto il giorno)
    setTimeout(() => scena?.radunaFesta(false), 30_000);
  }

  onMount(() => {
    try {
      scena = new Scena(canvas);
    } catch {
      erroreGrafica = true;
      return;
    }
    scena.onTocco = tocco;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).scena = scena;
    if (!attivo) scena.sospendi(true);
  });

  /** Si entra nel villaggio (la prima volta, o tornando dal diario o da un'altra pagina). */
  function entraNelVillaggio() {
    if (!scena) return;
    scena.sospendi(false);
    // chi è nato senza che Giada l'abbia visto resta uovo finché non guarda la schiusa
    const sorprese = sorpreseDaMostrare();
    scena.trattieni(sorprese.filter((e) => e.tipo === 'schiusa').map((e) => e.animale!));
    scena.aggiorna($state.snapshot(app.stato!) as typeof s);
    // le case che c'erano già restano dove sono: da ora in poi il posto delle case nuove lo sceglie Giada
    if (s.arredo?.caseFissate === undefined) {
      const vecchie = scena.caseSenzaPosto();
      cambiaArredo((st) => {
        for (const k of vecchie) { const p = scena!.postoDi(k); if (p) sposta(st, k, p); }
        arredoDi(st).caseFissate = true;
      });
    }
    // le postazioni di lavoro davanti alle case hanno bisogno di spazio: le case troppo vicine si allargano (una volta)
    if (!s.arredo?.caseLarghe) cambiaArredo((st) => { allargaCase(arredoDi(st)); arredoDi(st).caseLarghe = true; });
    const fareFesta = app.provaCompleanno === 1 || festaDaFare(s, dataDiOggi());
    if (inFesta) scena.impostaFesta(true, !fareFesta);
    aggiornaMeteo();
    timerMeteo = setInterval(aggiornaMeteo, 60_000);
    timerFunghi = setInterval(controllaRientri, 10_000);
    setTimeout(controllaRientri, 2500);

    // il giorno del compleanno, prima di tutto la festa; poi il resto
    const g = giro;
    if (fareFesta) festaDiCompleanno().then(() => g === giro && accogli(sorprese));
    else accogli(sorprese);
  }

  /** Si va su un'altra pagina: il villaggio si ferma e tutto quello che era aperto si chiude (come prima, quando si smontava). */
  function esciDalVillaggio() {
    giro += 1;
    clearInterval(timerMeteo);
    clearInterval(timerFunghi);
    sp = null; fs = null; poi = null; dopoDialogo = null; avantiFesta = null;
    dialogo = null; chiediNome = null; insegnaA = null; menu = false; arreda = false; aiuolaDaAprire = null; casaNuova = null;
    casa = null; pesca = null; acquario = false; museo = false; funghi = false; luogo = null; gita = null; quadroAperto = null;
    faccia = null; consiglioAperto = false; aPiedi = false; inPrimoPiano = null;
    rientriDaDire = [];
    giaChiesto.clear();
    if (!scena) return;
    scena.fineCinema();
    scena.esciAPiedi();
    scena.sospendi(true);
  }

  /** Cosa succede appena si entra (quello che si vede in primo piano non si ripete nel fumetto). */
  function accogli(sorprese: Evento[]) {
    if (!scena) return;
    const giaInPrimoPiano = new Set(sorprese.map((e) => e.testo));
    const daDiario = app.codaDialoghi.length > 0;
    const conforto = daDiario ? null : serveConforto();
    let primo: DialogoAperto | null = null;
    if (daDiario) {
      primo = { righe: app.codaDialoghi.filter((r) => !giaInPrimoPiano.has(r.testo)) };
      app.codaDialoghi = [];
    } else if (app.mentreEriVia.length) {
      const altri = app.mentreEriVia.filter((e) => !giaInPrimoPiano.has(e.testo)).slice(-6);
      if (altri.length || conforto) primo = { righe: [...(sorprese.length ? [] : [corvo('bentornata')]), ...dalCorvo(altri), ...(conforto ?? [])] };
      chiudiMentreEriVia();
    } else if (conforto) {
      primo = { righe: conforto };
    } else if (s.numeroVoci === 0) {
      primo = { righe: [corvo('primo_uovo')] };
    } else if (s.edifici.length + s.animali.filter((a) => a.mestiere).length >= 2 && !s.arredo?.oggetti?.some((o) => o.tipo === 'cartello')) {
      // il villaggio si allarga: il corvo suggerisce (una volta sola) di mettere dei cartelli
      leggiMeta('consiglioCartelli', false).then((visto) => {
        if (visto || dialogo || sp) return;
        scriviMeta('consiglioCartelli', true);
        dialogo = { righe: [corvo('', 'Il villaggio si sta allargando, cra! Le case sono lontane tra loro… Perché non metti dei cartelli per indicare la via? Tocca 🪴 Arreda, poi «Cose».')] };
      });
    } else if (s.numeroVoci >= 5 && giorniTra(s.ultimoBackupRicordato ?? s.inizio, dataDiOggi()) >= 30) {
      primo = { righe: [corvo('backup')], tipo: 'backup' };
    } else {
      const c = prendiConsiglio();
      if (c) primo = { righe: [corvo('', `Lo sapevi? ${c.testo}`)] };
    }
    if (primo && !primo.righe.length) primo = null;
    // dopo una giornata particolare scritta nel diario, il corvo propone una gita in un posto lontano
    if (daDiario && gitaPossibile) {
      const g = gitaPossibile.giornata;
      const invito = g === 'felice'
        ? 'Che giornata speciale! Per festeggiare, perché non fai una gita in uno dei posti lontani? Laggiù ci aspettano.'
        : 'Dopo una giornata così, cra, a volte fa bene andare un po\' lontano. Ti va una gita? Nei posti lontani c\'è chi ha delle storie da raccontarti.';
      primo = { righe: [...(primo?.righe ?? []), corvo('', invito)], tipo: 'escursione' };
    }
    if (sorprese.length) {
      const titolo = daDiario ? 'Guarda!' : 'Mentre eri via…';
      // dopo una giornata difficile prima parla il corvo, con calma; altrimenti subito la sorpresa
      if (daDiario && !app.festa && primo) {
        dialogo = primo;
        dopoDialogo = () => avviaSpettacolo(sorprese, titolo);
      } else {
        poi = primo;
        avviaSpettacolo(sorprese, titolo);
      }
      app.festa = 0;
    } else {
      dialogo = primo;
    }
    if (app.festa) {
      setTimeout(() => scena?.festeggia(), 300);
      app.festa = 0;
    }
  }
  onDestroy(() => {
    clearInterval(timerMeteo);
    clearInterval(timerFunghi);
    scena?.distruggi();
  });

  // tiene la scena allineata allo stato del gioco (solo mentre si guarda il villaggio: tornando, prima si
  // trattengono nell'uovo i nati da far vedere, poi si aggiorna)
  let dentro = false;
  $effect(() => {
    const snap = JSON.stringify(app.stato);
    const on = attivo;
    const sc = scena;
    untrack(() => {
      if (!sc || !snap) return;
      if (!on) {
        if (dentro) { dentro = false; esciDalVillaggio(); }
        return;
      }
      if (!dentro) { dentro = true; entraNelVillaggio(); }
      else sc.aggiorna(JSON.parse(snap));
    });
  });

  // chi si costruisce la casa chiede a Giada dove metterla (quando non sta succedendo altro)
  $effect(() => {
    void JSON.stringify(app.stato?.arredo?.posti);
    void app.stato?.animali.map((a) => a.mestiere).join();
    void app.stato?.edifici.length;
    if (!scena || sp || dialogo || arreda || casa || menu || chiediNome || insegnaA || acquario || museo || funghi || luogo || pesca || gita) return;
    const k = scena.caseSenzaPosto().find((x) => !giaChiesto.has(x));
    if (!k) return;
    giaChiesto.add(k);
    const a = k.startsWith('b:') ? s.animali.find((x) => x.id === k.slice(2)) : undefined;
    const ed = k.startsWith('e:') ? REGOLE.edifici.find((e) => e.tipo === k.slice(2)) : k.startsWith('c:') ? REGOLE.costruzioni.find((c) => c.id === k.slice(2)) : undefined;
    scena.guarda(new THREE.Vector3(scena.postoDi(k)?.x ?? 0, 0, scena.postoDi(k)?.z ?? 0));
    dialogo = a
      ? { tipo: 'casa', chiave: k, righe: [{ chi: chiDice(a), voce: 'animale', testo: `Giada! Mi costruisco la mia casa da ${a.mestiere ? nomeMestiere(a) : 'grande'}! Dove la metto? Scegli tu il posto più bello.` }] }
      : k === 'c:acquario'
        ? { tipo: 'casa', chiave: k, righe: [corvo('', 'Cra! Che meraviglia, l\'acquario è pronto! È grande grande: l\'abbiamo messo un po\' in disparte, ma puoi spostarlo dove vuoi. Scegli tu il posto, poi toccalo per guardare i pesci.')] }
        : k === 'c:museo'
        ? { tipo: 'casa', chiave: k, righe: [corvo('', 'Cra! Il museo è pronto, con le colonne e la cupola! L\'abbiamo messo un po\' in disparte: scegli tu il posto. Dentro ci vanno le cose che trovi in giro e i funghi del bosco.')] }
        : { tipo: 'casa', chiave: k, righe: [corvo('', `Cra! Si costruisce ${(ed?.nome ?? 'un edificio nuovo').toLowerCase()}! Dove lo mettiamo? Scegli tu il posto.`)] };
  });

  function scegliPostoCasa(k: string) {
    dialogo = null;
    casaNuova = k;
    arreda = true;
  }

  function fineArredo() {
    // se Giada ha detto «Fatto» senza spostarla, la casa resta lì dov'è: quel posto ora è suo
    const k = casaNuova;
    if (k && scena && !s.arredo?.posti[k]) {
      const p = scena.postoDi(k);
      if (p) cambiaArredo((st) => sposta(st, k, p));
    }
    arreda = false;
    aiuolaDaAprire = null;
    casaNuova = null;
  }

  async function tocco(b: Bersaglio) {
    if (chiediNome || insegnaA || sp || fs || pesca || acquario || museo || funghi || luogo || gita) return;
    const n = s.numeroVoci + Math.floor(Date.now() / 1000);
    if (b.tipo === 'quaderno') return vai('diario');
    if (b.tipo === 'laghetto') return vaiAPescare();
    if (b.tipo === 'acquario') return apriAcquario();
    if (b.tipo === 'museo') return apriMuseo();
    if (b.tipo === 'ritrovamento') {
      const p = await prendiRitrovamentoQui();
      if (!p) return;
      const d = RITROVAMENTO[p.id];
      scena?.festeggia();
      const dove = !p.nuovo
        ? 'Ce l\'hai già nella collezione: la regali al corvo, che ti dà una castagna.'
        : haMuseo(s) ? `La porti subito al museo! I visitatori pagano il biglietto: +${p.castagne} 🌰.` : 'La tieni da parte: quando costruirai il museo, la potrai mettere in vetrina.';
      dialogo = { righe: [{ chi: 'Hai trovato…', voce: 'narratore', testo: `${d.icona} ${d.nome}! ${d.frase}` }, { chi: 'Corvo', voce: 'corvo', testo: dove }] };
      return;
    }
    if (b.tipo === 'sentiero') {
      dialogo = null;
      luogo = BIOMA[b.id] ?? null;
      scena?.inquadraSentiero(b.id); // la telecamera guarda lontano, giù per il sentiero
      return;
    }
    if (b.tipo === 'aiuola') {
      aiuolaDaAprire = b.id;
      arreda = true;
      return;
    }
    if (b.tipo === 'quadretto') {
      quadroAperto = s.arredo?.quadretti.find((q) => q.id === b.id)?.disegno ?? null;
      return;
    }
    if (b.tipo === 'castagne') {
      const k = await raccogliQui();
      if (k) {
        scena?.raccolte();
        dialogo = { righe: [{ chi: 'Castagno', voce: 'narratore', testo: `Hai raccolto ${k} castagne! Ora ne hai ${s.ghiande}.` }] };
      } else {
        dialogo = { righe: [{ chi: 'Castagno', voce: 'narratore', testo: 'Per ora non ci sono castagne mature. Ne cadono un po\' ogni giorno, finché scrivi nel diario.' }] };
      }
      return;
    }
    if (b.tipo === 'castoro') {
      if (!s.castoro) return;
      const giorni = giorniAllAlbero(s.castoro, dataDiOggi());
      dialogo = { righe: [{ chi: 'Castoro', voce: 'animale', testo: scena?.castoroDorme
        ? 'Zzz… crunch… zzz… (il castoro dorme accanto al suo albero)'
        : `Crunch crunch! Sto rosicchiando questo albero, piano piano. ${giorni === 1 ? 'Domani cade!' : `Ancora ${giorni} giorni e cade.`}${s.castoro.totale ? ` Finora ne ho fatti cadere ${s.castoro.totale}.` : ''}` }] };
      return;
    }
    if (b.tipo === 'corvo') {
      const capitolo = STORIA.filter((c) => s.capitoli.includes(c.id)).at(-1);
      const righe = [corvo('', scegli(frasi.animali.consigli, n).replace('a noi animali', 'a noi uccelli'))];
      if (inFesta) righe.unshift(corvo('', 'Buon compleanno, Giada! Cra cra! È la festa più bella dell\'anno.'));
      else if (eVigilia(dataDiOggi())) righe.unshift(corvo('', scegli(FRASI_VIGILIA, n)));
      if (s.castagneMature >= 3) righe.unshift(corvo('', 'Sotto il castagno ci sono castagne mature. Toccale per raccoglierle!'));
      if (capitolo && n % 3 === 0) righe.unshift(corvo('', `Hai letto l'ultimo capitolo, «${capitolo.titolo}»? Lo trovi nella Storia.`));
      dialogo = { righe };
      return;
    }
    if (b.tipo === 'uovo') {
      const a = s.animali.find((x) => x.id === b.id);
      if (!a) return;
      const m = a.vociPerSchiudersi;
      dialogo = { righe: [{ chi: 'Uovo', voce: 'narratore', testo: `Toc toc… Dentro si muove qualcosa. ${m === 1 ? 'Manca una pagina di diario' : `Mancano ${m} pagine di diario`} perché si schiuda.` }] };
      return;
    }
    if (b.tipo === 'bottega') {
      const a = s.animali.find((x) => x.id === b.id);
      if (!a) return;
      return entra(a);
    }
    if (b.tipo === 'nido') return entra(null);
    if (b.tipo === 'edificio') {
      const def = REGOLE.edifici.find((e) => e.tipo === b.tipo_edificio);
      const e = s.edifici.find((x) => x.tipo === b.tipo_edificio);
      const g = s.animali.find((a) => a.id === e?.gestore);
      const stato = e?.stato === 'attivo' ? 'È pieno di vita!' : e?.stato === 'lento' ? 'Va un po\' piano in questi giorni.' : 'Per ora è fermo.';
      dialogo = { righe: [{ chi: g ? chiDice(g) : (def?.nome ?? ''), voce: 'animale', testo: `Benvenuta ${(def?.nome ?? '').replace(/^Il /, 'al ').replace(/^La /, 'alla ')}! ${stato}` }] };
      return;
    }
    const a = s.animali.find((x) => x.id === b.id);
    if (!a) return;
    if (!a.nome) {
      chiediNome = a;
      nome = '';
      return;
    }
    const righe: RigaDialogo[] = [];
    if (a.addormentato) {
      righe.push({ chi: chiDice(a), voce: 'animale', testo: accorda(frasi.animali.addormentato[0], a) });
    } else {
      // passare a salutare può esaudire una richiesta
      const ev = await salutaAnimale(a.id);
      if (ev.length) {
        scena?.festeggia();
        righe.push({ chi: chiDice(a), voce: 'animale', testo: 'Sei venuta! Lo sapevo!' }, ...dalCorvo(ev));
      }
      const r = s.richiesta?.animale === a.id ? s.richiesta : null;
      if (r) righe.push({ chi: chiDice(a), voce: 'animale', testo: testoRichiesta(s, r) });
      else if (a.studio) {
        const def = REGOLE.abilita.find((d) => d.id === a.studio!.id);
        const mancano = Math.max(1, giorniTra(dataDiOggi(), a.studio.fine));
        righe.push({ chi: chiDice(a), voce: 'animale', testo: `Sto imparando: ${def?.nome.toLowerCase()}! Ancora ${mancano === 1 ? 'un giorno' : `${mancano} giorni`} e ce la faccio.` });
      } else if (!ev.length) {
        let testo: string;
        if (inFesta && !fs && n % 2 === 0) testo = fraseDiFesta(a, n);
        else if (a.ricordi.length && n % 2 === 0) testo = scegli(frasi.animali.ricordo, n).replace('{ricordo}', scegli(a.ricordi, n).frase);
        else if (a.umore >= 45 && n % 3 !== 0 && scena) testo = fraseCarattere(a, scena.momento(), n); // parla a modo suo
        else testo = scegli(a.umore < 45 ? frasi.animali.richiesta : frasi.animali.saluto, n);
        righe.push({ chi: chiDice(a), voce: 'animale', testo });
      }
    }
    dialogo = { righe, animale: a, tipo: 'animale' };
  }

  async function confermaNome() {
    if (!chiediNome || !nome.trim()) return;
    const a = chiediNome;
    const ev = await rinominaAnimale(a.id, nome);
    chiediNome = null;
    scena?.festeggia();
    dialogo = { righe: [{ chi: `${nome.trim()} ${simbolo(a)}`, voce: 'animale', testo: `${nome.trim()}… mi piace tantissimo! Grazie, Giada!` }, ...dalCorvo(ev)] };
  }

  async function scegliAbilita(a: Animale, d: DefAbilita) {
    const ev = await insegnaQui(a.id, d.id);
    insegnaA = null;
    if (!ev) return;
    const premio = s.eventi.slice(-2).filter((e) => e.tipo === 'richiesta');
    if (premio.length) scena?.festeggia();
    dialogo = { righe: [{ chi: chiDice(a), voce: 'animale', testo: 'Evviva! Mi impegnerò tantissimo!' }, { chi: 'Corvo', voce: 'corvo', testo: ev.testo }, ...dalCorvo(premio)] };
  }

  let dataTesto = $derived(new Date(dataDiOggi() + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));
</script>

<div class="gioco" style:display={attivo ? null : 'none'}>
  <canvas bind:this={canvas} class="mondo"></canvas>
  {#if attivo}
  {#if casa}
    <Casa abitanti={casa.abitanti} proprietario={casa.proprietario} momento={() => scena?.momento() ?? 'lavoro'} onchiudi={esci} />
  {/if}
  {#if pesca}
    <Pesca {scena} momento={pesca} onchiudi={smettiDiPescare} />
  {/if}
  {#if acquario}
    <div class="sotto-acquario"><Acquario onchiudi={chiudiAcquario} /></div>
  {/if}
  {#if museo}
    <div class="sotto-acquario"><Museo onchiudi={chiudiMuseo} /></div>
  {/if}
  {#if funghi}
    <div class="sotto-acquario"><Funghi onchiudi={() => (funghi = false)} oncucinato={() => scena?.festeggia()} /></div>
  {/if}
  {#if gita}
    <Escursione {scena} voce={gita.voce} giornata={gita.giornata} onchiudi={() => (gita = null)} />
  {/if}
  {#if luogo}
    {@const l = luogo}
    <div class="sotto-acquario"><Luogo luogo={l} onchiudi={() => { luogo = null; scena?.fineCinema(); }} /></div>
  {/if}
  {#if scena && !fs && !sp && !casa && !pesca && !gita && !acquario && !museo && !funghi && !luogo && !faccia && !menu}
    <APiedi {scena} bind:attivo={aPiedi} conLevetta={!dialogo && !chiediNome && !insegnaA} />
  {/if}
  {#if erroreGrafica}
    <div class="errore">Questo telefono non riesce a disegnare il bosco in 3D.</div>
  {/if}

  {#if quadroAperto}
    <button class="quadro-grande" onclick={() => (quadroAperto = null)} aria-label="Chiudi">
      <img src={quadroAperto} alt="Un quadretto di Giada" />
    </button>
  {/if}
  {#if fs}
    <div class="cinema festa">
      <div class="banda">
        <div class="titolo-cinema">🎂 Buon compleanno, Giada!</div>
      </div>
      <div class="sottotitolo-cinema">
        {#if fs.passo}
          {#key fs.passo.testo}
            <p class="testo-cinema">
              {#if fs.passo.chi}<span class="chi-festa">{fs.passo.chi}</span>{/if}
              {fs.passo.testo}
            </p>
          {/key}
          {#if fs.pronto}
            <button class={['tondo', 'avanti', fs.passo.soffia && 'soffia']} onclick={toccaFesta}>{fs.passo.bottone}</button>
          {/if}
        {/if}
      </div>
    </div>
  {:else if sp}
    <div class="cinema">
      <div class="banda">
        <div class="titolo-cinema">{sp.titolo}</div>
        {#if sp.passi.length > 1}<div class="conta">{sp.i + 1} di {sp.passi.length}</div>{/if}
        {#if sp.pronto && sp.passi.length - sp.i > 2}<button class="salta" onclick={saltaTutto}>Salta ⏭</button>{/if}
      </div>
      <div class="sottotitolo-cinema">
        {#key sp.testo}
          {#if sp.testo}<p class="testo-cinema">{sp.testo}</p>{/if}
        {/key}
        {#if sp.pronto && sp.nome}
          <input type="text" bind:value={nome} maxlength="24" placeholder="Scrivi un nome" />
          <div class="riga">
            <button class="tondo grigio" onclick={avanti}>Dopo</button>
            <button class="tondo" disabled={!nome.trim()} onclick={nomeNelloSpettacolo}>Ecco!</button>
          </div>
        {:else if sp.pronto}
          <button class="tondo avanti" onclick={avanti}>{sp.i + 1 < sp.passi.length ? 'Avanti' : 'Che bello!'}</button>
        {/if}
      </div>
    </div>
  {:else if arreda && scena}
    <Arredo scena={scena} apri={aiuolaDaAprire} nuova={casaNuova} onchiudi={fineArredo} />
  {:else}
  {#if faccia && dialogo?.animale}
    {@const a = dialogo.animale}
    <div class="primo-piano">
      <div class="targhetta">
        <div class="chi-e">{a.nome || nomeAnimale(a)} {simbolo(a)}</div>
        <div class="che-tipo">{carattereDi(a).emoji} {nomeCarattere(a)} · {conArticolo(a)}{a.mestiere ? ` · ${nomeMestiere(a)}` : ''}</div>
      </div>
    </div>
  {:else}
  <header class="hud-alto">
    <div class="sinistra">
      <div class="pillola nome-villaggio">{s.nomeVillaggio}</div>
      <button class="pillola aiuto-gioco" aria-label="Come si gioca" onclick={() => vai('guida')}>?</button>
    </div>
    <div class="destra">
      <div class="pillola data">{inFesta ? '🎂' : NOME_METEO[tempo].icona} {dataTesto}</div>
      <div class="pillola castagne">🌰 {s.ghiande ?? 0}</div>
    </div>
  </header>
  {/if}

  <div class="sotto">
    {#if chiediNome}
      <div class="pannello nome-box">
        <div class="titoletto">Come si chiama {conArticolo(chiediNome)}? <span class="sesso">{chiediNome.sesso === 'f' ? '♀ è una femmina' : '♂ è un maschio'}</span></div>
        <input type="text" bind:value={nome} maxlength="24" placeholder="Scrivi un nome" />
        <div class="riga">
          <button class="tondo grigio" onclick={() => (chiediNome = null)}>Dopo</button>
          <button class="tondo" disabled={!nome.trim()} onclick={confermaNome}>Ecco!</button>
        </div>
      </div>
    {:else if insegnaA}
      {@const a = insegnaA}
      <div class="finestra-gioco">
        <div class="testata">COSA IMPARA {(a.nome || nomeAnimale(a)).toUpperCase()}?</div>
        <ul>
          {#each abilitaPossibili(s, a) as d (d.id)}
            <li><button class="voce" onclick={() => scegliAbilita(a, d)}><span>{d.simbolo} {d.nome}</span><span class="giorni">{d.giorni} giorni</span></button></li>
          {:else}
            <li class="vuoto">Ha già imparato tutto quello che si può, per ora. Costruendo cose nuove si sbloccano altre attività.</li>
          {/each}
        </ul>
        <p class="aiuto">Impara solo nei giorni in cui è sveglio. Poi lo vedrai farlo nel villaggio.</p>
        <button class="tondo grigio chiudi" onclick={() => (insegnaA = null)}>Chiudi</button>
      </div>
    {:else if dialogo}
      {#key giroDialogo}
      <Dialogo righe={dialogo.righe} onfine={chiudiDialogo} onriga={(r) => { if (r.voce === 'corvo') scena?.faiParlareCorvo(Math.min(4, r.testo.length / 28)); inquadraChiParla(r); }}>
        {#snippet azioni()}
          {#if dialogo?.tipo === 'animale' && dialogo.animale && consiglioAperto}
            <textarea class="racconto" bind:value={testoConsiglio} rows="3" maxlength="500" placeholder="Scrivi qui cosa ti passa per la testa… (se vuoi)"></textarea>
            <button class="tondo" onclick={daiConsiglio}>{testoConsiglio.trim() ? 'Ecco' : 'Dimmelo tu'}</button>
            <button class="tondo grigio" onclick={() => (consiglioAperto = false)}>Lascia stare</button>
          {:else if dialogo?.tipo === 'animale' && dialogo.animale}
            {@const a = dialogo.animale}
            {#if a.nome && !a.addormentato}
              <div class="domande">
                {#each DOMANDE as d (d.id)}
                  <button class="domanda" onclick={() => chiedi(d.id)}><span>{d.icona}</span> {d.testo(a)}</button>
                {/each}
              </div>
            {/if}
            {#if a.fase !== 'cucciolo' && !a.studio && !a.addormentato}
              <button class="tondo" onclick={() => { dialogo = null; insegnaA = a; }}>{a.sesso === 'f' ? 'Insegnale' : 'Insegnagli'} qualcosa</button>
            {/if}
            {#if a.mestiere}<button class="tondo grigio" onclick={() => entra(a)}>🏠 Casa</button>{/if}
            <button class="tondo grigio" onclick={() => { dialogo = null; vai('animale', a.id); }}>Scheda</button>
            <button class="tondo grigio" onclick={() => (dialogo = null)}>Ciao!</button>
          {:else if dialogo?.tipo === 'casa' && dialogo.chiave}
            {@const k = dialogo.chiave}
            <button class="tondo" onclick={() => scegliPostoCasa(k)}>📍 Scegli il posto</button>
            <button class="tondo grigio" onclick={() => (dialogo = null)}>Più tardi</button>
          {:else if dialogo?.tipo === 'escursione' && gitaPossibile}
            <button class="tondo" onclick={apriGita}>🎒 Andiamo!</button>
            <button class="tondo grigio" onclick={() => (dialogo = null)}>Più tardi</button>
          {:else if dialogo?.tipo === 'backup'}
            <button class="tondo" onclick={() => { dialogo = null; vai('impostazioni'); }}>Salviamo</button>
            <button class="tondo grigio" onclick={() => { dialogo = null; segnaBackupFatto(); }}>Più tardi</button>
          {:else}
            <button class="tondo" onclick={chiudiDialogo}>Ok!</button>
          {/if}
        {/snippet}
      </Dialogo>
      {/key}
    {:else if menu}
      <MenuCostruisci
        onchiudi={() => (menu = false)}
        oncostruito={(ev) => {
          menu = false;
          scena?.festeggia();
          dialogo = { righe: [{ chi: 'Corvo', voce: 'corvo', testo: ev.testo }] };
        }}
      />
    {:else if !acquario && !museo && !funghi && !luogo && !gita}
      <div class={['azioni-basso', gitaPossibile && 'affollate']}>
        <button class="bottone-diario" onclick={() => vai('diario')}>
          <span class="icona">📖</span> Scrivi nel diario
        </button>
        <button class="bottone-costruisci" onclick={() => (menu = true)} aria-label="Costruisci">
          🔨<span class="punto" class:visibile={puoCostruire}></span>
        </button>
        <button class="bottone-costruisci arreda" onclick={() => (arreda = true)} aria-label="Arreda">🪴</button>
        <button class="bottone-costruisci funghi" onclick={() => { dialogo = null; funghi = true; }} aria-label="Funghi">🍄{#if nelBosco}<span class="fuori">{nelBosco}</span>{/if}<span class="punto" class:visibile={haFunghi && !nelBosco}></span></button>
        {#if gitaPossibile}
          <button class="bottone-costruisci gita" onclick={apriGita} aria-label="Escursione">🎒<span class="punto visibile"></span></button>
        {/if}
      </div>
      <p class="suggerimento">{aPiedi ? 'Tocca chi vuoi per parlarci · trascina per guardarti intorno' : 'Tocca chi vuoi · 1 dito muove · 2 dita zoom e giro'}</p>
    {/if}
  </div>
  {/if}
  {/if}
</div>

<style>
  .gioco { user-select: none; -webkit-user-select: none; position: fixed; inset: 0; max-width: 560px; margin: 0 auto; overflow: hidden; background: #bfe3f2; }
  /* il villaggio riempie tutto lo schermo (anche sul computer largo); bottoni e fumetti restano nella colonna al centro */
  .mondo { position: fixed; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
  .sotto-acquario { position: absolute; left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); z-index: 5; }
  .errore { position: absolute; top: 40%; left: 16px; right: 16px; text-align: center; background: var(--panna); padding: 16px; border-radius: 18px; }
  .hud-alto { position: absolute; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
  .sinistra { display: flex; gap: 8px; align-items: flex-start; min-width: 0; max-width: 62%; }
  .aiuto-gioco { flex: none; pointer-events: auto; padding: 5px 13px; font-weight: 900; text-shadow: none; }
  .pillola {
    background: var(--panna); border: 3px solid var(--legno); border-radius: 999px; padding: 5px 14px;
    font-weight: 800; color: var(--inchiostro); box-shadow: 0 4px 0 var(--legno-scuro); font-size: 0.95rem;
    animation: cade 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .nome-villaggio { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .data { text-transform: capitalize; }
  @keyframes cade { from { transform: translateY(-40px); opacity: 0; } to { transform: none; opacity: 1; } }
  .sotto { position: absolute; left: 12px; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); }
  .destra { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .castagne { color: #7a4a1a; }
  .sesso { display: block; font-size: 0.85rem; color: var(--testo-tenue); }
  .azioni-basso { display: flex; gap: 8px; align-items: center; }
  .azioni-basso.affollate .bottone-costruisci { width: 52px; height: 52px; font-size: 1.35rem; }
  .azioni-basso.affollate .bottone-diario { font-size: 1.02rem; padding: 12px 8px; }
  .bottone-costruisci {
    position: relative; width: 62px; height: 62px; flex: none; border-radius: 50%; padding: 0; font-size: 1.6rem;
    background: var(--notte-blu); border: 4px solid var(--legno); box-shadow: 0 6px 0 var(--legno-scuro);
  }
  .punto { position: absolute; top: -2px; right: -2px; width: 18px; height: 18px; border-radius: 50%; background: #ffd166; border: 3px solid var(--legno); transform: scale(0); transition: transform 0.2s; }
  .punto.visibile { transform: scale(1); animation: respira 1.2s infinite; }
  .bottone-diario {
    flex: 1; font-size: 1.2rem; padding: 14px; border-radius: 999px;
    background: var(--brace); border: 4px solid var(--legno); box-shadow: 0 6px 0 var(--legno-scuro);
    animation: respira 2.4s ease-in-out infinite;
  }
  .bottone-diario .icona { font-size: 1.3rem; }
  @keyframes respira { 50% { transform: scale(1.03); } }
  .suggerimento { text-align: center; color: #fff; font-weight: 700; font-size: 0.8rem; margin-top: 10px; text-shadow: 0 1px 2px #0008; }
  .nome-box { animation: entra 0.28s cubic-bezier(0.2, 1.5, 0.4, 1) both; }
  .titoletto { font-weight: 800; font-size: 1.1rem; margin-bottom: 10px; }
  .nome-box input { margin-bottom: 10px; }
  @keyframes entra { from { transform: scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
  /* finestra da gioco di ruolo (come il menu Costruisci) */
  .finestra-gioco {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.94), rgba(18, 28, 70, 0.96));
    border: 3px solid #d8e4ff; outline: 3px solid #1a2350; border-radius: 14px; color: #f2f6ff;
    padding: 12px 12px 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); max-height: 60dvh;
    display: flex; flex-direction: column; animation: apri 0.25s ease-out both;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .finestra-gioco .testata { font-weight: 900; letter-spacing: 0.08em; border-bottom: 2px solid rgba(216, 228, 255, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
  .finestra-gioco ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
  .finestra-gioco .voce {
    width: 100%; display: flex; justify-content: space-between; background: rgba(255, 255, 255, 0.06); border: 2px solid transparent;
    box-shadow: none; border-radius: 8px; color: #f2f6ff; padding: 9px 10px; margin-bottom: 4px; text-shadow: none;
  }
  .finestra-gioco .voce:hover, .finestra-gioco .voce:focus { border-color: #ffe08a; }
  .giorni { color: #ffe08a; }
  .vuoto, .aiuto { font-size: 0.85rem; color: #c4cff0; margin: 8px 2px; }
  .chiudi { align-self: center; }
  .arreda { background: #3f7a4a; }
  .gita { background: #c8842a; }
  .funghi { background: #a8483a; }
  .fuori { position: absolute; bottom: -4px; right: -4px; min-width: 20px; height: 20px; border-radius: 999px; background: #3f7a4a; color: #fff; font-size: 0.72rem; font-weight: 900; display: flex; align-items: center; justify-content: center; border: 2px solid var(--legno); }
  /* faccia a faccia con un animale */
  .primo-piano { position: fixed; inset: 0; pointer-events: none; }
  .primo-piano::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse at 50% 42%, transparent 50%, rgba(10, 8, 30, 0.42) 100%);
    animation: appare 0.8s ease-out both;
  }
  .targhetta {
    position: absolute; top: calc(12px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%); z-index: 1;
    background: var(--panna); border: 3px solid var(--legno); border-radius: 18px; box-shadow: 0 4px 0 var(--legno-scuro);
    padding: 6px 18px 7px; text-align: center; white-space: nowrap; max-width: 92%; animation: cade 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .chi-e { font-weight: 900; font-size: 1.15rem; color: var(--inchiostro); }
  .che-tipo { font-weight: 700; font-size: 0.8rem; color: var(--testo-tenue); overflow: hidden; text-overflow: ellipsis; }
  .domande { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; }
  .domanda {
    background: #fff6dc; color: var(--inchiostro); border: 2px solid var(--legno); box-shadow: 0 3px 0 var(--legno-scuro);
    border-radius: 14px; padding: 8px 10px; font-size: 0.9rem; font-weight: 800; text-align: left; text-shadow: none; line-height: 1.2;
  }
  .domanda span { font-size: 1.05rem; }
  .racconto { width: 100%; font: inherit; font-size: 1rem; padding: 10px 12px; border-radius: 14px; border: 2px solid var(--legno); background: #fffdf6; resize: none; }
  .quadro-grande { position: absolute; inset: 0; z-index: 10; background: rgba(10, 14, 40, 0.7); display: flex; align-items: center; justify-content: center; border: none; border-radius: 0; box-shadow: none; padding: 24px; }
  .quadro-grande img { width: 100%; max-width: 420px; image-rendering: pixelated; border: 14px solid #9a6a40; border-radius: 6px; box-shadow: 0 10px 30px #0008; }
  /* primo piano: bande da film, titolo e didascalia */
  .cinema { position: absolute; inset: 0; pointer-events: none; }
  .cinema::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(10, 8, 30, 0.45) 100%);
    animation: appare 0.8s ease-out both;
  }
  .banda {
    position: absolute; top: 0; left: 0; right: 0; z-index: 1; padding: calc(14px + env(safe-area-inset-top)) 16px 14px;
    background: linear-gradient(180deg, rgba(8, 6, 20, 0.92), rgba(8, 6, 20, 0.75)); text-align: center;
    animation: scendeBanda 0.6s cubic-bezier(0.2, 1.2, 0.4, 1) both;
  }
  .titolo-cinema { font-weight: 900; font-size: 1.5rem; color: #ffe08a; letter-spacing: 0.02em; text-shadow: 0 2px 0 #7a4a1a; }
  .conta { color: #d8d4f0; font-weight: 700; font-size: 0.85rem; margin-top: 2px; }
  .sottotitolo-cinema {
    position: absolute; left: 12px; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); z-index: 1;
    display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: auto;
  }
  .testo-cinema {
    margin: 0; background: rgba(12, 10, 30, 0.82); color: #fff; font-weight: 800; font-size: 1.15rem; line-height: 1.35;
    padding: 12px 18px; border-radius: 16px; border: 2px solid rgba(255, 224, 138, 0.6); text-align: center;
    animation: entra 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  .sottotitolo-cinema input { max-width: 320px; }
  .sottotitolo-cinema .riga { display: flex; gap: 10px; }
  .salta {
    position: absolute; right: 12px; top: calc(14px + env(safe-area-inset-top)); padding: 6px 14px; font-size: 0.85rem; pointer-events: auto;
    background: rgba(255, 255, 255, 0.15); color: #fff; border: 2px solid rgba(255, 255, 255, 0.5); box-shadow: none; text-shadow: none;
  }
  .avanti { min-width: 160px; animation: entra 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both; }
  @keyframes appare { from { opacity: 0; } }
  .festa .banda { background: linear-gradient(180deg, rgba(120, 30, 70, 0.92), rgba(90, 20, 60, 0.78)); }
  .festa .titolo-cinema { color: #fff0a8; }
  .chi-festa { display: block; font-size: 0.85rem; color: #ffe08a; margin-bottom: 4px; letter-spacing: 0.02em; }
  .soffia { font-size: 1.35rem; padding: 14px 30px; background: #e8465f; animation: entra 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both, respira 1.1s ease-in-out 0.4s infinite; }
  @keyframes scendeBanda { from { transform: translateY(-100%); } }
</style>
