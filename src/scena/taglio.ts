// L'accetta del Villaggio: un tocco, un colpo. Si vede l'accetta che va indietro e colpisce il tronco,
// volano i trucioli, l'albero trema e la tacca si allarga; dopo qualche colpo l'albero cade dalla parte
// opposta a chi guarda, rimbalza, e al suo posto resta una catasta di legna che dopo qualche secondo sparisce.
// Lo spazio si libera davvero: l'albero esce dal bosco e non ricresce.
import * as THREE from 'three';
import { contorno } from './ps1';
import { corteccia, geo, mat, mesh } from './modelli';

export type CosaTagliata = 'albero' | 'cespuglio' | 'sasso';

/** Quanti colpi servono. */
export const COLPI: Record<CosaTagliata, number> = { albero: 5, cespuglio: 2, sasso: 3 };

const DUR_COLPO = 0.42; // indietro, giù, colpo, su
const IMPATTO = 0.26; // quando la lama tocca il tronco
const CADUTA = 1.15;

/** L'accetta: manico di legno e testa di ferro con il filo chiaro. Il perno è in fondo al manico (la mano). */
export function creaAccetta(): THREE.Group {
  const g = new THREE.Group();
  const manico = mesh(geo.cil(0.035, 0.045, 0.95, 8), mat('#b07a44'), 0, 0.47, 0);
  g.add(manico);
  const testa = new THREE.Group();
  testa.position.set(0, 0.86, 0);
  testa.add(mesh(geo.scatola(0.1, 0.16, 0.12), mat('#6f7378', { rim: 0.4 }), 0, 0, 0));
  const lama = mesh(geo.scatola(0.26, 0.24, 0.05), mat('#8d9399', { rim: 0.5 }), 0.15, 0, 0);
  testa.add(lama);
  const filo = mesh(geo.scatola(0.04, 0.27, 0.055), mat('#e8eef2', { rim: 0.6 }), 0.29, 0, 0);
  testa.add(filo);
  g.add(testa);
  // un nastrino rosso sul manico, che si vede da lontano
  g.add(mesh(geo.cil(0.05, 0.05, 0.08, 8), mat('#d94a3a'), 0, 0.12, 0));
  return contorno(g);
}

function creaCiocco(lungo = 0.75, r = 0.13): THREE.Group {
  const g = new THREE.Group();
  const t = mesh(geo.cil(r, r * 1.05, lungo, 9), corteccia(), 0, 0, 0);
  t.rotation.z = Math.PI / 2;
  g.add(t);
  for (const x of [-lungo / 2, lungo / 2]) {
    const anelli = mesh(geo.cil(r * 0.92, r * 0.92, 0.015, 9), mat('#e2bd85'), x, 0, 0);
    anelli.rotation.z = Math.PI / 2;
    g.add(anelli);
  }
  return contorno(g);
}

/** La catasta che resta: ciocchi uno sull'altro. */
export function creaCatasta(n: number, r = 0.13): THREE.Group {
  const g = new THREE.Group();
  const file = [3, 2, 1];
  let k = 0;
  for (let f = 0; f < file.length && k < n; f++) {
    for (let i = 0; i < file[f] && k < n; i++, k++) {
      const c = creaCiocco(0.72 + ((k * 7) % 3) * 0.06, r);
      c.position.set(0, r + f * r * 1.75, (i - (file[f] - 1) / 2) * r * 2.05);
      c.rotation.y = ((k * 13) % 5 - 2) * 0.04;
      c.userData.k = k;
      g.add(c);
    }
  }
  return g;
}

interface Pezzetto { o: THREE.Object3D; vel: THREE.Vector3; vita: number; giro: THREE.Vector3 }

/**
 * Un taglio in corso. La scena gli passa il tempo con `passo(dt)` e lo toglie quando `finito`.
 * `onCade` viene chiamato una volta, quando l'albero comincia a cadere (lì si paga e si toglie dal bosco).
 */
export class Taglio {
  readonly accetta = creaAccetta();
  readonly legna: THREE.Group;
  readonly pezzetti: Pezzetto[] = [];
  colpi = 0;
  readonly servono: number;
  private t = -1; // tempo dentro il colpo in corso (-1: ferma)
  private inCoda = 0;
  private tremo = 0;
  private cade = -1;
  private terra = -1;
  private catasta = -1;
  private tacca: THREE.Mesh | null = null;
  private contatore: THREE.Sprite | null = null;
  private asse = new THREE.Vector3();
  private verso = new THREE.Vector3();
  private base: THREE.Euler;
  private posAccetta = new THREE.Vector3();
  private lato = new THREE.Vector3();
  private quota = 0.5;
  private grandezza = 1;
  private ultimoColpo = performance.now(); // senza colpi per qualche secondo, l'accetta si mette via
  finito = false;

