<script lang="ts">
  import Icona, { type NomeIcona } from './Icona.svelte';
  // Modalità arredo: Giada sistema il villaggio come vuole. Sposta le cose, abbatte alberi con l'accetta,
  // disegna il sentiero, fa aiuole e semina, dipinge quadretti, mette cartelli e recinti.
  import { onDestroy, onMount } from 'svelte';
  import { app, cambiaArredo } from '../lib/app.svelte';
  import {
    compraSemi, conAcqua, dipingiSentiero, fasePianta, FILA, giorniAllaFioritura, MATERIALI_SENTIERO, metteVia, nuovaAiuola, nuovaFila, nuovoOggetto,
    nuovoQuadretto, palata, pianta, PIANTE, PREZZI, sposta, TIPI_FILA, togliAcqua, togliNatura, togliPianta, versaAcqua, type Aiuola, type Palata, type TipoFila,
  } from '../lib/arredo';
  import { nomeAnimale, REGOLE } from '../lib/gioco';
  import type { EventoArredo, ModoArredo, Scena } from '../scena/scena';
  import Pittura from './Pittura.svelte';

  let { scena, onchiudi, apri = null, nuova = null }: { scena: Scena; onchiudi: () => void; apri?: string | null; nuova?: string | null } = $props();
  let s = $derived(app.stato!);
  let a = $derived(app.stato!.arredo!);

  let modo = $state<ModoArredo>('sposta');
  let scelto = $state<string | null>(null);
  let aiuolaAperta = $state<string | null>(null);
  let pennello = $state(1);
  let pala = $state<Palata>('scava');
  let messaggio = $state('');
  let dipingi = $state(false);
  let cartello = $state<string | null>(null);
  let tipoFila = $state<TipoFila>('recinto');
  // "Annulla": com'era il villaggio prima di ogni cosa fatta (le ultime 40), per tornare indietro
  let storia = $state<string[]>([]);
  let timerMsg: ReturnType<typeof setTimeout> | undefined;

  const AIUTO: Record<ModoArredo, string> = {
    sposta: 'Tocca una cosa per sceglierla, poi trascinala o tocca dove vuoi metterla.',
    togli: `Con l'accetta: ogni tocco è un colpo. Un albero cade dopo 5 colpi (🌰${PREZZI.albero}), un cespuglio dopo 2, un sasso dopo 3 (🌰${PREZZI.cespuglio}). Fiori ed erba si raccolgono gratis.`,
    sentiero: 'Trascina il dito per disegnare il sentiero. Con due dita sposti la vista.',
    terreno: `Con la pala: trascina il dito per scavare una buca o alzare una montagnola (🌰${PREZZI.palata} a palata). Spianare è gratis. Per fare un laghetto, poi riempi la buca con 💧 Acqua.`,
    acqua: "Tocca una buca scavata con la pala: si riempie d'acqua e diventa un laghetto. Tocca l'acqua per toglierla.",
    fila: 'Tocca per mettere un pezzo: il prossimo è già pronto in fondo, trasparente, basta toccarlo. Oppure trascina il dito per farne tanti in fila in un colpo.',
    orto: `Compra un'aiuola, mettila dove vuoi e toccala per piantare i semi.`,
    quadri: 'Dipingi quadretti e metti cartelli per indicare la via.',
  };
  const NOMI_COSA: Record<string, string> = { albero: "Hai abbattuto l'albero", cespuglio: 'Hai tolto il cespuglio', sasso: 'Hai spostato via il sasso', piccolo: 'Fatto spazio' };

  function dici(t: string) {
    messaggio = t;
    clearTimeout(timerMsg);
    timerMsg = setTimeout(() => (messaggio = ''), 3200);
  }

  const istantanea = () => JSON.stringify({ a: app.stato!.arredo, g: app.stato!.ghiande });

  /** Ricorda com'era prima, per poter tornare indietro. */
  function ricorda() {
    storia = [...storia.slice(-39), istantanea()];
  }

  /** Fa una cosa al villaggio che si può annullare. */
  function fai<T>(f: Parameters<typeof cambiaArredo<T>>[0], subito = true): T | undefined {
    const prima = istantanea();
    const r = cambiaArredo(f, subito);
    if (istantanea() !== prima) storia = [...storia.slice(-39), prima];
    return r;
  }

  /** Annulla l'ultima cosa fatta (anche un tratto intero di sentiero o di pala). Le castagne spese tornano. */
  function annulla() {
    const ora = istantanea();
    let prima: string | undefined;
    while (storia.length && (prima = storia[storia.length - 1]) === ora) storia = storia.slice(0, -1);
    if (!storia.length || !prima || prima === ora) return dici('Non c\'è niente da annullare.');
    storia = storia.slice(0, -1);
    const { a: ar, g } = JSON.parse(prima);
    cambiaArredo((st) => { st.arredo = ar; st.ghiande = g; });
    scena.prossimaFila = null;
    scena.aggiornaFantasmiFila();
    scegli(null);
    dici('↶ Fatto: tornato com\'era prima.');
  }

  function tasto(e: KeyboardEvent) {
    // Esc: prima lascia la cosa scelta, poi esce dall'arredo
    if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement) && !dipingi) {
      e.preventDefault();
      if (aiuolaAperta) aiuolaAperta = null;
      else if (scelto) scegli(null);
      else onchiudi();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      annulla();
    }
  }

  function scegliFila(t: TipoFila) {
    tipoFila = t;
    scena.tipoFila = t;
    scena.prossimaFila = null;
    scena.aggiornaFantasmiFila();
  }

  function cambiaModo(m: ModoArredo) {
    modo = m;
    scena.modo = m;
    scena.prossimaFila = null;
    scena.aggiornaFantasmiFila();
    scegli(null);
    aiuolaAperta = null;
  }

  function scegli(k: string | null) {
    scelto = k;
    scena.seleziona(k);
  }

  function nomeDi(k: string): string {
    if (k === 'castagno') return 'Il castagno';
    if (k.startsWith('c:')) return REGOLE.costruzioni.find((c) => c.id === k.slice(2))?.nome ?? 'La costruzione';
    if (k.startsWith('e:')) return REGOLE.edifici.find((e) => e.tipo === k.slice(2))?.nome ?? "L'edificio";
    if (k.startsWith('b:')) {
      const an = s.animali.find((x) => x.id === k.slice(2));
      if (!an) return 'La casa';
      return an.nome ? `La casa di ${an.nome}` : `La casa ${nomeAnimale(an).replace(/^il /, 'del ').replace(/^lo /, 'dello ').replace(/^la /, 'della ').replace(/^l'/, "dell'")}`;
    }
    if (k.startsWith('a:')) return "L'aiuola";
    if (k.startsWith('q:')) return 'Il quadretto';
    if (k.startsWith('o:')) return a.oggetti.find((o) => 'o:' + o.id === k)?.tipo === 'cartello' ? 'Il cartello' : 'Il recinto';
    return '';
  }

  function evento(e: EventoArredo) {
    switch (e.tipo) {
      case 'seleziona':
        if (modo !== 'sposta' && e.chiave) cambiaModo('sposta');
        scegli(e.chiave);
        break;
      case 'sposta':
        fai((st) => sposta(st, e.chiave, e.posto));
        break;
      case 'togli':
        if (fai((st, oggi) => togliNatura(st, e.x, e.z, e.costo, oggi))) dici(`${NOMI_COSA[e.cosa] ?? 'Fatto'}${e.costo ? ` (🌰 ${e.costo})` : ''}.`);
        break;
      case 'poche':
        dici(`Servono 🌰 ${e.costo} per ${e.cosa === 'albero' ? "abbattere quest'albero" : 'toglierlo'}. Scrivi nel diario per averne altre!`);
        break;
      case 'tratto':
        ricorda();
        break;
      case 'acqua': {
        const c = conAcqua(app.stato!.arredo, e.x, e.z);
        const n = fai((st) => (c ? togliAcqua(st, e.x, e.z) : versaAcqua(st, e.x, e.z)));
        if (!n) dici(c ? 'Qui non c\'è acqua da togliere.' : 'Qui non c\'è una buca: prima scavala con la pala ⛏️, poi versaci l\'acqua.');
        else dici(c ? 'Hai tolto l\'acqua: la buca è di nuovo asciutta.' : '💧 Splash! La buca è diventata un laghetto.');
        break;
      }
      case 'fila': {
        const def = FILA[scena.tipoFila];
        const messi = fai((st) => nuovaFila(st, scena.tipoFila, e.pezzi)) ?? [];
        if (!messi.length) dici(`Un pezzo di ${def.nome.toLowerCase()} costa 🌰 ${def.costo}.`);
        else if (messi.length < e.pezzi.length) dici(`Messi ${messi.length} pezzi: per gli altri non bastano le castagne.`);
        else if (messi.length > 1) dici(`${messi.length} pezzi in fila (🌰 ${messi.length * def.costo}).`);
        break;
      }
      case 'dipingi':
        if (modo === 'terreno') {
          if (pala !== 'spiana' && s.ghiande < PREZZI.palata) { dici('Servono castagne per scavare: scrivi nel diario per averne altre!'); break; }
          cambiaArredo((st) => palata(st, e.x, e.z, pala, (x, z) => scena.liberoPerPala(x, z)), false);
        } else cambiaArredo((st) => dipingiSentiero(st, e.x, e.z, pennello), false);
        break;
      case 'apri':
        if (e.chiave.startsWith('a:')) aiuolaAperta = e.chiave.slice(2);
        else {
          if (modo !== 'sposta') cambiaModo('sposta');
          scegli(e.chiave);
        }
        break;
    }
  }

  onMount(() => {
    if (nuova) {
      // una casa nuova: è già scelta, Giada la trascina dove vuole
      scegli(nuova);
      messaggio = `📍 ${nomeDi(nuova)}: trascinala dove vuoi (o tocca il prato), girala con le frecce, poi tocca «✓ Mettila qui».`;
    }
    if (apri) {
      modo = 'orto';
      aiuolaAperta = apri;
    }
    scena.modo = modo;
    scena.pennello = pennello;
    scena.tipoFila = tipoFila;
    scena.onArredo = evento;
    window.addEventListener('keydown', tasto);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', tasto);
    scena.modo = null;
    scena.prossimaFila = null;
    scena.seleziona(null);
    scena.onArredo = () => {};
    clearTimeout(timerMsg);
  });

  function ruota(verso: number) {
    if (!scelto) return;
    const p = scena.postoDi(scelto);
    if (!p) return;
    fai((st) => sposta(st, scelto!, { ...p, r: p.r + (verso * Math.PI) / 4 }));
  }

  function mettiVia() {
    if (!scelto) return;
    const k = scelto;
    fai((st, oggi) => metteVia(st, k, oggi));
    scegli(null);
  }

  function compraAiuola() {
    const p = scena.puntoLibero();
    const ai = fai((st) => nuovaAiuola(st, p.x, p.z));
    if (!ai) return dici(`Un'aiuola costa 🌰 ${PREZZI.aiuola}.`);
    cambiaModo('sposta');
    scegli('a:' + ai.id);
    dici("Ecco l'aiuola! Trascinala dove vuoi, poi toccala con 🌱 per piantare.");
  }

  function compra(specie: string) {
    if (!fai((st) => compraSemi(st, specie))) dici('Non bastano le castagne per questi semi.');
  }

  function semina(ai: Aiuola, posto: number, specie: string) {
    fai((st, oggi) => pianta(st, ai.id, posto, specie, oggi));
  }

  function nuovoCartello() {
    const testo = (cartello ?? '').trim();
    if (!testo) return;
    const p = scena.puntoLibero();
    const o = fai((st) => nuovoOggetto(st, 'cartello', p.x, p.z, testo));
    cartello = null;
    if (!o) return dici(`Un cartello costa 🌰 ${PREZZI.cartello}.`);
    cambiaModo('sposta');
    scegli('o:' + o.id);
    dici('Mettilo dove serve e giralo con le frecce per indicare la strada.');
  }

  function appendi(disegno: string, cornice: number) {
    const p = scena.puntoLibero();
    const q = fai((st, oggi) => nuovoQuadretto(st, disegno, cornice, p.x, p.z, oggi));
    dipingi = false;
    if (!q) return dici(`Un quadretto costa 🌰 ${PREZZI.quadretto}.`);
    cambiaModo('sposta');
    scegli('q:' + q.id);
    dici('Che bello! Mettilo dove vuoi.');
  }

  function scegliPennello(m: number) {
    pennello = m;
    scena.pennello = m;
  }

  let aiuola = $derived(aiuolaAperta ? a.aiuole.find((x) => x.id === aiuolaAperta) ?? null : null);
  let semiMiei = $derived(Object.entries(a.semi).filter(([, n]) => n > 0));
  const FASI_PIANTA = ['Seme appena piantato', 'Germoglio', 'Piantina', 'Fiorita!'];
  const def = (id: string) => PIANTE.find((d) => d.id === id)!;
