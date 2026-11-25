// Modelli costruiti in codice, stile "libro illustrato" morbido.
// Cuccioli secondo lo schema infantile (Lorenz): testa più grande del corpo, fronte alta,
// occhi grandi e bassi, guance piene, naso e bocca piccoli, zampe corte e tozze.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash, rng } from '../lib/caso';
import type { Animale, Emozione, Fase, Specie } from '../lib/tipi';
import { aggiornaGuardaroba, capo, conDivisa, indossati, type Parte } from '../lib/vestiti';
import { defMestiere, simboloMestiere, MESTIERI } from '../lib/mestieri';
import { creaAttrezzoInMano, mettiCapo, mettiOcchiali, type Attacchi } from './sartoria';
import { creaAttrezziMestiere, creaInsegnaMestiere } from './botteghe';
import { contorno, macchie, materiale, ombra, spriteTesto, strisce, texture } from './ps1';
import { creaAmpliamenti, creaGiardinetto } from './esterni';

export const geo = {
  palla: (r: number, s = 18) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75)),
  cono: (r: number, h: number, s = 12) => new THREE.ConeGeometry(r, h, s),
  cil: (r1: number, r2: number, h: number, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s),
  capsula: (r: number, h: number) => new THREE.CapsuleGeometry(r, h, 6, 12),
  scatola: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
};

const cache = new Map<string, THREE.MeshToonMaterial>();
export function mat(colore: string, extra: Parameters<typeof materiale>[0] = {}) {
  const k = colore + JSON.stringify(extra, (key, v) => (key === 'map' ? undefined : v));
  if (!extra.map && cache.has(k)) return cache.get(k)!;
  const m = materiale({ color: colore, ...extra });
  if (!extra.map) cache.set(k, m);
  return m;
}

/**
 * Le finestre (vetro azzurro con luce calda dentro): di sera si accendono, di giorno riflettono il cielo.
 * notte: 0 = pieno giorno, 1 = notte fonda.
 */
export function accendiFinestre(notte: number) {
  for (const [k, m] of cache) {
    if (!k.startsWith('#9fd3f0') || !k.includes('#ffd27a')) continue;
    m.userData.base ??= m.emissiveIntensity;
    const sera = Math.max(0, Math.min(1, (notte - 0.25) / 0.5));
    m.emissiveIntensity = m.userData.base + sera * 1.6;
    m.color.set('#9fd3f0').lerp(FINESTRA_ACCESA, sera * 0.8);
  }
}
const FINESTRA_ACCESA = new THREE.Color('#ffe0a0');

/** Margheritina: petali intorno a un bottone giallo. */
export function fiore(petalo: string, centro: string) {
  const f = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    const pe = mesh(geo.palla(0.035, 8), mat(petalo, { rim: 0.2 }), Math.cos(ang) * 0.05, Math.sin(ang) * 0.05, 0);
    pe.scale.set(1, 1, 0.4);
    f.add(pe);
  }
  f.add(mesh(geo.palla(0.032, 8), mat(centro, { rim: 0.2 }), 0, 0, 0.01));
  f.traverse((c) => (c.userData.senzaContorno = true));
  f.scale.setScalar(1.6);
  return f;
}

export function fiocco(colore: string) {
  const f = new THREE.Group();
  for (const s of [-1, 1]) {
    const ala = mesh(geo.cono(0.08, 0.16, 8), mat(colore), s * 0.08, 0, 0);
    ala.rotation.z = -s * Math.PI / 2;
    f.add(ala);
  }
  f.add(mesh(geo.palla(0.045, 8), mat(varia(colore, 0, -0.1)), 0, 0, 0));
  return f;
}

/** Tante piccole forme in una sola (meno lavoro per il telefono). */
function unisci(parti: THREE.BufferGeometry[]) {
  return mergeGeometries(parti.map((g) => { g.deleteAttribute('uv'); return g; })) ?? parti[0];
}

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

/**
 * Unisce i pezzi fermi di un modello che hanno lo stesso materiale (le palle della chioma, i petali,
 * i fili d'erba...): si vedono identici, ma il telefono li disegna in un colpo solo invece che uno per uno.
 * Va chiamato prima del contorno. I pezzi con un nome o con figli restano come sono.
 */
export function unisciPezzi<T extends THREE.Object3D>(g: T, esclusi?: Set<THREE.Object3D>): T {
  const gruppi = new Map<string, { m: THREE.Material; senza: boolean; pezzi: THREE.Mesh[] }>();
  for (const c of g.children) {
    if (!(c instanceof THREE.Mesh) || c.children.length || c.name || Array.isArray(c.material)) continue;
    if (esclusi?.has(c) || !c.visible) continue;
    if (Object.keys(c.userData).some((k) => k !== 'senzaContorno')) continue; // pezzi che si muovono o servono a qualcosa
    if (c.material instanceof THREE.MeshBasicMaterial) continue; // ombre e simili
    const senza = !!c.userData.senzaContorno;
    const k = c.material.uuid + (senza ? ':s' : '');
    let v = gruppi.get(k);
    if (!v) gruppi.set(k, (v = { m: c.material, senza, pezzi: [] }));
    v.pezzi.push(c);
  }
  for (const { m, senza, pezzi } of gruppi.values()) {
    if (pezzi.length < 2) continue;
    const indicizzate = pezzi.every((c) => c.geometry.index);
    const geos = pezzi.map((c) => {
      c.updateMatrix();
      const gg = indicizzate ? c.geometry.clone() : c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
      gg.applyMatrix4(c.matrix);
      // un pezzo specchiato (scala negativa) va rigirato, altrimenti si vedrebbe "da dentro"
      if (c.matrix.determinant() < 0) {
        if (gg.index) {
          const a = gg.index.array;
          for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
        } else {
          for (const nome of Object.keys(gg.attributes)) {
            const at = gg.attributes[nome], n = at.itemSize, arr = at.array;
            for (let i = 0; i < at.count; i += 3) for (let j = 0; j < n; j++) {
              const t = arr[(i + 1) * n + j]; arr[(i + 1) * n + j] = arr[(i + 2) * n + j]; arr[(i + 2) * n + j] = t;
            }
          }
        }
      }
      return gg;
    });
    const nomi = Object.keys(geos[0].attributes);
    if (!geos.every((gg) => Object.keys(gg.attributes).length === nomi.length && nomi.every((n) => gg.attributes[n]))) continue;
    const unita = mergeGeometries(geos, false);
    geos.forEach((gg) => gg.dispose());
    if (!unita) continue;
    for (const c of pezzi) g.remove(c);
    const u = new THREE.Mesh(unita, m);
    if (senza) u.userData.senzaContorno = true;
    g.add(u);
  }
  return g;
}

/** Come unisciPezzi, ma in tutto il modello, ramo per ramo (lascia stare i pezzi in `esclusi`, che si muovono). */
export function unisciTutto<T extends THREE.Object3D>(radice: T, esclusi = new Set<THREE.Object3D>()): T {
  const nodi: THREE.Object3D[] = [];
  radice.traverse((o) => { if (o.children.length > 1) nodi.push(o); });
  for (const n of nodi) unisciPezzi(n, esclusi);
  return radice;
}

// ---------- animali ----------
// (ridisegnati: un corpo solo e liscio, in piedi da grandi, occhi espressivi: vedi animali3d.ts)
export { creaAnimale, posa, ampiezzaPasso, aggiornaMestiere, tagliaSpecie, rifinisci, espressione, parla, seduta, type ModelloAnimale, type Espressione } from './animali3d';

export function varia(colore: string, tinta: number, luce: number) {
  return '#' + new THREE.Color(colore).offsetHSL(tinta, 0, luce).getHexString();
}

/** Il simbolo di ogni mestiere (fumetti mentre lavora). */
export const SIMBOLI_MESTIERE: Record<string, string> = Object.fromEntries(MESTIERI.map((x) => [x.id, x.simbolo]));
export { simboloMestiere };

// ---------- uovo e nido ----------

export function creaUovo(colore: string): THREE.Group {
  const g = new THREE.Group();
  const guscio = mesh(geo.palla(0.3), mat('#fff7e6', { rim: 0.5 }), 0, 0.38, 0);
  guscio.scale.set(1, 1.3, 1);
  guscio.name = 'guscio';
  g.add(guscio);
  for (const [x, y, z, r] of [[0.16, 0.48, 0.2, 0.07], [-0.2, 0.32, 0.14, 0.06], [0.05, 0.22, 0.26, 0.05], [-0.06, 0.6, 0.18, 0.05], [0.24, 0.3, -0.05, 0.05]]) {
    const m = mesh(geo.palla(r, 10), mat(colore, { rim: 0 }), x, y, z);
    m.userData.senzaContorno = true;
    g.add(m);
  }
  return contorno(g);
}

export function creaNido(): THREE.Group {
  const g = new THREE.Group();
  const paglia = mat('#ffffff', { map: texture(64, macchie(['#b88a58', '#9c7348', '#d4a870', '#7d5a36'], 1.4, 7), 3) });
  const anello = mesh(new THREE.TorusGeometry(0.75, 0.24, 10, 20), paglia);
  anello.rotation.x = Math.PI / 2;
  anello.position.y = 0.14;
  g.add(anello);
  g.add(mesh(geo.cil(0.72, 0.6, 0.12, 20), mat('#7d5a36'), 0, 0.06, 0));
  return contorno(g);
}

// ---------- corvo ----------

export interface ModelloCorvo { gruppo: THREE.Group; testa: THREE.Group; ali: THREE.Object3D[] }

