// Modelli costruiti in codice, stile "libro illustrato" morbido.
// Cuccioli secondo lo schema infantile (Lorenz): testa più grande del corpo, fronte alta,
// occhi grandi e bassi, guance piene, naso e bocca piccoli, zampe corte e tozze.
import * as THREE from 'three';
import { hash, rng } from '../lib/caso';
import type { Animale, Specie } from '../lib/tipi';
import { contorno, macchie, materiale, ombra, strisce, texture } from './ps1';

const geo = {
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

/** Pelo dipinto: il colore base con sfumature più chiare e più scure. */
const cachePelo = new Map<string, THREE.MeshToonMaterial>();
function pelo(colore: string) {
  if (cachePelo.has(colore)) return cachePelo.get(colore)!;
  const c = new THREE.Color(colore);
  const chiaro = '#' + c.clone().offsetHSL(0, -0.05, 0.08).getHexString();
  const scuro = '#' + c.clone().offsetHSL(0.01, 0.05, -0.08).getHexString();
  const m = materiale({ color: '#ffffff', map: texture(128, macchie([colore, chiaro, scuro, colore], 0.8, colore.length * 31), 2), rim: 0.45 });
  cachePelo.set(colore, m);
  return m;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

// ---------- animali ----------

interface Mantello { corpo: string; pancia: string; muso: string; zampe: string; extra: string; occhi: string }
const MANTELLO: Record<Specie, Mantello> = {
  volpe: { corpo: '#e8803e', pancia: '#fff3e0', muso: '#fff3e0', zampe: '#6a3f2a', extra: '#fff3e0', occhi: '#3a2214' },
  daino: { corpo: '#d29c64', pancia: '#f7ead6', muso: '#f7ead6', zampe: '#9a6a44', extra: '#fffaf0', occhi: '#2e1c12' },
  tasso: { corpo: '#9ea3ab', pancia: '#ecebe8', muso: '#ffffff', zampe: '#45454f', extra: '#34343c', occhi: '#1e1e24' },
  riccio: { corpo: '#d8b48c', pancia: '#f6e4cc', muso: '#f6e4cc', zampe: '#8a6644', extra: '#7a5a3c', occhi: '#2a1a10' },
  scoiattolo: { corpo: '#cf7444', pancia: '#fbe8d2', muso: '#fbe8d2', zampe: '#8a4426', extra: '#d98452', occhi: '#2a160c' },
  lepre: { corpo: '#d9c4a6', pancia: '#ffffff', muso: '#ffffff', zampe: '#b0916e', extra: '#f4b9b9', occhi: '#2a1c14' },
};

export interface ModelloAnimale {
  gruppo: THREE.Group;
  corpo: THREE.Group;
  testa: THREE.Group;
  zampe: THREE.Object3D[];
  coda: THREE.Object3D | null;
  occhi: THREE.Object3D[];
  accessorio: THREE.Object3D | null;
  mestiere: string | null;
}

/** Segno particolare di ogni animale, sempre lo stesso per lo stesso animale. */
export const SEGNI = ['nessuno', 'macchia sull\'occhio', 'stellina in fronte', 'lentiggini', 'calzini chiari', 'punta della coda scura'] as const;

export function tratti(a: Pick<Animale, 'id' | 'sesso'>) {
  const r = rng(hash(a.id));
  return {
    tinta: (r() - 0.5) * 0.05,
    luce: (r() - 0.5) * 0.16,
    taglia: (0.94 + r() * 0.12) * (a.sesso === 'm' ? 1.04 : 0.96),
    segno: SEGNI[Math.floor(r() * SEGNI.length)],
    lato: r() < 0.5 ? -1 : 1,
  };
}

function varia(colore: string, tinta: number, luce: number) {
  return '#' + new THREE.Color(colore).offsetHSL(tinta, 0, luce).getHexString();
}

export function creaAnimale(a: Animale): ModelloAnimale {
  const base = MANTELLO[a.specie];
  const t = tratti(a);
  const p = { ...base, corpo: varia(base.corpo, t.tinta, t.luce), zampe: t.segno === 'calzini chiari' ? base.pancia : varia(base.zampe, t.tinta, t.luce * 0.5) };
  const gruppo = new THREE.Group();
  const corpo = new THREE.Group();
  gruppo.add(corpo);
  gruppo.add(ombra(0.55));

  // corpo piccolo e tondo (a pera)
  const busto = mesh(geo.palla(0.34), pelo(p.corpo), 0, 0.42, 0);
  busto.scale.set(1, 0.95, 1.05);
  corpo.add(busto);
  const pancia = mesh(geo.palla(0.24), mat(p.pancia, { rim: 0.2 }), 0, 0.38, 0.14);
  pancia.scale.set(1, 1.05, 0.75);
  corpo.add(pancia);

  // zampette corte e tozze, con i piedini tondi
  const zampe: THREE.Object3D[] = [];
  const lunga = a.specie === 'daino' ? 0.1 : 0;
  for (const [x, z] of [[-0.17, 0.13], [0.17, 0.13], [-0.16, -0.14], [0.16, -0.14]]) {
    const perno = new THREE.Group();
    perno.position.set(x, 0.26 + lunga, z);
    perno.add(mesh(geo.capsula(0.085, 0.06 + lunga), pelo(p.zampe), 0, -0.08 - lunga / 2, 0));
    perno.add(mesh(geo.palla(0.095), mat(p.zampe), 0, -0.17 - lunga, 0.03));
    corpo.add(perno);
    zampe.push(perno);
  }
  corpo.position.y = lunga;

  // testa grande, fronte alta
  const testa = new THREE.Group();
  testa.position.set(0, 0.92, 0.06);
  corpo.add(testa);
  const cranio = mesh(geo.palla(0.46, 22), pelo(p.corpo));
  cranio.scale.set(1.08, 0.98, 1);
  testa.add(cranio);
  // muso piccolo e basso; volpe e daino lo hanno un po' più a punta, così si riconoscono subito
  const aPunta = a.specie === 'volpe' ? 1.6 : a.specie === 'daino' ? 1.35 : 1;
  const muso = mesh(geo.palla(0.17), mat(p.muso, { rim: 0.15 }), 0, -0.16, 0.32 + (aPunta - 1) * 0.08);
  muso.scale.set(aPunta > 1 ? 1.05 : 1.25, 0.8, 0.85 * aPunta);
  muso.userData.senzaContorno = true; // con il contorno sembrava un grugno
  testa.add(muso);
  const naso = mesh(geo.palla(0.055), mat('#2a1a14', { rim: 0 }), 0, -0.12 + (aPunta - 1) * 0.02, 0.48 + (aPunta - 1) * 0.2);
  naso.scale.set(1.3, 0.9, 1);
  naso.userData.senzaContorno = true;
  testa.add(naso);
  // occhi grandi, bassi e lucidi
  const occhi: THREE.Object3D[] = [];
  for (const x of [-0.19, 0.19]) {
    const g = new THREE.Group();
    g.position.set(x, -0.02, 0.37);
    g.rotation.y = x * 1.4;
    const bulbo = mesh(geo.palla(0.105), mat(p.occhi, { rim: 0 }));
    bulbo.scale.set(0.95, 1.15, 0.55);
    g.add(bulbo);
    g.add(mesh(geo.palla(0.038, 10), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.8, rim: 0 }), 0.03, 0.05, 0.05));
    g.add(mesh(geo.palla(0.018, 8), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.8, rim: 0 }), -0.035, -0.04, 0.05));
    // femmine: ciglia lunghe all'insù
    if (a.sesso === 'f') for (let k = 0; k < 3; k++) {
      const ciglio = mesh(geo.capsula(0.012, 0.05), mat('#1e140e', { rim: 0 }), Math.sign(x) * (0.05 + k * 0.03), 0.1 + (1 - k) * 0.01, 0.02);
      ciglio.rotation.z = -Math.sign(x) * (0.5 + k * 0.35);
      ciglio.userData.senzaContorno = true;
      g.add(ciglio);
    }
    // segno particolare: macchia intorno a un occhio
    if (t.segno === 'macchia sull\'occhio' && Math.sign(x) === t.lato) {
      const macchia = mesh(geo.palla(0.15), mat(a.specie === 'tasso' ? '#ffffff' : varia(base.corpo, 0, -0.18), { rim: 0 }), x * 1.05, 0.0, 0.3);
      macchia.scale.set(1, 1.05, 0.45);
      macchia.userData.senzaContorno = true;
      testa.add(macchia);
    }
    testa.add(g);
    occhi.push(g);
    // guance piene e rosate
    const guancia = mesh(geo.palla(0.085), mat('#ff9aa8', { rim: 0 }), x * 1.5, -0.15, 0.3);
    guancia.scale.set(1.1, 0.6, 0.4);
    guancia.userData.senzaContorno = true;
    testa.add(guancia);
  }

  // dettagli per specie
  let coda: THREE.Object3D | null = null;
  const orecchio = (x: number, r: number, h: number, colore: string, inclina = 0.3, interno?: string) => {
    const g = new THREE.Group();
    g.position.set(x, 0.32, -0.04);
    g.rotation.z = -Math.sign(x) * inclina;
    const o = mesh(geo.cono(r, h, 10), pelo(colore), 0, h / 2, 0);
    o.scale.z = 0.55;
    g.add(o);
    if (interno) {
      const i = mesh(geo.cono(r * 0.6, h * 0.7, 8), mat(interno, { rim: 0 }), 0, h * 0.4, 0.04);
      i.scale.z = 0.4;
      i.userData.senzaContorno = true;
      g.add(i);
    }
    testa.add(g);
    return g;
  };
  switch (a.specie) {
    case 'volpe': {
      // orecchie grandi a triangolo con la punta scura
      for (const x of [-0.25, 0.25]) {
        const o = orecchio(x, 0.17, 0.4, p.corpo, 0.28, '#fff3e0');
        const punta = mesh(geo.cono(0.075, 0.13, 10), mat('#3a2418'), 0, 0.36, 0);
        punta.scale.z = 0.55;
        o.add(punta);
      }
      // guance bianche a ciuffo, tipiche della volpe
      for (const x of [-0.3, 0.3]) {
        const c = mesh(geo.cono(0.12, 0.22, 8), mat(p.extra), x, -0.2, 0.18);
        c.rotation.z = Math.sign(x) * 1.9;
        testa.add(c);
      }
      const c = new THREE.Group();
      c.position.set(0, 0.42, -0.3);
      const pennacchio = mesh(geo.palla(0.22), pelo(p.corpo), 0, 0.14, -0.2);
      pennacchio.scale.set(0.85, 0.85, 1.55);
      c.add(pennacchio);
      c.add(mesh(geo.palla(0.13), mat(p.extra), 0, 0.2, -0.5));
      corpo.add(c);
      coda = c;
      break;
    }
    case 'daino': {
      // orecchie grandi a foglia, di lato
      for (const x of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(x * 0.4, 0.14, -0.04);
        g.rotation.z = -x * 1.25;
        const o = mesh(geo.palla(0.13), pelo(p.corpo), 0, 0.14, 0);
        o.scale.set(0.75, 1.6, 0.35);
        g.add(o);
        const i = mesh(geo.palla(0.09), mat('#f0b8a8', { rim: 0 }), 0, 0.14, 0.03);
        i.scale.set(0.65, 1.4, 0.3);
        i.userData.senzaContorno = true;
        g.add(i);
        testa.add(g);
      }
      // macchie bianche sulla schiena e sulla fronte
      for (const [x, y, z, r] of [[-0.14, 0.7, -0.02, 0.055], [0.13, 0.72, 0.04, 0.05], [0.22, 0.6, -0.14, 0.045], [-0.03, 0.72, -0.18, 0.05], [-0.24, 0.58, -0.12, 0.045], [0.06, 0.66, -0.28, 0.04]]) {
        const m = mesh(geo.palla(r), mat(p.extra, { rim: 0 }), x, y, z);
        m.scale.y = 0.6;
        m.userData.senzaContorno = true;
        corpo.add(m);
      }
      const stella = mesh(geo.palla(0.06), mat(p.extra, { rim: 0 }), 0, 0.28, 0.38);
      stella.scale.set(0.8, 1.2, 0.4);
      stella.userData.senzaContorno = true;
      testa.add(stella);
      if (a.sesso === 'm' && a.fase !== 'cucciolo') for (const x of [-0.13, 0.13]) {
        const corno = mesh(geo.capsula(0.025, 0.18), mat('#8a5a36'), x, 0.46, -0.06);
        corno.rotation.z = -x * 2.2;
        testa.add(corno);
      }
      const c = mesh(geo.palla(0.09), mat(p.extra), 0, 0.5, -0.36);
      corpo.add(c);
      coda = c;
      break;
    }
    case 'tasso': {
      orecchio(-0.32, 0.08, 0.1, p.extra, 1.0);
      orecchio(0.32, 0.08, 0.1, p.extra, 1.0);
      // maschera: due bande scure dagli occhi alle orecchie e fronte bianca
      // due bande scure dagli occhi in su, ben visibili, e la striscia bianca in mezzo
      for (const x of [-0.19, 0.19]) {
        const banda = mesh(geo.palla(0.2), mat(p.extra, { rim: 0.15 }), x, 0.1, 0.33);
        banda.scale.set(0.55, 1.35, 0.6);
        banda.rotation.z = -x * 0.6;
        banda.userData.senzaContorno = true;
        testa.add(banda);
      }
      const fronte = mesh(geo.palla(0.15), mat('#ffffff', { rim: 0.2 }), 0, 0.16, 0.38);
      fronte.scale.set(0.6, 1.5, 0.55);
      fronte.userData.senzaContorno = true;
      testa.add(fronte);
      busto.scale.set(1.15, 0.9, 1.15);
      const c = mesh(geo.palla(0.1), pelo(p.corpo), 0, 0.42, -0.36);
      c.scale.set(0.8, 0.8, 1.3);
      corpo.add(c);
      coda = c;
      break;
    }
    case 'riccio': {
      orecchio(-0.27, 0.07, 0.08, p.corpo, 1.0);
      orecchio(0.27, 0.07, 0.08, p.corpo, 1.0);
      const aculei = mesh(new THREE.IcosahedronGeometry(0.4, 1), mat(p.extra), 0, 0.55, -0.12);
      aculei.scale.set(1.05, 0.95, 1.1);
      corpo.add(aculei);
      break;
    }
    case 'scoiattolo': {
      orecchio(-0.22, 0.09, 0.22, p.corpo, 0.15, '#f2b9a0');
      orecchio(0.22, 0.09, 0.22, p.corpo, 0.15, '#f2b9a0');
      const c = new THREE.Group();
      c.position.set(0, 0.4, -0.3);
      const q = mesh(geo.palla(0.26), pelo(p.extra), 0, 0.4, -0.1);
      q.scale.set(0.75, 1.5, 0.8);
      c.add(q);
      corpo.add(c);
      coda = c;
      break;
    }
    case 'lepre': {
      for (const x of [-0.12, 0.12]) {
        const o = mesh(geo.capsula(0.08, 0.36), pelo(p.corpo), x, 0.52, -0.04);
        o.rotation.z = -x;
        testa.add(o);
      }
      const c = mesh(geo.palla(0.11), mat('#ffffff'), 0, 0.42, -0.36);
      corpo.add(c);
      coda = c;
      break;
    }
  }

  // maschi: ciuffo di pelo in testa (e bozzetti delle corna per i daini piccoli)
  if (a.sesso === 'm') {
    for (const [x, rz] of [[-0.06, 0.4], [0.02, 0], [0.09, -0.4]]) {
      const ciuffo = mesh(geo.cono(0.05, 0.16, 6), pelo(p.corpo), x, 0.46, 0.06);
      ciuffo.rotation.z = rz;
      testa.add(ciuffo);
    }
    if (a.specie === 'daino' && a.fase === 'cucciolo') for (const x of [-0.13, 0.13]) testa.add(mesh(geo.palla(0.05), mat('#8a5a36'), x, 0.42, -0.04));
  }
  // altri segni particolari
  if (t.segno === 'stellina in fronte') {
    const stella = mesh(geo.palla(0.07), mat('#fffaf0', { rim: 0 }), 0, 0.22, 0.4);
    stella.scale.set(1, 1.2, 0.35);
    stella.userData.senzaContorno = true;
    testa.add(stella);
  }
  if (t.segno === 'lentiggini') for (const x of [-1, 1]) for (let k = 0; k < 3; k++) {
    const l = mesh(geo.palla(0.014, 6), mat('#7a4a30', { rim: 0 }), x * (0.22 + k * 0.035), -0.1 + (k % 2) * 0.03, 0.39 - k * 0.02);
    l.userData.senzaContorno = true;
    testa.add(l);
  }
  if (t.segno === 'punta della coda scura' && coda) {
    const punta = mesh(geo.palla(0.09), mat('#3a2418'), 0, 0.2, -0.5);
    coda.add(punta);
  }

  contorno(corpo);
  gruppo.userData.taglia = t.taglia;
  const m: ModelloAnimale = { gruppo, corpo, testa, zampe, coda, occhi, accessorio: null, mestiere: null };
  aggiornaMestiere(m, a.mestiere);
  gruppo.userData.id = a.id;
  return m;
}

