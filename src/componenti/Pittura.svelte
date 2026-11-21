<script lang="ts">
  // Giada dipinge un quadretto col dito: una tela piccola a quadratini (come i giochi di una volta),
  // pochi colori belli, pennello piccolo o grande, secchiello per lo sfondo. Poi sceglie la cornice.
  import { onMount } from 'svelte';
  import { PREZZI } from '../lib/arredo';
  import { CORNICI } from '../scena/modelli';

  let { onannulla, onfatto }: { onannulla: () => void; onfatto: (disegno: string, cornice: number) => void } = $props();

  const L = 64, H = 48; // quadratini della tela
  const COLORI = ['#1d1a2e', '#ffffff', '#e8364f', '#ff8a3c', '#ffd166', '#7ccf6a', '#2e8a57', '#7fc8f8', '#3f63b8', '#a58be0', '#ff8fb1', '#8a5a36'];
  let tela: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let colore = $state(COLORI[0]);
  let grosso = $state(2);
  let secchiello = $state(false);
  let cornice = $state(0);
  let ultimo: { x: number; y: number } | null = null;
  let disegnato = $state(false);

  onMount(() => {
    ctx = tela.getContext('2d')!;
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, L, H);
  });

  function punto(e: PointerEvent) {
    const r = tela.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * L), y: Math.floor(((e.clientY - r.top) / r.height) * H) };
  }

  function timbro(x: number, y: number) {
    ctx.fillStyle = colore;
    const o = Math.floor(grosso / 2);
    ctx.fillRect(x - o, y - o, grosso, grosso);
  }

  function giu(e: PointerEvent) {
    tela.setPointerCapture(e.pointerId);
    const p = punto(e);
    disegnato = true;
    if (secchiello) {
      ctx.fillStyle = colore;
      ctx.fillRect(0, 0, L, H);
      secchiello = false;
      return;
    }
    timbro(p.x, p.y);
    ultimo = p;
  }

  function muovi(e: PointerEvent) {
    if (!ultimo) return;
    const p = punto(e);
    // riempio i buchi tra un punto e l'altro, così le linee sono continue
    const n = Math.max(Math.abs(p.x - ultimo.x), Math.abs(p.y - ultimo.y), 1);
    for (let i = 1; i <= n; i++) timbro(Math.round(ultimo.x + ((p.x - ultimo.x) * i) / n), Math.round(ultimo.y + ((p.y - ultimo.y) * i) / n));
    ultimo = p;
  }

  function su() {
    ultimo = null;
  }

  function cancella() {
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(0, 0, L, H);
    disegnato = false;
  }
</script>

<div class="velo">
  <div class="pannello">
    <h3>Il tuo quadretto</h3>
    <div class="cornice" style:border-color={CORNICI[cornice].colore}>
      <canvas bind:this={tela} width={L} height={H} onpointerdown={giu} onpointermove={muovi} onpointerup={su} onpointercancel={su}></canvas>
    </div>
    <div class="colori">
      {#each COLORI as c (c)}
        <button class="colore" class:attivo={colore === c} style:background={c} onclick={() => (colore = c)} aria-label="colore"></button>
      {/each}
    </div>
    <div class="riga">
      <button class="mini" class:attivo={grosso === 1 && !secchiello} onclick={() => { grosso = 1; secchiello = false; }}>• fine</button>
      <button class="mini" class:attivo={grosso === 2 && !secchiello} onclick={() => { grosso = 2; secchiello = false; }}>● medio</button>
      <button class="mini" class:attivo={grosso === 4 && !secchiello} onclick={() => { grosso = 4; secchiello = false; }}>⬤ grosso</button>
      <button class="mini" class:attivo={secchiello} onclick={() => (secchiello = true)}>🪣 sfondo</button>
      <button class="mini" onclick={cancella}>Ricomincia</button>
    </div>
    <div class="riga">
      <span class="etichetta">Cornice:</span>
      {#each CORNICI as c, i (c.nome)}
        <button class="mini" class:attivo={cornice === i} onclick={() => (cornice = i)}><span class="pallino" style:background={c.colore}></span>{c.nome}</button>
      {/each}
    </div>
    <div class="riga fondo">
      <button class="tondo grigio" onclick={onannulla}>Annulla</button>
      <button class="tondo" disabled={!disegnato} onclick={() => onfatto(tela.toDataURL('image/png'), cornice)}>Appendilo 🌰 {PREZZI.quadretto}</button>
    </div>
  </div>
</div>

<style>
  .velo { position: fixed; inset: 0; background: rgba(10, 14, 40, 0.6); display: flex; align-items: center; justify-content: center; z-index: 20; padding: 12px; }
  .pannello { background: var(--panna); border: 4px solid var(--legno); border-radius: 20px; padding: 12px; width: 100%; max-width: 420px; box-shadow: 0 8px 0 var(--legno-scuro); }
  h3 { margin: 0 0 8px; text-align: center; }
  .cornice { border: 12px solid; border-radius: 6px; box-shadow: inset 0 0 0 2px #0003, 0 3px 0 #0003; }
  canvas { display: block; width: 100%; aspect-ratio: 4 / 3; image-rendering: pixelated; touch-action: none; background: #fff8e7; }
  .colori { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin: 10px 0 8px; }
  .colore { aspect-ratio: 1; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px var(--legno); padding: 0; }
  .colore.attivo { box-shadow: 0 0 0 4px #ffb703; transform: scale(1.1); }
  .riga { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 6px; }
  .fondo { justify-content: space-between; margin-top: 6px; }
  .mini { padding: 6px 9px; border-radius: 10px; font-size: 0.82rem; background: #fff; color: var(--inchiostro); border: 2px solid var(--legno); box-shadow: none; text-shadow: none; display: inline-flex; gap: 4px; align-items: center; }
  .mini.attivo { background: #ffe08a; }
  .pallino { width: 12px; height: 12px; border-radius: 50%; display: inline-block; border: 1px solid #0004; }
  .etichetta { font-weight: 800; font-size: 0.85rem; }
</style>
