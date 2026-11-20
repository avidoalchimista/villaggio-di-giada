<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import Ritratto from '../componenti/Ritratto.svelte';
  import frasi from '../dati/frasi.json';
  import { app, chiudiMentreEriVia, dataDiOggi, segnaBackupFatto, vai } from '../lib/app.svelte';
  import { giorniTra } from '../lib/date';
  import { NOME_FASE } from '../lib/etichette';
  import { accorda, nomeAnimale, nomeSpecie, REGOLE } from '../lib/gioco';

  let s = $derived(app.stato!);
  let nati = $derived(s.animali.filter((a) => a.fase !== 'uovo'));
  let uova = $derived(s.animali.filter((a) => a.fase === 'uovo'));

  // cosa dice il corvo oggi
  let corvoId = $derived.by(() => {
    if (app.mentreEriVia.length) return 'bentornata';
    if (s.numeroVoci === 0) return 'primo_uovo';
    const ultimo = s.ultimoBackupRicordato ?? s.inizio;
    if (s.numeroVoci >= 5 && giorniTra(ultimo, dataDiOggi()) >= 30) return 'backup';
    return '';
  });

  function frase(a: (typeof s.animali)[number]): string {
    if (a.addormentato) return accorda(frasi.animali.addormentato[0], a);
    const lista = a.umore < 45 ? frasi.animali.richiesta : frasi.animali.saluto;
    return lista[(a.id.length + s.numeroVoci) % lista.length];
  }

  const nomiEdifici = Object.fromEntries(REGOLE.edifici.map((e) => [e.tipo, e.nome]));
</script>

<div class="pagina">
  <header class="riga tra">
    <h1>{s.nomeVillaggio}</h1>
  </header>

  {#if corvoId === 'bentornata'}
    <div class="vignetta scura appare">
      <span class="didascalia">Mentre eri via</span>
      <ul class="via">
        {#each app.mentreEriVia.slice(-8) as e}
          <li>{e.testo}</li>
        {/each}
      </ul>
      <button class="secondario" onclick={chiudiMentreEriVia}>Ho capito</button>
    </div>
  {:else if corvoId === 'backup'}
    <Corvo id="backup" piccolo />
    <div class="riga" style="margin:-6px 0 16px">
      <button class="secondario" onclick={() => vai('impostazioni')}>Salva una copia</button>
      <button class="leggero" onclick={segnaBackupFatto}>Più tardi</button>
    </div>
  {:else if corvoId}
    <Corvo id={corvoId} piccolo />
  {/if}

  <button class="largo scrivi" onclick={() => vai('diario')}>Scrivi nel diario</button>

  {#if nati.length}
    <h2 class="sezione">Gli abitanti</h2>
    <div class="griglia">
      {#each nati as a (a.id)}
        <button class="scheda vignetta" onclick={() => vai('animale', a.id)}>
          <Ritratto animale={a} taglia={96} />
          <strong>{a.nome || nomeSpecie(a)}</strong>
          <span class="tenue">{a.mestiere ?? NOME_FASE[a.fase]}</span>
          <span class="umore" style:width="{a.umore}%"></span>
        </button>
      {/each}
    </div>
    {#if nati[0]}
      <div class="nuvola parla appare">«{frase(nati[0])}» <span class="tenue">— {nomeAnimale(nati[0])}</span></div>
    {/if}
  {/if}

  {#if uova.length}
    <h2 class="sezione">Nel nido</h2>
    <div class="griglia">
      {#each uova as a (a.id)}
        <div class="scheda vignetta">
          <Ritratto animale={a} taglia={80} />
          <span class="tenue">{a.vociPerSchiudersi === 1 ? 'Manca una pagina' : `Mancano ${a.vociPerSchiudersi} pagine`}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if s.edifici.length}
    <h2 class="sezione">Il villaggio</h2>
    {#each s.edifici as e}
      {@const g = s.animali.find((a) => a.id === e.gestore)}
      <div class="vignetta edificio" class:fermo={e.stato === 'fermo'} class:lento={e.stato === 'lento'}>
        <div class="riga tra">
          <strong>{nomiEdifici[e.tipo]}</strong>
          <span class="stato">{e.stato}</span>
        </div>
        <span class="tenue">gestito da {g ? nomeAnimale(g) : '…'}</span>
      </div>
    {/each}
  {:else if nati.length}
    <p class="tenue centro">Il villaggio è ancora una radura. Quando qualcuno imparerà un mestiere, nascerà il primo edificio.</p>
  {/if}
</div>

<style>
  header h1 { margin: 0; }
  .scrivi { margin: 4px 0 22px; font-size: 1.1rem; padding: 14px; }
  .sezione { margin-top: 10px; border-bottom: 2px solid var(--inchiostro); padding-bottom: 4px; }
  .scheda {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    background: #f4ecdc; color: var(--testo); font-family: var(--font-testo); font-weight: normal;
    margin: 0; overflow: hidden;
  }
  .umore { position: absolute; left: 0; bottom: 0; height: 5px; background: var(--brace); }
  .parla { margin: 6px 0 28px; }
  .via { padding-left: 18px; margin: 4px 0 12px; }
  .via li { margin-bottom: 6px; }
  .edificio .stato { font-family: var(--font-titoli); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.06em; color: var(--muschio); }
  .edificio.lento .stato { color: var(--oro); }
  .edificio.fermo { filter: grayscale(0.7); }
  .edificio.fermo .stato { color: var(--brace); }
</style>