export function creaCorvo(): ModelloCorvo {
  const gruppo = new THREE.Group();
  gruppo.add(ombra(0.5));
  const legno = mat('#ffffff', { map: texture(64, macchie(['#8a6440', '#6e4e30', '#a07852'], 1, 3)) });
  gruppo.add(contorno(mesh(geo.cil(0.12, 0.15, 1.6, 10), legno, 0, 0.8, 0)));
  const uccello = new THREE.Group();
  uccello.position.y = 1.6;
  gruppo.add(uccello);
  const nero = mat('#2e3142', { rim: 0.6 });
  const corpo = mesh(geo.palla(0.32), nero, 0, 0.3, 0);
  corpo.scale.set(0.95, 1.1, 1);
  uccello.add(corpo);
  uccello.add(mesh(geo.palla(0.2), mat('#454a63', { rim: 0.3 }), 0, 0.26, 0.17));
  for (const x of [-0.08, 0.08]) uccello.add(mesh(geo.cil(0.03, 0.03, 0.14, 6), mat('#e0a040'), x, 0.02, 0.06));
  const coda = mesh(geo.scatola(0.26, 0.05, 0.38), nero, 0, 0.18, -0.36);
  coda.rotation.x = 0.5;
  uccello.add(coda);
  const ali: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const perno = new THREE.Group();
    perno.position.set(s * 0.27, 0.42, 0);
    const ala = mesh(geo.palla(0.22), mat('#262836', { rim: 0.5 }), s * 0.05, -0.12, -0.04);
    ala.scale.set(0.35, 1, 1.25);
    perno.add(ala);
    uccello.add(perno);
    ali.push(perno);
  }
  const testa = new THREE.Group();
  testa.position.set(0, 0.78, 0.04);
  uccello.add(testa);
  testa.add(mesh(geo.palla(0.28), nero));
  const becco = mesh(geo.cono(0.085, 0.34, 10), mat('#565a6a', { rim: 0.4 }), 0, -0.05, 0.37);
  becco.rotation.x = Math.PI / 2;
  testa.add(becco);
  for (const x of [-0.12, 0.12]) {
    const o = mesh(geo.palla(0.075), mat('#ffffff', { rim: 0 }), x, 0.06, 0.21);
    o.userData.senzaContorno = true;
    testa.add(o);
    const p = mesh(geo.palla(0.045), mat('#111111', { rim: 0 }), x * 1.05, 0.06, 0.27);
    p.userData.senzaContorno = true;
    testa.add(p);
  }
  const cappello = new THREE.Group();
  cappello.position.y = 0.2;
  cappello.rotation.z = -0.12;
  cappello.add(mesh(geo.cil(0.38, 0.38, 0.04, 20), mat('#7a5a3c')));
  cappello.add(mesh(geo.cil(0.18, 0.22, 0.22, 20), mat('#7a5a3c'), 0, 0.12, 0));
  cappello.add(mesh(geo.cil(0.226, 0.226, 0.06, 20), mat('#b5452e'), 0, 0.06, 0));
  const piuma1 = mesh(geo.capsula(0.04, 0.36), mat('#e2683a'), 0.2, 0.3, -0.05);
  piuma1.rotation.z = -0.6;
  cappello.add(piuma1);
  const piuma2 = mesh(geo.capsula(0.035, 0.3), mat('#f2c94c'), 0.25, 0.24, -0.1);
  piuma2.rotation.z = -0.9;
  cappello.add(piuma2);
  testa.add(cappello);
  contorno(uccello);
  return { gruppo, testa, ali };
}

// ---------- ambiente ----------

// verdi più naturali e profondi (meno pastello): atmosfera più da avventura che da cartolina
const VERDI = ['#5d9a4a', '#4e8a40', '#6ba552', '#58924a'];
const cacheChioma = new Map<number, THREE.MeshToonMaterial>();
function chioma(i: number) {
  const k = i % VERDI.length;
  if (!cacheChioma.has(k)) {
    const v = VERDI[k];
    const c = new THREE.Color(v);
    cacheChioma.set(k, materiale({ color: '#ffffff', map: texture(64, macchie([v, '#' + c.clone().offsetHSL(0, 0, 0.08).getHexString(), '#' + c.clone().offsetHSL(0.02, 0, -0.1).getHexString()], 1, k + 5)), rim: 0.3 }));
  }
  return cacheChioma.get(k)!;
}
// (una sola per tutti: prima ogni albero si dipingeva la sua, uguale, e il telefono le teneva tutte in memoria)
let _corteccia: THREE.MeshToonMaterial | null = null;
export const corteccia = () => (_corteccia ??= mat('#ffffff', { map: texture(64, macchie(['#8a5a36', '#6d4428', '#a06a40'], 1, 11)) }));

export function creaAlbero(scala = 1, tinta = 0, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.16, 0.24, 1.2, 8), corteccia(), 0, 0.6, 0));
  // chioma a nuvola: tante palle morbide
  for (const [x, y, z, r] of [[0, 1.55, 0, 0.8], [0.45, 1.35, 0.1, 0.55], [-0.45, 1.4, -0.05, 0.58], [0.1, 2.05, -0.1, 0.6], [-0.15, 1.35, 0.42, 0.5]])
    g.add(mesh(geo.palla(r, 12), chioma(tinta), x, y, z));
  unisciPezzi(g);
  g.add(ombra(0.9));
  g.scale.setScalar(scala);
  return conContorno ? contorno(g) : g;
}

export function creaPino(scala = 1, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.12, 0.16, 0.6, 8), corteccia(), 0, 0.3, 0));
  for (const [y, r, h] of [[0.9, 0.85, 1.1], [1.5, 0.65, 0.95], [2.0, 0.42, 0.8]]) g.add(mesh(geo.cono(r, h, 10), mat('#3d7550', { rim: 0.2 }), 0, y, 0));
  unisciPezzi(g);
  g.add(ombra(0.8));
  g.scale.setScalar(scala);
  return conContorno ? contorno(g) : g;
}

export function creaFiore(colore: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.02, 0.02, 0.25, 5), mat('#3c8a3c', { rim: 0 }), 0, 0.12, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = mesh(geo.palla(0.05, 8), mat(colore, { rim: 0.2 }), Math.cos(a) * 0.06, 0.27, Math.sin(a) * 0.06);
    g.add(p);
  }
  g.add(mesh(geo.palla(0.04, 8), mat('#ffd34d', { rim: 0 }), 0, 0.29, 0));
  return unisciPezzi(g);
}

// ---------- castagno e castagne ----------

export function creaCastagno(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.28, 0.42, 1.8, 10), corteccia(), 0, 0.9, 0));
  for (const [x, y, z, r] of [[0, 2.5, 0, 1.2], [0.8, 2.1, 0.3, 0.85], [-0.85, 2.2, -0.1, 0.9], [0.2, 3.1, -0.2, 0.85], [-0.3, 2.0, 0.75, 0.75], [0.4, 2.2, -0.8, 0.8]])
    g.add(mesh(geo.palla(r, 12), chioma(1), x, y, z));
  // ricci spinosi tra le foglie
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, rr = 1.05 + (i % 3) * 0.2;
    const riccio = mesh(new THREE.IcosahedronGeometry(0.11, 0), mat('#b8c44a', { rim: 0.2 }), Math.cos(a) * rr, 2.0 + (i % 4) * 0.35, Math.sin(a) * rr);
    riccio.userData.senzaContorno = true;
    g.add(riccio);
  }
  g.add(ombra(1.6));
  return contorno(g);
}

export function creaCastagna(): THREE.Mesh {
  const c = mesh(geo.palla(0.09, 10), mat('#7a3e1c', { rim: 0.5 }), 0, 0.07, 0);
  c.scale.set(1, 0.8, 0.9);
  return c;
}

/** Canna da pesca (si dà in mano a chi sa pescare). */
export function creaCanna(): THREE.Group {
  const g = new THREE.Group();
  const asta = mesh(geo.cil(0.015, 0.025, 1.3, 5), mat('#8a5a36'), 0, 0.6, 0.2);
  asta.rotation.x = 0.9;
  g.add(asta);
  return g;
}

// ---------- natura selvatica della radura ----------

export function creaCespuglio(scala = 1, tinta = 0): THREE.Group {
  const g = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0.35, 0, 0.45], [0.35, 0.28, 0.1, 0.33], [-0.32, 0.27, 0.05, 0.35], [0.05, 0.3, 0.32, 0.3]])
    g.add(mesh(geo.palla(r, 10), chioma(tinta + 1), x, y, z));
  if (tinta % 2 === 0) for (const [x, y, z] of [[0.2, 0.55, 0.3], [-0.25, 0.45, 0.3], [0.4, 0.4, 0.25]]) {
    const bacca = mesh(geo.palla(0.05, 6), mat('#d8344a', { rim: 0 }), x, y, z);
    bacca.userData.senzaContorno = true;
    g.add(bacca);
  }
  unisciPezzi(g);
  g.add(ombra(0.6));
  g.scale.setScalar(scala);
  return g;
}

export function creaFungo(scala = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.05, 0.07, 0.2, 8), mat('#f4ead8'), 0, 0.1, 0));
  const cappello = mesh(geo.palla(0.14, 10), mat('#c8402e', { rim: 0.3 }), 0, 0.2, 0);
  cappello.scale.y = 0.6;
  g.add(cappello);
  for (const [x, z] of [[0.06, 0.05], [-0.05, 0.07], [0.0, -0.08]]) {
    const p = mesh(geo.palla(0.02, 5), mat('#ffffff', { rim: 0 }), x, 0.27, z);
    p.userData.senzaContorno = true;
    g.add(p);
  }
  unisciPezzi(g);
  g.scale.setScalar(scala);
  return g;
}

export function creaTronco(): THREE.Group {
  const g = new THREE.Group();
  const t = mesh(geo.cil(0.22, 0.25, 1.6, 10), corteccia(), 0, 0.22, 0);
  t.rotation.z = Math.PI / 2;
  g.add(t);
  for (const x of [-0.8, 0.8]) {
    const anelli = mesh(geo.cil(0.21, 0.21, 0.02, 10), mat('#d8b07a'), x, 0.22, 0);
    anelli.rotation.z = Math.PI / 2;
    g.add(anelli);
  }
  const muschio = mesh(geo.palla(0.2, 8), mat('#6a9a48'), 0.2, 0.4, 0);
  muschio.scale.set(1.8, 0.35, 0.9);
  g.add(muschio);
  g.add(ombra(0.9));
  return g;
}

/** Ciuffi d'erba alta: tanti fili sottili che spuntano dal prato. */
export function creaCiuffo(scala = 1): THREE.Group {
  const g = new THREE.Group();
  const m = mat('#5f9a44', { rim: 0.2, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const filo = mesh(geo.cono(0.035, 0.42 + (i % 3) * 0.12, 3), m, Math.cos(i * 2.3) * 0.08, 0.2, Math.sin(i * 2.3) * 0.08);
    filo.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.7) * 0.3);
    g.add(filo);
  }
  unisciPezzi(g);
  g.scale.setScalar(scala);
  return g;
}

export function creaSasso(scala = 1): THREE.Mesh {
  const s = mesh(new THREE.DodecahedronGeometry(0.4, 1), mat('#b4aea4', { rim: 0.3 }));
  s.scale.set(scala * 1.2, scala * 0.7, scala);
  s.position.y = 0.15 * scala;
  s.rotation.y = scala * 3;
  return contorno(s);
}

export function creaLanterna(): { gruppo: THREE.Group; luce: THREE.Mesh } {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.05, 0.06, 1.3, 8), mat('#4a3a2c'), 0, 0.65, 0));
  const luce = mesh(geo.palla(0.15, 12), mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 0.2, rim: 0 }), 0, 1.42, 0);
  g.add(luce);
  g.add(mesh(geo.cono(0.2, 0.14, 8), mat('#4a3a2c'), 0, 1.6, 0));
  contorno(g);
  return { gruppo: g, luce };
}

