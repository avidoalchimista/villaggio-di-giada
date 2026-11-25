<script lang="ts">
  // «Dai una mano»: il minigioco di una bottega. Prima l'animale spiega come si fa, poi si gioca nella sua
  // piccola scena 3D (il villaggio intanto si ferma), alla fine le castagne, una frase gentile e la cosa fatta,
  // che resta nel villaggio. Mai si perde: anche la partita peggiore dà una castagna.
  import { onDestroy, onMount } from 'svelte';
  import { app, costellazioneQui, dataDiOggi, minigiocoFatto } from '../lib/app.svelte';
  import { nomeAnimale } from '../lib/gioco';
  import { livelloCasa } from '../lib/migliorie';
  import {
    fraseFine, minigiocoDi, PARTITE_PAGATE, partiteOggi, stellinePer, type Costellazione, type DefMinigioco, type FotoAlbum,
  } from '../lib/minigiochi';
  import { SIMBOLO_SPECIE } from '../lib/etichette';
  import type { Animale } from '../lib/tipi';
  import type { FineMinigioco, Info, Palco } from '../scena/minigiochi/palco';

  let { animale, amici = [], onchiudi }: { animale: Animale; amici?: Animale[]; onchiudi: () => void } = $props();

  // (l'animale non cambia mentre si gioca: il componente si ricrea per ogni partita)
  // svelte-ignore state_referenced_locally
  const def = minigiocoDi(animale.mestiere) as DefMinigioco;
  let canvas: HTMLCanvasElement;
  let gioco: Palco | null = null;
  let fase = $state<'intro' | 'gioco' | 'fine'>('intro');
  let info = $state<Info>({ testo: '' });
  let fine = $state<(FineMinigioco & { castagne: number; restano: number; frase: string }) | null>(null);
  let nomeStelle = $state('');
  let stelleSalvate = $state(false);
  let errore = $state(false);
  let partita = 0;

  const nome = (a: Animale) => { const n = a.nome || nomeAnimale(a); return n.charAt(0).toUpperCase() + n.slice(1); };
  // svelte-ignore state_referenced_locally
  const livello = livelloCasa(animale);
  const pagateOggi = $derived.by(() => { void fine; return app.stato ? Math.max(0, PARTITE_PAGATE - partiteOggi(app.stato, def.id, dataDiOggi())) : 0; });

  async function crea() {
    gioco?.distruggi();
    gioco = null;
    try {
      switch (def.id) {
        case 'legna': { const { Legna } = await import('../scena/minigiochi/legna'); gioco = new Legna(canvas, animale, livello); break; }
        case 'torta': { const { Torta } = await import('../scena/minigiochi/torta'); gioco = new Torta(canvas, animale, livello); break; }
        case 'tornio': { const { Tornio } = await import('../scena/minigiochi/tornio'); gioco = new Tornio(canvas, animale, livello); break; }
        case 'foto': { const { Foto } = await import('../scena/minigiochi/foto'); gioco = new Foto(canvas, animale, livello, amici); break; }
        case 'stelle': {
          const { Stelle } = await import('../scena/minigiochi/stelle');
          gioco = new Stelle(canvas, animale, livello, (app.stato?.botteghe?.stelle ?? []).map((c) => c.forma));
          break;
        }
        case 'moto': { const { Moto } = await import('../scena/minigiochi/moto'); gioco = new Moto(canvas, animale, livello); break; }
      }
    } catch (e) {
      console.error(e);
      errore = true;
      return;
    }
    if (!gioco) return;
    gioco.onInfo = (i) => (info = i);
    gioco.onFine = finita;
    if (import.meta.env.DEV) (window as unknown as { minigioco: Palco }).minigioco = gioco;
  }

  onMount(crea);
  onDestroy(() => gioco?.distruggi());

  function comincia() {
    fase = 'gioco';
    fine = null;
    gioco?.inizia();
  }

  async function ancora() {
    partita++;
    fine = null;
    stelleSalvate = false;
    await crea();
    comincia();
  }

  async function finita(f: FineMinigioco) {
    const r = f.ricordo ?? {};
    // la costellazione si salva quando Giada le ha dato un nome; la foto va nell'album con chi c'era
    const ricordo = { ...r } as Parameters<typeof minigiocoFatto>[3] & { foto?: string | FotoAlbum };
    if (def.id === 'stelle') delete ricordo!.stelle;
    if (typeof r.foto === 'string') ricordo!.foto = { data: '', foto: r.foto, chi: amici.slice(0, 4).map((a) => a.id) };
    const esito = await minigiocoFatto(def.id, animale.id, f.punti, ricordo as Parameters<typeof minigiocoFatto>[3]);
    fine = { ...f, castagne: esito?.castagne ?? 0, restano: esito?.restano ?? 0, frase: fraseFine(def.id, f.punti, Date.now() + partita) };
    if (def.id === 'stelle') {
      const c = r.stelle as Costellazione | undefined;
      nomeStelle = c ? c.nome.charAt(0).toUpperCase() + c.nome.slice(1) + ' di Giada' : '';
    }
    fase = 'fine';
  }

  async function salvaStelle() {
    const c = fine?.ricordo?.stelle as Costellazione | undefined;
    if (!c || stelleSalvate) return;
    const n = nomeStelle.trim().slice(0, 30) || c.nome;
    await costellazioneQui({ ...c, nome: n });
    stelleSalvate = true;
  }

  /** Il minigioco si apre sopra a tutto, anche sopra la barra in basso. */
  function sopraATutto(nodo: HTMLElement) {
    document.body.appendChild(nodo);
    return { destroy: () => nodo.remove() };
  }

  // i biglietti da copiare, in piccolo
  const COLORE_DECORO: Record<string, string> = { panna: '#ffffff', fragola: '#e8343a', mirtillo: '#3a4a9a', cioccolato: '#6a3a20' };
  function pathVaso(profilo: number[], alto: number) {
    const h = 70 * Math.min(1, alto / 1.4), y0 = 88;
    const pts = profilo.map((r, i) => [r * 42, y0 - (i / (profilo.length - 1)) * h]);
    const dx = pts.map(([x, y]) => `${50 + x},${y}`).join(' L');
    const sx = [...pts].reverse().map(([x, y]) => `${50 - x},${y}`).join(' L');
    return `M50,${y0} L${dx} L${sx} Z`;
  }
