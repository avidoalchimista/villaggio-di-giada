// Materiali in stile "libro illustrato giocabile":
// - shading toon a 4 fasce (gradientMap con filtro nearest, come da documentazione three.js)
// - bordo di luce calda sul contorno (rim light)
// - ombre colorate (le fa la luce emisferica: cielo azzurro, terra calda)
// - mondo curvo: il terreno scende con la distanza, così si vedono prato e cielo insieme
// - contorni scuri morbidi (guscio rovesciato) per l'effetto illustrazione
import * as THREE from 'three';

export const CURVA = { valore: 0.0042 };

let gradiente: THREE.DataTexture | null = null;
function gradientMap(): THREE.DataTexture {
  if (gradiente) return gradiente;
  const livelli = [70, 140, 205, 255];
  const data = new Uint8Array(livelli.length * 4);
  livelli.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  gradiente = new THREE.DataTexture(data, livelli.length, 1, THREE.RGBAFormat);
  gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter;
  gradiente.needsUpdate = true;
  return gradiente;
}

const CURVA_GLSL = `
  vec4 mvCurva = modelViewMatrix * vec4(transformed, 1.0);
  mvCurva.y -= mvCurva.z * mvCurva.z * uCurva;
  gl_Position = projectionMatrix * mvCurva;
`;

function applicaCurva(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.uCurva = { get value() { return CURVA.valore; } } as THREE.IUniform;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uCurva;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n' + CURVA_GLSL);
}

export interface OpzMateriale extends THREE.MeshToonMaterialParameters {
  rim?: number; // intensità del bordo di luce (0 = niente)
}

/** Materiale toon con curva del mondo e bordo di luce. */
export function materiale(opz: OpzMateriale = {}): THREE.MeshToonMaterial {
  const { rim = 0.35, ...resto } = opz;
  const m = new THREE.MeshToonMaterial({ gradientMap: gradientMap(), ...resto });
  m.onBeforeCompile = (shader) => {
    applicaCurva(shader);
    shader.uniforms.uRim = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        float bordo = smoothstep(0.55, 1.0, 1.0 - abs(dot(normalize(-vViewPosition), normal)));
        gl_FragColor.rgb += vec3(1.0, 0.9, 0.7) * bordo * uRim;`,
      );
  };
  m.customProgramCacheKey = () => 'toon-rim-' + rim;
  return m;
}

const matContorno = new THREE.MeshBasicMaterial({ color: '#3b2616', side: THREE.BackSide });
matContorno.onBeforeCompile = (shader) => {
  shader.uniforms.uCurva = { get value() { return CURVA.valore; } } as THREE.IUniform;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uCurva;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.018;')
    .replace('#include <project_vertex>', '#include <project_vertex>\n' + CURVA_GLSL);
};

/** Aggiunge un contorno scuro a tutte le mesh del gruppo (guscio rovesciato, come nei cartoni). */
export function contorno<T extends THREE.Object3D>(o: T): T {
  const mesh: THREE.Mesh[] = [];
  o.traverse((c) => {
    if (c instanceof THREE.Mesh && !c.userData.senzaContorno) mesh.push(c);
  });
  for (const m of mesh) {
    const guscio = new THREE.Mesh(m.geometry, matContorno);
    guscio.userData.senzaContorno = true;
    guscio.raycast = () => {};
    m.add(guscio);
  }
  return o;
}

/** Texture dipinta su canvas: macchie morbide, pennellate. Filtro lineare = niente pixel grossi. */
export function texture(lato: number, disegna: (c: CanvasRenderingContext2D, lato: number) => void, ripeti = 1): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = lato;
  const c = cv.getContext('2d')!;
  disegna(c, lato);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti, ripeti);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function casuale(seme: number) {
  let s = seme;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Pennellate morbide: base + macchie sfumate di altri colori (erba, terra, corteccia). */
export function macchie(palette: string[], densita = 1, seme = 99) {
  return (c: CanvasRenderingContext2D, lato: number) => {
    const r = casuale(seme);
    c.fillStyle = palette[0];
    c.fillRect(0, 0, lato, lato);
    const n = Math.floor(60 * densita);
    for (let i = 0; i < n; i++) {
      const x = r() * lato, y = r() * lato, rad = lato * (0.04 + r() * 0.12);
      const col = palette[1 + Math.floor(r() * (palette.length - 1))];
      for (const [dx, dy] of [[0, 0], [lato, 0], [-lato, 0], [0, lato], [0, -lato]]) {
        const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        g.addColorStop(0, col + 'cc');
        g.addColorStop(1, col + '00');
        c.fillStyle = g;
        c.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
    // piccoli tratti, come fili d'erba o venature
    c.globalAlpha = 0.35;
    for (let i = 0; i < 160 * densita; i++) {
      c.strokeStyle = palette[1 + Math.floor(r() * (palette.length - 1))];
      c.lineWidth = 1 + r() * 1.5;
      const x = r() * lato, y = r() * lato;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5);
      c.stroke();
    }
    c.globalAlpha = 1;
  };
}

export function strisce(a: string, b: string, n = 4) {
  return (c: CanvasRenderingContext2D, lato: number) => {
    const w = lato / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? b : a;
      c.fillRect(i * w, 0, w, lato);
    }
  };
}

/** Sprite con una scritta (per le "z" del sonno, i cuori, le note). */
export function spriteTesto(testo: string, colore = '#ffffff', taglia = 64): THREE.Sprite {
  const t = texture(taglia, (c, l) => {
    c.clearRect(0, 0, l, l);
    c.font = `900 ${Math.floor(l * 0.75)}px 'Nunito Variable', sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = l * 0.1;
    c.lineJoin = 'round';
    c.strokeStyle = '#3b2616';
    c.strokeText(testo, l / 2, l / 2 + 2);
    c.fillStyle = colore;
    c.fillText(testo, l / 2, l / 2 + 2);
  });
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
}

