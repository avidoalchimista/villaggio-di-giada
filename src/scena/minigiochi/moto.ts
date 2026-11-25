// Il giro in moto (motociclista): l'animale in sella sul sentiero del bosco, visto da dietro. Giada guida
// inclinando il telefono (o tenendo il dito a destra/sinistra, o con le frecce): raccoglie le lettere
// da consegnare e schiva le pozzanghere. Una pozzanghera non fa perdere niente: solo uno schizzo e un po' di fango.
import * as THREE from 'three';
import { durataGiro, puntiMoto } from '../../lib/minigiochi';
import { defMestiere } from '../../lib/mestieri';
import type { Animale } from '../../lib/tipi';
import { creaMoto } from '../botteghe';
import { creaAlbero, creaCespuglio, creaPino, mat, mesh, seduta } from '../modelli';
import { texture } from '../ps1';
import { Palco } from './palco';

const LARGO = 1.7; // metà larghezza del sentiero
const LONTANO = 60; // fin dove si vedono le cose davanti
interface Cosa { o: THREE.Object3D; tipo: 'lettera' | 'pozza' | 'albero'; x: number; z: number; presa?: boolean }

export class Moto extends Palco {
  private moto: THREE.Group;
  private guida = new THREE.Group(); // moto + animale: si inclina in curva
  private x = 0;
  private vx = 0;
  private sterza = 0; // -1 … 1
  private velocita = 7;
  private fango = 0; // secondi di rallentamento dopo una pozzanghera
  private cose: Cosa[] = [];
  private strada!: THREE.Mesh;
  private percorso = 0;
  private prossimaLettera = 0.3;
  private prossimaPozza = 1.5;
  private prese = 0;
  private totali = 0;
  private schizzi = 0;
  private tempo = 0;
  private durata: number;
  private tasti = { sx: false, dx: false };
  private dito: number | null = null;
  private inclinazione: number | null = null;
  private busta = mat('#fff8ec', { rim: 0.4 });
  private cuore = mat('#e8443a');
  private acqua = new THREE.MeshBasicMaterial({ color: '#6aa8d8' });

  constructor(canvas: HTMLCanvasElement, dati: Animale, livello: number) {
    super(canvas, dati, livello);
    this.durata = durataGiro(livello);
    this.curva = 0.006; // il mondo curvo del villaggio: le cose spuntano dall'orizzonte
    this.prato('#86bc62', '#bfe2f2', 26);
    this.scene.fog = new THREE.Fog('#bfe2f2', 22, LONTANO);
    // il sentiero di terra battuta, con i sassolini che scorrono
    const terra = texture(64, (c, l) => {
      c.fillStyle = '#c8a070'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#b08a5a';
      for (let i = 0; i < 26; i++) c.fillRect((i * 37) % l, (i * 53) % l, 3, 3);
      c.fillStyle = '#d8b484'; c.fillRect(l * 0.47, 0, l * 0.06, l * 0.5);
    }, 1);
    terra.wrapS = terra.wrapT = THREE.RepeatWrapping;
    terra.repeat.set(1, 20);
    this.strada = mesh(new THREE.PlaneGeometry(LARGO * 2 + 0.6, LONTANO * 2, 1, 80), mat('#ffffff', { map: terra, rim: 0 }), 0, 0.01, -LONTANO + 6);
    this.strada.rotation.x = -Math.PI / 2;
    this.strada.userData.senzaContorno = true;
    this.scene.add(this.strada);
    // alberi ai lati, che passano
    for (let z = 6; z > -LONTANO; z -= 3.2) for (const s of [-1, 1]) this.albero(s * (LARGO + 1.2 + Math.random() * 2.5), z);
    // la moto con l'animale in sella
    const d = defMestiere(dati.mestiere);
    this.moto = creaMoto(d?.colore ?? '#d8443a');
    // moto e animale guardano avanti, verso il fondo del sentiero
    const dentro = new THREE.Group();
    dentro.rotation.y = Math.PI;
    this.guida.add(dentro);
    dentro.add(this.moto);
    this.scene.add(this.guida);
    const m = this.animale(0, 0, 0);
    this.scene.remove(m.gruppo);
    m.gruppo.position.set(0, 0, -0.05);
    dentro.add(m.gruppo);
    this.moto.scale.setScalar(1.15);
    this.avvia();
    this.info();
    const tasto = (e: KeyboardEvent) => {
      const giu = e.type === 'keydown';
      if (e.key === 'ArrowLeft' || e.key === 'a') this.tasti.sx = giu;
      if (e.key === 'ArrowRight' || e.key === 'd') this.tasti.dx = giu;
    };
    window.addEventListener('keydown', tasto, { signal: this.ascolto.signal });
    window.addEventListener('keyup', tasto, { signal: this.ascolto.signal });
    window.addEventListener('deviceorientation', (e) => this.inclina(e), { signal: this.ascolto.signal });
  }

