<script lang="ts">
  // La finestra dei funghi: il cestino (cucinare, portare al museo) e chi mandare a cercarli nel bosco.
  import { onDestroy, onMount } from 'svelte';
  import { app, cucinaQui, dataDiOggi, esponiFungoQui, lasciaFungoQui, mandaAFunghiQui, segnaAvvisoFunghi } from '../lib/app.svelte';
  import { abbondanza, bravoAiFunghi, cuochi, FUNGO, MINUTI, minutiAlRitorno, motivoNo, PER_PIATTO, type DefFungo, type Piatto } from '../lib/funghi';
  import { haMuseo } from '../lib/museo';
  import { nomeMestiere } from '../lib/mestieri';
  import { nomeAnimale } from '../lib/gioco';
  import type { Animale } from '../lib/tipi';
  import FungoDisegno from './FungoDisegno.svelte';

  let { onchiudi, oncucinato, onmandato }: { onchiudi: () => void; oncucinato?: (p: Piatto) => void; onmandato?: (id: string) => void } = $props();
  let s = $derived(app.stato!);
  let cestino = $derived(Object.entries(s.funghi?.cestino ?? {}).filter(([, n]) => n > 0).map(([id, n]) => ({ d: FUNGO[id], n })).filter((x) => !!x.d));
  let scheda = $state<'cestino' | 'bosco'>((Object.keys(app.stato?.funghi?.cestino ?? {}).length ? 'cestino' : 'bosco'));
  let messaggio = $state('');
  let cucinaQuale = $state<string | null>(null); // il fungo per cui si sceglie chi cucina
  let adesso = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | undefined;
  onMount(() => {
    document.body.classList.add('guardando');
    timer = setInterval(() => (adesso = Date.now()), 15000);
  });
  onDestroy(() => {
    document.body.classList.remove('guardando');
    clearInterval(timer);
  });

  const nome = (a: Animale) => a.nome || nomeAnimale(a);
  let mese = $derived(Number(dataDiOggi().slice(5, 7)));
  let stagione = $derived(
    abbondanza(mese) === 2 ? 'È autunno: il bosco è pieno di funghi!'
      : abbondanza(mese) === 1 ? "È estate: si trovano un bel po' di funghi."
        : [12, 1, 2].includes(mese) ? 'È inverno: i funghi sono pochi, ma ci sono quelli che amano il freddo.' : 'È primavera: spuntano le spugnole!',
  );
  let animali = $derived(s.animali.filter((a) => a.fase !== 'uovo'));
  let fuori = $derived(s.funghi?.fuori ?? []);
  let cuochiOra = $derived(cuochi(s));
  let museo = $derived(haMuseo(s));
  let esposti = $derived(s.museo?.funghi ?? []);

  async function manda(a: Animale) {
    if (await mandaAFunghiQui(a.id)) {
      messaggio = `${nome(a)} prende il cestino e va nel bosco! Torna tra circa ${bravoAiFunghi(a) ? MINUTI.bravo : MINUTI.normale} minuti.`;
      onmandato?.(a.id);
    }
  }

  async function cucina(f: DefFungo, cuoco: Animale | null) {
    const p = await cucinaQui(f.id, cuoco?.id ?? null);
    cucinaQuale = null;
    if (!p) return;
    messaggio = cuoco
      ? `${nome(cuoco)} ha preparato ${p.nome}! Tutti sono più contenti, e la bottega l'ha venduto: +${p.castagne} 🌰`
      : `Hai cucinato ${p.nome}: l'hai fatto assaggiare a tutti. Che buono!`;
    oncucinato?.(p);
  }

  async function esponi(f: DefFungo) {
    const n = await esponiFungoQui(f.id);
    if (n !== null) messaggio = `${f.nome} è nella sala dei funghi del museo! I visitatori pagano il biglietto: +${n} 🌰`;
  }

  async function lascia(f: DefFungo) {
    await lasciaFungoQui(f.id);
    messaggio = `Hai rimesso ${f.nome.toLowerCase()} nel bosco.`;
  }

  const etichetta = (f: DefFungo) => (f.mangia === 'si' ? '😋 si mangia' : f.mangia === 'veleno' ? '☠ velenoso' : '🚫 non si mangia');
