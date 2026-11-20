// Modelli low-poly costruiti in codice: animali "chibi" (testa grande, corpo tondo), corvo, alberi, edifici.
import * as THREE from 'three';
import type { Animale, Specie } from '../lib/tipi';
import { macchie, materiale, strisce, texture } from './ps1';

const geo = {
  palla: (r: number, s = 9) => new THREE.SphereGeometry(r, s, Math.max(6, s - 2)),
  cono: (r: number, h: number, s = 7) => new THREE.ConeGeometry(r, h, s),
  cil: (r1: number, r2: number, h: number, s = 7) => new THREE.CylinderGeometry(r1, r2, h, s),
  scatola: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
};

const cacheMat = new Map<string, THREE.MeshLambertMaterial>();
export function mat(colore: string, extra: THREE.MeshLambertMaterialParameters = {}) {
  const k = colore + JSON.stringify(Object.keys(extra));
  if (!extra.map && cacheMat.has(k)) return cacheMat.get(k)!;
  const m = materiale({ color: colore, ...extra });
  if (!extra.map) cacheMat.set(k, m);
  return m;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

// ---------- animali ----------

interface Pelo { corpo: string; pancia: string; muso: string; zampe: string; extra: string }
const PELO: Record<Specie, Pelo> = {
  volpe: { corpo: '#f08a3c', pancia: '#fff4e2', muso: '#fff4e2', zampe: '#5a3a2a', extra: '#fff4e2' },
  daino: { corpo: '#c99566', pancia: '#f6e8d2', muso: '#f6e8d2', zampe: '#8a6040', extra: '#ffffff' },
  tasso: { corpo: '#9aa0a8', pancia: '#e8e8e8', muso: '#ffffff', zampe: '#3b3b42', extra: '#2e2e35' },
  riccio: { corpo: '#b08a62', pancia: '#f3dfc4', muso: '#f3dfc4', zampe: '#6b4c32', extra: '#6b4c32' },
  scoiattolo: { corpo: '#c8693a', pancia: '#fbe6cf', muso: '#fbe6cf', zampe: '#7a3c20', extra: '#c8693a' },
  lepre: { corpo: '#d8c3a5', pancia: '#ffffff', muso: '#ffffff', zampe: '#a88b6a', extra: '#f2b7b7' },
};

export interface ModelloAnimale {
  gruppo: THREE.Group;
  corpo: THREE.Group; // si piega quando dorme
  testa: THREE.Group;
  zampe: THREE.Object3D[];
  coda: THREE.Object3D | null;
  accessorio: THREE.Object3D | null;
  mestiere: string | null;
}

export function creaAnimale(a: Animale): ModelloAnimale {
  const p = PELO[a.specie];
  const gruppo = new THREE.Group();
  const corpo = new THREE.Group();
  gruppo.add(corpo);

  // corpo tondo
  const busto = mesh(geo.palla(0.42), mat(p.corpo), 0, 0.5, 0);
  busto.scale.set(1, 0.9, 1.15);
  corpo.add(busto);
  const pancia = mesh(geo.palla(0.3, 8), mat(p.pancia), 0, 0.46, 0.2);
  pancia.scale.set(1, 1, 0.7);
  corpo.add(pancia);

  // zampe corte
  const zampe: THREE.Object3D[] = [];
  const altaZampa = a.specie === 'daino' ? 0.34 : 0.22;
  for (const [x, z] of [[-0.2, 0.22], [0.2, 0.22], [-0.2, -0.22], [0.2, -0.22]]) {
    const perno = new THREE.Group();
    perno.position.set(x, 0.3, z);
    perno.add(mesh(geo.cil(0.08, 0.07, altaZampa + 0.1, 6), mat(p.zampe), 0, -(altaZampa + 0.1) / 2 + 0.02, 0));
    corpo.add(perno);
    zampe.push(perno);
  }
  if (a.specie === 'daino') corpo.position.y = 0.12;

  // testa grande
  const testa = new THREE.Group();
  testa.position.set(0, 1.0, 0.18);
  corpo.add(testa);
  testa.add(mesh(geo.palla(0.42, 10), mat(p.corpo)));
  const muso = mesh(geo.palla(0.2, 8), mat(p.muso), 0, -0.1, 0.32);
  muso.scale.set(1.2, 0.85, 0.9);
  testa.add(muso);
  testa.add(mesh(geo.palla(0.06, 6), mat('#2a1d18'), 0, -0.04, 0.5)); // naso
  // occhi lucidi
  for (const x of [-0.16, 0.16]) {
    const occhio = mesh(geo.palla(0.075, 7), mat('#1b1412'), x, 0.06, 0.37);
    occhio.scale.set(1, 1.25, 0.6);
    testa.add(occhio);
    testa.add(mesh(geo.palla(0.025, 5), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6 }), x + 0.025, 0.1, 0.415));
    // guance rosa
    const guancia = mesh(geo.palla(0.06, 6), mat('#ff9aa2'), x * 1.55, -0.07, 0.3);
    guancia.scale.set(1, 0.6, 0.4);
    testa.add(guancia);
  }

  // orecchie e dettagli per specie
  let coda: THREE.Object3D | null = null;
  const orecchio = (x: number, r: number, h: number, colore: string, inclina = 0.25) => {
    const o = mesh(geo.cono(r, h, 5), mat(colore), x, 0.38 + h / 2 - 0.05, -0.02);
    o.rotation.z = -Math.sign(x) * inclina;
    testa.add(o);
    return o;
  };
  switch (a.specie) {
    case 'volpe': {
      orecchio(-0.22, 0.13, 0.3, p.corpo); orecchio(0.22, 0.13, 0.3, p.corpo);
      const c = new THREE.Group(); c.position.set(0, 0.55, -0.45);
      const ciuffo = mesh(geo.palla(0.24, 8), mat(p.corpo), 0, 0.12, -0.18); ciuffo.scale.set(0.9, 0.9, 1.5);
      c.add(ciuffo); c.add(mesh(geo.palla(0.13, 7), mat(p.extra), 0, 0.2, -0.48));
      corpo.add(c); coda = c;
      break;
    }
    case 'daino': {
      orecchio(-0.3, 0.09, 0.22, p.corpo, 1.0); orecchio(0.3, 0.09, 0.22, p.corpo, 1.0);
      for (const [x, y, z] of [[-0.18, 0.62, -0.1], [0.12, 0.66, 0.05], [0.25, 0.52, -0.25], [-0.05, 0.6, -0.3]])
        corpo.add(mesh(geo.palla(0.045, 5), mat(p.extra), x, y, z));
      if (a.sesso === 'm') for (const x of [-0.14, 0.14]) {
        const corno = mesh(geo.cil(0.025, 0.035, 0.28, 5), mat('#7a5232'), x, 0.5, -0.05); corno.rotation.z = -x * 2.4; testa.add(corno);
        const ramo = mesh(geo.cil(0.02, 0.025, 0.14, 5), mat('#7a5232'), x * 1.9, 0.6, -0.02); ramo.rotation.z = x * 4; testa.add(ramo);
      }
      const c = mesh(geo.palla(0.1, 6), mat(p.extra), 0, 0.62, -0.48); corpo.add(c); coda = c;
      break;
    }
    case 'tasso': {
      orecchio(-0.28, 0.08, 0.1, p.extra, 0.9); orecchio(0.28, 0.08, 0.1, p.extra, 0.9);
      // bande della maschera
      for (const x of [-0.17, 0.17]) { const b = mesh(geo.scatola(0.11, 0.5, 0.2), mat(p.extra), x, 0.06, 0.28); b.rotation.x = -0.35; testa.add(b); }
      const fronte = mesh(geo.scatola(0.12, 0.42, 0.16), mat('#ffffff'), 0, 0.12, 0.34); fronte.rotation.x = -0.4; testa.add(fronte);
      busto.scale.set(1.15, 0.85, 1.2);
      const c = mesh(geo.cono(0.1, 0.25, 5), mat(p.corpo), 0, 0.5, -0.55); c.rotation.x = -1.9; corpo.add(c); coda = c;
      break;
    }
    case 'riccio': {
      orecchio(-0.24, 0.07, 0.08, p.corpo, 0.9); orecchio(0.24, 0.07, 0.08, p.corpo, 0.9);
      for (let i = 0; i < 26; i++) {
        const t = i / 26, ang = t * Math.PI * 7;
        const s = mesh(geo.cono(0.07, 0.24, 4), mat(p.extra), Math.cos(ang) * 0.32, 0.65 + Math.sin(t * 3) * 0.12, -0.15 - t * 0.3);
        s.lookAt(s.position.clone().multiplyScalar(2)); s.rotateX(Math.PI / 2); corpo.add(s);
      }
      break;
    }
    case 'scoiattolo': {
      orecchio(-0.2, 0.08, 0.2, p.corpo, 0.15); orecchio(0.2, 0.08, 0.2, p.corpo, 0.15);
      const c = new THREE.Group(); c.position.set(0, 0.5, -0.45);
      const q = mesh(geo.palla(0.28, 8), mat(p.extra), 0, 0.42, -0.1); q.scale.set(0.7, 1.4, 0.8); c.add(q);
      corpo.add(c); coda = c;
      break;
    }
    case 'lepre': {
      for (const x of [-0.12, 0.12]) { const o = mesh(geo.palla(0.1, 6), mat(p.corpo), x, 0.7, -0.05); o.scale.set(0.7, 3.2, 0.6); testa.add(o); }
      const c = mesh(geo.palla(0.12, 6), mat('#ffffff'), 0, 0.5, -0.5); corpo.add(c); coda = c;
      break;
    }
  }

  const m: ModelloAnimale = { gruppo, corpo, testa, zampe, coda, accessorio: null, mestiere: null };
  aggiornaMestiere(m, a.mestiere);
  gruppo.userData.id = a.id;
  return m;
}

