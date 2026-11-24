<script lang="ts">
  // L'escursione: Giada sceglie dove andare e con chi (il suo animale del cuore), poi si guarda
  // l'animale che parte per il sentiero, l'incontro con qualcuno del posto, e il ritorno a casa.
  import { onDestroy, onMount } from 'svelte';
  import { app, escursioneFatta, scegliCompagno } from '../lib/app.svelte';
  import { biomiScoperti, type DefBioma } from '../lib/biomi';
  import { compagno as compagnoDi, NOME_GIORNATA, raccontoEscursione, type Giornata, type Racconto } from '../lib/escursioni';
  import { nomeAnimale } from '../lib/gioco';
  import { SIMBOLO_SPECIE } from '../lib/etichette';
  import type { Animale } from '../lib/tipi';
  import type { Scena } from '../scena/scena';

  let { scena, voce, giornata, onchiudi }: { scena: Scena | null; voce: string; giornata: Giornata; onchiudi: () => void } = $props();
  let s = $derived(app.stato!);
  let luoghi = $derived(biomiScoperti(s));
  let nati = $derived(s.animali.filter((a) => a.fase !== 'uovo' && !a.addormentato));
  let luogo = $state<DefBioma | null>(null);
  let chi = $state<Animale | null>(null);
  // all'inizio: l'animale del cuore (se c'è) e l'ultimo posto scoperto
  $effect.pre(() => {
    if (!chi) chi = compagnoDi(s) && !compagnoDi(s)!.addormentato ? compagnoDi(s) : nati[0] ?? null;
    if (!luogo) luogo = luoghi.at(-1) ?? null;
  });

  type Fase = 'scegli' | 'andata' | 'incontro' | 'ritorno' | 'fine';
  let fase = $state<Fase>('scegli');
  let racconto = $state<Racconto | null>(null);
  let riga = $state(0);
  const nome = (a: Animale | null) => (a ? a.nome || nomeAnimale(a) : '');
  const chiDice = (a: Animale) => `${nome(a)} ${a.sesso === 'f' ? '♀' : '♂'}`;

  onMount(() => document.body.classList.add('guardando'));
  onDestroy(() => {
    document.body.classList.remove('guardando');
    scena?.fineGita();
  });

  function parti() {
    if (!chi || !luogo || !scena) return;
    racconto = raccontoEscursione(luogo.id, giornata, chi, chiDice(chi));
    if (!racconto) return;
    scegliCompagno(chi.id);
    const ok = scena.iniziaGita(chi.id, luogo.id, () => {
      fase = 'incontro';
      riga = 0;
    });
    if (!ok) return;
    fase = 'andata';
  }

  function avanti() {
    if (!racconto) return;
    if (riga + 1 < racconto.righe.length) {
      riga += 1;
      return;
    }
    fase = 'ritorno';
    scena?.tornaDallaGita(async () => {
      if (chi && luogo) await escursioneFatta(voce, luogo.id, chi.id, giornata);
      fase = 'fine';
    });
  }
</script>

