// La pesca vista da fuori: l'animale scelto da Giada va in fondo al pontile, lancia la lenza,
// il galleggiante balla sull'acqua, va sotto quando un pesce abbocca, e alla fine il pesce salta fuori
// dall'acqua fino alle sue zampe. Qui c'è solo quello che si vede: i tempi e le regole sono in Pesca.svelte
// e in lib/pesca.ts.
import * as THREE from 'three';
import type { DefPesce } from '../lib/pesca';
import { geo, mat, mesh, posa, puntoLago, type ModelloAnimale } from './modelli';
import { contorno, spriteTesto } from './ps1';

type Stato = 'pronto' | 'lancio' | 'attesa' | 'abbocca' | 'recupero' | 'preso' | 'rotta' | 'scappato';

const ACQUA = 0.035;

/** Un pesce in 3D con i colori del quaderno (o lo stivale, o la bottiglia). */
export function creaPesce3D(p: DefPesce): THREE.Group {
  const g = new THREE.Group();
  if (p.id === 'stivale') {
    const gamba = mesh(geo.scatola(0.12, 0.26, 0.12), mat(p.colore), 0, 0.05, 0);
    const piede = mesh(geo.scatola(0.12, 0.08, 0.22), mat(p.colore), 0, -0.08, 0.05);
    const bordo = mesh(geo.scatola(0.14, 0.04, 0.14), mat(p.pancia), 0, 0.19, 0);
    g.add(gamba, piede, bordo);
    g.rotation.z = 0.4;
    return contorno(g);
  }
  if (p.id === 'bottiglia') {
    const vetro = mesh(geo.cil(0.07, 0.07, 0.26, 10), mat(p.colore, { transparent: true, opacity: 0.85, rim: 0.6 }));
    const collo = mesh(geo.cil(0.03, 0.06, 0.08, 8), mat(p.colore, { transparent: true, opacity: 0.85 }), 0, 0.17, 0);
    const tappo = mesh(geo.cil(0.032, 0.032, 0.04, 8), mat(p.pinne), 0, 0.22, 0);
    const biglietto = mesh(geo.scatola(0.05, 0.14, 0.01), mat(p.pancia), 0, 0, 0);
    g.add(vetro, collo, tappo, biglietto);
    g.rotation.z = Math.PI / 2;
    return contorno(g);
  }
  const lungo = p.forma === 'lungo' ? 1.35 : p.forma === 'serpente' ? 2.2 : p.forma === 'tondo' ? 0.85 : 1;
  const alto = p.forma === 'tondo' ? 1.3 : p.forma === 'serpente' ? 0.45 : p.forma === 'lungo' ? 0.8 : 1;
  const corpo = mesh(geo.palla(0.1, 12), mat(p.colore, { rim: 0.5 }));
  corpo.scale.set(0.6, 0.85 * alto, 1.5 * lungo);
  const pancia = mesh(geo.palla(0.09, 10), mat(p.pancia, { rim: 0.2 }), 0, -0.03 * alto, 0.01);
  pancia.scale.set(0.55, 0.55 * alto, 1.35 * lungo);
  const coda = mesh(geo.cono(0.08 * alto + 0.02, 0.12, 6), mat(p.pinne), 0, 0, -0.16 * lungo);
  coda.rotation.x = -Math.PI / 2;
  coda.scale.x = 0.25;
  coda.name = 'coda';
  const pinna = mesh(geo.cono(0.04, 0.08, 5), mat(p.pinne), 0, 0.085 * alto, -0.01);
  pinna.scale.x = 0.25;
  g.add(corpo, pancia, coda, pinna);
  for (const s of [-1, 1]) {
    const occhio = mesh(geo.palla(0.018, 6), mat(p.id === 'tinca' ? '#c0302a' : '#1a1a1a', { rim: 0 }), s * 0.05, 0.02, 0.1 * lungo);
    occhio.userData.senzaContorno = true;
    g.add(occhio);
  }
  return contorno(g);
}

/** Un'onda tonda che si allarga sull'acqua. */
interface Onda { o: THREE.Mesh; vita: number; durata: number; grande: number }
/** Uno spruzzo d'acqua. */
interface Goccia { o: THREE.Mesh; vel: THREE.Vector3; vita: number }

