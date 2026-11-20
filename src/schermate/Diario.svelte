<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import Ritratto from '../componenti/Ritratto.svelte';
  import frasi from '../dati/frasi.json';
  import { analizzaTesto, app, salvaVoce, vai, type RigaDialogo } from '../lib/app.svelte';
  import { principali } from '../lib/analisi';
  import { EMOZIONE, NOME_FORZA } from '../lib/etichette';
  import { nomeAnimale } from '../lib/gioco';
  import { EMOZIONI, FORZE, virtuDi, type Emozione, type Evento, type Forza, type Punteggi, type VoceDiario } from '../lib/tipi';

  let fase = $state<'scrivi' | 'conferma' | 'fatto' | 'archivio'>('scrivi');
  let testo = $state('');
  let difficile = $state(false);
  let serio = $state(false);
  let forze = $state<Punteggi<Forza>>({});
  let emozioni = $state<Punteggi<Emozione>>({});
  let attiveF = $state<Forza[]>([]);
  let attiveE = $state<Emozione[]>([]);
  let spenteF = $state<Forza[]>([]);
  let spenteE = $state<Emozione[]>([]);
  let aggiungi = $state(false);
  let eventi = $state<Evento[]>([]);
  let salvando = $state(false);
  let aperta = $state<VoceDiario | null>(null);

  function analizza() {
    const a = analizzaTesto(testo);
    forze = a.forze;
    emozioni = a.emozioni;
    serio = a.segnaliSeri;
    attiveF = principali(a.forze, 4);
    attiveE = principali(a.emozioni, 3);
    spenteF = [];
    spenteE = [];
    if ((a.emozioni.tristezza ?? 0) >= 3) difficile = true;
    fase = 'conferma';
  }

  function attivaF(f: Forza) {
    spenteF = spenteF.includes(f) ? spenteF.filter((x) => x !== f) : [...spenteF, f];
  }
  function attivaE(e: Emozione) {
    spenteE = spenteE.includes(e) ? spenteE.filter((x) => x !== e) : [...spenteE, e];
  }
  function nuovaF(f: Forza) {
    if (!attiveF.includes(f)) attiveF = [...attiveF, f];
    forze[f] = Math.max(forze[f] ?? 0, 2);
    aggiungi = false;
  }
  function nuovaE(e: Emozione) {
    if (!attiveE.includes(e)) attiveE = [...attiveE, e];
    emozioni[e] = Math.max(emozioni[e] ?? 0, 2);
    aggiungi = false;
  }

  async function conferma() {
    salvando = true;
    // tengo solo quello che Giada ha confermato
    const f: Punteggi<Forza> = {};
    for (const k of attiveF) if (!spenteF.includes(k)) f[k] = Math.min(forze[k] ?? 2, 6);
    const e: Punteggi<Emozione> = {};
    for (const k of attiveE) if (!spenteE.includes(k)) e[k] = Math.min(emozioni[k] ?? 2, 6);
    const r = await salvaVoce(testo, f, e, difficile);
    eventi = r.eventi;
    salvando = false;

    // la risposta del villaggio diventa un dialogo nella radura
    const C = frasi.corvo as Record<string, string>;
    const corvo = (id: string): RigaDialogo => ({ chi: 'Corvo', testo: C[id], voce: 'corvo', audioId: id });
    const righe: RigaDialogo[] = [];
    if (serio) righe.push(corvo('segnali_seri'));
    else if (difficile) righe.push(corvo('giornata_difficile'));
    else if (primoCucciolo) righe.push(corvo('primo_cucciolo'));
    else if (!nati.length) righe.push(corvo('uovo_si_muove'));
    if (animaleCheParla && rispostaAnimale) righe.push({ chi: nomeAnimale(animaleCheParla), testo: rispostaAnimale, voce: 'animale' });
    for (const ev of eventi) righe.push({ chi: 'Corvo', testo: ev.testo, voce: 'corvo' });
    if (!righe.length) righe.push(corvo('pagina_salvata'));
    app.codaDialoghi = righe;
    app.festa = serio || difficile ? 0 : 1;
    ricomincia();
    vai('villaggio');
  }

  function ricomincia() {
    testo = '';
    difficile = false;
    serio = false;
    fase = 'scrivi';
  }

  // chi viene a parlarle dopo il salvataggio
  let nati = $derived(app.stato!.animali.filter((a) => a.fase !== 'uovo'));
  let animaleCheParla = $derived(nati.length ? nati[(app.stato!.numeroVoci) % nati.length] : null);
  let consolare = $derived(difficile || attiveE.some((e) => ['tristezza', 'paura'].includes(e) && !spenteE.includes(e)));
  let rispostaAnimale = $derived.by(() => {
    if (!animaleCheParla) return '';
    const n = app.stato!.numeroVoci;
    if (consolare) {
      const ricordiBelli = animaleCheParla.ricordi.filter((r) => !r.frase.includes('difficile'));
      if (ricordiBelli.length >= 3) {
        const r = ricordiBelli[n % ricordiBelli.length];
        const l = frasi.conforto.conosciuto;
        return l[n % l.length].replace('{ricordo}', r.frase.replace(/^Giada /, '').replace(/\.$/, '') + '.');
      }
      const l = frasi.conforto.generale;
      return l[n % l.length];
    }
    const forteF = attiveF.find((f) => !spenteF.includes(f));
    if (forteF) {
      const l = (frasi.animali.reazione as Record<string, string[]>)[virtuDi(forteF)];
      return l[n % l.length];
    }
    return frasi.animali.saluto[n % frasi.animali.saluto.length];
  });
  let primoCucciolo = $derived(eventi.some((e) => e.tipo === 'schiusa') && nati.length === 1);

  const dataLeggibile = (d: string) => new Date(d + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
</script>

<div class="pagina">
  {#if fase === 'scrivi'}
    <div class="riga tra">
      <h1>Diario</h1>
      <button class="leggero" onclick={() => (fase = 'archivio')}>Pagine passate</button>
    </div>
    {#if !testo}<Corvo id="diario_vuoto" piccolo />{/if}
    <textarea bind:value={testo} placeholder="Oggi…"></textarea>
    <label class="riga difficile">
      <input type="checkbox" bind:checked={difficile} /> È stata una giornata difficile
    </label>
    <button class="largo" disabled={testo.trim().length < 3} onclick={analizza}>Ho finito</button>

  {:else if fase === 'conferma'}
    <h1>Cosa ho capito</h1>
    <Corvo id="conferma" piccolo />
    <div class="vignetta">
      <span class="didascalia">Punti di forza</span>
      {#if attiveF.length === 0}<p class="tenue">Non ho trovato punti di forza precisi. Puoi aggiungerli tu.</p>{/if}
      {#each attiveF as f}
        <button class="chip" class:spento={spenteF.includes(f)} onclick={() => attivaF(f)}>{NOME_FORZA[f]}</button>
      {/each}
      <span class="didascalia secondo">Emozioni</span>
      {#if attiveE.length === 0}<p class="tenue">Nessuna emozione chiara.</p>{/if}
      {#each attiveE as e}
        <button class="chip" class:spento={spenteE.includes(e)} onclick={() => attivaE(e)}>
          <span class="pallino" style:background={EMOZIONE[e].colore}></span>{EMOZIONE[e].nome}
        </button>
      {/each}
      <div><button class="leggero" onclick={() => (aggiungi = !aggiungi)}>{aggiungi ? 'Chiudi' : '+ Aggiungi'}</button></div>
      {#if aggiungi}
        <div class="aggiungi">
          {#each EMOZIONI.filter((e) => !attiveE.includes(e)) as e}
            <button class="chip" onclick={() => nuovaE(e)}><span class="pallino" style:background={EMOZIONE[e].colore}></span>{EMOZIONE[e].nome}</button>
          {/each}
          <hr />
          {#each FORZE.filter((f) => !attiveF.includes(f)) as f}
            <button class="chip" onclick={() => nuovaF(f)}>{NOME_FORZA[f]}</button>
          {/each}
        </div>
      {/if}
      <label class="riga difficile">
        <input type="checkbox" bind:checked={difficile} /> È stata una giornata difficile
      </label>
    </div>
    <div class="riga">
      <button class="secondario" onclick={() => (fase = 'scrivi')}>Indietro</button>
      <button style="flex:1" disabled={salvando} onclick={conferma}>Conferma</button>
    </div>

  {:else}
    <div class="riga tra">
      <h1>Pagine passate</h1>
      <button class="leggero" onclick={() => { aperta = null; fase = 'scrivi'; }}>Chiudi</button>
    </div>
    {#if aperta}
      <div class="vignetta">
        <span class="didascalia">{dataLeggibile(aperta.data)}</span>
        <p class="testo-voce">{aperta.testo}</p>
        <p class="tenue">{aperta.riassunto}</p>
        <button class="secondario" onclick={() => (aperta = null)}>Indietro</button>
      </div>
    {:else}
      {#each app.voci as v (v.id)}
        <button class="voce vignetta" onclick={() => (aperta = v)}>
          <strong>{dataLeggibile(v.data)}</strong>
          <span class="tenue">{v.testo.slice(0, 90)}{v.testo.length > 90 ? '…' : ''}</span>
          <span>
            {#each Object.keys(v.emozioni) as e}<span class="pallino-piccolo" style:background={EMOZIONE[e as Emozione].colore}></span>{/each}
          </span>
        </button>
      {:else}
        <p class="tenue">Ancora nessuna pagina.</p>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .difficile { margin: 12px 0 16px; font-size: 0.95rem; }
  .difficile input { width: 20px; height: 20px; accent-color: var(--brace); }
  .secondo { margin-top: 14px; }
  .aggiungi { max-height: 260px; overflow-y: auto; border-top: 1px dashed var(--inchiostro); padding-top: 8px; }
  .voce { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%; text-align: left; background: #f4ecdc; color: var(--testo); font-family: var(--font-testo); font-weight: normal; }
  .voce strong { text-transform: capitalize; }
  .pallino-piccolo { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; border: 1px solid var(--inchiostro); }
  .testo-voce { white-space: pre-wrap; }
</style>