/** Cappello da cuoco, sciarpa da musicista, grembiule da artigiano. */
export function aggiornaMestiere(m: ModelloAnimale, mestiere: string | null) {
  if (m.mestiere === mestiere) return;
  if (m.accessorio) m.accessorio.parent?.remove(m.accessorio);
  m.accessorio = null;
  m.mestiere = mestiere;
  if (!mestiere) return;
  const g = new THREE.Group();
  if (mestiere === 'cuoco') {
    g.add(mesh(geo.cil(0.2, 0.18, 0.12, 9), mat('#ffffff'), 0, 0.4, -0.02));
    const sbuffo = mesh(geo.palla(0.26, 8), mat('#ffffff'), 0, 0.58, -0.02); sbuffo.scale.set(1, 0.7, 1); g.add(sbuffo);
    m.testa.add(g);
  } else if (mestiere === 'musicista') {
    const s = mesh(geo.cil(0.3, 0.32, 0.1, 10), mat('#d64545'), 0, 0.82, 0.12); g.add(s);
    const coda = mesh(geo.scatola(0.12, 0.28, 0.04), mat('#d64545'), 0.18, 0.66, 0.36); coda.rotation.z = 0.3; g.add(coda);
    m.corpo.add(g);
  } else {
    const gr = mesh(geo.scatola(0.46, 0.4, 0.06), mat('#7a5232'), 0, 0.45, 0.42); gr.rotation.x = -0.12; g.add(gr);
    g.add(mesh(geo.scatola(0.5, 0.05, 0.5), mat('#7a5232'), 0, 0.68, 0.12));
    m.corpo.add(g);
  }
  m.accessorio = g;
}