export function creaQuaderno(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.5));
  const legno = mat('#9a6a40');
  g.add(mesh(geo.cil(0.08, 0.1, 0.8, 8), legno, 0, 0.4, 0));
  const piano = mesh(geo.scatola(0.8, 0.06, 0.55), legno, 0, 0.82, 0);
  piano.rotation.x = -0.45;
  g.add(piano);
  const pagine = mesh(geo.scatola(0.72, 0.05, 0.48), mat('#ffffff', { map: texture(64, (c, l) => {
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#9ab4d8'; for (let y = 8; y < l; y += 8) c.fillRect(4, y, l - 8, 2);
    c.fillStyle = '#e07a5a'; c.fillRect(l / 2 - 1, 0, 2, l);
  }), rim: 0.2 }), 0, 0.87, 0.02);
  pagine.rotation.x = -0.45;
  g.add(pagine);
  const segnalibro = mesh(geo.scatola(0.06, 0.02, 0.3), mat('#e2683a'), 0.15, 0.85, 0.28);
  segnalibro.rotation.x = 0.4;
  g.add(segnalibro);
  return contorno(g);
}

// ---------- costruzioni che Giada sblocca con le ghiande ----------

export const pietra = () => mat('#ffffff', { map: texture(64, macchie(['#9c968c', '#857f76', '#b2aca2', '#6f6a62'], 1.2, 41)), rim: 0.15 });
export const assi = () => mat('#ffffff', { map: texture(64, macchie(['#9a6c44', '#83592f', '#b08050'], 1, 23)), rim: 0.1 });

