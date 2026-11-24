<script lang="ts">
  // Pescare al laghetto, visto da fuori: Giada sceglie chi mandare, l'animale va in fondo al pontile e lancia.
  // Si aspetta che il galleggiante vada sotto (il punto esclamativo!), si tocca in tempo, e poi o fa tutto
  // lui ("Fai tu") o Giada tira su toccando lo schermo, senza tendere troppo la lenza ("Tiro io").
  // Ogni pesce va nel quaderno dei pesci; i primi pesci del giorno danno una castagna.
  import { onDestroy, onMount } from 'svelte';
  import { app, dataDiOggi, pescaQui } from '../lib/app.svelte';
  import { nomeAnimale, REGOLE } from '../lib/gioco';
  import { SIMBOLO_SPECIE } from '../lib/etichette';
  import {
    attesa, cosaAbbocca, esperto, finestraAbbocco, misura, nuovaLotta, passoLotta, PESCI, recuperoDaSolo, tiraLenza,
    type DefPesce, type Lotta, type Momento,
  } from '../lib/pesca';
  import type { Animale } from '../lib/tipi';
  import type { Scena } from '../scena/scena';
  import type { Pescata } from '../scena/pesca3d';

  let { scena, momento, onchiudi }: { scena: Scena | null; momento: Momento; onchiudi: () => void } = $props();

  type Fase = 'scegli' | 'lancio' | 'attesa' | 'abbocca' | 'ferrato' | 'tira' | 'lotta' | 'preso' | 'rotta' | 'scappato' | 'presto';
  let fase = $state<Fase>('scegli');
  let chi = $state<Animale | null>(null);
  let quaderno = $state(false);
  let preso = $state<{ pesce: DefPesce; cm: number; ghiande: number; nuovo: boolean; record: boolean } | null>(null);
  let lotta = $state<Lotta | null>(null);
  let pesce: DefPesce | null = null; // chi ha abboccato (si decide quando abbocca)
  let r2 = 0.5;
  let pescata: Pescata | null = null;
  let timer: ReturnType<typeof setTimeout>[] = [];
  let raf = 0;
  const dopo = (ms: number, f: () => void) => timer.push(setTimeout(f, ms));
  const pulisci = () => { timer.forEach(clearTimeout); timer = []; cancelAnimationFrame(raf); };
  // mentre si pesca la barra in basso e i bottoni del villaggio si nascondono
  onMount(() => document.body.classList.add('pescando'));
  onDestroy(() => { pulisci(); document.body.classList.remove('pescando'); scena?.finePesca(); });

  const presi = $derived(app.stato?.pesca?.presi ?? {});
  const quantiTipi = $derived(PESCI.filter((p) => presi[p.id]).length);
  const oggi = $derived(app.stato?.pesca?.giorno === dataDiOggi() ? app.stato.pesca.oggi : 0);
  // chi può andare a pescare: tutti quelli nati e svegli (prima chi è bravo)
  const candidati = $derived((app.stato?.animali ?? []).filter((a) => a.fase !== 'uovo' && !a.addormentato)
    .sort((a, b) => Number(esperto(b)) - Number(esperto(a))));
  const nome = (a: Animale | null) => { const n = a ? (a.nome || nomeAnimale(a)) : ''; return n.charAt(0).toUpperCase() + n.slice(1); };
  const bravo = $derived(!!chi && esperto(chi));

  function manda(a: Animale) {
    if (!scena) return;
    pescata = scena.iniziaPesca(a.id);
    if (!pescata) return;
    chi = a;
    // il tempo di arrivare in fondo al pontile, poi lancia
    fase = 'lancio';
    dopo(900, lancia);
  }

  function cambiaAnimale() {
    pulisci();
    scena?.finePesca();
    pescata = null;
    preso = null;
    lotta = null;
    fase = 'scegli';
  }

  function lancia() {
    pulisci();
    if (!pescata) return;
    preso = null;
    lotta = null;
    scena?.inquadraLancio();
    pescata.lancia();
    fase = 'lancio';
    // quando il galleggiante è in acqua si comincia ad aspettare
    pescata.quandoInAcqua = () => {
      if (fase !== 'lancio') return;
      fase = 'attesa';
      const t = attesa(Date.now()) * 1000 * (bravo ? 0.75 : 1);
      // un paio di assaggi prima del morso vero, per tenere un po' di suspense
      for (const k of [0.35, 0.7]) if (Math.random() < 0.6) dopo(t * k, () => pescata?.assaggia());
      dopo(t, abbocca);
    };
  }

  function abbocca() {
    fase = 'abbocca';
    pescata?.abbocca();
    if (navigator.vibrate) navigator.vibrate([80, 40, 120]);
    // (solo per le prove sul computer: window.pescaLenta allunga il tempo per toccare)
    const lenta = import.meta.env.DEV && (window as unknown as { pescaLenta?: boolean }).pescaLenta ? 20 : 1;
    dopo(finestraAbbocco(bravo) * 1000 * lenta, () => {
      if (fase !== 'abbocca') return;
      fase = 'scappato';
      pescata?.perso(false);
      dopo(2200, lancia);
    });
  }

  /** Un tocco sull'acqua: troppo presto, in tempo, o per tirare su. */
  function tocca() {
    if (fase === 'attesa') {
      pulisci();
      fase = 'presto';
      pescata?.perso(false);
      dopo(2000, lancia);
    } else if (fase === 'abbocca') {
      pulisci();
      const m = cosaAbbocca(momento, Math.random(), 0.5);
      pesce = m.pesce;
      r2 = Math.random();
      pescata?.ferra();
      if (navigator.vibrate) navigator.vibrate(40);
      fase = 'ferrato';
    } else if (fase === 'lotta' && lotta) {
      tiraLenza(lotta);
      pescata?.tocco();
      if (navigator.vibrate) navigator.vibrate(15);
      lotta = lotta;
    }
  }

  /** "Fai tu": l'animale tira su da solo, con qualche strattone del pesce. */
  function faiTu() {
    if (!pesce) return;
    fase = 'tira';
    const riesce = recuperoDaSolo(bravo, pesce.raro, Math.random());
    const durata = 3.2;
    let t0 = performance.now();
    const passo = (ora: number) => {
      const k = Math.min(1, (ora - t0) / 1000 / durata);
      const fine = riesce ? 1 : 0.65;
      const dist = 1 - k * fine + Math.sin(k * 18) * 0.03;
      const strattone = Math.sin(k * 11) > 0.6;
      pescata?.recupero(dist, 0.35 + (strattone ? 0.3 : 0), strattone);
      if (k < 1) { raf = requestAnimationFrame(passo); return; }
      if (riesce) prendi(false);
      else { fase = 'scappato'; pescata?.perso(false); dopo(2200, lancia); }
    };
    raf = requestAnimationFrame(passo);
  }

  /** "Tiro io": Giada tocca per avvolgere la lenza. */
  function tiroIo() {
    if (!pesce) return;
    lotta = nuovaLotta(pesce, bravo);
    fase = 'lotta';
    let prima = performance.now();
    const passo = (ora: number) => {
      const dt = Math.min(0.05, (ora - prima) / 1000);
      prima = ora;
      if (!lotta) return;
      passoLotta(lotta, dt);
      pescata?.recupero(lotta.distanza, lotta.tensione, lotta.strattone > 0);
      lotta = lotta; // (per aggiornare le barre)
      if (lotta.esito === 'preso') return prendi(true);
      if (lotta.esito) {
        fase = lotta.esito;
        pescata?.perso(lotta.esito === 'rotta');
        if (navigator.vibrate && lotta.esito === 'rotta') navigator.vibrate(200);
        return;
      }
      raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
  }

  async function prendi(daGiada: boolean) {
    if (!pesce) return;
    const cm = misura(pesce, r2, daGiada);
    pescata?.preso(pesce, cm);
    scena?.inquadraPescato();
    fase = 'preso';
    const r = await pescaQui(pesce.id, cm);
    const p = { pesce, cm, ghiande: r?.ghiande ?? 0, nuovo: !!r?.nuovo, record: !!r?.record };
    dopo(1300, () => (preso = p));
  }

  const tocchi = $derived(fase === 'attesa' || fase === 'abbocca' || fase === 'lotta');
  const testo = $derived.by(() => {
    const n = nome(chi);
    switch (fase) {
      case 'lancio': return `${n} lancia la lenza… splash!`;
      case 'attesa': return 'Aspetta che il galleggiante vada sotto…';
      case 'abbocca': return 'HA ABBOCCATO! Tocca, presto!';
      case 'ferrato': return `Preso all'amo! Chi tira su?`;
      case 'tira': return `${n} tira su la lenza…`;
      case 'lotta':
        if (lotta && lotta.strattone > 0) return 'Il pesce tira! Fermati un attimo!';
        if (lotta && lotta.tensione > 0.72) return 'Piano, piano! La lenza è tesa!';
        return 'Tocca tocca per tirare su!';
      case 'rotta': return 'Crac! La lenza si è rotta. Quando il pesce tira, aspetta un attimo!';
      case 'scappato': return 'Oh, è scappato! Si riprova…';
      case 'presto': return 'Troppo presto: il pesce si è spaventato. Aspetta il punto esclamativo!';
      default: return '';
    }
  });
</script>

{#snippet disegno(p: DefPesce, sagoma = false)}
  {@const c = sagoma ? '#8a7a6a' : p.colore}
  {@const pa = sagoma ? '#8a7a6a' : p.pancia}
  {@const pi = sagoma ? '#7a6a5a' : p.pinne}
  <svg viewBox="0 0 120 70" class="pesce-svg" aria-hidden="true">
    {#if p.id === 'stivale'}
      <path d="M45 8 h26 v34 h20 q10 0 10 12 v6 h-56 z" fill={c} stroke="#2a3a1a" stroke-width="3" />
      <rect x="43" y="6" width="30" height="8" rx="3" fill={pa} />
    {:else if p.id === 'bottiglia'}
      <path d="M20 26 h52 q8 0 12 -6 h14 v30 h-14 q-4 -6 -12 -6 h-52 q-6 0 -6 -6 v-6 q0 -6 6 -6z" fill={c} opacity="0.85" stroke="#3a6a5a" stroke-width="3" />
      <rect x="98" y="22" width="8" height="26" rx="2" fill={pi} />
      {#if !sagoma}<rect x="30" y="30" width="34" height="10" rx="2" fill={pa} transform="rotate(-6 47 35)" />{/if}
    {:else if p.forma === 'serpente'}
      <path d="M8 38 q20 -22 40 0 t40 0 q12 -10 24 -4 q-8 10 -24 10 q-20 18 -40 0 t-40 4z" fill={c} stroke="#2a2a1a" stroke-width="2" />
      <circle cx="104" cy="36" r="2.5" fill="#111" />
    {:else}
      {@const ry = p.forma === 'tondo' ? 22 : p.forma === 'lungo' ? 13 : 17}
      {@const rx = p.forma === 'lungo' ? 44 : 38}
      <path d={`M${60 - rx + 6} 35 L8 ${35 - ry} L14 35 L8 ${35 + ry}Z`} fill={pi} />
      <path d={`M48 ${35 - ry + 2} q12 -14 26 -2z`} fill={pi} />
      <ellipse cx="62" cy="35" rx={rx} ry={ry} fill={c} stroke="rgba(0,0,0,0.35)" stroke-width="2" />
      <ellipse cx="66" cy={35 + ry * 0.35} rx={rx * 0.75} ry={ry * 0.5} fill={pa} />
      {#if p.id === 'persico' && !sagoma}{#each [0, 1, 2, 3] as k}<rect x={44 + k * 12} y={35 - ry} width="5" height={ry * 1.3} fill="#3a4a1a" opacity="0.45" rx="2" />{/each}{/if}
      {#if p.id === 'trota' && !sagoma}{#each [0, 1, 2, 3, 4] as k}<circle cx={40 + k * 11} cy={30 + (k % 2) * 6} r="2.2" fill="#d8443a" />{/each}{/if}
      {#if p.id === 'pescegatto' || p.id === 'carpa'}<path d={`M${62 + rx - 4} 40 q8 6 4 14 M${62 + rx - 6} 41 q2 8 -4 12`} stroke={pi} stroke-width="2" fill="none" />{/if}
      <path d={`M60 ${35 + ry - 2} q6 10 14 2z`} fill={pi} />
      <circle cx={62 + rx * 0.62} cy="31" r="4" fill="#fff" />
      <circle cx={62 + rx * 0.64} cy="31" r="2.4" fill={p.id === 'tinca' ? '#c0302a' : '#111'} />
    {/if}
  </svg>
{/snippet}

<div class="pesca">
  <!-- tutta l'acqua si tocca: per ferrare e per tirare su -->
  {#if tocchi}<button class="tocco" onclick={tocca} aria-label="Tocca"></button>{/if}

  <div class="testata">
    <button class="esci" onclick={onchiudi}>← Villaggio</button>
    <div class="titolo">
      <div class="nome">🎣 Laghetto</div>
      <div class="ora">Oggi {oggi} {oggi === 1 ? 'pesce' : 'pesci'}{oggi < REGOLE.pesca.pesciPagatiAlGiorno ? ` · 🌰 ancora ${REGOLE.pesca.pesciPagatiAlGiorno - oggi}` : ''}</div>
    </div>
    <button class="esci" onclick={() => (quaderno = !quaderno)}>📖 {quantiTipi}/{PESCI.length}</button>
  </div>

  {#if fase === 'scegli'}
    <div class="scelta">
      <div class="s-titolo">Chi mandi a pescare?</div>
      {#if candidati.length}
        <div class="lista">
          {#each candidati as a (a.id)}
            <button class="animale" onclick={() => manda(a)}>
              <span class="faccina">{SIMBOLO_SPECIE[a.specie]}</span>
              <span class="a-nome">{nome(a)}</span>
              {#if esperto(a)}<span class="bravo">🎣 bravo</span>{/if}
            </button>
          {/each}
        </div>
        <p class="s-aiuto">Chi ha imparato a pescare aspetta meno e tira su meglio.</p>
      {:else}
        <p class="s-aiuto">Non c'è nessuno sveglio che possa venire a pescare, per ora.</p>
      {/if}
    </div>
  {:else if lotta && fase === 'lotta'}
    <!-- quanto manca alla riva e quanto è tesa la lenza -->
    <div class="barre">
      <div class="strada">
        <span class="b-icona">🐟</span>
        <div class="binario"><div class="pallino" style:left="{Math.max(0, Math.min(1, 1 - lotta.distanza)) * 100}%"></div></div>
        <span class="b-icona">{SIMBOLO_SPECIE[chi?.specie ?? 'volpe']}</span>
      </div>
      <div class="filo" class:teso={lotta.tensione > 0.72 || lotta.strattone > 0}>
        <span class="f-nome">Lenza</span>
        <div class="f-barra"><div class="ago" style:left="{lotta.tensione * 100}%"></div></div>
      </div>
    </div>
  {/if}

  {#if fase !== 'scegli' && fase !== 'preso' && testo}
    <div class="fumetto" class:urgente={fase === 'abbocca' || (fase === 'lotta' && lotta && (lotta.strattone > 0 || lotta.tensione > 0.72))}>
      {testo}
      {#if fase === 'ferrato'}
        <div class="due">
          <button onclick={faiTu}>{SIMBOLO_SPECIE[chi?.specie ?? 'volpe']} Fai tu, {nome(chi)}!</button>
          <button class="io" onclick={tiroIo}>💪 Tiro io!</button>
        </div>
        <span class="piccolo">Se tiri tu, vengono su pesci più grossi.</span>
      {:else if fase === 'rotta' || (fase === 'scappato' && !tocchi && lotta)}
        <div class="due"><button onclick={lancia}>🎣 Riprova</button><button class="grigio" onclick={cambiaAnimale}>Un altro animale</button></div>
      {/if}
    </div>
  {/if}

  {#if preso}
    <div class="carta">
      {#if preso.nuovo}<div class="nuovo">NUOVO!</div>{/if}
      {@render disegno(preso.pesce)}
      <div class="nome-pesce">{preso.pesce.nome}</div>
      {#if preso.pesce.forma !== 'cosa'}<div class="misura">{preso.cm} cm{preso.record ? ' · il più grande finora!' : ''}</div>{/if}
      <p>{preso.pesce.frase}</p>
      <p class="chi-pesca">L'ha {preso.pesce.forma === 'cosa' ? 'ripescato' : 'pescato'} {nome(chi)}!</p>
      {#if preso.ghiande}<p class="premio">+{preso.ghiande} castagna 🌰</p>{/if}
      <div class="bottoni">
        <button class="grigio" onclick={cambiaAnimale}>Un altro</button>
        <button onclick={lancia}>🎣 Ancora!</button>
      </div>
    </div>
  {/if}

  {#if quaderno}
    <div class="quaderno">
      <div class="q-testa"><strong>Il quaderno dei pesci</strong><button class="esci" onclick={() => (quaderno = false)}>Chiudi</button></div>
      <p class="q-sotto">Ne hai trovati {quantiTipi} su {PESCI.length}. Alcuni escono solo la mattina presto o di notte!</p>
      <div class="griglia">
        {#each PESCI as p (p.id)}
          {@const x = presi[p.id]}
          <div class="cella" class:trovato={!!x}>
            {@render disegno(p, !x)}
            <div class="c-nome">{x ? p.nome : '???'}</div>
            {#if x}<div class="c-info">×{x.n}{p.forma !== 'cosa' ? ` · ${x.record} cm` : ''}</div>{/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* si gioca sopra il villaggio vero (in 3D): niente sfondo, solo i comandi */
  :global(body.pescando nav.barra), :global(body.pescando .hud-alto), :global(body.pescando .sotto) { display: none !important; }
  .pesca { position: fixed; inset: 0; max-width: 560px; margin: 0 auto; z-index: 50; pointer-events: none; }
  .pesca > * { pointer-events: auto; }
  .tocco { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; background: none; box-shadow: none; border-radius: 0; touch-action: manipulation; }
  .testata { position: absolute; z-index: 2; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; gap: 8px; align-items: flex-start; }
  .esci {
    flex: none; background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 999px;
    padding: 6px 12px; font-weight: 900; box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none;
  }
  .titolo { flex: 1; min-width: 0; background: var(--panna); border: 3px solid var(--legno); border-radius: 16px; padding: 6px 10px; box-shadow: 0 4px 0 var(--legno-scuro); text-align: center; }
  .nome { font-weight: 900; font-size: 1.05rem; }
  .ora { font-size: 0.78rem; color: var(--testo-tenue); font-weight: 800; }
  .scelta {
    position: absolute; z-index: 3; left: 12px; right: 12px; bottom: calc(16px + env(safe-area-inset-bottom)); max-height: 60dvh; overflow-y: auto;
    background: var(--panna); border: 4px solid var(--legno); border-radius: 22px; padding: 12px; box-shadow: 0 8px 0 var(--legno-scuro);
    animation: pop 0.3s ease-out both;
  }
  .s-titolo { font-weight: 900; font-size: 1.2rem; text-align: center; margin-bottom: 8px; }
  .lista { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .animale {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; background: #fff; color: var(--inchiostro);
    border: 3px solid var(--legno); border-radius: 16px; padding: 8px 6px; box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none; font-weight: 900;
  }
  .faccina { font-size: 1.5rem; }
  .a-nome { font-size: 0.95rem; }
  .bravo { flex-basis: 100%; font-size: 0.72rem; color: #2f7fb8; }
  .s-aiuto { margin: 10px 0 0; font-size: 0.85rem; color: var(--testo-tenue); font-weight: 700; text-align: center; }
  .barre {
    position: absolute; z-index: 2; left: 16px; right: 16px; top: calc(78px + env(safe-area-inset-top)); pointer-events: none;
    background: rgba(255, 253, 246, 0.92); border: 3px solid var(--inchiostro); border-radius: 16px; padding: 8px 12px; display: grid; gap: 8px;
  }
  .strada, .filo { display: flex; align-items: center; gap: 8px; }
  .b-icona { font-size: 1.3rem; }
  .binario { flex: 1; height: 10px; border-radius: 999px; background: linear-gradient(90deg, #4f9fd4, #a8d8f0); position: relative; }
  .pallino { position: absolute; top: 50%; width: 22px; height: 22px; margin-left: -11px; transform: translateY(-50%); border-radius: 50%; background: #e8443a; border: 3px solid #fff; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3); transition: left 0.1s linear; }
  .f-nome { font-weight: 900; font-size: 0.85rem; width: 3.6em; }
  .f-barra { flex: 1; height: 16px; border-radius: 999px; border: 2px solid var(--inchiostro); position: relative;
    background: linear-gradient(90deg, #8fd36a 0 60%, #ffd166 60% 82%, #ff7b6b 82%); }
  .ago { position: absolute; top: -6px; bottom: -6px; width: 8px; margin-left: -4px; border-radius: 4px; background: #3b2616; border: 2px solid #fff; transition: left 0.08s linear; }
  .filo.teso .f-barra { animation: scuoti 0.15s infinite; }
  .fumetto {
    position: absolute; z-index: 2; left: 16px; right: 16px; bottom: calc(24px + env(safe-area-inset-bottom)); pointer-events: none;
    background: #fffdf6; color: var(--inchiostro); border: 3px solid var(--inchiostro); border-radius: 18px;
    padding: 10px 14px; font-weight: 800; font-size: 1.05rem; text-align: center; box-shadow: 0 6px 0 rgba(74, 52, 36, 0.35);
  }
  .fumetto .due, .fumetto button { pointer-events: auto; }
  .fumetto.urgente { background: #ffe066; animation: scuoti 0.25s infinite; font-size: 1.2rem; }
  .due { display: flex; gap: 8px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
  .due button { font-size: 1rem; }
  .due .io { background: #e8743a; }
  .piccolo { display: block; font-size: 0.8rem; color: var(--testo-tenue); margin-top: 6px; }
  .chi-pesca { color: var(--legno); }
  @keyframes scuoti { 50% { transform: translateX(3px) rotate(1deg); } }

  .carta {
    position: absolute; z-index: 3; left: 20px; right: 20px; bottom: calc(16px + env(safe-area-inset-bottom)); max-height: 58dvh; overflow-y: auto; background: var(--panna); border: 4px solid var(--legno);
    border-radius: 22px; padding: 14px 16px 16px; text-align: center; box-shadow: 0 8px 0 var(--legno-scuro);
    animation: pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes pop { from { transform: scale(0.5); opacity: 0; } }
  .carta p { margin: 6px 0; font-weight: 700; }
  .nuovo { position: absolute; top: -14px; right: 16px; background: #e05a4a; color: #fff; font-weight: 900; padding: 2px 10px; border-radius: 999px; transform: rotate(6deg); }
  .pesce-svg { width: 100%; max-height: 80px; }
  .nome-pesce { font-weight: 900; font-size: 1.3rem; }
  .misura { color: var(--testo-tenue); font-weight: 800; }
  .premio { color: #8a5a2a; font-weight: 900 !important; }
  .bottoni { display: flex; gap: 10px; justify-content: center; margin-top: 8px; }
  .q-testa { display: flex; justify-content: space-between; align-items: center; font-size: 1.15rem; }
  .q-sotto { margin: 6px 0 10px; font-size: 0.9rem; color: var(--testo-tenue); font-weight: 700; }
  .griglia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cella { background: #efe2c8; border-radius: 14px; padding: 6px 4px; text-align: center; opacity: 0.7; }
  .cella.trovato { background: #fff; opacity: 1; box-shadow: 0 3px 0 rgba(138, 90, 54, 0.3); }
  .cella .pesce-svg { max-height: 54px; }
  .c-nome { font-weight: 900; font-size: 0.8rem; line-height: 1.1; }
  .c-info { font-size: 0.72rem; color: var(--testo-tenue); font-weight: 700; }

  .quaderno {
    position: absolute; z-index: 4; inset: calc(64px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));
    background: #fbf3e2; border: 4px solid var(--legno); border-radius: 20px; padding: 12px; overflow-y: auto; box-shadow: 0 8px 0 var(--legno-scuro);
  }
</style>