// ---------- uovo e nido ----------

export function creaUovo(colore: string): THREE.Group {
  const g = new THREE.Group();
  const guscio = mesh(geo.palla(0.3, 10), mat('#fff7e6'), 0, 0.36, 0);
  guscio.scale.set(1, 1.3, 1);
  g.add(guscio);
  for (const [x, y, z, r] of [[0.15, 0.45, 0.2, 0.07], [-0.2, 0.3, 0.12, 0.06], [0.05, 0.2, 0.26, 0.05], [-0.06, 0.58, 0.16, 0.05]])
    g.add(mesh(geo.palla(r, 5), mat(colore), x, y, z));
  return g;
}

export function creaNido(): THREE.Group {
  const g = new THREE.Group();
  const anello = mesh(new THREE.TorusGeometry(0.75, 0.22, 5, 10), mat('#9c7348'));
  anello.rotation.x = Math.PI / 2;
  anello.position.y = 0.12;
  g.add(anello);
  g.add(mesh(geo.cil(0.7, 0.6, 0.1, 10), mat('#7d5a36'), 0, 0.05, 0));
  for (let i = 0; i < 8; i++) {
    const r = mesh(geo.scatola(0.5, 0.05, 0.05), mat('#b88a58'), Math.cos(i) * 0.7, 0.25, Math.sin(i) * 0.7);
    r.rotation.y = i * 1.3;
    g.add(r);
  }
  return g;
}

// ---------- corvo ----------

export interface ModelloCorvo { gruppo: THREE.Group; testa: THREE.Group; ali: THREE.Object3D[] }

