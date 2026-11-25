<script lang="ts">
  import Icona from './Icona.svelte';
  // Passeggiare nel villaggio con gli occhi di Giada (prima persona).
  // Al computer: W A S D o le frecce per camminare, trascinare col mouse per guardarsi intorno, Maiusc per correre.
  // Al telefono: la levetta a sinistra per camminare, un dito sul prato per guardarsi intorno.
  // Si arreda e si costruisce come sempre: le cose nuove compaiono davanti a Giada.
  import { onDestroy } from 'svelte';
  import type { Scena } from '../scena/scena';

  // alto: mentre si arreda i pannelli in basso sono più grandi, il bottone sale un po' per non coprirli
  let { scena, attivo = $bindable(false), conLevetta = true, alto = false }: { scena: Scena; attivo?: boolean; conLevetta?: boolean; alto?: boolean } = $props();

  const tocco = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
  let aiuto = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cambia() {
    attivo = !attivo;
    if (attivo) {
      scena.entraAPiedi();
      aiuto = true;
      clearTimeout(timer);
      timer = setTimeout(() => (aiuto = false), 10000);
    } else {
      scena.esciAPiedi();
      aiuto = false;
    }
  }

  // ---------- la levetta ----------
  let base: HTMLDivElement | undefined = $state();
  let dito: number | null = null;
  let pomello = $state({ x: 0, y: 0 });
  const RAGGIO = 46;

  function muovi(e: PointerEvent) {
    if (!base) return;
    const r = base.getBoundingClientRect();
    let x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(x, y);
    if (l > RAGGIO) { x = (x / l) * RAGGIO; y = (y / l) * RAGGIO; }
    pomello = { x, y };
    // un po' di zona morta al centro, poi la velocità cresce dolce
    const f = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) / RAGGIO - 0.12) / 0.88;
    scena.cammina(f(x), -f(y));
  }
  function giu(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dito = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    aiuto = false;
    muovi(e);
  }
  function sposta(e: PointerEvent) {
    if (e.pointerId === dito) muovi(e);
  }
  function su(e: PointerEvent) {
    if (e.pointerId !== dito) return;
    dito = null;
    pomello = { x: 0, y: 0 };
    scena.cammina(0, 0);
  }

  onDestroy(() => {
    clearTimeout(timer);
    scena.cammina(0, 0);
  });
</script>

<button class={['interruttore', attivo && 'acceso', alto && 'alto']} onclick={cambia} aria-label={attivo ? 'Torna alla vista dall\'alto' : 'Cammina nel villaggio'}>
  <Icona nome={attivo ? 'vola' : 'piedi'} taglia={30} />
  <span class="dida">{attivo ? 'Dall\'alto' : 'A piedi'}</span>
</button>

{#if attivo && tocco && conLevetta}
  <div class={['levetta', alto && 'alto']} bind:this={base} onpointerdown={giu} onpointermove={sposta} onpointerup={su} onpointercancel={su} role="presentation">
    <div class="pomello" style:transform="translate({pomello.x}px, {pomello.y}px)"></div>
  </div>
{/if}

{#if attivo && aiuto}
  <div class="aiuto-piedi">
    {#if tocco}
      La levetta ti fa camminare · un dito sul prato per guardarti intorno · tocca chi vuoi per parlarci
    {:else}
      <b>W A S D</b> o le frecce per camminare · <b>trascina</b> col mouse per guardarti intorno · <b>Maiusc</b> per correre
    {/if}
  </div>
{/if}

<style>
  .interruttore {
    position: absolute; right: 12px; top: 46%; z-index: 4; width: 60px; height: 60px; padding: 0; border-radius: 50%;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
    background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); box-shadow: 0 4px 0 var(--legno-scuro);
    text-shadow: none;
  }
  .interruttore.alto { top: 32%; }
  .levetta.alto { top: calc(32% - 20px); }
  .interruttore.acceso { background: #2f5d8a; color: #fff; }
  .dida { font-size: 0.58rem; font-weight: 900; letter-spacing: 0.02em; margin-top: 1px; }
  .levetta {
    position: absolute; left: 18px; top: calc(46% - 20px); z-index: 4; width: 120px; height: 120px; border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 250, 235, 0.28), rgba(255, 250, 235, 0.12));
    border: 3px solid rgba(255, 255, 255, 0.65); touch-action: none;
    display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  }
  .pomello {
    width: 52px; height: 52px; border-radius: 50%; background: var(--panna); border: 3px solid var(--legno);
    box-shadow: 0 3px 0 var(--legno-scuro); pointer-events: none;
  }
  .aiuto-piedi {
    position: absolute; left: 50%; top: calc(112px + env(safe-area-inset-top)); transform: translateX(-50%); z-index: 4; width: min(92%, 460px);
    background: rgba(12, 10, 30, 0.78); color: #fff; font-weight: 700; font-size: 0.85rem; text-align: center; line-height: 1.4;
    padding: 8px 14px; border-radius: 14px; pointer-events: none; animation: appare 0.4s ease-out both;
  }
  .aiuto-piedi b { color: #ffe08a; }
  @keyframes appare { from { opacity: 0; transform: translate(-50%, -8px); } }
</style>