</script>

<div class="finestra">
  <div class="testata">
    <span>🍄 I FUNGHI</span>
    <span class="borsa">🌰 {s.ghiande}</span>
  </div>

  {#if !s.funghi?.avvisato}
    <div class="avviso">
      <p><b>Corvo:</b> Cra! Nel gioco gli animali sanno quali funghi sono buoni. Ma nella vita vera i funghi si raccolgono solo insieme a un grande che li conosce bene: alcuni sono velenosi!</p>
      <button class="tondo piccolo" onclick={segnaAvvisoFunghi}>Ho capito</button>
    </div>
  {/if}

  <div class="schede">
    <button class:attiva={scheda === 'cestino'} onclick={() => { scheda = 'cestino'; messaggio = ''; }}>🧺 Cestino ({cestino.reduce((a, x) => a + x.n, 0)})</button>
    <button class:attiva={scheda === 'bosco'} onclick={() => { scheda = 'bosco'; messaggio = ''; }}>🌲 Chi va nel bosco {fuori.length ? `(${fuori.length})` : ''}</button>
  </div>

  <div class="corpo">
    {#if messaggio}<p class="messaggio">{messaggio}</p>{/if}
    {#if scheda === 'cestino'}
      {#if cestino.length}
        <ul class="lista">
          {#each cestino as { d, n } (d.id)}
            <li>
              <div class="riga-fungo">
                <FungoDisegno f={d} />
                <div class="testo">
                  <span class="nome">{d.nome} {n > 1 ? `×${n}` : ''} <span class={['tipo', d.mangia]}>{etichetta(d)}</span></span>
                  <span class="frase">{d.frase}</span>
                </div>
              </div>
              {#if cucinaQuale === d.id}
                <div class="chi-cucina">
                  <span class="domanda">Chi lo cucina? (usa {Math.min(n, PER_PIATTO)} {Math.min(n, PER_PIATTO) === 1 ? 'fungo' : 'funghi'})</span>
                  <button class="azione" onclick={() => cucina(d, null)}>👧 Lo cucino io</button>
                  {#each cuochiOra as c (c.id)}
                    <button class="azione cuoco" onclick={() => cucina(d, c)}>🍲 {nome(c)}, {nomeMestiere(c)}</button>
                  {:else}
                    <span class="nota">Quando qualcuno farà il cuoco, il fornaio o il locandiere, potrai darlo a lui: fa un piatto speciale e guadagna castagne.</span>
                  {/each}
                  <button class="azione grigio" onclick={() => (cucinaQuale = null)}>Annulla</button>
                </div>
              {:else}
                <div class="azioni">
                  {#if d.mangia === 'si'}<button class="azione" onclick={() => (cucinaQuale = d.id)}>🍳 Cucina</button>{/if}
                  {#if museo && !esposti.includes(d.id)}<button class="azione museo" onclick={() => esponi(d)}>🏛 Al museo</button>
                  {:else if museo}<span class="nota">✔ già al museo</span>{/if}
                  {#if d.mangia !== 'si'}<button class="azione grigio" onclick={() => lascia(d)}>🌲 Rimetti nel bosco</button>{/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
        {#if !museo}<p class="aiuto">Quando costruirai il museo (🔨), potrai esporre un fungo di ogni specie nella sala dei funghi.</p>{/if}
      {:else}
        <p class="vuoto">Il cestino è vuoto. Manda qualcuno nel bosco a cercare funghi!</p>
      {/if}
    {:else}
      <p class="aiuto">{stagione} Chi conosce il bosco torna prima e trova di più.</p>
      <ul class="lista">
        {#each animali as a (a.id)}
          {@const via = fuori.find((c) => c.animale === a.id)}
          {@const no = via ? null : motivoNo(s, a, dataDiOggi())}
          <li class="riga-animale">
            <span class="nome">{nome(a)} {#if bravoAiFunghi(a)}<span class="bravo">⭐ esperto</span>{/if}</span>
            {#if via}
              <span class="stato">🌲 nel bosco, torna tra {minutiAlRitorno(via, adesso)} min</span>
            {:else if no}
              <span class="stato grigio">{no}</span>
            {:else}
              <button class="azione" onclick={() => manda(a)}>🧺 Vai!</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  <button class="tondo grigio chiudi" onclick={onchiudi}>Chiudi</button>
</div>

<style>
  :global(body.guardando nav.barra) { display: none !important; }
  .finestra {
    background: linear-gradient(180deg, rgba(70, 52, 30, 0.95), rgba(44, 34, 20, 0.97));
    border: 3px solid #f4e2b8;
    outline: 3px solid #2a1c0c;
    border-radius: 14px;
    color: #fff8ea;
    padding: 12px 12px 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    animation: apri 0.25s ease-out both;
    max-height: 62dvh;
    display: flex;
    flex-direction: column;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { display: flex; justify-content: space-between; font-weight: 900; letter-spacing: 0.1em; border-bottom: 2px solid rgba(244, 226, 184, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
  .borsa { letter-spacing: 0; color: #ffe08a; }
  .avviso { background: #fff4d8; color: #3a2a10; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; font-size: 0.85rem; }
  .avviso p { margin: 0 0 6px; }
  .piccolo { padding: 4px 14px; font-size: 0.85rem; }
  .schede { display: flex; gap: 6px; margin-bottom: 8px; }
  .schede button { flex: 1; background: rgba(255, 255, 255, 0.08); color: #f4e2b8; border: 2px solid transparent; box-shadow: none; border-radius: 10px; padding: 6px 4px; font-size: 0.82rem; font-weight: 900; text-shadow: none; }
  .schede button.attiva { border-color: #ffe08a; color: #fff; background: rgba(255, 224, 138, 0.14); }
  .corpo { overflow-y: auto; min-height: 0; }
  .lista { list-style: none; padding: 0; margin: 0; }
  .lista li { background: rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 6px 8px; margin-bottom: 5px; }
  .riga-fungo { display: flex; align-items: center; gap: 8px; }
  .testo { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .nome { font-weight: 900; font-size: 0.88rem; }
  .frase { font-size: 0.74rem; color: #e8d8b8; line-height: 1.2; }
  .tipo { font-size: 0.68rem; font-weight: 800; padding: 1px 6px; border-radius: 999px; margin-left: 4px; white-space: nowrap; }
  .tipo.si { background: #4a8a3a; }
  .tipo.veleno { background: #a83a2a; }
  .tipo.no { background: #6a6a6a; }
  .azioni, .chi-cucina { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; align-items: center; }
  .domanda { width: 100%; font-size: 0.8rem; font-weight: 800; color: #ffe08a; }
  .azione { background: #ffe08a; color: #3a2a10; border: none; box-shadow: none; border-radius: 999px; padding: 5px 11px; font-weight: 900; text-shadow: none; font-size: 0.8rem; }
  .azione.cuoco { background: #ffb08a; }
  .azione.museo { background: #bfe0ff; }
  .azione.grigio { background: rgba(255, 255, 255, 0.18); color: #fff; }
  .nota { font-size: 0.74rem; color: #e8d8b8; }
  .riga-animale { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .bravo { font-size: 0.68rem; color: #ffe08a; font-weight: 800; }
  .stato { font-size: 0.78rem; color: #c8f0b8; font-weight: 800; text-align: right; }
  .stato.grigio { color: #c8b89a; font-weight: 700; }
  .aiuto { font-size: 0.78rem; color: #e8d8b8; margin: 4px 2px 8px; }
  .vuoto { color: #fff4e0; margin: 8px 2px; }
  .messaggio { background: rgba(159, 227, 160, 0.18); border-radius: 10px; padding: 6px 10px; color: #d8ffd0; font-weight: 800; font-size: 0.85rem; margin: 0 0 6px; }
  .chiudi { align-self: center; margin-top: 10px; }
</style>