</script>

{#if dipingi}
  <Pittura onannulla={() => (dipingi = false)} onfatto={appendi} />
{/if}

<div class="arredo">
  <div class="barra-alta">
    <div class="pillola">🌰 {s.ghiande}</div>
    <div class="riga">
      <button class="tondo grigio annulla" disabled={!storia.length} onclick={annulla} title="Annulla (Ctrl+Z)">↶ Annulla</button>
      <button class="tondo fatto" onclick={onchiudi}>✓ Ho finito</button>
    </div>
  </div>

  <div class="sotto">
    {#if messaggio}<div class="nuvoletta">{messaggio}</div>{/if}

    {#if aiuola}
      <div class="finestra">
        <div class="testata"><span>L'AIUOLA</span><span>🌰 {s.ghiande}</span></div>
        <div class="posti">
          {#each aiuola.piante as p, i (i)}
            <div class="posto">
              {#if p}
                {@const f = fasePianta(p, app.stato!.ultimoAccesso)}
                <div class="grande">{f === 3 ? def(p.specie).simbolo : f === 0 ? '🟫' : '🌱'}</div>
                <div class="nome">{def(p.specie).nome}</div>
                <div class="piccolo">{FASI_PIANTA[f]}</div>
                {#if f < 3}<div class="piccolo">fiorisce tra {giorniAllaFioritura(p, app.stato!.ultimoAccesso)} g</div>{/if}
                <button class="mini" onclick={() => fai((st) => togliPianta(st, aiuola!.id, i))}>Togli</button>
              {:else}
                <div class="grande">·</div>
                {#if semiMiei.length}
                  <div class="piccolo">Pianta:</div>
                  <div class="semi">
                    {#each semiMiei as [sp, n] (sp)}
                      <button class="seme" onclick={() => semina(aiuola!, i, sp)} title={def(sp).nome}>{def(sp).simbolo}<sub>{n}</sub></button>
                    {/each}
                  </div>
                {:else}
                  <div class="piccolo">Vuoto: compra dei semi qui sotto</div>
                {/if}
              {/if}
            </div>
          {/each}
        </div>
        <div class="sottotitolo">SEMI</div>
        <ul class="negozio">
          {#each PIANTE as d (d.id)}
            <li>
              <button class="voce" disabled={s.ghiande < d.costo} onclick={() => compra(d.id)}>
                <span>{d.simbolo} {d.nome} <span class="giorni">{d.giorni} giorni</span></span>
                <span class="prezzo">{a.semi[d.id] ? `hai ${a.semi[d.id]} · ` : ''}🌰 {d.costo}</span>
              </button>
            </li>
          {/each}
        </ul>
        <button class="tondo grigio chiudi" onclick={() => (aiuolaAperta = null)}>Chiudi</button>
      </div>
    {:else if cartello !== null}
      <div class="finestra">
        <div class="testata"><span>UN CARTELLO</span><span>🌰 {PREZZI.cartello}</span></div>
        <p class="aiuto">Cosa c'è scritto? Per esempio «Al laghetto» o «Casa di Nocciola».</p>
        <input type="text" bind:value={cartello} maxlength="18" placeholder="Al laghetto" />
        <div class="riga">
          <button class="tondo grigio" onclick={() => (cartello = null)}>Annulla</button>
          <button class="tondo" disabled={!cartello.trim() || s.ghiande < PREZZI.cartello} onclick={nuovoCartello}>Pianta il cartello</button>
        </div>
      </div>
    {:else}
      <div class="finestra compatta">
        {#if modo === 'sposta' && scelto}
          <div class="scelto">
            <b>{nomeDi(scelto)}</b>
            <div class="riga">
              <button class="mini" onclick={() => ruota(1)} aria-label="Gira a sinistra">↺</button>
              <button class="mini" onclick={() => ruota(-1)} aria-label="Gira a destra">↻</button>
              {#if scelto.startsWith('a:')}<button class="mini" onclick={() => (aiuolaAperta = scelto!.slice(2))}>🌱 Pianta</button>{/if}
              {#if scelto.startsWith('a:') || scelto.startsWith('q:') || scelto.startsWith('o:')}<button class="mini" onclick={mettiVia}>Metti via</button>{/if}
              {#if nuova && scelto === nuova}
                <!-- la casa nuova: messa a posto, si torna subito al villaggio -->
                <button class="mini conferma" onclick={onchiudi}>✓ Mettila qui</button>
              {:else}
                <button class="mini conferma" onclick={() => scegli(null)}>✓ Lascia qui</button>
              {/if}
            </div>
          </div>
        {:else}
          <div class="riga-aiuto">
            <p class="aiuto">{AIUTO[modo]}</p>
            <button class="mini esci" onclick={onchiudi}>✓ Ho finito</button>
          </div>
        {/if}

        {#if modo === 'sentiero'}
          <div class="riga materiali">
            {#each MATERIALI_SENTIERO as m (m.id)}
              <button class="materiale" class:attivo={pennello === m.id} style:background={m.colore} onclick={() => scegliPennello(m.id)}>{m.nome}</button>
            {/each}
            <button class="materiale gomma" class:attivo={pennello === 0} onclick={() => scegliPennello(0)}>Gomma</button>
          </div>
        {:else if modo === 'terreno'}
          <div class="riga materiali">
            {#each [['scava', '⛏️ Scava', '#7a5a3a'], ['alza', '⛰️ Alza', '#5f9a48'], ['spiana', '🟩 Spiana', '#8fbf6a']] as [p, nome, colore] (p)}
              <button class="materiale" class:attivo={pala === p} style:background={colore} onclick={() => (pala = p as Palata)}>{nome}</button>
            {/each}
          </div>
        {:else if modo === 'fila'}
          <div class="riga materiali">
            {#each TIPI_FILA as t (t)}
              <button class="materiale fila" class:attivo={tipoFila === t} onclick={() => scegliFila(t)}>{FILA[t].simbolo} {FILA[t].nome} <span class="prezzo">🌰{FILA[t].costo}</span></button>
            {/each}
          </div>
        {:else if modo === 'orto'}
          <div class="riga">
            <button class="tondo" disabled={s.ghiande < PREZZI.aiuola} onclick={compraAiuola}>Nuova aiuola 🌰 {PREZZI.aiuola}</button>
          </div>
          {#if a.aiuole.length}<p class="aiuto">Hai {a.aiuole.length} {a.aiuole.length === 1 ? 'aiuola' : 'aiuole'}: toccale per piantare.</p>{/if}
        {:else if modo === 'quadri'}
          <div class="riga">
            <button class="mini" disabled={s.ghiande < PREZZI.quadretto} onclick={() => (dipingi = true)}>🖼 Quadretto 🌰{PREZZI.quadretto}</button>
            <button class="mini" disabled={s.ghiande < PREZZI.cartello} onclick={() => (cartello = '')}>🪧 Cartello 🌰{PREZZI.cartello}</button>
          </div>
        {/if}
      </div>

      <div class="strumenti">
        {#each [['sposta', 'sposta', 'Sposta'], ['togli', 'accetta', 'Accetta'], ['sentiero', 'sentiero', 'Sentiero'], ['terreno', 'pala', 'Pala'], ['acqua', 'acqua', 'Acqua'], ['fila', 'fila', 'In fila'], ['orto', 'aiuole', 'Aiuole'], ['quadri', 'cose', 'Cose']] as [m, icona, nome] (m)}
          <button class="strumento" class:attivo={modo === m} onclick={() => cambiaModo(m as ModoArredo)}>
            <Icona nome={icona as NomeIcona} taglia={26} /><span>{nome}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .arredo { position: absolute; inset: 0; pointer-events: none; }
  .arredo > * { pointer-events: auto; }
  .barra-alta {
    position: absolute; top: calc(10px + env(safe-area-inset-top)); left: 12px; right: 12px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .pillola {
    background: var(--panna); border: 3px solid var(--legno); border-radius: 999px; padding: 5px 14px;
    font-weight: 800; color: #7a4a1a; box-shadow: 0 4px 0 var(--legno-scuro);
  }
  .fatto { padding: 8px 18px; }
  .annulla { padding: 8px 14px; }
  .annulla:disabled { opacity: 0.5; }
  .materiale.fila { background: rgba(255, 255, 255, 0.14); text-shadow: none; }
  .materiale .prezzo { font-size: 0.75rem; }
  .sotto { position: absolute; left: 10px; right: 10px; bottom: calc(80px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; }
  .nuvoletta {
    align-self: center; background: #fffbe8; color: var(--inchiostro); border: 3px solid var(--legno); border-radius: 16px;
    padding: 8px 14px; font-weight: 700; font-size: 0.92rem; text-align: center; box-shadow: 0 4px 0 var(--legno-scuro);
    animation: entra 0.25s ease-out both;
  }
  .finestra {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.94), rgba(18, 28, 70, 0.96));
    border: 3px solid #d8e4ff; outline: 3px solid #1a2350; border-radius: 14px; color: #f2f6ff;
    padding: 10px 12px 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45); max-height: 62dvh;
    display: flex; flex-direction: column; animation: entra 0.22s ease-out both;
  }
  .finestra.compatta { padding: 8px 10px; }
  @keyframes entra { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
  .testata { display: flex; justify-content: space-between; font-weight: 900; letter-spacing: 0.08em; border-bottom: 2px solid rgba(216, 228, 255, 0.4); padding-bottom: 6px; margin-bottom: 8px; }
  .sottotitolo { font-weight: 900; letter-spacing: 0.08em; font-size: 0.85rem; margin: 10px 0 4px; color: #ffe08a; }
  .aiuto { font-size: 0.85rem; color: #dbe3ff; margin: 2px 2px 6px; }
  .riga { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .mini {
    padding: 7px 10px; border-radius: 10px; font-size: 0.85rem; background: rgba(255, 255, 255, 0.12); border: 2px solid rgba(216, 228, 255, 0.5);
    color: #fff; box-shadow: none; text-shadow: none;
  }
  .mini:disabled { opacity: 0.45; }
  .mini.conferma { background: #ffe08a; color: #4a2c0a; border-color: #ffe08a; font-weight: 800; }
  .riga-aiuto { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
  .riga-aiuto .aiuto { flex: 1; }
  .mini.esci { flex: none; background: #f0814f; border-color: #ffd7c2; font-weight: 800; white-space: nowrap; }
  .scelto { display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px; }
  .materiali { margin-top: 2px; }
  .materiale { padding: 6px 10px; border-radius: 10px; font-size: 0.82rem; color: #fff; border: 3px solid transparent; box-shadow: none; text-shadow: 0 1px 2px #0008; }
  .materiale.gomma { background: #ececec; color: #333; text-shadow: none; }
  .materiale.attivo { border-color: #ffe08a; transform: scale(1.06); }
  .strumenti { display: flex; gap: 4px; background: var(--panna); border: 3px solid var(--legno); border-radius: 18px; padding: 4px; box-shadow: 0 4px 0 var(--legno-scuro); }
  .strumento {
    flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 5px 1px; border-radius: 12px; white-space: nowrap;
    background: transparent; color: var(--inchiostro); font-size: 0.66rem; font-weight: 800; box-shadow: none; border: none; text-shadow: none;
  }
  .strumento.attivo { background: #ffe08a; }
  .posti { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .posto { background: rgba(255, 255, 255, 0.07); border-radius: 10px; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .grande { font-size: 1.6rem; }
  .nome { font-weight: 800; font-size: 0.85rem; }
  .piccolo { font-size: 0.72rem; color: #c4cff0; }
  .semi { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
  .seme { padding: 3px 5px; font-size: 1.1rem; border-radius: 8px; background: rgba(255, 255, 255, 0.15); box-shadow: none; border: none; }
  .seme sub { font-size: 0.6rem; color: #fff; }
  .negozio { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
  .voce {
    width: 100%; display: flex; justify-content: space-between; gap: 6px; background: rgba(255, 255, 255, 0.06); border: 2px solid transparent;
    box-shadow: none; border-radius: 8px; color: #f2f6ff; padding: 7px 9px; margin-bottom: 3px; text-shadow: none; font-size: 0.9rem; text-align: left;
  }
  .voce:disabled { opacity: 0.5; }
  .giorni { font-size: 0.72rem; color: #c4cff0; }
  .prezzo { color: #ffe08a; white-space: nowrap; }
  .chiudi { align-self: center; margin-top: 6px; }
  input { margin: 4px 0 8px; }
</style>