  constructor(
    readonly scena: THREE.Scene,
    readonly bersaglio: THREE.Object3D,
    readonly cosa: CosaTagliata,
    readonly raggioTronco: number,
    daDove: THREE.Vector3, // la telecamera: l'accetta sta dalla sua parte, l'albero cade dall'altra
    readonly onCade: () => void,
  ) {
    this.servono = COLPI[cosa];
    // un albero lasciato a metà ricorda i colpi già dati e la sua tacca
    this.colpi = Math.min(this.servono - 1, (bersaglio.userData.colpiDati as number) ?? 0);
    this.tacca = (bersaglio.userData.tacca as THREE.Mesh | undefined) ?? null;
    this.base = (bersaglio.userData.rotazione0 as THREE.Euler | undefined)?.clone() ?? bersaglio.rotation.clone();
    bersaglio.userData.rotazione0 ??= this.base.clone();
    const p = bersaglio.position;
    // cade di lato rispetto a chi guarda (così si vede tutta la caduta), dalla parte del bosco
    const guarda = new THREE.Vector3(p.x - daDove.x, 0, p.z - daDove.z).normalize();
    this.verso.set(-guarda.z, 0, guarda.x);
    if (this.verso.x * p.x + this.verso.z * p.z < 0) this.verso.negate();
    this.asse.set(this.verso.z, 0, -this.verso.x); // perpendicolare, per terra
    // l'accetta: la mano è di lato al tronco, il manico orizzontale; colpisce di taglio, la lama dentro il tronco
    // la mano sta dalla parte di chi guarda: il manico va verso il tronco, la lama colpisce di lato
    this.lato.copy(guarda).negate();
    // (i pini hanno i rami fino in basso: lì si colpisce appena sopra le radici)
    const pino = !!bersaglio.userData.pino;
    this.quota = cosa === 'albero' ? (pino ? 0.22 : 0.45) * Math.min(1.3, bersaglio.scale.y || 1) : 0.22;
    // un'accetta grande, da cartone animato: la mano resta fuori dalla chioma e si vede bene
    this.grandezza = cosa === 'albero' ? 1.7 : 1.1;
    const testa = p.clone().addScaledVector(this.verso, -(raggioTronco + 0.17 * this.grandezza)).setY(this.quota);
    this.posAccetta.copy(testa).addScaledVector(this.lato, 0.86 * this.grandezza);
    this.accetta.scale.setScalar(this.grandezza);
    this.posa(0);
    scena.add(this.accetta);
    this.legna = creaCatasta(cosa === 'albero' ? 5 : cosa === 'cespuglio' ? 0 : 0, Math.max(0.1, Math.min(0.17, raggioTronco * 0.7)));
    this.legna.visible = false;
  }

  /** Un tocco di Giada: un colpo (se l'accetta sta già colpendo, il colpo parte subito dopo). */
  colpo(): void {
    if (this.cade >= 0 || this.finito) return;
    this.ultimoColpo = performance.now();
    if (this.t >= 0) { this.inCoda = Math.min(1, this.inCoda + 1); return; }
    this.t = 0;
  }

