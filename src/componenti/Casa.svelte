<script lang="ts">
  // Sbirciare dentro casa: la stanza in 3D, chi ci abita, cosa sta facendo adesso e il suo carattere.
  import { onDestroy, onMount } from 'svelte';
  import { carattereDi, descrizioneCarattere, fraseCarattere, nomeCarattere, type Momento } from '../lib/carattere';
  import { nomeAnimale } from '../lib/gioco';
  import type { Animale } from '../lib/tipi';
  import { Interno, type StatoOspite } from '../scena/interno';

  let { abitanti, proprietario = null, momento, onchiudi }: {
    abitanti: Animale[];
    proprietario?: Animale | null;
    momento: () => Momento;
    onchiudi: () => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let interno: Interno | null = null;
  let stato = $state<StatoOspite[]>([]);
  let parla = $state<{ id: string; testo: string } | null>(null);
  let scheda = $state<Animale | null>(null);
  let errore = $state(false);
  let k = Math.floor(Math.random() * 100);

  const nomeDi = (a: Animale) => { const n = a.nome || nomeAnimale(a); return n.charAt(0).toUpperCase() + n.slice(1); };
  const di = (a: Animale) => (a.nome ? `di ${a.nome}` : nomeAnimale(a).replace(/^il /, 'del ').replace(/^lo /, 'dello ').replace(/^la /, 'della '));
  const titolo = $derived(proprietario ? `La casa ${di(proprietario)}` : 'La tana del grande albero');
  const ORA: Record<Momento, string> = { mattina: '🌅 Mattina', lavoro: '☀️ Giorno', pranzo: '🍲 Ora di pranzo', sera: '🌇 Sera', notte: '🌙 Notte' };
  let quando = $state<Momento>('lavoro');

  onMount(() => {
    quando = momento();
    try {
      interno = new Interno(canvas, proprietario ? 'casa' : 'tana', abitanti, momento, proprietario ?? undefined);
      interno.onTocco = tocca;
      interno.onCambio = () => { stato = interno!.stato(); quando = momento(); };
      stato = interno.stato();
      (window as unknown as { interno: Interno }).interno = interno;
    } catch (e) {
      console.error(e);
      errore = true;
    }
  });
  onDestroy(() => interno?.distruggi());

  function tocca(id: string) {
    const a = abitanti.find((x) => x.id === id);
    if (!a) return;
    interno?.saluta(id);
    k += 1;
    parla = { id, testo: fraseCarattere(a, a.addormentato ? 'notte' : momento(), k) };
  }

  /** La casa si apre sopra a tutto, anche sopra la barra in basso. */
  function sopraATutto(nodo: HTMLElement) {
    document.body.appendChild(nodo);
    return { destroy: () => nodo.remove() };
  }

  const cosaFa = (a: Animale) => stato.find((x) => x.id === a.id)?.testo ?? '';
</script>

<div class="casa" use:sopraATutto>
  <canvas bind:this={canvas} class="stanza"></canvas>
  {#if errore}<div class="errore">Questo telefono non riesce a disegnare la casa in 3D.</div>{/if}

  <header class="testata">
    <button class="esci" onclick={onchiudi} aria-label="Esci">🚪 Esci</button>
    <div class="titolo">
      <div class="nome">{titolo}</div>
      <div class="ora">{ORA[quando]}</div>
    </div>
  </header>

  {#if parla}
    {@const a = abitanti.find((x) => x.id === parla!.id)}
    {#if a}
      <button class="fumetto" onclick={() => (parla = null)}>
        <span class="chi">{nomeDi(a)} {carattereDi(a).emoji}</span>
        «{parla.testo}»
      </button>
    {/if}
  {/if}

  <div class="sotto">
    {#if scheda}
      {@const c = carattereDi(scheda)}
      <div class="carta-carattere">
        <div class="carattere-titolo">{c.emoji} {nomeDi(scheda)} è {scheda.sesso === 'f' ? 'una' : 'un'} <strong>{nomeCarattere(scheda)}</strong></div>
        <p>{descrizioneCarattere(scheda, nomeDi(scheda))}</p>
        <ul>
          <li><span>Ama</span> {c.ama}</li>
          <li><span>Non sopporta</span> {c.nonSopporta}</li>
          <li><span>Dice sempre</span> «{c.intercalare}»</li>
        </ul>
        <button class="tondo grigio" onclick={() => (scheda = null)}>Chiudi</button>
      </div>
    {:else}
      <div class="chi-abita">
        {#each abitanti as a (a.id)}
          <div class="riga-abitante">
            <button class="abitante" onclick={() => tocca(a.id)}>
              <span class="emoji">{carattereDi(a).emoji}</span>
              <span class="testo"><strong>{nomeDi(a)}</strong> {cosaFa(a)}</span>
            </button>
            <button class="info" onclick={() => (scheda = a)} aria-label="Il carattere di {nomeDi(a)}">{nomeCarattere(a)}</button>
          </div>
        {:else}
          <p class="vuota">La tana è vuota: qui dormono i cuccioli appena nati, finché non diventano grandi e si costruiscono una casa loro.</p>
        {/each}
      </div>
      {#if abitanti.length}<p class="suggerimento">Tocca chi vuoi per sentire cosa dice · trascina per girare</p>{/if}
    {/if}
  </div>
</div>

<style>
  .casa { position: fixed; inset: 0; max-width: 560px; margin: 0 auto; z-index: 50; background: #f3e6cf; overflow: hidden; animation: entra 0.35s ease-out both; }
  @keyframes entra { from { opacity: 0; transform: scale(1.08); } }
  .stanza { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
  .errore { position: absolute; top: 40%; left: 16px; right: 16px; text-align: center; background: var(--panna); padding: 16px; border-radius: 18px; }
  .testata {
    position: absolute; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px;
    display: flex; gap: 10px; align-items: flex-start;
  }
  .esci {
    flex: none; background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 999px;
    padding: 6px 14px; font-weight: 900; box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none;
  }
  .titolo {
    flex: 1; min-width: 0; background: var(--panna); border: 3px solid var(--legno); border-radius: 16px; padding: 6px 12px;
    box-shadow: 0 4px 0 var(--legno-scuro); text-align: center;
  }
  .nome { font-weight: 900; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ora { font-size: 0.85rem; color: var(--testo-tenue); font-weight: 800; }
  .fumetto {
    position: absolute; top: calc(84px + env(safe-area-inset-top)); left: 16px; right: 16px; z-index: 2;
    background: #fffdf6; color: var(--inchiostro); border: 3px solid var(--inchiostro); border-radius: 18px;
    padding: 10px 14px; font-weight: 800; font-size: 1.05rem; line-height: 1.35; text-align: left; text-shadow: none;
    box-shadow: 0 6px 0 rgba(74, 52, 36, 0.35); animation: pop 0.3s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  .chi { display: block; font-size: 0.85rem; color: var(--legno); margin-bottom: 2px; }
  @keyframes pop { from { transform: scale(0.6); opacity: 0; } }
  .sotto { position: absolute; left: 12px; right: 12px; bottom: calc(14px + env(safe-area-inset-bottom)); }
  .chi-abita {
    background: rgba(255, 248, 231, 0.94); border: 3px solid var(--legno); border-radius: 18px; padding: 8px;
    box-shadow: 0 5px 0 var(--legno-scuro); max-height: 27dvh; overflow-y: auto;
  }
  .riga-abitante { display: flex; gap: 6px; align-items: stretch; }
  .riga-abitante + .riga-abitante { border-top: 2px dashed rgba(138, 90, 54, 0.25); }
  .abitante {
    flex: 1; min-width: 0; display: flex; gap: 8px; align-items: center; background: none; border: none; box-shadow: none;
    color: var(--inchiostro); text-align: left; padding: 6px 4px; text-shadow: none; font-weight: 600; font-size: 0.9rem; line-height: 1.25;
  }
  .emoji { font-size: 1.4rem; flex: none; }
  .info {
    flex: none; align-self: center; background: var(--notte-blu); color: #fff; border: 2px solid var(--legno); border-radius: 999px;
    padding: 4px 10px; font-size: 0.8rem; font-weight: 800; box-shadow: none;
  }
  .vuota { margin: 6px; color: var(--testo-tenue); font-weight: 700; }
  .suggerimento { width: fit-content; margin: 8px auto 0; padding: 3px 10px; border-radius: 999px; background: rgba(40, 26, 16, 0.55); text-align: center; color: #fff; font-weight: 700; font-size: 0.78rem; }
  .carta-carattere {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.95), rgba(18, 28, 70, 0.97)); color: #f2f6ff;
    border: 3px solid #d8e4ff; outline: 3px solid #1a2350; border-radius: 14px; padding: 12px 14px;
    animation: pop 0.25s ease-out both;
  }
  .carattere-titolo { font-size: 1.1rem; font-weight: 800; }
  .carattere-titolo strong { color: #ffe08a; }
  .carta-carattere p { margin: 8px 0; line-height: 1.4; }
  .carta-carattere ul { list-style: none; padding: 0; margin: 0 0 10px; }
  .carta-carattere li { margin: 4px 0; }
  .carta-carattere li span { display: inline-block; min-width: 96px; color: #ffe08a; font-weight: 800; }
</style>
