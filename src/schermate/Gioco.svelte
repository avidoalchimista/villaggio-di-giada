<script lang="ts">
  // Schermata principale: la radura in 3D. Si tocca un animale, il corvo, il quaderno, le uova, le castagne.
  import { onDestroy, onMount } from 'svelte';
  import Dialogo from '../componenti/Dialogo.svelte';
  import MenuCostruisci from '../componenti/MenuCostruisci.svelte';
  import frasi from '../dati/frasi.json';
  import {
    app, chiudiMentreEriVia, dataDiOggi, prendiConsiglio, insegnaQui, raccogliQui, rinominaAnimale, salutaAnimale, segnaBackupFatto, vai,
    type RigaDialogo,
  } from '../lib/app.svelte';
  import { giorniTra } from '../lib/date';
  import {
    abilitaPossibili, accorda, conArticolo, nomeAnimale, REGOLE, statoCostruzione, STORIA, testoRichiesta, type DefAbilita,
  } from '../lib/gioco';
  import { meteo as calcolaMeteo, NOME_METEO, type Meteo } from '../lib/meteo';
  import type { Animale, Evento } from '../lib/tipi';
  import { Scena, type Bersaglio } from '../scena/scena';

  let canvas: HTMLCanvasElement;
  let scena: Scena | null = null;
  let s = $derived(app.stato!);

  type Dialogo = { righe: RigaDialogo[]; animale?: Animale; tipo?: 'animale' | 'backup' };
  let dialogo = $state<Dialogo | null>(null);
  let chiediNome = $state<Animale | null>(null);
  let insegnaA = $state<Animale | null>(null);
  let nome = $state('');
  let erroreGrafica = $state(false);
  let menu = $state(false);
  let tempo = $state<Meteo>('sole');
  let puoCostruire = $derived(REGOLE.costruzioni.some((c) => statoCostruzione(s, c) === 'pronta'));
  const simbolo = (a: Animale) => (a.sesso === 'f' ? '♀' : '♂');

  const C = frasi.corvo as Record<string, string>;
  const corvo = (id: string, testo?: string): RigaDialogo => ({ chi: 'Corvo', testo: testo ?? C[id], voce: 'corvo', audioId: testo ? undefined : id });
  const scegli = <T,>(l: T[], k: number) => l[Math.abs(k) % l.length];
  const dalCorvo = (eventi: Evento[]) => eventi.map((e) => ({ chi: 'Corvo', voce: 'corvo' as const, testo: e.testo }));
  const chiDice = (a: Animale) => `${a.nome || nomeAnimale(a)} ${simbolo(a)}`;

  // il tempo che fa: cambia a fasce di 4 ore, uguale per tutto il giorno a parità di ora
  function aggiornaMeteo() {
    tempo = calcolaMeteo(dataDiOggi(), new Date().getHours(), s.seme);
    scena?.impostaMeteo(tempo);
  }
  let timerMeteo: ReturnType<typeof setInterval> | undefined;

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

  onMount(() => {
    try {
      scena = new Scena(canvas);
    } catch {
      erroreGrafica = true;
      return;
    }
    scena.onTocco = tocco;
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).scena = scena;
    scena.aggiorna($state.snapshot(app.stato!) as typeof s);
    aggiornaMeteo();
    timerMeteo = setInterval(aggiornaMeteo, 60_000);

    // cosa succede appena si entra
    const conforto = app.codaDialoghi.length ? null : serveConforto();
    if (app.codaDialoghi.length) {
      dialogo = { righe: app.codaDialoghi };
      app.codaDialoghi = [];
    } else if (app.mentreEriVia.length) {
      dialogo = { righe: [corvo('bentornata'), ...dalCorvo(app.mentreEriVia.slice(-6)), ...(conforto ?? [])] };
      chiudiMentreEriVia();
    } else if (conforto) {
      dialogo = { righe: conforto };
    } else if (s.numeroVoci === 0) {
      dialogo = { righe: [corvo('primo_uovo')] };
    } else if (s.numeroVoci >= 5 && giorniTra(s.ultimoBackupRicordato ?? s.inizio, dataDiOggi()) >= 30) {
      dialogo = { righe: [corvo('backup')], tipo: 'backup' };
    } else {
      const c = prendiConsiglio();
      if (c) dialogo = { righe: [corvo('', `Lo sapevi? ${c.testo}`)] };
    }
    if (app.festa) {
      setTimeout(() => scena?.festeggia(), 300);
      app.festa = 0;
    }
  });
  onDestroy(() => {
    clearInterval(timerMeteo);
    scena?.distruggi();
  });

  // tiene la scena allineata allo stato del gioco
  $effect(() => {
    const snap = JSON.stringify(app.stato);
    if (scena && snap) scena.aggiorna(JSON.parse(snap));
  });

  async function tocco(b: Bersaglio) {
    if (chiediNome || insegnaA) return;
    const n = s.numeroVoci + Math.floor(Date.now() / 1000);
    if (b.tipo === 'quaderno') return vai('diario');
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
    if (b.tipo === 'corvo') {
      const capitolo = STORIA.filter((c) => s.capitoli.includes(c.id)).at(-1);
      const righe = [corvo('', scegli(frasi.animali.consigli, n).replace('a noi animali', 'a noi uccelli'))];
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
      dialogo = { righe: [{ chi: chiDice(a), voce: 'animale', testo: `Questa è la mia bottega! Qui faccio ${a.sesso === 'f' ? 'la' : 'il'} ${a.mestiere}. L'ho costruita grazie alle tue giornate.` }] };
      return;
    }
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
        if (a.ricordi.length && n % 2 === 0) testo = scegli(frasi.animali.ricordo, n).replace('{ricordo}', scegli(a.ricordi, n).frase);
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

<div class="gioco">
  <canvas bind:this={canvas} class="mondo"></canvas>
  {#if erroreGrafica}
    <div class="errore">Questo telefono non riesce a disegnare il bosco in 3D.</div>
  {/if}

  <header class="hud-alto">
    <div class="sinistra">
      <div class="pillola nome-villaggio">{s.nomeVillaggio}</div>
      <button class="pillola aiuto-gioco" aria-label="Come si gioca" onclick={() => vai('guida')}>?</button>
    </div>
    <div class="destra">
      <div class="pillola data">{NOME_METEO[tempo].icona} {dataTesto}</div>
      <div class="pillola castagne">🌰 {s.ghiande ?? 0}</div>
    </div>
  </header>

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
      <Dialogo righe={dialogo.righe} onfine={() => (dialogo = null)} onriga={(r) => r.voce === 'corvo' && scena?.faiParlareCorvo(Math.min(4, r.testo.length / 28))}>
        {#snippet azioni()}
          {#if dialogo?.tipo === 'animale' && dialogo.animale}
            {@const a = dialogo.animale}
            {#if a.fase !== 'cucciolo' && !a.studio && !a.addormentato}
              <button class="tondo" onclick={() => { dialogo = null; insegnaA = a; }}>{a.sesso === 'f' ? 'Insegnale' : 'Insegnagli'} qualcosa</button>
            {/if}
            <button class="tondo grigio" onclick={() => { dialogo = null; vai('animale', a.id); }}>Scheda</button>
            <button class="tondo grigio" onclick={() => (dialogo = null)}>Ciao!</button>
          {:else if dialogo?.tipo === 'backup'}
            <button class="tondo" onclick={() => { dialogo = null; vai('impostazioni'); }}>Salviamo</button>
            <button class="tondo grigio" onclick={() => { dialogo = null; segnaBackupFatto(); }}>Più tardi</button>
          {:else}
            <button class="tondo" onclick={() => (dialogo = null)}>Ok!</button>
          {/if}
        {/snippet}
      </Dialogo>
    {:else if menu}
      <MenuCostruisci
        onchiudi={() => (menu = false)}
        oncostruito={(ev) => {
          menu = false;
          scena?.festeggia();
          dialogo = { righe: [{ chi: 'Corvo', voce: 'corvo', testo: ev.testo }] };
        }}
      />
    {:else}
      <div class="azioni-basso">
        <button class="bottone-diario" onclick={() => vai('diario')}>
          <span class="icona">📖</span> Scrivi nel diario
        </button>
        <button class="bottone-costruisci" onclick={() => (menu = true)} aria-label="Costruisci">
          🔨<span class="punto" class:visibile={puoCostruire}></span>
        </button>
      </div>
      <p class="suggerimento">Tocca chi vuoi · 1 dito muove · 2 dita zoom e giro</p>
    {/if}
  </div>
</div>

<style>
  .gioco { position: fixed; inset: 0; max-width: 560px; margin: 0 auto; overflow: hidden; background: #bfe3f2; }
  .mondo { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
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
  .azioni-basso { display: flex; gap: 10px; align-items: center; }
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
</style>