{#if fase === 'scegli'}
  <div class="finestra">
    <div class="testata">🎒 ESCURSIONE</div>
    <p class="intro">Dopo {NOME_GIORNATA[giornata]} ci vuole una gita. Il castoro ha aperto dei sentieri: dove andiamo, e chi viene con te?</p>
    <div class="titoletto">Dove</div>
    <div class="scelte">
      {#each luoghi as l (l.id)}
        <button class="carta" class:scelta={luogo?.id === l.id} style:--colore={l.colore} onclick={() => (luogo = l)}>
          <span class="simbolo">{l.simbolo}</span>
          <span class="nome">{l.villaggio}</span>
          <span class="dove">{l.nome}</span>
        </button>
      {/each}
    </div>
    <div class="titoletto">Con chi <small>(il tuo animale del cuore)</small></div>
    <div class="scelte animali">
      {#each nati as a (a.id)}
        <button class="carta" class:scelta={chi?.id === a.id} onclick={() => (chi = a)}>
          <span class="simbolo">{SIMBOLO_SPECIE[a.specie]}</span>
          <span class="nome">{nome(a)}</span>
          {#if s.compagno === a.id}<span class="cuore">❤️</span>{/if}
        </button>
      {/each}
    </div>
    <div class="riga">
      <button class="tondo grigio" onclick={onchiudi}>Un'altra volta</button>
      <button class="tondo" disabled={!chi || !luogo} onclick={parti}>Partiamo!</button>
    </div>
  </div>
{:else}
  <div class="cinema">
    <div class="banda">
      <div class="titolo-cinema">{luogo?.simbolo} {luogo?.villaggio}</div>
      <div class="conta">{luogo?.nome}</div>
    </div>
    <div class="sottotitolo-cinema">
      {#if fase === 'andata'}
        <p class="testo-cinema">{nome(chi)} parte con te giù per il sentiero…</p>
      {:else if fase === 'incontro' && racconto}
        {@const r = racconto.righe[riga]}
        {#key riga}
          <p class="testo-cinema"><span class="chi">{r.chi}</span>{r.testo}</p>
        {/key}
        <button class="tondo avanti" onclick={avanti}>{riga + 1 < racconto.righe.length ? 'Avanti' : 'Torniamo a casa'}</button>
      {:else if fase === 'ritorno'}
        <p class="testo-cinema">Si torna a casa, piano piano…</p>
      {:else if fase === 'fine' && racconto}
        <p class="testo-cinema">{nome(chi)} si ricorderà per sempre di questa gita. Avete portato a casa {racconto.abitante.dono}.</p>
        <button class="tondo avanti" onclick={onchiudi}>Che bella gita!</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(body.guardando nav.barra), :global(body.guardando .hud-alto), :global(body.guardando .sotto) { display: none !important; }
  .finestra {
    position: absolute; left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); z-index: 5;
    background: linear-gradient(180deg, rgba(40, 90, 60, 0.95), rgba(20, 54, 36, 0.97));
    border: 3px solid #e4f4d8; outline: 3px solid #173a24; border-radius: 14px; color: #f4fff0; padding: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); animation: apri 0.25s ease-out both; max-height: 70dvh; overflow-y: auto;
  }
  @keyframes apri { from { transform: scaleY(0.1); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { font-weight: 900; letter-spacing: 0.1em; border-bottom: 2px solid rgba(228, 244, 216, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
  .intro { margin: 0 0 8px; font-size: 0.92rem; }
  .titoletto { font-weight: 900; margin: 8px 0 4px; color: #ffe08a; }
  .titoletto small { color: #c8e4c0; font-weight: 700; }
  .scelte { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
  .carta {
    flex: none; width: 104px; display: flex; flex-direction: column; align-items: center; gap: 2px; position: relative;
    background: rgba(255, 255, 255, 0.08); border: 2px solid transparent; box-shadow: none; text-shadow: none; color: #f4fff0;
    border-radius: 12px; padding: 8px 4px; border-top: 5px solid var(--colore, transparent);
  }
  .animali .carta { width: 86px; }
  .carta.scelta { border-color: #ffe08a; background: rgba(255, 224, 138, 0.16); }
  .simbolo { font-size: 1.6rem; }
  .nome { font-weight: 900; font-size: 0.85rem; line-height: 1.1; text-align: center; }
  .dove { font-size: 0.7rem; color: #c8e4c0; text-align: center; line-height: 1.1; }
  .cuore { position: absolute; top: 2px; right: 4px; font-size: 0.8rem; }
  .riga { display: flex; gap: 10px; justify-content: center; margin-top: 12px; }
  /* il viaggio: come il primo piano del villaggio */
  .cinema { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
  .banda {
    position: absolute; top: 0; left: 0; right: 0; padding: calc(14px + env(safe-area-inset-top)) 16px 14px;
    background: linear-gradient(180deg, rgba(20, 50, 30, 0.92), rgba(20, 50, 30, 0.72)); text-align: center;
  }
  .titolo-cinema { font-weight: 900; font-size: 1.45rem; color: #ffe08a; text-shadow: 0 2px 0 #4a3a1a; }
  .conta { color: #d8f0d0; font-weight: 700; font-size: 0.85rem; margin-top: 2px; }
  .sottotitolo-cinema {
    position: absolute; left: 12px; right: 12px; bottom: calc(24px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: auto;
  }
  .testo-cinema {
    margin: 0; background: rgba(12, 20, 14, 0.85); color: #fff; font-weight: 800; font-size: 1.08rem; line-height: 1.35;
    padding: 12px 18px; border-radius: 16px; border: 2px solid rgba(255, 224, 138, 0.6); text-align: center;
    animation: entra 0.35s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  .chi { display: block; font-size: 0.82rem; color: #ffe08a; margin-bottom: 4px; }
  .avanti { min-width: 170px; }
  @keyframes entra { from { transform: translateY(12px) scale(0.96); opacity: 0; } }
</style>