export function creaCartello(nome: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.6));
  for (const x of [-0.55, 0.55]) g.add(mesh(geo.cil(0.06, 0.07, 1.4, 8), assi(), x, 0.7, 0));
  const tavola = mesh(geo.scatola(1.5, 0.55, 0.08), mat('#ffffff', { map: texture(256, (c, l) => {
    c.fillStyle = '#b08050'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#9a6c44'; for (let y = 0; y < l; y += 22) c.fillRect(0, y, l, 3);
    c.fillStyle = '#fff3d6'; c.font = `900 ${l * 0.17}px 'Nunito Variable', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = '#4a3020';
    const testo = nome.length > 16 ? nome.slice(0, 15) + '…' : nome;
    c.strokeText(testo, l / 2, l / 2); c.fillText(testo, l / 2, l / 2);
  }), rim: 0 }), 0, 1.15, 0.02);
  tavola.scale.y = 1;
  g.add(tavola);
  return contorno(g);
}

export function creaAiuola(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = mesh(geo.palla(0.13, 8), pietra(), Math.cos(a) * 0.75, 0.06, Math.sin(a) * 0.55);
    s.scale.y = 0.6;
    g.add(s);
  }
  const terriccio = mesh(geo.cil(0.72, 0.72, 0.06, 18), mat('#6b4a30'), 0, 0.03, 0);
  terriccio.scale.z = 0.75;
  g.add(terriccio);
  const colori = ['#ff6f91', '#ffd166', '#ffffff', '#b39ddb', '#ff7b54', '#7fc8f8'];
  for (let i = 0; i < 16; i++) {
    const f = creaFiore(colori[i % colori.length]);
    const a = i * 2.4, d = 0.15 + (i % 4) * 0.13;
    f.position.set(Math.cos(a) * d, 0.04, Math.sin(a) * d * 0.75);
    f.scale.setScalar(1.3);
    g.add(f);
  }
  return g;
}

export function creaStaccionata(raggio = 1.5): THREE.Group {
  const g = new THREE.Group();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i === 3) continue; // il cancelletto aperto
    const paletto = mesh(geo.scatola(0.1, 0.6, 0.06), assi(), Math.cos(a) * raggio, 0.3, Math.sin(a) * raggio);
    paletto.rotation.y = -a + Math.PI / 2;
    g.add(paletto);
    const b = (i + 0.5) / n * Math.PI * 2;
    const trave = mesh(geo.scatola(0.06, 0.07, raggio * 0.52), assi(), Math.cos(b) * raggio * 0.98, 0.42, Math.sin(b) * raggio * 0.98);
    trave.rotation.y = -b;
    g.add(trave);
  }
  return contorno(g);
}

export function creaPanchina(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.7));
  g.add(mesh(geo.scatola(1.2, 0.08, 0.38), assi(), 0, 0.42, 0));
  const schienale = mesh(geo.scatola(1.2, 0.3, 0.06), assi(), 0, 0.68, -0.18);
  schienale.rotation.x = -0.15;
  g.add(schienale);
  for (const x of [-0.5, 0.5]) for (const z of [-0.14, 0.14]) g.add(mesh(geo.cil(0.04, 0.04, 0.42, 6), mat('#4a3a2c'), x, 0.21, z));
  return contorno(g);
}

export function creaFalo(): { gruppo: THREE.Group; fiamma: THREE.Mesh } {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = mesh(geo.palla(0.14, 8), pietra(), Math.cos(a) * 0.5, 0.07, Math.sin(a) * 0.5);
    s.scale.y = 0.7;
    g.add(s);
  }
  for (let i = 0; i < 4; i++) {
    const l = mesh(geo.cil(0.06, 0.07, 0.7, 6), assi(), 0, 0.18, 0);
    l.rotation.set(1.15, (i / 4) * Math.PI * 2, 0);
    l.position.set(Math.sin((i / 4) * Math.PI * 2) * 0.12, 0.2, Math.cos((i / 4) * Math.PI * 2) * 0.12);
    g.add(l);
  }
  const fiamma = mesh(geo.cono(0.22, 0.6, 8), mat('#ffb347', { emissive: '#ff7a1a', emissiveIntensity: 1.6, rim: 0 }), 0, 0.5, 0);
  fiamma.userData.senzaContorno = true;
  g.add(fiamma);
  const cuore = mesh(geo.cono(0.12, 0.38, 8), mat('#fff0a0', { emissive: '#ffd060', emissiveIntensity: 2, rim: 0 }), 0, 0.42, 0);
  cuore.userData.senzaContorno = true;
  g.add(cuore);
  return { gruppo: g, fiamma };
}

/** Il contorno un po' irregolare del laghetto (raggi x 2,4 e z 1,6). */
const RX_LAGO = 2.4, RZ_LAGO = 1.6;
function rivaLago(th: number) {
  return 1 + Math.sin(th * 3 + 0.6) * 0.07 + Math.cos(th * 5) * 0.04;
}
function formaLago(scala: number) {
  const f = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const th = (i / 48) * Math.PI * 2, r = rivaLago(th) * scala;
    const x = Math.cos(th) * RX_LAGO * r, y = -Math.sin(th) * RZ_LAGO * r;
    if (i === 0) f.moveTo(x, y); else f.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(f);
}
/** Se il punto (in coordinate del lago) è nell'acqua, il punto più vicino sulla riva (a k volte il bordo); se no null. */
export function fuoriDalLago(x: number, z: number, k = 1.05): [number, number] | null {
  const nx = x / RX_LAGO, nz = z / RZ_LAGO;
  const n = Math.hypot(nx, nz), th = Math.atan2(nz, nx);
  const bordo = rivaLago(th) * k;
  if (n >= bordo) return null;
  if (n < 1e-4) return puntoLago(th, k);
  return [x * (bordo / n), z * (bordo / n)];
}

/** Un punto sulla riva (o dentro il lago, con k < 1). */
export function puntoLago(th: number, k = 1): [number, number] {
  const r = rivaLago(th) * k;
  return [Math.cos(th) * RX_LAGO * r, Math.sin(th) * RZ_LAGO * r];
}

/** Un pesciolino arancione-argento (per i salti nel laghetto). */
function pesciolino(colore: string) {
  const g = new THREE.Group();
  const corpo = mesh(geo.palla(0.12, 10), materiale({ color: colore, rim: 0.5 }));
  corpo.scale.set(0.55, 0.75, 1.5);
  g.add(corpo);
  const coda = mesh(geo.cono(0.1, 0.14, 6), mat(colore, { rim: 0.5 }), 0, 0, -0.22);
  coda.rotation.x = -Math.PI / 2;
  coda.scale.x = 0.3;
  g.add(coda);
  return g;
}

/**
 * Il laghetto: acqua con la riva di sabbia, ninfee fiorite, canne palustri, sassi,
 * un pontiletto di legno per pescare e i pesci che ogni tanto saltano (vedi animaLaghetto).
 */
export function creaLaghetto(): THREE.Group {
  const g = new THREE.Group();
  const piatto = (geom: THREE.BufferGeometry, m: THREE.Material, y: number) => {
    const o = mesh(geom, m);
    o.rotation.x = -Math.PI / 2;
    o.position.y = y;
    o.userData.senzaContorno = true;
    g.add(o);
    return o;
  };
  const sopra = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  piatto(formaLago(1.16), materiale({ color: '#e6d3a0', rim: 0.2, ...sopra }), 0.015);
  const acqua = piatto(formaLago(1), materiale({ color: '#4f9fd4', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), 0.03);
  acqua.name = 'acqua';
  // il centro più profondo e qualche riflesso
  piatto(formaLago(0.6), materiale({ color: '#3a86c0', emissive: '#1e5a86', emissiveIntensity: 0.25, rim: 0.4, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }), 0.035);
  for (const [x, z, l] of [[-0.6, -0.5, 0.5], [0.5, 0.35, 0.35], [-1.1, 0.5, 0.3]]) {
    const r = mesh(geo.scatola(l, 0.01, 0.05), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5, rim: 0 }), x, 0.045, z);
    r.userData.senzaContorno = true;
    g.add(r);
  }
  // sassi sulla riva (ma non davanti al pontile)
  for (let i = 0; i < 14; i++) {
    const th = (i / 14) * Math.PI * 2 + 0.2;
    if (Math.abs(th - Math.PI * 0.5) < 0.35) continue;
    const s = creaSasso(0.32 + (i % 3) * 0.1);
    const [x, z] = puntoLago(th, 1.1);
    s.position.set(x, s.position.y, z);
    g.add(s);
  }
  // canne palustri con il pennacchio marrone, a ciuffi
  const verde = mat('#5a9a3a', { rim: 0.2 }), marrone = mat('#7a4a26', { rim: 0.2 });
  for (const [th, n] of [[2.6, 6], [3.3, 5], [5.6, 6], [0.2, 4]] as const) {
    const ciuffo = new THREE.Group();
    const [x, z] = puntoLago(th, 0.98);
    ciuffo.position.set(x, 0, z);
    for (let k = 0; k < n; k++) {
      const h = 0.7 + ((k * 37) % 10) / 20;
      const dx = Math.cos(k * 2.3) * 0.18, dz = Math.sin(k * 2.3) * 0.14;
      const stelo = mesh(geo.cil(0.012, 0.018, h, 4), verde, dx, h / 2, dz);
      stelo.rotation.z = Math.cos(k * 1.7) * 0.12;
      ciuffo.add(stelo);
      if (k % 2 === 0) ciuffo.add(mesh(geo.capsula(0.035, 0.14), marrone, dx + stelo.rotation.z * -h / 2, h + 0.02, dz));
      else {
        const foglia = mesh(geo.cono(0.04, h * 0.8, 4), verde, dx * 1.4, h * 0.4, dz * 1.4);
        foglia.scale.z = 0.3;
        foglia.rotation.z = -Math.cos(k) * 0.4;
        ciuffo.add(foglia);
      }
    }
    g.add(ciuffo);
  }
  // ninfee: foglie tonde con lo spicchio, alcune col fiore rosa o bianco
  for (const [x, z, r, fiore] of [[0.9, -0.4, 0.22, '#ff9ab8'], [-0.9, -0.2, 0.18, ''], [-0.4, 0.75, 0.2, '#ffffff'], [1.5, 0.4, 0.16, ''], [-1.5, -0.55, 0.2, '#ff9ab8'], [0.2, -0.9, 0.15, '']] as const) {
    const foglia = mesh(new THREE.CylinderGeometry(r, r, 0.02, 14, 1, false, 0.3, Math.PI * 2 - 0.6), mat('#4f9a50', { rim: 0.3 }), x, 0.05, z);
    foglia.rotation.y = x * 3;
    g.add(foglia);
    if (fiore) {
      const f = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const pe = mesh(geo.cono(0.04, 0.12, 5), mat(fiore, { rim: 0.2 }), Math.cos(k) * 0.04, 0.05, Math.sin(k) * 0.04);
        pe.rotation.set(Math.sin(k) * 0.6, 0, -Math.cos(k) * 0.6);
        f.add(pe);
      }
      f.add(mesh(geo.palla(0.03, 6), mat('#ffd34d'), 0, 0.05, 0));
      f.position.set(x + 0.05, 0.06, z + 0.03);
      g.add(f);
    }
  }
  // il pontile di legno (davanti, dove si pesca)
  const pontile = new THREE.Group();
  const legno = assi();
  for (let i = 0; i < 6; i++) pontile.add(mesh(geo.scatola(0.62, 0.06, 0.2), legno, 0, 0.2, -i * 0.22));
  for (const x of [-0.27, 0.27]) for (const z of [0, -1.1]) pontile.add(mesh(geo.cil(0.045, 0.045, 0.45, 6), legno, x, 0.1, z));
  const [px, pz] = puntoLago(Math.PI * 0.5, 1.05);
  pontile.position.set(px + 0.2, 0, pz);
  pontile.name = 'pontile';
  g.add(pontile);
  // i pesci che saltano e i cerchi nell'acqua
  const salto = pesciolino('#f08a3a');
  salto.name = 'salto';
  salto.visible = false;
  g.add(salto);
  const cerchio = mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 24), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6, rim: 0, transparent: true }), 0, 0.05, 0);
  cerchio.rotation.x = Math.PI / 2;
  cerchio.name = 'cerchio';
  cerchio.userData.senzaContorno = true;
  cerchio.visible = false;
  g.add(cerchio);
  return contorno(g);
}

/** Ogni tanto un pesce salta fuori dall'acqua e lascia un cerchio (t in secondi). */
export function animaLaghetto(g: THREE.Object3D, t: number) {
  const salto = g.getObjectByName('salto');
  const cerchio = g.getObjectByName('cerchio') as THREE.Mesh | undefined;
  if (!salto || !cerchio) return;
  const periodo = 4.5, n = Math.floor(t / periodo), f = t / periodo - n;
  const r = rng(hash('salto' + n));
  const [x, z] = puntoLago(r() * Math.PI * 2, 0.25 + r() * 0.45);
  const durata = 0.18; // in frazione del periodo
  salto.visible = f < durata;
  if (salto.visible) {
    const k = f / durata;
    salto.position.set(x + (k - 0.5) * 0.5, 0.05 + Math.sin(k * Math.PI) * 0.55, z);
    salto.rotation.set(0, Math.PI / 2, 0);
    salto.rotateX(-(k - 0.5) * 2.4);
    ((salto.children[0] as THREE.Mesh).material as THREE.MeshToonMaterial).color.set(r() < 0.5 ? '#f08a3a' : '#b8c8d8');
  }
  const c = (f - durata * 0.9) / 0.35;
  cerchio.visible = c > 0 && c < 1;
  if (cerchio.visible) {
    cerchio.position.set(x + 0.25, 0.05, z);
    cerchio.scale.setScalar(0.5 + c * 2.5);
    (cerchio.material as THREE.MeshToonMaterial).opacity = 1 - c;
  }
}

export function creaPonticello(): THREE.Group {
  const g = new THREE.Group();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const asse = mesh(geo.scatola(0.3, 0.06, 0.8), assi(), t * 3.6, 0.3 + Math.cos(t * Math.PI) * 0.35, 0);
    asse.rotation.z = -Math.sin(t * Math.PI) * 0.45;
    g.add(asse);
  }
  for (const z of [-0.42, 0.42]) for (let i = 0; i <= 4; i++) {
    const t = i / 4 - 0.5;
    g.add(mesh(geo.cil(0.04, 0.04, 0.5, 6), assi(), t * 3.3, 0.55 + Math.cos(t * Math.PI) * 0.35, z));
  }
  return contorno(g);
}

export function creaPozzo(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1));
  const muro = mesh(geo.cil(0.6, 0.65, 0.7, 16), pietra(), 0, 0.35, 0);
  g.add(muro);
  g.add(mesh(geo.cil(0.48, 0.48, 0.05, 16), mat('#20303a'), 0, 0.68, 0));
  for (const x of [-0.55, 0.55]) g.add(mesh(geo.cil(0.06, 0.06, 1.3, 6), assi(), x, 1.2, 0));
  const tetto = mesh(geo.cono(0.95, 0.55, 4), mat('#a0503a', { rim: 0.3 }), 0, 2.05, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  const rullo = mesh(geo.cil(0.07, 0.07, 1.1, 8), assi(), 0, 1.5, 0);
  rullo.rotation.z = Math.PI / 2;
  g.add(rullo);
  g.add(mesh(geo.cil(0.12, 0.1, 0.18, 10), mat('#7a6a5a'), 0, 1.15, 0));
  return contorno(g);
}

export function creaTorretta(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.1));
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const p = mesh(geo.cil(0.07, 0.09, 3, 6), assi(), x * 0.85, 1.5, z * 0.85);
    p.rotation.set(z * 0.08, 0, -x * 0.08);
    g.add(p);
  }
  g.add(mesh(geo.scatola(1.3, 0.1, 1.3), assi(), 0, 3.0, 0));
  for (const s of [-1, 1]) {
    g.add(mesh(geo.scatola(1.3, 0.3, 0.06), assi(), 0, 3.2, s * 0.62));
    g.add(mesh(geo.scatola(0.06, 0.3, 1.3), assi(), s * 0.62, 3.2, 0));
  }
  const tetto = mesh(geo.cono(1.1, 0.8, 4), mat('#3b4a7a', { rim: 0.3 }), 0, 3.8, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  const bandiera = mesh(geo.scatola(0.4, 0.25, 0.02), mat('#e2683a'), 0.22, 4.45, 0);
  g.add(bandiera);
  g.add(mesh(geo.cil(0.02, 0.02, 0.5, 5), mat('#4a3a2c'), 0, 4.35, 0));
  return contorno(g);
}

export function creaMulino(): { gruppo: THREE.Group; pale: THREE.Group } {
  const g = new THREE.Group();
  g.add(ombra(1.5));
  g.add(mesh(geo.cil(0.8, 1.1, 2.6, 12), mat('#ece0c8', { map: texture(64, macchie(['#ece0c8', '#ddd0b4', '#f6eedc'], 0.6, 61)) }), 0, 1.3, 0));
  g.add(mesh(geo.cono(1.0, 1.0, 12), mat('#8a4a34', { rim: 0.3 }), 0, 3.1, 0));
  g.add(mesh(geo.scatola(0.4, 0.7, 0.05), mat('#6a4a2e'), 0, 0.35, 1.02));
  const pale = new THREE.Group();
  pale.position.set(0, 2.4, 0.95);
  for (let i = 0; i < 4; i++) {
    const braccio = new THREE.Group();
    braccio.rotation.z = (i / 4) * Math.PI * 2;
    braccio.add(mesh(geo.scatola(0.08, 1.6, 0.05), assi(), 0, 0.8, 0));
    braccio.add(mesh(geo.scatola(0.4, 1.2, 0.02), mat('#f6eedc'), 0.22, 0.95, 0.03));
    pale.add(braccio);
  }
  pale.add(mesh(geo.palla(0.14, 10), mat('#6a4a2e'), 0, 0, 0.05));
  g.add(pale);
  contorno(g);
  return { gruppo: g, pale };
}

// ---------- edifici ----------

export function legnoMat() {
  return mat('#ffffff', { map: texture(64, macchie(['#c48c58', '#b07a48', '#d6a06a'], 1, 21)) });
}

export function creaChiosco(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.4));
  const legno = legnoMat();
  g.add(mesh(geo.scatola(2, 0.9, 0.8), legno, 0, 0.45, 0.3));
  g.add(mesh(geo.scatola(2.1, 0.08, 0.95), mat('#f0dcb4'), 0, 0.94, 0.3));
  for (const x of [-0.95, 0.95]) g.add(mesh(geo.cil(0.06, 0.06, 2.1, 8), legno, x, 1.05, -0.05));
  const tenda = mesh(geo.scatola(2.3, 0.08, 1.3), mat('#ffffff', { map: texture(64, strisce('#e8584a', '#fff4e0', 6)) }), 0, 2.15, 0.25);
  tenda.rotation.x = 0.25;
  g.add(tenda);
  g.add(mesh(geo.cil(0.22, 0.18, 0.25, 12), mat('#6a6a78'), -0.5, 1.1, 0.3));
  return contorno(g);
}

export function creaPiazzaMusica(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(1.3, 1.4, 0.25, 24), mat('#ffffff', { map: texture(64, macchie(['#e0d6c6', '#cfc3b0', '#ece4d6'], 1, 31)) }), 0, 0.12, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(geo.cil(0.07, 0.07, 1.6, 8), mat('#8a5a36'), Math.cos(a) * 1.15, 1.0, Math.sin(a) * 1.15));
  }
  g.add(mesh(geo.cono(1.6, 0.8, 12), mat('#6a8fd8', { rim: 0.4 }), 0, 2.2, 0));
  g.add(mesh(geo.palla(0.12), mat('#f2c94c'), 0, 2.65, 0));
  return contorno(g);
}

/** Casetta-bottega di un mestiere: ogni animale con un lavoro si costruisce la sua. */
export function creaBottegaMestiere(mestiere: string, colore: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.1));
  g.add(mesh(geo.scatola(1.3, 1.0, 1.1), mat('#f3e3c0', { map: texture(64, macchie(['#f3e3c0', '#e8d4ac', '#fbefd6'], 0.6, mestiere.length)) }), 0, 0.5, 0));
  const tetto = mesh(geo.cono(1.15, 0.8, 4), mat(colore, { rim: 0.4 }), 0, 1.4, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  g.add(mesh(geo.scatola(0.36, 0.6, 0.05), mat('#7a5232'), 0, 0.3, 0.56));
  g.add(mesh(geo.palla(0.035), mat('#f2c94c'), 0.1, 0.32, 0.6));
  for (const x of [-0.42, 0.42]) {
    g.add(mesh(geo.scatola(0.26, 0.26, 0.05), mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.1 }), x, 0.6, 0.56));
  }
  // insegna con il simbolo del mestiere
  const simboli = SIMBOLI_MESTIERE;
  const insegna = mesh(geo.scatola(0.5, 0.5, 0.04), mat('#ffffff', { map: texture(64, (c, l) => {
    c.fillStyle = '#fff8e7'; c.fillRect(0, 0, l, l);
    c.strokeStyle = '#8a5a36'; c.lineWidth = 6; c.strokeRect(3, 3, l - 6, l - 6);
    c.font = `${l * 0.55}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#4a3424'; c.fillText(simboli[mestiere] ?? '★', l / 2, l / 2 + 2);
  }), rim: 0 }), 0, 1.05, 0.58);
  g.add(insegna);
  return contorno(g);
}

