<script lang="ts">
  // Primo avvio: il corvo si presenta, questionario, primo uovo, nome del villaggio.
  import Corvo from '../componenti/Corvo.svelte';
  import questionario from '../dati/questionario.json';
  import { iniziaPartita } from '../lib/app.svelte';
  import { zeriForze, type Forza } from '../lib/tipi';

  type Passo = { tipo: 'corvo'; id: string } | { tipo: 'domanda'; n: number } | { tipo: 'nome' };
  const domande = questionario.domande as { testo: string; risposte: { testo: string; f: Partial<Record<Forza, number>> }[] }[];

  const passi: Passo[] = [
    { tipo: 'corvo', id: 'benvenuto_1' },
    { tipo: 'corvo', id: 'benvenuto_2' },
    { tipo: 'corvo', id: 'benvenuto_3' },
    { tipo: 'corvo', id: 'benvenuto_4' },
    ...domande.map((_, n) => ({ tipo: 'domanda', n }) as Passo),
    { tipo: 'corvo', id: 'dopo_questionario' },
    { tipo: 'nome' },
  ];

  let i = $state(0);
  let passo = $derived(passi[i]);
  const profilo = zeriForze();
  let nome = $state('');

  function rispondi(f: Partial<Record<Forza, number>>) {
    for (const [k, v] of Object.entries(f) as [Forza, number][]) profilo[k] += v;
    i += 1;
  }
</script>

<div class="pagina intro">
  <h1 class="titolo">Il villaggio di Giada</h1>

  {#key i}
    {#if passo.tipo === 'corvo'}
      <Corvo id={passo.id} />
      <button class="largo" onclick={() => (i += 1)}>Avanti</button>
    {:else if passo.tipo === 'domanda'}
      {@const d = domande[passo.n]}
      <div class="vignetta appare">
        <span class="didascalia">{passo.n + 1} di {domande.length}</span>
        <h2>{d.testo}</h2>
        <div class="risposte">
          {#each d.risposte as r}
            <button class="secondario largo" onclick={() => rispondi(r.f)}>{r.testo}</button>
          {/each}
        </div>
      </div>
    {:else}
      <Corvo id="nome_villaggio" />
      <div class="vignetta appare">
        <input type="text" bind:value={nome} placeholder="Il nome del tuo villaggio" maxlength="40" />
        <p class="tenue" style="margin-top:8px">Potrai cambiarlo quando vuoi.</p>
        <button class="largo" disabled={!nome.trim()} onclick={() => iniziaPartita(profilo, nome)}>Entra nel bosco</button>
      </div>
    {/if}
  {/key}
</div>

<style>
  .intro { padding-top: 32px; }
  .titolo { text-align: center; font-size: 2rem; margin-bottom: 28px; }
  .risposte { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
  .risposte button { text-align: left; font-family: var(--font-testo); font-weight: normal; }
</style>