  /** Il telefono inclinato a destra o a sinistra (tenuto in verticale o in orizzontale). */
  private inclina(e: DeviceOrientationEvent) {
    if (e.gamma === null || e.beta === null) return;
    const ang = (screen.orientation?.angle ?? 0) % 360;
    const v = ang === 90 ? e.beta : ang === 270 ? -e.beta : e.gamma;
    this.inclinazione = THREE.MathUtils.clamp(v / 22, -1, 1);
  }

  /** Su iPhone l'inclinazione si può leggere solo dopo aver chiesto il permesso, con un tocco. */
  inizia() {
    super.inizia();
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D?.requestPermission === 'function') D.requestPermission().catch(() => {});
  }

  private albero(x: number, z: number) {
    const r = Math.random();
    const o = r < 0.4 ? creaPino(0.9 + Math.random() * 0.4, false) : r < 0.8 ? creaAlbero(1 + Math.random() * 0.3, Math.floor(Math.random() * 4), false) : creaCespuglio(1.3);
    o.position.set(x, 0, z);
    o.rotation.y = Math.random() * 6;
    this.scene.add(o);
    this.cose.push({ o, tipo: 'albero', x, z });
  }

  private lettera() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.42, 0.28, 0.04), this.busta));
    const c = mesh(new THREE.CircleGeometry(0.06, 12), this.cuore, 0, -0.02, 0.025);
    g.add(c);
    const lembo = mesh(new THREE.ConeGeometry(0.21, 0.13, 3), this.busta, 0, 0.075, 0.022);
    lembo.rotation.set(Math.PI / 2, 0, Math.PI);
    lembo.scale.z = 0.1;
    g.add(lembo);
    const x = (Math.random() * 2 - 1) * (LARGO - 0.35);
    g.position.set(x, 0.75, -34);
    this.scene.add(g);
    this.cose.push({ o: g, tipo: 'lettera', x, z: g.position.z });
    this.totali++;
  }

  private pozza() {
    const p = mesh(new THREE.CircleGeometry(0.5, 16), this.acqua);
    p.rotation.x = -Math.PI / 2;
    p.scale.set(1.2, 0.8, 1);
    p.userData.senzaContorno = true;
    const x = (Math.random() * 2 - 1) * (LARGO - 0.4);
    p.position.set(x, 0.02, -34);
    this.scene.add(p);
    this.cose.push({ o: p, tipo: 'pozza', x, z: p.position.z });
  }

  private info(testo = 'Raccogli le lettere, schiva le pozzanghere!') {
    const resta = Math.max(0, Math.ceil(this.durata - this.tempo));
    this.onInfo({ testo, conta: `✉️ ${this.prese}   ·   ⏱ ${resta}"` });
  }

  protected inquadra(a: number) {
    const k = a < 0.8 ? 1.3 : 1;
    this.camera.fov = a < 0.8 ? 62 : 50;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 2.1 * k, 3.6 * k);
    this.camera.lookAt(0, a < 0.8 ? 0.7 : 0.1, -4);
  }

  // il dito: tenuto a sinistra o a destra dello schermo, sterza da quella parte
  protected giu(p: THREE.Vector2) { this.dito = p.x; }
  protected muovi(p: THREE.Vector2, e: PointerEvent) { if (this.dito !== null || e.buttons) this.dito = p.x; }
  protected su() { this.dito = null; }

  protected aggiorna(dt: number, t: number) {
    const [d0, d1] = this.m.zampe;
    const sd = seduta(this.m);
    this.m.corpo.position.y = 0.36;
    this.m.zampe[2].rotation.x = this.m.zampe[3].rotation.x = -1.2;
    d0.rotation.x = d1.rotation.x = -1.25;
    this.m.testa.rotation.x = 0.05;
    void sd;
    if (!this.giocando) {
      // ferma, col motore acceso
      this.guida.position.y = Math.abs(Math.sin(t * 30)) * 0.006;
      return;
    }
    this.tempo += dt;
    // come sterza: dito, frecce, oppure il telefono inclinato
    let s = 0;
    if (this.dito !== null) s = THREE.MathUtils.clamp(this.dito * 1.6, -1, 1);
    else if (this.tasti.sx || this.tasti.dx) s = (this.tasti.dx ? 1 : 0) - (this.tasti.sx ? 1 : 0);
    else if (this.inclinazione !== null) s = this.inclinazione;
    this.sterza = THREE.MathUtils.lerp(this.sterza, s, Math.min(1, dt * 8));
    this.vx = this.sterza * 4.2;
    this.x = THREE.MathUtils.clamp(this.x + this.vx * dt, -LARGO + 0.3, LARGO - 0.3);
    this.guida.position.x = this.x;
    this.guida.rotation.z = -this.sterza * 0.3;
    this.guida.rotation.y = -this.sterza * 0.25;
    this.guida.position.y = Math.abs(Math.sin(t * 24)) * 0.01;
    this.camera.position.x = this.x * 0.4;
    // avanti tutta (più piano nel fango)
    this.fango = Math.max(0, this.fango - dt);
    const v = (this.velocita + this.tempo * 0.06) * (this.fango > 0 ? 0.55 : 1);
    const passo = v * dt;
    this.percorso += passo;
    const map = (this.strada.material as THREE.MeshToonMaterial).map;
    if (map) map.offset.y = (this.percorso / (LONTANO * 2)) * 20;
    // nuove lettere e pozzanghere davanti
    this.prossimaLettera -= dt;
    this.prossimaPozza -= dt;
    const finisce = this.tempo > this.durata - 2.5;
    if (this.prossimaLettera <= 0 && !finisce) { this.lettera(); this.prossimaLettera = 0.9 + Math.random() * 0.8; }
    if (this.prossimaPozza <= 0 && !finisce) { this.pozza(); this.prossimaPozza = 1.3 + Math.random() * 1.2 - Math.min(0.5, this.tempo * 0.01); }
    // tutto scorre verso di noi
    for (let i = this.cose.length - 1; i >= 0; i--) {
      const c = this.cose[i];
      c.z += passo;
      c.o.position.z = c.z;
      if (c.tipo === 'lettera') {
        c.o.rotation.y += dt * 2.5;
        c.o.position.y = 0.75 + Math.sin(t * 3 + c.x) * 0.06;
      }
      if (!c.presa && Math.abs(c.z) < 0.5 && Math.abs(c.x - this.x) < (c.tipo === 'lettera' ? 0.55 : 0.6)) {
        if (c.tipo === 'lettera') {
          c.presa = true;
          this.prese++;
          this.scene.remove(c.o);
          this.sbuffo('✉️', new THREE.Vector3(this.x, 1.9, 0), '#ffffff', 0.5);
          this.faccia('gioia');
          if (navigator.vibrate) navigator.vibrate(15);
          this.info('Presa!');
        } else if (c.tipo === 'pozza') {
          c.presa = true;
          this.schizzi++;
          this.fango = 1.1;
          this.faccia('sorpresa');
          for (let k = 0; k < 14; k++) {
            const goccia = mesh(new THREE.SphereGeometry(0.05, 5, 4), this.acqua);
            goccia.position.set(this.x + (Math.random() - 0.5) * 0.6, 0.1, 0.2);
            this.vola(goccia, new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.2) * 2), 0.8, 0);
          }
          if (navigator.vibrate) navigator.vibrate(80);
          this.info('Splash! Che schizzo!');
        }
      }
      if (c.z > 8) {
        if (c.tipo === 'albero') {
          // l'albero passato torna in fondo al sentiero
          c.z -= LONTANO + 8;
          c.o.position.z = c.z;
        } else {
          this.scene.remove(c.o);
          this.cose.splice(i, 1);
        }
      }
    }
    if (Math.floor(this.tempo * 2) !== Math.floor((this.tempo - dt) * 2)) this.info();
    if (this.tempo >= this.durata) {
      const punti = puntiMoto(this.prese, this.totali, this.schizzi);
      this.finisci({
        punti, righe: [`${this.prese} lettere consegnate su ${this.totali}`, this.schizzi ? `${this.schizzi} ${this.schizzi === 1 ? 'pozzanghera' : 'pozzanghere'}: un po' di fango!` : 'Nessuna pozzanghera!'],
        ricordo: { lettere: this.prese },
      });
    }
  }
}
