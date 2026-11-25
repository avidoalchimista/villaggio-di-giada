// Decora la torta (pasticcere): sul banco c'è una torta liscia, accanto il biglietto con il disegno da copiare.
// Giada sceglie panna o fragola (poi anche mirtilli e cioccolato, quando la pasticceria è più bella) e tocca
// la torta dove vanno. Toccando un pezzo già messo lo si toglie. Quando dice «Fatto!» si vede quanto somiglia.
import * as THREE from 'three';
import { DECORI_PER_LIVELLO, disegnoTorta, somiglianzaTorta, type Decoro, type PezzoTorta } from '../../lib/minigiochi';
import { mat, mesh } from '../modelli';
import { contorno, ombra } from '../ps1';
import { Palco, type Bottone } from './palco';

const ALTO_BANCO = 0.72;
const RT = 0.52; // raggio della torta
const HT = 0.3;
const SOPRA = ALTO_BANCO + 0.05 + HT;
const BASI = ['#fbe6ee', '#fff4dc', '#f6d8b8', '#e8f4ec'];
const NOMI: Record<Decoro, string> = { panna: '☁️ Panna', fragola: '🍓 Fragola', mirtillo: '🫐 Mirtillo', cioccolato: '🍫 Cioccolato' };

/** Un pezzo di decorazione in 3D. */
export function creaDecoro(t: Decoro): THREE.Group {
  const g = new THREE.Group();
  if (t === 'panna') {
    g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat('#ffffff', { rim: 0.3 }), 0, 0.04, 0));
    const p = mesh(new THREE.ConeGeometry(0.045, 0.08, 10), mat('#ffffff', { rim: 0.3 }), 0, 0.11, 0);
    g.add(p);
  } else if (t === 'fragola') {
    const f = mesh(new THREE.ConeGeometry(0.05, 0.1, 8), mat('#e8343a', { rim: 0.5 }), 0, 0.06, 0);
    f.rotation.x = Math.PI;
    g.add(f);
    g.add(mesh(new THREE.ConeGeometry(0.04, 0.03, 5), mat('#4f9a3a'), 0, 0.115, 0));
  } else if (t === 'mirtillo') {
    for (const [x, z] of [[0, 0], [0.04, 0.03], [-0.03, 0.04]]) g.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#3a4a9a', { rim: 0.5 }), x, 0.03, z));
  } else {
    const c = mesh(new THREE.BoxGeometry(0.09, 0.03, 0.06), mat('#6a3a20', { rim: 0.4 }), 0, 0.03, 0);
    c.rotation.y = 0.4;
    g.add(c);
  }
  return g;
}

