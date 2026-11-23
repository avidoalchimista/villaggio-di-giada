<script lang="ts">
  // Pescare al laghetto: si lancia la lenza, si aspetta che il galleggiante vada sotto e si tira su.
  // Ogni pesce va nel quaderno dei pesci; i primi pesci del giorno danno una ghianda.
  import { onDestroy, onMount } from 'svelte';
  import { app, dataDiOggi, pescaQui } from '../lib/app.svelte';
  import { nomeAnimale } from '../lib/gioco';
  import { attesa, cosaAbbocca, PESCI, type DefPesce, type Momento } from '../lib/pesca';
  import { REGOLE } from '../lib/gioco';

  let { momento, onchiudi }: { momento: Momento; onchiudi: () => void } = $props();

  type Fase = 'pronta' | 'lancio' | 'attesa' | 'abbocca' | 'preso' | 'scappato' | 'presto';
  let fase = $state<Fase>('pronta');
  let quaderno = $state(false);
  let preso = $state<{ pesce: DefPesce; cm: number; ghiande: number; nuovo: boolean; record: boolean } | null>(null);
  let tremolio = $state(false); // un pesce assaggia l'esca
  let timer: ReturnType<typeof setTimeout>[] = [];
  const dopo = (ms: number, f: () => void) => timer.push(setTimeout(f, ms));
  const pulisci = () => { timer.forEach(clearTimeout); timer = []; };
  // mentre si pesca la barra in basso si nasconde (copriva il pontile)
  onMount(() => document.body.classList.add('pescando'));
  onDestroy(() => { pulisci(); document.body.classList.remove('pescando'); });

  const presi = $derived(app.stato?.pesca?.presi ?? {});
  const quantiTipi = $derived(PESCI.filter((p) => presi[p.id]).length);
  const oggi = $derived(app.stato?.pesca?.giorno === dataDiOggi() ? app.stato.pesca.oggi : 0);
  // chi sa pescare viene a farle compagnia
  const compagno = $derived(app.stato?.animali.find((a) => a.fase !== 'uovo' && (a.abilita.includes('pescare') || a.mestiere === 'pescatore')) ?? null);
  const nomeCompagno = $derived(compagno ? (compagno.nome || nomeAnimale(compagno)) : '');

  function lancia() {
    pulisci();
    preso = null;
    fase = 'lancio';
    dopo(700, () => {
      fase = 'attesa';
      const t = attesa(Date.now()) * 1000;
      // un paio di assaggi prima del morso vero, per tenere un po' di suspense
      for (const k of [0.35, 0.7]) if (Math.random() < 0.6) dopo(t * k, () => { tremolio = true; dopo(400, () => (tremolio = false)); });
      dopo(t, () => {
        fase = 'abbocca';
        if (navigator.vibrate) navigator.vibrate(120);
        dopo(1500, () => { if (fase === 'abbocca') fase = 'scappato'; });
      });
    });
  }

  async function tira() {
    if (fase === 'pronta' || fase === 'scappato' || fase === 'presto' || fase === 'preso') return lancia();
    if (fase === 'attesa') { pulisci(); fase = 'presto'; tremolio = false; return; }
    if (fase !== 'abbocca') return;
    pulisci();
    const m = cosaAbbocca(momento, Math.random(), Math.random());
    const r = await pescaQui(m.pesce.id, m.cm);
    preso = { ...m, ghiande: r?.ghiande ?? 0, nuovo: !!r?.nuovo, record: !!r?.record };
    fase = 'preso';
  }

  const CIELO: Record<Momento, [string, string]> = {
    mattina: ['#ffd9b0', '#bfe3f5'], giorno: ['#8fd0f5', '#d8f0fb'], sera: ['#f6a77a', '#f9d6a0'], notte: ['#1f2a52', '#3a4a7a'],
  };
  const cielo = $derived(CIELO[momento]);
  const testo = $derived(({
    pronta: 'Tocca l\'acqua per lanciare la lenza!',
    lancio: 'Splash!',
    attesa: tremolio ? 'Qualcosa assaggia l\'esca… aspetta!' : 'Aspetta che il galleggiante vada giù…',
    abbocca: 'HA ABBOCCATO! Tocca, presto!',
    scappato: 'Oh, è scappato! Tocca l\'acqua per riprovare.',
    presto: 'Troppo presto: il pesce si è spaventato. Riprova!',
    preso: '',
  } as Record<Fase, string>)[fase]);
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

