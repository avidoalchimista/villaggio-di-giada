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
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * 0.028;')
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
