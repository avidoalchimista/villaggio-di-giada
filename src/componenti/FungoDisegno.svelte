<script lang="ts">
  // Il disegnino di un fungo (per il cestino e la sala del museo): la forma e i colori della sua specie.
  import type { DefFungo } from '../lib/funghi';
  let { f, ombra = false }: { f: DefFungo; ombra?: boolean } = $props();
  // per i posti vuoti del museo: solo la sagoma scura
  let cap = $derived(ombra ? '#4a3a2a' : f.cappello);
  let gam = $derived(ombra ? '#5a4a3a' : f.gambo);
</script>

<svg viewBox="0 0 48 48" class="fungo" aria-hidden="true">
  {#if f.forma === 'porcino'}
    <ellipse cx="24" cy="36" rx="9" ry="10" fill={gam} stroke="#3b2616" stroke-width="2" />
    <path d="M6 24 Q24 2 42 24 Q24 30 6 24 Z" fill={cap} stroke="#3b2616" stroke-width="2" />
  {:else if f.forma === 'imbuto'}
    <path d="M8 12 Q24 20 40 12 L28 42 L20 42 Z" fill={cap} stroke="#3b2616" stroke-width="2" />
  {:else if f.forma === 'gruppetto'}
    {#each [[14, 0.8], [24, 1], [34, 0.85]] as [x, k]}
      <rect x={x - 2} y={44 - 26 * k} width="4" height={26 * k} fill={gam} stroke="#3b2616" stroke-width="1.5" />
      <ellipse cx={x} cy={44 - 26 * k} rx={8 * k} ry={5 * k} fill={cap} stroke="#3b2616" stroke-width="1.5" />
    {/each}
  {:else if f.forma === 'mazza'}
    <rect x="22" y="16" width="4" height="30" fill={gam} stroke="#3b2616" stroke-width="2" />
    <path d="M4 20 L24 4 L44 20 Z" fill={cap} stroke="#3b2616" stroke-width="2" />
  {:else if f.forma === 'spugna'}
    <rect x="18" y="32" width="12" height="12" fill={gam} stroke="#3b2616" stroke-width="2" />
    <ellipse cx="24" cy="20" rx="10" ry="15" fill={cap} stroke="#3b2616" stroke-width="2" />
    {#if !ombra}{#each [[20, 14], [28, 16], [22, 24], [27, 27], [24, 9]] as [x, y]}<circle cx={x} cy={y} r="2" fill="#5a4020" />{/each}{/if}
  {:else if f.forma === 'mensola' || f.forma === 'orecchio'}
    <rect x="4" y="4" width="10" height="42" fill={ombra ? '#4a3a2a' : '#7a5a3a'} stroke="#3b2616" stroke-width="2" />
    <path d="M14 14 Q40 12 42 20 Q30 24 14 22 Z" fill={cap} stroke="#3b2616" stroke-width="2" />
    {#if f.forma === 'mensola'}<path d="M14 28 Q36 26 38 34 Q28 37 14 36 Z" fill={cap} stroke="#3b2616" stroke-width="2" />{/if}
  {:else if f.forma === 'tartufo'}
    <path d="M4 44 L44 44" stroke="#6a4a2a" stroke-width="3" />
    <ellipse cx="24" cy="32" rx="13" ry="11" fill={cap} stroke="#3b2616" stroke-width="2" />
  {:else if f.forma === 'gabbia'}
    <path d="M8 40 Q24 -4 40 40" fill="none" stroke={cap} stroke-width="4" />
    <path d="M14 40 Q24 8 34 40 M4 30 Q24 18 44 30" fill="none" stroke={cap} stroke-width="4" />
  {:else if f.forma === 'corallo'}
    <path d="M24 44 L24 26 M24 30 L14 14 M24 30 L34 12 M14 22 L8 10 M34 22 L42 14 M24 26 L22 8" stroke={cap} stroke-width="4" stroke-linecap="round" fill="none" />
  {:else if f.forma === 'palla'}
    <ellipse cx="24" cy="30" rx="13" ry="13" fill={cap} stroke="#3b2616" stroke-width="2" />
    {#if !ombra}{#each [[20, 24], [28, 22], [24, 30], [18, 32], [30, 32]] as [x, y]}<circle cx={x} cy={y} r="1.3" fill="#b8ac90" />{/each}{/if}
  {:else}
    <rect x="20" y="22" width="8" height="22" fill={gam} stroke="#3b2616" stroke-width="2" />
    <path d="M4 26 Q24 0 44 26 Z" fill={cap} stroke="#3b2616" stroke-width="2" />
    {#if f.pois && !ombra}{#each [[16, 18], [26, 12], [32, 20], [22, 22]] as [x, y]}<circle cx={x} cy={y} r="2.2" fill="#ffffff" />{/each}{/if}
  {/if}
</svg>

<style>
  .fungo { width: 40px; height: 40px; flex: none; }
</style>