</script>

<div class="minigioco" use:sopraATutto>
  <canvas bind:this={canvas} class="palco"></canvas>
  {#if errore}<div class="errore">Questo telefono non riesce a disegnare il gioco in 3D.</div>{/if}

  <header class="testata">
    <button class="esci" onclick={onchiudi}>← Villaggio</button>
    <div class="titolo">
      <div class="nome">{def.icona} {def.nome}</div>
      <div class="ora">{fase === 'gioco' && info.conta ? info.conta : `Con ${nome(animale)} ${SIMBOLO_SPECIE[animale.specie]}`}</div>
    </div>
  </header>

  {#if fase === 'gioco'}
    {#if info.torta}
      <div class="biglietto">
        <div class="b-titolo">Il biglietto</div>
        <svg viewBox="-1.15 -1.15 2.3 2.3" class="b-torta" aria-hidden="true">
          <circle r="1.1" fill="#fbe6ee" stroke="#c87a8a" stroke-width="0.06" />
          {#each info.torta as p, i (i)}
            {#if p.tipo === 'fragola'}<path d="M{p.x - 0.09},{p.y - 0.06} L{p.x + 0.09},{p.y - 0.06} L{p.x},{p.y + 0.12} Z" fill="#e8343a" stroke="#7a1a1a" stroke-width="0.02" />
            {:else}<circle cx={p.x} cy={p.y} r={p.tipo === 'mirtillo' ? 0.07 : 0.09} fill={COLORE_DECORO[p.tipo]} stroke="#8a6a5a" stroke-width="0.025" />{/if}
          {/each}
        </svg>
      </div>
    {:else if info.vaso}
      <div class="biglietto">
        <div class="b-titolo">{info.vaso.nome}</div>
        <svg viewBox="0 0 100 92" class="b-vaso" aria-hidden="true"><path d={pathVaso(info.vaso.profilo, info.vaso.alto)} fill="#e8a070" stroke="#7a4a2a" stroke-width="2.5" /></svg>
      </div>
    {:else if info.stelle}
      <div class="biglietto notte">
        <div class="b-titolo">{info.stelle.nome}</div>
        <svg viewBox="0 0 1 1" class="b-stelle" aria-hidden="true">
          {#each info.stelle.linee as [a, b], i (i)}
            <line x1={info.stelle.punti[a][0]} y1={info.stelle.punti[a][1]} x2={info.stelle.punti[b][0]} y2={info.stelle.punti[b][1]} stroke="#ffd84a" stroke-width="0.025" stroke-linecap="round" />
          {/each}
          {#each info.stelle.punti as [x, y], i (i)}<circle cx={x} cy={y} r="0.045" fill="#fff8d0" />{/each}
        </svg>
      </div>
    {/if}

    {#if info.testo}<div class="fumetto" class:urgente={info.urgente}>{info.testo}</div>{/if}
    {#if info.bottoni?.length}
      <div class="bottoni-gioco">
        {#each info.bottoni as b (b.id)}
          <button class:scelto={b.scelto} class:pallino={b.testo === '●'} style:background={b.colore ?? null}
            onclick={() => gioco?.bottone(b.id)} aria-label={b.testo === '●' ? 'Colore' : b.testo}>{b.testo === '●' ? '' : b.testo}</button>
        {/each}
      </div>
    {/if}
  {:else if fase === 'intro'}
    <div class="carta">
      <div class="grande">{def.icona}</div>
      <p class="chi-dice">{nome(animale)} {SIMBOLO_SPECIE[animale.specie]} dice:</p>
      <p class="come">«{def.come}»</p>
      <p class="ricordo">{def.ricordo}</p>
      <p class="castagne">{pagateOggi ? `🌰 Oggi ${pagateOggi === 1 ? 'ancora una partita dà' : `ancora ${pagateOggi} partite danno`} castagne` : '🌰 Per oggi la bottega ha già dato le sue castagne: si gioca per divertirsi!'}</p>
      <div class="bottoni"><button onclick={comincia}>Cominciamo!</button></div>
    </div>
  {:else if fine}
    <div class="carta">
      <div class="stelline">{'★'.repeat(stellinePer(fine.punti))}<span>{'★'.repeat(3 - stellinePer(fine.punti))}</span></div>
      {#each fine.righe as r (r)}<p class="riga">{r}</p>{/each}
      {#if typeof fine.ricordo?.foto === 'string'}<img class="foto" src={fine.ricordo.foto as string} alt="La foto ricordo" />{/if}
      <p class="chi-dice">{nome(animale)}: «{fine.frase}»</p>
      {#if fine.castagne}<p class="premio">+{fine.castagne} castagne 🌰</p>
      {:else}<p class="piccolo">Le castagne di oggi la bottega le ha già date: domani ancora!</p>{/if}
      {#if def.id === 'stelle' && fine.ricordo?.stelle}
        {#if !stelleSalvate}
          <label class="nome-stelle">Che nome le diamo?
            <input bind:value={nomeStelle} maxlength="30" />
          </label>
          <div class="bottoni"><button onclick={salvaStelle}>✨ Mettila nel cielo</button></div>
        {:else}
          <p class="ricordo">«{nomeStelle}» brilla nel cielo del villaggio: guardala stanotte!</p>
        {/if}
      {:else}
        <p class="ricordo">{def.ricordo}</p>
      {/if}
      {#if def.id !== 'stelle' || stelleSalvate}
        <div class="bottoni">
          <button class="grigio" onclick={onchiudi}>Torna al villaggio</button>
          <button onclick={ancora}>{def.icona} Ancora!</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .minigioco { position: fixed; inset: 0; z-index: 60; background: #bfe2f2; touch-action: none; }
  .palco { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
  .errore { position: absolute; top: 40%; left: 20px; right: 20px; text-align: center; font-weight: 800; }
  .testata { position: absolute; z-index: 2; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px; max-width: 560px; margin: 0 auto; display: flex; gap: 8px; align-items: flex-start; }
  .esci {
    flex: none; background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 999px;
    padding: 6px 12px; font-weight: 900; box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none;
  }
  .titolo { flex: 1; min-width: 0; background: var(--panna); border: 3px solid var(--legno); border-radius: 16px; padding: 6px 10px; box-shadow: 0 4px 0 var(--legno-scuro); text-align: center; }
  .nome { font-weight: 900; font-size: 1.05rem; }
  .ora { font-size: 0.8rem; color: var(--testo-tenue); font-weight: 800; white-space: pre; }
  .biglietto {
    position: absolute; z-index: 2; right: 12px; top: calc(74px + env(safe-area-inset-top)); width: 118px; pointer-events: none;
    background: #fffdf6; border: 3px solid var(--legno); border-radius: 14px; padding: 6px; box-shadow: 0 4px 0 var(--legno-scuro);
    transform: rotate(2deg); text-align: center;
  }
  .biglietto.notte { background: #1c2a5a; color: #fff4cc; border-color: #8a9ad8; box-shadow: 0 4px 0 #0a1238; }
  .b-titolo { font-weight: 900; font-size: 0.78rem; margin-bottom: 2px; }
  .b-torta, .b-vaso, .b-stelle { width: 100%; height: 92px; display: block; }
  .fumetto {
    position: absolute; z-index: 2; left: 16px; right: 16px; max-width: 520px; margin: 0 auto; bottom: calc(84px + env(safe-area-inset-bottom)); pointer-events: none;
    background: #fffdf6; color: var(--inchiostro); border: 3px solid var(--inchiostro); border-radius: 18px;
    padding: 8px 14px; font-weight: 800; font-size: 1.02rem; text-align: center; box-shadow: 0 6px 0 rgba(74, 52, 36, 0.35);
  }
  .fumetto.urgente { background: #ffe066; }
  .bottoni-gioco {
    position: absolute; z-index: 2; left: 12px; right: 12px; bottom: calc(16px + env(safe-area-inset-bottom)); max-width: 560px; margin: 0 auto;
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
  }
  .bottoni-gioco button { font-size: 0.98rem; padding: 10px 14px; }
  .bottoni-gioco button:not([style]) { background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); text-shadow: none; box-shadow: 0 4px 0 var(--legno-scuro); }
  .bottoni-gioco button.scelto { outline: 4px solid #ffd166; outline-offset: 1px; transform: translateY(-3px); }
  .bottoni-gioco button.pallino { width: 46px; height: 46px; padding: 0; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3); }
  .carta {
    position: absolute; z-index: 3; left: 20px; right: 20px; max-width: 480px; margin: 0 auto; bottom: calc(16px + env(safe-area-inset-bottom)); max-height: 72dvh; overflow-y: auto;
    background: var(--panna); border: 4px solid var(--legno); border-radius: 22px; padding: 14px 16px 16px; text-align: center; box-shadow: 0 8px 0 var(--legno-scuro);
    animation: pop 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes pop { from { transform: scale(0.5); opacity: 0; } }
  .carta p { margin: 6px 0; font-weight: 700; }
  .grande { font-size: 2.4rem; line-height: 1; }
  .chi-dice { color: var(--legno); font-weight: 900 !important; }
  .come { font-size: 1.05rem; }
  .ricordo { font-size: 0.88rem; color: #2a6fb0; font-weight: 800 !important; }
  .castagne, .piccolo { font-size: 0.85rem; color: var(--testo-tenue); }
  .premio { color: #8a5a2a; font-weight: 900 !important; font-size: 1.15rem; }
  .riga { font-weight: 800 !important; }
  .stelline { font-size: 2.2rem; color: #f2b230; letter-spacing: 4px; text-shadow: 0 2px 0 #a8741a; }
  .stelline span { color: #e0d4bc; text-shadow: none; }
  .foto { width: 100%; max-width: 230px; border-radius: 6px; border: 8px solid #fff; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25); transform: rotate(-2deg); margin: 6px 0; }
  .bottoni { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
  .nome-stelle { display: grid; gap: 4px; font-weight: 900; margin-top: 8px; }
  .nome-stelle input { font: inherit; font-weight: 800; padding: 8px 12px; border-radius: 12px; border: 3px solid var(--legno); text-align: center; }
</style>