// ---------- terreno ----------

function rumoreValore(lato: number, celle: number, seme: number): Float32Array {
  // rumore "a valori" interpolato, ripetibile ai bordi (si può piastrellare senza cuciture)
  const r = casuale(seme);
  const g = Array.from({ length: celle * celle }, () => r());
  const out = new Float32Array(lato * lato);
  const liscio = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
    const fx = (x / lato) * celle, fy = (y / lato) * celle;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = liscio(fx - x0), ty = liscio(fy - y0);
    const v = (i: number, j: number) => g[((j % celle) * celle + (i % celle))];
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
    out[y * lato + x] = a + (b - a) * ty;
  }
  return out;
}

function frattale(lato: number, seme: number, ottave = 5): Float32Array {
  const out = new Float32Array(lato * lato);
  let amp = 1, tot = 0;
  for (let o = 0; o < ottave; o++) {
    const n = rumoreValore(lato, 4 << o, seme + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

function texDaFunzione(lato: number, f: (x: number, y: number, i: number) => [number, number, number], ripeti = true): THREE.DataTexture {
  const data = new Uint8Array(lato * lato * 4);
  for (let y = 0; y < lato; y++) for (let x = 0; x < lato; x++) {
    const i = y * lato + x;
    const [r, g, b] = f(x, y, i);
    data.set([r, g, b, 255], i * 4);
  }
  const t = new THREE.DataTexture(data, lato, lato, THREE.RGBAFormat);
  t.wrapS = t.wrapT = ripeti ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function mescola(a: number[], b: number[], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Erba: base frattale, toni caldi e freddi, fili d'erba e trifoglio. */
function texErba(): THREE.DataTexture {
  const L = 512;
  const n = frattale(L, 7, 6), m = frattale(L, 33, 3);
  const scuro = [52, 96, 40], medio = [88, 142, 58], chiaro = [138, 176, 78], secco = [150, 150, 82];
  const tex = texDaFunzione(L, (_x, _y, i) => {
    const v = n[i];
    let c = v < 0.5 ? mescola(scuro, medio, v * 2) : mescola(medio, chiaro, (v - 0.5) * 2);
    c = mescola(c, secco, Math.max(0, m[i] - 0.55) * 1.6);
    return c;
  });
  // fili d'erba disegnati sopra
  const data = tex.image.data as Uint8Array;
  const r = casuale(5);
  for (let k = 0; k < 26000; k++) {
    const x = Math.floor(r() * L), y = Math.floor(r() * L), h = 2 + Math.floor(r() * 5);
    const chiarezza = r() > 0.5 ? 1.18 : 0.8;
    for (let j = 0; j < h; j++) {
      const yy = (y - j + L) % L, xx = (x + Math.round((j * (r() - 0.5)) / 2) + L) % L;
      const p = (yy * L + xx) * 4;
      for (let c = 0; c < 3; c++) data[p + c] = Math.min(255, data[p + c] * chiarezza);
    }
  }
  tex.needsUpdate = true;
  return tex;
}

/** Terra battuta con sassolini. */
function texTerra(): THREE.DataTexture {
  const L = 256;
  const n = frattale(L, 71, 5);
  const tex = texDaFunzione(L, (_x, _y, i) => mescola([118, 88, 58], [176, 140, 98], n[i]));
  const data = tex.image.data as Uint8Array;
  const r = casuale(17);
  for (let k = 0; k < 700; k++) {
    const cx = r() * L, cy = r() * L, rad = 0.8 + r() * 2.2, luce = 0.75 + r() * 0.6;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
      const d = Math.hypot(x, y) / rad;
      if (d > 1) continue;
      const p = ((((Math.floor(cy) + y) % L + L) % L) * L + (((Math.floor(cx) + x) % L + L) % L)) * 4;
      const ombra = y > 0 ? 0.8 : 1.1;
      for (let c = 0; c < 3; c++) data[p + c] = Math.min(255, 150 * luce * ombra + (c === 2 ? -10 : 0));
    }
  }
  tex.needsUpdate = true;
  return tex;
}

/** Maschera a macchie larghe per variare il prato senza che si veda la ripetizione. */
function texMacchie(): THREE.DataTexture {
  const L = 128;
  const n = frattale(L, 99, 4);
  return texDaFunzione(L, (_x, _y, i) => { const v = Math.round(n[i] * 255); return [v, v, v]; });
}

/**
 * Materiale del suolo: erba a due scale (vicino e lontano) + terra battuta che compare
 * dove si cammina (al centro e lungo i sentieri) e a chiazze. Coordinate del mondo: niente cuciture.
 */
export function materialeTerreno(): THREE.MeshLambertMaterial {
  const erba = texErba(), terra = texTerra(), macchie = texMacchie();
  const m = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const uniform = {
    tErba: { value: erba }, tTerra: { value: terra }, tMacchie: { value: macchie },
    uConsumato: { value: 2.2 }, // raggio della zona calpestata al centro
    uSentiero: { value: 0 }, // 1 quando c'è il sentiero
  };
  m.userData.uniform = uniform;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniform);
    shader.uniforms.uCurva = { get value() { return CURVA.valore; } } as THREE.IUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCurva;\nvarying vec2 vMondo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMondo = (modelMatrix * vec4(position, 1.0)).xz;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + CURVA_GLSL);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tErba; uniform sampler2D tTerra; uniform sampler2D tMacchie;
        uniform float uConsumato; uniform float uSentiero;
        varying vec2 vMondo;`,
      )
      .replace(
        '#include <map_fragment>',
        `
        vec3 eVicina = texture2D(tErba, vMondo * 0.32).rgb;
        vec3 eLontana = texture2D(tErba, vMondo * 0.061 + 0.37).rgb;
        float mac = texture2D(tMacchie, vMondo * 0.025).r;
        vec3 erbaCol = mix(eVicina, eLontana, 0.45) * (0.82 + mac * 0.36);
        vec3 terraCol = texture2D(tTerra, vMondo * 0.45).rgb;
        float d = length(vMondo);
        // calpestato al centro, più netto quando c'è il sentiero ad anello
        float centro = 1.0 - smoothstep(uConsumato * 0.5, uConsumato, d);
        float anello = uSentiero * (1.0 - smoothstep(0.32, 0.55, abs(d - 1.95)));
        float viale = uSentiero * (1.0 - smoothstep(0.42, 0.62, abs(vMondo.x))) * step(1.9, vMondo.y) * (1.0 - smoothstep(9.0, 11.0, vMondo.y));
        float chiazze = smoothstep(0.66, 0.74, texture2D(tMacchie, vMondo * 0.07 + 0.5).r) * 0.85;
        float rumore = texture2D(tMacchie, vMondo * 0.6).r;
        float t = clamp(max(max(centro * 0.55, anello), max(viale, chiazze)) + (rumore - 0.5) * 0.35, 0.0, 1.0);
        diffuseColor.rgb *= mix(erbaCol, terraCol, smoothstep(0.35, 0.65, t));
        `,
      );
  };
  m.customProgramCacheKey = () => 'terreno';
  return m;
}

/** Ombra morbida rotonda sotto gli oggetti (come nei giochi cozy). */
let texOmbra: THREE.CanvasTexture | null = null;
export function ombra(raggio: number): THREE.Mesh {
  texOmbra ??= texture(64, (c, l) => {
    const g = c.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    g.addColorStop(0, 'rgba(40,30,60,0.45)');
    g.addColorStop(0.6, 'rgba(40,30,60,0.25)');
    g.addColorStop(1, 'rgba(40,30,60,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, l, l);
  });
  const m = new THREE.MeshBasicMaterial({ map: texOmbra, transparent: true, depthWrite: false });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCurva = { get value() { return CURVA.valore; } } as THREE.IUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCurva;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + CURVA_GLSL);
  };
  const o = new THREE.Mesh(new THREE.PlaneGeometry(raggio * 2, raggio * 2), m);
  o.rotation.x = -Math.PI / 2;
  o.position.y = 0.03;
  o.userData.senzaContorno = true;
  o.raycast = () => {};
  return o;
}
