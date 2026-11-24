// La festa di compleanno di Giada in 3D: tavola con la torta e le candeline, striscione,
// pali con i festoni di bandierine e le lanterne di carta, palloncini, cappellini a cono
// per tutti e, la sera, i fuochi d'artificio. La usa Scena (vedi impostaFesta).
import * as THREE from 'three';
import { contorno, spriteTesto, texture } from './ps1';
import { geo, mat, mesh } from './modelli';

/** Dove si apparecchia la tavola della festa: davanti al villaggio, tra il corvo e il quaderno. */
export const POSTO_TORTA = new THREE.Vector3(0, 0, 1.7);

const COLORI = ['#ff6b8a', '#ffd166', '#7ccf6a', '#8fd3ff', '#c39bff', '#ff9a4a'];
/** Colori accesi per i fuochi d'artificio. */
const FUOCHI = ['#ffd166', '#ff5c7a', '#6fe0ff', '#8cff7a', '#ffffff', '#d49bff', '#ffa040'];

function striscione(testo: string): THREE.Group {
  const g = new THREE.Group();
  const larg = 4.2, alt = 0.62;
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = Math.round((1024 * alt) / larg);
  const c = cv.getContext('2d')!;
  const W = cv.width, H = cv.height;
  c.fillStyle = '#fff4e0';
  c.fillRect(0, 0, W, H);
  // bordo a zig-zag colorato sopra e sotto
  for (let i = 0; i < 24; i++) {
    c.fillStyle = COLORI[i % COLORI.length];
    const x = (i / 24) * W, w = W / 24;
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w, 0); c.lineTo(x + w / 2, H * 0.2); c.fill();
    c.beginPath(); c.moveTo(x, H); c.lineTo(x + w, H); c.lineTo(x + w / 2, H * 0.8); c.fill();
  }
  c.font = `900 ${Math.floor(H * 0.5)}px 'Nunito Variable', sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = H * 0.07;
  c.lineJoin = 'round';
  c.strokeStyle = '#7a3a1a';
  c.fillStyle = '#e8465f';
  c.strokeText(testo, W / 2, H / 2 + 3, W * 0.92);
  c.fillText(testo, W / 2, H / 2 + 3, W * 0.92);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const telo = new THREE.Mesh(new THREE.PlaneGeometry(larg, alt), mat('#ffffff', { map: tex, rim: 0, side: THREE.DoubleSide }));
  telo.position.y = 2.35;
  telo.userData.senzaContorno = true;
  g.add(telo);
  for (const x of [-larg / 2 - 0.08, larg / 2 + 0.08]) {
    g.add(mesh(geo.cil(0.06, 0.07, 2.8, 8), mat('#8a5a36'), x, 1.4, 0));
    g.add(mesh(geo.palla(0.1, 8), mat('#ffd166'), x, 2.85, 0));
  }
  return g;
}

/** Una fila di bandierine appese tra due punti, che pende un po' nel mezzo. */
function festone(a: THREE.Vector3, b: THREE.Vector3, k: number): THREE.Group {
  const g = new THREE.Group();
  const n = Math.max(5, Math.round(a.distanceTo(b) / 0.32));
  const punti: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * 0.45;
    punti.push(p);
  }
  const filo = new THREE.Line(new THREE.BufferGeometry().setFromPoints(punti), new THREE.LineBasicMaterial({ color: '#5a3a24' }));
  g.add(filo);
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.11, 0, 0, 0.11, 0, 0, 0, -0.24, 0], 3));
  tri.computeVertexNormals();
  for (let i = 1; i < n; i++) {
    const m = new THREE.Mesh(tri, mat(COLORI[(i + k) % COLORI.length], { rim: 0, side: THREE.DoubleSide }));
    m.position.copy(punti[i]);
    m.lookAt(punti[i].clone().add(new THREE.Vector3(b.z - a.z, 0, a.x - b.x)));
    m.userData.senzaContorno = true;
    m.userData.bandierina = i;
    g.add(m);
  }
  return g;
}

function lanternaDiCarta(colore: string): THREE.Group {
  const g = new THREE.Group();
  const p = mesh(geo.palla(0.16, 12), mat(colore, { emissive: colore, emissiveIntensity: 0.25, rim: 0 }), 0, -0.18, 0);
  p.scale.y = 1.25;
  p.name = 'carta';
  g.add(p);
  g.add(mesh(geo.cil(0.07, 0.07, 0.04, 8), mat('#5a3a24'), 0, -0.01, 0));
  return g;
}

function palloncino(colore: string, altezza: number): THREE.Group {
  const g = new THREE.Group();
  const p = mesh(geo.palla(0.2, 14), mat(colore, { rim: 0.6 }), 0, altezza, 0);
  p.scale.y = 1.18;
  g.add(p);
  g.add(mesh(geo.cono(0.04, 0.06, 6), mat(colore), 0, altezza - 0.25, 0));
  const filo = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, altezza * 0.5, 0), new THREE.Vector3(0, altezza - 0.27, 0)]),
    new THREE.LineBasicMaterial({ color: '#ffffff' }),
  );
  g.add(filo);
  return g;
}

/** La tavola rotonda con la tovaglia e la torta a tre piani con le candeline. */
function tavolaConTorta(): { gruppo: THREE.Group; fiammelle: THREE.Mesh[] } {
  const g = new THREE.Group();
  // tavolo e tovaglia a quadretti bianchi e rossi
  g.add(mesh(geo.cil(0.12, 0.18, 0.7, 10), mat('#8a5a36'), 0, 0.35, 0));
  const quadri = texture(64, (c, l) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#e8465f';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) c.fillRect((i * l) / 8, (j * l) / 8, l / 8, l / 8);
  }, 3);
  g.add(mesh(geo.cil(1.0, 1.08, 0.22, 24), mat('#ffffff', { map: quadri, rim: 0.2 }), 0, 0.76, 0));
  // la torta: tre piani rosa, panna, fragole
  const piani: [number, number, string][] = [[0.62, 0.32, '#ffb3c6'], [0.46, 0.28, '#fff4e0'], [0.3, 0.26, '#ffb3c6']];
  let y = 0.87;
  for (const [r, h, c] of piani) {
    g.add(mesh(geo.cil(r, r, h, 24), mat(c, { rim: 0.3 }), 0, y + h / 2, 0));
    // bordo di panna
    const n = Math.round(r * 22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const goccia = mesh(geo.palla(0.055, 6), mat('#ffffff', { rim: 0 }), Math.cos(a) * r, y + h, Math.sin(a) * r);
      goccia.userData.senzaContorno = true;
      g.add(goccia);
    }
    y += h;
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const f = mesh(geo.palla(0.06, 8), mat('#e8364f'), Math.cos(a) * 0.5, 1.25, Math.sin(a) * 0.5);
    f.userData.senzaContorno = true;
    g.add(f);
  }
  // le candeline
  const fiammelle: THREE.Mesh[] = [];
  const nc = 7;
  for (let i = 0; i < nc; i++) {
    const a = (i / nc) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.2;
    const x = i === 0 ? 0 : Math.cos(a) * r, z = i === 0 ? 0 : Math.sin(a) * r;
    g.add(mesh(geo.cil(0.025, 0.025, 0.22, 6), mat(COLORI[i % COLORI.length], { rim: 0 }), x, y + 0.11, z));
    const fiamma = mesh(geo.cono(0.035, 0.1, 6), mat('#ffd070', { emissive: '#ff9a1a', emissiveIntensity: 2, rim: 0 }), x, y + 0.27, z);
    fiamma.userData.senzaContorno = true;
    fiammelle.push(fiamma);
    g.add(fiamma);
  }
  // piattini e tazzine intorno
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const p = mesh(geo.cil(0.13, 0.1, 0.03, 12), mat('#ffffff'), Math.cos(a) * 0.82, 0.89, Math.sin(a) * 0.82);
    g.add(p);
  }
  contorno(g);
  return { gruppo: g, fiammelle };
}

/** Il cappellino a cono a righe per la festa. */
export function cappellinoDiFesta(k: number): THREE.Group {
  const g = new THREE.Group();
  const c1 = COLORI[k % COLORI.length], c2 = COLORI[(k + 2) % COLORI.length];
  const righe = texture(32, (c, l) => {
    c.fillStyle = c1; c.fillRect(0, 0, l, l);
    c.fillStyle = c2;
    for (let i = 0; i < 4; i++) c.fillRect(0, (i * l) / 4, l, l / 8);
  });
  const cono = mesh(geo.cono(0.13, 0.34, 12), mat('#ffffff', { map: righe, rim: 0.3 }), 0, 0.17, 0);
  g.add(cono);
  const pompon = mesh(geo.palla(0.05, 8), mat('#ffffff'), 0, 0.36, 0);
  g.add(pompon);
  g.rotation.z = (k % 2 ? 1 : -1) * 0.18;
  g.name = 'cappellinoFesta';
  contorno(g);
  return g;
}

interface Scoppio { punti: THREE.Points; vel: Float32Array; vita: number }

export class Festa {
  readonly gruppo = new THREE.Group();
  private fiammelle: THREE.Mesh[] = [];
  private candeleAccese = true;
  private lanterne: THREE.Mesh[] = [];
  private palloncini: THREE.Group[] = [];
  private bandierine: THREE.Mesh[] = [];
  private scoppi: Scoppio[] = [];
  private fumo: { o: THREE.Sprite; vita: number }[] = [];
  private prossimoFuoco = 0;
  private salve = 0; // fuochi d'artificio da sparare subito (dopo le candeline)
  /** Gli animali si radunano intorno alla tavola (durante lo spettacolo). */
  raduno = false;
  /** Dopo le candeline si balla. */
  balla = false;
  private posti = new Map<string, THREE.Vector3>();

  constructor(private scene: THREE.Scene, raggio: number) {
    const t = tavolaConTorta();
    t.gruppo.position.copy(POSTO_TORTA);
    this.fiammelle = t.fiammelle;
    this.gruppo.add(t.gruppo);

    const s = striscione('BUON COMPLEANNO GIADA!');
    s.position.set(POSTO_TORTA.x, 0, POSTO_TORTA.z - 2.3);
    contorno(s);
    this.gruppo.add(s);

    // pali con lanterne in cerchio intorno alla tavola, legati dai festoni
    const n = 8, r = Math.min(4.2, raggio * 0.4);
    const cime: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      const x = POSTO_TORTA.x + Math.cos(a) * r, z = POSTO_TORTA.z + Math.sin(a) * r;
      const palo = new THREE.Group();
      palo.add(mesh(geo.cil(0.05, 0.06, 2.4, 8), mat('#8a5a36'), 0, 1.2, 0));
      palo.add(mesh(geo.palla(0.08, 8), mat(COLORI[i % COLORI.length]), 0, 2.44, 0));
      contorno(palo);
      palo.position.set(x, 0, z);
      this.gruppo.add(palo);
      const lant = lanternaDiCarta(COLORI[(i + 3) % COLORI.length]);
      lant.position.set(x, 2.25, z);
      this.gruppo.add(lant);
      this.lanterne.push(lant.getObjectByName('carta') as THREE.Mesh);
      cime.push(new THREE.Vector3(x, 2.3, z));
    }
    for (let i = 0; i < n; i++) {
      // niente festone davanti alla telecamera (coprirebbe la torta)
      const a = (i / n) * Math.PI * 2 + Math.PI / n, b = ((i + 1) / n) * Math.PI * 2 + Math.PI / n;
      if (Math.sin((a + b) / 2) > 0.8) continue;
      const f = festone(cime[i], cime[(i + 1) % n], i);
      this.gruppo.add(f);
      f.traverse((o) => o.userData.bandierina && this.bandierine.push(o as THREE.Mesh));
    }
    // palloncini legati alla tavola
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.9;
      const p = palloncino(COLORI[(i * 2) % COLORI.length], 1.3 + (i % 3) * 0.25);
      p.position.set(POSTO_TORTA.x + Math.cos(a) * 1.05, 0.8, POSTO_TORTA.z + Math.sin(a) * 1.05);
      p.userData.fase = i * 1.3;
      this.palloncini.push(p);
      this.gruppo.add(p);
    }
    this.gruppo.traverse((o) => (o.raycast = () => {}));
    scene.add(this.gruppo);
  }

  /** Il posto intorno alla tavola per ogni invitato (in cerchio, lasciando libero il lato verso la telecamera). */
  sistemaInvitati(ids: string[]) {
    this.posti.clear();
    const n = ids.length;
    ids.forEach((id, i) => {
      // un arco dietro e ai lati della tavola, su due file se sono tanti
      const fila = n > 9 && i % 2 ? 1 : 0;
      const t = n === 1 ? 0.5 : i / (n - 1);
      const a = Math.PI * (1.05 + t * 0.9) - Math.PI / 2;
      const r = 1.75 + fila * 0.9;
      this.posti.set(id, new THREE.Vector3(POSTO_TORTA.x + Math.sin(a) * r, 0, POSTO_TORTA.z + Math.cos(a) * r));
    });
  }

  postoDi(id: string): THREE.Vector3 | undefined {
    return this.posti.get(id);
  }

  /** Giada soffia: le fiammelle si spengono con uno sbuffo di fumo e partono i fuochi. */
  soffia() {
    if (!this.candeleAccese) return;
    this.candeleAccese = false;
    for (const f of this.fiammelle) {
      f.visible = false;
      const p = new THREE.Vector3();
      f.getWorldPosition(p);
      const s = spriteTesto('●', '#e8e8f0');
      (s.material as THREE.SpriteMaterial).opacity = 0.7;
      s.scale.setScalar(0.12);
      s.position.copy(p);
      this.scene.add(s);
      this.fumo.push({ o: s, vita: 1.6 });
    }
    this.salve = 7;
    this.prossimoFuoco = 0.6;
    this.balla = true;
  }

  get candeline(): boolean {
    return this.candeleAccese;
  }

  /** Candeline già spente (la festa c'è stata prima, oggi): senza fumo né fuochi. */
  spegni() {
    this.candeleAccese = false;
    for (const f of this.fiammelle) f.visible = false;
  }

  private fuocoDArtificio(sera: boolean) {
    const n = 120;
    const pos = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const centro = new THREE.Vector3(POSTO_TORTA.x + (Math.random() - 0.5) * 6.5, 6.5 + Math.random() * 3, POSTO_TORTA.z - 3 - Math.random() * 5);
    const forza = 2.6 + Math.random() * 1.4;
    for (let i = 0; i < n; i++) {
      pos.set([centro.x, centro.y, centro.z], i * 3);
      const d = new THREE.Vector3().randomDirection().multiplyScalar(forza * (0.85 + Math.random() * 0.3));
      vel.set([d.x, d.y, d.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const colore = FUOCHI[Math.floor(Math.random() * FUOCHI.length)];
    const m = new THREE.PointsMaterial({ color: colore, size: sera ? 0.55 : 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: puntoLuce(), fog: false });
    const punti = new THREE.Points(g, m);
    punti.frustumCulled = false;
    this.scene.add(punti);
    this.scoppi.push({ punti, vel, vita: 1.8 });
  }

  /** Ogni fotogramma: fiammelle che tremano, palloncini che ondeggiano, fuochi la sera. */
  aggiorna(dt: number, t: number, buio: number) {
    for (const [i, f] of this.fiammelle.entries()) f.scale.set(1, 1 + Math.sin(t * 14 + i * 2) * 0.2, 1);
    for (const p of this.palloncini) {
      p.rotation.z = Math.sin(t * 1.1 + p.userData.fase) * 0.08;
      p.rotation.x = Math.cos(t * 0.9 + p.userData.fase) * 0.06;
    }
    for (const [i, b] of this.bandierine.entries()) b.rotation.x = Math.sin(t * 2.4 + i * 0.7) * 0.25;
    for (const l of this.lanterne) (l.material as THREE.MeshToonMaterial).emissiveIntensity = 0.25 + buio * 1.6;

    // i fuochi: una salva dopo le candeline, poi ogni tanto quando è buio
    this.prossimoFuoco -= dt;
    if (this.prossimoFuoco <= 0 && (this.salve > 0 || buio > 0.5)) {
      this.fuocoDArtificio(buio > 0.5);
      if (this.salve > 0 && Math.random() < 0.5) this.fuocoDArtificio(buio > 0.5); // a volte due insieme
      if (this.salve > 0) this.salve--;
      this.prossimoFuoco = this.salve > 0 ? 0.45 + Math.random() * 0.4 : 1.2 + Math.random() * 2.2;
    }
    this.scoppi = this.scoppi.filter((s) => {
      s.vita -= dt;
      const a = s.punti.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        s.vel[i * 3 + 1] -= 1.6 * dt;
        for (let k = 0; k < 3; k++) s.vel[i * 3 + k] *= 1 - dt * 0.9;
        a.setXYZ(i, a.getX(i) + s.vel[i * 3] * dt, a.getY(i) + s.vel[i * 3 + 1] * dt, a.getZ(i) + s.vel[i * 3 + 2] * dt);
      }
      a.needsUpdate = true;
      (s.punti.material as THREE.PointsMaterial).opacity = Math.min(1, s.vita / 0.8);
      if (s.vita > 0) return true;
      this.scene.remove(s.punti);
      s.punti.geometry.dispose();
      (s.punti.material as THREE.Material).dispose();
      return false;
    });
    this.fumo = this.fumo.filter((f) => {
      f.vita -= dt;
      f.o.position.y += dt * 0.5;
      f.o.scale.setScalar(0.12 + (1.6 - f.vita) * 0.15);
      (f.o.material as THREE.SpriteMaterial).opacity = Math.max(0, f.vita / 1.6) * 0.7;
      if (f.vita > 0) return true;
      this.scene.remove(f.o);
      return false;
    });
  }

  distruggi() {
    this.scene.remove(this.gruppo);
    for (const s of this.scoppi) this.scene.remove(s.punti);
    for (const f of this.fumo) this.scene.remove(f.o);
    this.scoppi = [];
    this.fumo = [];
  }
}

let luce: THREE.Texture | null = null;
function puntoLuce(): THREE.Texture {
  luce ??= texture(32, (c, l) => {
    const g = c.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, l, l);
  });
  return luce;
}
