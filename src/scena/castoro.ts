// Il castoro nella scena: sta al limite del bosco, davanti all'albero che rosicchia. L'albero si inclina
// man mano (in una settimana) e sotto si ammucchiano i trucioli; dove è caduto un albero resta il ceppo
// con il tronco per terra. Di notte dorme acciambellato accanto al suo albero.
import * as THREE from 'three';
import { avanzamento, type Castoro } from '../lib/castoro';
import { geo, mat, mesh } from './modelli';
import { contorno, ombra } from './ps1';

export function creaCastoro(): THREE.Group {
  const g = new THREE.Group();
  const pelo = mat('#7a4e2e', { rim: 0.45 });
  const chiaro = mat('#a8774e', { rim: 0.4 });
  const corpo = new THREE.Group();
  corpo.name = 'corpo';
  g.add(corpo);
  const busto = mesh(geo.palla(0.3, 14), pelo, 0, 0.3, 0);
  busto.scale.set(0.95, 0.85, 1.25);
  corpo.add(busto);
  const pancia = mesh(geo.palla(0.22, 12), chiaro, 0, 0.26, 0.14);
  pancia.scale.set(0.9, 0.8, 1);
  corpo.add(pancia);
  // la coda piatta a paletta, con le squame
  const coda = new THREE.Group();
  coda.name = 'coda';
  const pala = mesh(geo.palla(0.2, 10), mat('#4a3a34', { rim: 0.3 }), 0, 0, -0.22);
  pala.scale.set(0.85, 0.18, 1.35);
  coda.add(pala);
  coda.position.set(0, 0.1, -0.3);
  coda.rotation.x = -0.15;
  corpo.add(coda);
  // la testa con i dentoni arancioni
  const testa = new THREE.Group();
  testa.name = 'testa';
  testa.position.set(0, 0.42, 0.33);
  corpo.add(testa);
  const cranio = mesh(geo.palla(0.2, 14), pelo, 0, 0, 0);
  cranio.scale.set(1, 0.92, 1.05);
  testa.add(cranio);
  const muso = mesh(geo.palla(0.12, 10), chiaro, 0, -0.05, 0.16);
  muso.scale.set(1.15, 0.85, 0.8);
  testa.add(muso);
  testa.add(mesh(geo.palla(0.045, 8), mat('#2e2220'), 0, -0.01, 0.26));
  for (const x of [-0.025, 0.025]) testa.add(mesh(geo.scatola(0.045, 0.08, 0.025), mat('#f2a030', { rim: 0.5 }), x, -0.14, 0.2));
  for (const x of [-0.09, 0.09]) {
    testa.add(mesh(geo.palla(0.035, 8), mat('#1e1a18'), x, 0.06, 0.16));
    testa.add(mesh(geo.palla(0.012, 6), mat('#ffffff'), x + 0.012, 0.075, 0.19));
    testa.add(mesh(geo.palla(0.055, 8), pelo, x * 1.5, 0.15, -0.02));
  }
  for (const [x, z] of [[-0.17, 0.2], [0.17, 0.2], [-0.19, -0.2], [0.19, -0.2]]) {
    const z2 = mesh(geo.palla(0.08, 8), pelo, x, 0.06, z);
    z2.scale.set(0.8, 0.7, 1.1);
    z2.name = 'zampa';
    corpo.add(z2);
  }
  g.add(ombra(0.45));
  g.scale.setScalar(1.15);
  g.userData.bersaglio = { tipo: 'castoro' };
  return contorno(g);
}

/** Il ceppo rimasto e l'albero caduto, con qualche truciolo. */
function creaCeppo(): THREE.Group {
  const g = new THREE.Group();
  const corteccia = mat('#7a5232');
  g.add(mesh(geo.cil(0.2, 0.26, 0.3, 9), corteccia, 0, 0.15, 0));
  const punta = mesh(geo.cono(0.2, 0.18, 9), mat('#e8c890'), 0, 0.39, 0);
  g.add(punta);
  const tronco = mesh(geo.cil(0.15, 0.22, 1.7, 8), corteccia, 0.15, 0.2, 1.05);
  tronco.rotation.x = Math.PI / 2;
  tronco.rotation.z = 0.25;
  g.add(tronco);
  for (const [x, y, z, r] of [[0.4, 0.35, 2.0, 0.35], [0.1, 0.45, 2.1, 0.3]]) g.add(mesh(geo.palla(r, 8), mat('#5f9a4a', { rim: 0.3 }), x, y, z));
  for (let i = 0; i < 6; i++) g.add(mesh(geo.scatola(0.06, 0.02, 0.04), mat('#e8c890'), Math.cos(i * 1.7) * 0.4, 0.01, Math.sin(i * 1.7) * 0.35));
  g.add(ombra(0.5));
  return contorno(g);
}

