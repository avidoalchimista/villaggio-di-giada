<script lang="ts">
  // Libretto "Come si gioca": una pagina alla volta, con il corvo che spiega.
  import { GUIDA } from '../dati/guida';
  import Corvo from './Corvo.svelte';

  let { onfine }: { onfine: () => void } = $props();
  let i = $state(0);
  let p = $derived(GUIDA[i]);
  const ultima = GUIDA.length - 1;
</script>

<div class="libretto">
  {#if i === 0}
    <Corvo testo="Ti spiego come funziona il villaggio. Puoi rileggerlo quando vuoi dal «?» in alto." piccolo />
  {/if}
  {#key i}
    <div class="vignetta pagina-guida appare">
      <span class="didascalia">{i + 1} di {GUIDA.length}</span>
      <div class="icona">{p.icona}</div>
      <h2>{p.titolo}</h2>
      <p>{p.testo}</p>
    </div>
  {/key}
  <div class="pallini" aria-hidden="true">
    {#each GUIDA as _, k}<span class:acceso={k === i}></span>{/each}
  </div>
  <div class="riga">
    {#if i > 0}<button class="secondario" onclick={() => (i -= 1)}>Indietro</button>{/if}
    {#if i < ultima}
      <button class="largo" onclick={() => (i += 1)}>Avanti</button>
    {:else}
      <button class="largo" onclick={onfine}>Ho capito!</button>
    {/if}
  </div>
  {#if i < ultima}<button class="leggero largo salta" onclick={onfine}>Salta, lo so già</button>{/if}
</div>

<style>
  .pagina-guida { text-align: center; padding-top: 22px; }
  .icona { font-size: 3.4rem; line-height: 1; margin: 6px 0 10px; }
  .pagina-guida p { font-size: 1.05rem; margin: 0; }
  .pallini { display: flex; justify-content: center; gap: 7px; margin: 0 0 16px; }
  .pallini span { width: 10px; height: 10px; border-radius: 50%; background: var(--panna-2); border: 2px solid var(--legno); }
  .pallini span.acceso { background: var(--foglia); transform: scale(1.25); }
  .salta { margin-top: 8px; }
</style>
