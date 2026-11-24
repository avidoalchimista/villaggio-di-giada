// Le cose all'aperto: i pezzi da mettere in fila (staccionate, siepi, muretti, lampioni),
// il giardinetto davanti a ogni casa (pensato come un piccolo set, diverso per ognuno),
// i pezzi che gli animali aggiungono da soli alla casa col tempo (patio, stendino, capanno...)
// e le costruzioni nuove che Giada compra con le castagne (fontana, gazebo, altalena...).
//
// Come nei giochi di villaggio, ogni giardinetto è una piccola scena con un tema
// (il giardino fiorito, l'angolo del tè, la legnaia...): un fondo (ghiaia, prato rasato, assi),
// un bordo (staccionata bianca, siepe, muretto) con l'apertura in corrispondenza della porta,
// il vialetto fino alla porta, la cassetta delle lettere, e 2-3 cose che vanno insieme.
import * as THREE from 'three';
import type { Emozione, Specie } from '../lib/tipi';
import type { TipoFila } from '../lib/arredo';
import { assi, creaFiore, creaLanterna, creaRecinto, geo, legnoMat, mat, mesh, pietra, SAGOMA_CASA } from './modelli';
import { contorno, materiale, ombra, spriteTesto, texture } from './ps1';

// materiali dipinti (con la texture): uno solo per tipo, non uno per pezzo
let _pietra: THREE.Material | null = null, _assi: THREE.Material | null = null, _legno: THREE.Material | null = null;
const P = () => (_pietra ??= pietra());
const A = () => (_assi ??= assi());
const L = () => (_legno ??= legnoMat());
let _ghiaia: THREE.Material | null = null;
const ghiaia = () => (_ghiaia ??= mat('#ffffff', {
  map: texture(64, (c, l) => {
    c.fillStyle = '#d9c9a4'; c.fillRect(0, 0, l, l);
    for (let i = 0; i < 160; i++) { c.fillStyle = ['#c8b48a', '#e8dcc0', '#b8a47a', '#f2e8d2'][i % 4]; c.fillRect((i * 37) % l, (i * 53) % l, 2 + (i % 2), 2); }
  }, 2), rim: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
}));
let _prato: THREE.Material | null = null;
const pratoRasato = () => (_prato ??= mat('#ffffff', {
  map: texture(64, (c, l) => {
    c.fillStyle = '#7fbf5a'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#74b250'; for (let y = 0; y < l; y += 16) c.fillRect(0, y, l, 8); // a strisce, come un prato tagliato
  }, 2), rim: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
}));

const add = <T extends THREE.Object3D>(g: THREE.Object3D, o: T, x = 0, y = 0, z = 0): T => { o.position.set(x, y, z); g.add(o); return o; };
/** Una cosa per terra che non ingombra (ci si passa sopra): niente impronta. */
const piatta = <T extends THREE.Object3D>(o: T): T => { o.userData.nonIngombra = true; o.traverse((c) => (c.userData.senzaContorno = true)); return o; };
/** Una cosa del giardino che ha la sua piccola impronta (gli animali ci girano intorno). */
const ingombra = <T extends THREE.Object3D>(o: T, r = 0.3): T => { o.userData.spazio = r; return o; };

/** Un rettangolo arrotondato piatto per terra (il fondo del giardinetto, il patio...). */
function fondo(w: number, p: number, m: THREE.Material, raggio = 0.3): THREE.Mesh {
  const s = new THREE.Shape();
  const x = -w / 2, y = -p / 2, r = Math.min(raggio, w / 2, p / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + p - r); s.quadraticCurveTo(x + w, y + p, x + w - r, y + p);
  s.lineTo(x + r, y + p); s.quadraticCurveTo(x, y + p, x, y + p - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const o = mesh(new THREE.ShapeGeometry(s, 6), m);
  o.rotation.x = -Math.PI / 2;
  o.userData.senzaContorno = true;
  return o;
}

// ---------- pezzi da mettere in fila ----------

/** Un pezzo di fila, lungo l'asse x (lungo quanto `FILA[tipo].passo`). */
export function creaPezzoFila(tipo: TipoFila): THREE.Group {
  switch (tipo) {
    case 'recinto': return creaRecinto();
    case 'siepe': {
      const g = new THREE.Group();
      const verde = mat('#4f9a46', { rim: 0.3 });
      add(g, mesh(geo.scatola(1.5, 0.62, 0.5), verde), 0, 0.33, 0);
      for (let i = 0; i < 4; i++) add(g, mesh(geo.palla(0.26, 8), verde), -0.56 + i * 0.37, 0.62, (i % 2) * 0.06 - 0.03);
      g.add(ombra(0.6));
      return contorno(g);
    }
    case 'muretto': {
      const g = new THREE.Group();
      for (let fila = 0; fila < 3; fila++)
        for (let i = 0; i < 4; i++) {
          const x = -0.56 + i * 0.37 + (fila % 2) * 0.18;
          if (x > 0.62) continue;
          const s = add(g, mesh(geo.scatola(0.34, 0.16, 0.36), P()), x, 0.08 + fila * 0.16, 0);
          s.rotation.y = ((i * 7 + fila * 3) % 5 - 2) * 0.04;
        }
      add(g, mesh(geo.scatola(1.5, 0.06, 0.4), P()), 0, 0.5, 0);
      return contorno(g);
    }
    case 'paletti': {
      const g = new THREE.Group();
      for (const x of [-0.95, 0.95]) add(g, mesh(geo.cil(0.05, 0.06, 0.6, 6), A()), x, 0.3, 0);
      // la corda che pende un po' in mezzo
      const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.95, 0.52, 0), new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.95, 0.52, 0));
      add(g, mesh(new THREE.TubeGeometry(curva, 10, 0.018, 5), mat('#d8c08a', { rim: 0 })));
      return contorno(g);
    }
    case 'lampione': {
      const g = new THREE.Group();
      g.add(ombra(0.35));
      const ferro = mat('#2f3238', { rim: 0.2 });
      add(g, mesh(geo.cil(0.12, 0.15, 0.12, 8), ferro), 0, 0.06, 0);
      add(g, mesh(geo.cil(0.035, 0.045, 1.9, 6), ferro), 0, 1.0, 0);
      add(g, mesh(geo.cil(0.16, 0.12, 0.08, 6), ferro), 0, 1.98, 0);
      // la lanterna: un vetro caldo che di notte si accende (vedi scena.ts, lucePiccola)
      const luce = add(g, mesh(geo.cil(0.11, 0.08, 0.26, 6), materiale({ color: '#ffe8b0', emissive: '#ffb347', emissiveIntensity: 0.2, rim: 0 })), 0, 2.15, 0);
      luce.name = 'luce';
      add(g, mesh(geo.cono(0.18, 0.16, 6), ferro), 0, 2.36, 0);
      return contorno(g);
    }
  }
}

/**
 * Una copia trasparente (fantasma) di un pezzo: si vede dove andrà prima di metterlo.
 * I materiali sono copiati (non si toccano quelli veri, che sono condivisi) e tengono la curva del mondo.
 */
export function fantasma(o: THREE.Object3D, colore = '#ffffff'): THREE.Object3D {
  const copie = new Map<THREE.Material, THREE.Material>();
  o.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    if (c.userData.senzaContorno && c.material instanceof THREE.MeshBasicMaterial && c.material.side === THREE.BackSide) { c.visible = false; return; }
    const m = c.material as THREE.Material;
    let k = copie.get(m);
    if (!k) {
      k = m.clone();
      k.onBeforeCompile = m.onBeforeCompile;
      k.customProgramCacheKey = m.customProgramCacheKey;
      k.transparent = true;
      k.opacity = 0.5;
      k.depthWrite = false;
      if ('emissive' in k) { (k as THREE.MeshToonMaterial).emissive = new THREE.Color(colore); (k as THREE.MeshToonMaterial).emissiveIntensity = 0.35; }
      copie.set(m, k);
    }
    c.material = k;
    c.raycast = () => {};
  });
  o.userData.fantasma = true;
  return o;
}

// ---------- il giardinetto davanti alla casa ----------

interface Colori { muro: string; tetto: string; porta: string }

/** Il tema del giardinetto: secondo l'emozione con cui è nato l'animale (come i colori della casa). */
export const TEMA_GIARDINO: Record<Emozione, string> = {
  gioia: 'il giardino fiorito',
  fiducia: "l'angolo del tè",
  paura: "l'angolo tranquillo, con le lanterne",
  sorpresa: "l'angolo dei giochi",
  tristezza: 'il giardino della pioggia',
  disgusto: "l'orto delle erbe",
  rabbia: 'la legnaia',
  attesa: "l'angolo del viaggio",
};

