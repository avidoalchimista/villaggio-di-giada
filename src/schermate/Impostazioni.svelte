<script lang="ts">
  import Corvo from '../componenti/Corvo.svelte';
  import { app, avanzaGiorni, azzeraTutto, crescitaDiProva, esciDallaProva, regalaCastagne, dataDiOggi, esportaCopia, impostaAudio, rinominaVillaggio, ripristina, segnaBackupFatto } from '../lib/app.svelte';
  import { scaricaFile } from '../lib/copia';

  let nome = $state(app.stato!.nomeVillaggio);
  let messaggio = $state('');

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
  <h1>Impostazioni</h1>

  <div class="vignetta">
    <span class="didascalia">Il villaggio</span>
    <div class="riga">
      <input type="text" bind:value={nome} maxlength="40" />
      <button onclick={() => rinominaVillaggio(nome)}>Salva</button>
    </div>
  </div>

  <div class="vignetta">
    <span class="didascalia">Voce del corvo</span>
    <label class="riga"><input type="checkbox" checked={app.audio} onchange={(e) => impostaAudio(e.currentTarget.checked)} /> Ascolta le registrazioni</label>
  </div>

  <div class="vignetta">
    <span class="didascalia">Copia di sicurezza</span>
    <Corvo testo="Tutto resta sul tuo telefono. Con una copia puoi portarti il villaggio su un telefono nuovo." piccolo />
    <button class="largo" onclick={salvaCopia}>Salva una copia</button>
    <label class="bottone secondario largo carica">
      Ripristina da una copia
      <input type="file" accept="application/json,.json" onchange={caricaCopia} hidden />
    </label>
    {#if messaggio}<p class="tenue" style="margin-top:10px">{messaggio}</p>{/if}
  </div>

  <p class="tenue versione">Il villaggio di Giada · versione 0.1</p>

  <!-- pannello prove: si accende solo aprendo il sito con ?prova (vedi LEGGIMI) -->
  {#if app.prova}
    <div class="vignetta scura">
      <span class="didascalia">Modalità sviluppatore</span>
      <p>Data simulata: {dataDiOggi()} (spostata di {app.offsetGiorni} giorni)</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario" onclick={() => avanzaGiorni(1)}>+1 giorno</button>
        <button class="secondario" onclick={() => avanzaGiorni(7)}>+7</button>
        <button class="secondario" onclick={() => avanzaGiorni(30)}>+30</button>
      </div>
      <p style="margin-top:12px">Per vedere subito gli animali grandi (solo per le prove: prima del regalo si azzera tutto):</p>
      <div class="riga" style="flex-wrap:wrap">
        <button class="secondario" onclick={async () => { await crescitaDiProva(); messaggio = 'Tutti sono cresciuti di una fase. Torna al villaggio!'; }}>Fai crescere tutti</button>
        <button class="secondario" onclick={async () => { await regalaCastagne(100); messaggio = '100 castagne in più per le prove.'; }}>+100 castagne</button>
      </div>
      <p style="margin-top:12px"><button onclick={() => confirm('Cancello TUTTO il villaggio e il diario da questo telefono?') && azzeraTutto()}>Azzera tutto</button></p>
      <p style="margin-top:12px"><button class="secondario" onclick={esciDallaProva}>Nascondi questo pannello</button></p>
    </div>
  {/if}
</div>

<style>
  .carica { display: block; text-align: center; margin-top: 10px; }
  .versione { margin-top: 30px; text-align: center; }
</style>