// ---------- arredo: aiuole con le piante di Giada, quadretti ----------

/** Cassetta di legno con il terriccio: 3 posti per le piante, da sinistra a destra. */
export const POSTI_CASSETTA = [-0.48, 0, 0.48];
export function creaCassetta(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.95));
  const legno = assi();
  for (const z of [-0.3, 0.3]) g.add(mesh(geo.scatola(1.6, 0.26, 0.08), legno, 0, 0.13, z));
  for (const x of [-0.78, 0.78]) g.add(mesh(geo.scatola(0.08, 0.26, 0.6), legno, x, 0.13, 0));
  g.add(mesh(geo.scatola(1.5, 0.05, 0.52), mat('#5e3f26'), 0, 0.22, 0));
  for (const x of POSTI_CASSETTA) {
    const buca = mesh(geo.palla(0.1, 8), mat('#4a3020'), x, 0.24, 0);
    buca.scale.y = 0.3;
    g.add(buca);
  }
  return contorno(g);
}

/** Una pianta di Giada. fase 0 seme, 1 germoglio, 2 piantina, 3 fiorita/con i frutti. */
export function creaPianta(specie: string, colore: string, fase: number): THREE.Group {
  const g = new THREE.Group();
  const verde = mat('#4f9a3c', { rim: 0.2 });
  const foglia = (x: number, y: number, z: number, s: number, rot: number) => {
    const f = mesh(geo.palla(0.07, 6), verde, x, y, z);
    f.scale.set(s * 1.6, s * 0.4, s);
    f.rotation.y = rot;
    g.add(f);
  };
  if (fase === 0) {
    const m = mesh(geo.palla(0.08, 6), mat('#7a5232'), 0, 0.02, 0);
    m.scale.y = 0.5;
    g.add(m);
    g.add(mesh(geo.cil(0.01, 0.01, 0.12, 4), mat('#c8b080'), 0.06, 0.08, 0)); // bastoncino col cartellino
    g.add(mesh(geo.scatola(0.08, 0.06, 0.01), mat(colore), 0.06, 0.15, 0));
    return g;
  }
  if (fase === 1) {
    g.add(mesh(geo.cil(0.012, 0.015, 0.12, 4), verde, 0, 0.06, 0));
    foglia(0.04, 0.12, 0, 0.6, 0);
    foglia(-0.04, 0.12, 0, 0.6, Math.PI);
    return g;
  }
  const grande = fase === 3;
  const k = grande ? 1 : 0.6;
  switch (specie) {
    case 'melo': {
      g.add(mesh(geo.cil(0.04, 0.06, 0.7 * k, 6), mat('#8a5a36'), 0, 0.35 * k, 0));
      g.add(mesh(geo.palla(0.38 * k, 10), chioma(2), 0, 0.85 * k, 0));
      if (grande) for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        g.add(mesh(geo.palla(0.06, 6), mat(colore, { rim: 0.3 }), Math.cos(a) * 0.32, 0.8 + (i % 3) * 0.12, Math.sin(a) * 0.32));
      }
      break;
    }
    case 'zucca': {
      for (let i = 0; i < 4; i++) foglia(Math.cos(i * 1.6) * 0.15, 0.05, Math.sin(i * 1.6) * 0.12, 1.4 * k, i);
      if (grande) {
        const z = mesh(geo.palla(0.17, 10), mat(colore, { rim: 0.3 }), 0.05, 0.13, 0.04);
        z.scale.y = 0.75;
        g.add(z);
        g.add(mesh(geo.cil(0.015, 0.02, 0.07, 5), mat('#5e7a2e'), 0.05, 0.27, 0.04));
      }
      break;
    }
    case 'fragola': {
      for (let i = 0; i < 5; i++) foglia(Math.cos(i * 1.25) * 0.1, 0.06, Math.sin(i * 1.25) * 0.1, 1.0 * k, i * 1.25);
      if (grande) for (const [x, z] of [[0.12, 0.08], [-0.1, 0.1], [0.02, -0.12]]) {
        const f = mesh(geo.cono(0.045, 0.08, 6), mat(colore, { rim: 0.3 }), x, 0.05, z);
        f.rotation.x = Math.PI;
        g.add(f);
      }
      break;
    }
    case 'lavanda': {
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, d = (i % 3) * 0.05;
        g.add(mesh(geo.cil(0.008, 0.01, 0.35 * k, 4), verde, Math.cos(a) * d, 0.17 * k, Math.sin(a) * d));
        if (grande) {
          const spiga = mesh(geo.capsula(0.025, 0.1), mat(colore, { rim: 0.3 }), Math.cos(a) * d, 0.38, Math.sin(a) * d);
          g.add(spiga);
        }
      }
      break;
    }
    default: {
      // fiori: uno stelo per ogni fiore (girasole e rosa più alti)
      const def = { girasole: [1, 0.7, 0.13], rosa: [3, 0.45, 0.06], tulipano: [3, 0.32, 0.05], margherita: [4, 0.25, 0.05] }[specie] ?? [3, 0.3, 0.05];
      const [n, h, r] = def;
      for (let i = 0; i < n; i++) {
        const a = i * 2.1, d = n > 1 ? 0.09 : 0;
        const x = Math.cos(a) * d, z = Math.sin(a) * d, hh = h * k * (1 - (i % 2) * 0.15);
        g.add(mesh(geo.cil(0.012, 0.015, hh, 4), verde, x, hh / 2, z));
        foglia(x + 0.04, hh * 0.4, z, 0.7, a);
        if (!grande) continue;
        if (specie === 'tulipano') {
          const c = mesh(geo.palla(r, 8), mat(colore, { rim: 0.3 }), x, hh + 0.02, z);
          c.scale.y = 1.4;
          g.add(c);
        } else if (specie === 'rosa') {
          g.add(mesh(geo.palla(r * 1.2, 8), mat(colore, { rim: 0.3 }), x, hh, z));
        } else {
          const petali = mesh(geo.cil(r * 1.9, r * 1.9, 0.02, 10), mat(colore, { rim: 0.2 }), x, hh, z);
          petali.rotation.x = specie === 'girasole' ? 1.1 : 0;
          g.add(petali);
          const cuore = mesh(geo.palla(r * 0.8, 8), mat(specie === 'girasole' ? '#6a3f1a' : '#ffd34d', { rim: 0 }), x, hh + (specie === 'girasole' ? 0.02 : 0.015), z + (specie === 'girasole' ? 0.02 : 0));
          cuore.scale.y = 0.5;
          if (specie === 'girasole') cuore.rotation.x = 1.1;
          g.add(cuore);
        }
      }
    }
  }
  return g;
}

export const CORNICI = [
  { nome: 'Legno', colore: '#9a6a40' },
  { nome: 'Oro', colore: '#e0b23c' },
  { nome: 'Bianca', colore: '#f4efe6' },
  { nome: 'Blu', colore: '#3f63b8' },
];

/** Un quadretto dipinto da Giada, su un cavalletto. */
export function creaQuadretto(disegno: string, cornice: number): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.5));
  const legno = mat('#8a5a36');
  for (const x of [-0.3, 0.3]) {
    const gamba = mesh(geo.cil(0.025, 0.03, 1.3, 5), legno, x, 0.62, 0);
    gamba.rotation.z = x > 0 ? -0.12 : 0.12;
    g.add(gamba);
  }
  const dietro = mesh(geo.cil(0.025, 0.03, 1.2, 5), legno, 0, 0.55, -0.22);
  dietro.rotation.x = -0.35;
  g.add(dietro);
  g.add(mesh(geo.scatola(0.8, 0.05, 0.08), legno, 0, 0.55, 0.04));
  const quadro = new THREE.Group();
  quadro.position.set(0, 0.98, 0.03);
  quadro.rotation.x = -0.12;
  quadro.add(mesh(geo.scatola(0.84, 0.66, 0.05), mat(CORNICI[cornice]?.colore ?? CORNICI[0].colore, { rim: 0.2 })));
  const tex = new THREE.TextureLoader().load(disegno);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  const tela = mesh(new THREE.PlaneGeometry(0.72, 0.54), mat('#ffffff', { map: tex, rim: 0 }), 0, 0, 0.03);
  tela.userData.senzaContorno = true;
  quadro.add(tela);
  g.add(quadro);
  return contorno(g);
}

// ---------- case degli animali ----------

/** Colori e decorazione della casa secondo l'emozione con cui l'animale è nato. */
const CASA_EMOZIONE: Record<Emozione, { tetto: string; porta: string; muro: string }> = {
  gioia: { tetto: '#f2b43c', porta: '#e8584a', muro: '#fbecc4' },
  fiducia: { tetto: '#5fa86a', porta: '#8a5a36', muro: '#f1ead2' },
  paura: { tetto: '#3f4f8a', porta: '#6a4a8a', muro: '#e6e2ee' },
  sorpresa: { tetto: '#ff8a3c', porta: '#3f8ad8', muro: '#fff1dc' },
  tristezza: { tetto: '#5f8fc8', porta: '#3f5a8a', muro: '#e8eef4' },
  disgusto: { tetto: '#7a9a3c', porta: '#5a3f6a', muro: '#eef0d8' },
  rabbia: { tetto: '#c8463a', porta: '#4a2e20', muro: '#f4e2d0' },
  attesa: { tetto: '#a58be0', porta: '#c87a3a', muro: '#f6eef8' },
};


/**
 * La casa di un animale: la forma dipende dalla specie, i colori e la decorazione dall'emozione
 * della pagina con cui è nato. Crescendo la abbellisce (vasi, recinto, comignolo...).
 * È grande: circa 2,5 metri di lato, porta davanti (verso +z).
 */