/**
 * Il giardinetto davanti alla casa (la porta è verso +z, la facciata a z = `fronte`).
 * A destra della porta c'è la postazione di lavoro (botteghe.ts), quindi il set sta a sinistra,
 * con il vialetto in mezzo e il bordo davanti che lascia l'apertura per il vialetto.
 */
export function creaGiardinetto(emozione: Emozione, c: Colori, fronte: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'giardinetto';
  const F = Math.max(fronte, 1.1); // la facciata
  const z0 = F + 0.75, z1 = F + 2.65; // il giardinetto, da dietro a davanti
  const x0 = -2.75, x1 = -0.5;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, p = z1 - z0;

  // il fondo: ognuno il suo
  const fondoMat = emozione === 'gioia' || emozione === 'tristezza' || emozione === 'paura' ? pratoRasato() : emozione === 'fiducia' || emozione === 'attesa' ? ghiaia() : emozione === 'rabbia' ? mat('#b89a74', { rim: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }) : ghiaia();
  add(g, piatta(fondo(w, p, fondoMat, 0.4)), cx, 0.012, cz);

  // il vialetto di pietre piatte dalla porta al bordo
  for (let i = 0; i < 5; i++) {
    const s = add(g, piatta(mesh(geo.cil(0.2, 0.22, 0.04, 9), P())), (i % 2) * 0.1 - 0.05, 0.02, F + 0.35 + i * 0.5);
    s.scale.set(1, 1, 0.8);
  }

  // il bordo davanti e a sinistra, con l'apertura dove arriva il vialetto
  bordo(g, emozione, c, x0, x1, z0, z1);

  // la cassetta delle lettere all'ingresso del vialetto, del colore della porta
  const cassetta = ingombra(new THREE.Group(), 0.18);
  add(cassetta, mesh(geo.cil(0.035, 0.04, 0.9, 6), L()), 0, 0.45, 0);
  add(cassetta, mesh(geo.scatola(0.26, 0.22, 0.36), mat(c.porta, { rim: 0.3 })), 0, 0.98, 0);
  add(cassetta, mesh(geo.cil(0.13, 0.13, 0.36, 10, ), mat(c.porta, { rim: 0.3 })), 0, 1.08, 0).rotation.x = Math.PI / 2;
  add(cassetta, mesh(geo.scatola(0.02, 0.16, 0.08), mat('#e8443a')), 0.14, 1.12, -0.08);
  add(g, cassetta, -0.42, 0, z1 + 0.02);

  // il set: 2-3 cose che vanno insieme, sistemate sul fondo
  const set = new THREE.Group();
  set.position.set(cx, 0, cz);
  g.add(set);
  setGiardino(set, emozione, c, w, p);
  return g;
}

/** Il bordo del giardinetto (davanti e a sinistra), diverso per ogni tema. */
function bordo(g: THREE.Group, emozione: Emozione, c: Colori, x0: number, x1: number, z0: number, z1: number) {
  const tratto = (xa: number, za: number, xb: number, zb: number) => {
    const l = Math.hypot(xb - xa, zb - za);
    const t = ingombra(new THREE.Group(), 0.15);
    t.position.set((xa + xb) / 2, 0, (za + zb) / 2);
    t.rotation.y = Math.atan2(-(zb - za), xb - xa);
    const n = Math.max(1, Math.round(l / 0.45));
    switch (emozione) {
      case 'gioia': case 'sorpresa': {
        // staccionata bassa a punta (bianca per la gioia, a colori per la sorpresa)
        const colori = ['#ff8fb1', '#ffd166', '#7fc8f8', '#7ccf6a', '#b39ddb'];
        for (let i = 0; i <= n; i++) {
          const x = -l / 2 + (i / n) * l;
          const m = emozione === 'gioia' ? mat('#fbf6ec', { rim: 0.2 }) : mat(colori[i % colori.length], { rim: 0.2 });
          add(t, mesh(geo.scatola(0.08, 0.42, 0.04), m), x, 0.21, 0);
          add(t, mesh(geo.cono(0.06, 0.08, 4), m), x, 0.46, 0).rotation.y = Math.PI / 4;
        }
        for (const y of [0.14, 0.3]) add(t, mesh(geo.scatola(l, 0.04, 0.03), mat('#fbf6ec', { rim: 0.2 })), 0, y, -0.035);
        break;
      }
      case 'paura': case 'fiducia': {
        // siepe bassa e tonda, tagliata bene
        const verde = mat(emozione === 'paura' ? '#3f8a48' : '#5aa04a', { rim: 0.3 });
        add(t, mesh(geo.scatola(l, 0.34, 0.32), verde), 0, 0.17, 0);
        for (let i = 0; i < n; i++) add(t, mesh(geo.palla(0.19, 8), verde), -l / 2 + (i + 0.5) * (l / n), 0.34, 0);
        break;
      }
      case 'tristezza': case 'rabbia': {
        // muretto basso di sassi
        for (let i = 0; i < n; i++) {
          const s = add(t, mesh(geo.palla(0.17, 6), P()), -l / 2 + (i + 0.5) * (l / n), 0.1, (i % 2) * 0.04);
          s.scale.set(1.25, 0.7, 1);
        }
        break;
      }
      case 'disgusto': {
        // graticcio di rami intrecciati
        for (let i = 0; i <= n; i++) add(t, mesh(geo.cil(0.025, 0.03, 0.42, 5), L()), -l / 2 + (i / n) * l, 0.21, 0);
        for (const y of [0.12, 0.22, 0.32]) add(t, mesh(geo.scatola(l, 0.05, 0.05), mat('#8a6a40')), 0, y, ((y * 10) % 2) * 0.02);
        break;
      }
      case 'attesa': {
        // paletti con la corda
        for (let i = 0; i <= Math.ceil(n / 2); i++) add(t, mesh(geo.cil(0.035, 0.04, 0.42, 6), A()), -l / 2 + (i / Math.ceil(n / 2)) * l, 0.21, 0);
        add(t, mesh(geo.scatola(l, 0.025, 0.025), mat('#d8c08a', { rim: 0 })), 0, 0.36, 0);
        break;
      }
    }
    void c;
    g.add(t);
  };
  tratto(x0, z1, x1 - 0.08, z1); // davanti (fino al vialetto)
  tratto(x0, z0, x0, z1); // a sinistra
}