export class Pescata {
  readonly id: string;
  private gruppo = new THREE.Group(); // tutto quello che sta nel mondo (galleggiante, lenza, onde)
  private canna = new THREE.Group(); // la canna, nelle zampe dell'animale
  private cima = new THREE.Group(); // la parte alta della canna: si piega quando il pesce tira
  private punta = new THREE.Object3D();
  private mano = new THREE.Object3D();
  private galleggiante = new THREE.Group();
  private lenza: THREE.Mesh;
  private matLenza = mat('#fbfbf4', { rim: 0, emissive: '#ffffff', emissiveIntensity: 0.5 });
  private esclamativo: THREE.Sprite;
  private onde: Onda[] = [];
  private gocce: Goccia[] = [];
  private pesce: THREE.Group | null = null;
  private volo = 0; // 0 → 1 mentre il pesce salta dall'acqua alle zampe
  private partenzaPesce = new THREE.Vector3();

  /** chiamata quando il galleggiante tocca l'acqua dopo il lancio (da lì si aspetta) */
  quandoInAcqua: (() => void) | null = null;
  private stato: Stato = 'pronto';
  private tempo = 0; // secondi nello stato attuale
  private assaggio = 0;
  private strappo = 0; // un colpetto di canna a ogni tocco di Giada
  private distanza = 1;
  private tensione = 0;
  private strattone = false;
  private rottaVia = new THREE.Vector3();

  /** dove sta l'animale (in fondo al pontile), dove cade il galleggiante e la riva sotto il pontile */
  readonly piedi = new THREE.Vector3();
  readonly bersaglio = new THREE.Vector3();
  private riva = new THREE.Vector3();
  readonly verso: number; // dove guarda l'animale (rotation.y)
  private ultimoAppoggio = new THREE.Vector3();

