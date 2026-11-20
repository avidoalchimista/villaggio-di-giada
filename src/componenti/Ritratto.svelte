<script lang="ts">
  // Segnaposto delle illustrazioni. Quando arrivano i disegni veri, basta mettere i file in
  // public/img/<specie>_<fase>.webp (e <specie>_<mestiere>.webp): vengono usati al posto del disegno provvisorio.
  import type { Animale } from '../lib/tipi';
  import { COLORE_VIRTU } from '../lib/etichette';
  import { REGOLE } from '../lib/gioco';

  let { animale, taglia = 120 }: { animale: Animale; taglia?: number } = $props();

  let colore = $derived(COLORE_VIRTU[REGOLE.specieVirtu[animale.specie]]);
  let scala = $derived(({ uovo: 0.7, cucciolo: 0.62, giovane: 0.8, adulto: 0.95, maestro: 1 } as const)[animale.fase]);
  let immagine = $derived(animale.mestiere ? `./img/${animale.specie}_${animale.mestiere}.webp` : `./img/${animale.specie}_${animale.fase}.webp`);
  let caricata = $state(false);
  $effect(() => { immagine; caricata = false; });

  const orecchie: Record<string, string> = {
    volpe: 'M28 40 L36 10 L50 34 M72 40 L64 10 L50 34',
    daino: 'M30 34 L16 18 M70 34 L84 18 M34 26 L30 4 M34 16 L24 10 M66 26 L70 4 M66 16 L76 10',
    tasso: 'M30 34 Q28 22 38 26 M70 34 Q72 22 62 26',
    riccio: 'M20 50 L10 40 L24 38 L18 26 L32 30 L34 16 L44 26 L50 12 L56 26 L66 16 L68 30 L82 26 L76 38 L90 40 L80 50',
    scoiattolo: 'M32 32 L30 14 L40 28 M68 32 L70 14 L60 28',
    lepre: 'M38 34 Q30 0 40 2 Q46 6 44 34 M62 34 Q70 0 60 2 Q54 6 56 34',
  };
</script>

<img src={immagine} alt="" width={taglia} height={taglia} style:display={caricata ? 'block' : 'none'} onload={() => (caricata = true)} onerror={() => (caricata = false)} />
{#if !caricata}
  <svg viewBox="0 0 100 100" width={taglia} height={taglia} class:dorme={animale.addormentato} aria-label={animale.specie}>
    <defs>
      <pattern id="tratteggio-{animale.id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#191512" stroke-width="1" opacity="0.25" />
      </pattern>
    </defs>
    {#if animale.fase === 'uovo'}
      <ellipse cx="50" cy="56" rx="26" ry="34" fill="#f4ecdc" stroke="#191512" stroke-width="3" />
      <ellipse cx="50" cy="56" rx="26" ry="34" fill="url(#tratteggio-{animale.id})" />
      <path d="M30 50 Q40 44 50 52 Q60 60 70 50" fill="none" stroke={colore} stroke-width="5" stroke-linecap="round" />
      <circle cx="40" cy="70" r="4" fill={colore} /><circle cx="60" cy="74" r="3" fill={colore} />
    {:else}
      <g transform="translate(50 56) scale({scala}) translate(-50 -56)">
        <path d={orecchie[animale.specie]} fill={colore} stroke="#191512" stroke-width="3" stroke-linejoin="round" />
        <ellipse cx="50" cy="56" rx="30" ry="28" fill={colore} stroke="#191512" stroke-width="3" />
        <ellipse cx="50" cy="56" rx="30" ry="28" fill="url(#tratteggio-{animale.id})" />
        <ellipse cx="50" cy="68" rx="16" ry="11" fill="#f4ecdc" stroke="#191512" stroke-width="2" />
        {#if animale.addormentato}
          <path d="M36 52 Q40 56 44 52 M56 52 Q60 56 64 52" fill="none" stroke="#191512" stroke-width="2.5" stroke-linecap="round" />
        {:else}
          <circle cx="40" cy="52" r="4" fill="#191512" /><circle cx="60" cy="52" r="4" fill="#191512" />
          <circle cx="41.5" cy="50.5" r="1.3" fill="#fff" /><circle cx="61.5" cy="50.5" r="1.3" fill="#fff" />
        {/if}
        <ellipse cx="50" cy="63" rx="4" ry="3" fill="#191512" />
      </g>
      {#if animale.addormentato}
        <text x="74" y="26" font-family="Georgia" font-size="16" fill="#191512">z</text>
        <text x="84" y="16" font-family="Georgia" font-size="12" fill="#191512">z</text>
      {/if}
    {/if}
  </svg>
{/if}

<style>
  svg, img { margin: 0 auto; }
  svg { display: block; }
  img { object-fit: contain; }
  .dorme { opacity: 0.75; filter: saturate(0.5); }
</style>
