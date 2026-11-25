<script lang="ts">
  import { onMount } from 'svelte';
  import { aggiornaTempo, app, avvia, chiudiGuidaIcona, vai, type Schermata } from './lib/app.svelte';
  import { STORIA } from './lib/gioco';
  import Animale from './schermate/Animale.svelte';
  import Diario from './schermate/Diario.svelte';
  import Impostazioni from './schermate/Impostazioni.svelte';
  import Intro from './schermate/Intro.svelte';
  import Statistiche from './schermate/Statistiche.svelte';
  import Storia from './schermate/Storia.svelte';
  import Gioco from './schermate/Gioco.svelte';
  import GuidaIcona from './componenti/GuidaIcona.svelte';
  import ComeSiGioca from './componenti/ComeSiGioca.svelte';
  import { doveSiamo } from './lib/telefono';
  import Icona, { type NomeIcona } from './componenti/Icona.svelte';
  import Logo from './componenti/Logo.svelte';

  // promemoria piccolo finché il villaggio è aperto nel browser invece che dall'icona
  const dove = doveSiamo();
  let promemoriaChiuso = $state(false);
  let promemoria = $derived(!promemoriaChiuso && (dove === 'iphone' || dove === 'android' || dove === 'dentro-app') && app.schermata === 'villaggio' && app.codaDialoghi.length === 0);

  onMount(() => {
    avvia();
    // se l'app resta aperta a cavallo della mezzanotte, il tempo va avanti lo stesso
    const quandoTorna = () => document.visibilityState === 'visible' && aggiornaTempo();
    document.addEventListener('visibilitychange', quandoTorna);
    return () => document.removeEventListener('visibilitychange', quandoTorna);
  });

  // pallino sulla Storia quando c'è un capitolo ancora da leggere
  let storiaNuova = $derived(!!app.stato?.capitoli.some((id) => STORIA.some((c) => c.id === id) && !app.capitoliLetti.includes(id)));

  const voci: { s: Schermata; nome: string; icona: NomeIcona }[] = [
    { s: 'villaggio', nome: 'Villaggio', icona: 'villaggio' },
    { s: 'diario', nome: 'Diario', icona: 'diario' },
    { s: 'storia', nome: 'Storia', icona: 'storia' },
    { s: 'statistiche', nome: 'Percorso', icona: 'percorso' },
    { s: 'impostazioni', nome: 'Altro', icona: 'altro' },
  ];
</script>

{#if app.schermata === 'caricamento'}
  <div class="pagina centro" style="padding-top:40vh"><p class="tenue">…</p></div>
{:else if app.schermata === 'intro'}
  <Intro />
{:else if app.schermata === 'icona' && !app.stato}
  <div class="pagina" style="padding-top:28px">
    <Logo larghezza={200} />
    <h1 style="text-align:center">Il villaggio di Giada</h1>
    <GuidaIcona onfatto={chiudiGuidaIcona} />
  </div>
{:else}
  <!-- il villaggio resta sempre pronto sotto le altre pagine: tornandoci non si ricostruisce da capo -->
  {#if app.stato}<Gioco attivo={app.schermata === 'villaggio'} />{/if}
  {#if app.schermata === 'diario'}<Diario />
  {:else if app.schermata === 'animale'}<Animale />
  {:else if app.schermata === 'storia'}<Storia />
  {:else if app.schermata === 'statistiche'}<Statistiche />
  {:else if app.schermata === 'impostazioni'}<Impostazioni />
  {:else if app.schermata === 'guida'}
    <div class="pagina"><h1>Come si gioca</h1><ComeSiGioca onfine={() => vai('villaggio')} /></div>
  {:else if app.schermata === 'icona'}
    <div class="pagina"><h1>Icona sul telefono</h1><GuidaIcona onfatto={chiudiGuidaIcona} /></div>
  {/if}

  {#if promemoria}
    <div class="promemoria appare">
      <button class="apri" onclick={() => vai('icona')}>📲 Metti l'icona sul telefono</button>
      <button class="chiudi" aria-label="Chiudi" onclick={() => (promemoriaChiuso = true)}>×</button>
    </div>
  {/if}

  <nav class="barra">
    {#each voci as v}
      <button class:attivo={app.schermata === v.s || (v.s === 'villaggio' && app.schermata === 'animale')} onclick={() => vai(v.s)}>
        {#if v.s === 'storia' && storiaNuova}<span class="avviso" aria-label="capitolo nuovo"></span>{/if}
        <Icona nome={v.icona} taglia={28} />
        {v.nome}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .promemoria { position: fixed; left: 12px; top: calc(76px + env(safe-area-inset-top)); z-index: 30; display: flex; gap: 6px; align-items: center; }
  .promemoria .apri { font-size: 0.92rem; padding: 8px 16px; background: var(--foglia); }
  .promemoria .chiudi { padding: 4px 11px; font-size: 1.1rem; background: var(--panna-2); color: var(--inchiostro); text-shadow: none; }
</style>
