// Unisci le stelle (astronomo): di notte, accanto al telescopio. Nel cielo ci sono tante stelline e alcune
// più grandi che brillano: Giada trascina il dito da una stella grande all'altra per disegnare la costellazione
// del biglietto. Le linee giuste restano d'oro; quelle sbagliate lampeggiano e spariscono.
// Alla fine le dà un nome, e la costellazione resta nel cielo del villaggio.
import * as THREE from 'three';
import { costellazioneDa, lineaGiusta, puntiStelle, type FormaStelle } from '../../lib/minigiochi';
import type { Animale } from '../../lib/tipi';
import { spriteTesto } from '../ps1';
import { Palco } from './palco';

const CIELO_Z = -7;
const LARGO = 5.2;
const ALTO = 4.6;
const CIELO_Y = 2.6; // dove comincia il riquadro del cielo

export class Stelle extends Palco {
  private forma: FormaStelle;
  private stelle: THREE.Sprite[] = [];
  private fatte = new Set<number>();
  private linee = new THREE.Group();
  private tirando: { da: number; linea: THREE.Line } | null = null;
  private sbagli = 0;
  private tempo = 0;
  private lampi: { l: THREE.Line; vita: number }[] = [];

  constructor(canvas: HTMLCanvasElement, dati: Animale, livello: number, gia: string[]) {
    super(canvas, dati, livello, true);
    this.forma = costellazioneDa(Date.now() % 1000, livello, gia);
    this.prato('#2e4a3a', '#0e1a44', 12);
    this.ambiente.intensity = 0.55;
    this.ambiente.color.set('#9ab0ff');
    this.sole.intensity = 0.5;
    this.sole.color.set('#c8d4ff');
    // tante stelline piccole sullo sfondo
    const pos: number[] = [];
    for (let i = 0; i < 260; i++) pos.push((Math.random() - 0.5) * 26, 1 + Math.random() * 12, CIELO_Z - 2 - Math.random() * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff8d8', size: 0.05, fog: false })));
    // la luna
    const luna = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: '#fff4cc', fog: false }));
    luna.position.set(-4.2, 6.5, CIELO_Z - 1);
    this.scene.add(luna);
    // le stelle della costellazione: più grandi, brillano
    this.forma.punti.forEach(([x, y], i) => {
      const s = spriteTesto('★', '#fff2a8', 64);
      s.material.fog = false;
      s.position.copy(this.dove(x, y));
      s.scale.setScalar(0.55);
      s.userData.i = i;
      this.scene.add(s);
      this.stelle.push(s);
    });
    this.scene.add(this.linee);
    // il telescopio e l'astronomo che guarda in su
    this.bancoDaLavoro(0, 0, Math.PI);
    this.animale(0, 0, Math.PI);
    this.avvia();
    this.info('Unisci le stelle grandi come sul biglietto!');
  }

  private dove(x: number, y: number) {
    return new THREE.Vector3((x - 0.5) * LARGO, CIELO_Y + (1 - y) * ALTO, CIELO_Z);
  }

  protected inquadra(a: number) {
    // il riquadro del cielo deve stare tutto nello schermo, anche col telefono in verticale
    const tv = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const serve = Math.max((LARGO / 2 + 0.5) / (tv * a), (ALTO / 2 + 1.4) / tv);
    const z = CIELO_Z + serve;
    this.camera.position.set(0, 1.8, z);
    this.camera.lookAt(0, CIELO_Y + ALTO * 0.45, CIELO_Z);
    // l'astronomo col telescopio, davanti a noi in basso, di spalle: guarda le stelle con Giada
    const x = -Math.min(1.6, tv * a * 6.5 * 0.55);
    this.postazione?.position.set(x, 0, z - 6.5);
    this.m?.gruppo.position.set(x, 0, z - 5.95);
  }

  private info(testo: string, urgente = false) {
    this.onInfo({ testo, urgente, conta: `${this.fatte.size} di ${this.forma.linee.length} linee`, stelle: this.forma });
  }

  /** La stella grande più vicina al dito (in pixel), se è abbastanza vicina. */
  private stellaVicina(p: THREE.Vector2): number {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    let best = -1, dmin = 34;
    this.stelle.forEach((s, i) => {
      const q = s.position.clone().project(this.camera);
      const d = Math.hypot((q.x - p.x) * w / 2, (q.y - p.y) * h / 2);
      if (d < dmin) { dmin = d; best = i; }
    });
    return best;
  }

  private nuovaLinea(colore: string, a: THREE.Vector3, b: THREE.Vector3) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: colore, fog: false, transparent: true }));
  }

  private sulCielo(p: THREE.Vector2) {
    this.ray.setFromCamera(p, this.camera);
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -CIELO_Z), new THREE.Vector3());
  }

  protected giu(p: THREE.Vector2) {
    const i = this.stellaVicina(p);
    if (i < 0) return;
    const l = this.nuovaLinea('#bfe0ff', this.stelle[i].position, this.stelle[i].position);
    this.scene.add(l);
    this.tirando = { da: i, linea: l };
  }

  protected muovi(p: THREE.Vector2) {
    const t = this.tirando;
    if (!t) return;
    const q = this.sulCielo(p);
    if (q) t.linea.geometry.setFromPoints([this.stelle[t.da].position, q]);
    const j = this.stellaVicina(p);
    if (j < 0 || j === t.da) return;
    const k = lineaGiusta(this.forma, t.da, j);
    if (k >= 0 && !this.fatte.has(k)) {
      this.fatte.add(k);
      this.linee.add(this.nuovaLinea('#ffd84a', this.stelle[t.da].position, this.stelle[j].position));
      this.sbuffo('✦', this.stelle[j].position.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ffe066', 0.5);
      if (navigator.vibrate) navigator.vibrate(15);
      if (this.fatte.size === this.forma.linee.length) return this.completa();
      this.info('Sì! Continua…');
    } else if (k < 0) {
      this.sbagli++;
      const l = this.nuovaLinea('#ff7b6b', this.stelle[t.da].position, this.stelle[j].position);
      this.scene.add(l);
      this.lampi.push({ l, vita: 0.6 });
      this.info('Quella no: guarda il biglietto!', true);
    }
    t.da = j; // si continua dalla nuova stella
  }

  protected su() {
    if (this.tirando) this.scene.remove(this.tirando.linea);
    this.tirando = null;
  }

  private completa() {
    this.su();
    const punti = puntiStelle(this.tempo, this.sbagli, this.forma.linee.length);
    for (const s of this.stelle) s.scale.setScalar(0.75);
    this.info(`Ecco ${this.forma.nome}!`);
    this.finisci({
      punti, righe: [`Disegnata in ${Math.round(this.tempo)} secondi${this.sbagli ? `, ${this.sbagli} ${this.sbagli === 1 ? 'linea sbagliata' : 'linee sbagliate'}` : ', senza sbagli'}`],
      ricordo: { stelle: { data: '', nome: this.forma.nome, forma: this.forma.id, punti: this.forma.punti, linee: this.forma.linee } },
    });
  }

  protected aggiorna(dt: number, t: number) {
    if (this.giocando) this.tempo += dt;
    this.stelle.forEach((s, i) => {
      const k = (this.finito ? 0.8 : 0.55) + Math.sin(t * 3 + i * 1.7) * 0.06;
      s.scale.setScalar(k);
    });
    for (let i = this.lampi.length - 1; i >= 0; i--) {
      const l = this.lampi[i];
      l.vita -= dt;
      (l.l.material as THREE.LineBasicMaterial).opacity = Math.max(0, l.vita / 0.6);
      if (l.vita <= 0) { this.scene.remove(l.l); this.lampi.splice(i, 1); }
    }
    // l'astronomo guarda nel telescopio, poi in su verso le stelle
    const [d0, d1] = this.m.zampe;
    d0.rotation.x = -2.1;
    d1.rotation.x = -1.6;
    this.m.testa.rotation.x = -0.35 + Math.sin(t * 0.6) * 0.1;
  }
}
