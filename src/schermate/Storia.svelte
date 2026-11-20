<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import { app } from '../lib/app.svelte';
  import { STORIA } from '../lib/gioco';

  let sbloccati = $derived(STORIA.filter((c) => app.stato!.capitoli.includes(c.id)));
</script>

<div class="pagina">
  <h1>La storia</h1>
  {#if !sbloccati.length}
    <Corvo testo="La storia di questo bosco si racconta piano. Il primo capitolo arriverà quando nascerà il tuo primo animale." piccolo />
  {/if}
  {#each sbloccati as c, i}
    <article class="vignetta scura appare">
      <span class="didascalia">Capitolo {i + 1}</span>
      <h2>{c.titolo}</h2>
      <p>{c.testo}</p>
    </article>
  {/each}
  {#if sbloccati.length && sbloccati.length < STORIA.length}
    <p class="tenue centro">Continua…</p>
  {/if}
</div>

<style>
  article p { font-size: 1.05rem; line-height: 1.7; }
</style>
