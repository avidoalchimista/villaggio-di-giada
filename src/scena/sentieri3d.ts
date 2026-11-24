// I sentieri scoperti dal castoro: partono dal bordo della radura e attraversano il bosco
// (lì gli alberi si fanno da parte). All'inizio c'è un portale di legno con il nome del villaggio
// lontano; in fondo, oltre gli alberi, si intravede il posto: la neve, il mare, il fiume…
import * as THREE from 'three';
import type { DefBioma } from '../lib/biomi';
import { creaPino, geo, mat, mesh } from './modelli';
import { contorno, macchie, materiale, ombra, texture } from './ps1';

/** Quanto è largo il sentiero (metà), per far spostare gli alberi. */
export const MEZZA_LARGHEZZA = 1.5;
/** Fin dove arriva (oltre il bordo della radura). */
export const LUNGHEZZA = 13;

/** Il punto del sentiero a `d` metri dal centro, nella direzione del posto lontano. */
export function puntoSentiero(b: DefBioma, d: number): THREE.Vector3 {
  const a = (b.angolo * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
}

/** È dentro il corridoio di un sentiero (oltre `da` metri dal centro)? */
export function sulSentiero(angoli: number[], x: number, z: number, da: number, largo = MEZZA_LARGHEZZA): boolean {
  for (const g of angoli) {
    const a = (g * Math.PI) / 180;
    const c = Math.cos(a), s = Math.sin(a);
    const lungo = x * c + z * s;
    if (lungo < da) continue;
    if (Math.abs(-x * s + z * c) < largo) return true;
  }
  return false;
}

const disco = (r: number, colore: string, x: number, z: number, y = 0.012) => {
  const m = mesh(new THREE.CircleGeometry(r, 28), materiale({ color: colore, rim: 0 }), x, y, z);
  m.rotation.x = -Math.PI / 2;
  m.userData.senzaContorno = true;
  return m;
};

function palma(h = 2.6): THREE.Group {
  const g = new THREE.Group();
  const tronco = mat('#a8845a', { rim: 0.2 });
  for (let i = 0; i < 6; i++) {
    const s = mesh(geo.cil(0.11 - i * 0.008, 0.13 - i * 0.008, h / 6 + 0.04, 7), tronco, Math.sin(i * 0.3) * 0.12 * i * 0.3, (h / 6) * (i + 0.5), 0);
    g.add(s);
  }
  const cima = new THREE.Vector3(0.12 * 1.5, h, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = mesh(geo.palla(0.5, 8), mat('#4a9a4a', { rim: 0.3 }), cima.x + Math.cos(a) * 0.45, cima.y - 0.12, cima.z + Math.sin(a) * 0.45);
    f.scale.set(1.3, 0.12, 0.35);
    f.rotation.y = -a;
    f.rotation.z = -0.35;
    g.add(f);
  }
  for (let i = 0; i < 3; i++) g.add(mesh(geo.palla(0.08, 6), mat('#7a5a2a'), cima.x + Math.cos(i * 2) * 0.12, cima.y - 0.15, cima.z + Math.sin(i * 2) * 0.12));
  g.add(ombra(0.9));
  return contorno(g);
}

function alberoRosa(sc = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.12, 0.18, 1.1, 7), mat('#6a4a3a'), 0, 0.55, 0));
  for (const [x, y, z, r] of [[0, 1.45, 0, 0.7], [0.45, 1.3, 0.15, 0.5], [-0.4, 1.35, -0.1, 0.52], [0.05, 1.9, 0, 0.5]]) g.add(mesh(geo.palla(r, 10), mat(r > 0.6 ? '#f6b8cc' : '#f8c8d8', { rim: 0.4 }), x, y, z));
  g.add(ombra(0.8));
  g.scale.setScalar(sc);
  return contorno(g);
}

function pinoInnevato(sc = 1): THREE.Group {
  const p = creaPino(sc, false);
  for (const [y, r, h] of [[1.15, 0.6, 0.55], [1.72, 0.45, 0.5], [2.2, 0.3, 0.45]]) {
    const neve = mesh(geo.cono(r, h, 10), mat('#ffffff', { rim: 0.5 }), 0, y, 0);
    p.add(neve);
  }
  return contorno(p);
}