/** Le cose del giardinetto, sistemate intorno al centro (0, 0) di un fondo largo w e profondo p. */
function setGiardino(s: THREE.Group, emozione: Emozione, c: Colori, w: number, p: number) {
  const W = w / 2 - 0.35, Pz = p / 2 - 0.35;
  switch (emozione) {
    case 'gioia': {
      // un'aiuola tonda di fiori gialli e arancio con il bordo di sassi, la casetta per gli uccellini, l'annaffiatoio
      const aiuola = ingombra(new THREE.Group(), 0.6);
      add(aiuola, piatta(mesh(geo.cil(0.55, 0.55, 0.03, 16), mat('#6a4a2c', { rim: 0 }))), 0, 0.02, 0);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; add(aiuola, mesh(geo.palla(0.08, 6), P()), Math.cos(a) * 0.58, 0.05, Math.sin(a) * 0.58).scale.y = 0.6; }
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = 0.12 + (i % 3) * 0.13; const f = creaFiore(['#ffcf33', '#ff9a2e', '#ffffff'][i % 3]); f.scale.setScalar(2.2); add(aiuola, f, Math.cos(a) * d, 0, Math.sin(a) * d); }
      add(s, aiuola, -0.15, 0, 0.1);
      const nido = ingombra(new THREE.Group(), 0.15);
      add(nido, mesh(geo.cil(0.035, 0.04, 1.2, 6), L()), 0, 0.6, 0);
      add(nido, mesh(geo.scatola(0.26, 0.26, 0.24), mat(c.porta, { rim: 0.3 })), 0, 1.32, 0);
      add(nido, mesh(geo.cono(0.24, 0.18, 4), mat(c.tetto, { rim: 0.3 })), 0, 1.54, 0).rotation.y = Math.PI / 4;
      add(nido, mesh(geo.cil(0.05, 0.05, 0.02, 10), mat('#2a1a10')), 0, 1.34, 0.125).rotation.x = Math.PI / 2;
      add(s, nido, -W + 0.05, 0, -Pz + 0.1);
      const ann = new THREE.Group();
      add(ann, mesh(geo.cil(0.1, 0.12, 0.2, 10), mat('#5fa0d0', { rim: 0.3 })), 0, 0.1, 0);
      add(ann, mesh(geo.cil(0.015, 0.025, 0.22, 5), mat('#5fa0d0')), 0.13, 0.17, 0).rotation.z = -0.9;
      add(s, ann, W - 0.1, 0, Pz - 0.05);
      break;
    }
    case 'fiducia': {
      // l'angolo del tè: tavolino tondo, due sgabelli, la teiera e i fiori in vaso
      const tav = ingombra(new THREE.Group(), 0.38);
      add(tav, mesh(geo.cil(0.36, 0.36, 0.05, 14), L()), 0, 0.55, 0);
      add(tav, mesh(geo.cil(0.05, 0.08, 0.53, 6), L()), 0, 0.27, 0);
      add(tav, mesh(geo.palla(0.09, 10), mat('#ffffff', { rim: 0.3 })), 0.05, 0.64, 0).scale.y = 0.8;
      add(tav, mesh(geo.cil(0.012, 0.02, 0.1, 5), mat('#ffffff')), 0.15, 0.66, 0).rotation.z = -1;
      for (const [x, z] of [[-0.18, 0.12], [0.2, -0.15]]) add(tav, mesh(geo.cil(0.05, 0.04, 0.05, 8), mat('#e8584a')), x, 0.6, z);
      add(s, tav, 0.05, 0, 0);
      for (const [x, z] of [[-0.6, 0.15], [0.62, -0.1]]) {
        const sg = add(s, ingombra(new THREE.Group(), 0.18), x, 0, z);
        add(sg, mesh(geo.cil(0.17, 0.17, 0.06, 10), mat(c.porta, { rim: 0.3 })), 0, 0.36, 0);
        for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; add(sg, mesh(geo.cil(0.025, 0.025, 0.34, 5), L()), Math.cos(a) * 0.11, 0.17, Math.sin(a) * 0.11); }
      }
      vaso(s, -W + 0.05, -Pz + 0.05, '#ff8fb1');
      vaso(s, W - 0.1, Pz - 0.05, '#ffffff');
      break;
    }
    case 'paura': {
      // l'angolo tranquillo: una panchina riparata da un alberello, con due lanterne accese ai lati
      const pan = ingombra(new THREE.Group(), 0.45);
      add(pan, mesh(geo.scatola(0.95, 0.07, 0.34), L()), 0, 0.38, 0);
      add(pan, mesh(geo.scatola(0.95, 0.26, 0.05), L()), 0, 0.6, -0.16).rotation.x = -0.15;
      for (const x of [-0.4, 0.4]) add(pan, mesh(geo.scatola(0.07, 0.38, 0.3), L()), x, 0.19, 0);
      add(s, pan, 0, 0, -0.05);
      for (const x of [-0.72, 0.72]) {
        const l = creaLanterna();
        l.luce.material = mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 1.2, rim: 0 });
        l.gruppo.scale.setScalar(0.75);
        add(s, ingombra(l.gruppo, 0.12), x, 0, -0.1);
      }
      const albero = ingombra(new THREE.Group(), 0.2);
      add(albero, mesh(geo.cil(0.06, 0.09, 1.3, 6), L()), 0, 0.65, 0);
      for (const [x, y, z, r] of [[0, 1.55, 0, 0.42], [0.25, 1.4, 0.1, 0.3], [-0.25, 1.42, -0.05, 0.32]]) add(albero, mesh(geo.palla(r, 9), mat('#4f9a46', { rim: 0.3 })), x, y, z);
      add(s, albero, -W + 0.1, 0, -Pz + 0.05);
      break;
    }
    case 'sorpresa': {
      // l'angolo dei giochi: la sabbiera con le palle colorate, la girandola, le bandierine tra due pali
      const sab = ingombra(new THREE.Group(), 0.5);
      for (const [x, z, lx, lz] of [[0, -0.42, 0.95, 0.08], [0, 0.42, 0.95, 0.08], [-0.44, 0, 0.08, 0.92], [0.44, 0, 0.08, 0.92]]) add(sab, mesh(geo.scatola(lx, 0.16, lz), L()), x, 0.08, z);
      add(sab, piatta(mesh(geo.scatola(0.82, 0.02, 0.78), mat('#f2dc9a', { rim: 0 }))), 0, 0.1, 0);
      for (const [x, z, col] of [[-0.15, 0.1, '#ff6f91'], [0.18, -0.12, '#7fc8f8']] as const) add(sab, mesh(geo.palla(0.1, 10), mat(col, { rim: 0.4 })), x, 0.2, z);
      add(s, sab, 0.1, 0, 0.12);
      const gir = ingombra(new THREE.Group(), 0.1);
      add(gir, mesh(geo.cil(0.02, 0.02, 0.9, 5), L()), 0, 0.45, 0);
      const elica = add(gir, new THREE.Group(), 0, 0.92, 0.04);
      elica.name = 'girandola';
      ['#ff6f91', '#ffd166', '#7fc8f8', '#7ccf6a'].forEach((col, i) => { const pala = add(elica, mesh(geo.cono(0.08, 0.2, 3), mat(col, { side: THREE.DoubleSide })), 0, 0, 0); pala.rotation.z = (i / 4) * Math.PI * 2; pala.position.set(Math.sin(-pala.rotation.z) * 0.1, Math.cos(pala.rotation.z) * 0.1, 0); });
      add(s, gir, W - 0.05, 0, -Pz + 0.05);
      const pali = new THREE.Group();
      for (const z of [-Pz, Pz]) add(pali, ingombra(mesh(geo.cil(0.03, 0.035, 1.3, 6), L()), 0.08), 0, 0.65, z);
      const colori = ['#ff6f91', '#ffd166', '#7fc8f8', '#7ccf6a', '#b39ddb'];
      for (let i = 0; i < 7; i++) {
        const k = (i + 0.5) / 7;
        const b = add(pali, mesh(geo.cono(0.06, 0.13, 3), mat(colori[i % 5], { side: THREE.DoubleSide })), 0, 1.18 - Math.sin(k * Math.PI) * 0.18, -Pz + k * 2 * Pz);
        b.rotation.x = Math.PI;
        b.userData.senzaContorno = true;
      }
      add(s, pali, -W, 0, 0);
      break;
    }
    case 'tristezza': {
      // il giardino della pioggia: la vaschetta per gli uccellini, le ortensie blu, una panchina di pietra
      const vasca = ingombra(new THREE.Group(), 0.3);
      add(vasca, mesh(geo.cil(0.09, 0.14, 0.6, 8), P()), 0, 0.3, 0);
      add(vasca, mesh(geo.cil(0.32, 0.22, 0.12, 14), P()), 0, 0.64, 0);
      add(vasca, mesh(geo.cil(0.27, 0.27, 0.02, 14), materiale({ color: '#6fb6e8', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6 })), 0, 0.7, 0);
      add(s, vasca, 0.1, 0, 0.05);
      for (const [x, z] of [[-W + 0.1, -Pz + 0.1], [-W + 0.15, Pz - 0.1], [W - 0.05, -Pz + 0.1]]) {
        const o = add(s, ingombra(new THREE.Group(), 0.25), x, 0, z);
        add(o, mesh(geo.palla(0.24, 8), mat('#4f9a46', { rim: 0.3 })), 0, 0.2, 0);
        for (let k = 0; k < 4; k++) add(o, mesh(geo.palla(0.1, 7), mat(['#7fa8f8', '#a58be0', '#8fc8ff'][k % 3], { rim: 0.3 })), Math.cos(k * 1.6) * 0.14, 0.33, Math.sin(k * 1.6) * 0.14);
      }
      const panca = add(s, ingombra(new THREE.Group(), 0.3), W - 0.25, 0, Pz - 0.15);
      add(panca, mesh(geo.scatola(0.7, 0.08, 0.28), P()), 0, 0.34, 0);
      for (const x of [-0.25, 0.25]) add(panca, mesh(geo.scatola(0.14, 0.3, 0.22), P()), x, 0.15, 0);
      panca.rotation.y = 0.3;
      break;
    }
    case 'disgusto': {
      // l'orto delle erbe: una cassetta rialzata con le file di erbe, i vasi di terracotta, lo spaventapasseri piccolo
      const cass = ingombra(new THREE.Group(), 0.45);
      add(cass, mesh(geo.scatola(1.1, 0.3, 0.6), L()), 0, 0.15, 0);
      add(cass, mesh(geo.scatola(1.0, 0.03, 0.5), mat('#5a3a22', { rim: 0 })), 0, 0.3, 0);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) add(cass, mesh(geo.palla(0.08, 6), mat(['#5aa04a', '#7fbf5a', '#3f8a48'][(i + r) % 3], { rim: 0.3 })), -0.4 + i * 0.2, 0.36, -0.12 + r * 0.24);
      add(s, cass, 0.05, 0, -0.1);
      vaso(s, -W + 0.05, Pz - 0.1, '#a58be0');
      vaso(s, -W + 0.35, Pz - 0.05, '#ffffff');
      const sp = ingombra(new THREE.Group(), 0.15);
      add(sp, mesh(geo.cil(0.025, 0.025, 1.2, 5), L()), 0, 0.6, 0);
      add(sp, mesh(geo.cil(0.025, 0.025, 0.7, 5), L()), 0, 0.85, 0).rotation.z = Math.PI / 2;
      add(sp, mesh(geo.scatola(0.3, 0.35, 0.12), mat(c.porta)), 0, 0.85, 0);
      add(sp, mesh(geo.palla(0.13, 8), mat('#f2dc9a')), 0, 1.15, 0);
      add(sp, mesh(geo.cono(0.2, 0.18, 8), mat('#c8a050')), 0, 1.3, 0);
      add(s, sp, W - 0.05, 0, Pz - 0.05);
      break;
    }
    case 'rabbia': {
      // la legnaia: la catasta sotto la tettoia, il ceppo con l'accetta, qualche ciocco tagliato
      const cat = ingombra(new THREE.Group(), 0.4);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) {
        const t = add(cat, mesh(geo.cil(0.1, 0.1, 0.5, 7), mat('#a06a40')), -0.33 + i * 0.22 + (r % 2) * 0.11, 0.1 + r * 0.18, 0);
        t.rotation.x = Math.PI / 2;
      }
      for (const x of [-0.55, 0.55]) add(cat, mesh(geo.cil(0.035, 0.035, 0.95, 5), L()), x, 0.47, -0.2);
      add(cat, mesh(geo.scatola(1.25, 0.05, 0.6), mat(c.tetto, { rim: 0.3 })), 0, 0.96, 0.02).rotation.x = 0.18;
      add(s, cat, -0.2, 0, -Pz + 0.3);
      const ceppo = add(s, ingombra(new THREE.Group(), 0.22), W - 0.15, 0, Pz - 0.2);
      add(ceppo, mesh(geo.cil(0.2, 0.22, 0.35, 10), mat('#8a5a36')), 0, 0.17, 0);
      add(ceppo, mesh(geo.cil(0.19, 0.19, 0.01, 10), mat('#e8c890')), 0, 0.35, 0);
      const manico = add(ceppo, mesh(geo.cil(0.02, 0.025, 0.55, 5), L()), 0.05, 0.55, 0);
      manico.rotation.z = -0.4;
      add(ceppo, mesh(geo.scatola(0.04, 0.12, 0.16), mat('#8a9098')), -0.02, 0.38, 0);
      for (const [x, z] of [[0.35, 0.15], [0.3, -0.25]]) add(s, mesh(geo.cil(0.09, 0.09, 0.2, 7), mat('#a06a40')), W - 0.15 + x - 0.6, 0.1, Pz - 0.2 + z);
      break;
    }
    case 'attesa': {
      // l'angolo del viaggio: la panchina con la valigia, il cartello con le frecce verso posti lontani
      const pan = ingombra(new THREE.Group(), 0.45);
      add(pan, mesh(geo.scatola(0.95, 0.07, 0.34), A()), 0, 0.4, 0);
      add(pan, mesh(geo.scatola(0.95, 0.24, 0.05), A()), 0, 0.62, -0.16);
      for (const x of [-0.4, 0.4]) add(pan, mesh(geo.cil(0.03, 0.03, 0.4, 5), mat('#4a3a2c')), x, 0.2, 0);
      const val = add(pan, mesh(geo.scatola(0.36, 0.26, 0.14), mat('#a0503a', { rim: 0.3 })), 0.22, 0.57, 0.02);
      add(val, mesh(geo.scatola(0.12, 0.04, 0.03), mat('#4a3a2c')), 0, 0.15, 0);
      add(s, pan, 0.15, 0, -0.1);
      const cart = ingombra(new THREE.Group(), 0.12);
      add(cart, mesh(geo.cil(0.035, 0.04, 1.5, 6), L()), 0, 0.75, 0);
      for (const [y, r, col] of [[1.35, 0.5, '#e8c890'], [1.15, -0.7, '#c8a070'], [0.95, 2.4, '#e8c890']] as const) {
        const f = add(cart, new THREE.Group(), 0, y, 0);
        f.rotation.y = r;
        add(f, mesh(geo.scatola(0.42, 0.13, 0.03), mat(col)), 0.2, 0, 0);
        add(f, mesh(geo.cono(0.09, 0.12, 3), mat(col)), 0.46, 0, 0).rotation.z = -Math.PI / 2;
      }
      add(s, cart, -W + 0.05, 0, Pz - 0.1);
      vaso(s, W - 0.05, -Pz + 0.05, '#ffd166');
      break;
    }
  }
}

