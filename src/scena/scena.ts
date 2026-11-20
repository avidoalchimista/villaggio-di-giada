// La radura del villaggio in 3D low-poly. Gli animali girano liberi, dormono, festeggiano.
// Si tocca un animale, il corvo o il quaderno per interagire.
import * as THREE from 'three';
import { REGOLE } from '../lib/gioco';
import { COLORE_VIRTU } from '../lib/etichette';
import type { Animale, StatoGioco } from '../lib/tipi';
import {
  aggiornaMestiere, creaAlbero, creaAnimale, creaBottega, creaChiosco, creaCorvo, creaFiore, creaLanterna,
  creaNido, creaPiazzaMusica, creaPino, creaQuaderno, creaSasso, creaUovo, mat, type ModelloAnimale,
} from './modelli';
import { macchie, materiale, spriteTesto, texture } from './ps1';

export type Bersaglio = { tipo: 'animale'; id: string } | { tipo: 'corvo' } | { tipo: 'quaderno' } | { tipo: 'uovo'; id: string } | { tipo: 'edificio'; tipo_edificio: string };

interface Abitante {
  m: ModelloAnimale;
  dati: Animale;
  meta: THREE.Vector3;
  pausa: number;
  passo: number;
  salto: number;
  z: THREE.Sprite[];
}

const RAGGIO = 5;
const POSTI_EDIFICI: Record<string, [number, number, number]> = {
  chiosco: [3.2, 0, -2.6],
  piazza_musica: [-3.4, 0, -2.4],
  bottega: [0, 0, -4.4],
};