export function creaCasaAnimale(specie: Specie, emozione: Emozione, fase: Fase, mestiere: string | null, livelloCasa = 1, ampliamenti: string[] = []): THREE.Group {
  const g = new THREE.Group();
  const c = CASA_EMOZIONE[emozione] ?? CASA_EMOZIONE.gioia;
  const muro = mat('#ffffff', { map: texture(64, macchie([c.muro, '#' + new THREE.Color(c.muro).offsetHSL(0, 0, -0.06).getHexString(), c.muro], 0.6, specie.length + emozione.length)) });
  const tetto = mat(c.tetto, { rim: 0.4 });
  const porta = mat(c.porta);
  const vetro = mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.15 });
  const legno = legnoMat();
  g.add(ombra(1.9));
  let fronte = 1.1; // z della facciata
  let altPorta = 0;
  switch (specie) {
    case 'tasso': {
      // collinetta erbosa con la porta tonda
      const colle = mesh(geo.palla(1.5, 16), mat('#6ba552', { rim: 0.3 }), 0, 0, 0);
      colle.scale.set(1.1, 0.85, 1);
      g.add(colle);
      const pd = mesh(geo.cil(0.5, 0.5, 0.1, 18), porta, 0, 0.55, 1.42);
      pd.rotation.x = Math.PI / 2;
      g.add(pd);
      const cornice = mesh(new THREE.TorusGeometry(0.52, 0.07, 6, 18), mat('#8a7a6a'), 0, 0.55, 1.44);
      g.add(cornice);
      for (const x of [-0.95, 0.95]) {
        const f = mesh(geo.cil(0.2, 0.2, 0.08, 12), vetro, x, 0.65, 1.12);
        f.rotation.x = Math.PI / 2 - 0.5;
        g.add(f);
      }
      fronte = 1.45;
      altPorta = 0.55;
      break;
    }
    case 'riccio': {
      // capanna a cupola di foglie a scaglie
      g.add(mesh(geo.cil(1.2, 1.25, 0.9, 14), muro, 0, 0.45, 0));
      for (let i = 0; i < 4; i++) {
        const strato = mesh(geo.cono(1.55 - i * 0.32, 0.6, 14), mat(i % 2 ? c.tetto : '#c8803a', { rim: 0.4 }), 0, 1.1 + i * 0.38, 0);
        g.add(strato);
      }
      g.add(mesh(geo.scatola(0.6, 0.85, 0.08), porta, 0, 0.42, 1.21));
      fronte = 1.25;
      break;
    }
    case 'scoiattolo': {
      // casetta sull'albero: tronco, piattaforma e scaletta
      g.add(mesh(geo.cil(0.35, 0.5, 1.6, 10), mat('#ffffff', { map: texture(64, macchie(['#8a5a36', '#6d4428', '#a06a40'], 1, 11)) }), 0, 0.8, 0));
      g.add(mesh(geo.cil(1.3, 1.3, 0.12, 12), legno, 0, 1.6, 0));
      g.add(mesh(geo.scatola(1.6, 1.1, 1.4), muro, 0, 2.2, 0));
      const t2 = mesh(geo.cono(1.35, 0.9, 4), tetto, 0, 3.2, 0);
      t2.rotation.y = Math.PI / 4;
      g.add(t2);
      g.add(mesh(geo.scatola(0.5, 0.8, 0.06), porta, 0, 2.05, 0.72));
      for (let i = 0; i < 5; i++) g.add(mesh(geo.scatola(0.5, 0.05, 0.06), legno, 0, 0.25 + i * 0.3, 1.25));
      for (const x of [-0.25, 0.25]) {
        const st = mesh(geo.cil(0.03, 0.03, 1.7, 5), legno, x, 0.8, 1.2);
        st.rotation.x = -0.12;
        g.add(st);
      }
      fronte = 0.73;
      altPorta = 2.05;
      break;
    }
    case 'lepre': {
      // casa tonda di pietra con il tetto di paglia
      g.add(mesh(geo.cil(1.15, 1.2, 1.3, 16), pietra(), 0, 0.65, 0));
      g.add(mesh(geo.cono(1.55, 1.3, 16), mat('#e2c46a', { rim: 0.4 }), 0, 1.95, 0));
      g.add(mesh(geo.palla(0.16, 8), tetto, 0, 2.65, 0));
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 1.18));
      fronte = 1.2;
      break;
    }
    case 'daino': {
      // casa alta di legno chiaro, due piani, tetto ripido
      g.add(mesh(geo.scatola(2.0, 2.0, 1.6), muro, 0, 1.0, 0));
      const t2 = mesh(geo.cono(1.75, 1.3, 4), tetto, 0, 2.65, 0);
      t2.rotation.y = Math.PI / 4;
      t2.scale.z = 0.8;
      g.add(t2);
      g.add(mesh(geo.scatola(0.55, 0.95, 0.08), porta, 0, 0.48, 0.82));
      for (const x of [-0.6, 0.6]) g.add(mesh(geo.scatola(0.35, 0.35, 0.06), vetro, x, 1.5, 0.82));
      fronte = 0.82;
      break;
    }
    case 'mucca':
    case 'cavallo': {
      // il fienile (mucca) e la scuderia (cavallo): tetto a capanna, porte grandi con la croce bianca
      const stalla = specie === 'cavallo';
      const L = stalla ? 2.5 : 2.1, H = stalla ? 1.4 : 1.7, P = 1.7;
      g.add(mesh(geo.scatola(L, H, P), muro, 0, H / 2, 0));
      const tA = tettoA(L + 0.3, stalla ? 0.9 : 1.2, P + 0.3, tetto);
      tA.position.y = H;
      g.add(tA);
      fronte = P / 2;
      const bianco = mat('#fbf8f2');
      if (stalla) {
        // porta a due metà, come nelle scuderie, e il ferro di cavallo portafortuna
        g.add(mesh(geo.scatola(0.7, 0.55, 0.08), porta, 0, 0.3, fronte + 0.02));
        g.add(mesh(geo.scatola(0.7, 0.5, 0.08), porta, 0, 0.88, fronte + 0.05));
        const ferro = mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI * 1.3), mat('#c8c8d0', { rim: 0.6 }), 0, 1.25, fronte + 0.06);
        ferro.rotation.z = -Math.PI * 0.15 + Math.PI;
        g.add(ferro);
        for (const x of [-0.85, 0.85]) g.add(mesh(geo.scatola(0.4, 0.35, 0.06), vetro, x, 0.85, fronte + 0.01));
        altPorta = 0.55;
      } else {
        g.add(mesh(geo.scatola(0.95, 1.05, 0.08), porta, 0, 0.53, fronte + 0.02));
        for (const r of [0.83, -0.83]) {
          const asse = mesh(geo.scatola(0.08, 1.35, 0.03), bianco, 0, 0.53, fronte + 0.07);
          asse.rotation.z = r;
          g.add(asse);
        }
        g.add(mesh(geo.scatola(1.05, 0.08, 0.04), bianco, 0, 1.08, fronte + 0.07));
        // la finestrella del fienile, con il fieno che spunta
        g.add(mesh(geo.scatola(0.45, 0.4, 0.06), mat('#5a3a20'), 0, H + 0.4, fronte + 0.17));
        g.add(mesh(geo.palla(0.16, 8), mat('#e8c860', { rim: 0.3 }), 0, H + 0.3, fronte + 0.24));
        altPorta = 0.55;
      }
      // una balla di fieno di lato
      const balla = mesh(geo.cil(0.32, 0.32, 0.5, 12), mat('#e2c46a', { rim: 0.3 }), L / 2 + 0.35, 0.32, 0.3);
      balla.rotation.x = Math.PI / 2;
      g.add(balla);
      break;
    }
    case 'asino': {
      // la casetta dell'asinello: di pietra, con la tettoia di legno e il fieno sotto
      g.add(mesh(geo.scatola(1.7, 1.3, 1.5), pietra(), -0.2, 0.65, 0));
      const tA = tettoA(1.95, 0.8, 1.75, tetto);
      tA.position.set(-0.2, 1.3, 0);
      g.add(tA);
      const tettoia = mesh(geo.scatola(1.0, 0.08, 1.5), legno, 1.1, 1.15, 0.05);
      tettoia.rotation.z = -0.25;
      g.add(tettoia);
      for (const z of [-0.6, 0.65]) g.add(mesh(geo.cil(0.05, 0.05, 1.05, 6), legno, 1.5, 0.52, z));
      const fieno = mesh(geo.palla(0.4, 10), mat('#e2c46a', { rim: 0.3 }), 1.05, 0.25, 0);
      fieno.scale.set(1, 0.6, 1.2);
      g.add(fieno);
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, -0.2, 0.45, 0.77));
      g.add(mesh(geo.scatola(0.32, 0.32, 0.06), vetro, -0.75, 0.85, 0.77));
      fronte = 0.77;
      break;
    }
    case 'maiale': {
      // casetta di mattoni con il comignolo, le finestre tonde e la pozzanghera di fango
      const mattoni = mat('#ffffff', { map: texture(64, (cx, l) => {
        cx.fillStyle = '#e8eae4'; cx.fillRect(0, 0, l, l);
        for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) {
          cx.fillStyle = ['#c8644a', '#b85a42', '#d4765a'][(r + k + 3) % 3];
          cx.fillRect(k * 16 + (r % 2) * 8 + 1, r * 8 + 1, 14, 6);
        }
      }, 2) });
      g.add(mesh(geo.scatola(2.0, 1.35, 1.7), mattoni, 0, 0.68, 0));
      const tA = tettoA(2.35, 0.95, 2.0, tetto);
      tA.position.y = 1.35;
      g.add(tA);
      g.add(mesh(geo.scatola(0.3, 0.6, 0.3), mattoni, 0.55, 2.0, -0.2));
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 0.87));
      for (const x of [-0.6, 0.6]) {
        const f = mesh(geo.cil(0.18, 0.18, 0.06, 14), vetro, x, 0.85, 0.87);
        f.rotation.x = Math.PI / 2;
        g.add(f);
      }
      const fango = mesh(geo.cil(0.5, 0.5, 0.03, 14), mat('#7a5232', { rim: 0.4 }), 1.35, 0.02, 1.0);
      fango.scale.z = 0.65;
      fango.userData.senzaContorno = true;
      g.add(fango);
      fronte = 0.87;
      break;
    }
    case 'uccellino': {
      // una grande casetta per uccelli in cima a un palo, con il posatoio davanti al buco
      g.add(mesh(geo.cil(0.12, 0.15, 1.5, 8), legno, 0, 0.75, 0));
      g.add(mesh(geo.scatola(1.5, 1.25, 1.3), muro, 0, 2.1, 0));
      const tA = tettoA(1.8, 0.75, 1.6, tetto);
      tA.position.y = 2.72;
      g.add(tA);
      const buco = mesh(geo.cil(0.27, 0.27, 0.06, 16), mat('#3a2418'), 0, 2.15, 0.66);
      buco.rotation.x = Math.PI / 2;
      g.add(buco);
      const posatoio = mesh(geo.cil(0.035, 0.035, 0.35, 6), legno, 0, 1.78, 0.8);
      posatoio.rotation.x = Math.PI / 2;
      g.add(posatoio);
      // qualche fiorellino ai piedi del palo
      for (const [x, z] of [[-0.35, 0.3], [0.3, 0.35]]) { const f = creaFiore('#ff9ab8'); f.scale.setScalar(2); f.position.set(x, 0, z); g.add(f); }
      fronte = 0.66;
      altPorta = 2.15;
      break;
    }
    case 'papera': {
      // la casetta a punta della paperella, con il suo stagno davanti e la passerella
      const tA = tettoA(2.0, 1.7, 1.8, tetto);
      g.add(tA);
      g.add(mesh(geo.scatola(1.5, 0.3, 1.6), muro, 0, 0.15, 0));
      const pd = mesh(geo.cil(0.36, 0.36, 0.08, 16), porta, 0, 0.55, 0.88);
      pd.rotation.x = Math.PI / 2;
      g.add(pd);
      const stagno = mesh(new THREE.CircleGeometry(0.75, 20), materiale({ color: '#5aa8d8', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      stagno.rotation.x = -Math.PI / 2;
      stagno.position.set(1.3, 0.03, 1.25);
      stagno.scale.set(1, 0.7, 1);
      stagno.userData.senzaContorno = true;
      g.add(stagno);
      for (let i = 0; i < 4; i++) g.add(mesh(geo.scatola(0.5, 0.05, 0.14), legno, 0, 0.05, 1.1 + i * 0.17));
      fronte = 0.88;
      altPorta = 0.55;
      break;
    }
    default: {
      // volpe: casetta col tetto spiovente e il comignolo
      g.add(mesh(geo.scatola(2.0, 1.4, 1.7), muro, 0, 0.7, 0));
      const t2 = mesh(geo.cono(1.7, 1.1, 4), tetto, 0, 1.95, 0);
      t2.rotation.y = Math.PI / 4;
      g.add(t2);
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 0.87));
      for (const x of [-0.6, 0.6]) g.add(mesh(geo.scatola(0.35, 0.35, 0.06), vetro, x, 0.8, 0.87));
      fronte = 0.87;
    }
  }
  if (!altPorta) altPorta = 0.45;
  g.add(mesh(geo.palla(0.04), mat('#f2c94c'), 0.15, altPorta, fronte + 0.04));
  dettagliCasa(g, { vetro, porta, tetto, colore: c.tetto, muro: c.muro });

  // insegna del mestiere sopra la porta, con la scritta; davanti il bancone e gli attrezzi del mestiere
  if (mestiere) {
    const ins = creaInsegnaMestiere(mestiere);
    // sopra la porta; dove il tetto sporge (riccio, lepre) appoggiata sul tetto, sullo scoiattolo appesa sotto la piattaforma
    const dove: Partial<Record<Specie, [number, number, number, number]>> = {
      riccio: [0, 1.32, 1.34, -0.35], lepre: [0, 1.85, 1.1, -0.6], uccellino: [0, 1.5, 0.75, 0], papera: [0, 1.15, 0.6, -0.5], scoiattolo: [1.15, 1.22, 1.08, 0], tasso: [0, altPorta + 0.8, fronte + 0.12, -0.15],
    };
    // con il portico (casa migliorata) l'insegna sale sopra il tettuccio, sul davanti, così si legge da lontano
    const [xi, yi, zi, ri] = livelloCasa >= 2 ? [0, altPorta + 1.38, fronte + 0.72, -0.12] : dove[specie] ?? [0, altPorta + 0.68, fronte + 0.1, 0];
    ins.position.set(xi, yi, zi);
    ins.rotation.x = ri;
    g.add(ins);
    g.add(creaAttrezziMestiere(mestiere, fronte));
  }

  // davanti alla casa il giardinetto, pensato come un piccolo set col suo tema (secondo l'emozione);
  // dietro e intorno i pezzi che l'animale si è costruito da solo col tempo (vedi lib/ampliamenti.ts)
  void fase;
  g.add(creaGiardinetto(emozione, c, fronte));
  if (ampliamenti.length) creaAmpliamenti(g, specie, ampliamenti, c, fronte);
  if (livelloCasa >= 2) miglioraCasa(g, specie, c, livelloCasa, fronte, altPorta);
  unisciPezzi(g); // tutti i dettagli in pochi pezzi: la casa è ricca ma leggera da disegnare
  return contorno(g);
}