/** Un vaso di terracotta con dei fiori. */
function vaso(g: THREE.Group, x: number, z: number, colore: string) {
  const v = add(g, ingombra(new THREE.Group(), 0.17), x, 0, z);
  add(v, mesh(geo.cil(0.16, 0.12, 0.26, 9), mat('#c8805a')), 0, 0.13, 0);
  for (let k = 0; k < 4; k++) { const f = creaFiore(colore); f.scale.setScalar(1.7); f.position.set(Math.cos(k * 1.7) * 0.07, 0.12, Math.sin(k * 1.7) * 0.07); v.add(f); }
}

// ---------- i pezzi che gli animali aggiungono da soli alla casa ----------

/** Aggiunge alla casa (porta verso +z, facciata a `fronte`) i pezzi che l'animale si è costruito da solo. */
export function creaAmpliamenti(g: THREE.Group, specie: Specie, ampliamenti: string[], c: Colori, fronte: number) {
  const { mezza, cima } = SAGOMA_CASA[specie] ?? { mezza: 1.1, cima: 2.5 };
  const F = Math.max(fronte, 1.1);
  const dietro = -Math.max(1.4, mezza) - 0.9;
  for (const id of ampliamenti) {
    const o = new THREE.Group();
    o.name = 'ampliamento:' + id;
    switch (id) {
      case 'patio': {
        // il pavimento di assi davanti alla porta, due gradini e due sedie a sdraio
        const pav = add(o, piatta(mesh(geo.scatola(2.3, 0.025, 0.95), A())), 0, 0.013, F + 0.45);
        pav.userData.senzaContorno = true;
        for (const x of [-1.15, 1.15]) add(o, piatta(mesh(geo.scatola(0.06, 0.03, 0.95), mat('#6a4a2c'))), x, 0.02, F + 0.45);
        for (const x of [-0.85]) {
          const sedia = add(o, ingombra(new THREE.Group(), 0.2), x, 0, F + 0.5);
          add(sedia, mesh(geo.scatola(0.36, 0.05, 0.36), mat(c.porta, { rim: 0.3 })), 0, 0.3, 0);
          add(sedia, mesh(geo.scatola(0.36, 0.4, 0.05), mat(c.porta, { rim: 0.3 })), 0, 0.52, -0.17).rotation.x = -0.25;
          for (const [a, b] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) add(sedia, mesh(geo.cil(0.02, 0.02, 0.3, 4), L()), a, 0.15, b);
          sedia.rotation.y = 0.5;
        }
        break;
      }
      case 'pergola': {
        // un pergolato piccolo sopra la sedia del patio (di lato, così l'insegna resta in vista), con la vite e l'uva
        const x0 = -1.2, x1 = -0.35, xc = (x0 + x1) / 2;
        for (const x of [x0, x1]) for (const z of [F + 0.05, F + 0.92]) add(o, ingombra(mesh(geo.cil(0.045, 0.055, 1.95, 6), L()), 0.08), x, 0.97, z);
        for (const z of [F + 0.05, F + 0.92]) add(o, mesh(geo.scatola(x1 - x0 + 0.25, 0.07, 0.07), L()), xc, 1.95, z);
        for (let i = 0; i < 3; i++) add(o, mesh(geo.scatola(0.05, 0.05, 1.1), L()), x0 + 0.1 + i * 0.32, 2.01, F + 0.48);
        const foglia = mat('#5aa04a', { rim: 0.3 });
        for (let i = 0; i < 6; i++) add(o, mesh(geo.palla(0.16, 7), foglia), x0 + 0.05 + (i % 3) * 0.37, 2.07, F + 0.2 + Math.floor(i / 3) * 0.55);
        for (let i = 0; i < 3; i++) add(o, mesh(geo.palla(0.12, 6), foglia), x0, 1.5 - i * 0.4, F + 0.92 + 0.03); // la vite che sale dal palo
        for (let k = 0; k < 4; k++) add(o, mesh(geo.palla(0.05, 6), mat('#7a3a8a', { rim: 0.3 })), xc + (k % 2) * 0.05, 1.86 - k * 0.06, F + 0.5);
        break;
      }
      case 'stendino': {
        // due pali dietro la casa e il filo con i panni colorati
        for (const x of [-1.0, 1.0]) add(o, ingombra(mesh(geo.cil(0.04, 0.05, 1.5, 6), L()), 0.1), x, 0.75, dietro);
        add(o, mesh(geo.scatola(2.0, 0.015, 0.015), mat('#eeeeee', { rim: 0 })), 0, 1.42, dietro);
        const panni = [c.porta, '#ffffff', '#7fc8f8', c.tetto, '#ffd166'];
        panni.forEach((col, i) => {
          const p = add(o, mesh(geo.scatola(0.26, i % 2 ? 0.34 : 0.26, 0.015), mat(col, { side: THREE.DoubleSide })), -0.7 + i * 0.35, 1.25 - (i % 2) * 0.04, dietro);
          p.name = 'panno';
          p.userData.senzaContorno = true;
        });
        break;
      }
      case 'capanno': {
        // il capanno degli attrezzi, di assi, con la porticina e il tettino del colore della casa
        const cap = add(o, ingombra(new THREE.Group(), 0.6), mezza + 0.9, 0, dietro + 0.2);
        add(cap, mesh(geo.scatola(1.0, 1.05, 0.9), A()), 0, 0.52, 0);
        const t = add(cap, mesh(geo.cono(0.85, 0.45, 4), mat(c.tetto, { rim: 0.3 })), 0, 1.27, 0);
        t.rotation.y = Math.PI / 4;
        add(cap, mesh(geo.scatola(0.4, 0.7, 0.03), mat(c.porta)), 0, 0.37, 0.46);
        add(cap, mesh(geo.cil(0.025, 0.02, 0.5, 4), L()), 0.62, 0.28, 0.3).rotation.z = 0.25; // una pala appoggiata
        cap.rotation.y = -0.5;
        break;
      }
      case 'orto': {
        // l'orticello sul retro: due file di carote e insalata in una cassetta bassa
        const orto = add(o, ingombra(new THREE.Group(), 0.6), -mezza - 0.9, 0, dietro + 0.1);
        add(orto, mesh(geo.scatola(1.3, 0.16, 0.95), L()), 0, 0.08, 0);
        add(orto, mesh(geo.scatola(1.2, 0.02, 0.85), mat('#5a3a22', { rim: 0 })), 0, 0.165, 0);
        for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
          if (r === 0) { add(orto, mesh(geo.cono(0.04, 0.14, 5), mat('#ff8a2e')), -0.45 + i * 0.3, 0.2, -0.2).rotation.x = Math.PI; add(orto, mesh(geo.cono(0.06, 0.16, 5), mat('#5aa04a')), -0.45 + i * 0.3, 0.3, -0.2); }
          else add(orto, mesh(geo.palla(0.12, 7), mat('#8fcf5a', { rim: 0.3 })), -0.45 + i * 0.3, 0.24, 0.2).scale.y = 0.7;
        }
        orto.rotation.y = 0.4;
        break;
      }
      case 'banderuola': {
        // la banderuola sul tetto: una freccia con il gallo che gira col vento
        const b = add(o, new THREE.Group(), 0, cima + 0.05, 0);
        add(b, mesh(geo.cil(0.02, 0.02, 0.6, 5), mat('#2f3238')), 0, 0.3, 0);
        const giro = add(b, new THREE.Group(), 0, 0.55, 0);
        giro.name = 'banderuola';
        add(giro, mesh(geo.scatola(0.5, 0.025, 0.025), mat('#2f3238')), 0, 0, 0);
        add(giro, mesh(geo.cono(0.05, 0.12, 4), mat('#2f3238')), 0.28, 0, 0).rotation.z = -Math.PI / 2;
        add(giro, mesh(geo.scatola(0.14, 0.12, 0.01), mat('#2f3238', { side: THREE.DoubleSide })), -0.22, 0.03, 0);
        const gallo = spriteTesto('🐓', '#ffffff');
        gallo.scale.setScalar(0.3);
        add(giro, gallo, 0, 0.18, 0);
        break;
      }
    }
    g.add(o);
  }
}

