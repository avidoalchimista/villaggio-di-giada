<!-- Il corvo guida, versione disegnata: zampe, ali, coda, volume con sfumature e tratteggio a inchiostro.
     Resta un segnaposto vettoriale finché non arriva l'illustrazione definitiva (public/img/corvo.webp). -->
<svg viewBox="0 0 160 200" aria-label="Il corvo" class="corvo-disegno">
  <defs>
    <radialGradient id="cv-corpo" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="#4a4f5c" />
      <stop offset="0.45" stop-color="#262830" />
      <stop offset="1" stop-color="#0d0d10" />
    </radialGradient>
    <radialGradient id="cv-testa" cx="35%" cy="30%" r="70%">
      <stop offset="0" stop-color="#555b69" />
      <stop offset="0.5" stop-color="#2a2c34" />
      <stop offset="1" stop-color="#0f0f12" />
    </radialGradient>
    <linearGradient id="cv-ala" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b3f4c" />
      <stop offset="1" stop-color="#101014" />
    </linearGradient>
    <linearGradient id="cv-becco" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5f6b" />
      <stop offset="0.5" stop-color="#2b2d33" />
      <stop offset="1" stop-color="#121215" />
    </linearGradient>
    <linearGradient id="cv-cappello" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8a6a48" />
      <stop offset="0.6" stop-color="#5c4632" />
      <stop offset="1" stop-color="#3a2b1e" />
    </linearGradient>
    <linearGradient id="cv-zampa" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4b4440" />
      <stop offset="1" stop-color="#1c1917" />
    </linearGradient>
    <pattern id="cv-tratti" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#000" stroke-width="1.1" opacity="0.45" />
    </pattern>
    <clipPath id="cv-clip-corpo"><path d="M50 78 Q36 112 46 144 Q58 170 84 170 Q112 168 120 140 Q128 108 110 80 Q96 64 74 66 Q58 68 50 78 Z" /></clipPath>
  </defs>

  <!-- ombra a terra -->
  <ellipse cx="84" cy="190" rx="40" ry="5" fill="#000" opacity="0.25" />

  <!-- coda -->
  <path d="M60 150 L34 186 L48 184 L44 194 L60 180 L62 190 L72 166 Z" fill="url(#cv-ala)" stroke="#0a0a0c" stroke-width="2.2" stroke-linejoin="round" />

  <!-- zampe -->
  <g stroke="#0a0a0c" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">
    <path d="M74 164 L72 184 L76 184 L78 164 Z" fill="url(#cv-zampa)" />
    <path d="M94 164 L96 184 L100 184 L98 164 Z" fill="url(#cv-zampa)" />
    <path d="M73 183 L62 188 M74 184 L70 191 M76 184 L82 190 M74 183 L72 179" fill="none" stroke-width="2.6" />
    <path d="M97 183 L88 189 M98 184 L98 191 M99 184 L108 189" fill="none" stroke-width="2.6" />
  </g>

  <!-- corpo -->
  <path d="M50 78 Q36 112 46 144 Q58 170 84 170 Q112 168 120 140 Q128 108 110 80 Q96 64 74 66 Q58 68 50 78 Z" fill="url(#cv-corpo)" stroke="#0a0a0c" stroke-width="2.6" />
  <g clip-path="url(#cv-clip-corpo)">
    <!-- ombra propria in basso a destra, tratteggiata -->
    <path d="M86 70 Q130 100 118 150 Q104 176 70 172 Q110 150 86 70 Z" fill="url(#cv-tratti)" />
    <!-- piume del petto -->
    <g fill="none" stroke="#6b7180" stroke-width="1.1" opacity="0.55" stroke-linecap="round">
      <path d="M66 100 q5 4 10 0 M78 104 q5 4 10 0 M62 114 q5 4 10 0 M74 118 q5 4 10 0 M86 116 q5 4 10 0 M68 130 q5 4 10 0 M80 132 q5 4 10 0" />
    </g>
  </g>

  <!-- ala sinistra (dietro), appena visibile -->
  <path d="M112 92 Q132 110 128 142 Q120 132 114 124 Z" fill="#141418" stroke="#0a0a0c" stroke-width="2" stroke-linejoin="round" />

  <!-- ala destra (davanti), piegata, con la punta che fa da "mano" -->
  <g stroke="#0a0a0c" stroke-width="2.2" stroke-linejoin="round">
    <path d="M58 86 Q40 104 44 130 Q48 150 64 156 Q60 140 66 126 Q72 110 68 92 Z" fill="url(#cv-ala)" />
    <path d="M46 130 L38 146 L48 142 L44 154 L56 146 L56 158 L64 156" fill="url(#cv-ala)" />
    <g fill="none" stroke="#5d6372" stroke-width="1.2" opacity="0.7">
      <path d="M54 100 Q50 116 52 132 M60 98 Q57 116 58 140" />
    </g>
  </g>

  <!-- testa -->
  <circle cx="86" cy="54" r="27" fill="url(#cv-testa)" stroke="#0a0a0c" stroke-width="2.6" />
  <path d="M96 34 Q116 52 104 74 Q108 54 92 40 Z" fill="url(#cv-tratti)" />

  <!-- becco, in due pezzi per dare volume -->
  <path d="M104 50 Q130 52 146 60 Q128 60 104 62 Z" fill="url(#cv-becco)" stroke="#0a0a0c" stroke-width="2.2" stroke-linejoin="round" />
  <path d="M104 62 Q124 62 140 62 Q124 68 104 68 Z" fill="#17171b" stroke="#0a0a0c" stroke-width="2" stroke-linejoin="round" />
  <path d="M110 53 Q124 54 134 57" stroke="#9aa0ad" stroke-width="1.2" fill="none" opacity="0.7" />

  <!-- occhio con luce -->
  <circle cx="94" cy="50" r="6.5" fill="#efe6d2" stroke="#0a0a0c" stroke-width="1.6" />
  <circle cx="95.5" cy="50.5" r="3.6" fill="#141414" />
  <circle cx="97" cy="48.6" r="1.3" fill="#fff" />
  <path d="M86 43 Q94 40 101 44" stroke="#0a0a0c" stroke-width="2" fill="none" stroke-linecap="round" />

  <!-- cappello tondo con piume -->
  <g stroke="#1a120c" stroke-width="2.4" stroke-linejoin="round">
    <ellipse cx="84" cy="31" rx="36" ry="8" fill="url(#cv-cappello)" />
    <path d="M62 30 Q62 6 84 5 Q106 6 106 30 Q84 36 62 30 Z" fill="url(#cv-cappello)" />
    <path d="M63 25 Q84 31 105 25 L105 30 Q84 36 63 30 Z" fill="#7a2f22" stroke-width="1.6" />
    <path d="M66 22 Q70 10 80 8" stroke="#c9a77d" stroke-width="2" fill="none" opacity="0.6" />
  </g>
  <g stroke="#1a120c" stroke-width="1.8" stroke-linejoin="round">
    <path d="M100 24 Q118 -2 134 4 Q118 10 104 26 Z" fill="#c0583a" />
    <path d="M102 26 Q126 12 138 20 Q122 20 106 28 Z" fill="#d9a441" />
    <path d="M104 22 Q122 4 132 6" stroke="#f2d9b8" stroke-width="1" fill="none" />
  </g>
</svg>

<style>
  .corvo-disegno { overflow: visible; }
</style>