/** Cappello da cuoco, sciarpa da musicista, grembiule da artigiano... */
export function aggiornaMestiere(m: ModelloAnimale, mestiere: string | null) {
  if (m.mestiere === mestiere) return;
  if (m.accessorio) m.accessorio.parent?.remove(m.accessorio);
  m.accessorio = null;
  m.mestiere = mestiere;
  if (!mestiere) return;
  const g = new THREE.Group();
  if (mestiere === 'cuoco') {
    g.add(mesh(geo.cil(0.2, 0.18, 0.14), mat('#ffffff'), 0, 0.44, -0.04));
    const sbuffo = mesh(geo.palla(0.26), mat('#ffffff'), 0, 0.6, -0.04);
    sbuffo.scale.set(1, 0.7, 1);
    g.add(sbuffo);
    m.testa.add(contorno(g));
  } else if (mestiere === 'musicista') {
    const s = mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 16), mat('#d64545'), 0, 0.66, 0.02);
    s.rotation.x = Math.PI / 2;
    g.add(s);
    const coda = mesh(geo.scatola(0.12, 0.26, 0.05), mat('#d64545'), 0.12, 0.52, 0.2);
    coda.rotation.z = 0.3;
    g.add(coda);
    m.corpo.add(contorno(g));
  } else {
    const gr = mesh(geo.scatola(0.38, 0.34, 0.05), mat('#8a5a36'), 0, 0.38, 0.3);
    gr.rotation.x = -0.15;
    g.add(gr);
    g.add(mesh(geo.palla(0.05), mat('#f2c94c'), 0.1, 0.42, 0.33));
    m.corpo.add(contorno(g));
  }
  m.accessorio = g;
}

