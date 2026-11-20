<script lang="ts">
  // Fumetto da gioco: etichetta col nome, testo che scorre lettera per lettera con una vocina,
  // tocco per finire la frase o passare alla successiva. Se esiste la registrazione del corvo, parte quella.
  import type { Snippet } from 'svelte';
  import { app, type RigaDialogo } from '../lib/app.svelte';

  let { righe, onfine, onriga, azioni }: {
    righe: RigaDialogo[];
    onfine?: () => void;
    onriga?: (r: RigaDialogo) => void;
    azioni?: Snippet;
  } = $props();

  let i = $state(0);
  let mostrati = $state(0);
  let riga = $derived(righe[Math.min(i, righe.length - 1)]);
  let finita = $derived(mostrati >= (riga?.testo.length ?? 0));
  let ultima = $derived(i >= righe.length - 1);

  let ctx: AudioContext | null = null;
  let audio: HTMLAudioElement | null = null;
  let haRegistrazione = false;

  function bip(lettera: string) {
    if (!app.audio || haRegistrazione || !/[a-zàèéìòù]/i.test(lettera)) return;
    try {
      ctx ??= new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const base = riga.voce === 'corvo' ? 260 : riga.voce === 'animale' ? 520 : 380;
      const vocale = 'aeiouàèéìòù'.includes(lettera.toLowerCase());
      o.type = riga.voce === 'corvo' ? 'square' : 'triangle';
      o.frequency.value = base * (vocale ? 1.25 : 1) * (0.92 + ((lettera.charCodeAt(0) * 7) % 17) / 100);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.07);
    } catch {
      /* audio non disponibile */
    }
  }

  $effect(() => {
    const r = riga;
    if (!r) return;
    mostrati = 0;
    onriga?.(r);
    audio?.pause();
    haRegistrazione = false;
    if (r.audioId && app.audio) {
      audio = new Audio(`./audio/corvo/${r.audioId}.mp3`);
      audio.play().then(() => (haRegistrazione = true)).catch(() => {});
    }
    const id = setInterval(() => {
      if (mostrati >= r.testo.length) return clearInterval(id);
      const c = r.testo[mostrati];
      mostrati += 1;
      if (mostrati % 2 === 1) bip(c);
    }, 32);
    return () => clearInterval(id);
  });

  function avanti() {
    if (!finita) {
      mostrati = riga.testo.length;
      return;
    }
    if (!ultima) i += 1;
    else if (!azioni) onfine?.();
  }
</script>

{#if riga}
  {#key i}
    <div class="dialogo" role="button" tabindex="0" onclick={avanti} onkeydown={(e) => e.key === 'Enter' && avanti()}>
      <div class="nome" class:corvo={riga.voce === 'corvo'}>{riga.chi}</div>
      <p>{riga.testo.slice(0, mostrati)}<span class="resto">{riga.testo.slice(mostrati)}</span></p>
      {#if finita && (!ultima || !azioni)}
        <span class="freccia">▼</span>
      {/if}
      {#if finita && ultima && azioni}
        <div class="azioni" onclick={(e) => e.stopPropagation()} role="presentation">{@render azioni()}</div>
      {/if}
    </div>
  {/key}
{/if}

<style>
  .dialogo {
    position: relative;
    background: var(--panna);
    border: 4px solid var(--legno);
    border-radius: 26px;
    padding: 22px 18px 16px;
    box-shadow: 0 6px 0 var(--legno-scuro), 0 10px 24px rgba(0, 0, 0, 0.25);
    animation: entra 0.28s cubic-bezier(0.2, 1.5, 0.4, 1) both;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }
  @keyframes entra { from { transform: scale(0.6) translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }
  .nome {
    position: absolute;
    top: -18px;
    left: 18px;
    background: var(--foglia);
    color: #fff;
    font-weight: 800;
    padding: 4px 16px;
    border-radius: 999px;
    border: 3px solid var(--legno);
    transform: rotate(-3deg);
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    box-shadow: 0 3px 0 var(--legno-scuro);
  }
  .nome.corvo { background: var(--notte-blu); }
  p { margin: 0; font-size: 1.12rem; line-height: 1.45; font-weight: 600; color: var(--inchiostro); min-height: 3em; }
  .resto { visibility: hidden; }
  .freccia { position: absolute; right: 18px; bottom: 6px; color: var(--brace); animation: rimbalza 0.7s infinite; font-size: 0.9rem; }
  @keyframes rimbalza { 50% { transform: translateY(4px); } }
  .azioni { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
</style>
