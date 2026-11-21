<script lang="ts">
  // La storia come un libro: indice con i capitoli (quelli chiusi dicono cosa manca), e una pagina per leggerli.
  import Corvo from '../componenti/Corvo.svelte';
  import CorvoDisegno from '../componenti/CorvoDisegno.svelte';
  import { app, dataDiOggi, segnaCapitoloLetto } from '../lib/app.svelte';
  import { requisitiCapitolo, STORIA, type Capitolo } from '../lib/gioco';

  let s = $derived(app.stato!);
  let sbloccati = $derived(STORIA.filter((c) => s.capitoli.includes(c.id)));
  let prossimo = $derived(STORIA.find((c) => !s.capitoli.includes(c.id)) ?? null);
  let requisiti = $derived(prossimo ? requisitiCapitolo(s, prossimo, dataDiOggi()) : []);
  let chiusiDopo = $derived(Math.max(0, STORIA.length - sbloccati.length - 1));

  let aperto = $state<Capitolo | null>(null);
  let numeroAperto = $derived(aperto ? sbloccati.findIndex((c) => c.id === aperto!.id) : -1);

  function apri(c: Capitolo) {
    aperto = c;
    window.scrollTo({ top: 0 });
    segnaCapitoloLetto(c.id);
  }
  function sfoglia(d: number) {
    const c = sbloccati[numeroAperto + d];
    if (c) apri(c);
  }
</script>