/** Tegole dipinte: file di squame con l'ombra sotto e la luce sopra (per i tetti a punta). */
const cacheTegole = new Map<string, THREE.MeshToonMaterial>();
function tegole(colore: string): THREE.MeshToonMaterial {
  let m = cacheTegole.get(colore);
  if (m) return m;
  const base = new THREE.Color(colore);
  const scuro = '#' + base.clone().offsetHSL(0, 0.02, -0.14).getHexString();
  const chiaro = '#' + base.clone().offsetHSL(0, -0.02, 0.08).getHexString();
  const t = texture(128, (cx, l) => {
    cx.fillStyle = colore;
    cx.fillRect(0, 0, l, l);
    const file = 6, w = l / 8, h = l / file;
    for (let r = 0; r < file; r++) {
      for (let k = -1; k < 9; k++) {
        const x = k * w + (r % 2) * w / 2, y = r * h;
        // squama: mezzo tondo verso il basso, ombra sul bordo, luce in alto
        cx.fillStyle = (k + r) % 3 === 0 ? chiaro : colore;
        cx.beginPath();
        cx.moveTo(x, y);
        cx.lineTo(x + w, y);
        cx.lineTo(x + w, y + h * 0.55);
        cx.quadraticCurveTo(x + w / 2, y + h * 1.15, x, y + h * 0.55);
        cx.closePath();
        cx.fill();
        cx.strokeStyle = scuro;
        cx.lineWidth = 2;
        cx.stroke();
      }
    }
  });
  t.repeat.set(4, 3);
  m = mat('#ffffff', { map: t, rim: 0.4 });
  cacheTegole.set(colore, m);
  return m;
}

/**
 * I dettagli che rendono vera una casetta, uguali per tutte le specie:
 * cornici e davanzali alle finestre (con la crocetta e le persiane), stipiti, assi e gradino alla porta,
 * tegole sui tetti a punta. Si guardano i pezzi già messi (finestre, porta, tetto) e si decorano lì.
 */
function dettagliCasa(g: THREE.Group, o: { vetro: THREE.Material; porta: THREE.Material; tetto: THREE.Material; colore: string; muro: string }) {
  const cornice = mat('#fbf3e4', { rim: 0.3 });
  const legnoScuro = mat(varia(o.colore, 0, -0.12));
  const persiana = mat(varia(o.colore, 0.02, -0.04), { rim: 0.3 });
  const assi = mat(varia('#6a4a30', 0, 0), { rim: 0 });
  const sasso = mat('#c9c0b2', { rim: 0.3 });
  const fiori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb'];
  const nuovi: THREE.Object3D[] = [];
  const vicino = (pezzo: THREE.Mesh, figlio: THREE.Object3D) => {
    // il dettaglio sta nello stesso posto (e girato allo stesso modo) del pezzo che decora
    const d = new THREE.Group();
    d.position.copy(pezzo.position);
    d.quaternion.copy(pezzo.quaternion);
    d.add(figlio);
    nuovi.push(d);
    return figlio;
  };
  let i = 0;
  for (const c of [...g.children]) {
    if (!(c instanceof THREE.Mesh)) continue;
    const p = (c.geometry as THREE.BufferGeometry & { parameters?: Record<string, number> }).parameters ?? {};
    const tipo = c.geometry.type;
    if (c.material === o.vetro && tipo === 'BoxGeometry') {
      // finestra quadrata: cornice, crocetta, davanzale con un vasetto, persiane aperte
      const w = p.width * c.scale.x, h = p.height * c.scale.y, z = p.depth / 2 + 0.012;
      const sp = 0.045;
      vicino(c, mesh(geo.scatola(w + sp * 2, sp, 0.05), cornice, 0, h / 2 + sp / 2, z - 0.015));
      vicino(c, mesh(geo.scatola(sp, h, 0.05), cornice, -w / 2 - sp / 2, 0, z - 0.015));
      vicino(c, mesh(geo.scatola(sp, h, 0.05), cornice, w / 2 + sp / 2, 0, z - 0.015));
      vicino(c, mesh(geo.scatola(sp * 0.6, h, 0.03), cornice, 0, 0, z));
      vicino(c, mesh(geo.scatola(w, sp * 0.6, 0.03), cornice, 0, 0, z));
      vicino(c, mesh(geo.scatola(w + sp * 3.5, sp * 1.3, 0.16), cornice, 0, -h / 2 - sp * 0.6, z + 0.05));
      if (w > 0.28) {
        for (const lato of [-1, 1]) {
          const pe = vicino(c, mesh(geo.scatola(w * 0.48, h * 1.02, 0.03), persiana, lato * (w / 2 + sp + w * 0.24), 0, z - 0.01));
          // le doghe delle persiane
          for (let k = -1; k <= 1; k++) vicino(c, mesh(geo.scatola(w * 0.4, 0.012, 0.012), legnoScuro, pe.position.x, k * h * 0.28, z + 0.008));
        }
      }
      if (i++ % 2 === 0) {
        const vaso = vicino(c, mesh(geo.scatola(w * 0.8, 0.09, 0.12), mat('#c8603a', { rim: 0.2 }), 0, -h / 2 - sp * 0.6 + 0.07, z + 0.07));
        for (let k = 0; k < 3; k++) {
          const f = vicino(c, mesh(geo.palla(0.035, 6), mat(fiori[(k + i) % fiori.length], { rim: 0.2 }), -w * 0.28 + k * w * 0.28, vaso.position.y + 0.07, z + 0.07));
          f.userData.senzaContorno = true;
        }
      }
    } else if (c.material === o.vetro && tipo === 'CylinderGeometry') {
      // finestra tonda: cornice ad anello e crocetta (il cilindro guarda verso il suo asse)
      const r = p.radiusTop;
      const anello = vicino(c, mesh(new THREE.TorusGeometry(r + 0.02, 0.03, 6, 20), cornice, 0, p.height / 2, 0));
      anello.rotation.x = Math.PI / 2;
      vicino(c, mesh(geo.scatola(r * 2, 0.02, 0.025), cornice, 0, p.height / 2 + 0.005, 0));
      vicino(c, mesh(geo.scatola(0.025, 0.02, r * 2), cornice, 0, p.height / 2 + 0.005, 0));
    } else if (c.material === o.porta && tipo === 'BoxGeometry') {
      // porta: stipiti e architrave, assi verticali, gradino di pietra se è a terra
      const w = p.width, h = p.height, z = p.depth / 2 + 0.01;
      vicino(c, mesh(geo.scatola(w + 0.14, 0.07, 0.07), legnoScuro, 0, h / 2 + 0.035, z - 0.02));
      for (const lato of [-1, 1]) vicino(c, mesh(geo.scatola(0.07, h, 0.07), legnoScuro, lato * (w / 2 + 0.035), 0, z - 0.02));
      for (const x of [-w / 4, w / 4]) vicino(c, mesh(geo.scatola(0.015, h * 0.94, 0.01), assi, x, 0, z));
      vicino(c, mesh(geo.scatola(w * 0.8, 0.03, 0.012), assi, 0, h * 0.18, z));
      if (c.position.y - h / 2 < 0.06) vicino(c, mesh(geo.scatola(w + 0.3, 0.06, 0.3), sasso, 0, -h / 2 + 0.03, z + 0.13));
    } else if (c.material === o.porta && tipo === 'CylinderGeometry') {
      const anello = vicino(c, mesh(new THREE.TorusGeometry(p.radiusTop + 0.03, 0.04, 6, 20), legnoScuro, 0, p.height / 2, 0));
      anello.rotation.x = Math.PI / 2;
    } else if (c.material === o.tetto && tipo === 'ConeGeometry') {
      c.material = tegole(o.colore);
    }
  }
  // i dettagli si mettono come pezzi sciolti della casa (così poi si uniscono per materiale)
  for (const d of nuovi) {
    d.updateMatrix();
    for (const f of [...d.children]) {
      f.applyMatrix4(d.matrix);
      g.add(f);
    }
  }
}