  /** Posa dell'accetta durante il colpo: u da 0 (pronta) a 1 (finito il colpo). */
  private posa(u: number) {
    // b: quanto è girata indietro intorno alla mano (0 = lama dentro il tronco)
    let b: number;
    const pronta = 0.45, indietro = 1.75, colpita = -0.04;
    const ui = IMPATTO / DUR_COLPO;
    if (u < 0.4) b = THREE.MathUtils.lerp(pronta, indietro, easeOut(u / 0.4));
    else if (u < ui) b = THREE.MathUtils.lerp(indietro, colpita, easeIn((u - 0.4) / (ui - 0.4)));
    else b = THREE.MathUtils.lerp(colpita, pronta, easeInOut((u - ui) / (1 - ui)));
    // il manico va dalla mano verso la testa, la lama è perpendicolare e guarda dove va il colpo
    const cb = Math.cos(b), sb = Math.sin(b);
    const manico = new THREE.Vector3().addScaledVector(this.lato, -cb).addScaledVector(this.verso, -sb);
    // tirando indietro la testa si alza un po' (come un vero colpo)
    manico.y = Math.max(0, b) * 0.45;
    manico.normalize();
    const lama = new THREE.Vector3().addScaledVector(this.verso, cb).addScaledVector(this.lato, -sb).normalize();
    const z = new THREE.Vector3().crossVectors(lama, manico).normalize();
    lama.crossVectors(manico, z);
    this.accetta.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(lama, manico, z));
    this.accetta.position.copy(this.posAccetta);
  }

  private impatto() {
    this.colpi++;
    this.tremo = 1;
    const p = this.bersaglio.position;
    const quota = this.quota;
    // la tacca nel tronco: una fetta chiara che si allarga a ogni colpo
    if (this.cosa === 'albero') {
      if (!this.tacca) {
        this.tacca = mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, -0.7, 1.4), mat('#f3d9a6', { rim: 0 }));
        this.tacca.rotation.y = Math.atan2(-this.verso.x, -this.verso.z) - this.bersaglio.rotation.y;
        this.bersaglio.add(this.tacca);
      }
      const s = this.bersaglio.scale.x || 1;
      const r = (this.raggioTronco / s) * 1.02;
      this.tacca.scale.set(r, (0.06 + 0.035 * this.colpi) / s, r);
      this.tacca.position.y = quota / s;
    }
    // trucioli e schegge
    const colori = this.cosa === 'sasso' ? ['#b4aea4', '#d6d0c6', '#8c867c'] : this.cosa === 'cespuglio' ? ['#5aa04a', '#7ccf6a', '#3d7a34'] : ['#e8c48c', '#c8955a', '#f3dcae', '#8a5a36'];
    const dove = p.clone().addScaledVector(this.verso, -this.raggioTronco).setY(this.quota);
    for (let i = 0; i < 9; i++) {
      const c = mesh(geo.scatola(0.06 + Math.random() * 0.05, 0.025, 0.04 + Math.random() * 0.04), mat(colori[i % colori.length], { rim: 0 }));
      c.position.copy(dove);
      const lato = (Math.random() - 0.5) * 3;
      const vel = new THREE.Vector3(-this.verso.x * (1 + Math.random() * 1.5) + this.asse.x * lato, 1.8 + Math.random() * 2, -this.verso.z * (1 + Math.random() * 1.5) + this.asse.z * lato);
      this.scena.add(c);
      this.pezzetti.push({ o: c, vel, vita: 0.9 + Math.random() * 0.5, giro: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9) });
    }
    // quanti colpi mancano: tanti pallini, quelli dati sono pieni
    if (this.contatore) { this.scena.remove(this.contatore); this.contatore.material.map?.dispose(); }
    this.contatore = spritePallini(this.colpi, this.servono);
    // per terra davanti al tronco, dalla parte di chi guarda: si vede sempre, anche sotto le chiome alte
    this.contatore.position.copy(p).addScaledVector(this.lato, this.raggioTronco + 1.1).setY(0.25);
    this.scena.add(this.contatore);
    if (this.colpi >= this.servono) this.inizioCaduta();
  }

  private inizioCaduta() {
    this.cade = 0;
    this.inCoda = 0;
    // l'albero esce dal bosco (così quando il bosco si rifà non ricompare) e resta nella scena finché cade
    this.scena.attach(this.bersaglio);
    this.base = this.bersaglio.rotation.clone();
    this.onCade();
  }

  /**
   * Basta colpi (Giada ha smesso, o ha chiuso l'arredo): l'accetta e i pallini vanno via, l'albero torna dritto.
   * I colpi dati e la tacca restano: toccandolo di nuovo si riprende da lì.
   */
  metteVia() {
    if (this.cade >= 0 || this.finito) return;
    this.bersaglio.userData.colpiDati = this.colpi;
    this.bersaglio.userData.tacca = this.tacca;
    this.bersaglio.rotation.copy(this.base);
    this.scena.remove(this.accetta);
    if (this.contatore) { this.scena.remove(this.contatore); this.contatore.material.map?.dispose(); this.contatore = null; }
    for (const q of this.pezzetti) this.scena.remove(q.o);
    this.pezzetti.length = 0;
    this.finito = true;
  }

  /** Avanza di dt secondi. */
  passo(dt: number) {
    // nessun colpo da qualche secondo: l'accetta non resta sospesa in aria
    if (this.cade < 0 && this.t < 0 && performance.now() - this.ultimoColpo > 4000) return this.metteVia();
    // l'accetta
    if (this.t >= 0) {
      const prima = this.t;
      this.t += dt;
      if (prima < IMPATTO && this.t >= IMPATTO) this.impatto();
      if (this.t >= DUR_COLPO) {
        this.t = -1;
        this.posa(0);
        if (this.inCoda > 0 && this.cade < 0) { this.inCoda--; this.t = 0; }
      } else this.posa(this.t / DUR_COLPO);
    }
    // il tremito a ogni colpo
    if (this.cade < 0 && this.tremo > 0) {
      this.tremo = Math.max(0, this.tremo - dt * 3);
      const w = Math.sin(this.tremo * 40) * this.tremo * (this.cosa === 'albero' ? 0.05 : 0.12);
      this.bersaglio.rotation.set(this.base.x, this.base.y, this.base.z);
      this.bersaglio.rotateOnWorldAxis(this.asse, w);
    }
    // i trucioli
    for (let i = this.pezzetti.length - 1; i >= 0; i--) {
      const q = this.pezzetti[i];
      q.vita -= dt;
      q.vel.y -= 9 * dt;
      q.o.position.addScaledVector(q.vel, dt);
      if (q.o.position.y < 0.02) { q.o.position.y = 0.02; q.vel.set(q.vel.x * 0.3, 0, q.vel.z * 0.3); }
      else { q.o.rotation.x += q.giro.x * dt; q.o.rotation.y += q.giro.y * dt; }
      if (q.vita <= 0) { this.scena.remove(q.o); this.pezzetti.splice(i, 1); }
    }
    if (this.cade < 0) return;
    this.cade += dt;
    // via l'accetta e il contatore
    if (this.accetta.parent && this.cade > 0.25) this.scena.remove(this.accetta);
    if (this.contatore && this.cade > 0.6) { this.scena.remove(this.contatore); this.contatore = null; }
    if (this.cosa !== 'albero') return this.passoPiccolo();
    // cade: lento all'inizio, poi sempre più veloce (come un albero vero), un rimbalzo per terra
    const u = Math.min(1, this.cade / CADUTA);
    let ang = (Math.PI / 2 - 0.08) * u * u * u;
    if (this.cade > CADUTA) {
      const b = this.cade - CADUTA;
      ang = Math.PI / 2 - 0.08 - Math.abs(Math.sin(b * 9)) * 0.12 * Math.exp(-b * 5);
      if (this.terra < 0) { this.terra = 0; this.polvere(); }
    }
    this.bersaglio.rotation.set(this.base.x, this.base.y, this.base.z);
    this.bersaglio.rotateOnWorldAxis(this.asse, ang);
    if (this.terra >= 0) {
      this.terra += dt;
      // dopo un attimo l'albero sparisce nel prato e resta la legna
      if (this.terra > 0.7) {
        const k = Math.max(0, 1 - (this.terra - 0.7) / 0.5);
        this.bersaglio.scale.setScalar(this.bersaglio.userData.scala0 ?? (this.bersaglio.userData.scala0 = this.bersaglio.scale.x));
        this.bersaglio.scale.multiplyScalar(Math.max(0.001, k));
        if (k <= 0 && this.bersaglio.parent) {
          this.scena.remove(this.bersaglio);
          this.legnaAppare();
        }
      }
    }
    if (this.catasta >= 0) this.passoCatasta(dt);
  }

  /** Cespugli e sassi: un piccolo salto, si rimpiccioliscono, schegge. */
  private passoPiccolo() {
    const k = Math.max(0, 1 - this.cade / 0.35);
    const s0 = this.bersaglio.userData.scala0 ?? (this.bersaglio.userData.scala0 = this.bersaglio.scale.clone());
    this.bersaglio.scale.copy(s0).multiplyScalar(Math.max(0.001, k * (1 + Math.sin(this.cade * 20) * 0.1)));
    if (k <= 0 && this.bersaglio.parent) this.scena.remove(this.bersaglio);
    if (this.cade > 1.6 && !this.pezzetti.length) this.finito = true;
  }

  private polvere() {
    const p = this.bersaglio.position;
    const h = 2.2 * (this.bersaglio.scale.x || 1);
    for (let i = 0; i < 14; i++) {
      const d = 0.4 + (i / 14) * h;
      const sbuffo = mesh(geo.palla(0.12 + Math.random() * 0.1, 6), mat('#e8dcc4', { rim: 0, transparent: true, opacity: 0.8 }));
      sbuffo.position.copy(p).addScaledVector(this.verso, d).setY(0.15);
      this.scena.add(sbuffo);
      this.pezzetti.push({ o: sbuffo, vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.9 + Math.random(), (Math.random() - 0.5) * 1.5), vita: 0.6 + Math.random() * 0.4, giro: new THREE.Vector3() });
    }
  }

  private legnaAppare() {
    // la catasta dove c'era il tronco disteso, un po' verso la radura così si vede
    const p = this.bersaglio.position;
    this.legna.position.copy(p).addScaledVector(this.verso, 0.9).setY(0);
    this.legna.rotation.y = Math.atan2(this.verso.x, this.verso.z) + Math.PI / 2;
    this.legna.visible = true;
    this.legna.children.forEach((c) => { c.userData.y = c.position.y; c.position.y += 1.2 + c.userData.k * 0.25; });
    this.scena.add(this.legna);
    this.catasta = 0;
  }

  private passoCatasta(dt: number) {
    this.catasta += dt;
    // i ciocchi cadono uno sull'altro
    for (const c of this.legna.children) {
      const y0 = c.userData.y as number;
      if (c.position.y > y0) c.position.y = Math.max(y0, c.position.y - dt * 4.5);
    }
    // "+legna" che sale
    if (this.catasta - dt < 0.5 && this.catasta >= 0.5) {
      const s = spriteScritta('+ legna');
      s.position.copy(this.legna.position).setY(1.3);
      this.scena.add(s);
      this.pezzetti.push({ o: s, vel: new THREE.Vector3(0, 0.6, 0), vita: 1.6, giro: new THREE.Vector3() });
    }
    // dopo qualche secondo la legna se ne va (un ciocco alla volta)
    const via = this.catasta - 4.5;
    if (via > 0) {
      this.legna.children.forEach((c, i) => {
        const k = THREE.MathUtils.clamp(1 - (via - i * 0.15) / 0.35, 0, 1);
        c.scale.setScalar(Math.max(0.001, k));
      });
      if (via > 0.15 * this.legna.children.length + 0.4) {
        this.scena.remove(this.legna);
        this.legna.visible = false;
        if (!this.pezzetti.length) this.finito = true;
      }
    }
  }

  /** Se la scena si chiude a metà. */
  smonta() {
    if (this.cade < 0) { this.metteVia(); return; }
    this.scena.remove(this.accetta);
    this.scena.remove(this.legna);
    if (this.contatore) this.scena.remove(this.contatore);
    for (const q of this.pezzetti) this.scena.remove(q.o);
    if (this.cade >= 0 && this.bersaglio.parent === this.scena) this.scena.remove(this.bersaglio);
  }
}

