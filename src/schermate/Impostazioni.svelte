<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import GuidaIcona from '../componenti/GuidaIcona.svelte';
  import { app, vai, avantiConDiario, avanzaGiorni, azzeraTutto, crescitaDiProva, esciDallaProva, provaSentiero, provaFestaDiCompleanno, regalaCastagne, dataDiOggi, esportaCopia, impostaAudio, rinominaVillaggio, ripristina, segnaBackupFatto } from '../lib/app.svelte';
  import { scaricaFile } from '../lib/copia';
  import { giorniTra } from '../lib/date';

  let nome = $state(app.stato!.nomeVillaggio);
  let messaggio = $state('');
  let rinomina = $state(false);
  let s = $derived(app.stato!);
  let giorni = $derived(giorniTra(s.inizio, dataDiOggi()) + 1);
  let tesori = $derived([
    { icona: '🗓️', n: giorni, nome: giorni === 1 ? 'giorno nel bosco' : 'giorni nel bosco' },
    { icona: '📖', n: app.voci.length, nome: app.voci.length === 1 ? 'pagina' : 'pagine' },
    { icona: '🐾', n: s.animali.length, nome: s.animali.length === 1 ? 'abitante' : 'abitanti' },
    { icona: '🔨', n: s.costruzioni.length + s.edifici.length, nome: 'costruiti' },
    { icona: '🌰', n: s.ghiande, nome: 'castagne' },
    { icona: '📜', n: s.capitoli.length, nome: s.capitoli.length === 1 ? 'capitolo' : 'capitoli' },
  ]);

  async function salvaNome() {
    if (!nome.trim()) return;
    await rinominaVillaggio(nome);
    rinomina = false;
  }

  let simulando = $state(false);
  async function avanti(n: number) {
    simulando = true;
    const r = await avantiConDiario(n);
    simulando = false;
    messaggio = `Passati ${n} giorni con ${r.pagine} pagine di diario: ${r.eventi} novità. Torna al villaggio!`;
  }

  async function salvaCopia() {
    const c = esportaCopia();
    scaricaFile(`villaggio-di-giada_${dataDiOggi()}.json`, JSON.stringify(c, null, 1));
    await segnaBackupFatto();
    messaggio = 'Copia salvata nei Download. Tienila al sicuro: dentro c\'è anche il diario.';
  }

  async function caricaCopia(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!confirm('Il villaggio di adesso verrà sostituito da quello della copia. Continuo?')) return;
    try {
      await ripristina(await file.text());
    } catch (err) {
      messaggio = (err as Error).message;
    }
  }
</script>