// ---------- le costruzioni nuove (si comprano con le castagne) ----------

/** Le costruzioni nuove: si mettono dove vuole Giada (al primo giro chiede "dove lo mettiamo?"). */
export const COSTRUZIONI_NUOVE = ['fontana', 'gazebo', 'picnic', 'altalena', 'meridiana', 'orologio', 'bacheca', 'arco', 'palco', 'forno', 'serra', 'arnie', 'legnaia', 'mangiatoia', 'insetti', 'giostra', 'casaAlbero', 'faro'] as const;

/** Dove si mettono gli animali per usarla (rispetto alla costruzione) e cosa ci fanno. */
export const USO_COSTRUZIONE: Record<string, { posti: [number, number][]; cosa: string; chi?: 'cuccioli' | 'grandi' }> = {
  // (i posti sono appena fuori dall'impronta della costruzione, davanti: lì gli animali si fermano a guardare, mangiare, giocare)
  fontana: { posti: [[0, 1.75], [1.7, 0.4], [-1.7, 0.4]], cosa: 'guarda' },
  gazebo: { posti: [[0, 2.0], [0.9, 1.8]], cosa: 'seduto' },
  picnic: { posti: [[-0.5, 1.15], [0.5, 1.15], [0, -1.15]], cosa: 'merenda' },
  altalena: { posti: [[0, 0.95], [0.5, 1.0]], cosa: 'dondola', chi: 'cuccioli' },
  meridiana: { posti: [[0, 1.15]], cosa: 'guarda' },
  orologio: { posti: [[0, 1.0], [0.6, 0.9]], cosa: 'guarda' },
  bacheca: { posti: [[0, 0.75], [0.5, 0.8]], cosa: 'guarda' },
  arco: { posti: [[0, 0.95], [0, -0.7]], cosa: 'annusa' },
  palco: { posti: [[0, 1.4], [0.9, 1.5], [-0.9, 1.5]], cosa: 'balla' },
  forno: { posti: [[0, 1.15], [0.6, 1.1]], cosa: 'merenda' },
  serra: { posti: [[0, 1.4], [0.8, 1.3]], cosa: 'annusa' },
  arnie: { posti: [[0, 1.0]], cosa: 'guarda' },
  legnaia: { posti: [[0, 1.0]], cosa: 'guarda' },
  mangiatoia: { posti: [[0, 0.8], [0.5, 0.7]], cosa: 'guarda' },
  insetti: { posti: [[0, 0.75]], cosa: 'annusa' },
  giostra: { posti: [[0, 1.95], [1.9, 0.3], [-1.9, 0.3]], cosa: 'dondola', chi: 'cuccioli' },
  casaAlbero: { posti: [[0.6, 1.6], [-0.6, 1.4]], cosa: 'guarda', chi: 'cuccioli' },
  faro: { posti: [[0, 1.5]], cosa: 'guarda' },
};

