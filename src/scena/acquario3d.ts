// L'acquario nella scena: un edificio grande e speciale, con una vasca di vetro sul davanti
// (i pesci si vedono nuotare anche passando lì vicino), la sala con la fascia blu e, sopra,
// una sfera di vetro come quella degli acquari sul porto. Sulla cima gira un pesciolino-banderuola.
import * as THREE from 'three';
import { PESCE, type PesceInVasca } from '../lib/acquario';
import type { DefPesce } from '../lib/pesca';
import { geo, mat, mesh } from './modelli';
import { creaPesce3D } from './pesca3d';
import { contorno, macchie, ombra, texture } from './ps1';

/** Lo spazio dentro la vasca dove nuotano i pesci (coordinate dell'acquario). */
const VASCA = { x0: -2.75, x1: 1.15, y0: 0.62, y1: 1.95, z0: 0.62, z1: 1.62, fondo: 0.44 };
/** Il centro della vetrata: lì guarda la telecamera quando Giada tocca l'acquario. */
export const CENTRO_VASCA = new THREE.Vector3((VASCA.x0 + VASCA.x1) / 2, 1.2, 1.1);

const nuotaSulFondo = (p: DefPesce) => p.forma === 'stella' || p.forma === 'gambero';

/** Gli abitanti speciali dell'acquario (medusa, stella, cavalluccio...); gli altri sono pesci come al laghetto. */
export function creaAbitanteVasca(p: DefPesce): THREE.Group {
  const g = new THREE.Group();
  switch (p.forma) {
    case 'medusa': {
      const vel = mat(p.colore, { transparent: true, opacity: 0.75, rim: 0.8, emissive: p.colore, emissiveIntensity: 0.25 });
      const cappello = mesh(new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), vel, 0, 0.05, 0);
      cappello.name = 'cappello';
      g.add(cappello);
      const tentacoli = new THREE.Group();
      tentacoli.name = 'tentacoli';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const t = mesh(geo.cil(0.012, 0.004, 0.28, 4), mat(p.pinne, { transparent: true, opacity: 0.8 }), Math.cos(a) * 0.08, -0.09, Math.sin(a) * 0.08);
        t.userData.senzaContorno = true;
        tentacoli.add(t);
      }
      g.add(tentacoli);
      return g; // niente contorno: è di gelatina
    }
    case 'stella': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const braccio = mesh(geo.cono(0.05, 0.16, 6), mat(p.colore, { rim: 0.4 }), Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
        braccio.rotation.set(0, -a, -Math.PI / 2);
        braccio.scale.y = 1;
        braccio.scale.z = 0.45;
        g.add(braccio);
      }
      const centro = mesh(geo.palla(0.06, 10), mat(p.pancia), 0, 0.01, 0);
      centro.scale.y = 0.5;
      g.add(centro);
      return contorno(g);
    }
    case 'cavalluccio': {
      const c = mat(p.colore, { rim: 0.5 });
      const corpo = mesh(geo.capsula(0.05, 0.12), c, 0, 0, 0);
      corpo.rotation.x = 0.25;
      g.add(corpo);
      const pancia = mesh(geo.palla(0.045, 8), mat(p.pancia), 0, 0.01, 0.025);
      pancia.scale.y = 1.6;
      g.add(pancia);
      const testa = mesh(geo.palla(0.05, 10), c, 0, 0.13, 0.02);
      g.add(testa);
      const muso = mesh(geo.cil(0.016, 0.022, 0.09, 6), c, 0, 0.12, 0.08);
      muso.rotation.x = Math.PI / 2 - 0.2;
      g.add(muso);
      const coda = mesh(new THREE.TorusGeometry(0.035, 0.014, 5, 10, Math.PI * 1.5), c, 0, -0.13, -0.01);
      coda.rotation.y = Math.PI / 2;
      g.add(coda);
      const pinna = mesh(geo.cono(0.03, 0.05, 5), mat(p.pinne), 0, 0.03, -0.05);
      pinna.scale.z = 0.3;
      pinna.name = 'coda';
      g.add(pinna);
      for (const s of [-1, 1]) {
        const o = mesh(geo.palla(0.012, 6), mat('#1a1a1a', { rim: 0 }), s * 0.035, 0.145, 0.04);
        o.userData.senzaContorno = true;
        g.add(o);
      }
      return contorno(g);
    }
    case 'gambero': {
      const c = mat(p.colore, { rim: 0.4 });
      for (let i = 0; i < 4; i++) {
        const seg = mesh(geo.palla(0.045 - i * 0.006, 8), c, 0, 0.03, 0.04 - i * 0.05);
        seg.scale.set(1.1, 0.75, 1);
        g.add(seg);
      }
      const coda = mesh(geo.cono(0.04, 0.06, 5), mat(p.pinne), 0, 0.03, -0.17);
      coda.rotation.x = -Math.PI / 2;
      coda.scale.x = 1.3;
      coda.scale.z = 0.3;
      coda.name = 'coda';
      g.add(coda);
      for (const s of [-1, 1]) {
        const braccio = mesh(geo.cil(0.01, 0.01, 0.09, 5), c, s * 0.04, 0.03, 0.09);
        braccio.rotation.x = Math.PI / 2;
        braccio.rotation.z = s * 0.4;
        g.add(braccio);
        const chela = mesh(geo.palla(0.025, 6), c, s * 0.07, 0.03, 0.14);
        chela.scale.set(0.8, 0.6, 1.4);
        g.add(chela);
        const antenna = mesh(geo.cil(0.003, 0.003, 0.16, 3), mat(p.pinne), s * 0.02, 0.06, 0.13);
        antenna.rotation.x = Math.PI / 2 - 0.3;
        antenna.userData.senzaContorno = true;
        g.add(antenna);
      }
      return contorno(g);
    }
    case 'tartaruga': {
      const guscio = mesh(geo.palla(0.13, 12), mat('#ffffff', { map: texture(64, macchie([p.colore, '#4a7a3a', '#8aba6a', p.colore], 1.4, 77)), rim: 0.4 }), 0, 0, 0);
      guscio.scale.set(1, 0.45, 1.2);
      g.add(guscio);
      const sotto = mesh(geo.palla(0.12, 10), mat(p.pancia), 0, -0.02, 0);
      sotto.scale.set(1, 0.25, 1.15);
      g.add(sotto);
      g.add(mesh(geo.palla(0.05, 10), mat(p.pinne), 0, 0.01, 0.17));
      for (const s of [-1, 1]) {
        const o = mesh(geo.palla(0.012, 6), mat('#1a1a1a', { rim: 0 }), s * 0.03, 0.03, 0.2);
        o.userData.senzaContorno = true;
        g.add(o);
        for (const [z, l, nome] of [[0.08, 0.12, 'pinnaDavanti'], [-0.1, 0.07, 'pinnaDietro']] as const) {
          const pinna = mesh(geo.palla(l / 2, 8), mat(p.pinne), s * 0.13, -0.01, z);
          pinna.scale.set(1.6, 0.25, 0.7);
          pinna.name = nome;
          pinna.userData.lato = s;
          g.add(pinna);
        }
      }
      return contorno(g);
    }
    case 'disco': {
      const f = creaPesce3D({ ...p, forma: 'tondo' });
      f.scale.set(0.8, 1.35, 1);
      g.add(f);
      return g;
    }
    default:
      g.add(creaPesce3D(p));
      return g;
  }
}

