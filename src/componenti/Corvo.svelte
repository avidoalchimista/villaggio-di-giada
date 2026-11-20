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
  <div class="nuvola">{mostrato}</div>
  <div class="ritratto"><CorvoDisegno /></div>
</div>

<style>
  .corvo { display: flex; flex-direction: column; gap: 18px; margin-bottom: 16px; }
  .ritratto { width: 120px; height: 150px; margin-left: 4px; }
  .piccolo .ritratto { width: 76px; height: 95px; }
  .ritratto :global(svg) { width: 100%; height: 100%; }
  .piccolo .nuvola { font-size: 0.95rem; }
</style>
