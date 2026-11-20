<script lang="ts">
  // Schermata principale: la radura in 3D. Si tocca un animale, il corvo, il quaderno, le uova.
  import { onDestroy, onMount } from 'svelte';
  import Dialogo from '../componenti/Dialogo.svelte';
  import frasi from '../dati/frasi.json';
  import { app, chiudiMentreEriVia, dataDiOggi, rinominaAnimale, segnaBackupFatto, vai, type RigaDialogo } from '../lib/app.svelte';
  import { giorniTra } from '../lib/date';
  import { accorda, conArticolo, nomeAnimale, REGOLE, statoCostruzione, STORIA } from '../lib/gioco';
  import MenuCostruisci from '../componenti/MenuCostruisci.svelte';
  import type { Animale } from '../lib/tipi';
  import { Scena, type Bersaglio } from '../scena/scena';

  let canvas: HTMLCanvasElement;
  let scena: Scena | null = null;
  let s = $derived(app.stato!);

  type Dialogo = { righe: RigaDialogo[]; animale?: Animale; tipo?: 'animale' | 'backup' };
  let dialogo = $state<Dialogo | null>(null);
  let chiediNome = $state<Animale | null>(null);
  let nome = $state('');
  let erroreGrafica = $state(false);
  let menu = $state(false);
  let puoCostruire = $derived(REGOLE.costruzioni.some((c) => statoCostruzione(s, c) === 'pronta'));
  const simbolo = (a: Animale) => (a.sesso === 'f' ? '♀' : '♂');

  const C = frasi.corvo as Record<string, string>;
  const corvo = (id: string, testo?: string): RigaDialogo => ({ chi: 'Corvo', testo: testo ?? C[id], voce: 'corvo', audioId: testo ? undefined : id });
  const scegli = <T,>(l: T[], k: number) => l[Math.abs(k) % l.length];

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

    // cosa succede appena si entra
    if (app.codaDialoghi.length) {
      dialogo = { righe: app.codaDialoghi };
      app.codaDialoghi = [];
    } else if (app.mentreEriVia.length) {
      dialogo = { righe: [corvo('bentornata'), ...app.mentreEriVia.slice(-6).map((e) => ({ chi: 'Corvo', testo: e.testo, voce: 'corvo' as const }))] };
      chiudiMentreEriVia();
    } else if (s.numeroVoci === 0) {
      dialogo = { righe: [corvo('primo_uovo')] };
    } else if (s.numeroVoci >= 5 && giorniTra(s.ultimoBackupRicordato ?? s.inizio, dataDiOggi()) >= 30) {
      dialogo = { righe: [corvo('backup')], tipo: 'backup' };
    }
    if (app.festa) {
      setTimeout(() => scena?.festeggia(), 300);
      app.festa = 0;
    }
  });
  onDestroy(() => scena?.distruggi());

  // tiene la scena allineata allo stato del gioco
  $effect(() => {
    const snap = JSON.stringify(app.stato);
    if (scena && snap) scena.aggiorna(JSON.parse(snap));
  });

  function tocco(b: Bersaglio) {
    if (chiediNome) return;
    const n = s.numeroVoci + Math.floor(Date.now() / 1000);
    if (b.tipo === 'quaderno') return vai('diario');
    if (b.tipo === 'corvo') {
      const capitolo = STORIA.filter((c) => s.capitoli.includes(c.id)).at(-1);
      const righe = [corvo('', scegli(frasi.animali.consigli, n).replace('a noi animali', 'a noi uccelli'))];
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
      dialogo = { righe: [{ chi: nomeAnimale(a), voce: 'animale', testo: `Questa è la mia bottega! Qui faccio ${a.sesso === 'f' ? 'la' : 'il'} ${a.mestiere}. L'ho costruita grazie alle tue giornate.` }] };
      return;
    }
    if (b.tipo === 'edificio') {
      const def = REGOLE.edifici.find((e) => e.tipo === b.tipo_edificio);
      const e = s.edifici.find((x) => x.tipo === b.tipo_edificio);
      const g = s.animali.find((a) => a.id === e?.gestore);
      const stato = e?.stato === 'attivo' ? 'È pieno di vita!' : e?.stato === 'lento' ? 'Va un po\' piano in questi giorni.' : 'Per ora è fermo.';
      dialogo = { righe: [{ chi: g ? nomeAnimale(g) : (def?.nome ?? ''), voce: 'animale', testo: `Benvenuta ${(def?.nome ?? '').replace(/^Il /, 'al ').replace(/^La /, 'alla ')}! ${stato}` }] };
      return;
    }
    const a = s.animali.find((x) => x.id === b.id);
    if (!a) return;
    if (!a.nome) {
      chiediNome = a;
      nome = '';
      return;
    }
    let testo: string;
    if (a.addormentato) testo = accorda(frasi.animali.addormentato[0], a);
    else if (a.ricordi.length && n % 2 === 0) testo = scegli(frasi.animali.ricordo, n).replace('{ricordo}', scegli(a.ricordi, n).frase);
    else testo = scegli(a.umore < 45 ? frasi.animali.richiesta : frasi.animali.saluto, n);
    dialogo = { righe: [{ chi: `${a.nome} ${simbolo(a)}`, voce: 'animale', testo }], animale: a, tipo: 'animale' };
  }

  async function confermaNome() {
    if (!chiediNome || !nome.trim()) return;
    const a = chiediNome;
    await rinominaAnimale(a.id, nome);
    chiediNome = null;
    scena?.festeggia();
    dialogo = { righe: [{ chi: nome.trim(), voce: 'animale', testo: `${nome.trim()}… mi piace tantissimo! Grazie, Giada!` }] };
  }

  let dataTesto = $derived(new Date(dataDiOggi() + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }));
