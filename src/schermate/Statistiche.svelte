<script lang="ts">
  // "Cosa sta succedendo": descrittivo, mai giudizi.
  import { app } from '../lib/app.svelte';
  import { meseDi } from '../lib/date';
  import { EMOZIONE, NOME_FORZA } from '../lib/etichette';
  import { EMOZIONI, type Emozione, type Forza } from '../lib/tipi';

  let totForze = $derived.by(() => {
    const t: Partial<Record<Forza, number>> = {};
    for (const v of app.voci) for (const [k, n] of Object.entries(v.forze) as [Forza, number][]) t[k] = (t[k] ?? 0) + n;
    return (Object.entries(t) as [Forza, number][]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  });
  let maxF = $derived(Math.max(1, ...totForze.map(([, n]) => n)));

  let mesi = $derived.by(() => {
    const m = new Map<string, Partial<Record<Emozione, number>>>();
    for (const v of app.voci) {
      const k = meseDi(v.data);
      const r = m.get(k) ?? {};
      for (const [e, n] of Object.entries(v.emozioni) as [Emozione, number][]) r[e] = (r[e] ?? 0) + n;
      m.set(k, r);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 12);
  });

  const nomeMese = (k: string) => new Date(k + '-15T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  let momenti = $derived(app.stato!.eventi.filter((e) => ['schiusa', 'mestiere', 'edificio', 'storia'].includes(e.tipo)).slice(-10).reverse());
</script>

<div class="pagina">
  <h1>Cosa sta succedendo</h1>
  <p class="tenue">{app.voci.length} pagine di diario, {app.stato!.animali.length} abitanti, {app.stato!.edifici.length} edifici.</p>

  <div class="vignetta">
    <span class="didascalia">Le forze più nutrite</span>
    {#each totForze as [f, n]}
      <div class="r"><span>{NOME_FORZA[f]}</span><div class="barra"><div style:width="{(n / maxF) * 100}%"></div></div></div>
    {:else}
      <p class="tenue">Appariranno con le prime pagine.</p>
    {/each}
  </div>

  <div class="vignetta">
    <span class="didascalia">I colori dei mesi</span>
    {#each mesi as [k, em]}
      {@const tot = EMOZIONI.reduce((s, e) => s + (em[e] ?? 0), 0) || 1}
      <div class="mese">
        <span class="nome">{nomeMese(k)}</span>
        <div class="striscia">
          {#each EMOZIONI.filter((e) => em[e]) as e}
            <div style:flex={em[e]! / tot} style:background={EMOZIONE[e].colore} title={EMOZIONE[e].nome}></div>
          {/each}
        </div>
      </div>
    {:else}
      <p class="tenue">Ancora nessun mese.</p>
    {/each}
    <div class="legenda">
      {#each EMOZIONI as e}<span><i style:background={EMOZIONE[e].colore}></i>{EMOZIONE[e].nome}</span>{/each}
    </div>
  </div>

  {#if momenti.length}
    <div class="vignetta scura">
      <span class="didascalia">Momenti importanti</span>
      <ul>{#each momenti as m}<li><span class="tenue-chiaro">{m.data}</span> {m.testo}</li>{/each}</ul>
    </div>
  {/if}
</div>

<style>
  .r { display: grid; grid-template-columns: 140px 1fr; gap: 8px; align-items: center; margin: 6px 0; font-size: 0.95rem; }
  .barra { height: 12px; border: 2px solid var(--inchiostro); background: #fffaf0; border-radius: 3px; overflow: hidden; }
  .barra div { height: 100%; background: var(--brace); }
  .mese { margin: 8px 0; }
  .mese .nome { font-size: 0.9rem; text-transform: capitalize; }
  .striscia { display: flex; height: 18px; border: 2px solid var(--inchiostro); border-radius: 3px; overflow: hidden; }
  .legenda { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 10px; font-size: 0.8rem; }
  .legenda i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; border: 1px solid var(--inchiostro); }
  ul { padding-left: 18px; margin: 0; }
  .tenue-chiaro { color: var(--carta-scura); font-size: 0.85rem; }
</style>