// ---------- uovo e nido ----------

export function creaUovo(colore: string): THREE.Group {
  const g = new THREE.Group();
  const guscio = mesh(geo.palla(0.3), mat('#fff7e6', { rim: 0.5 }), 0, 0.38, 0);
  guscio.scale.set(1, 1.3, 1);
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
const corteccia = () => mat('#ffffff', { map: texture(64, macchie(['#8a5a36', '#6d4428', '#a06a40'], 1, 11)) });

export function creaAlbero(scala = 1, tinta = 0, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.16, 0.24, 1.2, 8), corteccia(), 0, 0.6, 0));
  // chioma a nuvola: tante palle morbide
  for (const [x, y, z, r] of [[0, 1.55, 0, 0.8], [0.45, 1.35, 0.1, 0.55], [-0.45, 1.4, -0.05, 0.58], [0.1, 2.05, -0.1, 0.6], [-0.15, 1.35, 0.42, 0.5]])
    g.add(mesh(geo.palla(r, 12), chioma(tinta), x, y, z));
  g.add(ombra(0.9));
  g.scale.setScalar(scala);
  return conContorno ? contorno(g) : g;
}

export function creaPino(scala = 1, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.12, 0.16, 0.6, 8), corteccia(), 0, 0.3, 0));
  for (const [y, r, h] of [[0.9, 0.85, 1.1], [1.5, 0.65, 0.95], [2.0, 0.42, 0.8]]) g.add(mesh(geo.cono(r, h, 10), mat('#3d7550', { rim: 0.2 }), 0, y, 0));
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