export function creaCorvo(): ModelloCorvo {
  const gruppo = new THREE.Group();
  // palo con cartello
  gruppo.add(mesh(geo.cil(0.12, 0.14, 1.6, 6), mat('#8a6440', { map: texture(16, macchie(['#8a6440', '#6e4e30', '#a07852'])) }), 0, 0.8, 0));
  const uccello = new THREE.Group();
  uccello.position.y = 1.62;
  gruppo.add(uccello);
  const nero = mat('#2b2d3a');
  const corpo = mesh(geo.palla(0.32, 9), nero, 0, 0.3, 0);
  corpo.scale.set(0.9, 1.1, 1);
  uccello.add(corpo);
  uccello.add(mesh(geo.palla(0.2, 7), mat('#3c3f52'), 0, 0.25, 0.16));
  // zampe sul palo
  for (const x of [-0.08, 0.08]) uccello.add(mesh(geo.cil(0.025, 0.025, 0.14, 4), mat('#e0a040'), x, 0.02, 0.06));
  // coda
  const coda = mesh(geo.scatola(0.26, 0.05, 0.38), nero, 0, 0.18, -0.36);
  coda.rotation.x = 0.5;
  uccello.add(coda);
  // ali
  const ali: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const perno = new THREE.Group();
    perno.position.set(s * 0.26, 0.42, 0);
    const ala = mesh(geo.palla(0.22, 7), mat('#22242f'), s * 0.06, -0.12, -0.04);
    ala.scale.set(0.35, 1, 1.25);
    perno.add(ala);
    uccello.add(perno);
    ali.push(perno);
  }
  // testa con becco, occhi e cappello
  const testa = new THREE.Group();
  testa.position.set(0, 0.78, 0.04);
  uccello.add(testa);
  testa.add(mesh(geo.palla(0.27, 9), nero));
  const becco = mesh(geo.cono(0.08, 0.34, 5), mat('#4a4c5a'), 0, -0.04, 0.36);
  becco.rotation.x = Math.PI / 2;
  testa.add(becco);
  for (const x of [-0.12, 0.12]) {
    testa.add(mesh(geo.palla(0.07, 7), mat('#ffffff'), x, 0.06, 0.2));
    testa.add(mesh(geo.palla(0.04, 6), mat('#111111'), x * 1.05, 0.06, 0.26));
  }
  const cappello = new THREE.Group();
  cappello.position.y = 0.2;
  cappello.rotation.z = -0.12;
  cappello.add(mesh(geo.cil(0.36, 0.36, 0.04, 12), mat('#7a5a3c')));
  cappello.add(mesh(geo.cil(0.18, 0.22, 0.2, 12), mat('#7a5a3c'), 0, 0.12, 0));
  cappello.add(mesh(geo.cil(0.225, 0.225, 0.06, 12), mat('#b5452e'), 0, 0.06, 0));
  const piuma1 = mesh(geo.scatola(0.04, 0.42, 0.1), mat('#e2683a'), 0.2, 0.3, -0.05); piuma1.rotation.z = -0.6; cappello.add(piuma1);
  const piuma2 = mesh(geo.scatola(0.04, 0.36, 0.09), mat('#f2c94c'), 0.24, 0.24, -0.1); piuma2.rotation.z = -0.9; cappello.add(piuma2);
  testa.add(cappello);
  return { gruppo, testa, ali };
}

// ---------- ambiente ----------

export function creaAlbero(scala = 1, tinta = 0): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.18, 0.26, 1.2, 6), mat('#8a5a36', { map: texture(16, macchie(['#8a5a36', '#6d4428', '#a06a40'])) }), 0, 0.6, 0));
  const verdi = ['#5fb85a', '#4fa64e', '#6cc46a', '#58ad55'];
  const v = verdi[tinta % verdi.length];
  for (const [y, r] of [[1.5, 0.95], [2.15, 0.75], [2.7, 0.5]]) {
    const chioma = mesh(geo.palla(r, 7), mat(v), (tinta % 3) * 0.05, y, 0);
    chioma.scale.y = 0.85;
    g.add(chioma);
  }
  g.scale.setScalar(scala);
  return g;
}

export function creaPino(scala = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.12, 0.16, 0.6, 5), mat('#6d4428'), 0, 0.3, 0));
  for (const [y, r, h] of [[0.9, 0.85, 1.1], [1.5, 0.65, 0.95], [2.0, 0.42, 0.8]]) g.add(mesh(geo.cono(r, h, 7), mat('#3f8f5a'), 0, y, 0));
  g.scale.setScalar(scala);
  return g;
}

export function creaFiore(colore: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.02, 0.02, 0.25, 4), mat('#3c8a3c'), 0, 0.12, 0));
  g.add(mesh(geo.palla(0.08, 5), mat(colore), 0, 0.27, 0));
  g.add(mesh(geo.palla(0.035, 4), mat('#fff3a0'), 0, 0.3, 0.05));
  return g;
}

