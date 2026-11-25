<script lang="ts">
  // Primo avvio: il corvo si presenta, questionario, primo uovo, nome del villaggio.
  import Corvo3D from '../componenti/Corvo3D.svelte';
  import Logo from '../componenti/Logo.svelte';
  import frasi from '../dati/frasi.json';
  import questionario from '../dati/questionario.json';
  import { onMount } from 'svelte';
  import { app, iniziaPartita } from '../lib/app.svelte';
  import { leggiMeta, scriviMeta } from '../lib/db';
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

  const battute = frasi.corvo as Record<string, string>;
  let i = $state(0);

  // la voce registrata del corvo, se c'è (altrimenti resta il testo)
  let audio: HTMLAudioElement | null = null;
  $effect(() => {
    const id = passo.tipo === 'corvo' ? passo.id : passo.tipo === 'nome' ? 'nome_villaggio' : '';
    if (!id || !app.audio) return;
    audio?.pause();
    audio = new Audio(`./audio/corvo/${id}.mp3`);
    audio.play().catch(() => {});
    return () => audio?.pause();
  });
  let passo = $derived(passi[i]);
  const profilo = zeriForze();
  let nome = $state('');

  // se Giada chiude a metà, alla riapertura riprende da dove era arrivata
  interface InCorso { i: number; profilo: Record<Forza, number> }
  onMount(async () => {
    const r = await leggiMeta<InCorso | null>('introInCorso', null);
    if (r && r.i > 0 && r.i < passi.length) {
      Object.assign(profilo, r.profilo);
      i = r.i;
    }
  });

  function avanti() {
    i += 1;
    scriviMeta('introInCorso', { i, profilo: { ...profilo } } satisfies InCorso);
  }

  function rispondi(f: Partial<Record<Forza, number>>) {
    for (const [k, v] of Object.entries(f) as [Forza, number][]) profilo[k] += v;
    avanti();
  }
</script>

<div class="pagina intro">
  <!-- la volpe del logo accoglie solo alla prima pagina, poi lascia spazio al corvo -->
  {#if i === 0}<div class="appare"><Logo larghezza={230} /></div>{/if}
  <h1 class="titolo">Il villaggio di Giada</h1>

  <!-- il corvo resta lo stesso per tutta l'intro: cambia solo quello che dice -->
  {#if passo.tipo !== 'domanda'}
    <Corvo3D battuta={passo.tipo === 'corvo' ? battute[passo.id] : battute.nome_villaggio} />
  {/if}

  {#key i}
    {#if passo.tipo === 'corvo'}
      <div class="nuvola sotto-corvo appare">{battute[passo.id]}</div>
      <button class="largo" onclick={avanti}>Avanti</button>
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
      <div class="nuvola sotto-corvo appare">{battute.nome_villaggio}</div>
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
  .titolo { text-align: center; font-size: 2rem; margin-bottom: 18px; }
  .sotto-corvo { margin: 22px 0 16px; }
  /* la punta della nuvola guarda in su, verso il corvo */
  .sotto-corvo::after { left: calc(50% - 10px); top: -13px; bottom: auto; transform: rotate(225deg); }
  .risposte { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
  .risposte button { text-align: left; font-family: var(--font-testo); font-weight: normal; }
</style>