<div class="pagina">
  <header class="insegna appare">
    <div class="paletti" aria-hidden="true"></div>
    {#if rinomina}
      <div class="tavola">
        <input type="text" bind:value={nome} maxlength="40" aria-label="Nome del villaggio" />
        <div class="riga" style="margin-top:10px">
          <button class="secondario tondo" onclick={() => { nome = s.nomeVillaggio; rinomina = false; }}>Annulla</button>
          <button class="tondo" style="flex:1" disabled={!nome.trim()} onclick={salvaNome}>Salva il nome</button>
        </div>
      </div>
    {:else}
      <button class="tavola" onclick={() => (rinomina = true)} aria-label="Cambia il nome del villaggio">
        <span class="piccolo">Il tuo villaggio</span>
        <h1>{s.nomeVillaggio}</h1>
        <span class="matita">✏️ cambia nome</span>
      </button>
    {/if}
  </header>

  <div class="tesori">
    {#each tesori as t, i}
      <div class="tesoro appare" style:animation-delay="{i * 50}ms">
        <span class="icona">{t.icona}</span>
        <strong>{t.n}</strong>
        <span class="nome">{t.nome}</span>
      </div>
    {/each}
  </div>

  <div class="vignetta">
    <span class="didascalia">Suoni</span>
    <button class="interruttore" role="switch" aria-checked={app.audio} onclick={() => impostaAudio(!app.audio)}>
      <span>🎙️ Voce del corvo</span>
      <span class="levetta" class:acceso={app.audio}><span></span></span>
    </button>
  </div>

  <button class="largo" style="margin-bottom:22px" onclick={() => vai('guida')}>📘 Come si gioca</button>

  <div class="vignetta">
    <span class="didascalia">Icona sul telefono</span>
    <GuidaIcona piccola />
    <p class="tenue centro" style="margin:10px 0 0">{app.datiAlSicuro ? 'Il telefono ha promesso di custodire il villaggio.' : 'Il villaggio è salvato su questo telefono.'}</p>
  </div>

  <div class="vignetta">
    <span class="didascalia">Copia di sicurezza</span>
    <Corvo testo="Tutto resta sul tuo telefono. Con una copia puoi portarti il villaggio su un telefono nuovo." piccolo />
    <button class="largo" onclick={salvaCopia}>💾 Salva una copia</button>
    <label class="bottone secondario largo carica">
      Ripristina da una copia
      <input type="file" accept="application/json,.json" onchange={caricaCopia} hidden />
    </label>
    {#if messaggio}<p class="avviso appare">{messaggio}</p>{/if}
  </div>

  <p class="versione">Il villaggio di Giada · versione 0.1</p>

  <!-- pannello prove: si accende solo aprendo il sito con ?prova (vedi LEGGIMI) -->
  {#if app.prova}
    <div class="finestra-gioco appare">
      <div class="testata">MODALITÀ SVILUPPATORE</div>
      <p>Data simulata: {dataDiOggi()} (spostata di {app.offsetGiorni} giorni)</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario tondo" onclick={() => avanzaGiorni(1)}>+1 giorno</button>
        <button class="secondario tondo" onclick={() => avanzaGiorni(7)}>+7</button>
        <button class="secondario tondo" onclick={() => avanzaGiorni(30)}>+30</button>
      </div>
      <p style="margin-top:12px">Avanti veloce come se Giada scrivesse quasi ogni giorno (pagine finte, si vedono nel diario):</p>
      <div class="riga" style="flex-wrap:wrap">
        {#each [7, 30, 90, 365] as n}
          <button class="secondario tondo" disabled={simulando} onclick={() => avanti(n)}>+{n} giorni con diario</button>
        {/each}
      </div>
      <p style="margin-top:12px">Per vedere subito gli animali grandi (solo per le prove: prima del regalo si azzera tutto):</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario tondo" onclick={async () => { await crescitaDiProva(); messaggio = 'Tutti sono cresciuti di una fase. Torna al villaggio!'; }}>Fai crescere tutti</button>
        <button class="secondario tondo" onclick={async () => { await regalaCastagne(100); messaggio = '100 castagne in più per le prove.'; }}>+100 castagne</button>
      </div>
      <p style="margin-top:12px">Il 24 luglio il villaggio fa una festa per il compleanno di Giada. Per vederla adesso:</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario tondo" onclick={provaFestaDiCompleanno}>🎂 Prova la festa di compleanno</button>
      </div>
      <p style="margin-top:12px">Il castoro trova un sentiero verso un posto lontano ogni mese o due. Per farglielo trovare adesso (serve che il castoro sia già arrivato):</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario tondo" onclick={async () => { if (await provaSentiero()) vai('villaggio'); else messaggio = 'Il castoro non è ancora arrivato (arriva dopo 10 giorni), oppure ha già trovato tutti i sentieri.'; }}>🦫 Trova un sentiero</button>
      </div>
      <p style="margin-top:12px"><button class="tondo" onclick={() => confirm('Cancello TUTTO il villaggio e il diario da questo telefono?') && azzeraTutto()}>Azzera tutto</button></p>
      <p style="margin-top:12px"><button class="secondario tondo" onclick={esciDallaProva}>Nascondi questo pannello</button></p>
    </div>
  {/if}
</div>

<style>
  /* insegna di legno col nome del villaggio */
  .insegna { position: relative; padding-top: 6px; margin-bottom: 18px; }
  .paletti {
    position: absolute; top: 0; bottom: -10px; left: 18%; right: 18%; z-index: 0;
    background: linear-gradient(90deg, var(--legno-scuro) 0 14px, transparent 14px calc(100% - 14px), var(--legno-scuro) calc(100% - 14px));
  }
  .tavola {
    position: relative; z-index: 1; display: block; width: 100%; text-align: center; padding: 14px 16px 12px;
    background: repeating-linear-gradient(0deg, #9a6840 0 22px, #8a5a36 22px 24px); color: #fff8e7;
    border: 4px solid var(--legno-scuro); border-radius: 14px; box-shadow: 0 6px 0 var(--legno-scuro), 0 10px 20px rgba(0, 0, 0, 0.2);
    text-shadow: 0 2px 0 var(--legno-scuro);
  }
  button.tavola:active { transform: translateY(4px); }
  .tavola h1 { color: #fff8e7; margin: 0; font-size: 1.8rem; overflow-wrap: anywhere; }
  .tavola .piccolo { font-size: 0.85rem; opacity: 0.85; }
  .tavola .matita { display: block; font-size: 0.8rem; margin-top: 4px; opacity: 0.85; }
  .tavola input { text-align: center; font-size: 1.2rem; }

  .tesori { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 26px; }
  .tesoro {
    background: var(--panna); border: 3px solid var(--legno); border-radius: 16px; box-shadow: 0 4px 0 var(--legno-scuro);
    display: flex; flex-direction: column; align-items: center; padding: 8px 4px 6px; text-align: center;
  }
  .tesoro .icona { font-size: 1.4rem; line-height: 1.2; }
  .tesoro strong { font-size: 1.3rem; font-weight: 900; color: var(--legno-scuro); line-height: 1.1; }
  .tesoro .nome { font-size: 0.72rem; color: var(--testo-tenue); font-weight: 800; line-height: 1.2; }

  .interruttore {
    display: flex; justify-content: space-between; align-items: center; width: 100%; background: transparent; border: none; box-shadow: none;
    color: var(--inchiostro); text-shadow: none; padding: 4px 0; font-weight: 800;
  }
  .interruttore:active { transform: none; box-shadow: none; }
  .levetta { width: 56px; height: 32px; border-radius: 999px; background: var(--panna-2); border: 3px solid var(--legno); position: relative; transition: background 0.2s; }
  .levetta span { position: absolute; top: 2px; left: 2px; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2px solid var(--legno); transition: left 0.2s cubic-bezier(0.2, 1.6, 0.4, 1); }
  .levetta.acceso { background: var(--foglia); }
  .levetta.acceso span { left: 26px; }

  .carica { display: block; text-align: center; margin-top: 12px; }
  .carica.secondario { background: var(--panna-2); color: var(--inchiostro); text-shadow: none; }
  .avviso { margin: 12px 0 0; background: #fff; border: 2px dashed var(--foglia-scura); border-radius: 12px; padding: 8px 12px; font-size: 0.9rem; }
  .versione { margin-top: 18px; text-align: center; font-size: 0.85rem; font-weight: 800; color: var(--testo-tenue); }

  .finestra-gioco {
    background: linear-gradient(180deg, rgba(34, 52, 112, 0.96), rgba(18, 28, 70, 0.98));
    border: 3px solid #d8e4ff; outline: 3px solid #1a2350; border-radius: 14px; color: #f2f6ff; padding: 12px 14px 4px; margin: 10px 3px;
  }
  .finestra-gioco .testata { font-weight: 900; letter-spacing: 0.08em; border-bottom: 2px solid rgba(216, 228, 255, 0.4); padding-bottom: 8px; margin-bottom: 8px; }
</style>
