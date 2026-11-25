// Spacca la legna (taglialegna): un ciocco sul ceppo, una crepa scura sopra e una lucina che va avanti
// e indietro. Giada tocca quando la luce è sopra la crepa: l'animale cala l'accetta e il ciocco si apre
// in tanti pezzi quanto è stato preciso il colpo. I pezzi vanno a fare la catasta lì accanto.
import * as THREE from 'three';
import { colpoLegna } from '../../lib/minigiochi';
import { mat, mesh } from '../modelli';
import { contorno, ombra } from '../ps1';
import { Palco } from './palco';

const CIOCCHI = 6;
const ALTO_CEPPO = 0.42;
const R = 0.2; // raggio del ciocco

export class Legna extends Palco {
  private ciocco: THREE.Group | null = null;
  private crepa!: THREE.Mesh;
  private luce!: THREE.Mesh;
  private crepaX = 0;
  private fase = 0; // dove sta la luce (angolo)
  private velocita = 2.2;
  private n = 0; // ciocchi spaccati
  private voti: number[] = [];
  private pezzi = 0;
  private colpo = 0; // > 0: l'accetta sta scendendo
  private attesa = 0; // pausa prima del prossimo ciocco
  private catasta = new THREE.Group();
  private legno = mat('#a06a40');
  private dentro = mat('#e8c890');

