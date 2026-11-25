<script lang="ts" module>
  // Le icone del villaggio, disegnate tutte nello stesso modo (come gli adesivi dei giochi "cozy"):
  // forme piene e tonde, pochi colori caldi, contorno marrone spesso. Si leggono anche piccole,
  // e sono uguali su ogni telefono (le emoji invece cambiano da Android a iPhone).
  export type NomeIcona =
    | 'villaggio' | 'diario' | 'storia' | 'percorso' | 'altro'
    | 'costruisci' | 'arreda' | 'funghi' | 'gita' | 'piedi' | 'vola' | 'stella'
    | 'sposta' | 'accetta' | 'sentiero' | 'pala' | 'acqua' | 'fila' | 'aiuole' | 'cose' | 'castagna' | 'lucchetto';
</script>

<script lang="ts">
  let { nome, taglia = 28 }: { nome: NomeIcona; taglia?: number } = $props();
</script>

<svg class="icona" width={taglia} height={taglia} viewBox="0 0 24 24" aria-hidden="true"
  stroke="#3b2616" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
  {#if nome === 'villaggio'}
    <path d="M5 11.5 V20 H19 V11.5" fill="#fff3d6" />
    <path d="M2.5 12.5 L12 4 L21.5 12.5 Z" fill="#e2683a" />
    <path d="M10 20 V15.5 a2 2 0 0 1 4 0 V20" fill="#9a6a40" />
    <rect x="15.5" y="13.5" width="2.2" height="2.2" rx="0.4" fill="#9fd3f0" stroke-width="1.1" />
  {:else if nome === 'diario'}
    <path d="M5 4 H17 a2 2 0 0 1 2 2 V20 H7 a2 2 0 0 1 -2 -2 Z" fill="#e8803e" />
    <path d="M7 16 H19 V20 H7 a2 2 0 0 1 0 -4 Z" fill="#fff3d6" />
    <path d="M10 4 V10.5 L12 9 L14 10.5 V4" fill="#ffd166" stroke-width="1.2" />
  {:else if nome === 'storia'}
    <path d="M12 6.5 C9 4.5 5.5 4.5 3 5.5 V19 C5.5 18 9 18 12 20 C15 18 18.5 18 21 19 V5.5 C18.5 4.5 15 4.5 12 6.5 Z" fill="#fff3d6" />
    <path d="M12 6.5 V20" fill="none" />
    <path d="M5.5 9 C7 8.6 8.6 8.6 10 9.2 M5.5 12 C7 11.6 8.6 11.6 10 12.2 M14 9.2 C15.4 8.6 17 8.6 18.5 9" fill="none" stroke="#c49a6a" stroke-width="1.1" />
    <path d="M16.5 11 l0.7 1.5 1.6 0.2 -1.2 1.1 0.3 1.6 -1.4 -0.8 -1.4 0.8 0.3 -1.6 -1.2 -1.1 1.6 -0.2 Z" fill="#ffd166" stroke-width="0.9" />
  {:else if nome === 'percorso'}
    <path d="M1.8 20.5 L9 9.5 L12.5 14 L15.5 10 L22.2 20.5 Z" fill="#7cc070" />
    <path d="M9 9.5 L7 12.6 L8.6 12 L9.6 13 L10.6 11.6 Z" fill="#ffffff" stroke-width="1" />
    <path d="M15.5 10 V3" fill="none" />
    <path d="M15.5 3.3 L20.5 5.3 L15.5 7.3 Z" fill="#e2683a" />
    <path d="M5 20.5 C7 18.5 10 18.5 11 17 C12 15.5 14 15 15.5 13.5" fill="none" stroke="#fff3d6" stroke-width="1.2" stroke-dasharray="1.3 1.6" />
  {:else if nome === 'altro'}
    <path d="M10.3 2.8 h3.4 l0.5 2.4 a7 7 0 0 1 1.8 1 l2.3 -0.8 1.7 2.9 -1.8 1.6 a7 7 0 0 1 0 2.1 l1.8 1.6 -1.7 2.9 -2.3 -0.8 a7 7 0 0 1 -1.8 1 l-0.5 2.4 h-3.4 l-0.5 -2.4 a7 7 0 0 1 -1.8 -1 l-2.3 0.8 -1.7 -2.9 1.8 -1.6 a7 7 0 0 1 0 -2.1 l-1.8 -1.6 1.7 -2.9 2.3 0.8 a7 7 0 0 1 1.8 -1 Z" fill="#9fb4c8" />
    <circle cx="12" cy="12" r="2.8" fill="#fff3d6" />
  {:else if nome === 'costruisci'}
    <path d="M13.2 10.8 L5 19 a1.6 1.6 0 0 0 2.3 2.3 L15.5 13" fill="#c98a52" />
    <path d="M10.5 6.5 L14.5 2.8 a1 1 0 0 1 1.4 0 L21.2 8.1 a1 1 0 0 1 0 1.4 L17.5 13.5 a1 1 0 0 1 -1.4 0 L10.5 7.9 a1 1 0 0 1 0 -1.4 Z" fill="#aab4c4" />
    <path d="M12.5 5 L18.9 11.4" fill="none" stroke="#e8eef6" stroke-width="1" />
  {:else if nome === 'arreda'}
    <path d="M12 13 C12 9 9 6.5 5.5 6.5 C5.5 10 8 13 12 13 Z" fill="#6bb35a" />
    <path d="M12 12 C12 7.5 15 4 19 4 C19 8.5 16 12 12 12 Z" fill="#8fd16e" />
    <path d="M6.5 13 H17.5 L16 21 H8 Z" fill="#d8743e" />
    <path d="M6 13 H18" fill="none" stroke-width="2.2" />
  {:else if nome === 'funghi'}
    <path d="M9.5 13 H14.5 L15 19.5 a1.5 1.5 0 0 1 -1.5 1.5 h-3 a1.5 1.5 0 0 1 -1.5 -1.5 Z" fill="#fff3d6" />
    <path d="M3 13.5 C3 7.5 7 4 12 4 C17 4 21 7.5 21 13.5 Z" fill="#e04a3a" />
    <circle cx="8" cy="9.5" r="1.5" fill="#ffffff" stroke-width="1" />
    <circle cx="14.5" cy="7.5" r="1.2" fill="#ffffff" stroke-width="1" />
    <circle cx="16.5" cy="11" r="1" fill="#ffffff" stroke-width="1" />
  {:else if nome === 'gita'}
    <path d="M8.5 7 V5.5 a3.5 3.5 0 0 1 7 0 V7" fill="none" stroke-width="1.8" />
    <path d="M5 10 a3.5 3.5 0 0 1 3.5 -3.5 h7 A3.5 3.5 0 0 1 19 10 V19 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 Z" fill="#e8a23a" />
    <path d="M8 13.5 H16 V18 a1 1 0 0 1 -1 1 H9 a1 1 0 0 1 -1 -1 Z" fill="#c8842a" />
    <path d="M8 13.5 H16" fill="none" stroke-width="1.8" />
  {:else if nome === 'piedi'}
    <ellipse cx="8" cy="14" rx="2.6" ry="4" fill="#fff3d6" transform="rotate(-12 8 14)" />
    <circle cx="6.5" cy="8.3" r="1" fill="#fff3d6" stroke-width="1" /><circle cx="8.7" cy="7.8" r="0.95" fill="#fff3d6" stroke-width="1" /><circle cx="10.6" cy="8.6" r="0.85" fill="#fff3d6" stroke-width="1" />
    <ellipse cx="16" cy="11" rx="2.6" ry="4" fill="#fff3d6" transform="rotate(12 16 11)" />
    <circle cx="14" cy="5.6" r="0.85" fill="#fff3d6" stroke-width="1" /><circle cx="15.9" cy="4.8" r="0.95" fill="#fff3d6" stroke-width="1" /><circle cx="18" cy="5.3" r="1" fill="#fff3d6" stroke-width="1" />
  {:else if nome === 'vola'}
    <path d="M2.5 12 C6 7 9.5 7.5 12 11 C14.5 7.5 18 7 21.5 12 C18 11 15 12 12 15 C9 12 6 11 2.5 12 Z" fill="#3a3c4e" />
    <circle cx="12" cy="10.5" r="1.8" fill="#3a3c4e" />
    <path d="M12 12 L11 13.5 H13 Z" fill="#e0a040" stroke-width="0.8" />
  {:else if nome === 'stella'}
    <path d="M12 2.8 l2.6 5.6 6.1 0.7 -4.5 4.2 1.2 6 -5.4 -3 -5.4 3 1.2 -6 -4.5 -4.2 6.1 -0.7 Z" fill="#ffd166" />
    <path d="M9.5 9.5 l1.2 -0.2" fill="none" stroke="#fff8dc" stroke-width="1.2" />
  {:else if nome === 'sposta'}
    <path d="M8 12 V6 a1.5 1.5 0 0 1 3 0 V11 V4.5 a1.5 1.5 0 0 1 3 0 V11 V5.5 a1.5 1.5 0 0 1 3 0 V12 V8.5 a1.5 1.5 0 0 1 3 0 V14 a7 7 0 0 1 -7 7 h-1 a6 6 0 0 1 -5 -2.7 L3.6 14.6 a1.6 1.6 0 0 1 2.6 -1.8 Z" fill="#ffd9a8" />
  {:else if nome === 'accetta'}
    <path d="M13 8 L5.5 20.5" fill="none" stroke="#3b2616" stroke-width="3.6" />
    <path d="M13 8 L5.5 20.5" fill="none" stroke="#c98a52" stroke-width="1.8" />
    <path d="M11.5 4 C14 2 18.5 2.5 21 5.5 C19 8 17.5 10.5 17 13 C15 11 12.5 9.5 10 9.2 Z" fill="#aab4c4" />
    <path d="M18 4.5 C19 5 20 5.6 20.6 6.3" fill="none" stroke="#e8eef6" stroke-width="1" />
  {:else if nome === 'sentiero'}
    <path d="M7 21 C8 16 13 15.5 12 11 C11 7.5 14 5 17 3" fill="none" stroke="#c9a46c" stroke-width="6" />
    <ellipse cx="8.2" cy="18.5" rx="2.3" ry="1.6" fill="#d8d2c4" />
    <ellipse cx="12.2" cy="13.5" rx="2.2" ry="1.5" fill="#d8d2c4" />
    <ellipse cx="13.4" cy="7.8" rx="2" ry="1.4" fill="#d8d2c4" />
    <ellipse cx="16.8" cy="3.8" rx="1.6" ry="1.1" fill="#d8d2c4" />
  {:else if nome === 'pala'}
    <path d="M15 3 L9.5 13" fill="none" stroke="#3b2616" stroke-width="3.4" />
    <path d="M15 3 L9.5 13" fill="none" stroke="#c98a52" stroke-width="1.6" />
    <path d="M13.5 2.5 H17.5" fill="none" stroke-width="2" />
    <path d="M8 11.5 L12.5 14 L10 19.5 C9 21.5 6 21.5 4.5 20 C3.5 18.5 4.5 15 8 11.5 Z" fill="#aab4c4" />
  {:else if nome === 'acqua'}
    <path d="M12 2.8 C15 7 18.5 10.5 18.5 14.5 a6.5 6.5 0 0 1 -13 0 C5.5 10.5 9 7 12 2.8 Z" fill="#6cc0ef" />
    <path d="M9 14.5 a3 3 0 0 0 2.5 3" fill="none" stroke="#e6f6ff" stroke-width="1.4" />
  {:else if nome === 'fila'}
    <path d="M5 6 V21 M12 6 V21 M19 6 V21" fill="none" stroke="#3b2616" stroke-width="3.6" />
    <path d="M5 6.5 V21 M12 6.5 V21 M19 6.5 V21" fill="none" stroke="#e8c48e" stroke-width="1.8" />
    <path d="M3 9.5 H21 V12.5 H3 Z M3 15 H21 V18 H3 Z" fill="#c98a52" />
    <path d="M5 4 L6.2 6 H3.8 Z M12 4 L13.2 6 H10.8 Z M19 4 L20.2 6 H17.8 Z" fill="#e8c48e" stroke-width="1.1" />
  {:else if nome === 'aiuole'}
    <path d="M12 15 V10" fill="none" stroke-width="1.8" />
    <path d="M12 11 C12 8 10 6 7 6 C7 9 9 11 12 11 Z" fill="#8fd16e" />
    <path d="M12 9.5 C12 6.5 14 4 17 4 C17 7 15 9.5 12 9.5 Z" fill="#6bb35a" />
    <path d="M3 15 H21 L19.5 20 a1.5 1.5 0 0 1 -1.4 1 H5.9 a1.5 1.5 0 0 1 -1.4 -1 Z" fill="#9a6a40" />
    <circle cx="8" cy="17.5" r="0.7" fill="#3b2616" stroke="none" /><circle cx="12" cy="18.3" r="0.7" fill="#3b2616" stroke="none" /><circle cx="16" cy="17.5" r="0.7" fill="#3b2616" stroke="none" />
  {:else if nome === 'cose'}
    <path d="M12 11 V21.5" fill="none" stroke="#3b2616" stroke-width="3.4" />
    <path d="M12 11 V21.5" fill="none" stroke="#c98a52" stroke-width="1.6" />
    <path d="M4 4 H17.5 L20.5 7.5 L17.5 11 H4 a1 1 0 0 1 -1 -1 V5 a1 1 0 0 1 1 -1 Z" fill="#e8c48e" />
    <path d="M6 7.5 H15" fill="none" stroke="#9a6a40" stroke-width="1.4" />
  {:else if nome === 'castagna'}
    <path d="M12 4 C17 4 20.5 8.5 20.5 13 C20.5 17.5 16.5 20.5 12 20.5 C7.5 20.5 3.5 17.5 3.5 13 C3.5 8.5 7 4 12 4 Z" fill="#9a5a2a" />
    <path d="M4.2 15 C6 17.5 18 17.5 19.8 15 C19.6 19 15.5 20.5 12 20.5 C8.5 20.5 4.4 19 4.2 15 Z" fill="#e8c48e" stroke-width="1.2" />
    <path d="M9 7.5 C10 6.6 11.4 6.3 12.5 6.4" fill="none" stroke="#d29a6a" stroke-width="1.2" />
  {:else if nome === 'lucchetto'}
    <path d="M8 10.5 V8 a4 4 0 0 1 8 0 V10.5" fill="none" stroke-width="2" />
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#ffd166" />
    <circle cx="12" cy="15" r="1.4" fill="#3b2616" stroke="none" />
  {/if}
</svg>

<style>
  .icona { display: block; flex: none; overflow: visible; filter: drop-shadow(0 1.5px 0 rgba(59, 38, 22, 0.25)); }
</style>