interface Nuotatore {
  o: THREE.Group;
  def: DefPesce;
  meta: THREE.Vector3;
  vel: number;
  fase: number;
  chiave: string;
}

export class AcquarioInScena {
  readonly gruppo = new THREE.Group();
  private vasca = new THREE.Group(); // i pesci
  private alghe: THREE.Object3D[] = [];
  private bolle: THREE.Mesh[] = [];
  private banderuola = new THREE.Group();
  private nuotatori: Nuotatore[] = [];
  private firma = '';

  constructor() {
    const g = this.gruppo;
    g.add(ombra(3.6));
    const pietra = mat('#ffffff', { map: texture(64, macchie(['#e4ded2', '#d2cabc', '#ece6da', '#c8c0b2'], 1, 51)), rim: 0.15 });
    const muro = mat('#ffffff', { map: texture(64, macchie(['#f4f1ea', '#e8e4da', '#faf8f2'], 0.6, 52)), rim: 0.2 });
    const blu = mat('#2a6fb0', { rim: 0.3 });
    const bluScuro = mat('#1d4a7a', { rim: 0.2 });
    // lo zoccolo di pietra con i gradini
    g.add(mesh(geo.scatola(6.8, 0.25, 4.4), pietra, 0, 0.125, 0));
    for (let i = 0; i < 2; i++) g.add(mesh(geo.scatola(1.3, 0.12, 0.3), pietra, 2.35, 0.06 + i * 0.06, 2.35 - i * 0.22));
    // la sala, con la fascia blu ondulata
    g.add(mesh(geo.scatola(6.0, 2.5, 2.4), muro, 0, 1.5, -0.8));
    g.add(mesh(geo.scatola(6.1, 0.28, 2.5), blu, 0, 2.3, -0.8));
    for (let i = 0; i < 9; i++) {
      const onda = mesh(geo.cil(0.22, 0.22, 0.12, 10, ), blu, -2.7 + i * 0.68, 2.62, 0.42);
      onda.rotation.x = Math.PI / 2;
      onda.scale.y = 1;
      g.add(onda);
    }
    // il tetto piatto e la sfera di vetro con le costole
    g.add(mesh(geo.scatola(6.2, 0.16, 2.6), bluScuro, 0, 2.82, -0.8));
    const vetro = mat('#9ad8f4', { transparent: true, opacity: 0.45, rim: 0.9, emissive: '#3a9ad0', emissiveIntensity: 0.15, depthWrite: false });
    const sfera = mesh(geo.palla(1.35, 20), vetro, 0, 3.6, -0.8);
    sfera.userData.senzaContorno = true;
    g.add(sfera);
    // dentro la sfera: un alberello tropicale (come nelle serre dell'acquario vero)
    g.add(mesh(geo.cil(0.06, 0.09, 1.1, 6), mat('#8a6a4a'), 0, 3.4, -0.8));
    for (let i = 0; i < 6; i++) {
      const foglia = mesh(geo.palla(0.38, 8), mat('#4aa860', { rim: 0.3 }), Math.cos(i) * 0.35, 4.0, -0.8 + Math.sin(i) * 0.35);
      foglia.scale.y = 0.35;
      foglia.rotation.z = Math.cos(i) * 0.4;
      foglia.userData.senzaContorno = true;
      g.add(foglia);
    }
    for (let i = 0; i < 4; i++) {
      const costola = mesh(new THREE.TorusGeometry(1.36, 0.035, 4, 28, Math.PI), mat('#e8f0f4', { rim: 0.4 }), 0, 3.6, -0.8);
      costola.rotation.y = (i / 4) * Math.PI;
      costola.userData.senzaContorno = true;
      g.add(costola);
    }
    const anello = mesh(new THREE.TorusGeometry(1.36, 0.06, 5, 32), mat('#e8f0f4'), 0, 3.6, -0.8);
    anello.rotation.x = Math.PI / 2;
    g.add(anello);
    g.add(mesh(geo.cil(0.025, 0.025, 0.5, 5), bluScuro, 0, 5.15, -0.8));
    // la banderuola a forma di pesce, in cima
    const pesceB = creaPesce3D({ id: 'banderuola', nome: '', colore: '#f2a030', pancia: '#ffd070', pinne: '#e06a2a', forma: 'normale', cm: [1, 1], raro: 1, frase: '' });
    pesceB.scale.setScalar(2.2);
    this.banderuola.add(pesceB);
    this.banderuola.position.set(0, 5.4, -0.8);
    g.add(this.banderuola);
    // l'insegna sopra la porta
    const insegna = mesh(geo.scatola(2.0, 0.5, 0.08), mat('#ffffff', { map: texture(256, (c, l) => {
      c.fillStyle = '#1d4a7a'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#7ad0f0'; c.fillRect(0, l * 0.86, l, l * 0.06); c.fillRect(0, l * 0.08, l, l * 0.06);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `900 ${l * 0.15}px 'Nunito Variable', sans-serif`;
      c.save(); c.scale(1, 4); c.fillText('ACQUARIO', l / 2, l / 8 + 3); c.restore();
    }), rim: 0 }), 1.55, 3.18, 0.42);
    insegna.scale.y = 1;
    g.add(insegna);
    // la porta d'ingresso (a destra della vasca) con la tenda a strisce
    g.add(mesh(geo.scatola(0.95, 1.55, 0.06), mat('#2a5a8a'), 2.35, 1.03, 0.42));
    g.add(mesh(geo.scatola(0.82, 1.4, 0.05), mat('#9ad8f4', { rim: 0.6, emissive: '#5ab0e0', emissiveIntensity: 0.15 }), 2.35, 1.0, 0.45));
    const tenda = mesh(geo.scatola(1.3, 0.08, 0.6), mat('#ffffff', { map: texture(64, (c, l) => { for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#2a7ab8'; c.fillRect((i * l) / 6, 0, l / 6, l); } }) }), 2.35, 1.95, 0.7);
    tenda.rotation.x = 0.25;
    g.add(tenda);
    // la vasca: cornice blu, vetro, acqua, sabbia, sassi, coralli e alghe
    const cx = (VASCA.x0 + VASCA.x1) / 2, larga = VASCA.x1 - VASCA.x0 + 0.5;
    const zc = (VASCA.z0 + VASCA.z1) / 2, prof = VASCA.z1 - VASCA.z0 + 0.4;
    g.add(mesh(geo.scatola(larga + 0.2, 0.18, prof + 0.15), bluScuro, cx, 0.34, zc));
    g.add(mesh(geo.scatola(larga + 0.2, 0.16, prof + 0.15), bluScuro, cx, 2.25, zc));
    for (const x of [VASCA.x0 - 0.3, VASCA.x1 + 0.3]) for (const z of [VASCA.z0 - 0.25, VASCA.z1 + 0.25]) g.add(mesh(geo.scatola(0.12, 1.95, 0.12), bluScuro, x, 1.3, z));
    g.add(mesh(geo.scatola(larga, 0.12, prof), mat('#f2dca0', { map: texture(64, macchie(['#f2dca0', '#e6cc8a', '#faeac0'], 1, 53)) }), cx, VASCA.fondo - 0.02, zc));
    for (const [x, z, r] of [[-2.3, 0.8, 0.18], [-1.1, 1.5, 0.12], [0.6, 0.75, 0.2], [0.95, 1.45, 0.1]]) {
      const s = mesh(geo.palla(r, 8), mat('#8a8a94'), x, VASCA.fondo + r * 0.4, z);
      s.scale.y = 0.6;
      g.add(s);
    }
    for (const [x, z, c] of [[-1.7, 0.72, '#ff7a8a'], [-0.2, 0.7, '#ffa04a'], [0.3, 1.5, '#e85aa0'], [-2.6, 1.4, '#ff8a6a']] as const) {
      for (let k = 0; k < 4; k++) {
        const ramo = mesh(geo.cil(0.025, 0.04, 0.3 + k * 0.05, 5), mat(c, { rim: 0.4 }), x + Math.cos(k * 1.7) * 0.06, VASCA.fondo + 0.15, z + Math.sin(k * 1.7) * 0.04);
        ramo.rotation.z = Math.cos(k * 2.1) * 0.5;
        g.add(ramo);
      }
    }
    for (let i = 0; i < 12; i++) {
      const x = VASCA.x0 + 0.1 + ((i * 0.37) % 1) * (VASCA.x1 - VASCA.x0 - 0.2);
      const z = VASCA.z0 + ((i * 0.61) % 1) * (VASCA.z1 - VASCA.z0) * 0.9 - 0.05;
      const alga = new THREE.Group();
      const h = 0.5 + (i % 4) * 0.2;
      for (let k = 0; k < 3; k++) {
        const foglia = mesh(geo.scatola(0.05, h / 3, 0.015), mat(i % 3 ? '#3aa060' : '#6ac070', { rim: 0.3 }), 0, (h / 3) * (k + 0.5), 0);
        foglia.rotation.z = (k % 2 ? 1 : -1) * 0.08;
        foglia.userData.senzaContorno = true;
        alga.add(foglia);
      }
      alga.position.set(x, VASCA.fondo, z);
      alga.userData.fase = i * 0.9;
      this.alghe.push(alga);
      g.add(alga);
    }
    const bollaMat = mat('#e8f8ff', { transparent: true, opacity: 0.7, rim: 0.8 });
    for (let i = 0; i < 10; i++) {
      const b = mesh(geo.palla(0.025 + (i % 3) * 0.01, 6), bollaMat, -2.4 + (i % 2) * 3.3, VASCA.y0 + (i / 10) * (VASCA.y1 - VASCA.y0), 1.3);
      b.userData.senzaContorno = true;
      this.bolle.push(b);
      g.add(b);
    }
    contorno(g);
    g.add(this.vasca);
    // l'acqua e il vetro (dopo il contorno: niente bordi scuri dentro l'acqua)
    const acqua = mesh(geo.scatola(larga - 0.06, 1.8, prof - 0.06), mat('#3ab0e0', { transparent: true, opacity: 0.3, rim: 0.5, emissive: '#2a90c0', emissiveIntensity: 0.25, depthWrite: false }), cx, 1.33, zc);
    g.add(acqua);
    const riflesso = mesh(geo.scatola(0.5, 1.6, 0.01), mat('#ffffff', { transparent: true, opacity: 0.25, rim: 0, depthWrite: false }), cx - 1.2, 1.35, zc + prof / 2 + 0.01);
    riflesso.rotation.z = 0.25;
    g.add(riflesso);
    g.userData.ingombroCasa = 3.1;
  }

  /** I pesci della vasca, come dice lo stato del gioco. */
  aggiornaPesci(pesci: PesceInVasca[]) {
    const firma = pesci.map((p) => `${p.id}:${p.cm}`).join(',');
    if (firma === this.firma) return;
    this.firma = firma;
    // tengo quelli che c'erano già (così non saltano da una parte all'altra), tolgo e aggiungo il resto
    const vecchi = [...this.nuotatori];
    this.nuotatori = [];
    pesci.forEach((p, i) => {
      const chiave = `${p.id}:${p.cm}:${i}`;
      const def = PESCE[p.id];
      if (!def) return;
      const k = vecchi.findIndex((n) => n.chiave === chiave);
      if (k >= 0) { this.nuotatori.push(vecchi.splice(k, 1)[0]); return; }
      const o = creaAbitanteVasca(def);
      // più è lungo, più è grande (ma tutti si devono vedere: anche il pesce neon)
      const sc = THREE.MathUtils.clamp(0.75 + p.cm / 55, 0.8, def.forma === 'tartaruga' ? 2.2 : 2.0);
      o.scale.multiplyScalar(sc);
      const r = (n: number) => ((Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
      o.position.set(VASCA.x0 + r(1) * (VASCA.x1 - VASCA.x0), nuotaSulFondo(def) ? VASCA.fondo + 0.03 : VASCA.y0 + r(2) * (VASCA.y1 - VASCA.y0), VASCA.z0 + r(3) * (VASCA.z1 - VASCA.z0));
      this.vasca.add(o);
      this.nuotatori.push({ o, def, meta: o.position.clone(), vel: 0.25 + r(4) * 0.3, fase: r(5) * 10, chiave });
    });
    for (const n of vecchi) this.vasca.remove(n.o);
  }

  get quanti(): number {
    return this.nuotatori.length;
  }

  private nuovaMeta(n: Nuotatore) {
    const fondo = nuotaSulFondo(n.def);
    // di solito nuotano parallelo al vetro (così si vedono di fianco), avanti e indietro
    const x = VASCA.x0 + Math.random() * (VASCA.x1 - VASCA.x0);
    const y = fondo ? VASCA.fondo + 0.03 : THREE.MathUtils.clamp(n.o.position.y + (Math.random() - 0.5) * 0.6, VASCA.y0, VASCA.y1);
    const z = THREE.MathUtils.clamp(n.o.position.z + (Math.random() - 0.5) * 0.4, VASCA.z0, VASCA.z1);
    n.meta.set(x, y, z);
  }

  anima(t: number, dt: number) {
    this.banderuola.rotation.y = Math.sin(t * 0.3) * 1.2 + t * 0.05;
    for (const a of this.alghe) a.rotation.z = Math.sin(t * 1.3 + (a.userData.fase as number)) * 0.12;
    for (const b of this.bolle) {
      b.position.y += dt * 0.35;
      b.position.x += Math.sin(t * 3 + b.id) * dt * 0.05;
      if (b.position.y > VASCA.y1 + 0.2) b.position.y = VASCA.y0 - 0.1;
    }
    for (const n of this.nuotatori) {
      const o = n.o;
      const forma = n.def.forma;
      const fermo = forma === 'stella';
      if (fermo) { o.rotation.y += dt * 0.05; continue; }
      const lento = forma === 'medusa' || forma === 'cavalluccio' || forma === 'gambero';
      const v = n.vel * (lento ? 0.3 : forma === 'tartaruga' ? 0.5 : 1);
      const d = new THREE.Vector3().subVectors(n.meta, o.position);
      const dist = d.length();
      if (dist < 0.08) this.nuovaMeta(n);
      else o.position.addScaledVector(d.normalize(), Math.min(dist, v * dt));
      if (forma === 'medusa') {
        // la medusa pulsa e sale e scende, sempre dritta
        const c = o.getObjectByName('cappello');
        const s = 1 + Math.sin(t * 2.4 + n.fase) * 0.12;
        c?.scale.set(s, 2 - s, s);
        o.position.y += Math.sin(t * 2.4 + n.fase) * dt * 0.06;
        continue;
      }
      const verso = Math.atan2(d.x, d.z);
      const diff = Math.atan2(Math.sin(verso - o.rotation.y), Math.cos(verso - o.rotation.y));
      o.rotation.y += diff * Math.min(1, dt * (lento ? 1.5 : 3));
      if (forma === 'cavalluccio') o.position.y += Math.sin(t * 1.6 + n.fase) * dt * 0.05;
      const coda = o.getObjectByName('coda');
      if (coda) coda.rotation.y = Math.sin(t * (lento ? 5 : 12) + n.fase) * 0.35;
      if (forma === 'tartaruga') o.traverse((c) => { if (c.name.startsWith('pinna')) c.rotation.z = (c.userData.lato as number) * Math.sin(t * 2 + n.fase) * 0.4; });
    }
  }
}