  constructor(private scene: THREE.Scene, readonly m: ModelloAnimale, lago: THREE.Object3D, id: string) {
    this.id = id;
    lago.updateMatrixWorld(true);
    const [px, pz] = puntoLago(Math.PI * 0.5, 1.05);
    this.piedi.copy(lago.localToWorld(new THREE.Vector3(px + 0.2, 0.23, pz - 0.92)));
    this.riva.copy(lago.localToWorld(new THREE.Vector3(px + 0.2, 0, pz + 0.45)));
    this.bersaglio.copy(lago.localToWorld(new THREE.Vector3(px + 0.2 + (Math.random() - 0.5) * 0.7, ACQUA, pz - 2.35)));
    this.bersaglio.y = ACQUA;
    this.verso = Math.atan2(this.bersaglio.x - this.piedi.x, this.bersaglio.z - this.piedi.z);
    this.ultimoAppoggio.copy(m.gruppo.position);

    // l'animale va in fondo al pontile e guarda l'acqua
    m.gruppo.position.copy(this.piedi);
    m.gruppo.rotation.y = this.verso;
    m.corpo.position.y = 0;
    m.corpo.rotation.set(0, 0, 0);
    if (m.accessorio) m.accessorio.visible = false;

    // la canna: un manico con il mulinello e due pezzi (quello di sopra si piega)
    const legno = mat('#8a5a36');
    const manico = mesh(geo.cil(0.022, 0.03, 0.75, 6), legno, 0, 0.37, 0);
    const sughero = mesh(geo.cil(0.034, 0.034, 0.16, 8), mat('#d8b07a'), 0, 0.06, 0);
    const mulinello = mesh(geo.cil(0.05, 0.05, 0.035, 10), mat('#5a6a7a', { rim: 0.5 }), 0.05, 0.16, 0);
    mulinello.rotation.z = Math.PI / 2;
    this.cima.position.y = 0.74;
    this.cima.add(mesh(geo.cil(0.009, 0.02, 0.62, 5), legno, 0, 0.31, 0));
    this.punta.position.y = 0.62;
    this.cima.add(this.punta);
    this.canna.add(manico, sughero, mulinello, this.cima);
    contorno(this.canna);
    m.gruppo.add(this.canna);
    // la "mano": in fondo alla zampa davanti
    const lung = (m.zampe[0]?.userData.lunghezza as number | undefined) ?? 0.25;
    this.mano.position.set(0, -lung * 0.9, 0.03);
    m.zampe[0]?.add(this.mano);

    // il galleggiante rosso e bianco
    const sopra = mesh(new THREE.SphereGeometry(0.055, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e8443a', { rim: 0.4 }));
    const sotto = mesh(new THREE.SphereGeometry(0.055, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#ffffff', { rim: 0.3 }));
    const asta = mesh(geo.cil(0.008, 0.008, 0.08, 5), mat('#e8443a'), 0, 0.08, 0);
    this.galleggiante.add(sopra, sotto, asta);
    contorno(this.galleggiante);
    this.galleggiante.scale.setScalar(1.5); // bello grande, che si veda bene sul telefono
    this.galleggiante.visible = false;

    this.lenza = new THREE.Mesh(new THREE.BufferGeometry(), this.matLenza);
    this.lenza.frustumCulled = false;
    this.lenza.visible = false;

    this.esclamativo = spriteTesto('!', '#ffd84a', 128);
    this.esclamativo.scale.setScalar(0.7);
    this.esclamativo.visible = false;

    this.gruppo.add(this.galleggiante, this.lenza, this.esclamativo);
    scene.add(this.gruppo);
  }

  /** Il punto da guardare: un po' tra l'animale e il galleggiante. */
  fuoco(): THREE.Vector3 {
    if (this.stato === 'preso') return this.piedi.clone();
    return this.piedi.clone().lerp(this.bersaglio, 0.45).setY(0);
  }

  // ---------- quello che succede (lo decide Pesca.svelte) ----------

  lancia() {
    this.cambia('lancio');
    this.togliPesce();
    this.distanza = 1;
    this.tensione = 0;
    this.strattone = false;
  }

  assaggia() {
    this.assaggio = 0.45;
    this.onda(this.galleggiante.position, 0.6, 0.6);
  }

  abbocca() {
    this.cambia('abbocca');
    for (let i = 0; i < 3; i++) this.onda(this.bersaglio, 1 + i * 0.4, 0.8 + i * 0.25);
    this.spruzzi(this.bersaglio, 10);
  }

  /** Giada ha toccato in tempo: il pesce è all'amo. */
  ferra() {
    this.cambia('recupero');
    this.strappo = 1;
    this.spruzzi(this.galleggiante.position, 8);
  }

  /** Durante il recupero: quanto manca alla riva (1 → 0), quanto è tesa la lenza, se il pesce sta tirando. */
  recupero(distanza: number, tensione: number, strattone: boolean) {
    if (this.stato !== 'recupero') this.cambia('recupero');
    this.distanza = distanza;
    this.tensione = tensione;
    if (strattone && !this.strattone) this.spruzzi(this.galleggiante.position, 6);
    this.strattone = strattone;
  }

  /** Un tocco di Giada: la canna dà un colpetto. */
  tocco() {
    this.strappo = 1;
  }

  /** Il pesce salta fuori dall'acqua e finisce tra le zampe dell'animale. */
  preso(p: DefPesce, cm: number) {
    this.togliPesce();
    this.cambia('preso');
    const pesce = creaPesce3D(p);
    const s = p.forma === 'cosa' ? 1.2 : THREE.MathUtils.clamp(0.7 + cm / 70, 0.8, 2.2);
    pesce.scale.setScalar(s / this.m.gruppo.scale.x);
    this.partenzaPesce.copy(this.galleggiante.position);
    this.pesce = pesce;
    this.volo = 0;
    this.m.gruppo.add(pesce);
    this.spruzzi(this.galleggiante.position, 16);
    this.onda(this.galleggiante.position, 1.4, 1);
    this.galleggiante.visible = false;
  }

  /** La lenza si rompe (rotta) o il pesce si slaccia (scappato). */
  perso(rotta: boolean) {
    this.cambia(rotta ? 'rotta' : 'scappato');
    this.rottaVia.copy(this.galleggiante.position);
    this.spruzzi(this.galleggiante.position, 8);
  }

  /** Finito: l'animale scende dal pontile e torna alle sue cose. */
  distruggi() {
    this.togliPesce();
    this.canna.removeFromParent();
    this.mano.removeFromParent();
    this.scene.remove(this.gruppo);
    for (const g of this.gocce) g.o.removeFromParent();
    for (const o of this.onde) o.o.removeFromParent();
    this.lenza.geometry.dispose();
    const m = this.m;
    m.gruppo.position.copy(this.riva);
    m.gruppo.position.y = 0;
    m.corpo.position.y = 0;
    m.zampe.forEach((z) => (z.rotation.x = 0));
    m.testa.rotation.set(0, 0, 0);
  }

  private cambia(s: Stato) {
    this.stato = s;
    this.tempo = 0;
  }

  private togliPesce() {
    if (this.pesce) this.pesce.removeFromParent();
    this.pesce = null;
  }

  // ---------- ogni fotogramma ----------

  aggiorna(dt: number, t: number) {
    this.tempo += dt;
    const m = this.m;
    const k = this.tempo;
    // in piedi sulle zampe dietro, con la canna in mano
    m.gruppo.position.copy(this.piedi);
    m.gruppo.rotation.y = this.verso;
    posa(m, 1);
    for (const o of m.occhi) o.scale.y = 1;

    // ---- la canna: quanto è inclinata in avanti (0 = dritta in su) e quanto si piega la cima ----
    let incl = 0.75, piega = 0.05 + Math.sin(t * 1.3) * 0.02, braccia = -0.95;
    m.corpo.position.y = 0;
    m.testa.rotation.x = 0.15;
    switch (this.stato) {
      case 'lancio': {
        // indietro… e avanti con forza!
        if (k < 0.45) { const a = k / 0.45; incl = 0.75 - a * 1.35; braccia = -0.95 - a * 0.9; piega = -a * 0.25; }
        else if (k < 0.62) { const a = (k - 0.45) / 0.17; incl = -0.6 + a * 1.9; braccia = -1.85 + a * 1.2; piega = 0.35 * (1 - a); }
        else { const a = Math.min(1, (k - 0.62) / 0.4); incl = 1.3 - a * 0.55; braccia = -0.65 - a * 0.3; piega = -0.1 * (1 - a); }
        break;
      }
      case 'abbocca':
        incl = 0.95 + Math.sin(t * 30) * 0.05;
        piega = 0.5 + Math.sin(t * 22) * 0.12;
        m.testa.rotation.x = 0.3;
        break;
      case 'recupero': {
        incl = 0.45 + this.tensione * 0.35;
        piega = 0.25 + this.tensione * 0.9 + (this.strattone ? Math.sin(t * 25) * 0.15 : 0);
        braccia = -0.7 - this.tensione * 0.2;
        m.corpo.rotation.x = -0.08 - this.tensione * 0.12; // si tira indietro
        m.testa.rotation.x = 0.25;
        break;
      }
      case 'preso': {
        // le braccia in su con il pesce, e un saltello di gioia
        incl = 0.2;
        piega = 0.1;
        braccia = -2.4;
        m.corpo.position.y = this.volo >= 1 ? Math.abs(Math.sin(k * 7)) * 0.12 * Math.max(0, 1 - (k - 0.8) / 2.5) : 0;
        m.testa.rotation.x = -0.25;
        break;
      }
      case 'rotta':
      case 'scappato':
        // un po' di delusione: testa giù
        incl = 0.5;
        piega = 0;
        braccia = -0.8;
        m.testa.rotation.x = 0.45 + Math.sin(t * 1.5) * 0.05;
        break;
    }
    if (this.strappo > 0) {
      this.strappo = Math.max(0, this.strappo - dt * 6);
      incl -= this.strappo * 0.2;
      piega += this.strappo * 0.2;
    }
    if (m.zampe[0]) m.zampe[0].rotation.x = braccia;
    if (m.zampe[1]) m.zampe[1].rotation.x = braccia * 0.92;

    // la canna parte dalla mano e va in avanti e in su, sempre nel verso dell'animale
    m.gruppo.updateMatrixWorld(true);
    const mano = this.mano.getWorldPosition(new THREE.Vector3());
    this.canna.position.copy(m.gruppo.worldToLocal(mano));
    this.canna.position.x = Math.min(this.canna.position.x, 0) - 0.02;
    this.canna.rotation.set(incl, 0, -0.08);
    this.cima.rotation.x = piega;
    this.canna.visible = this.stato !== 'preso' || this.volo < 1;
    this.canna.scale.setScalar(0.8 / m.gruppo.scale.x); // la canna è uguale per tutti
    m.gruppo.updateMatrixWorld(true);
    const cima = this.punta.getWorldPosition(new THREE.Vector3());

    // ---- il galleggiante ----
    const gal = this.galleggiante;
    gal.visible = this.stato !== 'pronto' && this.stato !== 'preso';
    const dondola = Math.sin(t * 2.2) * 0.012;
    let lenzaMolle = 0.25;
    switch (this.stato) {
      case 'lancio': {
        const a = THREE.MathUtils.clamp((k - 0.5) / 0.65, 0, 1);
        if (a <= 0) gal.position.copy(cima).add(new THREE.Vector3(0, -0.25, 0));
        else {
          gal.position.lerpVectors(cima, this.bersaglio, a);
          gal.position.y += Math.sin(a * Math.PI) * 0.9 * (1 - a * 0.3);
          if (a >= 1) gal.position.y = ACQUA;
        }
        if (a >= 1 && k - dt < 1.15) { this.onda(this.bersaglio, 1, 0.9); this.spruzzi(this.bersaglio, 7); }
        if (k > 1.6) {
          this.cambia('attesa');
          const f = this.quandoInAcqua;
          this.quandoInAcqua = null;
          f?.();
        }
        lenzaMolle = a < 1 ? 0.05 : 0.3;
        break;
      }
      case 'attesa': {
        gal.position.copy(this.bersaglio);
        gal.position.y = ACQUA + dondola;
        if (this.assaggio > 0) {
          this.assaggio = Math.max(0, this.assaggio - dt);
          gal.position.y -= Math.sin((this.assaggio / 0.45) * Math.PI) * 0.05;
        }
        if (Math.floor(t / 1.6) !== Math.floor((t - dt) / 1.6)) this.onda(gal.position, 0.35, 1.2);
        break;
      }
      case 'abbocca': {
        gal.position.copy(this.bersaglio);
        gal.position.x += Math.sin(t * 31) * 0.025;
        gal.position.y = ACQUA - 0.07 - Math.abs(Math.sin(t * 9)) * 0.03; // sotto!
        if (Math.floor(t / 0.35) !== Math.floor((t - dt) / 0.35)) this.onda(gal.position, 0.8, 0.6);
        lenzaMolle = 0.02;
        break;
      }
      case 'recupero': {
        // dal punto dove ha abboccato fino sotto il pontile, con il pesce che si agita di lato
        const vicino = this.piedi.clone().lerp(this.bersaglio, 0.18).setY(ACQUA);
        gal.position.lerpVectors(vicino, this.bersaglio, Math.min(1.15, this.distanza));
        const scuoti = this.strattone ? 0.12 : 0.03;
        const lat = new THREE.Vector3(Math.cos(this.verso), 0, -Math.sin(this.verso));
        gal.position.addScaledVector(lat, Math.sin(t * (this.strattone ? 14 : 4)) * scuoti);
        gal.position.y = ACQUA - (this.strattone ? 0.06 : 0.03) + Math.sin(t * 8) * 0.01;
        if (Math.floor(t / (this.strattone ? 0.2 : 0.6)) !== Math.floor((t - dt) / (this.strattone ? 0.2 : 0.6))) {
          this.onda(gal.position, this.strattone ? 0.9 : 0.5, 0.6);
          if (this.strattone) this.spruzzi(gal.position, 3);
        }
        lenzaMolle = Math.max(0, 0.12 - this.tensione * 0.14);
        break;
      }
      case 'rotta':
      case 'scappato': {
        // il galleggiante resta lì a galleggiare (rotta) o torna su libero (scappato)
        gal.position.copy(this.rottaVia);
        gal.position.y = ACQUA + dondola;
        lenzaMolle = 0.5;
        break;
      }
    }
    gal.rotation.z = this.stato === 'abbocca' ? Math.sin(t * 20) * 0.4 : Math.sin(t * 1.7) * 0.1;

    // ---- la lenza: dalla punta della canna al galleggiante, un po' molle ----
    const lenzaVisibile = gal.visible && !(this.stato === 'rotta' && k > 0.15);
    this.lenza.visible = lenzaVisibile;
    if (lenzaVisibile) {
      const fine = gal.position.clone().add(new THREE.Vector3(0, 0.1, 0));
      const mezzo = cima.clone().lerp(fine, 0.5);
      mezzo.y -= cima.distanceTo(fine) * lenzaMolle;
      if (this.stato === 'rotta') mezzo.y += 0.3; // si spezza e vola via
      const curva = new THREE.QuadraticBezierCurve3(cima, mezzo, fine);
      this.lenza.geometry.dispose();
      this.lenza.geometry = new THREE.TubeGeometry(curva, 16, 0.006, 3, false);
      // quando è troppo tesa diventa rossa
      const rosso = this.stato === 'recupero' ? THREE.MathUtils.smoothstep(this.tensione, 0.6, 0.95) : 0;
      this.matLenza.color.setRGB(1, 1 - rosso * 0.75, 1 - rosso * 0.8);
      this.matLenza.emissive.setRGB(1, 1 - rosso * 0.8, 1 - rosso * 0.9);
    }

    // ---- il punto esclamativo sopra la testa quando abbocca ----
    this.esclamativo.visible = this.stato === 'abbocca';
    if (this.esclamativo.visible) {
      const testa = m.testa.getWorldPosition(new THREE.Vector3());
      this.esclamativo.position.set(testa.x, testa.y + 0.65 + Math.abs(Math.sin(t * 9)) * 0.12, testa.z);
      this.esclamativo.scale.setScalar(0.6 + Math.abs(Math.sin(t * 9)) * 0.12);
    }

    // ---- il pesce che salta fuori e poi sta tra le zampe ----
    if (this.pesce) {
      const p = this.pesce;
      const inMano = m.gruppo.worldToLocal(this.mano.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0.12, 0.1, 0.1));
      if (this.volo < 1) {
        this.volo = Math.min(1, this.volo + dt / 0.75);
        const da = m.gruppo.worldToLocal(this.partenzaPesce.clone());
        p.position.lerpVectors(da, inMano, this.volo);
        p.position.y += Math.sin(this.volo * Math.PI) * 1.4 / m.gruppo.scale.x;
        p.rotation.set(-1.2 + this.volo * 2.4, 0, this.volo * 6);
        if (this.volo >= 1) this.tempo = 0.8;
      } else {
        p.position.copy(inMano);
        // lo tiene in alto per farlo vedere, e il pesce si dimena un po'
        p.rotation.set(0.2, Math.PI / 2 + Math.sin(t * 9) * 0.35, 0);
        const coda = p.getObjectByName('coda');
        if (coda) coda.rotation.y = Math.sin(t * 14) * 0.6;
      }
    }

    // ---- onde e spruzzi ----
    for (let i = this.onde.length - 1; i >= 0; i--) {
      const o = this.onde[i];
      o.vita += dt;
      const a = o.vita / o.durata;
      if (a >= 1) { o.o.removeFromParent(); this.onde.splice(i, 1); continue; }
      o.o.scale.setScalar(0.3 + a * 2.2 * o.grande);
      (o.o.material as THREE.MeshToonMaterial).opacity = (1 - a) * 0.85;
    }
    for (let i = this.gocce.length - 1; i >= 0; i--) {
      const g = this.gocce[i];
      g.vita -= dt;
      g.vel.y -= 6 * dt;
      g.o.position.addScaledVector(g.vel, dt);
      if (g.vita <= 0 || g.o.position.y < 0) { g.o.removeFromParent(); this.gocce.splice(i, 1); }
    }
  }

  private onda(p: THREE.Vector3, grande: number, durata: number) {
    const o = mesh(new THREE.TorusGeometry(0.12, 0.01, 4, 24), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6, rim: 0, transparent: true, depthWrite: false }));
    o.material = (o.material as THREE.Material).clone();
    o.rotation.x = Math.PI / 2;
    o.position.set(p.x, ACQUA + 0.012, p.z);
    o.userData.senzaContorno = true;
    this.gruppo.add(o);
    this.onde.push({ o, vita: 0, durata, grande });
  }

  private spruzzi(p: THREE.Vector3, n: number) {
    const m = mat('#e8f6ff', { emissive: '#bfe6ff', emissiveIntensity: 0.6, rim: 0 });
    for (let i = 0; i < n; i++) {
      const o = mesh(geo.palla(0.018 + Math.random() * 0.02, 5), m, p.x, ACQUA + 0.03, p.z);
      o.userData.senzaContorno = true;
      this.gruppo.add(o);
      const a = Math.random() * Math.PI * 2, v = 0.4 + Math.random() * 0.9;
      this.gocce.push({ o, vel: new THREE.Vector3(Math.cos(a) * v * 0.6, 1.4 + Math.random() * 1.4, Math.sin(a) * v * 0.6), vita: 1.2 });
    }
  }
}