export function creaCostruzioneNuova(id: string): THREE.Group | null {
  const g = new THREE.Group();
  switch (id) {
    case 'fontana': {
      g.add(ombra(1.4));
      add(g, mesh(geo.cil(1.15, 1.25, 0.45, 20), P()), 0, 0.22, 0);
      add(g, mesh(geo.cil(1.0, 1.0, 0.03, 20), materiale({ color: '#6fb6e8', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6 })), 0, 0.4, 0);
      add(g, mesh(geo.cil(0.16, 0.22, 0.9, 10), P()), 0, 0.8, 0);
      add(g, mesh(geo.cil(0.45, 0.3, 0.14, 14), P()), 0, 1.25, 0);
      add(g, mesh(geo.cil(0.38, 0.38, 0.02, 14), materiale({ color: '#8fd0f8', emissive: '#2a6f9a', emissiveIntensity: 0.3, rim: 0.6 })), 0, 1.32, 0);
      const zampillo = add(g, new THREE.Group(), 0, 1.35, 0);
      zampillo.name = 'zampillo';
      for (let i = 0; i < 6; i++) {
        const goccia = add(zampillo, mesh(geo.palla(0.05, 6), materiale({ color: '#cfeaff', emissive: '#8fd0f8', emissiveIntensity: 0.5, rim: 0, transparent: true, opacity: 0.85 })), 0, 0, 0);
        goccia.userData.senzaContorno = true;
      }
      break;
    }
    case 'gazebo': {
      g.add(ombra(1.6));
      add(g, mesh(geo.cil(1.45, 1.5, 0.15, 8), A()), 0, 0.075, 0);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; if (i === 1) continue; add(g, mesh(geo.cil(0.06, 0.07, 2.0, 6), mat('#fbf6ec', { rim: 0.2 })), Math.cos(a) * 1.3, 1.1, Math.sin(a) * 1.3); }
      add(g, mesh(geo.cono(1.8, 1.1, 6), mat('#d8b060', { rim: 0.3 })), 0, 2.6, 0);
      add(g, mesh(geo.palla(0.1, 8), mat('#a0503a')), 0, 3.2, 0);
      // la panca tonda dentro
      for (let i = 0; i < 5; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6 + Math.PI / 3; const b = add(g, mesh(geo.scatola(0.9, 0.06, 0.3), A()), Math.cos(a) * 1.0, 0.45, Math.sin(a) * 1.0); b.rotation.y = -a + Math.PI / 2; }
      break;
    }
    case 'picnic': {
      g.add(ombra(1));
      add(g, mesh(geo.scatola(1.8, 0.07, 0.75), A()), 0, 0.72, 0);
      for (const z of [-0.62, 0.62]) add(g, mesh(geo.scatola(1.8, 0.06, 0.28), A()), 0, 0.42, z);
      for (const x of [-0.7, 0.7]) for (const s of [-1, 1]) { const gamba = add(g, mesh(geo.scatola(0.07, 0.85, 0.07), L()), x, 0.38, s * 0.3); gamba.rotation.x = s * 0.55; }
      // la tovaglia a quadri e il cestino
      add(g, mesh(geo.scatola(0.9, 0.01, 0.6), mat('#ffffff', { map: texture(32, (c, l) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, l, l); c.fillStyle = '#e8584a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect(i * 8, j * 8, 8, 8); }), rim: 0 })), 0.2, 0.765, 0);
      add(g, mesh(geo.cil(0.16, 0.13, 0.18, 10), mat('#c8a050')), -0.45, 0.85, 0);
      break;
    }
    case 'altalena': {
      g.add(ombra(1));
      const legno = L();
      for (const x of [-0.95, 0.95]) for (const z of [-0.45, 0.45]) { const p = add(g, mesh(geo.cil(0.06, 0.07, 2.25, 6), legno), x, 1.1, z * 0.55); p.rotation.x = -z * 0.42; }
      add(g, mesh(geo.cil(0.07, 0.07, 2.1, 8), legno), 0, 2.15, 0).rotation.z = Math.PI / 2;
      const seggiolino = add(g, new THREE.Group(), 0, 2.12, 0);
      seggiolino.name = 'dondolo';
      for (const x of [-0.28, 0.28]) add(seggiolino, mesh(geo.cil(0.012, 0.012, 1.65, 4), mat('#d8c08a', { rim: 0 })), x, -0.82, 0);
      add(seggiolino, mesh(geo.scatola(0.7, 0.06, 0.3), mat('#e8584a', { rim: 0.3 })), 0, -1.65, 0);
      break;
    }
    case 'meridiana': {
      g.add(ombra(0.7));
      add(g, mesh(geo.cil(0.7, 0.8, 0.25, 16), P()), 0, 0.12, 0);
      add(g, mesh(geo.cil(0.62, 0.62, 0.02, 24), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#e8dcc0'; c.fillRect(0, 0, l, l); c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(l / 2 + Math.cos(a) * l * 0.2, l / 2 + Math.sin(a) * l * 0.2); c.lineTo(l / 2 + Math.cos(a) * l * 0.46, l / 2 + Math.sin(a) * l * 0.46); c.stroke(); } }), rim: 0 })), 0, 0.26, 0);
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.5, 0); s.lineTo(0, 0.45); s.closePath();
      const gn = add(g, mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }), mat('#b08a3a', { rim: 0.5 })), -0.25, 0.26, -0.015);
      gn.userData.senzaContorno = false;
      break;
    }
    case 'orologio': {
      g.add(ombra(0.6));
      add(g, mesh(geo.cil(0.3, 0.35, 0.3, 8), P()), 0, 0.15, 0);
      add(g, mesh(geo.cil(0.07, 0.09, 2.6, 8), mat('#2f3238', { rim: 0.2 })), 0, 1.5, 0);
      const testa = add(g, new THREE.Group(), 0, 2.95, 0);
      add(testa, mesh(geo.scatola(0.75, 0.75, 0.32), mat('#2f3238', { rim: 0.2 })), 0, 0, 0);
      for (const z of [0.17, -0.17]) {
        const q = add(testa, mesh(geo.cil(0.3, 0.3, 0.02, 24), mat('#fbf6ec', { rim: 0 })), 0, 0, z);
        q.rotation.x = Math.PI / 2;
        const lancette = add(testa, new THREE.Group(), 0, 0, z * 1.12);
        lancette.name = z > 0 ? 'lancette' : 'lancette2';
        add(lancette, mesh(geo.scatola(0.03, 0.2, 0.01), mat('#2a1a10')), 0, 0.09, 0).name = 'ore';
        add(lancette, mesh(geo.scatola(0.02, 0.26, 0.01), mat('#2a1a10')), 0, 0.12, 0).name = 'minuti';
      }
      add(testa, mesh(geo.cono(0.5, 0.35, 4), mat('#a0503a', { rim: 0.3 })), 0, 0.55, 0).rotation.y = Math.PI / 4;
      break;
    }
    case 'bacheca': {
      g.add(ombra(0.7));
      for (const x of [-0.6, 0.6]) add(g, mesh(geo.cil(0.05, 0.06, 1.7, 6), L()), x, 0.85, 0);
      add(g, mesh(geo.scatola(1.3, 0.9, 0.06), mat('#c49a6a')), 0, 1.15, 0);
      add(g, mesh(geo.scatola(1.4, 0.08, 0.3), mat('#a0503a', { rim: 0.3 })), 0, 1.68, 0.03).rotation.x = 0.3;
      const fogli = ['#fffaf0', '#ffe08a', '#bfe0ff', '#ffd1dc'];
      fogli.forEach((col, i) => { const f = add(g, mesh(geo.scatola(0.3, 0.36, 0.01), mat(col, { rim: 0 })), -0.42 + (i % 2) * 0.82 + (i > 1 ? 0.12 : 0), 1.27 - (i > 1 ? 0.3 : 0), 0.04); f.rotation.z = (i - 1.5) * 0.08; f.userData.senzaContorno = true; });
      break;
    }
    case 'arco': {
      g.add(ombra(1));
      const curva = new THREE.EllipseCurve(0, 0, 1.0, 1.9, 0, Math.PI, false, 0);
      const pts = curva.getPoints(16).map((p) => new THREE.Vector3(p.x, p.y, 0));
      add(g, mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 6), mat('#4a3a2c', { rim: 0.2 })));
      add(g, mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setZ(0.3))), 24, 0.06, 6), mat('#4a3a2c', { rim: 0.2 })));
      const colori = ['#ff8fb1', '#ffffff', '#ffd166', '#e8364f', '#b39ddb'];
      for (let i = 0; i < 26; i++) {
        const p = pts[Math.round((i / 25) * 16)];
        add(g, mesh(geo.palla(0.13, 7), mat('#4f9a46', { rim: 0.3 })), p.x + Math.sin(i) * 0.05, p.y, 0.15 + Math.cos(i * 2) * 0.1);
        if (i % 2) add(g, mesh(geo.palla(0.07, 6), mat(colori[i % 5], { rim: 0.3 })), p.x, p.y + 0.06, 0.25 + Math.cos(i) * 0.08);
      }
      break;
    }
    case 'palco': {
      g.add(ombra(1.8));
      add(g, mesh(geo.scatola(3.0, 0.45, 2.0), A()), 0, 0.22, -0.3);
      for (let i = 0; i < 3; i++) add(g, mesh(geo.scatola(1.0, 0.15, 0.3), A()), 0, 0.075 + i * 0.15 * 0, 0.85 - i * 0.0);
      for (const x of [-1.4, 1.4]) add(g, mesh(geo.cil(0.07, 0.07, 2.3, 6), L()), x, 1.6, -1.2);
      add(g, mesh(geo.scatola(3.0, 0.5, 0.05), mat('#a83a4a', { rim: 0.3 })), 0, 2.6, -1.2);
      // il sipario rosso ai lati e le lucine
      for (const x of [-1.25, 1.25]) add(g, mesh(geo.scatola(0.35, 2.0, 0.08), mat('#c8404a', { rim: 0.3 })), x, 1.45, -1.15);
      for (let i = 0; i < 8; i++) add(g, mesh(geo.palla(0.06, 6), materiale({ color: ['#ffd166', '#ff8fb1', '#7fc8f8'][i % 3], emissive: ['#ffd166', '#ff8fb1', '#7fc8f8'][i % 3], emissiveIntensity: 0.6, rim: 0 })), -1.3 + i * 0.37, 2.32, -1.1);
      // gli strumenti: il tamburo e l'arpa (quando non c'è nessuno a suonare)
      add(g, mesh(geo.cil(0.25, 0.25, 0.3, 14), mat('#d8443a', { rim: 0.4 })), -0.9, 0.6, -0.8);
      add(g, mesh(geo.cil(0.26, 0.26, 0.02, 14), mat('#fbfbf6')), -0.9, 0.76, -0.8);
      break;
    }
    case 'forno': {
      g.add(ombra(1));
      add(g, mesh(geo.scatola(1.5, 0.7, 1.2), P()), 0, 0.35, 0);
      const cupola = add(g, mesh(geo.palla(0.68, 14), mat('#c87a4a', { rim: 0.3 })), 0, 0.72, -0.05);
      cupola.scale.y = 0.8;
      const bocca = add(g, mesh(geo.cil(0.24, 0.24, 0.1, 12, ), materiale({ color: '#ff9a3c', emissive: '#ff6a1a', emissiveIntensity: 0.9, rim: 0 })), 0, 0.85, 0.58);
      bocca.rotation.x = Math.PI / 2;
      bocca.name = 'brace';
      add(g, mesh(geo.cil(0.1, 0.12, 0.5, 8), P()), 0.3, 1.35, -0.25);
      for (let i = 0; i < 3; i++) { const t = add(g, mesh(geo.cil(0.07, 0.07, 0.45, 7), mat('#a06a40')), -0.85, 0.08 + i * 0.13, 0.2 - (i % 2) * 0.1); t.rotation.x = Math.PI / 2; }
      break;
    }
    case 'serra': {
      g.add(ombra(1.6));
      const vetro = materiale({ color: '#cfeefa', emissive: '#bfe8ff', emissiveIntensity: 0.15, rim: 0.6, transparent: true, opacity: 0.45, depthWrite: false });
      const telaio = mat('#fbf6ec', { rim: 0.2 });
      add(g, mesh(geo.scatola(2.4, 0.25, 1.6), P()), 0, 0.12, 0);
      const corpo = add(g, mesh(geo.scatola(2.3, 1.2, 1.5), vetro), 0, 0.85, 0);
      corpo.userData.senzaContorno = true;
      const tetto = add(g, mesh(geo.cil(0.75, 0.75, 2.3, 12, ), vetro), 0, 1.45, 0);
      tetto.rotation.z = Math.PI / 2;
      tetto.scale.set(1, 1, 0.98);
      tetto.userData.senzaContorno = true;
      for (const x of [-1.15, -0.4, 0.4, 1.15]) for (const z of [-0.75, 0.75]) add(g, mesh(geo.scatola(0.05, 1.25, 0.05), telaio), x, 0.85, z);
      for (const z of [-0.75, 0.75]) add(g, mesh(geo.scatola(2.35, 0.05, 0.05), telaio), 0, 1.45, z);
      // dentro: le piante (si vedono attraverso il vetro)
      for (let i = 0; i < 6; i++) { add(g, mesh(geo.palla(0.2, 7), mat(['#5aa04a', '#7fbf5a'][i % 2], { rim: 0.3 })), -0.8 + (i % 3) * 0.8, 0.5, -0.35 + Math.floor(i / 3) * 0.7); const f = creaFiore(['#ff6f91', '#ffd166', '#e8364f'][i % 3]); f.scale.setScalar(2); add(g, f, -0.8 + (i % 3) * 0.8, 0.5, -0.35 + Math.floor(i / 3) * 0.7); }
      break;
    }
    case 'arnie': {
      g.add(ombra(1));
      ['#ffd166', '#7fc8f8', '#ff8fb1'].forEach((col, i) => {
        const a = add(g, new THREE.Group(), -0.75 + i * 0.75, 0, 0);
        add(a, mesh(geo.scatola(0.5, 0.25, 0.5), L()), 0, 0.12, 0);
        for (let k = 0; k < 3; k++) add(a, mesh(geo.scatola(0.46, 0.18, 0.46), mat(col, { rim: 0.3 })), 0, 0.34 + k * 0.19, 0);
        add(a, mesh(geo.scatola(0.56, 0.06, 0.56), mat('#fbf6ec')), 0, 0.93, 0);
        add(a, mesh(geo.scatola(0.12, 0.03, 0.04), mat('#2a1a10')), 0, 0.28, 0.24);
      });
      const api = add(g, new THREE.Group(), 0, 1.2, 0);
      api.name = 'api';
      for (let i = 0; i < 5; i++) { const b = add(api, mesh(geo.palla(0.035, 5), mat('#ffcf33', { rim: 0 })), 0, 0, 0); b.userData.senzaContorno = true; }
      break;
    }
    case 'legnaia': {
      g.add(ombra(1));
      for (const x of [-0.85, 0.85]) for (const z of [-0.35, 0.35]) add(g, mesh(geo.cil(0.05, 0.06, 1.5, 6), L()), x, 0.75, z);
      add(g, mesh(geo.scatola(2.0, 0.07, 1.0), mat('#a0503a', { rim: 0.3 })), 0, 1.55, 0).rotation.x = 0.15;
      for (let r = 0; r < 5; r++) for (let i = 0; i < 7 - (r % 2); i++) {
        const t = add(g, mesh(geo.cil(0.11, 0.11, 0.6, 7), mat(['#a06a40', '#8a5a36', '#b8804a'][(i + r) % 3])), -0.66 + i * 0.22 + (r % 2) * 0.11, 0.11 + r * 0.2, 0);
        t.rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'mangiatoia': {
      g.add(ombra(0.4));
      add(g, mesh(geo.cil(0.04, 0.05, 1.5, 6), L()), 0, 0.75, 0);
      add(g, mesh(geo.scatola(0.6, 0.06, 0.45), L()), 0, 1.5, 0);
      for (const x of [-0.25, 0.25]) add(g, mesh(geo.scatola(0.04, 0.3, 0.04), L()), x, 1.67, 0);
      const t = add(g, mesh(geo.cono(0.5, 0.3, 4), mat('#5f8fc8', { rim: 0.3 })), 0, 1.95, 0);
      t.rotation.y = Math.PI / 4;
      for (let i = 0; i < 8; i++) add(g, mesh(geo.palla(0.03, 5), mat('#e8c890', { rim: 0 })), -0.2 + (i % 4) * 0.13, 1.55, -0.1 + Math.floor(i / 4) * 0.2);
      for (const [x, col] of [[-0.18, '#e8584a'], [0.2, '#5f8fc8']] as const) {
        const u = add(g, new THREE.Group(), x, 1.58, 0.12);
        u.name = 'uccellino';
        add(u, mesh(geo.palla(0.07, 8), mat(col, { rim: 0.4 })), 0, 0.05, 0);
        add(u, mesh(geo.palla(0.05, 8), mat(col, { rim: 0.4 })), 0, 0.12, 0.04);
        add(u, mesh(geo.cono(0.02, 0.05, 4), mat('#ffb030')), 0, 0.12, 0.1).rotation.x = Math.PI / 2;
      }
      break;
    }
    case 'insetti': {
      g.add(ombra(0.5));
      add(g, mesh(geo.scatola(0.85, 1.1, 0.35), L()), 0, 0.75, 0);
      add(g, mesh(geo.cono(0.62, 0.35, 4), mat('#a0503a', { rim: 0.3 })), 0, 1.47, 0).rotation.y = Math.PI / 4;
      for (const x of [-0.3, 0.3]) add(g, mesh(geo.cil(0.04, 0.04, 0.3, 5), L()), x, 0.15, 0);
      for (let i = 0; i < 6; i++) {
        const cx = -0.2 + (i % 2) * 0.4, cy = 0.45 + Math.floor(i / 2) * 0.33;
        if (i % 3 === 0) for (let k = 0; k < 6; k++) add(g, mesh(geo.cil(0.025, 0.025, 0.05, 6), mat('#e8c890')), cx - 0.1 + (k % 3) * 0.1, cy - 0.06 + Math.floor(k / 3) * 0.1, 0.18).rotation.x = Math.PI / 2;
        else if (i % 3 === 1) add(g, mesh(geo.scatola(0.3, 0.25, 0.02), mat('#d8b060', { rim: 0 })), cx, cy, 0.18);
        else for (let k = 0; k < 3; k++) add(g, mesh(geo.cil(0.06, 0.06, 0.04, 8), mat('#8a5a36')), cx - 0.1 + k * 0.1, cy, 0.18).rotation.x = Math.PI / 2;
      }
      add(g, mesh(geo.palla(0.04, 6), mat('#e8364f')), 0.32, 1.0, 0.2); // una coccinella
      break;
    }
    case 'giostra': {
      g.add(ombra(1.6));
      add(g, mesh(geo.cil(1.5, 1.55, 0.2, 20), P()), 0, 0.1, 0);
      const ruota = add(g, new THREE.Group(), 0, 0.2, 0);
      ruota.name = 'giostra';
      add(ruota, mesh(geo.cil(1.3, 1.3, 0.1, 20), mat('#fbf6ec', { rim: 0.2 })), 0, 0.05, 0);
      add(ruota, mesh(geo.cil(0.07, 0.07, 1.9, 8), mat('#b08a3a', { rim: 0.5 })), 0, 0.95, 0);
      add(ruota, mesh(geo.cono(1.45, 0.6, 12), mat('#e8584a', { rim: 0.3 })), 0, 2.15, 0);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; if (i % 2) add(ruota, mesh(geo.cono(0.25, 0.3, 3), mat('#fbf6ec')), Math.cos(a) * 1.35, 1.75, Math.sin(a) * 1.35).rotation.x = Math.PI; }
      ['#ff8fb1', '#ffd166', '#7fc8f8', '#7ccf6a'].forEach((col, i) => {
        const a = (i / 4) * Math.PI * 2;
        add(ruota, mesh(geo.cil(0.03, 0.03, 1.5, 5), mat('#b08a3a')), Math.cos(a) * 0.95, 1.0, Math.sin(a) * 0.95);
        const sella = add(ruota, mesh(geo.capsula(0.14, 0.35), mat(col, { rim: 0.4 })), Math.cos(a) * 0.95, 0.7, Math.sin(a) * 0.95);
        sella.rotation.z = Math.PI / 2;
        sella.rotation.y = -a;
      });
      break;
    }
    case 'casaAlbero': {
      g.add(ombra(1.8));
      add(g, mesh(geo.cil(0.35, 0.5, 3.2, 9), mat('#8a5a36')), 0, 1.6, 0);
      for (const [x, y, z, r] of [[0, 4.6, 0, 1.4], [1.0, 4.2, 0.3, 1.0], [-1.0, 4.3, -0.2, 1.05], [0.2, 4.1, -0.9, 0.95]]) add(g, mesh(geo.palla(r, 10), mat('#5aa04a', { rim: 0.3 })), x, y, z);
      add(g, mesh(geo.scatola(2.0, 0.12, 2.0), A()), 0, 2.4, 0);
      const casa = add(g, new THREE.Group(), 0, 2.46, 0.1);
      add(casa, mesh(geo.scatola(1.3, 0.95, 1.1), A()), 0, 0.47, 0);
      add(casa, mesh(geo.cono(1.05, 0.65, 4), mat('#e8584a', { rim: 0.3 })), 0, 1.27, 0).rotation.y = Math.PI / 4;
      add(casa, mesh(geo.scatola(0.4, 0.6, 0.03), mat('#5a3a22')), 0, 0.3, 0.56);
      add(casa, mesh(geo.scatola(0.3, 0.25, 0.03), mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.2 })), 0.42, 0.6, 0.56);
      // la scaletta di corda
      for (let i = 0; i < 8; i++) add(g, mesh(geo.scatola(0.4, 0.04, 0.04), A()), 0.6, 0.25 + i * 0.28, 1.05);
      for (const x of [0.4, 0.8]) add(g, mesh(geo.cil(0.012, 0.012, 2.4, 4), mat('#d8c08a', { rim: 0 })), x, 1.2, 1.05);
      break;
    }
    case 'faro': {
      g.add(ombra(1.1));
      add(g, mesh(geo.cil(1.0, 1.1, 0.35, 12), P()), 0, 0.17, 0);
      for (let i = 0; i < 5; i++) add(g, mesh(geo.cil(0.72 - i * 0.08, 0.8 - i * 0.08, 0.7, 14), mat(i % 2 ? '#e8443a' : '#fbf6ec', { rim: 0.3 })), 0, 0.7 + i * 0.7, 0);
      add(g, mesh(geo.cil(0.55, 0.55, 0.08, 12), mat('#2f3238')), 0, 4.05, 0);
      const luce = add(g, mesh(geo.cil(0.35, 0.35, 0.55, 10), materiale({ color: '#fff3c0', emissive: '#ffd060', emissiveIntensity: 0.4, rim: 0 })), 0, 4.35, 0);
      luce.name = 'luceFaro';
      add(g, mesh(geo.cono(0.5, 0.45, 10), mat('#e8443a', { rim: 0.3 })), 0, 4.85, 0);
      const fascio = add(g, mesh(geo.cono(0.9, 4.5, 10, ), materiale({ color: '#fff3c0', emissive: '#fff3c0', emissiveIntensity: 1, rim: 0, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide })), 2.25, 4.35, 0);
      fascio.rotation.z = Math.PI / 2;
      fascio.name = 'fascio';
      fascio.userData.senzaContorno = true;
      fascio.raycast = () => {};
      fascio.userData.nonIngombra = true;
      break;
    }
    default: return null;
  }
  return contorno(g);
}

