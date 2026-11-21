<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import frasi from '../dati/frasi.json';
  import { analizzaTesto, app, dataDiOggi, salvaVoce, vai, type RigaDialogo } from '../lib/app.svelte';
  import { principali } from '../lib/analisi';
  import { COLORE_VIRTU, EMOZIONE, NOME_FORZA, NOME_VIRTU, SIMBOLO_SPECIE } from '../lib/etichette';
  import { ghiandeDaVoce, nomeAnimale, REGOLE } from '../lib/gioco';
  import { meseDi } from '../lib/date';
  import { EMOZIONI, FORZE_PER_VIRTU, VIRTU, virtuDi, type Emozione, type Evento, type Forza, type Punteggi, type VoceDiario } from '../lib/tipi';

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
  const coloreForza = (f: Forza) => COLORE_VIRTU[virtuDi(f)];

  // --- cosa porta la pagina (solo cose belle: niente serie da non spezzare, niente punizioni) ---
  let uovoPiuVicino = $derived(
    app.stato!.animali.filter((a) => a.fase === 'uovo').sort((a, b) => a.vociPerSchiudersi - b.vociPerSchiudersi)[0] ?? null,
  );
  let parole = $derived(testo.trim() ? testo.trim().split(/\s+/).length : 0);
  let forzeScelte = $derived(attiveF.filter((f) => !spenteF.includes(f)));
  let castagneInArrivo = $derived(ghiandeDaVoce(Object.fromEntries(forzeScelte.map((f) => [f, Math.min(forze[f] ?? 2, 6)]))));
  // gli animali che crescono un po' di più con questa pagina (quelli della virtù giusta)
  let piaceA = $derived.by(() => {
    const virtu = new Set(forzeScelte.map(virtuDi));
    return app.stato!.animali.filter((a) => a.fase !== 'uovo' && virtu.has(REGOLE.specieVirtu[a.specie]));
  });

  // --- pagine passate: calendario del mese con un adesivo per ogni pagina ---
  let mesiConPagine = $derived([...new Set(app.voci.map((v) => meseDi(v.data)))].sort().reverse());
  let mese = $state('');
  let meseVisto = $derived(mese || mesiConPagine[0] || meseDi(dataDiOggi()));
  let paginePerGiorno = $derived.by(() => {
    const m = new Map<string, VoceDiario[]>();
    for (const v of app.voci) if (meseDi(v.data) === meseVisto) m.set(v.data, [...(m.get(v.data) ?? []), v]);
    return m;
  });
  let celle = $derived.by(() => {
    const [a, mm] = meseVisto.split('-').map(Number);
    const primo = (new Date(a, mm - 1, 1).getDay() + 6) % 7; // lunedì = 0
    const giorni = new Date(a, mm, 0).getDate();
    return [...Array(primo).fill(null), ...Array.from({ length: giorni }, (_, i) => `${meseVisto}-${String(i + 1).padStart(2, '0')}`)] as (string | null)[];
  });
  let vociDelMese = $derived(app.voci.filter((v) => meseDi(v.data) === meseVisto));
  const nomeMese = (k: string) => new Date(k + '-15T12:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  function cambiaMese(d: number) {
    const i = mesiConPagine.indexOf(meseVisto) - d;
    if (i >= 0 && i < mesiConPagine.length) mese = mesiConPagine[i];
  }
  const emozionePrincipale = (v: VoceDiario) =>
    (Object.entries(v.emozioni) as [Emozione, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const coloreAdesivo = (v: VoceDiario) => {
    const e = emozionePrincipale(v);
    return e ? EMOZIONE[e].colore : 'var(--oro)';
  };
  function sfoglia(d: number) {
    if (!aperta) return;
    const i = app.voci.findIndex((v) => v.id === aperta!.id) + d;
    if (i >= 0 && i < app.voci.length) {
      aperta = app.voci[i];
      mese = meseDi(aperta.data);
    }
  }
</script>

<div class="pagina">
  {#if fase === 'scrivi'}
    <header class="testata">
      <h1>Il mio diario</h1>
      <button class="pillola-bottone" onclick={() => { aperta = null; mese = ''; fase = 'archivio'; }}>
        📚 <span>{app.voci.length}</span>
      </button>
    </header>
    {#if !testo}<Corvo id="diario_vuoto" piccolo />{/if}

    <div class="quaderno appare">
      <div class="anelli" aria-hidden="true"></div>
      <div class="foglio">
        <div class="data-pagina">{dataLeggibile(dataDiOggi())}</div>
        <textarea bind:value={testo} placeholder="Oggi…" aria-label="Pagina di oggi"></textarea>
        <div class="piede-foglio">
          <span class="matita" class:scrive={parole > 0}>✏️</span>
          {#if parole}{parole} {parole === 1 ? 'parola' : 'parole'}{/if}
        </div>
      </div>
    </div>

    <div class="premi">
      {#if uovoPiuVicino}
        <span class="premio">🥚 {uovoPiuVicino.vociPerSchiudersi <= 1 ? "Con questa pagina l'uovo si schiude!" : `L'uovo si schiude tra ${uovoPiuVicino.vociPerSchiudersi} pagine`}</span>
      {/if}
      <span class="premio">🌰 Ogni pagina porta castagne</span>
    </div>

    <button class="interruttore" class:acceso={difficile} aria-pressed={difficile} onclick={() => (difficile = !difficile)}>
      <span class="icona-meteo">{difficile ? '🌧️' : '⛅'}</span> È stata una giornata difficile
    </button>
    <button class="largo grande" disabled={testo.trim().length < 3} onclick={analizza}>✨ Ho finito</button>

  {:else if fase === 'conferma'}
    <header class="testata"><h1>Cosa ho capito</h1></header>
    <Corvo id="conferma" piccolo />

    <div class="vignetta">
      <span class="didascalia">Punti di forza</span>
      {#if attiveF.length === 0}<p class="tenue">Non ho trovato punti di forza precisi. Puoi aggiungerli tu.</p>{/if}
      <div class="gettoni">
        {#each attiveF as f (f)}
          <button class="chip gettone" class:spento={spenteF.includes(f)} style:--c={coloreForza(f)} onclick={() => attivaF(f)}>
            <span class="gemma"></span>{NOME_FORZA[f]}
          </button>
        {/each}
      </div>
      <span class="didascalia secondo">Emozioni</span>
      {#if attiveE.length === 0}<p class="tenue">Nessuna emozione chiara.</p>{/if}
      <div class="gettoni">
        {#each attiveE as e (e)}
          <button class="chip" class:spento={spenteE.includes(e)} onclick={() => attivaE(e)}>
            <span class="pallino" style:background={EMOZIONE[e].colore}></span>{EMOZIONE[e].nome}
          </button>
        {/each}
      </div>
      <div class="riga tra">
        <span class="tenue">Tocca per togliere</span>
        <button class="leggero" onclick={() => (aggiungi = !aggiungi)}>{aggiungi ? 'Chiudi' : '+ Aggiungi'}</button>
      </div>
      {#if aggiungi}
        <div class="aggiungi">
          <div class="gruppo">Emozioni</div>
          {#each EMOZIONI.filter((e) => !attiveE.includes(e)) as e}
            <button class="chip" onclick={() => nuovaE(e)}><span class="pallino" style:background={EMOZIONE[e].colore}></span>{EMOZIONE[e].nome}</button>
          {/each}
          {#each VIRTU as v}
            {@const libere = (FORZE_PER_VIRTU[v] as readonly Forza[]).filter((f) => !attiveF.includes(f))}
            {#if libere.length}
              <div class="gruppo" style:color={COLORE_VIRTU[v]}>{NOME_VIRTU[v]}</div>
              {#each libere as f}
                <button class="chip gettone" style:--c={COLORE_VIRTU[v]} onclick={() => nuovaF(f)}><span class="gemma"></span>{NOME_FORZA[f]}</button>
              {/each}
            {/if}
          {/each}
        </div>
      {/if}
      <button class="interruttore" class:acceso={difficile} aria-pressed={difficile} onclick={() => (difficile = !difficile)}>
        <span class="icona-meteo">{difficile ? '🌧️' : '⛅'}</span> È stata una giornata difficile
      </button>
    </div>

    <div class="bottino appare">
      <div class="testata-bottino">QUESTA PAGINA PORTA</div>
      <div class="riga-bottino"><span>🌰 Castagne</span><strong>+{castagneInArrivo}</strong></div>
      {#if uovoPiuVicino && uovoPiuVicino.vociPerSchiudersi <= 1}
        <div class="riga-bottino"><span>🥚 L'uovo si schiude!</span><strong>✦</strong></div>
      {/if}
      {#if piaceA.length}
        <div class="riga-bottino">
          <span>Fa crescere di più</span>
          <strong class="nomi">{piaceA.map((a) => `${SIMBOLO_SPECIE[a.specie]} ${a.nome || nomeAnimale(a)}`).join(' · ')}</strong>
        </div>
      {/if}
    </div>

    <div class="riga">
      <button class="secondario" onclick={() => (fase = 'scrivi')}>Indietro</button>
      <button style="flex:1" disabled={salvando} onclick={conferma}>Al villaggio! 🌰</button>
    </div>

  {:else if aperta}
    {@const i = app.voci.findIndex((v) => v.id === aperta!.id)}
    <header class="testata">
      <h1>Pagine passate</h1>
      <button class="pillola-bottone" onclick={() => (aperta = null)}>📅 Calendario</button>
    </header>
    <div class="quaderno appare">
      <div class="anelli" aria-hidden="true"></div>
      <div class="foglio letto">
        <div class="data-pagina">{dataLeggibile(aperta.data)}{#if aperta.giornataDifficile} 🌧️{/if}</div>
        <p class="testo-voce">{aperta.testo}</p>
        <div class="gettoni">
          {#each Object.keys(aperta.forze) as f}
            <span class="chip gettone fermo" style:--c={coloreForza(f as Forza)}><span class="gemma"></span>{NOME_FORZA[f as Forza]}</span>
          {/each}
          {#each Object.keys(aperta.emozioni) as e}
            <span class="chip fermo"><span class="pallino" style:background={EMOZIONE[e as Emozione].colore}></span>{EMOZIONE[e as Emozione].nome}</span>
          {/each}
        </div>
      </div>
    </div>
    <div class="annotazione"><span class="chi">Il corvo ha annotato</span>{aperta.riassunto}</div>
    <div class="riga tra sfoglia">
      <button class="secondario tondo" disabled={i >= app.voci.length - 1} onclick={() => sfoglia(1)}>‹ Prima</button>
      <button class="secondario tondo" disabled={i <= 0} onclick={() => sfoglia(-1)}>Dopo ›</button>
    </div>

  {:else}
    <header class="testata">
      <h1>Pagine passate</h1>
      <button class="pillola-bottone" onclick={() => (fase = 'scrivi')}>✏️ Scrivi</button>
    </header>
    {#if !app.voci.length}
      <Corvo testo="Qui finiranno le tue pagine, una per giorno. Ogni pagina diventa un adesivo sul calendario." piccolo />
    {:else}
      <div class="calendario vignetta appare">
        <div class="mese-nav">
          <button class="freccia" aria-label="Mese prima" disabled={mesiConPagine.indexOf(meseVisto) >= mesiConPagine.length - 1} onclick={() => cambiaMese(-1)}>‹</button>
          <span class="nome-mese">{nomeMese(meseVisto)}</span>
          <button class="freccia" aria-label="Mese dopo" disabled={mesiConPagine.indexOf(meseVisto) <= 0} onclick={() => cambiaMese(1)}>›</button>
        </div>
        <div class="settimana">{#each ['L', 'M', 'M', 'G', 'V', 'S', 'D'] as g}<span>{g}</span>{/each}</div>
        <div class="griglia-giorni">
          {#each celle as d}
            {#if !d}
              <span></span>
            {:else}
              {@const pagine = paginePerGiorno.get(d)}
              {#if pagine}
                <button class="giorno adesivo" style:--c={coloreAdesivo(pagine[0])} onclick={() => (aperta = pagine[0])} aria-label={dataLeggibile(d)}>
                  {Number(d.slice(8))}
                  {#if pagine[0].giornataDifficile}<i>🌧️</i>{/if}
                </button>
              {:else}
                <span class="giorno" class:oggi={d === dataDiOggi()}>{Number(d.slice(8))}</span>
              {/if}
            {/if}
          {/each}
        </div>
        <p class="tenue centro conta">{vociDelMese.length} {vociDelMese.length === 1 ? 'pagina' : 'pagine'} in questo mese</p>
      </div>

      {#each vociDelMese as v (v.id)}
        <button class="voce appare" onclick={() => (aperta = v)}>
          <span class="numero" style:--c={coloreAdesivo(v)}>{Number(v.data.slice(8))}</span>
          <span class="corpo">
            <strong>{dataLeggibile(v.data)}</strong>
            <span class="anteprima">{v.testo.slice(0, 80)}{v.testo.length > 80 ? '…' : ''}</span>
          </span>
        </button>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .testata { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }
  .testata h1 { margin: 0; }
  .pillola-bottone {
    background: var(--panna); color: var(--inchiostro); border: 3px solid var(--legno); box-shadow: 0 4px 0 var(--legno-scuro);
    padding: 5px 14px; font-size: 0.95rem; text-shadow: none; white-space: nowrap;
  }
  .grande { font-size: 1.2rem; padding: 14px; border-width: 4px; box-shadow: 0 6px 0 var(--legno-scuro); }
  .grande:not(:disabled) { animation: respira 2.4s ease-in-out infinite; }
  @keyframes respira { 50% { transform: scale(1.03); } }

  /* quaderno ad anelli */
  .quaderno { position: relative; display: flex; margin-bottom: 14px; }
  .anelli {
    width: 26px; flex: none; margin-right: -12px; z-index: 1;
    background: radial-gradient(circle at 50% 50%, #fffdf6 0 5px, var(--legno-scuro) 5.5px 8px, transparent 8.5px) 0 14px / 26px 30px repeat-y;
  }
  .foglio {
    flex: 1; background: #fffdf6; border: var(--bordo); border-radius: 8px 20px 20px 8px;
    box-shadow: 0 5px 0 var(--legno-scuro), 6px 10px 0 -2px var(--panna-2), 6px 10px 0 1px var(--legno); padding: 12px 14px 8px 22px;
  }
  .data-pagina { font-weight: 900; color: var(--brace); text-transform: capitalize; font-size: 0.95rem; border-bottom: 2px dashed #f07a4a66; padding-bottom: 6px; }
  .foglio textarea { border: none; border-radius: 0; padding: 4px 0; min-height: 26dvh; box-shadow: none; background-color: transparent; }
  .foglio textarea:focus { box-shadow: none; }
  .piede-foglio { display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--testo-tenue); min-height: 24px; }
  .matita { display: inline-block; }
  .matita.scrive { animation: scrive 0.9s ease-in-out infinite; }
  @keyframes scrive { 50% { transform: translate(3px, -2px) rotate(-8deg); } }
  .letto { padding-bottom: 14px; }
  .testo-voce { white-space: pre-wrap; line-height: 1.7; margin: 10px 0 14px; font-size: 1.05rem; }

  .premi { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 12px; }
  .premio { background: #ffffffcc; border: 2px solid var(--legno); border-radius: 999px; padding: 3px 12px; font-size: 0.85rem; font-weight: 800; }

  .interruttore {
    display: flex; align-items: center; gap: 10px; width: 100%; margin: 4px 0 14px; padding: 9px 14px;
    background: var(--panna); color: var(--inchiostro); text-shadow: none; font-weight: 800; font-size: 0.95rem; text-align: left;
    box-shadow: 0 4px 0 var(--legno-scuro);
  }
  .interruttore.acceso { background: #dbe6fb; border-color: var(--notte-blu); }
  .icona-meteo { font-size: 1.3rem; }

  .gettoni { display: flex; flex-wrap: wrap; margin-bottom: 4px; }
  .gettone { border-color: var(--c); background: color-mix(in srgb, var(--c) 18%, #fff); }
  .gemma { width: 14px; height: 14px; transform: rotate(45deg); border-radius: 3px; background: var(--c); border: 2px solid var(--legno-scuro); }
  .fermo { cursor: default; animation: none; }
  .secondo { margin-top: 14px; }
  .aggiungi { max-height: 300px; overflow-y: auto; border-top: 2px dashed var(--legno); padding-top: 8px; margin-top: 6px; }
  .gruppo { font-weight: 900; font-size: 0.8rem; letter-spacing: 0.06em; text-transform: uppercase; margin: 8px 0 6px; color: var(--testo-tenue); }

  /* finestra da gioco, come il menu Costruisci */
  .bottino {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.96), rgba(18, 28, 70, 0.98));
    border: 3px solid #d8e4ff; outline: 3px solid #1a2350; border-radius: 14px; color: #f2f6ff; padding: 10px 14px 8px; margin: 4px 3px 22px;
  }
  .testata-bottino { font-weight: 900; letter-spacing: 0.08em; font-size: 0.85rem; border-bottom: 2px solid rgba(216, 228, 255, 0.4); padding-bottom: 6px; margin-bottom: 4px; }
  .riga-bottino { display: flex; justify-content: space-between; gap: 10px; padding: 5px 0; }
  .riga-bottino strong { color: #ffe08a; }
  .riga-bottino .nomi { text-align: right; }

  /* calendario degli adesivi */
  .calendario { padding-top: 12px; }
  .mese-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .nome-mese { font-weight: 900; font-size: 1.15rem; text-transform: capitalize; color: var(--legno-scuro); }
  .freccia {
    width: 40px; height: 40px; padding: 0; font-size: 1.4rem; line-height: 1; background: var(--panna); color: var(--legno-scuro);
    box-shadow: 0 4px 0 var(--legno-scuro); text-shadow: none;
  }
  .freccia:disabled { opacity: 0.3; }
  .settimana, .griglia-giorni { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; }
  .settimana { font-size: 0.75rem; color: var(--testo-tenue); font-weight: 900; margin-bottom: 4px; }
  .giorno { aspect-ratio: 1; display: grid; place-items: center; font-size: 0.85rem; color: var(--testo-tenue); border-radius: 50%; position: relative; }
  .giorno.oggi { border: 2px dashed var(--brace); color: var(--brace); }
  .adesivo {
    padding: 0; background: var(--c); color: #fff; border: 3px solid #fff; outline: 2px solid var(--legno);
    box-shadow: 0 3px 0 var(--legno-scuro); font-weight: 900; text-shadow: 0 1px 1px #0006; animation: pop 0.35s cubic-bezier(0.2, 1.8, 0.4, 1) both;
  }
  .adesivo:nth-child(odd) { rotate: -6deg; }
  .adesivo:nth-child(even) { rotate: 5deg; }
  .adesivo i { position: absolute; top: -10px; right: -8px; font-style: normal; font-size: 0.8rem; }
  .conta { margin: 10px 0 0; }

  .voce {
    display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; margin-bottom: 10px; padding: 10px 12px;
    background: var(--panna); color: var(--testo); text-shadow: none; border-radius: 18px; box-shadow: 0 4px 0 var(--legno-scuro);
  }
  .numero {
    flex: none; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; background: var(--c); color: #fff;
    font-weight: 900; font-size: 1.1rem; border: 3px solid #fff; outline: 2px solid var(--legno); text-shadow: 0 1px 1px #0006;
  }
  .corpo { display: flex; flex-direction: column; min-width: 0; }
  .corpo strong { text-transform: capitalize; font-size: 0.95rem; }
  .anteprima { font-weight: 600; font-size: 0.88rem; color: var(--testo-tenue); }

  .annotazione {
    position: relative; background: #fff; border: var(--bordo); border-radius: 18px; padding: 16px 14px 10px; margin: 18px 0 14px;
    font-weight: 700; box-shadow: 0 4px 0 var(--legno-scuro);
  }
  .annotazione .chi {
    position: absolute; top: -14px; left: 14px; background: var(--notte-blu); color: #fff; font-size: 0.78rem; font-weight: 800;
    padding: 1px 12px; border-radius: 999px; border: 3px solid var(--legno); transform: rotate(-3deg);
  }
  .sfoglia button { min-width: 120px; }
</style>
