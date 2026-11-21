<script lang="ts">
  // Guida "metti il villaggio sul telefono": icona nella schermata Home, come un'app.
  // Mostra i passi giusti per iPhone, Android o per i link aperti dentro WhatsApp & co.
  import { onMount } from 'svelte';
  import Corvo from './Corvo.svelte';
  import { app, dataDiOggi, esportaCopia, segnaBackupFatto } from '../lib/app.svelte';
  import { scaricaFile } from '../lib/copia';
  import { doveSiamo, installaConUnTocco, puoInstallareConUnTocco, quandoCambiaInstallazione } from '../lib/telefono';

  let { onfatto, piccola = false }: { onfatto?: () => void; piccola?: boolean } = $props();

  const dove = doveSiamo();
  let unTocco = $state(puoInstallareConUnTocco());
  let installata = $state(false);
  let copiato = $state(false);
  let copiaFatta = $state(false);
  const indirizzo = location.href.split(/[?#]/)[0];

  onMount(() => quandoCambiaInstallazione(() => (unTocco = puoInstallareConUnTocco())));

  async function installa() {
    installata = await installaConUnTocco();
  }

  async function copiaLink() {
    try {
      await navigator.clipboard.writeText(indirizzo);
      copiato = true;
    } catch {
      prompt('Copia questo indirizzo:', indirizzo);
    }
  }

  async function salvaCopia() {
    scaricaFile(`villaggio-di-giada_${dataDiOggi()}.json`, JSON.stringify(esportaCopia(), null, 1));
    await segnaBackupFatto();
    copiaFatta = true;
  }
</script>

<div class="guida" class:piccola>
  {#if dove === 'app'}
    <Corvo testo="Sei già entrata dall'icona: il villaggio ti aspetta qui ogni volta, anche senza internet." piccolo />
  {:else if dove === 'dentro-app'}
    <Corvo testo="Questo link si è aperto dentro un'altra app. Qui il bosco può dimenticarsi di te: apriamolo nel browser vero." piccolo={piccola} />
    <ol class="passi">
      <li><span class="tasto">⋯</span> <span>Tocca i tre puntini, in alto o in basso.</span></li>
      <li><span class="tasto">↗</span> <span>Scegli <b>Apri in Safari</b> oppure <b>Apri nel browser</b>.</span></li>
      <li><span class="tasto">🦊</span> <span>Lì ti mostro come mettere l'icona.</span></li>
    </ol>
    <button class="secondario largo" onclick={copiaLink}>{copiato ? 'Link copiato!' : 'Copia il link'}</button>
  {:else if dove === 'iphone'}
    <Corvo testo="Mettiamo il villaggio sul tuo telefono, con la sua icona: così lo ritrovi sempre con un tocco, come un'app." piccolo={piccola} />
    <ol class="passi">
      <li>
        <span class="tasto"><svg viewBox="0 0 24 24"><path d="M8 9 H6 V21 H18 V9 H16 M12 3 V14 M8.5 6.5 L12 3 L15.5 6.5" /></svg></span> <span>Tocca <b>Condividi</b>, il quadratino con la freccia. Se non lo vedi, è dentro <b>⋯</b>.</span></li>
      <li>
        <span class="tasto"><svg viewBox="0 0 24 24"><path d="M5 5 H19 V19 H5 Z M12 8.5 V15.5 M8.5 12 H15.5" /></svg></span> <span>Scorri un po' e tocca <b>Aggiungi alla schermata Home</b>.</span></li>
      <li><span class="tasto">✓</span> <span>Tocca <b>Aggiungi</b>. Arriva la volpetta tra le tue app!</span></li>
    </ol>
    <p class="nota">Da quel momento entra sempre dalla volpetta: è lì che il villaggio resta.</p>
    {#if app.stato}
      <div class="avviso">
        <p>Sull'iPhone l'icona ha un villaggio tutto suo. Per portarti dietro questo:</p>
        <ol>
          <li>salva una copia qui sotto;</li>
          <li>apri il villaggio dalla volpetta;</li>
          <li>in <b>Altro</b> tocca <b>Ripristina da una copia</b> e scegli il file.</li>
        </ol>
        <button class="secondario largo" onclick={salvaCopia}>{copiaFatta ? 'Copia salvata nei File' : 'Salva una copia'}</button>
      </div>
    {/if}
  {:else if dove === 'android'}
    <Corvo testo="Mettiamo il villaggio sul tuo telefono, con la sua icona: così lo ritrovi sempre con un tocco, come un'app." piccolo={piccola} />
    {#if installata}
      <p class="nota">Fatto! Ora trovi la volpetta tra le tue app.</p>
    {:else if unTocco}
      <button class="largo grande" onclick={installa}>Metti l'icona sul telefono</button>
    {:else}
      <ol class="passi">
        <li><span class="tasto">⋮</span> <span>Tocca i tre puntini in alto a destra.</span></li>
        <li><span class="tasto">＋</span> <span>Tocca <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.</span></li>
        <li><span class="tasto">✓</span> <span>Conferma. Arriva la volpetta tra le tue app!</span></li>
      </ol>
    {/if}
    <p class="nota">Da quel momento entra sempre dalla volpetta.</p>
  {:else}
    <Corvo testo="Il villaggio è fatto per il telefono: aprilo lì e ti mostro come mettere l'icona." piccolo />
  {/if}

  {#if onfatto}
    <button class="largo" onclick={onfatto}>{dove === 'app' || installata ? 'Andiamo' : 'Fatto, oppure più tardi'}</button>
  {/if}
</div>

<style>
  .passi { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 10px; }
  .passi li { display: flex; gap: 12px; align-items: center; background: var(--panna); border: var(--bordo); border-radius: 16px; padding: 10px 12px; box-shadow: 0 3px 0 var(--legno-scuro); }
  .tasto { flex: none; width: 42px; height: 42px; border-radius: 12px; background: #fff; border: 3px solid var(--legno); display: grid; place-items: center; font-size: 1.3rem; font-weight: 900; color: #2f7de1; }
  .tasto svg { width: 26px; height: 26px; fill: none; stroke: #2f7de1; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .nota { text-align: center; font-weight: 800; }
  .avviso { background: #fff3c4; border: 3px dashed var(--legno); border-radius: 16px; padding: 12px; margin-bottom: 14px; font-size: 0.95rem; }
  .avviso ol { margin: 0 0 10px; padding-left: 20px; }
  .grande { font-size: 1.15rem; padding: 16px 20px; margin-bottom: 12px; }
  button + button { margin-top: 10px; }
  .guida > button.largo:last-child { margin-top: 14px; }
</style>
