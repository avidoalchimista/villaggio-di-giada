// Effetti "console anni '90": vertici che si agganciano a una griglia (tremolio), texture a pixel grossi,
// colori ridotti. Tutto fatto in codice, nessun asset esterno.
import * as THREE from 'three';

export const GRIGLIA_VERTICI = new THREE.Vector2(160, 120);

/** Materiale Lambert con aggancio dei vertici in stile PS1. */
export function materiale(opz: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ flatShading: true, ...opz });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uGriglia = { value: GRIGLIA_VERTICI };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uGriglia;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 sn = gl_Position;
        sn.xyz /= sn.w;
        sn.xy = floor(sn.xy * uGriglia) / uGriglia;
        sn.xyz *= sn.w;
        gl_Position = sn;`,
      );
  };
  return m;
}

/** Texture disegnata su un canvas piccolo, filtrata "nearest" per avere pixel netti. */
export function texture(lato: number, disegna: (c: CanvasRenderingContext2D, lato: number) => void, ripeti = 1): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = lato;
  const c = cv.getContext('2d')!;
  disegna(c, lato);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti, ripeti);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Rumore a chiazze con una palette: erba, terra, corteccia. */
export function macchie(palette: string[], densita = 1) {
  return (c: CanvasRenderingContext2D, lato: number) => {
    c.fillStyle = palette[0];
    c.fillRect(0, 0, lato, lato);
    let s = 1234567;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < lato * lato * 0.5 * densita; i++) {
      c.fillStyle = palette[1 + Math.floor(r() * (palette.length - 1))];
      const w = 1 + Math.floor(r() * 2);
      c.fillRect(Math.floor(r() * lato), Math.floor(r() * lato), w, 1 + Math.floor(r() * 2));
    }
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
export function spriteTesto(testo: string, colore = '#ffffff', taglia = 32): THREE.Sprite {
  const t = texture(taglia, (c, l) => {
    c.clearRect(0, 0, l, l);
    c.font = `bold ${Math.floor(l * 0.8)}px Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 4;
    c.strokeStyle = '#1a1410';
    c.strokeText(testo, l / 2, l / 2 + 2);
    c.fillStyle = colore;
    c.fillText(testo, l / 2, l / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  return s;
}
