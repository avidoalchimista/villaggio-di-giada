<script lang="ts">
  // La finestra del museo: la sala dei ritrovamenti (le cose trovate in giro) e la sala dei funghi.
  // I posti vuoti mostrano un punto di domanda: così Giada vede quanti ne mancano.
  import { onDestroy, onMount } from 'svelte';
  import { app, esponiFungoQui } from '../lib/app.svelte';
  import { FUNGHI, type DefFungo } from '../lib/funghi';
  import { biglietti, RITROVAMENTI, type DefRitrovamento } from '../lib/museo';
  import FungoDisegno from './FungoDisegno.svelte';

  onMount(() => document.body.classList.add('guardando'));
  onDestroy(() => document.body.classList.remove('guardando'));

  let { onchiudi }: { onchiudi: () => void } = $props();
  let s = $derived(app.stato!);
  let sala = $state<'trovati' | 'funghi'>('trovati');
  let aperto = $state<{ nome: string; frase: string; extra: string } | null>(null);
  let messaggio = $state('');
  let trovati = $derived(s.museo?.ritrovamenti ?? {});
  let esposti = $derived(s.museo?.funghi ?? []);
  let nTrovati = $derived(RITROVAMENTI.filter((r) => trovati[r.id]).length);
  const stelle = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const data = (d: string) => new Date(d + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

  function apriR(r: DefRitrovamento) {
    if (!trovati[r.id]) return;
    aperto = { nome: `${r.icona} ${r.nome}`, frase: r.frase, extra: `Rarità ${stelle(r.raro)} · trovato il ${data(trovati[r.id])}` };
  }
  function apriF(f: DefFungo) {
    if (!esposti.includes(f.id)) return;
    aperto = { nome: f.nome, frase: f.frase, extra: `${f.latino} · rarità ${stelle(f.raro)} · ${f.mangia === 'si' ? 'si mangia' : f.mangia === 'veleno' ? 'velenoso!' : 'non si mangia'}` };
  }
  async function esponi(f: DefFungo) {
    const n = await esponiFungoQui(f.id);
    if (n !== null) messaggio = `${f.nome} ora è in vetrina! +${n} 🌰 di biglietti.`;
  }
</script>

<div class="finestra">
  <div class="testata">
    <span>🏛 IL MUSEO</span>
    <span class="borsa">🌰 {s.ghiande}</span>
  </div>
  <div class="schede">
    <button class:attiva={sala === 'trovati'} onclick={() => { sala = 'trovati'; aperto = null; messaggio = ''; }}>🔎 Ritrovamenti {nTrovati}/{RITROVAMENTI.length}</button>
    <button class:attiva={sala === 'funghi'} onclick={() => { sala = 'funghi'; aperto = null; messaggio = ''; }}>🍄 Funghi {esposti.length}/{FUNGHI.length}</button>
  </div>
  <div class="corpo">
    {#if messaggio}<p class="messaggio">{messaggio}</p>{/if}
    {#if aperto}
      <div class="cartellino">
        <b>{aperto.nome}</b>
        <span>{aperto.frase}</span>
        <small>{aperto.extra}</small>
      </div>
    {/if}
    {#if sala === 'trovati'}
      <p class="aiuto">Ogni giorno nel villaggio brilla per terra una cosa: toccala per prenderla. Ogni tanto ne porta una anche chi torna dal bosco. Ogni pezzo nuovo porta {biglietti(1)}-{biglietti(5)} 🌰 di biglietti.</p>
      <ul class="griglia">
        {#each RITROVAMENTI as r (r.id)}
          <li class:vuoto={!trovati[r.id]}>
            <button onclick={() => apriR(r)} disabled={!trovati[r.id]}>
              <span class="icona">{trovati[r.id] ? r.icona : '?'}</span>
              <span class="nome">{trovati[r.id] ? r.nome : '???'}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="aiuto">Un fungo per specie, in vetrina. Mandando gli animali nel bosco in stagioni diverse se ne trovano di nuovi.</p>
      <ul class="griglia">
        {#each FUNGHI as f (f.id)}
          {@const dentro = esposti.includes(f.id)}
          {@const nelCestino = !dentro && (s.funghi?.cestino[f.id] ?? 0) > 0}
          <li class:vuoto={!dentro}>
            {#if nelCestino}
              <button class="porta" onclick={() => esponi(f)}>
                <FungoDisegno {f} />
                <span class="nome">{f.nome}</span>
                <span class="esponi">🧺 Mettilo qui</span>
              </button>
            {:else}
              <button onclick={() => apriF(f)} disabled={!dentro}>
                <FungoDisegno {f} ombra={!dentro && !s.funghi?.trovati[f.id]} />
                <span class="nome">{dentro || s.funghi?.trovati[f.id] ? f.nome : '???'}</span>
              </button>
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
    background: linear-gradient(180deg, rgba(246, 238, 220, 0.97), rgba(232, 220, 196, 0.98));
    border: 3px solid #fffaf0;
    outline: 3px solid #5a3a1e;
    border-radius: 14px;
    color: #3b2616;
    padding: 12px 12px 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    animation: apri 0.25s ease-out both;
    max-height: 56dvh;
    display: flex;
    flex-direction: column;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { display: flex; justify-content: space-between; font-weight: 900; letter-spacing: 0.1em; border-bottom: 2px solid rgba(90, 58, 30, 0.3); padding-bottom: 8px; margin-bottom: 8px; }
  .borsa { letter-spacing: 0; color: #8a5a10; }
  .schede { display: flex; gap: 6px; margin-bottom: 8px; }
  .schede button { flex: 1; background: rgba(90, 58, 30, 0.08); color: #5a3a1e; border: 2px solid transparent; box-shadow: none; border-radius: 10px; padding: 6px 4px; font-size: 0.82rem; font-weight: 900; text-shadow: none; }
  .schede button.attiva { border-color: #c8443a; color: #3b2616; background: rgba(200, 68, 58, 0.1); }
  .corpo { overflow-y: auto; min-height: 0; }
  .griglia { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(74px, 1fr)); gap: 6px; }
  .griglia li button { width: 100%; background: #fffaf0; border: 2px solid #d8c8a8; box-shadow: none; border-radius: 10px; padding: 6px 2px; display: flex; flex-direction: column; align-items: center; gap: 2px; color: #3b2616; text-shadow: none; min-height: 74px; }
  .griglia li.vuoto button { background: rgba(90, 58, 30, 0.08); border-style: dashed; color: #8a7a6a; }
  .griglia li button.porta { background: #fff4c8; border: 2px solid #e0a830; border-style: solid; color: #3b2616; }
  .icona { font-size: 1.6rem; line-height: 1.2; }
  .nome { font-weight: 800; font-size: 0.68rem; line-height: 1.1; text-align: center; }
  .esponi { font-size: 0.62rem; font-weight: 900; color: #a8601a; }
  .cartellino { background: #fffaf0; border: 2px solid #c8a870; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 2px; font-size: 0.85rem; }
  .cartellino small { color: #7a6a5a; font-weight: 700; }
  .aiuto { font-size: 0.78rem; color: #6a5a4a; margin: 2px 2px 8px; }
  .messaggio { background: #e4f6dc; border-radius: 10px; padding: 6px 10px; color: #2a6a2a; font-weight: 800; font-size: 0.85rem; margin: 0 0 6px; }
  .chiudi { align-self: center; margin-top: 10px; }
</style>
