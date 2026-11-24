<script lang="ts">
  // La finestra dell'acquario: chi nuota nella vasca e i pesci da comprare nei villaggi lontani.
  // Sopra, la telecamera guarda i pesci veri che nuotano dietro il vetro.
  import { app, compraPesceQui } from '../lib/app.svelte';
  import { onDestroy, onMount } from 'svelte';
  // (come per la pesca: la barra in basso si nasconde, se no copre la finestra)
  onMount(() => document.body.classList.add('guardando'));
  onDestroy(() => document.body.classList.remove('guardando'));
  import { PESCE, POSTI_VASCA, pesciInVendita, prezzoPesce, UGUALI_MAX } from '../lib/acquario';
  import { BIOMA } from '../lib/biomi';
  import type { DefPesce } from '../lib/pesca';

  let { onchiudi }: { onchiudi: () => void } = $props();
  let s = $derived(app.stato!);
  let scheda = $state<'vasca' | 'compra'>('vasca');
  let messaggio = $state('');

  let pesci = $derived(s.acquario?.pesci ?? []);
  // un gruppo per tipo di pesce: quanti e da dove
  let gruppi = $derived.by(() => {
    const m = new Map<string, { def: DefPesce; n: number; grande: number; da: string }>();
    for (const p of pesci) {
      const def = PESCE[p.id];
      if (!def) continue;
      const g = m.get(p.id);
      if (g) { g.n++; g.grande = Math.max(g.grande, p.cm); }
      else m.set(p.id, { def, n: 1, grande: p.cm, da: p.da });
    }
    return [...m.values()];
  });
  let vendita = $derived(pesciInVendita(s));
  const quanti = (id: string) => pesci.filter((p) => p.id === id).length;

  async function compra(p: DefPesce) {
    const r = await compraPesceQui(p.id);
    const luogo = vendita.find((v) => v.pesci.includes(p))?.luogo;
    if (r === 'ok') messaggio = `Arrivato da ${luogo?.villaggio ?? 'lontano'} con il carretto: ${p.nome.toLowerCase()} è nella vasca!`;
    else if (r === 'castagne') messaggio = `Servono ${prezzoPesce(p)} castagne: per ora non bastano.`;
    else if (r === 'pieno') messaggio = 'Di questi ce ne sono già abbastanza nella vasca.';
  }
</script>