/** Tetto a capanna (prisma triangolare): base larga `l`, alto `h`, profondo `p`, appoggiato a y = 0. */
function tettoA(l: number, h: number, p: number, m: THREE.Material): THREE.Mesh {
  const f = new THREE.Shape();
  f.moveTo(-l / 2, 0);
  f.lineTo(l / 2, 0);
  f.lineTo(0, h);
  f.closePath();
  const geom = new THREE.ExtrudeGeometry(f, { depth: p, bevelEnabled: false });
  geom.translate(0, 0, -p / 2);
  return mesh(geom, m);
}

/** Mezza larghezza e cima del tetto di ogni casa, per appoggiare le migliorie. */
export const SAGOMA_CASA: Record<Specie, { mezza: number; cima: number }> = {
  volpe: { mezza: 1.0, cima: 2.5 }, daino: { mezza: 1.0, cima: 3.3 }, lepre: { mezza: 1.2, cima: 2.8 },
  riccio: { mezza: 1.25, cima: 2.55 }, scoiattolo: { mezza: 0.8, cima: 3.65 }, tasso: { mezza: 1.6, cima: 1.35 },
  cavallo: { mezza: 1.25, cima: 2.3 }, mucca: { mezza: 1.05, cima: 2.9 }, asino: { mezza: 1.1, cima: 2.1 },
  maiale: { mezza: 1.0, cima: 2.3 }, uccellino: { mezza: 0.75, cima: 3.47 }, papera: { mezza: 1.0, cima: 1.7 },
};

/**
 * Le migliorie che Giada compra con le castagne (vedi lib/migliorie.ts):
 * 2 portico e vasi di fiori, 3 una stanza in più col camino e le lanterne, 4 bandierine, stella, bandiera e giardino.
 */
function miglioraCasa(g: THREE.Group, specie: Specie, c: { muro: string; tetto: string; porta: string }, livello: number, fronte: number, altPorta: number) {
  const legno = legnoMat();
  const tetto = mat(c.tetto, { rim: 0.4 });
  const { mezza, cima } = SAGOMA_CASA[specie];
  const base = specie === 'scoiattolo' ? 1.66 : 0;
  const alto = altPorta + 1.0; // il tettuccio del portico, sopra l'insegna
  const zp = fronte + 0.6;

  // 2: il portico di legno davanti alla porta e i vasi alle finestre
  for (const x of [-0.6, 0.6]) g.add(mesh(geo.cil(0.05, 0.06, alto - base, 6), legno, x, base + (alto - base) / 2, zp));
  const tettuccio = mesh(geo.scatola(1.5, 0.07, 0.8), tetto, 0, alto + 0.05, fronte + 0.3);
  tettuccio.rotation.x = 0.22;
  g.add(tettuccio);
  if (base) g.add(mesh(geo.scatola(1.4, 0.06, 0.7), legno, 0, base, fronte + 0.32));
  const fiori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb'];
  for (const [i, x] of [-0.95, 0.95].entries()) {
    const vaso = mesh(geo.cil(0.16, 0.12, 0.22, 8), mat('#c8805a'), x, base + 0.11, zp + 0.05);
    for (let k = 0; k < 3; k++) {
      const f = creaFiore(fiori[(i + k) % fiori.length]);
      f.scale.setScalar(1.6);
      f.position.set((k - 1) * 0.08, 0.1, 0);
      vaso.add(f);
    }
    g.add(vaso);
  }
  if (livello < 3) return;

  // 3: una stanza in più sul retro, col suo tettino e il camino che fuma; due lanterne al portico
  const muro = mat(c.muro, { rim: 0.2 });
  const xs = -(mezza + 0.35);
  const stanza = new THREE.Group();
  stanza.position.set(xs, 0, -0.7);
  const vetro = mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.25 });
  let altoCamino = 1.55;
  if (specie === 'tasso') {
    // per il tasso una collinetta più piccola, con la finestrella tonda
    const colle = mesh(geo.palla(0.8, 12), mat('#6ba552', { rim: 0.3 }), 0, 0, 0);
    colle.scale.set(1, 0.9, 1);
    stanza.add(colle);
    const f = mesh(geo.cil(0.16, 0.16, 0.06, 12), vetro, 0, 0.4, 0.7);
    f.rotation.x = Math.PI / 2 - 0.4;
    stanza.add(f);
    altoCamino = 0.85;
  } else {
    stanza.add(mesh(geo.scatola(1.1, 1.0, 1.1), muro, 0, 0.5, 0));
    const t2 = mesh(geo.cono(0.95, 0.7, 4), tetto, 0, 1.35, 0);
    t2.rotation.y = Math.PI / 4;
    stanza.add(t2);
    stanza.add(mesh(geo.scatola(0.3, 0.3, 0.05), vetro, 0, 0.6, 0.56));
  }
  stanza.add(mesh(geo.scatola(0.22, 0.6, 0.22), pietra(), 0.25, altoCamino, -0.15));
  const fumo = new THREE.Group();
  fumo.name = 'fumo';
  for (let i = 0; i < 3; i++) {
    const p = mesh(geo.palla(0.12 + i * 0.05, 8), mat('#eeeeee', { transparent: true, opacity: 0.75 - i * 0.18 }), Math.sin(i) * 0.08, 0.3 + i * 0.28, 0);
    p.userData.senzaContorno = true;
    fumo.add(p);
  }
  fumo.position.set(0.25, altoCamino + 0.3, -0.15);
  stanza.add(fumo);
  g.add(stanza);
  for (const x of [-0.6, 0.6]) {
    g.add(mesh(geo.cil(0.01, 0.01, 0.15, 4), mat('#4a3a2c'), x, alto - 0.08, zp));
    g.add(mesh(geo.palla(0.09, 10), mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 0.9, rim: 0 }), x, alto - 0.22, zp));
    g.add(mesh(geo.cono(0.11, 0.08, 8), mat('#4a3a2c'), x, alto - 0.12, zp));
  }
  if (livello < 4) return;

  // 4: bottega famosa: bandierine dal portico al tetto, la stella in cima, la bandiera e il giardino fiorito
  const colori = ['#ff6f91', '#ffd166', '#7fc8f8', '#7ccf6a', '#b39ddb'];
  for (const lato of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const k = (i + 0.5) / 5;
      const b = mesh(geo.cono(0.08, 0.16, 3), mat(colori[i]), lato * (0.6 + k * (mezza - 0.4)), alto + 0.1 + k * (cima - alto - 0.6) - Math.sin(k * Math.PI) * 0.15, zp - k * 0.6);
      b.rotation.x = Math.PI;
      g.add(b);
    }
  }
  const stella = spriteTesto('★', '#ffd23f');
  stella.scale.setScalar(0.7);
  stella.position.set(0, cima + 0.3, 0);
  g.add(stella);
  const asta = mesh(geo.cil(0.035, 0.04, 3.2, 6), legno, mezza + 0.35, 1.6, -0.6);
  g.add(asta);
  const bandiera = mesh(geo.scatola(0.6, 0.38, 0.02), mat(c.porta, { side: THREE.DoubleSide }), mezza + 0.66, 3.0, -0.6);
  bandiera.name = 'bandiera';
  g.add(bandiera);
  // (il giardino fiorito davanti adesso fa parte del giardinetto di ogni casa: vedi esterni.ts)
}

/** Cartello a freccia per indicare la via, con una scritta di Giada. */
export function creaCartelloVia(testo: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.4));
  const legno = assi();
  g.add(mesh(geo.cil(0.05, 0.06, 1.5, 6), legno, 0, 0.75, 0));
  const tav = texture(256, (c, l) => {
    c.fillStyle = '#c4935e'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#a87a48'; for (let y = 0; y < l; y += 40) c.fillRect(0, y, l, 4);
    c.fillStyle = '#4a3020'; c.font = `900 ${l * 0.2}px 'Nunito Variable', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const t = testo.length > 14 ? testo.slice(0, 13) + '…' : testo;
    let size = l * 0.3;
    c.font = `900 ${size}px 'Nunito Variable', sans-serif`;
    while (c.measureText(t).width > l * 0.86 && size > 20) { size -= 4; c.font = `900 ${size}px 'Nunito Variable', sans-serif`; }
    c.fillText(t, l * 0.45, l / 2);
  });
  tav.repeat.set(1, 1);
  // la freccia: un'asse con la punta, che indica verso destra (ruotando il cartello si cambia direzione)
  const forma = new THREE.Shape();
  forma.moveTo(-0.5, -0.17); forma.lineTo(0.38, -0.17); forma.lineTo(0.55, 0); forma.lineTo(0.38, 0.17); forma.lineTo(-0.5, 0.17); forma.closePath();
  const geoF = new THREE.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false });
  // coordinate uv da -0.5..0.55 → 0..1
  const uv = geoF.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.5) / 1.05, uv.getY(i) / 1.05 + 0.5);
  const freccia = mesh(geoF, mat('#ffffff', { map: tav, rim: 0 }), 0.05, 1.25, -0.025);
  g.add(freccia);
  return contorno(g);
}

/** Un pezzo di recinto lungo 2 metri: si mettono in fila e si girano come si vuole. */
export function creaRecinto(): THREE.Group {
  const g = new THREE.Group();
  const legno = assi();
  for (const x of [-1, 0, 1]) {
    g.add(mesh(geo.scatola(0.11, 0.75, 0.11), legno, x, 0.37, 0));
    g.add(mesh(geo.cono(0.08, 0.12, 4), legno, x, 0.8, 0));
  }
  for (const y of [0.3, 0.58]) g.add(mesh(geo.scatola(2.05, 0.09, 0.05), legno, 0, y, 0.06));
  return contorno(g);
}