/** I colpi dati e quelli che mancano: tanti pallini in fila, pieni quelli dati (disegnati interi, non tagliati). */
function spritePallini(dati: number, tutti: number): THREE.Sprite {
  const lato = 64, cv = document.createElement('canvas');
  cv.width = lato * tutti; cv.height = lato;
  const c = cv.getContext('2d')!;
  for (let i = 0; i < tutti; i++) {
    const x = lato * i + lato / 2, y = lato / 2;
    c.beginPath(); c.arc(x, y, lato * 0.36, 0, Math.PI * 2);
    c.fillStyle = i < dati ? '#ffd166' : 'rgba(255,255,255,0.55)';
    c.fill();
    c.lineWidth = lato * 0.09; c.strokeStyle = '#5a3a1a'; c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.renderOrder = 10;
  sp.scale.set(0.34 * tutti, 0.34, 1);
  return sp;
}

/** Una scritta su una riga, larga quanto serve (non tagliata). */
function spriteScritta(testo: string): THREE.Sprite {
  const alto = 64, cv = document.createElement('canvas');
  const c0 = cv.getContext('2d')!;
  const font = `900 ${alto * 0.7}px 'Nunito Variable', sans-serif`;
  c0.font = font;
  cv.width = Math.ceil(c0.measureText(testo).width + alto * 0.6); cv.height = alto;
  const c = cv.getContext('2d')!;
  c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = alto * 0.14; c.strokeStyle = '#5a3a1a'; c.strokeText(testo, cv.width / 2, alto / 2);
  c.fillStyle = '#fff4d6'; c.fillText(testo, cv.width / 2, alto / 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.5 * (cv.width / alto), 0.5, 1);
  return sp;
}

const easeIn = (x: number) => x * x * x;
const easeOut = (x: number) => 1 - Math.pow(1 - x, 2);
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