<div class="pesca" style="--cielo1:{cielo[0]};--cielo2:{cielo[1]}">
  <div class="testata">
    <button class="esci" onclick={onchiudi}>← Villaggio</button>
    <div class="titolo">
      <div class="nome">🎣 Laghetto</div>
      <div class="ora">Oggi {oggi} {oggi === 1 ? 'pesce' : 'pesci'}{oggi < REGOLE.pesca.pesciPagatiAlGiorno ? ` · 🌰 ancora ${REGOLE.pesca.pesciPagatiAlGiorno - oggi}` : ''}</div>
    </div>
    <button class="esci" onclick={() => (quaderno = !quaderno)}>📖 {quantiTipi}/{PESCI.length}</button>
  </div>

  <!-- la scena disegnata: si tocca l'acqua per lanciare e per tirare -->
  <button class="lago" onclick={tira} aria-label="Pesca">
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cielo1)" /><stop offset="1" stop-color="var(--cielo2)" /></linearGradient>
        <linearGradient id="acqua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color={momento === 'notte' ? '#24406a' : '#5aaee0'} /><stop offset="1" stop-color={momento === 'notte' ? '#16284a' : '#2f7fb8'} /></linearGradient>
      </defs>
      <rect width="400" height="800" fill="url(#cielo)" />
      {#if momento === 'notte'}{#each [[40, 40], [120, 80], [300, 50], [360, 120], [210, 30]] as [x, y]}<circle cx={x} cy={y} r="2" fill="#fff" />{/each}<circle cx="320" cy="70" r="18" fill="#fff6d8" />{/if}
      <!-- la riva lontana con il bosco -->
      <path d="M0 190 q60 -40 120 -10 q70 -50 150 -5 q70 -30 130 10 v40 h-400z" fill={momento === 'notte' ? '#1e3a2e' : '#5a9a4a'} />
      {#each [20, 70, 150, 230, 300, 360] as x, i}
        <path d={`M${x} ${200 - (i % 2) * 14} l22 -60 l22 60z`} fill={momento === 'notte' ? '#16302a' : '#3e7a3a'} />
      {/each}
      <rect y="220" width="400" height="580" fill="url(#acqua)" />
      {#each [[60, 260, 50], [250, 300, 70], [130, 420, 40], [290, 520, 60]] as [x, y, l]}
        <rect x={x} y={y} width={l} height="3" rx="1.5" fill="#fff" opacity="0.35" />
      {/each}
      <!-- ninfee -->
      {#each [[70, 340, 28], [320, 400, 32], [110, 560, 36]] as [x, y, r], i}
        <ellipse cx={x} cy={y} rx={r} ry={r * 0.4} fill="#4f9a50" />
        {#if i !== 1}<circle cx={x + 6} cy={y - 6} r="7" fill={i ? '#ffffff' : '#ff9ab8'} /><circle cx={x + 6} cy={y - 6} r="2.5" fill="#ffd34d" />{/if}
      {/each}
      <!-- canne palustri -->
      {#each [[352, 0], [366, 1], [340, 2], [40, 3], [56, 4]] as [x, k]}
        <path d={`M${x} 800 q${k % 2 ? 6 : -6} -120 0 -${220 + k * 18}`} stroke="#4a8a3a" stroke-width="5" fill="none" />
        <rect x={x - 5 + (k % 2 ? 2 : -2)} y={800 - 220 - k * 18 - 6} width="10" height="34" rx="5" fill="#7a4a26" />
      {/each}
      <!-- la lenza e il galleggiante -->
      {#if fase !== 'pronta' && fase !== 'preso'}
        {@const sotto = fase === 'abbocca'}
        {@const gy = fase === 'lancio' ? 380 : 430}
        <line x1="110" y1="640" x2="210" y2={gy - 8} stroke="#f4f4f4" stroke-width="1.5" opacity="0.8" />
        <g class="galleggiante" class:balla={fase === 'attesa' && !tremolio} class:trema={tremolio} class:sotto class:vola={fase === 'lancio'} style="transform-origin: 210px {gy}px">
          <ellipse cx="210" cy={gy + 4} rx="18" ry="5" fill="#fff" opacity="0.4" />
          <path d={`M201 ${gy} a9 9 0 0 1 18 0z`} fill="#e03a3a" />
          <path d={`M201 ${gy} a9 9 0 0 0 18 0z`} fill="#ffffff" />
          <rect x="208.5" y={gy - 20} width="3" height="12" fill="#e03a3a" />
        </g>
        {#if sotto}
          <circle cx="210" cy={gy + 2} r="26" fill="none" stroke="#fff" stroke-width="3" class="onda" />
          <text x="246" y={gy - 26} class="esclamativo">!</text>
        {/if}
      {/if}
      <!-- il pontile e la canna di Giada -->
      <path d="M0 700 h400 v100 h-400z" fill="#a8743e" />
      {#each [0, 1, 2, 3, 4, 5, 6, 7] as k}<rect x={k * 52} y="700" width="4" height="100" fill="#7a5028" />{/each}
      <rect y="694" width="400" height="10" fill="#c48c58" />
      <line x1="50" y1="800" x2="110" y2="640" stroke="#6a4024" stroke-width="7" stroke-linecap="round" />
      <circle cx="68" cy="752" r="10" fill="#3a3a3a" />
    </svg>
  </button>

  {#if fase !== 'preso'}
    <div class="fumetto" class:urgente={fase === 'abbocca'}>
      {testo}
      {#if compagno && fase === 'pronta'}<span class="compagno">{nomeCompagno.charAt(0).toUpperCase() + nomeCompagno.slice(1)} pesca con te 🎣</span>{/if}
    </div>
  {/if}

  {#if preso}
    <div class="carta">
      {#if preso.nuovo}<div class="nuovo">NUOVO!</div>{/if}
      {@render disegno(preso.pesce)}
      <div class="nome-pesce">{preso.pesce.nome}</div>
      {#if preso.pesce.forma !== 'cosa'}<div class="misura">{preso.cm} cm{preso.record ? ' · il più grande finora!' : ''}</div>{/if}
      <p>{preso.pesce.frase}</p>
      {#if preso.ghiande}<p class="premio">+{preso.ghiande} ghianda 🌰</p>{/if}
      <div class="bottoni">
        <button class="grigio" onclick={() => (quaderno = true)}>📖 Quaderno</button>
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
  :global(body.pescando nav.barra) { display: none; }
  .pesca { position: fixed; inset: 0; max-width: 560px; margin: 0 auto; z-index: 50; background: var(--cielo2); overflow: hidden; animation: entra 0.35s ease-out both; }
  @keyframes entra { from { opacity: 0; transform: scale(1.06); } }
  .lago { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; background: none; box-shadow: none; border-radius: 0; touch-action: manipulation; }
  .lago svg { width: 100%; height: 100%; display: block; }
  .testata { position: absolute; z-index: 2; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; display: flex; gap: 8px; align-items: flex-start; }
  .esci {
    flex: none; background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 999px;
    padding: 6px 12px; font-weight: 900; box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none;
  }
  .titolo { flex: 1; min-width: 0; background: var(--panna); border: 3px solid var(--legno); border-radius: 16px; padding: 6px 10px; box-shadow: 0 4px 0 var(--legno-scuro); text-align: center; }
  .nome { font-weight: 900; font-size: 1.05rem; }
  .ora { font-size: 0.78rem; color: var(--testo-tenue); font-weight: 800; }
  .fumetto {
    position: absolute; z-index: 2; left: 16px; right: 16px; bottom: calc(96px + env(safe-area-inset-bottom)); pointer-events: none;
    background: #fffdf6; color: var(--inchiostro); border: 3px solid var(--inchiostro); border-radius: 18px;
    padding: 10px 14px; font-weight: 800; font-size: 1.05rem; text-align: center; box-shadow: 0 6px 0 rgba(74, 52, 36, 0.35);
  }
  .fumetto.urgente { background: #ffe066; animation: scuoti 0.25s infinite; font-size: 1.2rem; }
  .compagno { display: block; font-size: 0.85rem; color: var(--legno); margin-top: 4px; }
  @keyframes scuoti { 50% { transform: translateX(3px) rotate(1deg); } }
  .galleggiante { transition: transform 0.2s; }
  .balla { animation: balla 1.6s ease-in-out infinite; }
  .trema { animation: trema 0.12s 3; }
  .sotto { transform: translateY(18px) scale(0.85); }
  .vola { animation: vola 0.7s ease-out both; }
  @keyframes balla { 50% { transform: translateY(3px); } }
  @keyframes trema { 50% { transform: translateY(6px); } }
  @keyframes vola { from { transform: translate(-100px, 260px) scale(0.6); } }
  .onda { animation: onda 0.8s ease-out infinite; transform-origin: center; transform-box: fill-box; }
  @keyframes onda { from { opacity: 1; transform: scale(0.4); } to { opacity: 0; transform: scale(1.4); } }
  .esclamativo { font: 900 54px sans-serif; fill: #ffe066; stroke: #4a3424; stroke-width: 3; }
  .carta {
    position: absolute; z-index: 3; left: 20px; right: 20px; top: 22%; background: var(--panna); border: 4px solid var(--legno);
    border-radius: 22px; padding: 14px 16px 16px; text-align: center; box-shadow: 0 8px 0 var(--legno-scuro);
    animation: pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes pop { from { transform: scale(0.5); opacity: 0; } }
  .carta p { margin: 6px 0; font-weight: 700; }
  .nuovo { position: absolute; top: -14px; right: 16px; background: #e05a4a; color: #fff; font-weight: 900; padding: 2px 10px; border-radius: 999px; transform: rotate(6deg); }
  .pesce-svg { width: 100%; max-height: 110px; }
  .nome-pesce { font-weight: 900; font-size: 1.3rem; }
  .misura { color: var(--testo-tenue); font-weight: 800; }
  .premio { color: #8a5a2a; font-weight: 900 !important; }
  .bottoni { display: flex; gap: 10px; justify-content: center; margin-top: 8px; }
  .quaderno {
    position: absolute; z-index: 4; inset: calc(64px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));
    background: #fbf3e2; border: 4px solid var(--legno); border-radius: 20px; padding: 12px; overflow-y: auto; box-shadow: 0 8px 0 var(--legno-scuro);
  }
  .q-testa { display: flex; justify-content: space-between; align-items: center; font-size: 1.15rem; }
  .q-sotto { margin: 6px 0 10px; font-size: 0.9rem; color: var(--testo-tenue); font-weight: 700; }
  .griglia { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cella { background: #efe2c8; border-radius: 14px; padding: 6px 4px; text-align: center; opacity: 0.7; }
  .cella.trovato { background: #fff; opacity: 1; box-shadow: 0 3px 0 rgba(138, 90, 54, 0.3); }
  .cella .pesce-svg { max-height: 54px; }
  .c-nome { font-weight: 900; font-size: 0.8rem; line-height: 1.1; }
  .c-info { font-size: 0.72rem; color: var(--testo-tenue); font-weight: 700; }
</style>
