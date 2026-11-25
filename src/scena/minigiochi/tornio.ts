// Il tornio (vasaio): una palla d'argilla gira sul tornio. Giada ci tiene sopra il dito: dove lo mette,
// il bordo dell'argilla va verso il dito (fuori allarga, dentro stringe); sopra la bocca la tira su,
// più in basso la schiaccia. Sul biglietto c'è la forma da copiare. Alla fine sceglie lo smalto,
// e il vaso va sulla mensola a casa del vasaio.
import * as THREE from 'three';
import { ARGILLA_INIZIO, FORME_VASO, modellaVaso, PUNTI_VASO, SMALTI, somiglianzaVaso } from '../../lib/minigiochi';
import { mat, mesh } from '../modelli';
import { contorno, ombra, texture } from '../ps1';
import { Palco, type Bottone } from './palco';

const S = 0.42; // raggio: da numeri del profilo a metri
const H = 0.5; // altezza: idem
const PIATTO = 0.56; // altezza del piatto del tornio

/** La forma del vaso (fuori e dentro), da girare intorno all'asse. */
export function geometriaVaso(profilo: number[], alto: number, s = S, h = H): THREE.LatheGeometry {
  const fuori: THREE.Vector2[] = [new THREE.Vector2(0.001, 0)];
  profilo.forEach((r, i) => fuori.push(new THREE.Vector2(r * s, (i / (profilo.length - 1)) * alto * h)));
  const bocca = fuori[fuori.length - 1];
  const sp = 0.035 * (s / S);
  const dentro: THREE.Vector2[] = [new THREE.Vector2(Math.max(0.01, bocca.x - sp), bocca.y)];
  for (let i = profilo.length - 2; i >= 1; i--) dentro.push(new THREE.Vector2(Math.max(0.01, profilo[i] * s - sp), (i / (profilo.length - 1)) * alto * h));
  dentro.push(new THREE.Vector2(0.001, sp));
  return new THREE.LatheGeometry([...fuori, ...dentro], 28);
}

export class Tornio extends Palco {
  private profilo = [...ARGILLA_INIZIO.profilo];
  private alto = ARGILLA_INIZIO.alto;
  private forma = FORME_VASO[Math.floor(Math.random() * FORME_VASO.length)];
  private vaso!: THREE.Mesh;
  private piatto!: THREE.Group;
  private argilla: THREE.MeshToonMaterial;
  private smalto: string | null = null;
  private dito: THREE.Vector2 | null = null;
  private cambiato = false;
  private tocchi = 0;