/** I trucioli sotto l'albero che rosicchia (crescono con l'avanzare del lavoro). */
function creaTrucioli(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const t = mesh(geo.scatola(0.07, 0.025, 0.05), mat(i % 3 ? '#e8c890' : '#c89a60'), Math.cos(i * 2.4) * (0.2 + (i % 4) * 0.08), 0.015, Math.sin(i * 2.4) * (0.2 + (i % 4) * 0.08));
    t.rotation.y = i;
    t.userData.senzaContorno = true;
    g.add(t);
  }
  return g;
}

export class CastoroInScena {
  readonly gruppo = new THREE.Group();
  private castoro = creaCastoro();
  private trucioli = creaTrucioli();
  private ceppi = new THREE.Group();
  private albero: THREE.Object3D | null = null;
  /** L'albero che sta rosicchiando (si inclina: non va disegnato insieme agli altri). */
  get alberoRosicchiato() { return this.albero; }
  /** Il castoro vero e proprio (per inquadrarlo quando parla). */
  get animale(): THREE.Object3D { return this.castoro; }
  private nascosti: THREE.Object3D[] = [];
  private chiave = '';
  private avanti = 0; // da 0 a 1
  private dorme = false;
  dati: Castoro | null = null;

  constructor() {
    this.gruppo.add(this.castoro, this.trucioli, this.ceppi);
    this.gruppo.visible = false;
  }

  /** Il castoro e i ceppi, sugli alberi del bosco di adesso (il bosco si rifà quando il villaggio si allarga). */
  aggiorna(c: Castoro | undefined, oggi: string, bosco: THREE.Group, raggio: number) {
    this.dati = c ?? null;
    this.gruppo.visible = !!c;
    if (!c) return;
    this.avanti = avanzamento(c, oggi);
    const chiave = `${c.albero}|${c.tagliati.join(',')}|${bosco.children.length}|${raggio}`;
    if (chiave === this.chiave && this.albero?.parent === bosco) return;
    this.chiave = chiave;
    for (const o of this.nascosti) o.visible = true;
    this.nascosti = [];
    if (this.albero) this.albero.rotation.set(0, this.albero.rotation.y, 0);
    // gli alberi del primo giro di bosco, il più vicino a ogni angolo
    const alberi = bosco.children.filter((o) => o.userData.cosa === 'albero' && Math.hypot(o.position.x, o.position.z) < raggio + 2.6);
    const vicino = (gradi: number) => {
      const a = (gradi * Math.PI) / 180;
      let meglio: THREE.Object3D | null = null, d = Infinity;
      for (const o of alberi) {
        const da = Math.abs(Math.atan2(Math.sin(Math.atan2(o.position.z, o.position.x) - a), Math.cos(Math.atan2(o.position.z, o.position.x) - a)));
        if (da < d) { d = da; meglio = o; }
      }
      return meglio;
    };
    this.ceppi.clear();
    for (const t of c.tagliati) {
      const o = vicino(t);
      if (!o) continue;
      o.visible = false;
      this.nascosti.push(o);
      const ceppo = creaCeppo();
      ceppo.position.set(o.position.x, 0, o.position.z);
      ceppo.rotation.y = Math.atan2(-o.position.x, -o.position.z) + 0.6; // caduto di lato, verso la radura
      this.ceppi.add(ceppo);
    }
    this.albero = vicino(c.albero);
    if (!this.albero || this.nascosti.includes(this.albero)) this.albero = alberi.find((o) => o.visible) ?? null;
    if (!this.albero) { this.gruppo.visible = false; return; }
    const p = this.albero.position;
    const verso = new THREE.Vector3(-p.x, 0, -p.z).normalize();
    const lato = new THREE.Vector3(-verso.z, 0, verso.x);
    // il castoro sta di fianco al tronco, dalla parte della radura, girato verso il tronco:
    // dal villaggio si vede di profilo, con i dentoni e la coda a paletta
    const sc = this.albero.scale.x;
    this.castoro.position.set(p.x + verso.x * 0.3 * sc + lato.x * 0.5 * sc, 0, p.z + verso.z * 0.3 * sc + lato.z * 0.5 * sc);
    this.castoro.rotation.y = Math.atan2(p.x - this.castoro.position.x, p.z - this.castoro.position.z);
    this.trucioli.position.set(p.x + verso.x * 0.35 * sc, 0, p.z + verso.z * 0.35 * sc);
    // il segno dei denti sul tronco: una fascia di legno chiaro, sempre più profonda
    if (this.morso.parent) this.morso.parent.remove(this.morso);
    this.albero.add(this.morso);
  }