/** Quello che si intravede in fondo al sentiero (coordinate: il sentiero va verso +x, inizia a `da`). */
function paesaggio(b: DefBioma, X: number): THREE.Group {
  const g = new THREE.Group();
  switch (b.id) {
    case 'neve': {
      g.add(disco(4.6, '#f4f8fc', X, 0));
      for (const [dx, dz, s] of [[-1.5, 2.4, 1.1], [1.2, 2.8, 1.4], [2.6, -2.2, 1.3], [-0.6, -2.9, 1.0], [3.4, 0.9, 1.6], [0.3, 3.9, 1.2], [1.8, -3.6, 1.1]]) {
        const p = pinoInnevato(s);
        p.position.set(X + dx, 0, dz);
        g.add(p);
      }
      // un pupazzo di neve che saluta
      const pupazzo = new THREE.Group();
      const bianco = mat('#ffffff', { rim: 0.5 });
      pupazzo.add(mesh(geo.palla(0.42, 12), bianco, 0, 0.4, 0), mesh(geo.palla(0.3, 12), bianco, 0, 0.95, 0), mesh(geo.palla(0.21, 12), bianco, 0, 1.38, 0));
      const naso = mesh(geo.cono(0.05, 0.22, 6), mat('#f08a2a'), 0, 1.38, 0.25);
      naso.rotation.x = Math.PI / 2;
      pupazzo.add(naso, mesh(geo.cil(0.18, 0.18, 0.2, 10), mat('#c0303a'), 0, 1.6, 0));
      for (const s of [-1, 1]) pupazzo.add(mesh(geo.palla(0.03, 6), mat('#1a1a1a'), s * 0.07, 1.44, 0.18));
      pupazzo.add(ombra(0.5));
      contorno(pupazzo);
      pupazzo.position.set(X - 1.8, 0, -1.3);
      pupazzo.rotation.y = -Math.PI / 2;
      g.add(pupazzo);
      // e le montagne bianche, lontane
      for (const [dx, dz, h] of [[6, -3, 6], [7.5, 2.5, 7.5], [5.5, 6, 5]]) {
        const m = mesh(geo.cono(h * 0.6, h, 6), mat('#9ab0c8', { rim: 0.2 }), X + dx, h / 2, dz);
        g.add(m);
        g.add(mesh(geo.cono(h * 0.25, h * 0.42, 6), mat('#ffffff', { rim: 0.4 }), X + dx, h * 0.79, dz));
      }
      break;
    }
    case 'mare': {
      g.add(disco(4.2, '#f2e2b0', X - 0.5, 0));
      g.add(disco(9, '#3a9ad0', X + 6.5, 0, 0.02));
      g.add(disco(8.4, '#6ac0e8', X + 6.5, 0, 0.022));
      // il faro bianco e rosso
      const faro = new THREE.Group();
      for (let i = 0; i < 5; i++) faro.add(mesh(geo.cil(0.42 - i * 0.04, 0.46 - i * 0.04, 0.6, 12), mat(i % 2 ? '#e8443a' : '#ffffff', { rim: 0.4 }), 0, 0.3 + i * 0.6, 0));
      faro.add(mesh(geo.cil(0.3, 0.3, 0.4, 10), mat('#fff6b0', { emissive: '#ffe680', emissiveIntensity: 0.6 }), 0, 3.2, 0));
      faro.add(mesh(geo.cono(0.36, 0.4, 10), mat('#e8443a'), 0, 3.6, 0));
      faro.add(ombra(0.7));
      contorno(faro);
      faro.position.set(X + 1.2, 0, -2.6);
      g.add(faro);
      // una barchetta colorata e qualche conchiglia
      const barca = new THREE.Group();
      const scafo = mesh(geo.palla(0.5, 10), mat('#f2a030'), 0, 0.1, 0);
      scafo.scale.set(1.8, 0.45, 0.7);
      barca.add(scafo, mesh(geo.cil(0.03, 0.03, 1.1, 5), mat('#7a5a3a'), 0, 0.65, 0));
      const vela = mesh(geo.cono(0.4, 0.9, 3), mat('#ffffff'), 0.2, 0.75, 0);
      vela.scale.z = 0.1;
      barca.add(vela);
      contorno(barca);
      barca.position.set(X + 4.5, 0, 1.5);
      barca.userData.galleggia = true;
      g.add(barca);
      for (const [dx, dz, c] of [[-1.5, 1.2, '#ffc0c8'], [0.5, 2.1, '#fff0d0'], [-0.8, -1.8, '#ffd0a0']] as const) {
        const cc = mesh(geo.palla(0.12, 8), mat(c), X + dx, 0.04, dz);
        cc.scale.y = 0.4;
        g.add(cc);
      }
      break;
    }
    case 'fiume': {
      const acqua = mesh(new THREE.PlaneGeometry(2.6, 16), materiale({ color: '#4aa8d8', rim: 0, emissive: '#2a7ab0', emissiveIntensity: 0.15 }), X + 0.5, 0.025, 0);
      acqua.rotation.x = -Math.PI / 2;
      acqua.userData.senzaContorno = true;
      g.add(acqua);
      for (const s of [-1, 1]) {
        const riva = mesh(new THREE.PlaneGeometry(0.4, 16), materiale({ color: '#8a9a6a', rim: 0 }), X + 0.5 + s * 1.45, 0.02, 0);
        riva.rotation.x = -Math.PI / 2;
        g.add(riva);
      }
      // il ponte di legno
      const ponte = new THREE.Group();
      const legno = mat('#a87a4a');
      for (let i = 0; i < 9; i++) ponte.add(mesh(geo.scatola(0.32, 0.08, 1.4), legno, -1.6 + i * 0.4, 0.22 + Math.sin((i / 8) * Math.PI) * 0.25, 0));
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ponte.add(mesh(geo.cil(0.04, 0.04, 0.6, 5), legno, -1.3 + i * 1.3, 0.55 + (i === 1 ? 0.25 : 0), s * 0.65));
      contorno(ponte);
      ponte.position.set(X + 0.5, 0, 0);
      g.add(ponte);
      // i salici e il mulino ad acqua
      for (const [dx, dz] of [[-1.6, 2.2], [2.6, -2.4], [3.0, 2.8]]) {
        const sal = new THREE.Group();
        sal.add(mesh(geo.cil(0.14, 0.2, 1.4, 7), mat('#7a5a3a'), 0, 0.7, 0));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const r = mesh(geo.capsula(0.18, 0.9), mat('#8ac070', { rim: 0.3 }), Math.cos(a) * 0.5, 1.2, Math.sin(a) * 0.5);
          sal.add(r);
        }
        sal.add(mesh(geo.palla(0.7, 10), mat('#9ad080', { rim: 0.3 }), 0, 1.75, 0));
        sal.add(ombra(1));
        contorno(sal);
        sal.position.set(X + dx, 0, dz);
        g.add(sal);
      }
      const ruota = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const pala = mesh(geo.scatola(0.1, 1.4, 0.4), mat('#8a6a4a'), 0, 0, 0);
        pala.rotation.x = (i / 8) * Math.PI;
        ruota.add(pala);
      }
      ruota.add(mesh(new THREE.TorusGeometry(0.65, 0.05, 4, 16), mat('#6a4a3a'), 0, 0, 0));
      (ruota.children.at(-1) as THREE.Mesh).rotation.y = Math.PI / 2;
      contorno(ruota);
      ruota.position.set(X + 0.5, 0.6, -4.2);
      ruota.userData.gira = true;
      g.add(ruota);
      const mulino = mesh(geo.scatola(1.6, 1.6, 1.4), mat('#e8dcc0'), X + 2.0, 0.8, -4.4);
      g.add(contorno(mulino));
      g.add(mesh(geo.cono(1.3, 0.9, 4), mat('#a04a3a'), X + 2.0, 2.05, -4.4));
      break;
    }
    case 'ciliegi': {
      g.add(disco(4.4, '#e8d0c0', X, 0));
      for (const [dx, dz, s] of [[-1.4, 2.4, 1.1], [1.4, 2.9, 1.3], [2.8, -2.0, 1.2], [-0.8, -2.7, 1.0], [3.6, 1.0, 1.4], [0.8, -4.0, 1.1]]) {
        const a = alberoRosa(s);
        a.position.set(X + dx, 0, dz);
        g.add(a);
      }
      // il ponticello rosso ad arco sul laghetto
      g.add(disco(1.4, '#5ab0d0', X + 1.2, 0, 0.02));
      const arco = mesh(new THREE.TorusGeometry(1.0, 0.12, 6, 14, Math.PI), mat('#d8443a'), X + 1.2, 0, 0);
      arco.rotation.y = Math.PI / 2;
      arco.scale.set(1, 0.5, 1);
      g.add(contorno(arco));
      // i petali per terra
      for (let i = 0; i < 24; i++) {
        const p = mesh(geo.palla(0.05, 5), mat('#f8c0d0'), X - 2 + ((i * 0.37) % 1) * 5, 0.02, -3 + ((i * 0.61) % 1) * 6);
        p.scale.y = 0.2;
        p.userData.senzaContorno = true;
        g.add(p);
      }
      break;
    }
    case 'oasi': {
      g.add(disco(5, '#f0d090', X, 0));
      g.add(disco(1.6, '#3aa8b0', X + 1.4, 0.3, 0.02));
      for (const [dx, dz, h] of [[0.2, 2.0, 2.6], [2.8, -0.9, 3.0], [1.6, 2.4, 2.2], [-1.2, -2.4, 2.8]]) {
        const p = palma(h);
        p.position.set(X + dx, 0, dz);
        p.rotation.y = dx;
        g.add(p);
      }
      // le dune e una tenda a strisce
      for (const [dx, dz, r] of [[5, -3, 2.4], [6, 2.5, 3], [4.5, 6, 2]]) {
        const d = mesh(geo.palla(r, 12), mat('#f2cc80', { rim: 0.2 }), X + dx, 0, dz);
        d.scale.y = 0.35;
        g.add(d);
      }
      const tenda = mesh(geo.cono(1.1, 1.4, 4), mat('#ffffff', { map: texture(64, (c, l) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#d8443a' : '#f8e8c0'; c.fillRect((i * l) / 8, 0, l / 8, l); } }) }), X - 1.0, 0.7, 2.6);
      g.add(contorno(tenda));
      break;
    }
    case 'coralli': {
      g.add(disco(3.6, '#f6ead0', X - 1, 0));
      g.add(disco(9, '#2ac0b8', X + 6, 0, 0.02));
      g.add(disco(8.2, '#5ad8d0', X + 6, 0, 0.022));
      for (const [dx, dz, h] of [[-1.8, 2.0, 2.4], [-0.5, -2.2, 2.8]]) {
        const p = palma(h);
        p.position.set(X + dx, 0, dz);
        g.add(p);
      }
      // la zattera che porta all'isola, e l'isoletta laggiù
      const zattera = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const t = mesh(geo.cil(0.12, 0.12, 1.6, 7), mat('#a8845a'), 0, 0.1, -0.5 + i * 0.25);
        t.rotation.z = Math.PI / 2;
        zattera.add(t);
      }
      contorno(zattera);
      zattera.position.set(X + 2.2, 0, 0);
      zattera.userData.galleggia = true;
      g.add(zattera);
      const isola = disco(2, '#f6ead0', X + 9, 1.5, 0.03);
      g.add(isola);
      const p = palma(2.4);
      p.position.set(X + 9, 0, 1.5);
      g.add(p);
      break;
    }
  }
  return g;
}

/** Il portale di legno all'inizio del sentiero, con il nome del villaggio lontano (guarda verso +z). */
function creaPortale(b: DefBioma): THREE.Group {
  const g = new THREE.Group();
  const legno = mat('#ffffff', { map: texture(64, macchie(['#9a6c44', '#83592f', '#b08050'], 1, 23)), rim: 0.1 });
  for (const x of [-1.25, 1.25]) {
    g.add(mesh(geo.cil(0.09, 0.11, 2.5, 7), legno, x, 1.25, 0));
    g.add(ombra(0.35).translateX(x));
  }
  const tavola = mesh(geo.scatola(2.9, 0.7, 0.1), mat('#ffffff', { map: texture(512, (c, l) => {
    c.fillStyle = '#c4935e'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#a87a48'; for (let y = 0; y < l; y += 64) c.fillRect(0, y, l, 6);
    c.save();
    c.scale(1, 4.14); // la tavola è larga 4 volte l'altezza: la scritta si allunga per sembrare dritta
    const h = l / 4.14;
    c.fillStyle = b.colore; c.fillRect(0, h * 0.04, l, h * 0.1); c.fillRect(0, h * 0.86, l, h * 0.1);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = h * 0.42;
    c.font = `900 ${size}px 'Nunito Variable', sans-serif`;
    const testo = `${b.simbolo} ${b.villaggio}`;
    while (c.measureText(testo).width > l * 0.92 && size > 10) { size -= 2; c.font = `900 ${size}px 'Nunito Variable', sans-serif`; }
    c.lineWidth = size * 0.14; c.strokeStyle = '#3a2414'; c.lineJoin = 'round';
    c.strokeText(testo, l / 2, h * 0.38);
    c.fillStyle = '#fff6e0'; c.fillText(testo, l / 2, h * 0.38);
    c.font = `800 ${h * 0.2}px 'Nunito Variable', sans-serif`;
    c.fillStyle = '#4a3020'; c.fillText(b.nome, l / 2, h * 0.7);
    c.restore();
  }), rim: 0 }), 0, 2.3, 0.05);
  g.add(tavola);
  // le bandierine del colore del posto
  for (let i = 0; i < 6; i++) {
    const f = mesh(geo.cono(0.1, 0.22, 3), mat(i % 2 ? b.colore : '#fff6e0'), -1.05 + i * 0.42, 1.78, 0.1);
    f.rotation.x = Math.PI;
    f.scale.z = 0.2;
    g.add(f);
  }
  g.add(mesh(geo.cil(0.012, 0.012, 2.5, 4), mat('#6a4a3a'), 0, 1.9, 0.1).rotateZ(Math.PI / 2));
  return contorno(g);
}

export class SentieriInScena {
  readonly gruppo = new THREE.Group();
  private fatti = new Map<string, THREE.Group>();
  private chiave = '';
  private cose: THREE.Object3D[] = [];
  private angoli = new Map<string, number>();

  /** Da che parte va davvero il sentiero (gradi): vicino a quella del posto, ma dove non ci sono case davanti. */
  angoloDi(id: string): number | undefined {
    return this.angoli.get(id);
  }

  /** Rifà i sentieri (quando ne arriva uno nuovo o il villaggio si allarga). Ritorna quelli nuovi. */
  aggiorna(biomi: DefBioma[], raggio: number, angoli: Map<string, number>): DefBioma[] {
    const chiave = biomi.map((b) => b.id + ':' + angoli.get(b.id)).join(',') + '|' + raggio;
    this.angoli = angoli;
    if (chiave === this.chiave) return [];
    const nuovi = biomi.filter((b) => !this.fatti.has(b.id));
    this.chiave = chiave;
    this.gruppo.clear();
    this.fatti.clear();
    this.cose = [];
    for (const b of biomi) {
      const g = new THREE.Group();
      const da = raggio - 0.6;
      // la striscia di terra: dal colore della radura sfuma nel colore del posto lontano
      const geoS = new THREE.PlaneGeometry(LUNGHEZZA + 1, MEZZA_LARGHEZZA * 1.1, 16, 1);
      const col = new Float32Array(geoS.getAttribute('position').count * 3);
      const pos = geoS.getAttribute('position');
      const c0 = new THREE.Color('#b08a5a'), c1 = new THREE.Color(b.terra), c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const t = (pos.getX(i) + (LUNGHEZZA + 1) / 2) / (LUNGHEZZA + 1);
        c.copy(c0).lerp(c1, THREE.MathUtils.smoothstep(t, 0.35, 0.85));
        col.set([c.r, c.g, c.b], i * 3);
      }
      geoS.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const striscia = mesh(geoS, materiale({ color: '#ffffff', vertexColors: true, rim: 0 }), da + (LUNGHEZZA + 1) / 2, 0.014, 0);
      striscia.rotation.x = -Math.PI / 2;
      striscia.userData.senzaContorno = true;
      g.add(striscia);
      // qualche pietra piatta per camminare
      for (let i = 0; i < 9; i++) {
        const p = mesh(geo.cil(0.22, 0.24, 0.05, 8), mat('#c8bca8', { rim: 0.1 }), da + 1.2 + i * 1.2, 0.03, ((i * 37) % 7) / 10 - 0.3);
        p.scale.z = 0.8;
        g.add(p);
      }
      const portale = creaPortale(b);
      portale.position.set(raggio + 0.4, 0, 0);
      portale.rotation.y = -Math.PI / 2; // guarda verso il villaggio
      g.add(portale);
      g.add(paesaggio(b, raggio + LUNGHEZZA - 2.5));
      g.traverse((o) => { if (o.userData.galleggia || o.userData.gira) this.cose.push(o); });
      g.rotation.y = -((angoli.get(b.id) ?? b.angolo) * Math.PI) / 180;
      g.userData.bersaglio = { tipo: 'sentiero', id: b.id };
      g.userData.portale = portale;
      this.fatti.set(b.id, g);
      this.gruppo.add(g);
    }
    return nuovi;
  }

  /** Il portale di un sentiero (per inquadrarlo). */
  portale(id: string): THREE.Object3D | null {
    return (this.fatti.get(id)?.userData.portale as THREE.Object3D) ?? null;
  }

  /** Dove stanno i portali (per non farci passare attraverso gli animali). */
  ostacoli(): { x: number; z: number; r: number }[] {
    const out: { x: number; z: number; r: number }[] = [];
    const p = new THREE.Vector3();
    for (const g of this.fatti.values()) {
      const portale = g.userData.portale as THREE.Object3D;
      for (const x of [-1.25, 1.25]) {
        p.set(x, 0, 0);
        portale.localToWorld(p);
        out.push({ x: p.x, z: p.z, r: 0.2 });
      }
    }
    return out;
  }

  anima(t: number) {
    for (const o of this.cose) {
      if (o.userData.galleggia) { o.position.y = Math.sin(t * 1.4 + o.id) * 0.05; o.rotation.z = Math.sin(t * 1.1 + o.id) * 0.05; }
      if (o.userData.gira) o.rotation.x = t * 0.6;
    }
  }
}
