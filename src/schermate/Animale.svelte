<script lang="ts">
  import Ritratto from '../componenti/Ritratto.svelte';
  import Ritratto3D from '../componenti/Ritratto3D.svelte';
  import frasi from '../dati/frasi.json';
  import { app, rinominaAnimale, vai } from '../lib/app.svelte';
  import { COLORE_VIRTU, NOME_FASE, NOME_VIRTU } from '../lib/etichette';
  import { accorda, conArticolo, NOME_MANTO, REGOLE } from '../lib/gioco';
  import { VIRTU } from '../lib/tipi';

  let a = $derived(app.stato!.animali.find((x) => x.id === app.animaleAperto)!);
  let nome = $state('');
  $effect(() => { nome = a?.nome ?? ''; });
  let maxNutr = $derived(Math.max(1, ...VIRTU.map((v) => a.nutrimento[v])));

  let ricordo = $derived.by(() => {
    if (!a.ricordi.length) return '';
    const r = a.ricordi[(a.ricordi.length * 7) % a.ricordi.length];
    const l = frasi.animali.ricordo;
    return l[a.ricordi.length % l.length].replace('{ricordo}', r.frase);
  });
</script>

{#if a}
  <div class="pagina">
    <button class="leggero" onclick={() => vai('villaggio')}>← Villaggio</button>
    <div class="vignetta centro">
      {#if a.fase === 'uovo'}<Ritratto animale={a} taglia={170} />{:else}<Ritratto3D animale={a} />{/if}
      {#if a.nome}
        <h1 style="margin-top:8px">{a.nome} <span class="sesso">{a.sesso === 'f' ? '♀' : '♂'}</span></h1>
        <p class="tenue">{conArticolo(a)} {NOME_MANTO[a.specie][a.aspetto?.manto ?? 0]} · {a.mestiere ?? NOME_FASE[a.fase]}</p>
        {#if a.aspetto}<p class="segno">Segno particolare: <strong>{a.aspetto.tratto}</strong></p>{/if}
        {#if a.abilita?.length}<p class="tenue">Sa: {a.abilita.map((x) => REGOLE.abilita.find((d) => d.id === x)?.nome.toLowerCase()).join(', ')}</p>{/if}
      {:else}
        <h2 style="margin-top:8px">Come si chiama {conArticolo(a)}?</h2>
        <div class="riga">
          <input type="text" bind:value={nome} maxlength="24" placeholder="Nome" />
          <button disabled={!nome.trim()} onclick={() => rinominaAnimale(a.id, nome)}>Ok</button>
        </div>
      {/if}
    </div>

    {#if a.addormentato}
      <div class="nuvola">{accorda(frasi.animali.addormentato[0], a)}</div>
    {:else if ricordo}
      <div class="nuvola">«{ricordo}»</div>
    {/if}

    <div class="vignetta" style="margin-top:30px">
      <span class="didascalia">Cosa l'ha fatto crescere</span>
      {#each VIRTU as v}
        <div class="barra-riga">
          <span>{NOME_VIRTU[v]}{REGOLE.specieVirtu[a.specie] === v ? ' ★' : ''}</span>
          <div class="barra"><div style:width="{(a.nutrimento[v] / maxNutr) * 100}%" style:background={COLORE_VIRTU[v]}></div></div>
        </div>
      {/each}
      <p class="tenue" style="margin-top:10px">★ la virtù che nutre di più la sua specie.</p>
    </div>

    {#if a.ricordi.length}
      <div class="vignetta">
        <span class="didascalia">I suoi ricordi</span>
        <ul>
          {#each a.ricordi.slice(-6).reverse() as r}<li>{r.frase}</li>{/each}
        </ul>
      </div>
    {/if}

    {#if a.nome}
      <details>
        <summary class="tenue">Cambia nome</summary>
        <div class="riga" style="margin-top:8px">
          <input type="text" bind:value={nome} maxlength="24" />
          <button onclick={() => rinominaAnimale(a.id, nome)}>Salva</button>
        </div>
      </details>
    {/if}
  </div>
{/if}

<style>
  .sesso { font-size: 1.2rem; color: var(--testo-tenue); }
  .segno { margin: 6px 0 2px; }
  .barra-riga { display: grid; grid-template-columns: 120px 1fr; align-items: center; gap: 8px; margin: 6px 0; font-size: 0.95rem; }
  .barra { height: 12px; border: 2px solid var(--inchiostro); border-radius: 3px; background: #fffaf0; overflow: hidden; }
  .barra div { height: 100%; }
  ul { padding-left: 18px; margin: 0; }
</style>