<div class="pagina">
  {#if aperto}
    <header class="testata">
      <button class="pillola-bottone" onclick={() => (aperto = null)}>‹ Indice</button>
      <span class="pillola">Capitolo {numeroAperto + 1} di {STORIA.length}</span>
    </header>
    {#key aperto.id}
      <article class="libro">
        <div class="numero-capitolo">Capitolo {numeroAperto + 1}</div>
        <h1>{aperto.titolo}</h1>
        <div class="fregio" aria-hidden="true">❦</div>
        <p class="racconto">{aperto.testo}</p>
        <div class="firma">
          <div class="mini-corvo"><CorvoDisegno /></div>
          <span>racconta il corvo</span>
        </div>
      </article>
    {/key}
    <div class="riga tra">
      <button class="secondario tondo" disabled={numeroAperto <= 0} onclick={() => sfoglia(-1)}>‹ Prima</button>
      {#if numeroAperto < sbloccati.length - 1}
        <button class="tondo" onclick={() => sfoglia(1)}>Avanti ›</button>
      {:else}
        <button class="secondario tondo" onclick={() => (aperto = null)}>Fine, per ora</button>
      {/if}
    </div>
  {:else}
    <header class="testata">
      <h1>La storia</h1>
      <span class="pillola">📖 {sbloccati.length} / {STORIA.length}</span>
    </header>

    {#if !sbloccati.length}
      <Corvo testo="La storia di questo bosco si racconta piano. Il primo capitolo arriverà quando nascerà il tuo primo animale." piccolo />
    {/if}

    <div class="indice">
      {#each sbloccati as c, i (c.id)}
        <button class="capitolo aperto appare" onclick={() => apri(c)}>
          <span class="medaglia">{i + 1}</span>
          <span class="corpo">
            <span class="titolo">{c.titolo}</span>
            <span class="anteprima">{c.testo.slice(0, 70)}…</span>
          </span>
          {#if !app.capitoliLetti.includes(c.id)}<span class="nuovo">NUOVO!</span>{/if}
        </button>
      {/each}

      {#if prossimo}
        <div class="capitolo chiuso prossimo appare">
          <span class="medaglia">🔒</span>
          <span class="corpo">
            <span class="titolo">Capitolo {sbloccati.length + 1}: ???</span>
            <span class="serve">Per aprirlo serve:</span>
            {#each requisiti as r (r.chiave)}
              <span class="requisito" class:fatto={r.ora >= r.serve}>
                <span class="spunta">{r.ora >= r.serve ? '✓' : '·'}</span>
                <span class="nome-req">{r.testo}</span>
                <span class="contatore">{r.ora}/{r.serve}</span>
                <span class="barretta"><span style:width="{(r.ora / r.serve) * 100}%"></span></span>
              </span>
            {/each}
          </span>
        </div>
      {/if}

      {#each Array(chiusiDopo) as _, k}
        <div class="capitolo chiuso lontano">
          <span class="medaglia">🔒</span>
          <span class="corpo"><span class="titolo">Capitolo {sbloccati.length + 2 + k}: ???</span></span>
        </div>
      {/each}
    </div>

    {#if !prossimo}
      <p class="tenue centro">Per ora la storia finisce qui. Il corvo sta ancora scrivendo il seguito…</p>
    {/if}
  {/if}
</div>

<style>
  .testata { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 16px; }
  .testata h1 { margin: 0; }
  .pillola, .pillola-bottone {
    background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 999px; box-shadow: 0 4px 0 var(--legno-scuro);
    padding: 5px 14px; font-size: 0.95rem; font-weight: 800; text-shadow: none; white-space: nowrap;
  }

  .indice { display: flex; flex-direction: column; gap: 14px; }
  .capitolo {
    display: flex; align-items: flex-start; gap: 12px; width: 100%; text-align: left; position: relative;
    border-radius: 18px; padding: 12px 14px; font-weight: 700;
  }
  /* i capitoli aperti hanno il colore della notte del corvo */
  .capitolo.aperto { background: linear-gradient(#4a5aa0, #33407a); color: #fff8e7; border: 3px solid #2a3466; box-shadow: 0 5px 0 #1d2550; text-shadow: none; }
  .capitolo.chiuso { background: #f6ead0aa; border: 3px dashed var(--legno); color: var(--testo-tenue); }
  .capitolo.lontano { opacity: 0.6; padding: 8px 14px; }
  .medaglia {
    flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-weight: 900; font-size: 1.2rem;
    background: var(--oro); color: var(--legno-scuro); border: 3px solid #fff8e7; outline: 2px solid var(--legno-scuro);
  }
  .chiuso .medaglia { background: var(--panna-2); outline-color: var(--legno); font-size: 1rem; }
  .lontano .medaglia { width: 32px; height: 32px; font-size: 0.8rem; }
  .corpo { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
  .titolo { font-weight: 900; font-size: 1.1rem; }
  .aperto .anteprima { font-size: 0.88rem; color: #d8def5; font-weight: 600; }
  .chiuso .titolo { color: var(--legno-scuro); }
  .lontano .titolo { font-size: 0.95rem; align-self: center; margin-top: 4px; }
  .nuovo {
    position: absolute; top: -12px; right: 12px; background: var(--brace); color: #fff; font-weight: 900; font-size: 0.75rem;
    padding: 2px 10px; border-radius: 999px; border: 3px solid var(--legno); transform: rotate(4deg); animation: saltella 1.4s ease-in-out infinite;
  }
  @keyframes saltella { 50% { transform: rotate(4deg) translateY(-3px); } }

  .serve { font-size: 0.85rem; margin: 4px 0 2px; }
  .requisito { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 2px 6px; font-size: 0.9rem; color: var(--inchiostro); margin-top: 4px; }
  .spunta { font-weight: 900; color: var(--testo-tenue); }
  .fatto .spunta { color: var(--foglia-scura); }
  .fatto .nome-req { text-decoration: line-through; color: var(--testo-tenue); }
  .contatore { font-size: 0.8rem; color: var(--testo-tenue); }
  .barretta { grid-column: 2 / 4; height: 8px; border: 2px solid var(--legno); border-radius: 999px; background: #fff; overflow: hidden; }
  .barretta span { display: block; height: 100%; background: var(--foglia); border-radius: 999px; }
  .fatto .barretta span { background: var(--oro); }

  /* pagina del libro */
  .libro {
    background:
      radial-gradient(circle at 0 0, #e9d6a6 0 2%, transparent 30%),
      radial-gradient(circle at 100% 100%, #e9d6a6 0 2%, transparent 30%),
      #fff6df;
    border: var(--bordo); border-radius: 6px 20px 20px 6px; padding: 22px 20px 16px 26px; margin-bottom: 18px; position: relative;
    box-shadow: inset 10px 0 12px -8px #8a5a3655, 0 5px 0 var(--legno-scuro), 0 10px 20px rgba(0, 0, 0, 0.12);
    animation: gira 0.45s ease-out both; transform-origin: left center;
  }
  @keyframes gira { from { transform: perspective(900px) rotateY(-35deg); opacity: 0; } to { transform: none; opacity: 1; } }
  .numero-capitolo { text-align: center; font-size: 0.8rem; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: var(--brace); }
  .libro h1 { text-align: center; margin: 4px 0 0; }
  .fregio { text-align: center; color: var(--legno); font-size: 1.3rem; margin-bottom: 8px; }
  .racconto { font-size: 1.1rem; line-height: 1.75; font-weight: 600; }
  .racconto::first-letter {
    float: left; font-size: 2.4rem; line-height: 1; font-weight: 900; color: #fff8e7; background: var(--notte-blu);
    border: 3px solid var(--legno); border-radius: 12px; padding: 4px 10px 6px; margin: 4px 10px 0 0; box-shadow: 0 3px 0 var(--legno-scuro);
  }
  .firma { display: flex; align-items: center; justify-content: flex-end; gap: 8px; color: var(--testo-tenue); font-size: 0.85rem; font-style: italic; }
  .mini-corvo { width: 34px; height: 42px; }
  .mini-corvo :global(svg) { width: 100%; height: 100%; }
</style>
