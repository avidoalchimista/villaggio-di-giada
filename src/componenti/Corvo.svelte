<script lang="ts">
  // Il corvo guida: nuvoletta con il testo e, se c'è, la registrazione di Riccardo.
  import frasi from '../dati/frasi.json';
  import { app } from '../lib/app.svelte';
  import CorvoDisegno from './CorvoDisegno.svelte';

  let { id = '', testo = '', piccolo = false }: { id?: string; testo?: string; piccolo?: boolean } = $props();

  const battute = frasi.corvo as Record<string, string>;
  let mostrato = $derived(testo || battute[id] || '');

  let audio: HTMLAudioElement | null = null;
  $effect(() => {
    if (!id || !app.audio) return;
    audio?.pause();
    audio = new Audio(`./audio/corvo/${id}.mp3`);
    audio.play().catch(() => {}); // file non ancora registrato o autoplay bloccato: resta il testo
    return () => audio?.pause();
  });
</script>

<div class="corvo appare" class:piccolo>
  <div class="nuvola">
    {#if piccolo}<span class="chi">Corvo</span>{/if}
    {mostrato}
  </div>
  <div class="ritratto"><CorvoDisegno /></div>
</div>

<style>
  .corvo { display: flex; flex-direction: column; gap: 18px; margin-bottom: 16px; }
  .ritratto { width: 120px; height: 150px; margin-left: 4px; }
  .ritratto :global(svg) { width: 100%; height: 100%; }
  /* versione piccola: il corvo a sinistra che parla, come nei dialoghi del villaggio */
  .piccolo { flex-direction: row-reverse; align-items: flex-end; gap: 14px; }
  .piccolo .ritratto { width: 64px; height: 80px; flex: none; margin: 0; animation: dondola 3s ease-in-out infinite; transform-origin: 50% 100%; }
  .piccolo .nuvola { flex: 1; font-size: 0.95rem; padding-top: 16px; margin-top: 12px; }
  .piccolo .nuvola::after { left: -13px; bottom: 18px; border-right: none; border-bottom: var(--bordo); border-left: var(--bordo); }
  .chi {
    position: absolute; top: -14px; left: 14px; background: var(--notte-blu); color: #fff; font-weight: 800; font-size: 0.78rem;
    padding: 1px 12px; border-radius: 999px; border: 3px solid var(--legno); transform: rotate(-3deg); box-shadow: 0 3px 0 var(--legno-scuro);
  }
  @keyframes dondola { 50% { transform: rotate(-4deg); } }
</style>