export class Torta extends Palco {
  private modello: PezzoTorta[];
  private fatta: { p: PezzoTorta; o: THREE.Group }[] = [];
  private scelto: Decoro = 'panna';
  private tipi: Decoro[];
  private base: string;
  private cima!: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement, dati: ConstructorParameters<typeof Palco>[1], livello: number) {
    super(canvas, dati, livello);
    this.prato('#9ccc78', '#f6e2ec');
    this.modello = disegnoTorta(Date.now() % 100000, livello);
    this.tipi = DECORI_PER_LIVELLO[Math.max(0, Math.min(3, livello - 1))];
    this.base = BASI[Math.floor(Math.random() * BASI.length)];
    // il banco con la tovaglia a quadretti rosa
    const banco = new THREE.Group();
    banco.add(ombra(0.9));
    banco.add(mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), mat('#f6d8e0'), 0, ALTO_BANCO, 0));
    for (const x of [-0.72, 0.72]) for (const z of [-0.48, 0.48]) banco.add(mesh(new THREE.BoxGeometry(0.07, ALTO_BANCO, 0.07), mat('#9a6c44'), x, ALTO_BANCO / 2, z));
    this.scene.add(contorno(banco));
    // l'alzatina e la torta
    const torta = new THREE.Group();
    torta.add(mesh(new THREE.CylinderGeometry(RT + 0.08, RT + 0.06, 0.03, 24), mat('#ffffff', { rim: 0.4 }), 0, ALTO_BANCO + 0.03, 0));
    torta.add(mesh(new THREE.CylinderGeometry(RT, RT, HT, 28), mat(this.base, { rim: 0.3 }), 0, ALTO_BANCO + 0.05 + HT / 2, 0));
    // il bordino di panna in basso
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      torta.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), mat('#ffffff'), Math.cos(a) * RT, ALTO_BANCO + 0.07, Math.sin(a) * RT));
    }
    this.cima = mesh(new THREE.CircleGeometry(RT, 28), mat(this.base, { rim: 0 }), 0, SOPRA + 0.002, 0);
    this.cima.rotation.x = -Math.PI / 2;
    torta.add(this.cima);
    this.scene.add(contorno(torta));
    // il pasticcere accanto al banco, che guarda la torta
    this.animale(-0.6, -0.9, 0.35);
    this.avvia();
    this.info('Copia il disegno del biglietto: scegli e tocca la torta.');
  }

  protected inquadra(a: number) {
    const k = a < 0.8 ? 1.55 : 1;
    this.camera.position.set(0, SOPRA + 1.35 * k, 1.45 * k);
    // si guarda un po' davanti alla torta: così resta in alto, sopra al fumetto e ai bottoni
    if (a < 0.8) this.camera.lookAt(0, SOPRA - 0.45, 0.35);
    else this.camera.lookAt(0, SOPRA - 0.15, 0.05);
  }

  private info(testo: string) {
    const bottoni: Bottone[] = this.tipi.map((t) => ({ id: t, testo: NOMI[t], scelto: t === this.scelto }));
    bottoni.push({ id: 'fatto', testo: '✓ Fatto!', colore: '#4f9a5a' });
    this.onInfo({ testo, conta: `${this.fatta.length} pezzi messi`, bottoni, torta: this.modello });
  }

  bottone(id: string) {
    if (!this.giocando) return;
    if (id === 'fatto') {
      const pezzi = this.fatta.map((f) => f.p);
      const punti = somiglianzaTorta(this.modello, pezzi);
      this.finisci({
        punti, righe: [`Somiglia al biglietto al ${Math.round(punti * 100)}%`],
        ricordo: { torta: { data: '', base: this.base, pezzi } },
      });
      return;
    }
    this.scelto = id as Decoro;
    this.info(`${NOMI[this.scelto]}: tocca la torta dove va.`);
  }

  protected giu(p: THREE.Vector2) {
    // toccando un pezzo già messo, lo si toglie
    const colpito = this.colpisci(p, this.fatta.map((f) => f.o));
    if (colpito) {
      let o: THREE.Object3D | null = colpito.object;
      while (o && !this.fatta.some((f) => f.o === o)) o = o.parent;
      const i = this.fatta.findIndex((f) => f.o === o);
      if (i >= 0) {
        this.scene.remove(this.fatta[i].o);
        this.fatta.splice(i, 1);
        this.info('Tolto! Rimettilo dove vuoi.');
        return;
      }
    }
    const q = this.sulPiano(p, SOPRA);
    if (!q || Math.hypot(q.x, q.z) > RT * 0.95) return;
    const pezzo: PezzoTorta = { x: q.x / RT, y: q.z / RT, tipo: this.scelto };
    const o = creaDecoro(this.scelto);
    o.position.set(q.x, SOPRA, q.z);
    o.scale.setScalar(0.01);
    o.userData.cresce = 0;
    this.scene.add(contorno(o));
    this.fatta.push({ p: pezzo, o });
    this.faccia('gioia');
    this.info(this.fatta.length >= this.modello.length ? 'Se è uguale al biglietto, tocca «Fatto!»' : 'Bene! Continua…');
  }

  protected aggiorna(dt: number, t: number) {
    for (const f of this.fatta) {
      if (f.o.userData.cresce < 1) {
        f.o.userData.cresce = Math.min(1, f.o.userData.cresce + dt * 5);
        const k = f.o.userData.cresce;
        f.o.scale.setScalar(k + Math.sin(k * Math.PI) * 0.3);
      }
    }
    // il pasticcere guarda la torta e sbatte la frusta
    const [d0, d1] = this.m.zampe;
    d0.rotation.x = -1.1 + Math.sin(t * 4) * 0.2;
    d0.rotation.z = Math.cos(t * 4) * 0.25;
    d1.rotation.x = -0.7;
    this.m.testa.rotation.x = 0.4;
    void dt;
  }
}
