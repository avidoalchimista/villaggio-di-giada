<script lang="ts">
  // Finestra "Costruisci": come nei giochi di ruolo per console, con le castagne come moneta
  // (nel codice il campo si chiama ancora "ghiande" per non rompere i salvataggi).
  import { app, costruisciQui } from '../lib/app.svelte';
  import { REGOLE, statoCostruzione, type DefCostruzione } from '../lib/gioco';
  import type { Evento } from '../lib/tipi';

  let { onchiudi, oncostruito }: { onchiudi: () => void; oncostruito: (e: Evento) => void } = $props();
  let s = $derived(app.stato!);
  let scelta = $state<DefCostruzione | null>(null);
  let vediFatte = $state(false);
  // prima quelle che si possono fare, poi quelle quasi pronte; le altre da scoprire e quelle già fatte stanno piegate
  let gruppi = $derived.by(() => {
    const pronte: DefCostruzione[] = [], quasi: DefCostruzione[] = [], chiuse: DefCostruzione[] = [], fatte: DefCostruzione[] = [];
    for (const c of REGOLE.costruzioni) {
      const st = statoCostruzione(s, c);
      (st === 'pronta' ? pronte : st === 'fatta' ? fatte : st === 'bloccata' ? chiuse : quasi).push(c);
    }
    return { pronte, quasi, chiuse, fatte };
  });

  const nomeDi = (id?: string) => REGOLE.costruzioni.find((c) => c.id === id)?.nome ?? '';

  function motivo(c: DefCostruzione): string {
    if (c.richiede && !s.costruzioni.some((x) => x.id === c.richiede)) return `Prima serve ${nomeDi(c.richiede).toLowerCase()}`;
    if (c.pagine && s.numeroVoci < c.pagine) return `Dopo ${c.pagine} pagine di diario (ora ${s.numeroVoci})`;
    if (s.ghiande < c.costo) return `Mancano ${c.costo - s.ghiande} castagne`;
    return '';
  }

  async function conferma() {
    if (!scelta) return;
    const ev = await costruisciQui(scelta.id);
    if (ev) oncostruito(ev);
  }
</script>

<div class="finestra">
  <div class="testata">
    <span>COSTRUISCI</span>
    <span class="borsa">🌰 {s.ghiande}</span>
  </div>
  {#if scelta}
    <div class="dettaglio">
      <h3>{scelta.nome}</h3>
      <p>{scelta.descrizione}</p>
      <p class="costo">Costa 🌰 {scelta.costo}</p>
      <div class="riga">
        <button class="tondo grigio" onclick={() => (scelta = null)}>Indietro</button>
        <button class="tondo" onclick={conferma}>Costruiamo!</button>
      </div>
    </div>
  {:else}
    <ul>
      {#each gruppi.pronte as c (c.id)}
        <li><button class="voce pronta" onclick={() => (scelta = c)}><span class="nome">{c.nome}</span><span class="prezzo">🌰 {c.costo}</span></button></li>
      {:else}
        <li class="niente">Per ora non c'è niente di nuovo da costruire.</li>
      {/each}
      {#each gruppi.quasi as c (c.id)}
        <li><button class="voce" disabled><span class="nome">{c.nome}</span><span class="prezzo">🌰 {c.costo}</span><span class="motivo">{motivo(c)}</span></button></li>
      {/each}
      {#if gruppi.chiuse.length}
        {@const c = gruppi.chiuse[0]}
        <li><button class="voce bloccata" disabled><span class="nome">🔒 ???</span><span class="prezzo">🌰 {c.costo}</span><span class="motivo">{motivo(c)}{gruppi.chiuse.length > 1 ? ` · e altre ${gruppi.chiuse.length - 1} da scoprire` : ''}</span></button></li>
      {/if}
      {#if gruppi.fatte.length}
        <li><button class="voce piega" onclick={() => (vediFatte = !vediFatte)}><span class="nome">✔ Già costruite ({gruppi.fatte.length})</span><span class="prezzo">{vediFatte ? '▲' : '▼'}</span></button></li>
        {#if vediFatte}
          {#each gruppi.fatte as c (c.id)}
            <li><div class="voce fatta"><span class="nome">{c.nome}</span><span class="prezzo">✔</span></div></li>
          {/each}
        {/if}
      {/if}
    </ul>
    <p class="aiuto">Le castagne arrivano scrivendo nel diario, esaudendo le richieste degli animali e raccogliendo quelle cadute sotto il castagno.</p>
    <button class="tondo grigio chiudi" onclick={onchiudi}>Chiudi</button>
  {/if}
</div>

<style>
  .finestra {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.94), rgba(18, 28, 70, 0.96));
    border: 3px solid #d8e4ff;
    outline: 3px solid #1a2350;
    border-radius: 14px;
    color: #f2f6ff;
    padding: 12px 12px 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), inset 0 0 0 2px rgba(255, 255, 255, 0.08);
    animation: apri 0.25s ease-out both;
    max-height: 62dvh;
    display: flex;
    flex-direction: column;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { display: flex; justify-content: space-between; font-weight: 900; letter-spacing: 0.12em; border-bottom: 2px solid rgba(216, 228, 255, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
  .borsa { letter-spacing: 0; color: #ffe08a; }
  ul { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
  .voce {
    width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; text-align: left;
    background: rgba(255, 255, 255, 0.06); border: 2px solid transparent; box-shadow: none; border-radius: 8px;
    color: #f2f6ff; padding: 8px 10px; margin-bottom: 4px; font-weight: 800; text-shadow: none;
  }
  .voce:not(:disabled):hover, .voce:not(:disabled):focus { border-color: #ffe08a; background: rgba(255, 224, 138, 0.12); }
  .voce:not(:disabled)::before { content: '▶'; color: #ffe08a; position: absolute; margin-left: -2px; opacity: 0; }
  .voce:disabled { opacity: 1; }
  .voce.bloccata { color: #8f9bc4; }
  .voce.fatta { color: #9fe3a0; font-size: 0.9rem; padding: 5px 10px; }
  .voce.pronta { background: rgba(255, 224, 138, 0.14); border-color: rgba(255, 224, 138, 0.45); }
  .voce.piega { color: #9fe3a0; background: transparent; }
  .niente { font-size: 0.88rem; color: #c4cff0; padding: 6px 4px; }
  .prezzo { color: #ffe08a; }
  .fatta .prezzo { color: #9fe3a0; }
  .motivo { grid-column: 1 / -1; font-size: 0.78rem; font-weight: 700; color: #aab6dc; }
  .aiuto { font-size: 0.8rem; color: #c4cff0; margin: 10px 2px; }
  .chiudi { align-self: center; }
  .dettaglio h3 { color: #ffe08a; margin-bottom: 6px; }
  .dettaglio p { color: #e4eaff; }
  .costo { font-weight: 900; color: #ffe08a !important; }
</style>