</script>

<div class="gioco">
  <canvas bind:this={canvas} class="mondo"></canvas>
  {#if erroreGrafica}
    <div class="errore">Questo telefono non riesce a disegnare il bosco in 3D.</div>
  {/if}

  <header class="hud-alto">
    <div class="pillola nome-villaggio">{s.nomeVillaggio}</div>
    <div class="destra">
      <div class="pillola data">{dataTesto}</div>
      <div class="pillola ghiande">🌰 {s.ghiande ?? 0}</div>
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
    {:else if dialogo}
      <Dialogo righe={dialogo.righe} onfine={() => (dialogo = null)} onriga={(r) => r.voce === 'corvo' && scena?.faiParlareCorvo(Math.min(4, r.testo.length / 28))}>
        {#snippet azioni()}
          {#if dialogo?.tipo === 'animale' && dialogo.animale}
            {@const a = dialogo.animale}
            <button class="tondo" onclick={() => { dialogo = null; vai('animale', a.id); }}>La sua scheda</button>
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
      <p class="suggerimento">Tocca chi vuoi · trascina per girare · pizzica per lo zoom</p>
    {/if}
  </div>
</div>

<style>
  .gioco { position: fixed; inset: 0; max-width: 560px; margin: 0 auto; overflow: hidden; background: #bfe3f2; }
  .mondo { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
  .errore { position: absolute; top: 40%; left: 16px; right: 16px; text-align: center; background: var(--panna); padding: 16px; border-radius: 18px; }
  .hud-alto { position: absolute; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; pointer-events: none; }
  .pillola {
    background: var(--panna); border: 3px solid var(--legno); border-radius: 999px; padding: 5px 14px;
    font-weight: 800; color: var(--inchiostro); box-shadow: 0 4px 0 var(--legno-scuro); font-size: 0.95rem;
    animation: cade 0.5s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
  .nome-villaggio { max-width: 62%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .data { text-transform: capitalize; }
  @keyframes cade { from { transform: translateY(-40px); opacity: 0; } to { transform: none; opacity: 1; } }
  .sotto { position: absolute; left: 12px; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); }
  .destra { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .ghiande { color: #7a4a1a; }
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
</style>
