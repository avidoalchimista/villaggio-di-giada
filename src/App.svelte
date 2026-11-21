<script lang="ts">
  import { onMount } from 'svelte';
  import { aggiornaTempo, app, avvia, chiudiGuidaIcona, vai, type Schermata } from './lib/app.svelte';
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

  const voci: { s: Schermata; nome: string; icona: string }[] = [
    { s: 'villaggio', nome: 'Villaggio', icona: 'M4 20 L4 11 L12 4 L20 11 L20 20 Z M10 20 L10 14 L14 14 L14 20' },
    { s: 'diario', nome: 'Diario', icona: 'M6 3 L18 3 L18 21 L6 21 Z M9 8 L15 8 M9 12 L15 12 M9 16 L13 16' },
    { s: 'storia', nome: 'Storia', icona: 'M3 6 Q8 3 12 6 Q16 3 21 6 L21 19 Q16 16 12 19 Q8 16 3 19 Z M12 6 L12 19' },
    { s: 'statistiche', nome: 'Percorso', icona: 'M4 20 L4 4 M4 20 L20 20 M7 16 L11 11 L14 13 L19 7' },
    { s: 'impostazioni', nome: 'Altro', icona: 'M12 8 A4 4 0 1 1 11.99 8 M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12' },
  ];
</script>

{#if app.schermata === 'caricamento'}
  <div class="pagina centro" style="padding-top:40vh"><p class="tenue">…</p></div>
{:else if app.schermata === 'intro'}
  <Intro />
{:else if app.schermata === 'icona' && !app.stato}
  <div class="pagina" style="padding-top:28px">
    <h1 style="text-align:center">Il villaggio di Giada</h1>
    <GuidaIcona onfatto={chiudiGuidaIcona} />
  </div>
{:else}
  {#if app.schermata === 'villaggio'}<Gioco />
  {:else if app.schermata === 'diario'}<Diario />
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d={v.icona} /></svg>
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