  constructor(canvas: HTMLCanvasElement, dati: ConstructorParameters<typeof Palco>[1], livello: number) {
    super(canvas, dati, livello);
    this.prato('#8cc068', '#bfe2f2');
    // il ceppo grande, con gli anelli sopra
    const ceppo = new THREE.Group();
    ceppo.add(ombra(0.6));
    ceppo.add(mesh(new THREE.CylinderGeometry(0.34, 0.38, ALTO_CEPPO, 14), mat('#8a5a36')));
    ceppo.children[1].position.y = ALTO_CEPPO / 2;
    const anelli = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.02, 14), mat('#e8c890'), 0, ALTO_CEPPO + 0.005, 0);
    ceppo.add(anelli);
    this.scene.add(contorno(ceppo));
    this.catasta.position.set(1.05, 0, -0.2);
    this.scene.add(this.catasta);
    this.animale(0, -0.62, 0);
    this.nuovoCiocco();
    this.onInfo({ testo: 'Tocca quando la luce è sopra la crepa!', conta: `Ciocco 1 di ${CIOCCHI}` });
    this.avvia();
  }

  protected inquadra(a: number) {
    const k = a < 0.8 ? 1.45 : 1;
    this.camera.position.set(2.1 * k, 2.0 * k, 2.3 * k);
    this.camera.lookAt(0.25, 0.75, -0.2);
  }

  private nuovoCiocco() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(R, R * 1.05, 0.34, 12), this.legno));
    const sopra = mesh(new THREE.CylinderGeometry(R * 0.95, R * 0.95, 0.01, 12), this.dentro, 0, 0.172, 0);
    g.add(sopra);
    contorno(g);
    // la crepa: una riga scura sopra il ciocco, ogni volta in un posto diverso
    this.crepaX = (Math.random() - 0.5) * R * 1.1;
    this.crepa = mesh(new THREE.BoxGeometry(0.025, 0.012, R * 1.7), new THREE.MeshBasicMaterial({ color: '#3b2616' }), this.crepaX, 0.18, 0);
    g.add(this.crepa);
    // la luce che va avanti e indietro
    this.luce = mesh(new THREE.BoxGeometry(0.035, 0.016, R * 1.9), new THREE.MeshBasicMaterial({ color: '#fff36a' }), 0, 0.19, 0);
    g.add(this.luce);
    g.position.set(0, ALTO_CEPPO + 0.17 + 1.2, 0);
    g.userData.cade = 1.2;
    this.scene.add(g);
    this.ciocco = g;
    this.velocita = 2.2 + this.n * 0.35 + (this.livello - 1) * 0.15;
  }

  protected giu() {
    if (this.colpo > 0 || this.attesa > 0 || !this.ciocco || this.ciocco.userData.cade > 0) return;
    this.colpo = 0.22;
  }

  private spacca() {
    if (!this.ciocco) return;
    const d = (this.luce.position.x - this.crepaX) / (R * 2);
    const { pezzi, voto } = colpoLegna(d);
    this.voti.push(voto);
    this.pezzi += pezzi;
    this.n++;
    if (navigator.vibrate) navigator.vibrate(pezzi >= 3 ? [30, 30, 60] : 40);
    const dove = this.ciocco.position.clone();
    this.scene.remove(this.ciocco);
    this.ciocco = null;
    // i pezzi volano via e poi finiscono nella catasta
    for (let i = 0; i < pezzi; i++) {
      const a = (i / pezzi) * Math.PI * 2 + 0.4;
      const p = mesh(new THREE.BoxGeometry(0.11, 0.32, 0.16 / Math.max(1, pezzi / 2)), this.dentro);
      p.position.copy(dove).add(new THREE.Vector3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08));
      this.vola(p, new THREE.Vector3(Math.cos(a) * 1.6, 2.2, Math.sin(a) * 1.4), 0.9, 5);
    }
    for (let i = 0; i < pezzi; i++) this.aggiungiAllaCatasta();
    const parole = ['', 'Uhm, un pezzo solo…', 'Due pezzi!', 'Tre pezzi, bene!', 'Perfetto! Quattro pezzi!'];
    this.sbuffo(pezzi >= 4 ? '★' : `+${pezzi}`, dove.clone().add(new THREE.Vector3(0, 0.5, 0)), pezzi >= 3 ? '#ffd166' : '#ffffff', 0.35);
    this.faccia(pezzi >= 3 ? 'gioia' : 'impegno');
    if (this.n >= CIOCCHI) {
      const punti = this.voti.reduce((a, b) => a + b, 0) / this.voti.length;
      this.onInfo({ testo: parole[pezzi], conta: `${this.pezzi} pezzi di legna` });
      this.finisci({ punti, righe: [`${this.pezzi} pezzi di legna per l'inverno`], ricordo: { legna: this.pezzi } });
    } else {
      this.onInfo({ testo: parole[pezzi], conta: `Ciocco ${this.n + 1} di ${CIOCCHI}` });
      this.attesa = 0.7;
    }
  }

  private aggiungiAllaCatasta() {
    const k = this.catasta.children.length;
    const fila = Math.floor(k / 5), posto = k % 5;
    const p = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), (k % 3 ? this.legno : this.dentro));
    p.rotation.x = Math.PI / 2;
    p.position.set((posto - 2) * 0.13 + (fila % 2) * 0.06, 0.06 + fila * 0.11, 0);
    this.catasta.add(p);
  }

  protected aggiorna(dt: number, t: number) {
    const m = this.m;
    const [d0, d1] = m.zampe;
    // il ciocco che cade sul ceppo
    if (this.ciocco && this.ciocco.userData.cade > 0) {
      this.ciocco.userData.cade = Math.max(0, this.ciocco.userData.cade - dt * 4);
      this.ciocco.position.y = ALTO_CEPPO + 0.17 + this.ciocco.userData.cade * this.ciocco.userData.cade;
    }
    // la luce va avanti e indietro sopra il ciocco
    if (this.ciocco && this.giocando && this.colpo <= 0) {
      this.fase += dt * this.velocita;
      this.luce.position.x = Math.sin(this.fase) * R * 0.85;
      const vicino = Math.abs(this.luce.position.x - this.crepaX) < R * 0.12;
      (this.luce.material as THREE.MeshBasicMaterial).color.set(vicino ? '#ffffff' : '#fff36a');
    }
    // l'accetta: su in alto ad aspettare, giù di colpo quando Giada tocca
    let braccia = -2.7 + Math.sin(t * 2) * 0.05;
    if (this.colpo > 0) {
      const prima = this.colpo;
      this.colpo -= dt;
      braccia = -2.7 + (1 - Math.max(0, this.colpo) / 0.22) * 2.2;
      if (prima > 0.06 && this.colpo <= 0.06) this.spacca();
    } else if (!this.giocando) braccia = -0.6 + Math.sin(t * 1.5) * 0.05;
    d0.rotation.x = THREE.MathUtils.lerp(d0.rotation.x, braccia, Math.min(1, dt * (this.colpo > 0 ? 30 : 8)));
    d1.rotation.x = d0.rotation.x * 0.85;
    m.testa.rotation.x = 0.35;
    if (this.attesa > 0) {
      this.attesa -= dt;
      if (this.attesa <= 0 && this.n < CIOCCHI) this.nuovoCiocco();
    }
  }
}