const pietra = () => mat('#ffffff', { map: texture(64, macchie(['#9c968c', '#857f76', '#b2aca2', '#6f6a62'], 1.2, 41)), rim: 0.15 });
const assi = () => mat('#ffffff', { map: texture(64, macchie(['#9a6c44', '#83592f', '#b08050'], 1, 23)), rim: 0.1 });

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

export function creaLaghetto(): THREE.Group {
  const g = new THREE.Group();
  const acqua = mesh(new THREE.CircleGeometry(1.3, 28), materiale({ color: '#5aa8d8', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  acqua.rotation.x = -Math.PI / 2;
  acqua.position.y = 0.03;
  acqua.scale.set(1.3, 0.9, 1);
  acqua.name = 'acqua';
  g.add(acqua);
  for (let i = 0; i < 11; i++) {
    const s = creaSasso(0.4 + (i % 3) * 0.12);
    const a = (i / 11) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.75, s.position.y, Math.sin(a) * 1.25);
    g.add(s);
  }
  // ninfee
  for (const [x, z] of [[0.4, 0.2], [-0.5, -0.3], [0.1, -0.5]]) {
    const n = mesh(geo.cil(0.18, 0.18, 0.02, 10), mat('#4f9a50'), x, 0.05, z);
    g.add(n);
    g.add(mesh(geo.palla(0.06, 8), mat('#ff9ab8'), x + 0.05, 0.1, z));
  }
  return g;
}

export function creaPonticello(): THREE.Group {
  const g = new THREE.Group();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const asse = mesh(geo.scatola(0.3, 0.06, 0.8), assi(), t * 2.6, 0.3 + Math.cos(t * Math.PI) * 0.35, 0);
    asse.rotation.z = -Math.sin(t * Math.PI) * 0.45;
    g.add(asse);
  }
  for (const z of [-0.42, 0.42]) for (let i = 0; i <= 4; i++) {
    const t = i / 4 - 0.5;
    g.add(mesh(geo.cil(0.04, 0.04, 0.5, 6), assi(), t * 2.4, 0.55 + Math.cos(t * Math.PI) * 0.35, z));
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

function legnoMat() {
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
  const simboli: Record<string, string> = { cuoco: '🍲', musicista: '♪', artigiano: '✂', fabbro: '⚒', taglialegna: '🪓', guardia: '🛡', guaritore: '✚', locandiere: '🍵', esploratore: '🧭', bibliotecario: '📚', costruttore: '🔨', capovillaggio: '★', mercante: '⚖', giardiniere: '🌱', 'custode delle scorte': '🧺', pittore: '🎨', cantastorie: '📜' };
  const insegna = mesh(geo.scatola(0.5, 0.5, 0.04), mat('#ffffff', { map: texture(64, (c, l) => {
    c.fillStyle = '#fff8e7'; c.fillRect(0, 0, l, l);
    c.strokeStyle = '#8a5a36'; c.lineWidth = 6; c.strokeRect(3, 3, l - 6, l - 6);
    c.font = `${l * 0.55}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#4a3424'; c.fillText(simboli[mestiere] ?? '★', l / 2, l / 2 + 2);
  }), rim: 0 }), 0, 1.05, 0.58);
  g.add(insegna);
  return contorno(g);
}