/** Le cose che si muovono nelle costruzioni nuove: zampilli, lancette, altalena, api, giostra, faro. */
export function animaCostruzioneNuova(id: string, g: THREE.Object3D, t: number, notte: number, ora: number) {
  switch (id) {
    case 'fontana': {
      const z = g.getObjectByName('zampillo');
      z?.children.forEach((c, i) => {
        const k = (t * 0.9 + i / 6) % 1, a = (i / 6) * Math.PI * 2;
        c.position.set(Math.cos(a) * k * 0.55, Math.sin(k * Math.PI) * 0.5, Math.sin(a) * k * 0.55);
      });
      break;
    }
    case 'orologio': {
      // l'ora vera (del gioco)
      for (const n of ['lancette', 'lancette2']) {
        const l = g.getObjectByName(n);
        if (!l) continue;
        const o = l.getObjectByName('ore'), m = l.getObjectByName('minuti');
        const s = n === 'lancette' ? -1 : 1;
        if (o) { o.rotation.z = s * ((ora % 12) / 12) * Math.PI * 2; o.position.set(Math.sin(-o.rotation.z) * 0.09, Math.cos(o.rotation.z) * 0.09, 0); }
        if (m) { m.rotation.z = s * ((ora % 1)) * Math.PI * 2; m.position.set(Math.sin(-m.rotation.z) * 0.12, Math.cos(m.rotation.z) * 0.12, 0); }
      }
      break;
    }
    case 'altalena': {
      // ferma, appena mossa dal vento; quando un cucciolo ci gioca va su e giù (la spinta poi si calma piano)
      const d = g.getObjectByName('dondolo');
      if (d) { d.userData.spinta = Math.max(0.06, (d.userData.spinta ?? 0.06) * 0.997); d.rotation.x = Math.sin(t * 2.2) * d.userData.spinta; }
      break;
    }
    case 'giostra': {
      const r = g.getObjectByName('giostra');
      if (r) { r.userData.spinta = Math.max(0, (r.userData.spinta ?? 0) * 0.997); r.rotation.y += 0.003 + r.userData.spinta * 0.03; }
      break;
    }
    case 'arnie': {
      const a = g.getObjectByName('api');
      a?.children.forEach((b, i) => b.position.set(Math.sin(t * 2.3 + i * 1.3) * 0.7, Math.sin(t * 3.1 + i) * 0.25, Math.cos(t * 1.9 + i * 2.1) * 0.5));
      break;
    }
    case 'mangiatoia': {
      g.traverse((u) => { if (u.name === 'uccellino') u.rotation.x = Math.max(0, Math.sin(t * 4 + u.position.x * 9)) * 0.6; });
      break;
    }
    case 'forno': { const b = g.getObjectByName('brace') as THREE.Mesh | undefined; if (b) (b.material as THREE.MeshToonMaterial).emissiveIntensity = 0.8 + Math.sin(t * 7) * 0.2; break; }
    case 'faro': {
      const f = g.getObjectByName('fascio') as THREE.Mesh | undefined, l = g.getObjectByName('luceFaro') as THREE.Mesh | undefined;
      if (l) (l.material as THREE.MeshToonMaterial).emissiveIntensity = 0.4 + notte * 1.8;
      if (f) {
        (f.material as THREE.MeshToonMaterial).opacity = notte * 0.22;
        f.visible = notte > 0.05;
        const a = t * 0.8;
        f.position.set(Math.cos(a) * 2.25, 4.35, -Math.sin(a) * 2.25);
        f.rotation.set(0, a, Math.PI / 2);
      }
      break;
    }
  }
}