  /** La fascia rosicchiata sul tronco (in coordinate dell'albero). */
  private morso = (() => {
    const g = new THREE.Group();
    const legno = mat('#f0d8a8', { rim: 0.2 });
    // due coni punta contro punta: la "clessidra" che fanno i castori
    const sopra = mesh(geo.cono(0.235, 0.12, 10), legno, 0, 0.36, 0);
    const sotto = mesh(geo.cono(0.245, 0.12, 10), legno, 0, 0.24, 0);
    sotto.rotation.x = Math.PI;
    g.add(sopra, sotto);
    return g;
  })();

  /** Dove sta (per non farci passare attraverso gli animali). */
  ostacoli(): { x: number; z: number; r: number }[] {
    if (!this.gruppo.visible) return [];
    const o = [{ x: this.castoro.position.x, z: this.castoro.position.z, r: 0.4 }];
    for (const c of this.ceppi.children) o.push({ x: c.position.x, z: c.position.z, r: 0.35 });
    return o;
  }

  posizione(): THREE.Vector3 {
    return this.castoro.position.clone();
  }

  anima(t: number, dt: number, notte: boolean) {
    if (!this.gruppo.visible || !this.albero) return;
    const corpo = this.castoro.getObjectByName('corpo')!;
    const testa = this.castoro.getObjectByName('testa')!;
    const coda = this.castoro.getObjectByName('coda')!;
    // l'albero si piega piano piano verso la radura; i trucioli aumentano
    const lean = Math.pow(this.avanti, 2) * 0.16;
    const p = this.albero.position;
    const verso = Math.atan2(-p.x, -p.z) - this.albero.rotation.y;
    this.albero.rotation.x = Math.cos(verso) * lean;
    this.albero.rotation.z = -Math.sin(verso) * lean;
    this.trucioli.children.forEach((c, i) => (c.visible = i < 3 + this.avanti * 11));
    this.morso.scale.set(1, 0.6 + this.avanti * 0.9, 1);
    this.dorme = notte;
    if (notte) {
      // acciambellato a dormire
      corpo.position.y = THREE.MathUtils.lerp(corpo.position.y, -0.08, dt * 3);
      testa.rotation.x = THREE.MathUtils.lerp(testa.rotation.x, 0.5, dt * 3);
      corpo.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
      return;
    }
    // seduto sulla coda, rosicchia: la testa avanti e indietro velocissima, ogni tanto una pausa per guardarsi intorno
    const pausa = Math.sin(t * 0.37) > 0.75;
    corpo.position.y = THREE.MathUtils.lerp(corpo.position.y, 0, dt * 3);
    corpo.rotation.x = THREE.MathUtils.lerp(corpo.rotation.x, -0.35, dt * 3);
    corpo.scale.y = 1;
    testa.rotation.x = pausa ? -0.1 : 0.15 + Math.sin(t * 22) * 0.12;
    testa.rotation.y = pausa ? Math.sin(t * 1.2) * 0.5 : Math.sin(t * 3) * 0.12;
    coda.rotation.x = -0.15 + Math.sin(t * 2) * 0.05;
  }

  /** Una frase per quando Giada lo tocca. */
  get addormentato(): boolean {
    return this.dorme;
  }
}