export function creaSasso(scala = 1): THREE.Mesh {
  const s = mesh(new THREE.DodecahedronGeometry(0.4, 0), mat('#a7a29a'));
  s.scale.set(scala * 1.2, scala * 0.7, scala);
  s.position.y = 0.15 * scala;
  s.rotation.y = scala * 3;
  return s;
}

export function creaLanterna(): { gruppo: THREE.Group; luce: THREE.Mesh } {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.05, 0.06, 1.3, 5), mat('#4a3a2c'), 0, 0.65, 0));
  const luce = mesh(geo.scatola(0.22, 0.26, 0.22), mat('#ffd27a', { emissive: '#ffb347', emissiveIntensity: 0.2 }), 0, 1.4, 0);
  g.add(luce);
  g.add(mesh(geo.cono(0.2, 0.14, 4), mat('#4a3a2c'), 0, 1.6, 0));
  return { gruppo: g, luce };
}

export function creaQuaderno(): THREE.Group {
  // il diario dentro il mondo: un leggio con un quaderno aperto
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.08, 0.1, 0.8, 5), mat('#8a5a36'), 0, 0.4, 0));
  const piano = mesh(geo.scatola(0.8, 0.06, 0.55), mat('#8a5a36'), 0, 0.82, 0);
  piano.rotation.x = -0.45;
  g.add(piano);
  const pagine = mesh(geo.scatola(0.72, 0.04, 0.48), mat('#fffaf0', { map: texture(16, (c, l) => {
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#9ab4d8'; for (let y = 3; y < l; y += 3) c.fillRect(1, y, l - 2, 1);
    c.fillStyle = '#c0583a'; c.fillRect(l / 2, 0, 1, l);
  }) }), 0, 0.87, 0.02);
  pagine.rotation.x = -0.45;
  g.add(pagine);
  const segnalibro = mesh(geo.scatola(0.06, 0.02, 0.3), mat('#e2683a'), 0.15, 0.85, 0.28);
  segnalibro.rotation.x = 0.4;
  g.add(segnalibro);
  return g;
}

// ---------- edifici ----------

export function creaChiosco(): THREE.Group {
  const g = new THREE.Group();
  const legno = mat('#b07a48', { map: texture(16, macchie(['#b07a48', '#9a6838', '#c48c58'])) });
  g.add(mesh(geo.scatola(2, 0.9, 0.8), legno, 0, 0.45, 0.3));
  g.add(mesh(geo.scatola(2.1, 0.08, 0.95), mat('#e8d2a8'), 0, 0.94, 0.3));
  for (const x of [-0.95, 0.95]) g.add(mesh(geo.cil(0.06, 0.06, 2.1, 5), legno, x, 1.05, -0.05));
  const tenda = mesh(geo.scatola(2.3, 0.08, 1.3), mat('#ffffff', { map: texture(16, strisce('#e8584a', '#fff4e0', 6)) }), 0, 2.15, 0.25);
  tenda.rotation.x = 0.25;
  g.add(tenda);
  // pentola e cartello
  g.add(mesh(geo.cil(0.22, 0.18, 0.25, 8), mat('#5a5a66'), -0.5, 1.1, 0.3));
  g.add(mesh(geo.scatola(0.6, 0.35, 0.05), mat('#fff4e0'), 0.45, 1.3, -0.05));
  return g;
}

export function creaPiazzaMusica(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(1.3, 1.4, 0.25, 12), mat('#d8cfc0', { map: texture(16, macchie(['#d8cfc0', '#c4b9a6', '#e6ddd0'])) }), 0, 0.12, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(geo.cil(0.07, 0.07, 1.6, 5), mat('#8a5a36'), Math.cos(a) * 1.15, 1.0, Math.sin(a) * 1.15));
  }
  g.add(mesh(geo.cono(1.6, 0.8, 6), mat('#6a8fd8'), 0, 2.2, 0));
  g.add(mesh(geo.palla(0.12, 6), mat('#f2c94c'), 0, 2.65, 0));
  return g;
}

export function creaBottega(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.scatola(1.6, 1.2, 1.3), mat('#e8d6b0'), 0, 0.6, 0));
  const tetto = mesh(geo.cono(1.4, 0.9, 4), mat('#c0583a'), 0, 1.65, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  g.add(mesh(geo.scatola(0.4, 0.7, 0.05), mat('#7a5232'), 0, 0.35, 0.66));
  return g;
}