  constructor(canvas: HTMLCanvasElement, dati: ConstructorParameters<typeof Palco>[1], livello: number) {
    super(canvas, dati, livello);
    this.prato('#9cc47a', '#f2e4d0');
    // il tornio: il mobiletto di legno e il piatto che gira
    const t = new THREE.Group();
    t.add(ombra(0.7));
    t.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, PIATTO - 0.06, 14), mat('#9a6c44'), 0, (PIATTO - 0.06) / 2, 0));
    this.scene.add(contorno(t));
    this.piatto = new THREE.Group();
    this.piatto.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 20), mat('#8a7a6a'), 0, -0.03, 0));
    this.piatto.position.y = PIATTO;
    this.scene.add(contorno(this.piatto));
    // l'argilla bagnata: righe che girano, così si vede che il tornio va
    this.argilla = mat('#ffffff', { rim: 0.35, map: texture(64, (c, l) => {
      c.fillStyle = '#c8865a'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#b07048';
      for (let x = 0; x < l; x += 9) c.fillRect(x, 0, 3, l);
    }) });
    this.vaso = mesh(geometriaVaso(this.profilo, this.alto), this.argilla, 0, PIATTO, 0);
    this.scene.add(this.vaso);
    // i vasi già fatti, accanto
    for (const [x, c] of [[0.85, '#3f7ab8'], [1.1, '#e8c040']] as const) {
      const v = mesh(geometriaVaso([0.3, 0.42, 0.48, 0.44, 0.34, 0.26, 0.24, 0.28], 0.9, 0.3, 0.42), mat(c, { rim: 0.4 }), x, 0, -0.3);
      this.scene.add(v);
    }
    this.animale(0, -0.68, 0);
    this.avvia();
    this.info();
  }

  protected inquadra(a: number) {
    const k = a < 0.8 ? 1.6 : 1.2;
    this.camera.position.set(0.25 * k, PIATTO + 0.95 * k, 1.9 * k);
    this.camera.lookAt(0, PIATTO + 0.05, 0.15);
  }

  private info(testo = `Fai ${this.forma.nome}, come sul biglietto!`) {
    const bottoni: Bottone[] = [];
    if (this.tocchi > 20) {
      const quanti = Math.min(SMALTI.length, 3 + this.livello);
      for (const c of SMALTI.slice(0, quanti)) bottoni.push({ id: c, testo: '●', colore: c, scelto: c === this.smalto });
      bottoni.push({ id: 'fatto', testo: '✓ Fatto!', colore: '#4f9a5a' });
    }
    this.onInfo({ testo, conta: 'Il tornio gira…', bottoni, vaso: { nome: this.forma.nome, profilo: this.forma.profilo, alto: this.forma.alto } });
  }

  bottone(id: string) {
    if (!this.giocando) return;
    if (id === 'fatto') {
      const punti = somiglianzaVaso(this.profilo, this.alto, this.forma);
      const colore = this.smalto ?? '#c8603a';
      this.vaso.material = mat(colore, { rim: 0.45 });
      this.finisci({
        punti, righe: [`Somiglia a ${this.forma.nome} al ${Math.round(punti * 100)}%`],
        ricordo: { vaso: { data: '', profilo: this.profilo.map((r) => Math.round(r * 100) / 100), alto: Math.round(this.alto * 100) / 100, colore } },
      });
      return;
    }
    this.smalto = id;
    this.vaso.material = mat(id, { rim: 0.45 });
    this.info('Che bel colore! Tocca «Fatto!» quando ti piace.');
  }

  protected giu(p: THREE.Vector2) { this.dito = p.clone(); }
  protected muovi(p: THREE.Vector2) { if (this.dito) this.dito.copy(p); }
  protected su() { this.dito = null; }

  /** Il dito sull'argilla: dove si trova, sul piano verticale che passa per l'asse del tornio. */
  private premi(dt: number) {
    if (!this.dito) return;
    this.ray.setFromCamera(this.dito, this.camera);
    const avanti = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
    const piano = new THREE.Plane(avanti.clone().negate(), 0);
    const q = this.ray.ray.intersectPlane(piano, new THREE.Vector3());
    if (!q) return;
    const destra = new THREE.Vector3(-avanti.z, 0, avanti.x);
    const r = Math.abs(q.dot(destra)) / S; // quanto è lontano il dito dall'asse
    const y = (q.y - PIATTO) / (H * this.alto); // 0 fondo … 1 bocca
    const k = Math.min(1, dt * 6);
    if (y > 0.9) {
      // in cima: l'argilla segue il dito in su (allunga) o in giù (schiaccia)
      const voluto = THREE.MathUtils.clamp((q.y - PIATTO) / H, 0.35, 1.5);
      this.alto += (voluto - this.alto) * k * 0.8;
    }
    if (y > -0.1 && y < 1.1) {
      const i = THREE.MathUtils.clamp(y, 0, 1);
      const j = Math.round(i * (PUNTI_VASO - 1));
      const dr = (THREE.MathUtils.clamp(r, 0.12, 0.7) - this.profilo[j]) * k * 0.9;
      modellaVaso(this.profilo, i, dr);
    }
    this.cambiato = true;
    this.tocchi++;
    if (this.tocchi === 21) this.info('Bravissima! Quando ti piace, scegli il colore dello smalto.');
  }

  protected aggiorna(dt: number, t: number) {
    this.premi(dt);
    if (this.cambiato) {
      this.cambiato = false;
      this.vaso.geometry.dispose();
      this.vaso.geometry = geometriaVaso(this.profilo, this.alto);
    }
    // il tornio gira (più piano a vaso finito)
    const giri = this.finito ? 1.5 : 7;
    this.vaso.rotation.y += dt * giri;
    this.piatto.rotation.y += dt * giri;
    // le mani del vasaio sull'argilla
    const [d0, d1] = this.m.zampe;
    const lavora = this.dito ? 1 : 0.4;
    d0.rotation.x = -1.15 + Math.sin(t * 6) * 0.06 * lavora;
    d1.rotation.x = -1.15 - Math.sin(t * 6) * 0.06 * lavora;
    this.m.testa.rotation.x = 0.45;
    this.m.corpo.rotation.x = 0.12;
  }
}