{#snippet sagoma(p: DefPesce)}
  <svg viewBox="0 0 60 34" class="sagoma" aria-hidden="true">
    {#if p.forma === 'medusa'}
      <path d="M14 18 Q30 -4 46 18 Z" fill={p.colore} stroke="#3b2616" stroke-width="2" />
      {#each [18, 24, 30, 36, 42] as x}<path d={`M${x} 18 q3 6 0 12`} stroke={p.pinne} stroke-width="2.5" fill="none" />{/each}
    {:else if p.forma === 'stella'}
      <path d="M30 2 L35 13 L47 13 L37 21 L41 32 L30 25 L19 32 L23 21 L13 13 L25 13 Z" fill={p.colore} stroke="#3b2616" stroke-width="2" />
    {:else if p.forma === 'cavalluccio'}
      <path d="M30 4 q10 0 8 8 l8 2 l-8 3 q4 8 -2 14 q-8 4 -6 -4 q-6 -6 0 -23 Z" fill={p.colore} stroke="#3b2616" stroke-width="2" />
    {:else if p.forma === 'tartaruga'}
      <ellipse cx="28" cy="18" rx="16" ry="11" fill={p.colore} stroke="#3b2616" stroke-width="2" />
      <circle cx="48" cy="17" r="5" fill={p.pinne} stroke="#3b2616" stroke-width="2" />
      <ellipse cx="18" cy="29" rx="6" ry="3" fill={p.pinne} /><ellipse cx="38" cy="29" rx="6" ry="3" fill={p.pinne} />
    {:else if p.forma === 'gambero'}
      <path d="M8 20 q14 -14 34 -6 l12 -4 l-6 8 l6 6 l-12 -2 q-18 10 -34 -2 Z" fill={p.colore} stroke="#3b2616" stroke-width="2" />
    {:else}
      {@const alto = p.forma === 'tondo' || p.forma === 'disco' ? 12 : p.forma === 'lungo' ? 7 : 9}
      <path d={`M6 17 L14 ${17 - alto * 0.6} L14 ${17 + alto * 0.6} Z`} fill={p.pinne} stroke="#3b2616" stroke-width="2" />
      <ellipse cx="32" cy="17" rx="19" ry={alto} fill={p.colore} stroke="#3b2616" stroke-width="2" />
      <ellipse cx="34" cy={17 + alto * 0.45} rx="13" ry={alto * 0.35} fill={p.pancia} />
      <circle cx="44" cy="14" r="2.2" fill="#1a1a1a" />
    {/if}
  </svg>
{/snippet}

<div class="finestra">
  <div class="testata">
    <span>🐠 L'ACQUARIO</span>
    <span class="borsa">🌰 {s.ghiande}</span>
  </div>
  <div class="schede">
    <button class:attiva={scheda === 'vasca'} onclick={() => { scheda = 'vasca'; messaggio = ''; }}>Nella vasca ({pesci.length})</button>
    <button class:attiva={scheda === 'compra'} onclick={() => { scheda = 'compra'; messaggio = ''; }}>🛒 Dai villaggi lontani</button>
  </div>

  <div class="corpo">
    {#if scheda === 'vasca'}
      {#if gruppi.length}
        <p class="aiuto">Ogni pesce che peschi al laghetto viene a nuotare qui (al massimo {UGUALI_MAX} uguali e {POSTI_VASCA} in tutto).</p>
        <ul class="griglia">
          {#each gruppi as g (g.def.id)}
            <li>
              {@render sagoma(g.def)}
              <span class="nome">{g.def.nome}</span>
              <span class="info">{g.n > 1 ? `×${g.n} · ` : ''}{g.grande} cm{g.da !== 'laghetto' && BIOMA[g.da] ? ` · ${BIOMA[g.da].simbolo}` : ''}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="vuoto">La vasca è pronta, ma è ancora vuota. Vai a pescare al laghetto: ogni pesce che prendi verrà a nuotare qui!</p>
      {/if}
    {:else if vendita.length}
      {#if messaggio}<p class="messaggio">{messaggio}</p>{/if}
      {#each vendita as v (v.luogo.id)}
        <h4 style:--colore={v.luogo.colore}>{v.luogo.simbolo} {v.luogo.villaggio} <small>{v.luogo.nome}</small></h4>
        <ul class="lista">
          {#each v.pesci as p (p.id)}
            {@const pieno = quanti(p.id) >= UGUALI_MAX}
            <li>
              {@render sagoma(p)}
              <div class="testo"><span class="nome">{p.nome}</span><span class="frase">{p.frase}</span></div>
              <button class="prezzo" disabled={pieno || s.ghiande < prezzoPesce(p)} onclick={() => compra(p)}>{pieno ? '✔' : `🌰 ${prezzoPesce(p)}`}</button>
            </li>
          {/each}
        </ul>
      {/each}
      <p class="aiuto">Il castoro trova un sentiero nuovo ogni mese o due: da ogni posto lontano arrivano pesci diversi.</p>
    {:else}
      <p class="vuoto">Per ora nessun villaggio lontano ci vende i suoi pesci. Ogni mese o due il castoro scopre un sentiero verso un posto nuovo (le montagne, il mare…): da lì arriveranno pesci mai visti!</p>
    {/if}
  </div>
  <button class="tondo grigio chiudi" onclick={onchiudi}>Chiudi</button>
</div>

<style>
  :global(body.guardando nav.barra) { display: none !important; }
  .finestra {
    background: linear-gradient(180deg, rgba(20, 70, 120, 0.94), rgba(12, 36, 80, 0.96));
    border: 3px solid #d8eeff;
    outline: 3px solid #102a50;
    border-radius: 14px;
    color: #f2f8ff;
    padding: 12px 12px 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    animation: apri 0.25s ease-out both;
    max-height: 48dvh;
    display: flex;
    flex-direction: column;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { display: flex; justify-content: space-between; font-weight: 900; letter-spacing: 0.1em; border-bottom: 2px solid rgba(216, 238, 255, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
  .borsa { letter-spacing: 0; color: #ffe08a; }
  .schede { display: flex; gap: 6px; margin-bottom: 8px; }
  .schede button { flex: 1; background: rgba(255, 255, 255, 0.08); color: #cfe6ff; border: 2px solid transparent; box-shadow: none; border-radius: 10px; padding: 6px 4px; font-size: 0.82rem; font-weight: 900; text-shadow: none; }
  .schede button.attiva { border-color: #ffe08a; color: #fff; background: rgba(255, 224, 138, 0.14); }
  .corpo { overflow-y: auto; min-height: 0; }
  .griglia { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
  .griglia li { background: rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 6px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .sagoma { width: 48px; height: 28px; flex: none; }
  .nome { font-weight: 900; font-size: 0.8rem; line-height: 1.1; }
  .info { font-size: 0.72rem; color: #aac8ee; font-weight: 700; }
  h4 { margin: 8px 0 4px; color: #fff; border-left: 5px solid var(--colore); padding-left: 8px; font-size: 0.95rem; }
  h4 small { color: #aac8ee; font-weight: 700; font-size: 0.75rem; }
  .lista { list-style: none; padding: 0; margin: 0; }
  .lista li { display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 6px 8px; margin-bottom: 4px; }
  .testo { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .frase { font-size: 0.72rem; color: #c4dcf6; line-height: 1.2; }
  .prezzo { flex: none; background: #ffe08a; color: #3a2a10; border: none; box-shadow: none; border-radius: 999px; padding: 6px 10px; font-weight: 900; text-shadow: none; min-width: 62px; }
  .prezzo:disabled { background: rgba(255, 255, 255, 0.15); color: #9fb6d8; }
  .aiuto { font-size: 0.78rem; color: #c4dcf6; margin: 4px 2px 8px; }
  .vuoto { color: #e4f0ff; margin: 8px 2px; }
  .messaggio { background: rgba(159, 227, 160, 0.18); border-radius: 10px; padding: 6px 10px; color: #c8ffc8; font-weight: 800; font-size: 0.85rem; margin: 0 0 6px; }
  .chiudi { align-self: center; margin-top: 10px; }
</style>
