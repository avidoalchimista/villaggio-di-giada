<script lang="ts">
  // La cartolina di un posto lontano: si apre toccando il portale all'inizio del sentiero.
  import { app } from '../lib/app.svelte';
  import { onDestroy, onMount } from 'svelte';
  // (come per la pesca: la barra in basso si nasconde, se no copre la finestra)
  onMount(() => document.body.classList.add('guardando'));
  onDestroy(() => document.body.classList.remove('guardando'));
  import { haAcquario } from '../lib/acquario';
  import type { DefBioma } from '../lib/biomi';

  let { luogo, onchiudi }: { luogo: DefBioma; onchiudi: () => void } = $props();
  let s = $derived(app.stato!);
  let quando = $derived(s.castoro?.sentieri?.find((x) => x.id === luogo.id)?.data);
  let data = $derived(quando ? new Date(quando + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : '');
</script>

<div class="cartolina" style:--colore={luogo.colore}>
  <div class="francobollo">{luogo.simbolo}</div>
  <div class="titolo">
    <span class="dove">{luogo.nome}</span>
    <strong>{luogo.villaggio}</strong>
  </div>
  <p>{luogo.descrizione}</p>
  <p class="riga"><span>Ci vivono</span> {luogo.abitanti}.</p>
  <p class="riga"><span>Si scambiano</span> {luogo.commercio}.</p>
  <p class="pesci">
    {#if haAcquario(s)}
      🐠 Nell'acquario puoi comprare i loro pesci: {luogo.pesci.map((p) => p.nome.toLowerCase()).join(', ')}.
    {:else}
      🐠 Hanno pesci mai visti ({luogo.pesci.map((p) => p.nome.toLowerCase()).join(', ')}): quando costruirai l'acquario, potrai comprarli.
    {/if}
  </p>
  {#if data}<p class="firma">Sentiero scoperto dal castoro il {data}</p>{/if}
  <button class="tondo" onclick={onchiudi}>Che bello!</button>
</div>

<style>
  :global(body.guardando nav.barra) { display: none !important; }
  .cartolina {
    position: relative;
    background: #fffaf0;
    border-radius: 14px;
    border: 3px solid var(--colore);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), inset 0 0 0 6px #fffaf0, inset 0 0 0 8px color-mix(in srgb, var(--colore) 40%, white);
    padding: 16px 16px 14px;
    color: #3a2a1a;
    animation: arriva 0.35s ease-out both;
    max-height: 60dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  @keyframes arriva { from { transform: translateY(30px) rotate(-3deg); opacity: 0; } to { transform: none; opacity: 1; } }
  .francobollo { position: absolute; top: 10px; right: 12px; font-size: 1.9rem; width: 54px; height: 60px; display: grid; place-items: center; background: color-mix(in srgb, var(--colore) 25%, white); border: 3px dashed var(--colore); border-radius: 6px; transform: rotate(5deg); }
  .titolo { display: flex; flex-direction: column; margin: 0 64px 8px 0; }
  .dove { font-size: 0.8rem; font-weight: 800; color: var(--colore); text-transform: uppercase; letter-spacing: 0.06em; }
  .titolo strong { font-size: 1.35rem; line-height: 1.1; }
  p { margin: 0 0 8px; font-size: 0.92rem; line-height: 1.35; }
  .riga span { font-weight: 900; color: var(--colore); }
  .pesci { background: color-mix(in srgb, var(--colore) 14%, white); border-radius: 10px; padding: 8px 10px; }
  .firma { font-size: 0.78rem; color: #8a7a6a; font-style: italic; }
  button { align-self: center; }
</style>