export class Scena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  private sole = new THREE.DirectionalLight('#fff3dc', 1.6);
  private ambiente = new THREE.HemisphereLight('#cfe8ff', '#7a9a5a', 1.1);
  private orologio = new THREE.Clock();
  private abitanti = new Map<string, Abitante>();
  private uova = new Map<string, THREE.Group>();
  private edifici = new Map<string, THREE.Group>();
  private lanterne: THREE.Mesh[] = [];
  private lucciole: THREE.Points;
  private corvo = creaCorvo();
  private quaderno = creaQuaderno();
  private nido = creaNido();
  private angolo = 0.0;
  private distanza = 13;
  private altezza = 8.5;
  private velAngolo = 0;
  private trascina: { x: number; t: number; mosso: number } | null = null;
  private raf = 0;
  private corvoParla = 0;
  private effimeri: { o: THREE.Object3D; vita: number; vel: THREE.Vector3 }[] = [];
  private resizeObs: ResizeObserver;
  onTocco: (b: Bersaglio) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private risoluzione = 300) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.fog = new THREE.Fog('#bfe3f2', 17, 34);
    this.scene.add(this.ambiente, this.sole);
    this.sole.position.set(5, 10, 6);

    this.costruisciMondo();
    this.lucciole = this.creaLucciole();
    this.scene.add(this.lucciole);

    this.resizeObs = new ResizeObserver(() => this.ridimensiona());
    this.resizeObs.observe(canvas);
    this.ridimensiona();
    this.collegaInput();
    this.ciclo();
  }

  // ---------- mondo ----------

  private costruisciMondo() {
    const erba = texture(32, macchie(['#7ccf6a', '#6cbf5c', '#8ad978', '#5fae52', '#98e086'], 0.7), 10);
    const prato = new THREE.Mesh(new THREE.CircleGeometry(26, 24), materiale({ map: erba }));
    prato.rotation.x = -Math.PI / 2;
    this.scene.add(prato);

    // sentiero di terra
    const terra = texture(16, macchie(['#d9b98a', '#caa676', '#e6c99c']), 2);
    // il terreno sopra il prato: spostato in avanti nella profondità, così non sfarfalla con il tremolio dei vertici
    const matTerra = materiale({ map: terra, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const sentiero = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.3, 16, 1), matTerra);
    sentiero.rotation.x = -Math.PI / 2;
    sentiero.position.y = 0.04;
    this.scene.add(sentiero);
    const viale = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), matTerra);
    viale.rotation.x = -Math.PI / 2;
    viale.position.set(0, 0.04, 4.5);
    this.scene.add(viale);

    // laghetto
    const acqua = new THREE.Mesh(new THREE.CircleGeometry(1.3, 10), materiale({ color: '#5fb6e6', emissive: '#2a6f9a', emissiveIntensity: 0.15, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    acqua.rotation.x = -Math.PI / 2;
    acqua.position.set(4.6, 0.04, 2.4);
    acqua.scale.set(1.3, 0.9, 1);
    this.scene.add(acqua);
    for (let i = 0; i < 7; i++) {
      const s = creaSasso(0.5 + (i % 3) * 0.15);
      const a = (i / 7) * Math.PI * 2;
      s.position.set(4.6 + Math.cos(a) * 1.75, s.position.y, 2.4 + Math.sin(a) * 1.25);
      this.scene.add(s);
    }

    // bosco tutto intorno
    let k = 0;
    for (let anello = 0; anello < 3; anello++) {
      const r = 8.5 + anello * 2.6;
      const n = 14 + anello * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + anello * 0.4;
        if (anello === 0 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI / 2) < 0.25) continue; // varco del viale
        const albero = (i + anello) % 3 === 0 ? creaPino(0.9 + ((i * 7) % 5) * 0.12) : creaAlbero(0.85 + ((i * 5) % 4) * 0.12, k++);
        albero.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        albero.rotation.y = i;
        this.scene.add(albero);
      }
    }
    // un albero grande vicino al nido
    const grande = creaAlbero(1.5, 2);
    grande.position.set(-4.2, 0, 0.4);
    this.scene.add(grande);
    this.nido.scale.setScalar(1.3);
    this.nido.position.set(-2.9, 0, 1.6);
    this.scene.add(this.nido);

    // fiori sparsi
    const colori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb', '#ff7b6b'];
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996, r = 2.6 + ((i * 37) % 50) / 10;
      if (r > 7.6) continue;
      const f = creaFiore(colori[i % colori.length]);
      f.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      this.scene.add(f);
    }

    // lanterne lungo il viale
    for (const [x, z] of [[-0.9, 3.2], [0.9, 3.2], [-2.6, -0.4], [2.6, -0.4]]) {
      const l = creaLanterna();
      l.gruppo.position.set(x, 0, z);
      this.scene.add(l.gruppo);
      this.lanterne.push(l.luce);
    }

    // corvo e quaderno
    this.corvo.gruppo.position.set(-1.6, 0, 3.4);
    this.corvo.gruppo.rotation.y = 0.4;
    this.corvo.gruppo.userData.bersaglio = { tipo: 'corvo' };
    this.scene.add(this.corvo.gruppo);
    this.quaderno.position.set(1.5, 0, 3.6);
    this.quaderno.rotation.y = -0.3;
    this.quaderno.userData.bersaglio = { tipo: 'quaderno' };
    this.scene.add(this.quaderno);
    const brilla = spriteTesto('✎', '#ffe08a', 32);
    brilla.scale.setScalar(0.5);
    brilla.position.set(0, 1.35, 0);
    brilla.name = 'brilla';
    this.quaderno.add(brilla);
  }

  private creaLucciole(): THREE.Points {
    const n = 40;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 7;
      pos.set([Math.cos(a) * r, 0.4 + Math.random() * 2, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff3a0', size: 3, sizeAttenuation: false, transparent: true, opacity: 0 }));
  }

  // ---------- stato del gioco → scena ----------

  aggiorna(s: StatoGioco) {
    const visti = new Set<string>();
    s.animali.forEach((a, i) => {
      visti.add(a.id);
      if (a.fase === 'uovo') {
        this.togliAbitante(a.id);
        if (!this.uova.has(a.id)) {
          const u = creaUovo(COLORE_VIRTU[REGOLE.specieVirtu[a.specie]]);
          const n = this.uova.size;
          u.position.set(this.nido.position.x + (n % 3 - 1) * 0.35, 0.05, this.nido.position.z + Math.floor(n / 3) * 0.3);
          u.userData.bersaglio = { tipo: 'uovo', id: a.id };
          this.uova.set(a.id, u);
          this.scene.add(u);
        }
        return;
      }
      const uovo = this.uova.get(a.id);
      if (uovo) {
        this.scene.remove(uovo);
        this.uova.delete(a.id);
        this.coriandoli(uovo.position.clone().setY(0.6), ['#ffd166', '#ff8fb1', '#7ccf6a']);
      }
      let ab = this.abitanti.get(a.id);
      if (!ab) {
        const m = creaAnimale(a);
        const pos = uovo?.position ?? new THREE.Vector3(Math.cos(i * 2.1) * 2.5, 0, Math.sin(i * 2.1) * 2.5);
        m.gruppo.position.set(pos.x, 0, pos.z);
        m.gruppo.userData.bersaglio = { tipo: 'animale', id: a.id };
        this.scene.add(m.gruppo);
        ab = { m, dati: a, meta: this.puntoCasuale(), pausa: 1 + Math.random() * 2, passo: Math.random() * 6, salto: 0, z: [] };
        this.abitanti.set(a.id, ab);
        if (uovo) ab.salto = 1;
      }
      ab.dati = a;
      const scala = 1.5 * ({ cucciolo: 0.7, giovane: 0.85, adulto: 1, maestro: 1.08, uovo: 0.5 } as const)[a.fase];
      ab.m.gruppo.scale.setScalar(scala);
      aggiornaMestiere(ab.m, a.mestiere);
      this.aggiornaSonno(ab);
    });
    for (const id of [...this.abitanti.keys()]) if (!visti.has(id)) this.togliAbitante(id);

    // edifici
    for (const e of s.edifici) {
      let g = this.edifici.get(e.tipo);
      if (!g) {
        g = e.tipo === 'chiosco' ? creaChiosco() : e.tipo === 'piazza_musica' ? creaPiazzaMusica() : creaBottega();
        const [x, y, z] = POSTI_EDIFICI[e.tipo] ?? [0, 0, -4];
        g.position.set(x, y, z);
        g.lookAt(0, 0, 0);
        g.userData.bersaglio = { tipo: 'edificio', tipo_edificio: e.tipo };
        this.edifici.set(e.tipo, g);
        this.scene.add(g);
      }
      g.scale.setScalar(e.stato === 'fermo' ? 0.96 : 1);
      g.rotation.z = e.stato === 'fermo' ? 0.03 : 0;
    }
  }

  private togliAbitante(id: string) {
    const ab = this.abitanti.get(id);
    if (!ab) return;
    this.scene.remove(ab.m.gruppo);
    this.abitanti.delete(id);
  }

  private aggiornaSonno(ab: Abitante) {
    const dorme = ab.dati.addormentato;
    if (dorme && !ab.z.length) {
      for (let i = 0; i < 3; i++) {
        const z = spriteTesto('z', '#ffffff', 24);
        z.scale.setScalar(0.35 + i * 0.1);
        ab.m.gruppo.add(z);
        ab.z.push(z);
      }
    } else if (!dorme && ab.z.length) {
      ab.z.forEach((z) => ab.m.gruppo.remove(z));
      ab.z = [];
    }
  }

  private puntoCasuale(): THREE.Vector3 {
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * (RAGGIO - 1.5);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  // ---------- effetti ----------

  /** Tutti saltano di gioia (dopo una pagina di diario). */
  festeggia() {
    for (const ab of this.abitanti.values()) {
      ab.salto = 1 + Math.random() * 0.3;
      const cuore = spriteTesto('♥', '#ff6b8a', 32);
      cuore.scale.setScalar(0.45);
      cuore.position.copy(ab.m.gruppo.position).add(new THREE.Vector3(0, 1.7 * ab.m.gruppo.scale.x, 0));
      this.scene.add(cuore);
      this.effimeri.push({ o: cuore, vita: 1.6, vel: new THREE.Vector3(0, 0.7, 0) });
    }
  }

  /** Il corvo saltella e sbatte le ali mentre parla. */
  faiParlareCorvo(secondi = 2) {
    this.corvoParla = secondi;
  }

  private coriandoli(dove: THREE.Vector3, colori: string[]) {
    for (let i = 0; i < 18; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), mat(colori[i % colori.length]));
      p.position.copy(dove);
      this.scene.add(p);
      this.effimeri.push({ o: p, vita: 1.2, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3) });
    }
  }

  // ---------- input ----------

  private collegaInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.trascina = { x: e.clientX, t: performance.now(), mosso: 0 };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.trascina) return;
      const dx = e.clientX - this.trascina.x;
      this.trascina.mosso += Math.abs(dx);
      this.trascina.x = e.clientX;
      this.angolo -= dx * 0.008;
      this.velAngolo = -dx * 0.008;
    });
    c.addEventListener('pointerup', (e) => {
      const t = this.trascina;
      this.trascina = null;
      if (t && t.mosso < 8) this.tocca(e.clientX, e.clientY);
    });
  }

  private tocca(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const candidati: THREE.Object3D[] = [this.corvo.gruppo, this.quaderno, ...this.uova.values(), ...this.edifici.values(), ...[...this.abitanti.values()].map((a) => a.m.gruppo)];
    const hit = ray.intersectObjects(candidati, true)[0];
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.bersaglio) o = o.parent;
    if (!o) return;
    const b = o.userData.bersaglio as Bersaglio;
    if (b.tipo === 'animale') {
      const ab = this.abitanti.get(b.id);
      if (ab && !ab.dati.addormentato) { ab.salto = 0.8; ab.pausa = 3; }
    }
    if (b.tipo === 'uovo') { const u = this.uova.get(b.id); if (u) u.userData.scossa = 1; }
    this.onTocco(b);
  }

  // ---------- ciclo ----------

  private ridimensiona() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    const bw = this.risoluzione, bh = Math.round((this.risoluzione * h) / w);
    this.renderer.setSize(bw, bh, false);
    this.camera.aspect = w / h;
    // telefono in verticale: più dall'alto e con un campo più largo, così la radura sta tutta nello schermo
    const verticale = w / h < 0.8;
    this.camera.fov = verticale ? 52 : 38;
    this.distanza = verticale ? 12.5 : 13;
    this.altezza = verticale ? 11.5 : 8.5;
    this.camera.updateProjectionMatrix();
  }

  private luceDelGiorno() {
    const ora = new Date();
    const h = ora.getHours() + ora.getMinutes() / 60;
    // 0 = notte piena, 1 = mezzogiorno
    const giorno = Math.max(0, Math.min(1, Math.sin(((h - 6) / 14) * Math.PI)));
    const tramonto = h > 16.5 && h < 20.5 ? 1 - Math.abs(h - 18.5) / 2 : h > 5.5 && h < 8 ? 1 - Math.abs(h - 6.7) / 1.3 : 0;
    const cielo = new THREE.Color('#1c2350').lerp(new THREE.Color('#bfe3f2'), giorno).lerp(new THREE.Color('#ffb38a'), Math.max(0, tramonto) * 0.6);
    this.scene.background = cielo;
    (this.scene.fog as THREE.Fog).color = cielo;
    this.sole.intensity = 0.25 + giorno * 1.5;
    this.sole.color.set(tramonto > 0 ? '#ffc58f' : '#fff3dc');
    this.ambiente.intensity = 0.45 + giorno * 0.75;
    const notte = 1 - giorno;
    for (const l of this.lanterne) (l.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.2 + notte * 1.6;
    (this.lucciole.material as THREE.PointsMaterial).opacity = Math.max(0, notte - 0.3);
  }

  private ciclo = () => {
    this.raf = requestAnimationFrame(this.ciclo);
    const dt = Math.min(0.05, this.orologio.getDelta());
    const t = this.orologio.elapsedTime;

    // camera: trascinando gira intorno, poi rallenta
    if (!this.trascina) {
      this.velAngolo *= 0.92;
      this.angolo += this.velAngolo;
    }
    const oscilla = Math.sin(t * 0.15) * 0.06;
    this.camera.position.set(Math.sin(this.angolo + oscilla) * this.distanza, this.altezza, Math.cos(this.angolo + oscilla) * this.distanza);
    this.camera.lookAt(Math.sin(this.angolo) * 1.2, 0.4, Math.cos(this.angolo) * 1.2);

    if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) this.luceDelGiorno();

    for (const ab of this.abitanti.values()) this.muovi(ab, dt, t);

    // uova che dondolano
    for (const u of this.uova.values()) {
      const scossa = (u.userData.scossa as number) ?? 0;
      u.rotation.z = Math.sin(t * 3 + u.position.x * 5) * 0.06 * (Math.sin(t * 0.7) > 0.6 ? 1 : 0.2) + Math.sin(t * 30) * scossa * 0.2;
      u.userData.scossa = Math.max(0, scossa - dt * 1.5);
    }

    // corvo: si guarda intorno, sbatte le ali quando parla
    const parla = this.corvoParla > 0;
    this.corvoParla = Math.max(0, this.corvoParla - dt);
    this.corvo.testa.rotation.y = Math.sin(t * 0.6) * 0.5 + (parla ? Math.sin(t * 12) * 0.08 : 0);
    this.corvo.testa.rotation.x = parla ? Math.sin(t * 14) * 0.12 : 0;
    const battito = parla ? Math.sin(t * 16) * 0.6 : Math.sin(t * 9) * 0.5 * (Math.sin(t * 0.5) > 0.95 ? 1 : 0);
    this.corvo.ali[0].rotation.z = battito;
    this.corvo.ali[1].rotation.z = -battito;

    // quaderno che invita
    const brilla = this.quaderno.getObjectByName('brilla');
    if (brilla) brilla.position.y = 1.35 + Math.sin(t * 3) * 0.08;

    // lucciole
    const pos = this.lucciole.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0.6 + Math.sin(t * 0.8 + i) * 0.5 + (i % 3) * 0.4);
    pos.needsUpdate = true;

    // effetti temporanei
    this.effimeri = this.effimeri.filter((e) => {
      e.vita -= dt;
      e.vel.y -= e.o instanceof THREE.Sprite ? 0 : 6 * dt;
      e.o.position.addScaledVector(e.vel, dt);
      e.o.rotation.x += dt * 5;
      if (e.vita <= 0) { this.scene.remove(e.o); return false; }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  };

  private muovi(ab: Abitante, dt: number, t: number) {
    const g = ab.m.gruppo;
    if (ab.dati.addormentato) {
      ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 1.35, dt * 2);
      ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, -0.12, dt * 2);
      ab.m.corpo.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
      ab.z.forEach((z, i) => {
        const f = (t * 0.5 + i / 3) % 1;
        z.position.set(0.3 + f * 0.4, 0.9 + f * 1.1, 0);
        z.material.opacity = 1 - f;
      });
      return;
    }
    ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 0, dt * 4);

    // salto di gioia
    if (ab.salto > 0) {
      ab.salto = Math.max(0, ab.salto - dt * 1.6);
      const fase = ab.salto % 0.5;
      ab.m.corpo.position.y = Math.sin((fase / 0.5) * Math.PI) * 0.5;
      g.rotation.y += dt * 4;
      return;
    }

    const dir = ab.meta.clone().sub(g.position);
    const dist = dir.length();
    if (ab.pausa > 0) {
      ab.pausa -= dt;
      ab.m.corpo.position.y = Math.abs(Math.sin(t * 2)) * 0.02;
      ab.m.testa.rotation.y = Math.sin(t * 0.9 + g.position.x) * 0.4;
      ab.m.zampe.forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, 0, dt * 6)));
      if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(t * 3) * 0.25;
      if (ab.pausa <= 0) ab.meta = this.puntoCasuale();
      return;
    }
    if (dist < 0.15) {
      ab.pausa = 1.5 + Math.random() * 4;
      return;
    }
    const vel = 0.9 * (ab.dati.umore > 50 ? 1 : 0.6);
    dir.normalize();
    g.position.addScaledVector(dir, Math.min(dist, vel * dt));
    const verso = Math.atan2(dir.x, dir.z);
    const diff = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
    g.rotation.y += diff * Math.min(1, dt * 6);
    ab.passo += dt * 10;
    ab.m.corpo.position.y = Math.abs(Math.sin(ab.passo)) * 0.08;
    ab.m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(ab.passo + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.6));
    ab.m.testa.rotation.y = 0;
    if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(ab.passo) * 0.35;
  }

  distruggi() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.renderer.dispose();
  }
}
