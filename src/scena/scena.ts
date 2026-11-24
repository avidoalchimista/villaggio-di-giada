// La radura del villaggio in 3D. Gli animali girano liberi, dormono, festeggiano.
// Il villaggio si allarga quando arrivano nuovi abitanti e nascono nuovi mestieri.
import * as THREE from 'three';
import { hash } from '../lib/caso';
import { COLORE_VIRTU } from '../lib/etichette';
import { emozioneDellaPagina, REGOLE } from '../lib/gioco';
import { defMestiere, virtuMestiere, type DefMestiere } from '../lib/mestieri';
import { creaBici, creaMoto, trovaPostazione } from './botteghe';
import { CastoroInScena } from './castoro';
import { arredoVuoto, fasePianta, LATO_SENTIERO, CELLA, PIANTE, PREZZI, type Arredo, type Posto } from '../lib/arredo';
import type { Animale, StatoGioco, Virtu } from '../lib/tipi';
import {
  aggiornaMestiere, creaAiuola, creaAlbero, creaAnimale, creaCasaAnimale, creaCartello, creaChiosco, creaCorvo, creaFalo, SIMBOLI_MESTIERE,
  creaCespuglio, creaCiuffo, creaFungo, creaTronco, posa, ampiezzaPasso, creaCastagno, creaCastagna, creaCanna,
  animaLaghetto, puntoLago, fuoriDalLago, SAGOMA_CASA, creaFiore, creaLaghetto, creaLanterna, creaMulino, creaNido, creaPanchina, creaPiazzaMusica, creaPino, creaPonticello, creaPozzo,
  creaQuaderno, creaSasso, creaStaccionata, creaTorretta, creaUovo, mat, type ModelloAnimale,
  creaCassetta, creaPianta, creaQuadretto, POSTI_CASSETTA, creaCartelloVia, creaRecinto,
} from './modelli';
import { CURVA, materiale, materialeTerreno, spriteTesto } from './ps1';
import type { Meteo } from '../lib/meteo';
import { cappellinoDiFesta, Festa, POSTO_TORTA } from './festa';
import { Pescata } from './pesca3d';
import { AcquarioInScena, CENTRO_VASCA } from './acquario3d';
import { SentieriInScena, sulSentiero } from './sentieri3d';
import { BIOMA, biomiScoperti, type DefBioma } from '../lib/biomi';
import { Taglio, type CosaTagliata } from './taglio';
import { improntaDi, piuViciniCapsule, postoNelMondo, puntiCapsula, raggioDi, rettangoloAlSuolo, sovrapposte, spintaFuori, type Capsula, type Impronta } from './spazio';

export type Bersaglio =
  | { tipo: 'animale'; id: string }
  | { tipo: 'corvo' }
  | { tipo: 'quaderno' }
  | { tipo: 'uovo'; id: string }
  | { tipo: 'edificio'; tipo_edificio: string }
  | { tipo: 'bottega'; id: string }
  | { tipo: 'nido' }
  | { tipo: 'castagne' }
  | { tipo: 'aiuola'; id: string }
  | { tipo: 'quadretto'; id: string }
  | { tipo: 'laghetto' }
  | { tipo: 'castoro' }
  | { tipo: 'acquario' }
  | { tipo: 'sentiero'; id: string };

/** Cosa sta facendo Giada quando arreda il villaggio. */
export type ModoArredo = 'sposta' | 'togli' | 'sentiero' | 'orto' | 'quadri';

/** Quello che succede arredando: la schermata lo salva nello stato. */
export type EventoArredo =
  | { tipo: 'seleziona'; chiave: string | null }
  | { tipo: 'sposta'; chiave: string; posto: Posto }
  | { tipo: 'togli'; x: number; z: number; costo: number; cosa: string }
  | { tipo: 'poche'; costo: number; cosa: string }
  | { tipo: 'dipingi'; x: number; z: number }
  | { tipo: 'apri'; chiave: string };

/** Cose che non si possono spostare (sono sparse, o seguono altro). */
const FISSE = new Set(['sentiero', 'lanterne']);

const POSTO_CASTAGNO: [number, number] = [-7.5, -3.5];

/** Puntino rotondo e sfumato per neve, pioggia e lucciole (senza, i punti sono quadrati). */
let texPunto: THREE.CanvasTexture | null = null;
function puntoTondo(): THREE.CanvasTexture {
  if (texPunto) return texPunto;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  texPunto = new THREE.CanvasTexture(cv);
  return texPunto;
}

/** Raggi di luce per la schiusa. */
let texR: THREE.CanvasTexture | null = null;
function texRaggi(): THREE.CanvasTexture {
  if (texR) return texR;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.translate(64, 64);
  for (let i = 0; i < 12; i++) {
    c.rotate((Math.PI * 2) / 12);
    const g = c.createLinearGradient(0, 0, 0, -64);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-3, 0);
    c.lineTo(-(i % 2 ? 7 : 11), -64);
    c.lineTo(i % 2 ? 7 : 11, -64);
    c.lineTo(3, 0);
    c.fill();
  }
  texR = new THREE.CanvasTexture(cv);
  return texR;
}

/** Le due metà del guscio: quella di sopra vola via, quella di sotto resta nel nido. */
function creaGusci(): THREE.Mesh[] {
  const m = materiale({ color: '#fff7e6', rim: 0.5, side: THREE.DoubleSide });
  const sopra = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), m);
  sopra.scale.set(1, 1.3, 1);
  const sotto = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), m);
  sotto.scale.set(1, 1.3, 1);
  sopra.position.y = 0.2;
  // la metà di sotto la appoggio col fondo sul nido
  sotto.geometry.translate(0, 0.3, 0);
  return [sopra, sotto];
}

interface Abitante {
  m: ModelloAnimale;
  dati: Animale;
  meta: THREE.Vector3;
  pausa: number;
  passo: number;
  salto: number;
  ammicca: number;
  z: THREE.Sprite[];
  // cosa sta facendo tra quelle che sa fare; per il lavoro `giro` vuol dire che è in giro (consegne, visite)
  // e non alla sua postazione: in giro non si fanno i gesti del mestiere
  attivita: { id: string; tempo: number; prossimo: number; tappa?: number; giro?: boolean } | null;
  canna: THREE.Object3D | null;
  mezzo: THREE.Object3D | null; // la moto o la bici di chi lavora in giro
  eretto: number; // 0 = quattro zampe, 1 = in piedi
  amico: string | null; // con chi sta passando del tempo
  incontro: number; // secondi di chiacchierata rimasti
  prossimoBalloon: number;
  balloon: THREE.Sprite | null;
  sveglio: number; // di notte: secondi di veglia dopo una carezza
  ultimoColpo?: number; // per le scintille e i trucioli del lavoro
  latoSterza?: number; // da che parte gira intorno a quello che ha davanti
  deviazione?: THREE.Vector3 | null; // un passo di lato per girare intorno a quello che lo blocca
  fermo: number; // secondi in cui cammina senza riuscire ad avvicinarsi (bloccato da qualcosa)
  distPrima: number;
}

/** Grandezza della radura: cresce con gli abitanti, i mestieri e le costruzioni. */
export function raggioVillaggio(s: StatoGioco): number {
  const nati = s.animali.filter((a) => a.fase !== 'uovo').length;
  const mestieri = s.animali.filter((a) => a.mestiere).length;
  // (le case sono larghe: davanti hanno la postazione di lavoro, quindi il villaggio cresce di più per ogni mestiere)
  return Math.min(26, 12 + nati * 0.6 + mestieri * 1.1 + s.edifici.length * 1.2 + (s.costruzioni?.length ?? 0) * 0.3);
}

/** Dove va ogni costruzione: [x, z, rotazione]. */
const POSTI_COSTRUZIONI: Record<string, [number, number, number]> = {
  cartello: [1.8, 8.2, -0.25],
  aiuola: [-1.9, -1.7, 0], // (prima stava sopra il nido)
  staccionata: [-2.8, 1.6, 0],
  panchina: [2.9, 0.6, -1.3],
  laghetto: [4.4, 2.6, 0],
  falo: [0, 0, 0],
  ponticello: [3.6, 2.6, Math.PI / 2 + 0.15], // attraversa il laghetto nel lato corto
  pozzo: [-4.6, -1.6, 0.6],
  torretta: [-5.6, 4.4, 0.4],
  mulino: [5.8, -3.6, -0.8],
  // grande e un po' in disparte, di lato al viale d'ingresso (poi Giada lo mette dove vuole)
  acquario: [6.4, 9.2, Math.atan2(-6.4, -9.2)],
};

/**
 * Posti automatici per edifici e botteghe: un arco dietro la radura e poi i lati,
 * almeno 8 metri l'uno dall'altro (ogni casa ha la sua postazione di lavoro accanto alla porta);
 * quando non c'è più posto, un secondo giro più largo.
 * Il viale d'ingresso (davanti, verso la telecamera) resta sempre libero.
 */
export function postiCase(n: number, raggio: number): [number, number][] {
  const out: [number, number][] = [];
  // verso il bordo della radura, non in mezzo: più il villaggio è grande, più le case stanno larghe
  // (il secondo giro è 7 metri più in fuori, a cavallo del bosco: lì gli alberi si fanno da parte)
  const primo = Math.max(8, raggio - 4);
  const giri = [primo, primo + 7];
  for (const [g, d] of giri.entries()) {
    if (d < 6) continue;
    const passo = 8.4 / d; // angolo per stare a ~8,4 m di distanza
    const offset = g * passo * 0.5;
    for (let k = 0; out.length < n; k++) {
      const lato = k === 0 ? 0 : Math.ceil(k / 2) * (k % 2 ? 1 : -1);
      const a = Math.PI * 1.5 + lato * passo + offset;
      // fino a ~50° dal viale d'ingresso (che è a 90°): oltre si torna verso il davanti
      const dalViale = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
      if (Math.abs(lato * passo) > Math.PI) break;
      if (dalViale < 0.9) continue;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (out.some(([px, pz]) => Math.hypot(x - px, z - pz) < 8)) continue;
      out.push([x, z]);
    }
    if (out.length >= n) break;
  }
  // se proprio non c'è posto (tantissime case), si stringono sul giro esterno
  while (out.length < n) {
    const a = Math.PI * 1.5 + (out.length * 0.61) % (Math.PI * 1.4) - Math.PI * 0.7;
    out.push([Math.cos(a) * 18, Math.sin(a) * 18]);
  }
  return out;
}

export class Scena {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  private sole = new THREE.DirectionalLight('#fff1d6', 2.2);
  private ambiente = new THREE.HemisphereLight('#bfe0ff', '#c9a27a', 1.25);
  private orologio = new THREE.Clock();
  private abitanti = new Map<string, Abitante>();
  private uova = new Map<string, THREE.Group>();
  private edifici = new Map<string, THREE.Group>();
  private botteghe = new Map<string, THREE.Group>();
  private bosco = new THREE.Group();
  private giaAggiornataSentieri = false;
  private castoro = new CastoroInScena();
  private acquario: AcquarioInScena | null = null;
  private sentieri = new SentieriInScena();
  private angoliSentieri: number[] = [];
  private lanterne: THREE.Mesh[] = [];
  private lucciole: THREE.Points;
  private corvo = creaCorvo();
  private quaderno = creaQuaderno();
  private nido = creaNido();
  private prato!: THREE.Mesh;
  private matTerreno!: THREE.MeshLambertMaterial;
  private strutture = new Map<string, THREE.Object3D>();
  private grande: THREE.Object3D | null = null;
  private giaAggiornata = false;
  private fiamma: THREE.Mesh | null = null;
  private castagne = new THREE.Group();
  private esclamativo!: THREE.Sprite;
  private conRichiesta: string | null = null;
  private precipitazioni!: THREE.Points;
  private meteo: Meteo = 'sole';
  private fulmine = 0;
  private pale: THREE.Group | null = null;
  private raggio = 0;
  private raggioMostrato = 5.5;
  private angolo = 0.0;
  private velAngolo = 0;
  private zoom = 1;
  private centro = new THREE.Vector3(); // punto guardato dalla telecamera
  private centroVoluto = new THREE.Vector3();
  private trascina: { x: number; y: number; mosso: number; dipinge?: boolean; ultimo?: THREE.Vector3 } | null = null;
  private mezzoDita: { x: number; y: number } | null = null;
  private dita = new Map<number, { x: number; y: number }>();
  private distanzaPizzico = 0;
  private angoloDita = 0;
  private raf = 0;
  private corvoParla = 0;
  private effimeri: { o: THREE.Object3D; vita: number; vel: THREE.Vector3 }[] = [];
  private resizeObs: ResizeObserver;
  onTocco: (b: Bersaglio) => void = () => {};
  // primo piano: la telecamera si avvicina a qualcosa (schiusa, riepilogo "mentre eri via")
  private cine: { segui: () => THREE.Vector3; dist: number; alt: number; guardaY: number; angolo: number; animale?: string; oggetto?: THREE.Object3D; torna?: boolean } | null = null;
  private nascostiCine = new Map<THREE.Object3D, boolean>(); // alberi e case tolti di mezzo durante il primo piano
  private morbido = 0; // secondi di passaggio dolce dopo il primo piano
  private posCam = new THREE.Vector3(0, 8, 14);
  private guardaCam = new THREE.Vector3(0, 0.6, 0);
  /** chi sta pescando in fondo al pontile, mandato da Giada (vedi pesca3d.ts) */
  pescata: Pescata | null = null;
  private trattenuti = new Set<string>(); // nati ma ancora mostrati come uova, finché non si vede la schiusa
  private ultimoStato: StatoGioco | null = null;
  private schiusaIn: {
    id: string; t: number; uovo: THREE.Group; crepe: number; alone: THREE.Sprite; raggi: THREE.Sprite; luce: THREE.PointLight;
    nato: boolean; gusci: THREE.Mesh[]; base: number; fatto: () => void; onFase?: (f: 'trema' | 'crepa' | 'luce' | 'nato') => void;
  } | null = null;
  private stelline: { o: THREE.Sprite; vita: number }[] = [];
  velocita = 1; // solo per le prove: accelera la schiusa
  // la festa di compleanno di Giada (vedi festa.ts): addobbi, torta, cappellini, fuochi
  private festa: Festa | null = null;
  private buio = 0;

  // ---------- arredo ----------
  private castagno!: THREE.Group;
  private selvatici = new THREE.Group(); // sassi e albero grande dell'inizio: si possono togliere
  private arredo: Arredo = arredoVuoto();
  private aiuole = new Map<string, THREE.Group>();
  private quadri = new Map<string, THREE.Group>();
  private oggetti = new Map<string, THREE.Group>();
  private ghiande = 0;
  private chiaveBosco = '';
  private chiaveSentiero = '';
  private oggi = '';
  private selezionato: string | null = null;
  private anelloSel!: THREE.Mesh;
  private vistaAlta = 0;
  private spostando: string | null = null;
  private aiuoleCaricate = false; // oggetto trascinato col dito
  /** null = si gioca; altrimenti Giada sta arredando */
  modo: ModoArredo | null = null;
  /** materiale del sentiero (0 = gomma) */
  pennello = 1;
  onArredo: (e: EventoArredo) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // niente tone mapping: così nebbia e cielo hanno esattamente lo stesso colore (prima gli alberi lontani sembravano fantasmi)
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene.fog = new THREE.Fog('#a9cfe4', 60, 80);
    this.scene.add(this.ambiente, this.sole);
    this.sole.position.set(6, 12, 8);

    this.costruisciFissi();
    this.scene.add(this.bosco);
    this.scene.add(this.castoro.gruppo);
    this.scene.add(this.sentieri.gruppo);
    this.lucciole = this.creaLucciole();
    this.scene.add(this.lucciole);
    this.allarga(5.5);
    this.scene.add(this.selvatici);

    this.resizeObs = new ResizeObserver(() => this.ridimensiona());
    this.resizeObs.observe(canvas);
    this.ridimensiona();
    this.collegaInput();
    this.luceDelGiorno();
    this.ciclo();
  }

  // ---------- mondo ----------

  private costruisciFissi() {
    // suolo: erba e terra mescolate in coordinate del mondo (niente piastrelle che si ripetono)
    this.matTerreno = materialeTerreno();
    this.prato = new THREE.Mesh(new THREE.PlaneGeometry(240, 240, 96, 96), this.matTerreno);
    this.prato.rotation.x = -Math.PI / 2;
    this.scene.add(this.prato);

    // all'inizio la radura è selvatica: qualche sasso e un tronco caduto
    for (const [x, z, s] of [[3.4, -1.2, 0.6], [-2.2, -3.0, 0.45], [2.4, 3.6, 0.5], [-4.6, 3.2, 0.7]]) {
      const sasso = creaSasso(s);
      sasso.position.set(x, sasso.position.y, z);
      this.selvatici.add(sasso);
    }

    // (il grande albero è la tana dei piccoli: non si abbatte)
    const grande = creaAlbero(1.5, 2);
    grande.position.set(-4.5, 0, -0.1); // un passo più in là: la staccionata del nido non ci entra dentro
    this.scene.add(grande);

    // anello giallo sotto la cosa scelta quando si arreda
    this.anelloSel = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9, depthWrite: false }));
    this.anelloSel.rotation.x = -Math.PI / 2;
    this.anelloSel.position.y = 0.05;
    this.anelloSel.visible = false;
    this.anelloSel.raycast = () => {};
    this.scene.add(this.anelloSel);
    this.nido.scale.setScalar(1.3);
    this.nido.position.set(-2.8, 0, 1.6);
    this.scene.add(this.nido);
    // sotto il grande albero c'è la tana dei piccoli: toccando l'albero o il nido si sbircia dentro
    this.grande = grande;
    grande.userData.bersaglio = { tipo: 'nido' };
    this.nido.userData.bersaglio = { tipo: 'nido' };
    const porticina = new THREE.Group();
    porticina.add(new THREE.Mesh(new THREE.CircleGeometry(0.15, 18), mat('#4a3020', { rim: 0 })));
    const tondo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 18), mat('#a8703e'));
    porticina.add(tondo);
    const pomello = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat('#f2c94c'));
    pomello.position.set(0.08, 0, 0.02);
    porticina.add(pomello);
    porticina.scale.y = 1.25;
    porticina.position.set(Math.sin(0.6) * 0.235, 0.17, Math.cos(0.6) * 0.235);
    porticina.rotation.y = 0.6;
    grande.add(porticina);

    this.corvo.gruppo.position.set(-1.7, 0, 3.5);
    this.corvo.gruppo.rotation.y = 0.4;
    this.corvo.gruppo.userData.bersaglio = { tipo: 'corvo' };
    this.scene.add(this.corvo.gruppo);
    this.quaderno.position.set(1.6, 0, 3.7);
    this.quaderno.rotation.y = -0.3;
    this.quaderno.userData.bersaglio = { tipo: 'quaderno' };
    this.scene.add(this.quaderno);
    const brilla = spriteTesto('✎', '#ffe08a');
    brilla.scale.setScalar(0.5);
    brilla.position.set(0, 1.4, 0);
    brilla.name = 'brilla';
    this.quaderno.add(brilla);

    // il castagno: le castagne mature cadono qui sotto e si raccolgono toccandole
    const castagno = creaCastagno();
    castagno.position.set(POSTO_CASTAGNO[0], 0, POSTO_CASTAGNO[1]);
    this.castagno = castagno;
    this.scene.add(castagno);
    this.castagne.position.copy(castagno.position);
    this.castagne.userData.bersaglio = { tipo: 'castagne' };
    this.scene.add(this.castagne);

    // il "!" sopra chi ha una richiesta
    this.esclamativo = spriteTesto('!', '#ffd166');
    this.esclamativo.scale.setScalar(0.55);
    this.esclamativo.visible = false;
    this.scene.add(this.esclamativo);

    // pioggia e neve: particelle in una scatola intorno alla telecamera
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 30, Math.random() * 14, (Math.random() - 0.5) * 30], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.precipitazioni = new THREE.Points(g, new THREE.PointsMaterial({ color: '#cfe4ff', size: 0.07, transparent: true, opacity: 0.85, depthWrite: false, map: puntoTondo() }));
    this.precipitazioni.visible = false;
    this.precipitazioni.frustumCulled = false;
    this.scene.add(this.precipitazioni);
  }

  // ---------- meteo ----------

  /** Cambia il tempo che fa: lo chiama la schermata ogni volta che serve. */
  impostaMeteo(m: Meteo) {
    if (m === this.meteo) return;
    this.meteo = m;
    const p = this.precipitazioni.material as THREE.PointsMaterial;
    this.precipitazioni.visible = m === 'pioggia' || m === 'temporale' || m === 'neve';
    p.size = m === 'neve' ? 0.16 : 0.07;
    p.color.set(m === 'neve' ? '#ffffff' : '#b9d4f0');
    this.luceDelGiorno();
  }

  private aggiornaPrecipitazioni(dt: number, t: number) {
    if (!this.precipitazioni.visible) return;
    const pos = this.precipitazioni.geometry.getAttribute('position') as THREE.BufferAttribute;
    const neve = this.meteo === 'neve';
    const vel = neve ? 1.2 : this.meteo === 'temporale' ? 16 : 11;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - vel * dt;
      let x = pos.getX(i);
      if (neve) x += Math.sin(t * 0.8 + i) * dt * 0.4;
      else x += dt * (this.meteo === 'temporale' ? 2.5 : 0.8); // pioggia un po' obliqua
      if (y < 0) {
        y += 14;
        x = (Math.random() - 0.5) * 30;
      }
      pos.setXYZ(i, x, y, pos.getZ(i));
    }
    pos.needsUpdate = true;
    this.precipitazioni.position.set(this.centro.x, 0, this.centro.z);
  }

  // ---------- castagne e richieste ----------

  private aggiornaCastagne(n: number) {
    while (this.castagne.children.length > n) this.castagne.remove(this.castagne.children[this.castagne.children.length - 1]);
    while (this.castagne.children.length < n) {
      const i = this.castagne.children.length;
      const c = creaCastagna();
      const a = i * 2.4, r = 0.9 + (i % 3) * 0.35;
      c.position.set(Math.cos(a) * r, c.position.y, Math.sin(a) * r);
      c.rotation.y = i;
      this.castagne.add(c);
    }
  }

  /** Le castagne volano via quando Giada le raccoglie. */
  raccolte() {
    for (const c of [...this.castagne.children]) {
      const p = c.getWorldPosition(new THREE.Vector3());
      this.castagne.remove(c);
      c.position.copy(p);
      this.scene.add(c);
      this.effimeri.push({ o: c, vita: 0.9, vel: new THREE.Vector3((Math.random() - 0.5) * 2, 4 + Math.random() * 2, (Math.random() - 0.5) * 2) });
    }
  }

  /** Ricostruisce il bosco intorno alla radura quando il villaggio si allarga. */
  private allarga(r: number) {
    const arrotondato = Math.round(r * 2) / 2;
    const occupati = this.occupati();
    const chiave = arrotondato + '|' + this.angoliSentieri.join(',') + '|' + JSON.stringify(this.arredo.tolti) + '|' + occupati.map(([x, z, d]) => `${x.toFixed(1)},${z.toFixed(1)},${d}`).join(';');
    if (chiave === this.chiaveBosco) return;
    this.chiaveBosco = chiave;
    r = arrotondato;
    this.raggio = arrotondato;
    this.bosco.clear();
    // dove Giada ha tolto qualcosa non ricresce niente
    // dove passano i sentieri verso i posti lontani il bosco si apre
    const tolto = (x: number, z: number, d = 0.9) => this.arredo.tolti.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < d) || sulSentiero(this.angoliSentieri, x, z, r - 1.2, 1.5 + d * 0.6);
    // dove c'è già qualcosa (case con i loro attrezzi, costruzioni, il nido...) la natura si fa da parte
    const piazzate = this.improntePiazzate(true);
    const sopra = (x: number, z: number, r: number) => piazzate.some((i) => !!spintaFuori(x, z, r + 0.1, i));
    for (const o of this.selvatici.children) o.visible = !tolto(o.position.x, o.position.z, 1.2) && !sopra(o.position.x, o.position.z, 0.45);
    let k = 0;
    for (let anello = 0; anello < 3; anello++) {
      const ra = r + 1.5 + anello * 2.6;
      const n = Math.round(ra * 1.9);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + anello * 0.37;
        // varco per il viale d'ingresso
        if (anello === 0 && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.22) continue;
        const vicino = anello === 0;
        const pino = (i + anello) % 3 === 0;
        const albero = pino ? creaPino(0.95 + ((i * 7) % 5) * 0.12, vicino) : creaAlbero(0.9 + ((i * 5) % 4) * 0.12, k++, vicino);
        albero.userData.pino = pino;
        const jitter = ((i * 13) % 7) / 10 - 0.3;
        const x = Math.cos(a) * (ra + jitter), z = Math.sin(a) * (ra + jitter);
        if (tolto(x, z, 1.1)) continue;
        // niente alberi sopra le case (e le loro postazioni) che stanno al limite del bosco
        if (occupati.some(([px, pz, d]) => d >= 3 && Math.hypot(x - px, z - pz) < d + 0.4)) continue;
        if (sopra(x, z, 1.0 * albero.scale.x)) continue; // né il tronco né la chioma dentro una casa
        albero.position.set(x, 0, z);
        albero.rotation.y = i;
        albero.userData.cosa = 'albero';
        this.bosco.add(albero);
      }
    }
    // natura selvatica: fiori, ciuffi d'erba alta, cespugli con bacche, funghi, tronchi caduti, sassi
    // (lontano dal centro e dai posti delle costruzioni, sempre negli stessi punti)
    const libero = (x: number, z: number) =>
      Math.hypot(x, z) > 3.2 && !tolto(x, z, 0.7) && occupati.every(([px, pz, d]) => Math.hypot(x - px, z - pz) > d) && !this.suSentiero(x, z) && !sopra(x, z, 0.55);
    const colori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb', '#ff7b6b', '#8fd3ff'];
    const area = r * r;
    const grosse: [number, number, number][] = this.bosco.children.filter((c) => c.userData.cosa === 'albero').map((c) => [c.position.x, c.position.z, 0.45]);
    const metti = (n: number, f: (i: number) => THREE.Object3D, seme: number, min = 3.2) => {
      for (let i = 0; i < n; i++) {
        const a = (i + seme) * 2.39996, d = min + (((i * 37 + seme * 11) % 100) / 100) * (r - min - 0.5);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!libero(x, z)) continue;
        // e le cose della natura non si mettono una dentro l'altra (un sasso dentro un cespuglio)
        const rr = seme === 3 ? 0.55 : seme === 5 ? 0.9 : seme === 6 ? 0.45 : 0;
        if (rr && grosse.some(([gx, gz, gr]) => Math.hypot(x - gx, z - gz) < rr + gr)) continue;
        if (rr) grosse.push([x, z, rr]);
        const o = f(i);
        o.userData.cosa = seme === 3 || seme === 5 ? 'cespuglio' : seme === 6 ? 'sasso' : 'piccolo';
        o.position.set(x, o.position.y, z);
        o.rotation.y = i * 1.7;
        this.bosco.add(o);
      }
    };
    // (prima era tutto troppo fitto: meno fiori e ciuffi sparsi, così c'è spazio per arredare)
    metti(Math.round(area * 0.11), (i) => { const f = creaFiore(colori[i % colori.length]); f.scale.setScalar(1 + (i % 3) * 0.2); return f; }, 1);
    metti(Math.round(area * 0.06), (i) => creaCiuffo(0.9 + (i % 4) * 0.2), 2);
    metti(Math.round(area * 0.025), (i) => creaCespuglio(0.8 + (i % 3) * 0.25, i), 3, 5);
    metti(Math.round(area * 0.02), (i) => creaFungo(1 + (i % 3) * 0.4), 4, 4);
    metti(Math.round(area * 0.012), () => creaTronco(), 5, 6);
    metti(Math.round(area * 0.02), (i) => creaSasso(0.4 + (i % 4) * 0.15), 6, 4);
  }

  private creaLucciole(): THREE.Points {
    const n = 60;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 10;
      pos.set([Math.cos(a) * r, 0.4 + Math.random() * 2, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff3a0', size: 0.16, transparent: true, opacity: 0, depthWrite: false, map: puntoTondo() }));
  }

  // ---------- stato del gioco → scena ----------

  /** Mette nella radura una costruzione comprata con le ghiande. */
  private metti(id: string, s: StatoGioco, nuova: boolean) {
    if (this.strutture.has(id)) return;
    let g: THREE.Object3D | null = null;
    const pos = POSTI_COSTRUZIONI[id];
    switch (id) {
      case 'sentiero':
        (this.matTerreno.userData.uniform as { uSentiero: { value: number } }).uSentiero.value = 1;
        g = new THREE.Group();
        break;
      case 'cartello': g = creaCartello(s.nomeVillaggio); break;
      case 'aiuola': g = creaAiuola(); break;
      case 'staccionata': g = creaStaccionata(1.55); break;
      case 'lanterne': {
        g = new THREE.Group();
        for (const [x, z] of [[-0.95, 3.4], [0.95, 3.4], [-2.6, -0.6], [2.6, -0.6], [-0.95, 6.5], [0.95, 6.5]]) {
          const l = creaLanterna();
          l.gruppo.position.set(x, 0, z);
          g.add(l.gruppo);
          this.lanterne.push(l.luce);
        }
        this.luceDelGiorno();
        break;
      }
      case 'panchina': g = creaPanchina(); break;
      case 'laghetto': g = creaLaghetto(); g.userData.bersaglio = { tipo: 'laghetto' }; break;
      case 'falo': { const f = creaFalo(); g = f.gruppo; this.fiamma = f.fiamma; break; }
      case 'ponticello': g = creaPonticello(); break;
      case 'pozzo': g = creaPozzo(); break;
      case 'torretta': g = creaTorretta(); break;
      case 'mulino': { const m = creaMulino(); g = m.gruppo; this.pale = m.pale; break; }
      case 'acquario': { this.acquario = new AcquarioInScena(); g = this.acquario.gruppo; g.userData.bersaglio = { tipo: 'acquario' }; break; }
    }
    if (!g) return;
    if (pos) {
      g.position.set(pos[0], 0, pos[1]);
      g.rotation.y = pos[2];
    }
    if (!FISSE.has(id)) g.userData.chiave = 'c:' + id;
    this.strutture.set(id, g);
    this.scene.add(g);
    if (nuova && id !== 'sentiero') {
      g.scale.setScalar(0.01);
      g.userData.cresce = 0;
      this.coriandoli(g.position.clone().setY(1), ['#f2c94c', '#ffffff', '#8fd3ff']);
    }
  }

  aggiorna(s: StatoGioco) {
    this.arredo = s.arredo ?? arredoVuoto();
    this.oggi = s.ultimoAccesso;
    this.ghiande = s.ghiande;
    this.ultimoStato = s;
    this.aggiornaCastagne(s.castagneMature ?? 0);
    this.conRichiesta = s.richiesta?.animale ?? null;
    const primaVolta = this.strutture.size === 0 && !this.giaAggiornata;
    for (const c of s.costruzioni) this.metti(c.id, s, !primaVolta);
    this.giaAggiornata = true;
    const visti = new Set<string>();
    s.animali.forEach((a, i) => {
      visti.add(a.id);
      if (a.fase === 'uovo' || this.trattenuti.has(a.id)) {
        this.togliAbitante(a.id);
        if (!this.uova.has(a.id)) {
          const u = creaUovo(COLORE_VIRTU[REGOLE.specieVirtu[a.specie]]);
          u.position.set(this.nido.position.x, 0.06, this.nido.position.z);
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
        if (this.schiusaIn?.id !== a.id) this.coriandoli(uovo.position.clone().setY(0.6), ['#ffd166', '#ff8fb1', '#7ccf6a', '#8fd3ff']);
      }
      let ab = this.abitanti.get(a.id);
      if (!ab) {
        const m = creaAnimale(a, !!defMestiere(a.mestiere) && !a.addormentato && this.momento() === 'lavoro');
        const pos = uovo?.position ?? new THREE.Vector3(Math.cos(i * 2.1) * 2.5, 0, Math.sin(i * 2.1) * 2.5);
        m.gruppo.position.set(pos.x, 0, pos.z);
        m.gruppo.userData.bersaglio = { tipo: 'animale', id: a.id };
        this.scene.add(m.gruppo);
        ab = {
          m, dati: a, meta: this.puntoCasuale(), pausa: 1 + Math.random() * 2, passo: Math.random() * 6, salto: uovo ? 1 : 0,
          ammicca: Math.random() * 4, z: [], eretto: 0, amico: null, incontro: 0, prossimoBalloon: 0, balloon: null,
          attivita: null, canna: null, mezzo: null, sveglio: 0, fermo: 0, distPrima: 0,
        };
        this.abitanti.set(a.id, ab);
      }
      ab.dati = a;
      // crescendo cambia il modello (corna, unghie, orecchie) e arrivano i vestiti: lo rifacciamo
      this.rifaiSeServe(ab);
      aggiornaMestiere(ab.m, a.mestiere);
      this.aggiornaSonno(ab);

      // chi ha un mestiere si costruisce la sua casa ai margini della radura: forma della sua specie,
      // colori della sua emozione, e crescendo la abbellisce
      if (a.mestiere) {
        const emo = a.emozione ?? emozioneDellaPagina(null, a);
        const livello = a.livelloCasa ?? 1;
        const firma = `${a.specie}|${emo}|${a.fase}|${a.mestiere}|${livello}`;
        const vecchia = this.botteghe.get(a.id);
        if (!vecchia || vecchia.userData.firma !== firma) {
          const b = creaCasaAnimale(a.specie, emo, a.fase, a.mestiere, livello);
          b.userData.livello = livello;
          // quanto spazio prende la casa (per non passarci attraverso): la sagoma, più la stanza in più
          b.userData.ingombroCasa = (SAGOMA_CASA[a.specie]?.mezza ?? 1.1) + 0.15 + (livello >= 3 ? 0.35 : 0);
          b.userData.bersaglio = { tipo: 'bottega', id: a.id };
          b.userData.firma = firma;
          if (vecchia) {
            b.position.copy(vecchia.position);
            b.rotation.copy(vecchia.rotation);
            this.scene.remove(vecchia);
            // casa migliorata da Giada: festa di coriandoli
            if (livello > ((vecchia.userData.livello as number) ?? 1)) this.coriandoli(b.position.clone().setY(2), ['#ffd166', '#ff8fb1', '#7ccf6a', '#ffffff']);
          } else if (this.giaAggiornata) this.coriandoli(new THREE.Vector3(0, 1, 0), ['#f2c94c', '#ffffff']);
          this.botteghe.set(a.id, b);
          this.scene.add(b);
        }
      }
    });
    for (const id of [...this.abitanti.keys()]) if (!visti.has(id)) this.togliAbitante(id);
    this.sistemaUova();

    // posti degli edifici e delle botteghe: ben distanziati, dietro e ai lati della radura (mai sul viale d'ingresso)
    const raggio = raggioVillaggio(s);
    const posti = [...s.edifici.map((e) => 'e:' + e.tipo), ...[...this.botteghe.keys()].map((id) => 'b:' + id)];
    // chi ha già un posto (scelto da Giada o fissato) resta lì; le case nuove cercano un posto libero,
    // lontano dalle altre, senza far spostare quelle che ci sono già
    const presi: [number, number][] = posti.filter((k) => this.arredo.posti[k]).map((k) => [this.arredo.posti[k].x, this.arredo.posti[k].z]);
    for (const [id, d] of Object.entries(POSTI_COSTRUZIONI)) if (this.strutture.has(id) && id !== 'acquario') presi.push([this.arredo.posti['c:' + id]?.x ?? d[0], this.arredo.posti['c:' + id]?.z ?? d[1]]);
    // l'acquario è grande: finché Giada non sceglie, sta in disparte al bordo della radura, come una casa
    let postoAcquario: Posto | null = null;
    if (this.strutture.has('acquario')) {
      const pa = this.arredo.posti['c:acquario'];
      if (pa) presi.push([pa.x, pa.z]);
      else {
        const [x, z] = postiCase(posti.length + 40, raggio).find(([x, z]) => presi.every(([px, pz]) => Math.hypot(x - px, z - pz) > 9.5)) ?? [POSTI_COSTRUZIONI.acquario[0], POSTI_COSTRUZIONI.acquario[1]];
        postoAcquario = { x, z, r: Math.atan2(-x, -z) };
        presi.push([x, z]);
      }
    }
    const candidati = postiCase(posti.length + 30, raggio);
    const automatici = posti.map(() => [0, 0] as [number, number]);
    posti.forEach((k, i) => {
      if (this.arredo.posti[k]) return;
      const libero = candidati.find(([x, z]) => presi.every(([px, pz]) => Math.hypot(x - px, z - pz) > 7.8)) ?? candidati[i];
      automatici[i] = libero;
      presi.push(libero);
    });
    posti.forEach((k, i) => {
      let g: THREE.Group;
      if (k.startsWith('e:')) {
        const tipo = k.slice(2);
        let e3 = this.edifici.get(tipo);
        if (!e3) {
          e3 = tipo === 'chiosco' ? creaChiosco() : creaPiazzaMusica();
          e3.userData.bersaglio = { tipo: 'edificio', tipo_edificio: tipo };
          this.edifici.set(tipo, e3);
          this.scene.add(e3);
        }
        g = e3;
        const e = s.edifici.find((x) => x.tipo === tipo)!;
        g.userData.storto = e.stato === 'fermo' ? 0.04 : 0;
      } else g = this.botteghe.get(k.slice(2))!;
      g.userData.chiave = k;
      const [x, z] = automatici[i];
      this.posiziona(g, k, { x, z, r: Math.atan2(-x, -z) });
      g.rotation.z = (g.userData.storto as number) ?? 0;
    });

    // cose di Giada: il castagno, le costruzioni spostate, le aiuole, i quadretti, il sentiero
    this.castagno.userData.chiave = 'castagno';
    this.posiziona(this.castagno, 'castagno', { x: POSTO_CASTAGNO[0], z: POSTO_CASTAGNO[1], r: 0 });
    this.castagne.position.copy(this.castagno.position);
    for (const [id, g] of this.strutture) {
      if (FISSE.has(id)) continue;
      const d = POSTI_COSTRUZIONI[id] ?? [0, 0, 0];
      // il ponticello segue il laghetto, se non l'ha spostato a parte
      const base = id === 'acquario' && postoAcquario ? postoAcquario : id === 'ponticello' && this.arredo.posti['c:laghetto'] && !this.arredo.posti['c:ponticello']
        ? { ...this.arredo.posti['c:laghetto'], r: this.arredo.posti['c:laghetto'].r + Math.PI / 2 + 0.15 } : { x: d[0], z: d[1], r: d[2] };
      this.posiziona(g, 'c:' + id, base);
    }
    this.aggiornaAiuole();
    this.aggiornaQuadri();
    this.aggiornaOggetti();
    this.aggiornaSentiero(s);
    this.raggio = Math.max(this.raggio, Math.round(raggio * 2) / 2);
    this.risolviPosti();
    // i sentieri verso i posti lontani scoperti dal castoro (dove non c'è una casa davanti)
    const scoperti = biomiScoperti(s);
    const angoli = this.angoliPerSentieri(scoperti);
    this.angoliSentieri = scoperti.map((b) => angoli.get(b.id)!);
    this.allarga(raggio);
    const nuovi = this.sentieri.aggiorna(scoperti, this.raggio, angoli);
    if (this.giaAggiornataSentieri) for (const b of nuovi) { const p = this.sentieri.portale(b.id); if (p) this.coriandoli(p.getWorldPosition(new THREE.Vector3()).setY(2.4), ['#f2c94c', '#ffffff', b.colore]); }
    this.giaAggiornataSentieri = true;
    this.acquario?.aggiornaPesci(s.acquario?.pesci ?? []);
    this.castoro.aggiorna(s.castoro, s.ultimoAccesso, this.bosco, this.raggio);
  }

  /**
   * Le uova nel nido una accanto all'altra, mai una dentro l'altra: una in mezzo, le altre in cerchio;
   * se sono tante si fanno un po' più piccole (il nido è uno solo).
   */
  private sistemaUova() {
    const uova = [...this.uova.values()].filter((u) => u !== this.schiusaIn?.uovo);
    const n = uova.length;
    if (!n) return;
    const largo = 0.62; // un uovo è largo 0,6 m
    const dentro = 0.62 * this.nido.scale.x; // il fondo del nido, fino al bordo di paglia
    // quante ne stanno sul giro intorno a quella in mezzo
    const giro = Math.floor((2 * Math.PI * dentro) / largo);
    const scala = n <= 1 + giro ? 1 : Math.max(0.55, Math.sqrt((1 + giro) / n));
    const sul = n === 1 ? 0 : n <= 4 ? n : n - 1;
    const r = n === 1 ? 0 : n === 2 ? (largo * scala) / 2 + 0.01 : Math.min(dentro, (largo * scala) / (2 * Math.sin(Math.PI / sul)) + 0.01);
    uova.forEach((u, i) => {
      const inMezzo = n > 4 && i === n - 1;
      const a = (i / sul) * Math.PI * 2 + 0.4;
      const rr = inMezzo ? 0 : r;
      u.position.set(this.nido.position.x + Math.cos(a) * rr, 0.06, this.nido.position.z + Math.sin(a) * rr);
      u.scale.setScalar(scala);
    });
  }

  /** Mette un oggetto dove l'ha voluto Giada, oppure al suo posto di sempre. */
  private posiziona(g: THREE.Object3D, chiave: string, base: Posto) {
    const p = this.arredo.posti[chiave] ?? base;
    if (this.spostando === chiave) return; // lo sta trascinando col dito
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.r;
  }

  private aggiornaAiuole() {
    const viste = new Set<string>();
    for (const a of this.arredo.aiuole) {
      viste.add(a.id);
      const firma = a.piante.map((p) => (p ? p.specie + fasePianta(p, this.oggi) : '-')).join(',');
      let g = this.aiuole.get(a.id);
      if (g && g.userData.firma !== firma) {
        this.scene.remove(g);
        g = undefined;
      }
      if (!g) {
        const nuova = this.aiuoleCaricate && !this.aiuole.has(a.id);
        g = creaCassetta();
        a.piante.forEach((p, i) => {
          if (!p) return;
          const def = PIANTE.find((d) => d.id === p.specie);
          const pi = creaPianta(p.specie, def?.colore ?? '#ffffff', fasePianta(p, this.oggi));
          pi.position.set(POSTI_CASSETTA[i], 0.24, 0);
          g!.add(pi);
        });
        g.userData = { firma, chiave: 'a:' + a.id, bersaglio: { tipo: 'aiuola', id: a.id } };
        this.aiuole.set(a.id, g);
        this.scene.add(g);
        if (nuova) this.coriandoli(new THREE.Vector3(a.x, 0.8, a.z), ['#7ccf6a', '#ffd166']);
      }
      if (this.spostando !== 'a:' + a.id) {
        g.position.set(a.x, 0, a.z);
        g.rotation.y = a.r;
      }
    }
    for (const [id, g] of this.aiuole) if (!viste.has(id)) { this.scene.remove(g); this.aiuole.delete(id); }
    this.aiuoleCaricate = true;
  }

  private aggiornaQuadri() {
    const visti = new Set<string>();
    for (const q of this.arredo.quadretti) {
      visti.add(q.id);
      let g = this.quadri.get(q.id);
      if (!g) {
        g = creaQuadretto(q.disegno, q.cornice);
        g.userData.chiave = 'q:' + q.id;
        g.userData.bersaglio = { tipo: 'quadretto', id: q.id };
        this.quadri.set(q.id, g);
        this.scene.add(g);
      }
      if (this.spostando !== 'q:' + q.id) {
        g.position.set(q.x, 0, q.z);
        g.rotation.y = q.r;
      }
    }
    for (const [id, g] of this.quadri) if (!visti.has(id)) { this.scene.remove(g); this.quadri.delete(id); }
  }

  private aggiornaOggetti() {
    const visti = new Set<string>();
    for (const o of this.arredo.oggetti ?? []) {
      visti.add(o.id);
      let g = this.oggetti.get(o.id);
      if (g && g.userData.testo !== (o.testo ?? '')) { this.scene.remove(g); g = undefined; }
      if (!g) {
        g = o.tipo === 'cartello' ? creaCartelloVia(o.testo ?? '') : creaRecinto();
        g.userData.chiave = 'o:' + o.id;
        g.userData.testo = o.testo ?? '';
        this.oggetti.set(o.id, g);
        this.scene.add(g);
      }
      if (this.spostando !== 'o:' + o.id) {
        g.position.set(o.x, 0, o.z);
        g.rotation.y = o.r;
      }
    }
    for (const [id, g] of this.oggetti) if (!visti.has(id)) { this.scene.remove(g); this.oggetti.delete(id); }
  }

  /** Il sentiero: quello di base (anello + viale) o quello disegnato da Giada. */
  private aggiornaSentiero(s: StatoGioco) {
    const u = this.matTerreno.userData.uniform as { uSentiero: { value: number }; tSentiero: { value: THREE.DataTexture } };
    const sent = this.arredo.sentiero;
    u.uSentiero.value = !sent && s.costruzioni.some((c) => c.id === 'sentiero') ? 1 : 0;
    const chiave = sent ? Object.keys(sent).length + ':' + JSON.stringify(sent).length + ':' + JSON.stringify(sent).slice(-60) : '';
    if (chiave === this.chiaveSentiero) return;
    this.chiaveSentiero = chiave;
    const tex = u.tSentiero.value;
    const dati = tex.image.data as Uint8Array;
    dati.fill(0);
    const h = LATO_SENTIERO / 2;
    for (const [k, m] of Object.entries(sent ?? {})) {
      const [i, j] = k.split(',').map(Number);
      const idx = ((j + h) * LATO_SENTIERO + (i + h)) * 4 + (m - 1);
      if (m >= 1 && m <= 4 && idx >= 0 && idx < dati.length) dati[idx] = 255;
    }
    tex.needsUpdate = true;
  }

  /** C'è il sentiero disegnato in questo punto? (lì non spuntano fiori e sassi) */
  private suSentiero(x: number, z: number): boolean {
    const sent = this.arredo.sentiero;
    if (!sent) return false;
    return !!sent[`${Math.floor(x / CELLA)},${Math.floor(z / CELLA)}`];
  }

  /** Tutte le cose che Giada può spostare, con la loro chiave. */
  private mobili(): Map<string, THREE.Object3D> {
    const m = new Map<string, THREE.Object3D>();
    m.set('castagno', this.castagno);
    for (const [id, g] of this.strutture) if (!FISSE.has(id)) m.set('c:' + id, g);
    for (const [tipo, g] of this.edifici) m.set('e:' + tipo, g);
    for (const [id, g] of this.botteghe) m.set('b:' + id, g);
    for (const [id, g] of this.aiuole) m.set('a:' + id, g);
    for (const [id, g] of this.quadri) m.set('q:' + id, g);
    for (const [id, g] of this.oggetti) m.set('o:' + id, g);
    return m;
  }

  /** Dove le cose occupano spazio: lì non crescono fiori e cespugli. [x, z, distanza] */
  private occupati(): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (const [k, o] of this.mobili()) {
      const d = k.startsWith('o:') ? 0.8 : k.startsWith('q:') ? 0.9 : k.startsWith('a:') ? 1.3 : k === 'castagno' ? 2.6 : k.startsWith('b:') || k === 'c:acquario' ? 3.8 : k.startsWith('e:') ? 3 : 2.2;
      out.push([o.position.x, o.position.z, d]);
    }
    return out;
  }

  /** Posto attuale di una cosa (per i pulsanti "ruota" della schermata). */
  postoDi(chiave: string): Posto | null {
    const o = this.mobili().get(chiave);
    return o ? { x: o.position.x, z: o.position.z, r: o.rotation.y } : null;
  }

  /** Case e edifici che non hanno ancora un posto deciso (sono nel posto automatico). */
  caseSenzaPosto(): string[] {
    return [...[...this.edifici.keys()].map((t) => 'e:' + t), ...[...this.botteghe.keys()].map((id) => 'b:' + id), ...(this.acquario ? ['c:acquario'] : [])].filter((k) => !this.arredo.posti[k]);
  }

  /** Sceglie (o toglie la scelta) di una cosa da spostare. */
  seleziona(chiave: string | null) {
    this.selezionato = chiave;
  }

  /** Un punto libero davanti alla telecamera, per mettere una cosa nuova. */
  puntoLibero(): { x: number; z: number } {
    const occ = this.occupati();
    for (let giro = 0; giro < 40; giro++) {
      const a = giro * 2.4, d = giro * 0.35;
      const x = Math.round((this.centro.x + Math.cos(a) * d) * 2) / 2, z = Math.round((this.centro.z + Math.sin(a) * d) * 2) / 2;
      if (Math.hypot(x, z) < 2.6 || Math.hypot(x, z) > this.raggio - 1.5) continue;
      if (occ.every(([px, pz, dd]) => Math.hypot(x - px, z - pz) > Math.min(dd, 1.8))) return { x, z };
    }
    return { x: 1.5, z: 2.5 };
  }

  private virtuMestiere(m: string): Virtu {
    return virtuMestiere(m) ?? 'saggezza';
  }

  /** Durante le ore di lavoro chi ha un mestiere si mette la divisa; la sera torna con i suoi vestiti. */
  private vuoleDivisa(ab: Abitante): boolean {
    return !!defMestiere(ab.dati.mestiere) && !ab.dati.addormentato && this.momento() === 'lavoro';
  }

  /** Rifà il modello dell'animale se è cresciuto, ha vestiti nuovi o deve cambiarsi (divisa da lavoro). */
  private rifaiSeServe(ab: Abitante) {
    if (this.pescata?.id === ab.dati.id) return; // mentre pesca tiene il modello che ha
    const a = ab.dati;
    const divisa = this.vuoleDivisa(ab);
    const chiave = `${a.fase}|${(a.vestiti ?? []).join(',')}|${a.mestiere ?? ''}|${divisa ? 'divisa' : ''}`;
    if (ab.m.gruppo.userData.chiave !== undefined && ab.m.gruppo.userData.chiave !== chiave) {
      const vecchio = ab.m.gruppo;
      const m = creaAnimale(a, divisa);
      m.gruppo.position.copy(vecchio.position);
      m.gruppo.rotation.copy(vecchio.rotation);
      m.gruppo.userData.bersaglio = vecchio.userData.bersaglio;
      if (ab.canna) { ab.canna.parent?.remove(ab.canna); ab.canna = null; }
      if (ab.mezzo) { ab.mezzo.parent?.remove(ab.mezzo); ab.mezzo = null; }
      for (const z of ab.z) z.parent?.remove(z);
      ab.z = [];
      this.scene.remove(vecchio);
      this.scene.add(m.gruppo);
      ab.m = m;
      if (ab.attivita?.id === 'lavoro' && ab.m.accessorio) ab.m.accessorio.visible = true;
    }
    ab.m.gruppo.userData.chiave = chiave;
    // i cuccioli hanno già testa grande e corpo corto (vedi creaAnimale); qui cresce solo un po' la grandezza
    // (erano un po' giganti accanto alle case: ora un quarto più piccoli)
    const scala = ({ cucciolo: 0.86, giovane: 0.92, adulto: 0.96, maestro: 1.0, uovo: 1 } as const)[a.fase];
    ab.m.gruppo.scale.setScalar(scala * ((ab.m.gruppo.userData.taglia as number) ?? 1));
    const proporzione = ({ cucciolo: 1.12, giovane: 1.0, adulto: 0.9, maestro: 0.9, uovo: 1 } as const)[a.fase];
    ab.m.testa.scale.setScalar(proporzione);
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
        const z = spriteTesto('z', '#ffffff');
        z.scale.setScalar(0.25 + i * 0.07);
        ab.m.gruppo.add(z);
        ab.z.push(z);
      }
    } else if (!dorme && ab.z.length) {
      ab.z.forEach((z) => ab.m.gruppo.remove(z));
      ab.z = [];
    }
  }

  private zeta(ab: Abitante, accese: boolean) {
    if (accese && !ab.z.length) {
      for (let i = 0; i < 3; i++) {
        const z = spriteTesto('z', '#ffffff');
        z.scale.setScalar(0.25 + i * 0.07);
        ab.m.gruppo.add(z);
        ab.z.push(z);
      }
    } else if (!accese && ab.z.length) {
      ab.z.forEach((z) => ab.m.gruppo.remove(z));
      ab.z = [];
    }
  }

  private dormi(ab: Abitante, dt: number, t: number) {
    ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 1.25, dt * 2);
    ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, -0.05, dt * 2);
    ab.m.corpo.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
    ab.z.forEach((z, i) => {
      const f = (t * 0.5 + i / 3) % 1;
      z.position.set(0.3 + f * 0.3, 0.9 + f * 0.9, 0);
      z.material.opacity = 1 - f;
    });
  }

  /** Il castoro sta dormendo? (di notte sì) */
  get castoroDorme(): boolean {
    return this.castoro.addormentato;
  }

  /** Che momento della giornata è (ora vera, o quella finta delle prove). */
  momento(): 'mattina' | 'lavoro' | 'pranzo' | 'sera' | 'notte' {
    const ora = new Date();
    const h = this.oraFinta ?? ora.getHours() + ora.getMinutes() / 60;
    if (h >= 21.5 || h < 7) return 'notte';
    if (h < 9) return 'mattina';
    if (h >= 12.5 && h < 14) return 'pranzo';
    if (h >= 18) return 'sera';
    return 'lavoro';
  }

  /** Dove dorme: davanti alla sua casa se ce l'ha, altrimenti con i piccoli vicino al nido. */
  private casa(ab: Abitante): THREE.Vector3 {
    const b = this.botteghe.get(ab.dati.id);
    // davanti alla porta (le case sono grandi e Giada può averle girate)
    if (b) return new THREE.Vector3(Math.sin(b.rotation.y), 0, Math.cos(b.rotation.y)).multiplyScalar(Math.max(2.2, ((b.userData.ingombroCasa as number) ?? 1.5) + 0.55)).add(b.position).setY(0);
    // senza casa: intorno al nido, fuori dal bordo di paglia (e dalla staccionata, se c'è), ognuno al suo posto
    const senza = [...this.abitanti.values()].filter((b) => !this.botteghe.has(b.dati.id)).map((b) => b.dati.id).sort();
    const i = Math.max(0, senza.indexOf(ab.dati.id));
    const r0 = (this.strutture.has('staccionata') ? 1.6 : 1.0 * this.nido.scale.x) + 0.55;
    const giro = Math.floor(i / 9), r = r0 + giro * 0.9;
    const ang = (i % 9) * ((Math.PI * 2) / 9) + giro * 0.35 + 2.2; // il primo dalla parte opposta al grande albero
    return new THREE.Vector3(this.nido.position.x + Math.cos(ang) * r, 0, this.nido.position.z + Math.sin(ang) * r);
  }

  private fineAttivita(ab: Abitante) {
    if (ab.m.accessorio?.userData.grembiule) ab.m.accessorio.visible = false;
    ab.attivita = null;
    ab.m.corpo.rotation.x = 0;
    if (ab.mezzo) {
      ab.mezzo.parent?.remove(ab.mezzo);
      ab.mezzo = null;
    }
    if (ab.canna) {
      ab.canna.parent?.remove(ab.canna);
      ab.canna = null;
    }
  }

  private puntoCasuale(): THREE.Vector3 {
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * Math.max(2, this.raggio - 2.2);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  // ---------- festa di compleanno ----------

  /** Addobba il villaggio per il compleanno di Giada (o toglie gli addobbi). */
  impostaFesta(on: boolean, candeleSpente = false) {
    if (on && !this.festa) {
      this.festa = new Festa(this.scene, this.raggio || 12);
      if (candeleSpente) this.festa.spegni();
    }
    if (!on && this.festa) {
      this.festa.distruggi();
      this.festa = null;
      for (const ab of this.abitanti.values()) {
        ab.m.testa.getObjectByName('cappellinoFesta')?.removeFromParent();
        ab.m.testa.userData.festa = false;
      }
    }
  }

  /** Tutti gli animali svegli vanno intorno alla tavola (o tornano alle loro cose). */
  radunaFesta(on: boolean) {
    if (!this.festa) return;
    this.festa.raduno = on;
    if (on) {
      const ids = [...this.abitanti.values()].filter((ab) => !ab.dati.addormentato).map((ab) => ab.dati.id);
      this.festa.sistemaInvitati(ids);
      for (const ab of this.abitanti.values()) {
        if (ab.attivita) this.fineAttivita(ab);
        if (ab.amico) { const b = this.abitanti.get(ab.amico); if (b) b.amico = null; ab.amico = null; }
        ab.pausa = Math.random() * 0.5;
      }
    } else for (const ab of this.abitanti.values()) ab.pausa = Math.random() * 2;
  }

  /** Giada soffia sulle candeline: si spengono, partono i fuochi, tutti saltano. */
  soffiaCandeline() {
    if (!this.festa) return;
    this.festa.soffia();
    this.coriandoli(POSTO_TORTA.clone().setY(1.6), ['#ff6b8a', '#ffd166', '#7ccf6a', '#8fd3ff', '#c39bff', '#ffffff']);
    this.coriandoli(POSTO_TORTA.clone().setY(1.2), ['#ff6b8a', '#ffd166', '#ffffff']);
    this.festeggia();
    this.vibra([30, 60, 30]);
  }

  /** Primo piano sulla tavola della festa: da lontano (tutto il villaggio in festa), da vicino (la torta) o verso il cielo (i fuochi). */
  inquadraFesta(vicino: boolean | 'cielo') {
    const p = POSTO_TORTA.clone();
    for (const ab of this.abitanti.values()) if (ab.pausa > 100) ab.pausa = 0; // chi era in primo piano torna al suo posto
    this.cine = vicino === 'cielo'
      ? { segui: () => p, dist: 9.5, alt: 1.8, guardaY: 4.2, angolo: 0 } // dal basso, per vedere i fuochi
      : vicino
      ? { segui: () => p, dist: 3.4, alt: 1.6, guardaY: 1.1, angolo: 0 }
      : { segui: () => p, dist: 8.5, alt: 3.6, guardaY: 1.2, angolo: 0 };
  }

  private mettiCappellino(ab: Abitante) {
    const testa = ab.m.testa;
    testa.userData.festa = true;
    if (ab.dati.fase === 'uovo') return;
    // in cima alla testa (sopra un eventuale cappello che ha già)
    testa.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(testa);
    const cima = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y - (box.max.y - box.min.y) * 0.08, (box.min.z + box.max.z) / 2);
    testa.worldToLocal(cima);
    const c = cappellinoDiFesta(hash(ab.dati.id));
    c.position.copy(cima);
    c.raycast = () => {};
    c.traverse((o) => (o.raycast = () => {}));
    testa.add(c);
  }

  /** Alla festa: va al suo posto intorno alla tavola; arrivato guarda la torta e, dopo le candeline, balla. */
  private alPostoDiFesta(ab: Abitante, dt: number, t: number): boolean {
    const posto = this.festa?.postoDi(ab.dati.id);
    if (!posto) return false;
    const g = ab.m.gruppo;
    if (ab.amico) ab.amico = null;
    if (ab.attivita) this.fineAttivita(ab);
    if (g.position.distanceTo(posto) > 0.2) {
      if (ab.meta.distanceTo(posto) > 0.01) ab.meta.copy(posto);
      ab.pausa = Math.min(ab.pausa, 0);
      return false; // ci va con il passo di sempre
    }
    const verso = Math.atan2(POSTO_TORTA.x - g.position.x, POSTO_TORTA.z - g.position.z);
    const diff = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
    g.rotation.y += diff * Math.min(1, dt * 5);
    ab.m.zampe.forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, 0, dt * 6)));
    if (this.festa!.balla) {
      // si balla: saltelli a ritmo, braccia in su, note musicali
      const k = t * 5 + hash(ab.dati.id);
      ab.m.corpo.position.y = Math.abs(Math.sin(k)) * 0.14;
      ab.m.corpo.rotation.z = Math.sin(k * 0.5) * 0.12;
      if (ab.eretto > 0.5) ab.m.zampe.slice(0, 2).forEach((z, i) => (z.rotation.x = -2.2 + Math.sin(k + i * Math.PI) * 0.5));
      ab.prossimoBalloon -= dt;
      if (ab.prossimoBalloon <= 0) {
        ab.prossimoBalloon = 1.4 + Math.random() * 2;
        this.fumetto(ab, ['♪', '♫', '♥', '♪'][Math.floor(Math.random() * 4)]);
      }
    } else {
      ab.m.corpo.position.y = Math.sin(t * 2.2 + g.position.x) * 0.012;
      ab.m.testa.rotation.x = Math.sin(t * 1.5 + g.position.z) * 0.06;
    }
    return true;
  }

  // ---------- effetti ----------

  festeggia() {
    for (const ab of this.abitanti.values()) {
      ab.salto = 1 + Math.random() * 0.3;
      const cuore = spriteTesto('♥', '#ff6b8a');
      cuore.scale.setScalar(0.45);
      cuore.position.copy(ab.m.gruppo.position).add(new THREE.Vector3(0, 1.6 * ab.m.gruppo.scale.x, 0));
      this.scene.add(cuore);
      this.effimeri.push({ o: cuore, vita: 1.6, vel: new THREE.Vector3(0, 0.7, 0) });
    }
  }

  /** Solo per le prove: fa passare il tempo degli animali senza disegnare (utile se la pagina è nascosta). */
  avanzaTempo(secondi: number, finche?: () => boolean) {
    const dt = 1 / 30;
    for (let k = 0; k < secondi * 30; k++) {
      this.tempoFinto += dt;
      for (const ab of this.abitanti.values()) this.muovi(ab, dt, this.tempoFinto);
      this.fisica(dt);
      if (finche?.()) return true;
    }
    return false;
  }
  private tempoFinto = 0;

  /** Solo per le prove: mette in fila un animale per specie davanti alla telecamera. */
  vetrina() {
    let i = 0;
    for (const ab of this.abitanti.values()) {
      ab.m.gruppo.position.set(-2.6 + (i % 3) * 2.6, 0, -1 + Math.floor(i / 3) * 2.6);
      ab.m.gruppo.rotation.y = 0;
      ab.pausa = 999;
      i++;
    }
    this.angolo = 0;
    this.velAngolo = 0;
    this.zoom = 0.55;
  }

  faiParlareCorvo(secondi = 2) {
    this.corvoParla = secondi;
  }

  private coriandoli(dove: THREE.Vector3, colori: string[]) {
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), mat(colori[i % colori.length], { rim: 0 }));
      p.position.copy(dove);
      this.scene.add(p);
      this.effimeri.push({ o: p, vita: 1.4, vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 3) });
    }
  }

  // ---------- input: un dito sposta la vista, due dita zoom e rotazione ----------

  private collegaInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (this.cine) return;
      this.dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.dita.size === 1) {
        this.trascina = { x: e.clientX, y: e.clientY, mosso: 0 };
        this.iniziaArredo(e.clientX, e.clientY);
      } else {
        this.distanzaPizzico = this.distanzaDita();
        this.angoloDita = this.angoloTraDita();
        this.mezzoDita = this.mezzo();
        if (this.trascina) this.trascina.dipinge = false;
        this.finisciSpostamento();
      }
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.dita.has(e.pointerId)) return;
      this.dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.dita.size >= 2) {
        const d = this.distanzaDita();
        if (this.distanzaPizzico) this.zoom = THREE.MathUtils.clamp(this.zoom * (this.distanzaPizzico / d), 0.5, 2.4);
        this.distanzaPizzico = d;
        const a = this.angoloTraDita();
        let da = a - this.angoloDita;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        this.angolo -= da;
        this.angoloDita = a;
        if (this.trascina) this.trascina.mosso = 99;
        // con due dita si sposta anche la vista (serve quando un dito disegna il sentiero)
        const m = this.mezzo();
        if (this.mezzoDita) this.panoramica(m.x - this.mezzoDita.x, m.y - this.mezzoDita.y);
        this.mezzoDita = m;
        return;
      }
      if (!this.trascina) return;
      const dx = e.clientX - this.trascina.x, dy = e.clientY - this.trascina.y;
      this.trascina.mosso += Math.abs(dx) + Math.abs(dy);
      this.trascina.x = e.clientX;
      this.trascina.y = e.clientY;
      if (this.trascina.dipinge) {
        const p = this.puntoSuolo(e.clientX, e.clientY);
        if (p && (!this.trascina.ultimo || p.distanceTo(this.trascina.ultimo) > 0.2)) {
          this.trascina.ultimo = p;
          this.onArredo({ tipo: 'dipingi', x: p.x, z: p.z });
        }
        return;
      }
      if (this.spostando) {
        const p = this.puntoSuolo(e.clientX, e.clientY);
        const o = this.mobili().get(this.spostando);
        if (p && o) {
          this.limita(p);
          o.position.set(Math.round(p.x * 2) / 2, 0, Math.round(p.z * 2) / 2);
        }
        return;
      }
      this.panoramica(dx, dy);
    });
    const fine = (e: PointerEvent) => {
      this.dita.delete(e.pointerId);
      const t = this.trascina;
      if (this.dita.size < 2) this.mezzoDita = null;
      if (this.dita.size === 0) {
        this.trascina = null;
        this.finisciSpostamento();
        if (t && t.mosso < 8 && e.type === 'pointerup' && !t.dipinge) {
          if (this.modo) this.toccaArredo(e.clientX, e.clientY);
          else this.tocca(e.clientX, e.clientY);
        }
      }
    };
    c.addEventListener('pointerup', fine);
    c.addEventListener('pointercancel', fine);
    c.addEventListener('wheel', (e) => {
      if (this.cine) return;
      this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.5, 2.4);
    }, { passive: true });
  }

  /** Sposta il punto guardato sul terreno, nella direzione del dito. */
  private panoramica(dx: number, dy: number) {
    const k = 0.022 * this.zoom * (12 / Math.max(300, this.canvas.clientWidth)) * 30;
    const destra = new THREE.Vector3(Math.cos(this.angolo), 0, -Math.sin(this.angolo));
    const avanti = new THREE.Vector3(-Math.sin(this.angolo), 0, -Math.cos(this.angolo));
    this.centroVoluto.addScaledVector(destra, -dx * k).addScaledVector(avanti, dy * k);
    const lim = this.raggio - 1;
    if (this.centroVoluto.length() > lim) this.centroVoluto.setLength(lim);
  }

  private mezzo() {
    const [a, b] = [...this.dita.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private limita(p: THREE.Vector3) {
    const lim = Math.max(3, this.raggio - 1);
    if (p.length() > lim) p.setLength(lim);
  }

  /**
   * Il punto del prato sotto il dito. Il mondo è curvato nello shader (si abbassa con la distanza
   * dalla telecamera): correggo con qualche iterazione, così il dito e il sentiero coincidono.
   */
  private puntoSuolo(x: number, y: number): THREE.Vector3 | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const piano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(piano, p)) return null;
    const vista = this.camera.matrixWorldInverse;
    const rot = new THREE.Matrix4().extractRotation(this.camera.matrixWorld);
    for (let i = 0; i < 4; i++) {
      const v = p.clone().applyMatrix4(vista);
      const giu = new THREE.Vector3(0, -v.z * v.z * CURVA.valore, 0).applyMatrix4(rot); // spostamento del disegno
      const r2 = new THREE.Ray(ray.ray.origin.clone().sub(giu), ray.ray.direction);
      if (!r2.intersectPlane(piano, p)) break;
    }
    return p;
  }

  /** Inizio di un tocco mentre si arreda: si disegna il sentiero o si trascina la cosa scelta. */
  private iniziaArredo(x: number, y: number) {
    if (!this.modo || !this.trascina) return;
    const p = this.puntoSuolo(x, y);
    if (!p) return;
    if (this.modo === 'sentiero') {
      this.trascina.dipinge = true;
      this.trascina.ultimo = p;
      this.onArredo({ tipo: 'dipingi', x: p.x, z: p.z });
      return;
    }
    if (this.modo === 'sposta' && this.selezionato) {
      const o = this.mobili().get(this.selezionato);
      if (o && Math.hypot(o.position.x - p.x, o.position.z - p.z) < 1.6) {
        this.spostando = this.selezionato;
        this.trascina.mosso = 99;
      }
    }
  }

  private finisciSpostamento() {
    if (!this.spostando) return;
    const k = this.spostando;
    this.spostando = null;
    const o = this.mobili().get(k);
    if (!o) return;
    // lasciata sopra qualcos'altro: scivola nel posto libero più vicino
    const p = this.postoSenzaUrti(k, o, o.position.x, o.position.z) ?? { x: o.position.x, z: o.position.z };
    this.onArredo({ tipo: 'sposta', chiave: k, posto: { x: p.x, z: p.z, r: o.rotation.y } });
  }

  /** Quale cosa c'è sotto il dito (o vicinissima), tra quelle date. */
  private cosaSotto<T extends THREE.Object3D>(x: number, y: number, cose: Iterable<[string, T]>, vicino = 1.3): string | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const lista = [...cose];
    const hit = ray.intersectObjects(lista.map(([, o]) => o), true)[0];
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const trovato = lista.find(([, c]) => c === o);
        if (trovato) return trovato[0];
        o = o.parent;
      }
    }
    const p = this.puntoSuolo(x, y);
    if (!p) return null;
    let meglio: string | null = null, dm = vicino;
    for (const [k, o] of lista) {
      const d = Math.hypot(o.position.x - p.x, o.position.z - p.z);
      if (d < dm) { dm = d; meglio = k; }
    }
    return meglio;
  }

  /** Dove si vede un punto sullo schermo (in pixel della pagina), tenendo conto della curva del mondo. */
  private aSchermo(p: THREE.Vector3): { x: number; y: number; davanti: boolean } {
    const r = this.canvas.getBoundingClientRect();
    const v = p.clone().applyMatrix4(this.camera.matrixWorldInverse);
    const davanti = v.z < 0;
    v.y -= v.z * v.z * CURVA.valore;
    v.applyMatrix4(this.camera.projectionMatrix);
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, davanti };
  }

  /** L'albero, il cespuglio o il sasso che il dito sta toccando: il più vicino al dito tra quelli visibili. */
  private naturaSottoIlDito(x: number, y: number, cose: THREE.Object3D[]): THREE.Object3D | null {
    const destra = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    let meglio: THREE.Object3D | null = null, punteggio = 1;
    for (const o of cose) {
      if (!o.visible) continue;
      const { r, h } = this.ingombro(o);
      const base = this.aSchermo(o.position.clone().setY(0));
      const cima = this.aSchermo(o.position.clone().setY(Math.max(0.3, h * 0.8)));
      if (!base.davanti) continue;
      const lato = this.aSchermo(o.position.clone().setY(Math.max(0.3, h * 0.6)).addScaledVector(destra, Math.max(0.4, r)));
      const mezzo = this.aSchermo(o.position.clone().setY(Math.max(0.3, h * 0.6)));
      const larghezza = Math.hypot(lato.x - mezzo.x, lato.y - mezzo.y);
      // distanza dal dito al segmento tronco–chioma
      const sx = cima.x - base.x, sy = cima.y - base.y;
      const t = THREE.MathUtils.clamp(((x - base.x) * sx + (y - base.y) * sy) / (sx * sx + sy * sy || 1), 0, 1);
      const d = Math.hypot(x - (base.x + sx * t), y - (base.y + sy * t));
      let quanto = d / (larghezza + 18); // < 1: il dito è sopra
      // l'albero che si sta già tagliando vince sempre; fiori e funghi contano meno degli alberi e dei sassi
      if (this.tagli.some((tg) => tg.bersaglio === o)) quanto *= 0.4;
      else if (o.userData.cosa === 'piccolo') quanto *= 1.8;
      if (quanto < punteggio) { punteggio = quanto; meglio = o; }
    }
    return meglio;
  }

  /** Tocco mentre si arreda. */
  private toccaArredo(x: number, y: number) {
    const p = this.puntoSuolo(x, y);
    if (this.modo === 'togli') {
      const natura: [string, THREE.Object3D][] = [
        ...this.bosco.children.map((o, i) => ['b' + i, o] as [string, THREE.Object3D]),
        ...this.selvatici.children.filter((o) => o.visible).map((o, i) => ['s' + i, o] as [string, THREE.Object3D]),
      ];
      // gli alberi si vedono "curvati" (lo shader abbassa le cose lontane): il tocco si confronta
      // con quello che si vede sullo schermo, tronco e chioma, non con la geometria vera
      const o = this.naturaSottoIlDito(x, y, natura.map(([, n]) => n));
      if (!o) return;
      const cosa = (o.userData.cosa as string) ?? (o instanceof THREE.Mesh ? 'sasso' : 'albero');
      const costo = cosa === 'albero' ? PREZZI.albero : cosa === 'piccolo' ? PREZZI.piccolo : PREZZI.cespuglio;
      // già sotto l'accetta: un altro colpo
      const inCorso = this.tagli.find((t) => t.bersaglio === o);
      if (inCorso) { inCorso.colpo(); return; }
      if (this.ghiande < costo) return this.onArredo({ tipo: 'poche', costo, cosa });
      if (cosa === 'piccolo') {
        // fiori e ciuffi: si raccolgono con le mani, subito
        this.coriandoli(o.position.clone().setY(0.4), ['#7ccf6a', '#ffffff']);
        o.visible = false;
        this.onArredo({ tipo: 'togli', x: o.position.x, z: o.position.z, costo, cosa });
        return;
      }
      // alberi, cespugli, tronchi e sassi: l'accetta, un colpo per tocco
      const tipo: CosaTagliata = cosa === 'albero' ? 'albero' : cosa === 'sasso' ? 'sasso' : 'cespuglio';
      const imp = improntaDi(o, { tonda: true, quota: tipo === 'albero' ? 0.3 : 0.5 });
      const r = imp && imp.tipo === 'cerchio' ? imp.r : 0.3;
      const x0 = o.position.x, z0 = o.position.z;
      const t = new Taglio(this.scene, o, tipo, r, this.camera.position, () => {
        // cade: si paga, e il posto resta libero per sempre
        this.ghiande -= costo;
        this.onArredo({ tipo: 'togli', x: x0, z: z0, costo, cosa });
        this.ostacoliTra = 0;
      });
      this.tagli.push(t);
      t.colpo();
      // la vista si avvicina un po' all'albero, così il colpo si vede bene
      this.centroVoluto.lerp(new THREE.Vector3(x0, 0, z0), 0.35);
      return;
    }
    const k = this.cosaSotto(x, y, this.mobili());
    if (this.modo === 'orto' || this.modo === 'quadri') {
      if (k && (k.startsWith('a:') || k.startsWith('q:') || k.startsWith('o:'))) this.onArredo({ tipo: 'apri', chiave: k });
      else if (k) this.onArredo({ tipo: 'seleziona', chiave: k });
      return;
    }
    if (k && k !== this.selezionato) {
      this.onArredo({ tipo: 'seleziona', chiave: k });
    } else if (this.selezionato && p && k !== this.selezionato) {
      this.limita(p);
      const o = this.mobili().get(this.selezionato);
      const q = (o && this.postoSenzaUrti(this.selezionato, o, Math.round(p.x * 2) / 2, Math.round(p.z * 2) / 2)) ?? p;
      this.onArredo({ tipo: 'sposta', chiave: this.selezionato, posto: { x: q.x, z: q.z, r: o?.rotation.y ?? 0 } });
    } else if (k === this.selezionato) {
      this.onArredo({ tipo: 'seleziona', chiave: null });
    }
  }

  private angoloTraDita() {
    const [a, b] = [...this.dita.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  /** Porta la vista su un punto (es. l'animale toccato). */
  guarda(p: THREE.Vector3) {
    this.centroVoluto.set(p.x, 0, p.z);
  }

  guardaAnimale(id: string) {
    const ab = this.abitanti.get(id);
    if (ab) this.guarda(ab.m.gruppo.position);
  }

  /** Gira la telecamera di un quarto di giro (pulsante). */
  ruota(verso: number) {
    this.velAngolo += verso * 0.06;
  }

  private distanzaDita() {
    const [a, b] = [...this.dita.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  private tocca(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    // il mondo è curvato nello shader: per il tocco basta un raggio un po' più generoso
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const candidati: THREE.Object3D[] = [
      this.corvo.gruppo, this.quaderno, this.castagne, this.nido, ...(this.grande ? [this.grande] : []), ...this.uova.values(), ...this.edifici.values(), ...this.botteghe.values(),
      ...this.aiuole.values(), ...this.quadri.values(), ...(this.strutture.has('laghetto') ? [this.strutture.get('laghetto')!] : []),
      ...[...this.abitanti.values()].map((a) => a.m.gruppo), this.castoro.gruppo,
    ];
    const hit = ray.intersectObjects(candidati, true)[0];
    if (!hit) return;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.bersaglio) o = o.parent;
    if (!o) return;
    const b = o.userData.bersaglio as Bersaglio;
    if (b.tipo === 'animale') {
      const ab = this.abitanti.get(b.id);
      if (ab && !ab.dati.addormentato) {
        if (this.momento() === 'notte') ab.sveglio = 30; // una carezza lo sveglia per un po'
        ab.salto = 0.5;
        ab.pausa = 4;
        // si gira verso di te
        const verso = Math.atan2(this.camera.position.x - ab.m.gruppo.position.x, this.camera.position.z - ab.m.gruppo.position.z);
        ab.m.gruppo.rotation.y = verso;
      }
      if (ab) this.guarda(ab.m.gruppo.position);
    }
    if (b.tipo === 'uovo') {
      const u = this.uova.get(b.id);
      if (u) u.userData.scossa = 1;
    }
    this.onTocco(b);
  }

  // ---------- ciclo ----------

  private ridimensiona() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  /** Solo per le prove: forza un'ora del giorno (null = ora vera). */
  oraFinta: number | null = null;

  private nebbiaMeteo = 1;

  /**
   * La nebbia sta solo al confine: comincia oltre il bosco dalla parte lontana del villaggio
   * (così case e animali si vedono tutti) e oltre il confine la telecamera non disegna niente.
   */
  private orizzonte() {
    const nebbia = this.scene.fog as THREE.Fog;
    const cam = this.posCam;
    const daCentro = Math.hypot(cam.x, cam.z);
    const bosco = this.raggio + 7; // l'ultimo anello di alberi
    const vicino = (daCentro + bosco) * this.nebbiaMeteo + 2;
    nebbia.near = vicino;
    nebbia.far = vicino + 16;
    const far = Math.round(nebbia.far + 4);
    if (this.camera.far !== far) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  private luceDelGiorno() {
    const ora = new Date();
    const h = this.oraFinta ?? ora.getHours() + ora.getMinutes() / 60;
    const giorno = Math.max(0, Math.min(1, Math.sin(((h - 6) / 14) * Math.PI) * 1.4));
    const tramonto = h > 16.5 && h < 20.5 ? 1 - Math.abs(h - 18.5) / 2 : h > 5.5 && h < 8 ? 1 - Math.abs(h - 6.7) / 1.3 : 0;
    const cielo = new THREE.Color('#1f2a5c').lerp(new THREE.Color('#a9cfe4'), giorno).lerp(new THREE.Color('#ffc09a'), Math.max(0, tramonto) * 0.55);
    this.scene.background = cielo;
    (this.scene.fog as THREE.Fog).color = cielo;
    this.sole.intensity = 0.45 + giorno * 1.6;
    this.sole.color.set(tramonto > 0.2 ? '#ffc08a' : '#fff1d6');
    this.ambiente.intensity = 0.7 + giorno * 0.65;
    this.ambiente.color.set(giorno > 0.3 ? '#bfe0ff' : '#7c88d8'); // notte: ombre blu-violette
    // il tempo che fa: cielo grigio, meno sole, nebbia più vicina
    const coperto = ({ sole: 0, nuvole: 0.45, pioggia: 0.65, temporale: 0.85, neve: 0.5, nebbia: 0.45, vento: 0.15 } as const)[this.meteo];
    cielo.lerp(new THREE.Color('#8b96a2').multiplyScalar(0.3 + 0.7 * giorno), coperto * 0.8);
    this.scene.background = cielo;
    (this.scene.fog as THREE.Fog).color = cielo;
    // la nebbia non copre mai il villaggio: sta solo oltre il bosco, al confine (vedi orizzonte());
    // col tempo brutto arriva un po' più vicina, ma le case si vedono sempre
    this.nebbiaMeteo = this.meteo === 'nebbia' ? 0.8 : this.meteo === 'pioggia' || this.meteo === 'temporale' || this.meteo === 'neve' ? 0.92 : 1;
    this.sole.intensity *= 1 - coperto * 0.7;
    this.ambiente.intensity *= 1 - coperto * 0.15;
    const notte = 1 - giorno;
    this.buio = notte;
    for (const l of this.lanterne) (l.material as THREE.MeshToonMaterial).emissiveIntensity = 0.25 + notte * 2.2;
    (this.lucciole.material as THREE.PointsMaterial).opacity = Math.max(0, notte - 0.3);
  }

  private ciclo = () => {
    this.raf = requestAnimationFrame(this.ciclo);
    const dt = Math.min(0.05, this.orologio.getDelta());
    const t = this.orologio.elapsedTime;

    // telecamera da avventura: guarda un punto della radura che si sposta col dito, bassa (circa 35°)
    this.raggioMostrato += (this.raggio - this.raggioMostrato) * Math.min(1, dt * 1.5);
    const verticale = this.camera.aspect < 0.8;
    const r = 8.5;
    // arredando la telecamera si alza un po', per vedere meglio dove si mettono le cose
    this.vistaAlta += ((this.modo ? 1 : 0) - this.vistaAlta) * Math.min(1, dt * 3);
    const dist = ((verticale ? 1.6 : 1.3) - this.vistaAlta * 0.45) * r * this.zoom + 1.5;
    const alt = ((verticale ? 1.05 : 0.75) + this.vistaAlta * 0.5) * r * this.zoom + 1;
    CURVA.valore = 0.0022 / Math.max(0.6, this.zoom);

    if (!this.trascina) {
      this.velAngolo *= 0.92;
      this.angolo += this.velAngolo;
    }
    this.centro.lerp(this.centroVoluto, Math.min(1, dt * 3));
    const oscilla = Math.sin(t * 0.15) * 0.04;
    const cin = this.cine;
    let voluta: THREE.Vector3, guarda: THREE.Vector3;
    if (cin) {
      // primo piano: vicina, quasi all'altezza degli occhi, con un giro lentissimo intorno
      const p = cin.segui();
      const ang = cin.angolo + Math.sin(t * 0.25) * 0.12;
      voluta = new THREE.Vector3(p.x + Math.sin(ang) * cin.dist, p.y + cin.alt, p.z + Math.cos(ang) * cin.dist);
      guarda = new THREE.Vector3(p.x, p.y + cin.guardaY, p.z);
      CURVA.valore = 0.0004;
    } else {
      voluta = new THREE.Vector3(this.centro.x + Math.sin(this.angolo + oscilla) * dist, alt, this.centro.z + Math.cos(this.angolo + oscilla) * dist);
      guarda = new THREE.Vector3(this.centro.x, 0.6, this.centro.z);
    }
    this.morbido = Math.max(0, this.morbido - dt);
    const k = cin || this.morbido > 0 ? Math.min(1, dt * 2.4) : 1;
    this.posCam.lerp(voluta, k);
    this.guardaCam.lerp(guarda, k);
    this.camera.position.copy(this.posCam);
    this.camera.lookAt(this.guardaCam);
    this.orizzonte();
    if (cin) this.liberaVista(cin.oggetto);
    else if (this.nascostiCine.size) this.rimettiNascosti();

    if (Math.floor(t / 5) !== Math.floor((t - dt) / 5)) this.luceDelGiorno();

    for (const ab of this.abitanti.values()) this.muovi(ab, dt, t);
    this.fisica(dt);

    for (const u of this.uova.values()) {
      if (u === this.schiusaIn?.uovo) continue;
      const scossa = (u.userData.scossa as number) ?? 0;
      u.rotation.z = Math.sin(t * 3 + u.position.x * 5) * 0.07 * (Math.sin(t * 0.7) > 0.6 ? 1 : 0.15) + Math.sin(t * 30) * scossa * 0.2;
      u.userData.scossa = Math.max(0, scossa - dt * 1.5);
    }

    const parla = this.corvoParla > 0;
    this.corvoParla = Math.max(0, this.corvoParla - dt);
    this.corvo.testa.rotation.y = Math.sin(t * 0.6) * 0.5 + (parla ? Math.sin(t * 12) * 0.08 : 0);
    this.corvo.testa.rotation.x = parla ? Math.sin(t * 14) * 0.12 : 0;
    const battito = parla ? Math.sin(t * 16) * 0.6 : Math.sin(t * 9) * 0.5 * (Math.sin(t * 0.5) > 0.95 ? 1 : 0);
    this.corvo.ali[0].rotation.z = battito;
    this.corvo.ali[1].rotation.z = -battito;

    // costruzioni nuove che spuntano con un rimbalzo
    for (const g of this.strutture.values()) {
      const c = g.userData.cresce as number | undefined;
      if (c === undefined) continue;
      const k = Math.min(1, c + dt * 1.6);
      g.userData.cresce = k < 1 ? k : undefined;
      const rimbalzo = 1 + Math.sin(k * Math.PI) * 0.25 * (1 - k);
      g.scale.setScalar(Math.max(0.01, (1 - Math.pow(1 - k, 3)) * rimbalzo));
    }
    if (this.fiamma) {
      this.fiamma.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9.3) * 0.15, 1 + Math.cos(t * 11) * 0.08);
      (this.fiamma.material as THREE.MeshToonMaterial).emissiveIntensity = 1.4 + Math.sin(t * 17) * 0.3;
    }
    if (this.festa) {
      this.festa.aggiorna(dt, t, this.buio);
      for (const ab of this.abitanti.values()) if (!ab.m.testa.userData.festa) this.mettiCappellino(ab);
    }
    const lago = this.strutture.get('laghetto');
    if (lago) animaLaghetto(lago, t);
    this.pescata?.aggiorna(dt, t);
    if (this.pale) this.pale.rotation.z += dt * (this.meteo === 'vento' || this.meteo === 'temporale' ? 2.2 : 0.6);
    // le case migliorate: il fumo del camino sale piano, la bandiera sventola
    for (const b of this.botteghe.values()) {
      if ((b.userData.livello ?? 1) < 3) continue;
      const fumo = b.getObjectByName('fumo');
      fumo?.children.forEach((p, i) => {
        const k = (t * 0.35 + i / 3) % 1;
        p.position.set(Math.sin(t + i) * 0.08, k * 0.9, 0);
        p.scale.setScalar(0.6 + k * 0.9);
      });
      const bandiera = b.getObjectByName('bandiera');
      if (bandiera) bandiera.rotation.y = Math.sin(t * 3 + b.position.x) * 0.25;
    }

    // meteo: pioggia/neve, lampi, alberi che ondeggiano col vento
    this.aggiornaPrecipitazioni(dt, t);
    if (this.meteo === 'temporale' && this.fulmine <= 0 && Math.random() < dt * 0.12) this.fulmine = 0.35;
    if (this.fulmine > 0) {
      this.fulmine -= dt;
      const lampo = this.fulmine > 0.25 || (this.fulmine > 0.1 && this.fulmine < 0.17) ? 1 : 0;
      this.ambiente.intensity = lampo ? 3 : this.ambiente.intensity;
      if (this.fulmine <= 0) this.luceDelGiorno();
    }
    const vento = this.meteo === 'vento' ? 1 : this.meteo === 'temporale' || this.meteo === 'pioggia' ? 0.5 : 0.12;
    for (let i = 0; i < this.bosco.children.length; i += 1) {
      const o = this.bosco.children[i];
      o.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.035 * vento;
    }

    // il "!" sopra chi ha una richiesta
    const conR = this.conRichiesta ? this.abitanti.get(this.conRichiesta) : undefined;
    this.esclamativo.visible = !!conR && !conR.dati.addormentato;
    if (conR) {
      this.esclamativo.position.copy(conR.m.gruppo.position);
      this.esclamativo.position.y = 2.1 * conR.m.gruppo.scale.x + Math.abs(Math.sin(t * 3)) * 0.2;
    }

    const scelto = this.modo && this.selezionato ? this.mobili().get(this.selezionato) : undefined;
    this.anelloSel.visible = !!scelto;
    if (scelto) {
      const grande = this.selezionato!.startsWith('o:') ? 0.8 : this.selezionato!.startsWith('q:') ? 0.6 : this.selezionato!.startsWith('a:') ? 1 : this.selezionato === 'castagno' ? 1.8 : 1.6;
      this.anelloSel.position.set(scelto.position.x, 0.06, scelto.position.z);
      this.anelloSel.scale.setScalar(grande * (1 + Math.sin(t * 5) * 0.06));
    }
    this.aggiornaSchiusa(dt, t);
    this.castoro.anima(t, dt, this.momento() === 'notte');
    this.acquario?.anima(t, dt);
    this.sentieri.anima(t);
    this.stelline = this.stelline.filter((st) => {
      st.vita -= dt;
      st.o.position.y += dt * 0.6;
      (st.o.material as THREE.SpriteMaterial).opacity = Math.min(1, st.vita * 1.5);
      if (st.vita > 0) return true;
      this.scene.remove(st.o);
      return false;
    });

    const brilla = this.quaderno.getObjectByName('brilla');
    if (brilla) brilla.position.y = 1.4 + Math.sin(t * 3) * 0.08;

    const pos = this.lucciole.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0.6 + Math.sin(t * 0.8 + i) * 0.5 + (i % 3) * 0.4);
    pos.needsUpdate = true;

    for (const tg of this.tagli) tg.passo(dt);
    if (this.tagli.some((tg) => tg.finito)) this.tagli = this.tagli.filter((tg) => !tg.finito);

    this.effimeri = this.effimeri.filter((e) => {
      e.vita -= dt;
      if (!(e.o instanceof THREE.Sprite)) e.vel.y -= 6 * dt;
      e.o.position.addScaledVector(e.vel, dt);
      e.o.rotation.x += dt * 5;
      if (e.vita <= 0) {
        this.scene.remove(e.o);
        return false;
      }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  };

  private muovi(ab: Abitante, dt: number, t: number) {
    const g = ab.m.gruppo;
    // occhi che sbattono ogni tanto
    ab.ammicca -= dt;
    const chiusi = ab.ammicca < 0.12 && ab.ammicca > 0;
    if (ab.ammicca <= 0) ab.ammicca = 2 + Math.random() * 4;
    for (const o of ab.m.occhi) o.scale.y = ab.dati.addormentato ? 0.12 : chiusi ? 0.15 : 1;
    if (this.pescata?.id === ab.dati.id) return; // pesca: lo muove pesca3d.ts

    if (ab.dati.addormentato) {
      this.dormi(ab, dt, t);
      return;
    }
    // ---- la divisa: si mette per le ore di lavoro, si toglie per pranzo e la sera ----
    if (!!ab.m.gruppo.userData.divisa !== this.vuoleDivisa(ab)) this.rifaiSeServe(ab);
    // ---- la giornata: di notte ognuno torna a casa a dormire (una carezza lo sveglia un po') ----
    ab.sveglio = Math.max(0, ab.sveglio - dt);
    if (this.festa?.raduno) ab.sveglio = Math.max(ab.sveglio, 2); // alla festa non si dorme
    if (this.momento() === 'notte' && ab.sveglio <= 0) {
      const casa = this.casa(ab);
      if (g.position.distanceTo(casa) < 0.25) {
        if (!ab.z.length) this.zeta(ab, true);
        for (const o of ab.m.occhi) o.scale.y = 0.12;
        this.dormi(ab, dt, t);
        return;
      }
      if (ab.amico) { const b = this.abitanti.get(ab.amico); if (b) b.amico = null; ab.amico = null; }
      if (ab.attivita) this.fineAttivita(ab);
      ab.meta = casa;
      ab.pausa = 0;
    } else if (ab.z.length) this.zeta(ab, false);
    ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 0, dt * 4);
    if (!ab.attivita) ab.m.corpo.rotation.x = THREE.MathUtils.lerp(ab.m.corpo.rotation.x, 0, dt * 4);

    if (ab.salto > 0) {
      ab.salto = Math.max(0, ab.salto - dt * 1.6);
      const fase = ab.salto % 0.5;
      ab.m.corpo.position.y = Math.sin((fase / 0.5) * Math.PI) * 0.45;
      ab.m.corpo.scale.set(1 + Math.sin(fase * 12) * 0.05, 1 - Math.sin(fase * 12) * 0.05, 1);
      return;
    }
    ab.m.corpo.scale.set(1, 1, 1);

    if (ab.deviazione && (ab.deviazione.distanceTo(g.position) < 0.3 || ab.dati.addormentato)) ab.deviazione = null;
    const dir = (ab.deviazione ?? ab.meta).clone().sub(g.position);
    const dist = ab.deviazione ? Math.max(0.2, dir.length()) : dir.length();
    const fase = ab.dati.fase;
    const cammina = ab.pausa <= 0 && dist >= 0.15;

    // postura: tutti a quattro zampe come gli animali veri; si alzano sulle zampe dietro solo alla loro
    // postazione di lavoro (con l'attrezzo in mano) e per andare in moto o in bici
    const alLavoro = ab.attivita?.id === 'lavoro' && fase !== 'cucciolo';
    const inSella = alLavoro && !!ab.attivita?.giro && !!defMestiere(ab.dati.mestiere)?.lavoro.mezzo;
    const erettoVoluto = inSella || (alLavoro && !cammina && this.allaPostazione(ab)) ? 1 : 0;
    ab.eretto += (erettoVoluto - ab.eretto) * Math.min(1, dt * 3);
    posa(ab.m, ab.eretto);

    // ---- festa di compleanno: tutti intorno alla tavola (tranne chi è in primo piano) ----
    if (this.festa?.raduno && ab.pausa < 100 && this.alPostoDiFesta(ab, dt, t)) return;

    // ---- incontri tra abitanti ----
    if (ab.amico) {
      const b = this.abitanti.get(ab.amico);
      if (!b || b.dati.addormentato || b.amico !== ab.dati.id) {
        ab.amico = null;
        ab.incontro = 0;
      } else if (!cammina) {
        // arrivato: si gira verso l'amico
        const verso = Math.atan2(b.m.gruppo.position.x - g.position.x, b.m.gruppo.position.z - g.position.z);
        const diff = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
        g.rotation.y += diff * Math.min(1, dt * 5);
        const bArrivato = b.meta.distanceTo(b.m.gruppo.position) < 0.2;
        if (bArrivato && ab.incontro === 0) ab.incontro = fase === 'cucciolo' ? 1.2 : 6 + Math.random() * 4;
        if (ab.incontro > 0) {
          ab.incontro -= dt;
          // chiacchiera: testa che annuisce, braccia che gesticolano, fumetti
          ab.m.testa.rotation.x = Math.sin(t * 6 + g.position.x) * 0.12;
          ab.m.testa.rotation.z = Math.sin(t * 1.3) * 0.1;
          if (ab.eretto > 0.5) ab.m.zampe.slice(0, 2).forEach((z, i) => (z.rotation.x = -0.6 - Math.abs(Math.sin(t * 4 + i * 1.5)) * 0.6));
          ab.prossimoBalloon -= dt;
          if (ab.prossimoBalloon <= 0 && fase !== 'cucciolo') {
            ab.prossimoBalloon = 1.6 + Math.random() * 1.6;
            this.fumetto(ab, ['♥', '♪', '!', '?', '☺', '…', '✿'][Math.floor(Math.random() * 7)]);
          }
          if (ab.incontro <= 0) {
            ab.amico = null;
            ab.incontro = 0;
            ab.pausa = 1 + Math.random() * 2;
            if (fase === 'cucciolo') ab.salto = 1; // i cuccioli giocano: saltano insieme
          }
          return;
        }
        ab.m.corpo.position.y = 0;
        return;
      }
    }

    if (ab.attivita && !cammina) {
      this.faiAttivita(ab, dt, t);
      return;
    }

    if (ab.pausa > 0) {
      ab.pausa -= dt;
      // respiro e testolina che si inclina
      ab.m.corpo.position.y = Math.sin(t * 2.2 + g.position.x) * 0.012;
      ab.m.testa.rotation.x = 0;
      ab.m.testa.rotation.z = Math.sin(t * 0.8 + g.position.z) * 0.15;
      ab.m.testa.rotation.y = Math.sin(t * 0.6 + g.position.x) * 0.35;
      ab.m.zampe.forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, 0, dt * 6)));
      if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(t * 3) * 0.3;
      if (ab.pausa <= 0) this.scegliCosaFare(ab);
      return;
    }
    if (dist < 0.15) {
      if (!ab.attivita) ab.pausa = 1.5 + Math.random() * 4;
      return;
    }

    // in moto o in bici (chi lavora in giro): va più veloce, seduto, le mani sul manubrio
    const mezzo = ab.attivita?.id === 'lavoro' && ab.attivita.giro && fase !== 'cucciolo' ? defMestiere(ab.dati.mestiere)?.lavoro.mezzo : undefined;
    if (mezzo) {
      this.inSella(ab, mezzo);
      dir.normalize();
      this.sterza(ab, dir, dist);
      g.position.addScaledVector(dir, Math.min(dist, (mezzo === 'moto' ? 2.6 : 1.7) * dt));
      const verso = Math.atan2(dir.x, dir.z);
      const diff = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
      g.rotation.y += diff * Math.min(1, dt * 5);
      ab.m.corpo.position.y = 0.32 + Math.sin(t * 20) * 0.006;
      ab.m.corpo.rotation.z = -diff * 0.3; // si piega in curva
      ab.m.zampe[0].rotation.x = ab.m.zampe[1].rotation.x = -1.35;
      ab.m.testa.rotation.x = 0;
      ab.passo += dt * 10;
      if (mezzo === 'bici') ab.m.zampe[2].rotation.x = -1.2 + Math.sin(ab.passo) * 0.4, ab.m.zampe[3].rotation.x = -1.2 - Math.sin(ab.passo) * 0.4;
      if (Math.random() < dt * 0.25) this.fumetto(ab, mezzo === 'moto' ? '💨' : '🔔');
      return;
    }

    // camminata: a quattro zampe (su due solo se si stava ancora rimettendo giù)
    const gioca = ab.amico && fase === 'cucciolo';
    const vel = (fase === 'cucciolo' ? (gioca ? 1.5 : 0.7) : 0.95) * (ab.dati.umore > 50 ? 1 : 0.6);
    dir.normalize();
    this.sterza(ab, dir, dist);
    g.position.addScaledVector(dir, Math.min(dist, vel * dt));
    const verso = Math.atan2(dir.x, dir.z);
    const diff = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
    g.rotation.y += diff * Math.min(1, dt * 6);
    ab.m.testa.rotation.x = 0;
    ab.m.testa.rotation.y = 0;
    if (ab.eretto > 0.6) {
      ab.passo += dt * 8;
      ab.m.corpo.position.y = Math.abs(Math.sin(ab.passo)) * 0.05;
      ab.m.corpo.rotation.z = Math.sin(ab.passo) * 0.06; // ondeggia da un piede all'altro
      ab.m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(ab.passo + (i % 2 === 0 ? 0 : Math.PI) + (i < 2 ? Math.PI : 0)) * (i < 2 ? 0.5 : 0.65)));
    } else {
      ab.passo += dt * (gioca ? 16 : 11) * (0.6 + 0.4 * ampiezzaPasso(ab.m)); // le zampe lunghe fanno passi più lenti
      ab.m.corpo.position.y = Math.abs(Math.sin(ab.passo)) * 0.1;
      ab.m.testa.rotation.z = Math.sin(ab.passo) * 0.06;
      ab.m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(ab.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * ampiezzaPasso(ab.m)));
    }
    if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(ab.passo) * 0.4;
  }

  // ---------- fisica: nessuno passa attraverso le case, gli attrezzi, il laghetto o gli altri ----------

  private ostacoli: Impronta[] = [];
  private tagli: Taglio[] = [];
  private ostacoliTra = 0;

  /** Raggio d'ingombro di un animale: mezza larghezza del corpo (i piccoli sono più piccoli). */
  private spazioDi(ab: Abitante): number {
    return this.misuraAnimale(ab).r;
  }

  /** Quanto è largo e lungo l'animale visto dall'alto (misurato sul modello, una volta sola). */
  private misuraAnimale(ab: Abitante): { r: number; mezza: number } {
    const g = ab.m.gruppo;
    let m = g.userData.misura as { r: number; mezza: number; scala: number } | undefined;
    if (!m || Math.abs(m.scala - g.scale.x) > 0.01) {
      const rot = g.rotation.y;
      g.rotation.y = 0;
      const box = rettangoloAlSuolo(g, 99);
      g.rotation.y = rot;
      g.updateMatrixWorld(true);
      const largo = box ? (box[1] - box[0]) / 2 : 0.3, lungo = box ? (box[3] - box[2]) / 2 : 0.3;
      // il corpo (senza coda e muso che sporgono): un po' meno della scatola intera
      const r = THREE.MathUtils.clamp(largo * 0.8, 0.14, 0.5);
      m = { r, mezza: Math.max(0, lungo * 0.78 - r), scala: g.scale.x };
      g.userData.misura = m;
    }
    return m;
  }

  /** L'animale visto dall'alto: una capsula lunga quanto il suo corpo, nella direzione in cui guarda. */
  private capsula(ab: Abitante): Capsula {
    const g = ab.m.gruppo, { r, mezza } = this.misuraAnimale(ab);
    return { x: g.position.x, z: g.position.z, dx: Math.sin(g.rotation.y), dz: Math.cos(g.rotation.y), mezza, r };
  }

  /** L'impronta di una cosa che Giada può spostare (una casa porta con sé i suoi attrezzi). */
  private improntaCosa(k: string, g: THREE.Object3D): Impronta[] {
    const out: Impronta[] = [];
    const metti = (i: Impronta | null, chi?: string) => { if (i) { if (chi) i.chi = chi; out.push(i); } };
    if (!g.visible) return out;
    if (k.startsWith('b:')) {
      const id = k.slice(2);
      metti(improntaDi(g, { nome: k, margine: 0.05 }));
      g.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      g.traverse((ch) => {
        const r = ch.userData.spazio as number | undefined;
        if (!r || ch === g) return;
        const i = improntaDi(ch, { nome: k + ':attrezzo', quota: 1.2 });
        if (i) metti(i, ch.userData.suaPostazione ? id : undefined);
        else { ch.getWorldPosition(v); metti({ tipo: 'cerchio', x: v.x, z: v.z, r, nome: k + ':attrezzo' }, ch.userData.suaPostazione ? id : undefined); }
      });
      return out;
    }
    if (k === 'c:staccionata') { const w = postoNelMondo(g); return [{ tipo: 'cerchio', x: w.x, z: w.z, r: 1.6, nome: k }]; }
    if (k === 'c:laghetto') {
      const w = postoNelMondo(g);
      // la sabbia intorno all'acqua (gli animali hanno la loro riva in fisica(): questa serve per non metterci sopra le cose)
      return [{ tipo: 'scatola', x: w.x, z: w.z, hx: 2.4 * 1.12, hz: 1.6 * 1.12, rot: w.rot, nome: k, soloPosto: true }];
    }
    if (k === 'c:sentiero' || k === 'c:lanterne') return out;
    if (k === 'castagno' || k === 'grande' || k === 'nido' || k === 'corvo') {
      metti(improntaDi(g, { nome: k, tonda: true, quota: k === 'corvo' ? 0.5 : 0.9 }));
      return out;
    }
    metti(improntaDi(g, { nome: k, tonda: k.startsWith('q:') }) ?? (k.startsWith('o:') ? { tipo: 'cerchio', x: g.position.x, z: g.position.z, r: 0.25, nome: k } : null));
    return out;
  }

  /** Le cose del villaggio che non sono natura, nell'ordine in cui si tengono il posto (le prime non si spostano mai). */
  private cosePiazzate(): [string, THREE.Object3D][] {
    const out: [string, THREE.Object3D][] = [['nido', this.nido], ['corvo', this.corvo.gruppo], ['quaderno', this.quaderno]];
    if (this.grande) out.push(['grande', this.grande]);
    for (const [id, g] of this.strutture) if (id === 'lanterne') g.children.forEach((l, i) => out.push(['lanterna' + i, l]));
    out.push(['castagno', this.castagno]);
    for (const [t, e] of this.edifici) out.push(['e:' + t, e]);
    for (const [id, b] of this.botteghe) out.push(['b:' + id, b]);
    for (const [id, g] of this.strutture) if (id !== 'sentiero' && id !== 'lanterne' && g.scale.x >= 0.5) out.push(['c:' + id, g]);
    for (const [id, g] of this.aiuole) out.push(['a:' + id, g]);
    for (const [id, g] of this.quadri) out.push(['q:' + id, g]);
    for (const [id, g] of this.oggetti) out.push(['o:' + id, g]);
    return out;
  }

  /** Due cose che stanno bene una sull'altra: il nido dentro la staccionata, il ponticello sul laghetto. */
  private amiche(a: string, b: string): boolean {
    const c = (x: string) => x.split(':').slice(0, 2).join(':');
    const [x, y] = [c(a), c(b)].sort();
    return x === y || (x === 'c:staccionata' && y === 'nido') || (x === 'c:laghetto' && y === 'c:ponticello');
  }

  /**
   * Nessuna cosa dentro un'altra: chi è stato messo sopra qualcosa (da Giada o in automatico)
   * scivola nel posto libero più vicino. Le prime della lista tengono il loro posto.
   */
  private risolviPosti() {
    const fatte: Impronta[] = [];
    for (const [k, g] of this.cosePiazzate()) {
      let mie = k.startsWith('lanterna') ? [improntaDi(g, { nome: k, tonda: true })].filter((x): x is Impronta => !!x) : this.improntaCosa(k, g);
      const urta = (l: Impronta[]) => l.some((i) => fatte.some((f) => !this.amiche(i.nome ?? '', f.nome ?? '') && sovrapposte(i, f, 0.12)));
      if (this.spostando !== k && mie.length && urta(mie) && !['nido', 'corvo', 'quaderno', 'grande'].includes(k) && !k.startsWith('lanterna')) {
        const p = this.postoSenzaUrti(k, g, g.position.x, g.position.z, fatte);
        if (p) { g.position.x = p.x; g.position.z = p.z; g.updateMatrixWorld(true); mie = this.improntaCosa(k, g); }
      }
      fatte.push(...mie);
    }
  }

  /** Il posto libero più vicino a (x, z) per la cosa k: a spirale, mezzo metro alla volta. */
  private postoSenzaUrti(k: string, g: THREE.Object3D, x: number, z: number, altre?: Impronta[]): { x: number; z: number } | null {
    const tutte = altre ?? this.cosePiazzate().filter(([kk]) => kk !== k).flatMap(([kk, o]) => kk.startsWith('lanterna') ? [improntaDi(o, { nome: kk, tonda: true })].filter((i): i is Impronta => !!i) : this.improntaCosa(kk, o));
    const x0 = g.position.x, z0 = g.position.z;
    const casa = k.startsWith('b:') || k.startsWith('e:') || k === 'c:acquario';
    const lim = casa ? this.raggio + 9 : Math.max(3, this.raggio - 1);
    let trovato: { x: number; z: number } | null = null;
    for (let giro = 0; giro <= 24 && !trovato; giro++) {
      const d = giro * 0.5, n = giro === 0 ? 1 : Math.max(8, Math.round(d * 6));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const px = Math.round((x + Math.cos(a) * d) * 2) / 2, pz = Math.round((z + Math.sin(a) * d) * 2) / 2;
        if (Math.hypot(px, pz) > lim) continue;
        g.position.x = px; g.position.z = pz;
        g.updateMatrixWorld(true);
        const mie = this.improntaCosa(k, g);
        if (!mie.some((m) => tutte.some((f) => !this.amiche(m.nome ?? '', f.nome ?? '') && sovrapposte(m, f, 0.12)))) { trovato = { x: px, z: pz }; break; }
      }
    }
    g.position.x = x0; g.position.z = z0;
    g.updateMatrixWorld(true);
    return trovato;
  }

  /** Le cose ferme che non sono natura (case, attrezzi, edifici, costruzioni, castagno, nido...). */
  private improntePiazzate(perPosto = false): Impronta[] {
    const out: Impronta[] = [];
    for (const [k, g] of this.cosePiazzate()) {
      if (k.startsWith('lanterna')) { const i = improntaDi(g, { nome: 'lanterna', tonda: true }); if (i) out.push(i); continue; }
      out.push(...this.improntaCosa(k, g).filter((i) => perPosto || !i.soloPosto));
    }
    return out;
  }

  /**
   * Tutte le cose ferme del villaggio con la loro impronta per terra: case, attrezzi, edifici, costruzioni,
   * il castagno, il grande albero, il nido, il corvo, il quaderno, gli alberi del bosco, cespugli, sassi, tronchi...
   */
  impronte(): Impronta[] {
    const o = this.improntePiazzate();
    const metti = (i: Impronta | null) => { if (i) o.push(i); };
    for (const c of this.bosco.children) {
      if (!c.visible) continue;
      const cosa = c.userData.cosa as string;
      if (cosa === 'piccolo') continue; // fiori, ciuffi e funghi: ci si passa sopra
      if (cosa === 'albero') metti(improntaDi(c, { nome: 'albero', tonda: true, quota: 0.3 }));
      else metti(improntaDi(c, { nome: cosa, quota: 0.5 }));
    }
    for (const c of this.selvatici.children) if (c.visible) metti(improntaDi(c, { nome: 'sasso', quota: 0.5 }));
    for (const c of this.castoro.ostacoli()) o.push({ tipo: 'cerchio', ...c, nome: 'castoro' });
    for (const c of this.sentieri.ostacoli()) o.push({ tipo: 'cerchio', ...c, nome: 'castoro' }); // (i pali dei portali: come il castoro, non contano tra le sovrapposizioni)
    for (const t of this.tagli) if (t.legna.visible) o.push({ tipo: 'cerchio', x: t.legna.position.x, z: t.legna.position.z, r: 0.5, nome: 'legna' });
    return o;
  }

  /** Le cose ferme come ostacoli per chi cammina. */
  private rifaiOstacoli() {
    const o = this.impronte();
    // mentre qualcuno pesca, gli altri non si mettono sul pontile davanti a lui
    if (this.pescata) {
      const pp = this.pescata.piedi;
      o.push({ tipo: 'cerchio', x: pp.x, z: pp.z, r: 1.6 });
    }
    // l'erba sotto i piedi e il viale non servono: solo le cose vicine alla radura
    const lim = this.raggio + 4;
    this.ostacoli = o.filter((i) => Math.hypot(i.x, i.z) < lim + raggioDi(i));
  }

  /** Solo per le prove: le cose ferme che si sovrappongono (dovrebbe essere vuoto). */
  sovrapposizioni(margine = 0): string[] {
    const tutte = [...this.impronte().filter((i) => i.nome !== 'castoro'), ...this.improntePiazzate(true).filter((i) => i.soloPosto)];
    const out: string[] = [];
    for (let i = 0; i < tutte.length; i++) {
      for (let j = i + 1; j < tutte.length; j++) {
        const a = tutte[i], b = tutte[j];
        if (Math.hypot(a.x - b.x, a.z - b.z) > raggioDi(a) + raggioDi(b) + margine) continue;
        if (this.amiche(a.nome ?? '', b.nome ?? '')) continue;
        if (sovrapposte(a, b, margine)) out.push(`${a.nome}@${a.x.toFixed(1)},${a.z.toFixed(1)} ↔ ${b.nome}@${b.x.toFixed(1)},${b.z.toFixed(1)}`);
      }
    }
    return out;
  }

  /** Camminando, gira intorno a quello che ha davanti invece di andarci contro. */
  private sterza(ab: Abitante, dir: THREE.Vector3, dist: number) {
    const p = ab.m.gruppo.position, ra = this.spazioDi(ab) + this.misuraAnimale(ab).mezza * 0.5;
    let sx = 0, sz = 0;
    const R = ra + 0.15, sonda = R + 0.9;
    for (const o of this.ostacoli) {
      if (o.chi === ab.dati.id) continue;
      if (Math.abs(o.x - p.x) > sonda + raggioDi(o) || Math.abs(o.z - p.z) > sonda + raggioDi(o)) continue;
      const f = spintaFuori(p.x, p.z, sonda, o);
      if (!f) continue;
      const verso = sonda - f.d; // quanto manca al bordo della cosa
      if (dist < verso) continue; // la meta è prima dell'ostacolo
      const ux = -f.x, uz = -f.z;
      const avanti = ux * dir.x + uz * dir.z;
      if (avanti <= 0.05) continue;
      // di lato: sceglie una parte e la tiene finché non ha girato intorno (se no tentenna a destra e sinistra)
      const lato = ab.latoSterza ??= Math.sign(dir.x * uz - dir.z * ux) || (hash(ab.dati.id) % 2 ? 1 : -1);
      const forza = avanti * (1 - Math.max(0, verso - R) / 0.9) * 2;
      sx += -uz * lato * forza - ux * forza * 0.3;
      sz += ux * lato * forza - uz * forza * 0.3;
    }
    // e intorno agli altri animali che stanno fermi (seduti, al lavoro, a dormire)
    for (const b of this.abitanti.values()) {
      if (b === ab || this.trattenuti.has(b.dati.id)) continue;
      const q = b.m.gruppo.position;
      const dx = q.x - p.x, dz = q.z - p.z;
      if (Math.abs(dx) > 2 || Math.abs(dz) > 2) continue;
      const d = Math.hypot(dx, dz), R = this.spazioDi(b) + ra + 0.1;
      if (d > R + 0.8 || d < 1e-4 || dist < d) continue;
      const ux = dx / d, uz = dz / d, avanti = ux * dir.x + uz * dir.z;
      if (avanti <= 0.1) continue;
      const lato = ab.latoSterza ??= Math.sign(dir.x * uz - dir.z * ux) || (hash(ab.dati.id) % 2 ? 1 : -1);
      const fermo = b.pausa > 0 || b.dati.addormentato || b.meta.distanceTo(q) < 0.15;
      const forza = avanti * (1 - Math.max(0, d - R) / 0.8) * (fermo ? 2 : 0.8);
      sx += -uz * lato * forza;
      sz += ux * lato * forza;
    }
    if (sx || sz) {
      dir.x += sx;
      dir.z += sz;
      dir.normalize();
    } else ab.latoSterza = undefined;
  }

  /** Dopo che tutti si sono mossi: nessuno resta dentro le cose o addosso agli altri, e chi si incastra si ferma. */
  private fisica(dt: number) {
    this.ostacoliTra -= dt;
    if (this.ostacoliTra <= 0) {
      this.ostacoliTra = 0.5;
      this.rifaiOstacoli();
    }
    const lg = this.strutture.get('laghetto');
    const tutti = [...this.abitanti.values()].filter((ab) => !this.trattenuti.has(ab.dati.id) && ab.dati.id !== this.pescata?.id && ab.m.gruppo.visible);
    // chi sta fermo apposta (dorme, lavora alla postazione, chiacchiera) si sposta meno degli altri
    const fermo = (ab: Abitante) => ab.dati.addormentato || (ab.pausa <= 0 && ab.meta.distanceTo(ab.m.gruppo.position) < 0.15 && !!ab.attivita) || this.allaPostazione(ab) || (!!ab.amico && ab.incontro > 0);
    const caps = new Map<Abitante, Capsula>();
    for (let giro = 0; giro < 3; giro++) {
      // tra animali: ognuno il suo spazio (corpo contro corpo, per tutta la lunghezza)
      for (const ab of tutti) caps.set(ab, this.capsula(ab));
      for (let i = 0; i < tutti.length; i++) {
        const a = tutti[i], ca = caps.get(a)!;
        for (let j = i + 1; j < tutti.length; j++) {
          const b = tutti[j], cb = caps.get(b)!;
          const R = ca.r + cb.r;
          const lim = R + ca.mezza + cb.mezza;
          if (Math.abs(ca.x - cb.x) > lim || Math.abs(ca.z - cb.z) > lim) continue;
          const [ax, az, bx, bz] = piuViciniCapsule(ca, cb);
          let dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
          if (d >= R) continue;
          if (d < 1e-4) { dx = cb.x - ca.x || 1; dz = cb.z - ca.z; d = 0; }
          const l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
          const spinta = R - d;
          const fa = fermo(a), fb = fermo(b);
          const ka = fa === fb ? 0.5 : fa ? 0.15 : 0.85, kb = 1 - ka;
          const pa = a.m.gruppo.position, pb = b.m.gruppo.position;
          pa.x -= ux * spinta * ka; pa.z -= uz * spinta * ka;
          pb.x += ux * spinta * kb; pb.z += uz * spinta * kb;
          ca.x = pa.x; ca.z = pa.z; cb.x = pb.x; cb.z = pb.z;
        }
      }
      // le cose del villaggio: nessuna parte del corpo ci entra dentro (queste vincono sugli altri animali)
      for (const ab of tutti) {
        const p = ab.m.gruppo.position;
        const c = this.capsula(ab);
        const lim = c.r + c.mezza;
        for (const o of this.ostacoli) {
          if (o.chi === ab.dati.id) continue; // la sua postazione: ci sta attaccato
          const ro = raggioDi(o) + lim;
          if (Math.abs(o.x - p.x) > ro || Math.abs(o.z - p.z) > ro) continue;
          for (let k = 0; k < 2; k++) {
            let peggio: { x: number; z: number; d: number } | null = null;
            for (const [qx, qz] of puntiCapsula({ ...c, x: p.x, z: p.z })) {
              const f = spintaFuori(qx, qz, c.r, o);
              if (f && (!peggio || f.d > peggio.d)) peggio = f;
            }
            if (!peggio) break;
            p.x += peggio.x * (peggio.d + 0.002);
            p.z += peggio.z * (peggio.d + 0.002);
          }
        }
        // il laghetto (si sta sulla riva, non nell'acqua)
        if (lg) {
          const cr = Math.cos(lg.rotation.y), sr = Math.sin(lg.rotation.y);
          for (const [qx, qz] of puntiCapsula({ ...c, x: p.x, z: p.z })) {
            const X = qx - lg.position.x, Z = qz - lg.position.z;
            const fuori = fuoriDalLago(X * cr - Z * sr, X * sr + Z * cr, 1.02 + c.r * 0.3);
            if (!fuori) continue;
            const [x, z] = fuori;
            p.x += lg.position.x + x * cr + z * sr - qx;
            p.z += lg.position.z - x * sr + z * cr - qz;
          }
        }
      }
    }
    // chi cammina ma non si avvicina più alla meta per un po' (qualcosa in mezzo): si ferma lì e cambia idea
    for (const ab of tutti) {
      if (ab.dati.addormentato || ab.pausa > 0 || ab.salto > 0) { ab.fermo = 0; continue; }
      const dist = ab.meta.distanceTo(ab.m.gruppo.position);
      if (dist < 0.15) { ab.fermo = 0; ab.distPrima = dist; continue; }
      if (dist < ab.distPrima - 0.01 || dist > ab.distPrima + 0.6) { ab.distPrima = dist; ab.fermo = 0; continue; }
      ab.fermo += dt;
      if (ab.fermo > 2.5) {
        ab.fermo = 0;
        ab.distPrima = Infinity;
        if (ab.deviazione) { ab.deviazione = null; continue; }
        if (ab.attivita?.id === 'lavoro' && !ab.attivita.giro && dist < 1.5) {
          // quasi alla sua postazione ma qualcosa lo blocca: ci scivola dentro
          ab.m.gruppo.position.lerp(ab.meta, 0.6);
        } else if (ab.attivita?.id === 'lavoro' && !ab.attivita.giro) {
          // bloccato per strada: fa un passo di lato e poi riprova
          const g = ab.m.gruppo.position, lato = Math.random() < 0.5 ? 1 : -1;
          const vx = ab.meta.x - g.x, vz = ab.meta.z - g.z, l = Math.hypot(vx, vz) || 1;
          ab.deviazione = new THREE.Vector3(g.x - (vz / l) * 1.6 * lato - (vx / l) * 0.6, 0, g.z + (vx / l) * 1.6 * lato - (vz / l) * 0.6);
        } else {
          ab.meta.copy(ab.m.gruppo.position);
          if (ab.attivita && ab.attivita.id !== 'lavoro') this.fineAttivita(ab);
        }
      }
    }
  }

  /** Quanti altri sono già lì vicino (in cammino o arrivati). */
  private affollato(p: THREE.Vector3, io: Abitante, r = 1.2): number {
    let n = 0;
    for (const b of this.abitanti.values()) {
      if (b === io || b.dati.addormentato) continue;
      if (b.meta.distanceTo(p) < r || b.m.gruppo.position.distanceTo(p) < r) n++;
    }
    return n;
  }

  /** Un punto vicino a quello voluto ma non addosso agli altri: ognuno il suo spazio. */
  private postoLibero(io: Abitante, voluto: () => THREE.Vector3, quanti = 0): THREE.Vector3 {
    let meglio = voluto(), folla = this.affollato(meglio, io);
    for (let i = 0; i < 8 && folla > quanti; i++) {
      const p = voluto(), f = this.affollato(p, io);
      if (f < folla) { meglio = p; folla = f; }
    }
    return meglio;
  }

  /** Il posticino del cuore di ciascuno (dipende da chi è): il laghetto, il castagno, le aiuole... */
  private postoPreferito(ab: Abitante): THREE.Vector3 {
    const intorno = (x: number, z: number, r: number) => {
      const a = Math.random() * Math.PI * 2, rr = r * (0.8 + Math.random() * 0.4);
      return new THREE.Vector3(x + Math.cos(a) * rr, 0, z + Math.sin(a) * rr);
    };
    const c = POSTI_COSTRUZIONI;
    const posti: (() => THREE.Vector3)[] = [
      () => intorno(POSTO_CASTAGNO[0], POSTO_CASTAGNO[1], 1.8),
      () => { const k = this.casa(ab); return intorno(k.x, k.z, 0.9); },
    ];
    if (this.strutture.has('laghetto')) posti.push(() => this.rivaDelLago());
    if (this.strutture.has('aiuola')) posti.push(() => intorno(c.aiuola[0], c.aiuola[1], 1.1));
    if (this.strutture.has('pozzo')) posti.push(() => intorno(c.pozzo[0], c.pozzo[1], 1.3));
    if (this.strutture.has('torretta')) posti.push(() => intorno(c.torretta[0], c.torretta[1], 1.5));
    if (this.strutture.has('mulino')) posti.push(() => intorno(c.mulino[0], c.mulino[1], 1.6));
    // un angolino tutto suo, sempre lo stesso, lungo il bordo del villaggio
    const ang = ((hash(ab.dati.id + 'angolo') % 360) * Math.PI) / 180, r = Math.max(3.5, this.raggio - 2.5);
    posti.push(() => intorno(Math.cos(ang) * r, Math.sin(ang) * r, 0.8));
    return this.postoLibero(ab, posti[hash(ab.dati.id + 'cuore') % posti.length]);
  }

  /** Finita una pausa: ognuno fa la sua cosa, sparsi per il villaggio; ogni tanto due si incontrano. */
  private scegliCosaFare(ab: Abitante) {
    const momento = this.momento();
    const def = defMestiere(ab.dati.mestiere);
    const tutti = [...this.abitanti.values()].filter((b) => !b.dati.addormentato);
    const r = Math.random();
    if (momento === 'lavoro' && def && r < 0.7 && ab.dati.fase !== 'cucciolo') {
      // ognuno lavora alla sua postazione, fuori dalla porta di casa; chi lavora in giro (postino, dottore,
      // motociclista...) ogni tanto fa il suo giro di consegne, e il pescatore va a pescare al laghetto
      const giro = def.lavoro.dove !== 'casa' && def.lavoro.dove !== 'piazza' && def.lavoro.dove !== 'bosco' && this.botteghe.has(ab.dati.id) ? Math.random() < 0.4 : !this.botteghe.has(ab.dati.id);
      ab.attivita = { id: 'lavoro', tempo: giro ? 14 + Math.random() * 10 : 35 + Math.random() * 35, prossimo: 1, tappa: 5 + Math.random() * 3, giro };
      ab.meta = giro ? this.postoLavoro(ab, def) : this.postazione(ab)!.punto;
      return;
    }
    // incontri: solo qualcuno, mai tutti insieme (al massimo un terzo del villaggio in chiacchiere)
    const inChiacchiera = tutti.filter((b) => b.amico).length;
    const voglia = (ab.dati.fase === 'cucciolo' ? 0.22 : 0.18) * (momento === 'pranzo' || momento === 'sera' ? 1.4 : 1);
    const liberi = tutti.filter((b) => b !== ab && !b.amico && b.salto <= 0 && !b.attivita);
    if (liberi.length && inChiacchiera + 2 <= Math.max(2, Math.ceil(tutti.length / 3)) && Math.random() < voglia) {
      // preferisce chi è vicino
      liberi.sort((x, y) => x.m.gruppo.position.distanceTo(ab.m.gruppo.position) - y.m.gruppo.position.distanceTo(ab.m.gruppo.position));
      const b = liberi[Math.floor(Math.random() * Math.min(2, liberi.length))];
      const pa = ab.m.gruppo.position, pb = b.m.gruppo.position;
      const mezzo = pa.clone().add(pb).multiplyScalar(0.5);
      const asse = pb.clone().sub(pa).setY(0);
      if (asse.lengthSq() < 0.01) asse.set(1, 0, 0);
      asse.setLength(0.55 * Math.max(ab.m.gruppo.scale.x, 1));
      ab.amico = b.dati.id;
      b.amico = ab.dati.id;
      ab.incontro = b.incontro = 0;
      ab.meta = mezzo.clone().sub(asse);
      b.meta = mezzo.clone().add(asse);
      b.pausa = 0;
      return;
    }
    // chi ha imparato qualcosa, spesso va a farlo (ma non dove sono già in tanti)
    const sa = ab.dati.abilita ?? [];
    if (sa.length && Math.random() < 0.4) {
      const id = sa[Math.floor(Math.random() * sa.length)];
      const luogo = this.luogoAttivita(id);
      if (!luogo || this.affollato(luogo, ab, 1.6) < 2) {
        ab.attivita = { id, tempo: 9 + Math.random() * 8, prossimo: 0.5 };
        ab.meta = luogo ? this.postoLibero(ab, () => this.luogoAttivita(id)!) : this.postoLibero(ab, () => this.puntoCasuale());
        return;
      }
    }
    // a pranzo e la sera ci si riposa, ma ognuno nel suo posticino; la panchina tiene due amici
    const riposo = momento === 'pranzo' ? 0.55 : momento === 'sera' ? 0.5 : momento === 'mattina' ? 0.15 : 0.2;
    if (Math.random() < riposo) {
      const panca = POSTI_COSTRUZIONI.panchina;
      if (this.strutture.has('panchina') && Math.random() < 0.3 && this.affollato(new THREE.Vector3(panca[0], 0, panca[1] + 0.45), ab, 0.9) < 2) {
        const lato = this.affollato(new THREE.Vector3(panca[0] - 0.35, 0, panca[1] + 0.45), ab, 0.3) ? 0.35 : -0.35;
        ab.meta = new THREE.Vector3(panca[0] + Math.cos(panca[2]) * lato, 0, panca[1] - Math.sin(panca[2]) * lato + 0.45);
      } else ab.meta = this.postoPreferito(ab);
      const cose = momento === 'sera' ? ['seduto', 'seduto', 'guarda', 'riposino'] : ['seduto', 'riposino', 'guarda', 'merenda'];
      ab.attivita = { id: cose[Math.floor(Math.random() * cose.length)], tempo: 14 + Math.random() * 14, prossimo: 2 + Math.random() * 3 };
      return;
    }
    // le piccole cose di tutti i giorni: annusare i fiori, stiracchiarsi, guardarsi intorno
    if (Math.random() < 0.45) {
      const cose = ['annusa', 'stiracchia', 'guarda', 'annusa', 'saltella'];
      const id = cose[Math.floor(Math.random() * cose.length)];
      ab.attivita = { id, tempo: 5 + Math.random() * 6, prossimo: 1 + Math.random() * 2 };
      ab.meta = Math.random() < 0.5 ? this.postoPreferito(ab) : this.postoLibero(ab, () => this.puntoCasuale());
      return;
    }
    ab.meta = this.postoLibero(ab, () => this.puntoCasuale());
  }

  /** Il lavoro di ognuno: il gesto del suo mestiere, con l'attrezzo in mano e i fumetti giusti. */
  private lavora(ab: Abitante, dt: number, t: number, guardaVerso: (x: number, z: number) => void) {
    const att = ab.attivita!;
    const def = defMestiere(ab.dati.mestiere);
    if (ab.m.accessorio?.userData.grembiule) ab.m.accessorio.visible = true; // l'attrezzo in mano
    const [d0, d1] = ab.m.zampe;
    const g = ab.m.gruppo;
    if (!def) return;
    const lav = def.lavoro;
    if (att.giro) {
      // in giro: niente gesti del mestiere (quelli si fanno solo alla postazione), solo la sua strada
      if (ab.m.accessorio?.userData.grembiule) ab.m.accessorio.visible = false;
      if (lav.mezzo) this.inSella(ab, lav.mezzo);
      if (lav.dove === 'acqua') {
        // il pescatore pesca seduto sulla riva, con la canna
        const lg = this.strutture.get('laghetto');
        if (lg) guardaVerso(lg.position.x, lg.position.z);
        if (!ab.canna) { ab.canna = creaCanna(); ab.m.zampe[0].add(ab.canna); }
        this.siede(ab, dt);
        d0.rotation.x = -0.9 + Math.sin(t * 1.5) * 0.08;
      } else {
        // alla porta di qualcuno: si ferma un attimo, si guarda intorno, poi va alla prossima
        ab.m.testa.rotation.y = Math.sin(t * 0.8) * 0.3;
        att.tappa = (att.tappa ?? 6) - dt;
        if (att.tappa <= 0) {
          att.tappa = 3 + Math.random() * 3;
          ab.meta = this.postoLavoro(ab, def);
        }
      }
      if (att.prossimo <= 0) {
        att.prossimo = 2.5 + Math.random() * 2;
        this.fumetto(ab, lav.fumetti[Math.floor(Math.random() * lav.fumetti.length)]);
      }
      return;
    }
    const post = this.postazione(ab);
    if (!post || !this.allaPostazione(ab)) {
      // non è (ancora) alla sua postazione: ci va, a quattro zampe e senza gesti
      if (ab.m.accessorio?.userData.grembiule) ab.m.accessorio.visible = false;
      if (post && ab.meta.distanceTo(post.punto) > 0.05) ab.meta = post.punto.clone();
      return;
    }
    // alla postazione: in piedi dietro al banco, rivolto verso il villaggio
    const dv = Math.atan2(Math.sin(post.verso - g.rotation.y), Math.cos(post.verso - g.rotation.y));
    g.rotation.y += dv * Math.min(1, dt * 5);
    const sn = Math.sin;
    ab.m.testa.rotation.x = 0.15;
    switch (lav.gesto) {
      case 'martella': d0.rotation.x = -1.7 + Math.abs(sn(t * 6)) * 1.1; d1.rotation.x = -0.8; ab.m.testa.rotation.x = 0.3; break;
      case 'mescola': d0.rotation.x = -1.1 + sn(t * 4) * 0.2; d0.rotation.z += Math.cos(t * 4) * 0.3; d1.rotation.x = -0.7; ab.m.testa.rotation.x = 0.3; break;
      case 'impasta': d0.rotation.x = -0.9 + sn(t * 5) * 0.3; d1.rotation.x = -0.9 - sn(t * 5) * 0.3; ab.m.corpo.rotation.x = 0.2; break;
      case 'cuce': d0.rotation.x = -1.0 + sn(t * 9) * 0.15; d0.rotation.z += sn(t * 4.5) * 0.25; d1.rotation.x = -0.9; ab.m.testa.rotation.x = 0.4; break;
      case 'pesca': d0.rotation.x = -1.2 + sn(t * 1.5) * 0.08; d1.rotation.x = -0.5; ab.m.testa.rotation.x = 0.1; break;
      case 'dipinge': d0.rotation.x = -1.4 + sn(t * 3) * 0.25; d0.rotation.z += sn(t * 2.2) * 0.35; d1.rotation.x = -0.6; break;
      case 'suona': d0.rotation.x = -2.0; d1.rotation.x = -1.3 + sn(t * 6) * 0.25; ab.m.testa.rotation.z = 0.25 + sn(t * 2) * 0.08; ab.m.testa.rotation.x = 0; break;
      case 'legge': d0.rotation.x = -1.2; d1.rotation.x = -1.2; ab.m.testa.rotation.x = 0.4; ab.m.testa.rotation.y = sn(t * 0.7) * 0.15; break;
      case 'scrive': d0.rotation.x = -1.8 + sn(t * 5) * 0.12; d0.rotation.z += sn(t * 7) * 0.2; d1.rotation.x = -0.5; ab.m.testa.rotation.x = -0.1; break;
      case 'pianta': ab.m.corpo.rotation.x = 0.45; d0.rotation.x = -0.6 + sn(t * 4) * 0.5; d1.rotation.x = -0.6 - sn(t * 4) * 0.5; break;
      case 'vende': {
        // offre la merce e ogni tanto saluta chi passa
        d0.rotation.x = -1.2 + sn(t * 2) * 0.1;
        const saluta = sn(t * 0.8) > 0.6;
        d1.rotation.x = saluta ? -2.6 + sn(t * 9) * 0.3 : -0.6;
        ab.m.testa.rotation.x = 0;
        break;
      }
      case 'avvita': d0.rotation.x = -1.1; d0.rotation.z += sn(t * 8) * 0.4; d1.rotation.x = -0.9; ab.m.corpo.rotation.x = 0.15; break;
      case 'taglia': d0.rotation.x = -2.7 + Math.max(0, sn(t * 3)) * 2.2; d1.rotation.x = d0.rotation.x * 0.8; break;
      case 'annaffia': d0.rotation.x = -1.1; d0.rotation.z += sn(t * 1.5) * 0.25; d1.rotation.x = -0.5; ab.m.corpo.rotation.x = 0.12; break;
      case 'guarda': d0.rotation.x = -2.1; d1.rotation.x = -1.6; ab.m.testa.rotation.x = -0.35; g.rotation.y += sn(t * 0.5) * dt * 0.4; break;
      case 'consegna': case 'saluta': d0.rotation.x = -1.0; d1.rotation.x = -2.6 + sn(t * 8) * 0.3; ab.m.testa.rotation.x = 0; break;
      case 'foto': d0.rotation.x = -1.8; d1.rotation.x = -1.8; ab.m.testa.rotation.x = 0; break;
      case 'racconta': d0.rotation.x = -0.5 - Math.abs(sn(t * 2.5)) * 1.0; d1.rotation.x = -0.5 - Math.abs(sn(t * 2.5 + 1.3)) * 1.0; ab.m.testa.rotation.x = sn(t * 4) * 0.1; break;
      case 'cura': d0.rotation.x = -1.2 + sn(t * 2) * 0.2; d1.rotation.x = -0.8; ab.m.testa.rotation.x = 0.2 + sn(t * 3) * 0.1; break;
      // la sega avanti e indietro sull'asse, l'altra zampa tiene fermo il legno
      case 'sega': d0.rotation.x = -1.25 + sn(t * 7) * 0.4; d1.rotation.x = -1.0; ab.m.corpo.rotation.x = 0.12 + sn(t * 7) * 0.04; ab.m.testa.rotation.x = 0.35; break;
      // la zangola: tutte e due le zampe sul bastone, su e giù
      case 'zangola': d0.rotation.x = d1.rotation.x = -1.4 + sn(t * 4.5) * 0.35; ab.m.corpo.position.y = Math.abs(sn(t * 4.5)) * 0.03; ab.m.testa.rotation.x = 0.2; break;
      // timbra e mette in ordine: una zampa batte il timbro, l'altra sposta i fogli
      case 'timbra': d0.rotation.x = -1.3 + Math.max(0, sn(t * 4)) * 0.6; d1.rotation.x = -0.9 + sn(t * 1.3) * 0.25; d1.rotation.z += sn(t * 1.3) * 0.2; ab.m.testa.rotation.x = 0.35; break;
    }
    this.trucioli(ab, def, lav.gesto, t);
    ab.m.corpo.position.y = ab.mezzo ? 0.32 : Math.abs(sn(t * 7)) * 0.015;
    if (att.prossimo <= 0) {
      att.prossimo = 1.8 + Math.random() * 1.6;
      this.fumetto(ab, lav.fumetti[Math.floor(Math.random() * lav.fumetti.length)]);
    }
  }

  /** In sella alla moto o alla bici: il mezzo sotto, seduto, le mani sul manubrio. */
  private inSella(ab: Abitante, tipo: 'moto' | 'bici') {
    if (ab.dati.fase === 'cucciolo') return;
    if (!ab.mezzo) {
      const colore = defMestiere(ab.dati.mestiere)?.colore;
      ab.mezzo = tipo === 'moto' ? creaMoto(colore) : creaBici(colore);
      ab.mezzo.scale.setScalar(1 / Math.max(0.5, ab.m.gruppo.scale.x));
      ab.mezzo.position.set(0, 0, -0.05);
      ab.m.gruppo.add(ab.mezzo);
    }
    ab.m.corpo.position.y = 0.32;
    ab.m.zampe[2].rotation.x = ab.m.zampe[3].rotation.x = -1.2;
  }

  /** Dove va chi lavora in giro: alla porta di un altro (postino, dottore...), sulla riva del laghetto, alle aiuole. */
  private postoLavoro(ab: Abitante, def: DefMestiere): THREE.Vector3 {
    switch (def.lavoro.dove) {
      case 'acqua': {
        // il pescatore ha il suo angolo di riva, sempre lo stesso
        const lg = this.strutture.get('laghetto');
        if (!lg) return this.casa(ab);
        const [x, z] = puntoLago(((hash(ab.dati.id + 'riva') % 360) * Math.PI) / 180, 1.25);
        const c = Math.cos(lg.rotation.y), sn = Math.sin(lg.rotation.y);
        return new THREE.Vector3(lg.position.x + x * c + z * sn, 0, lg.position.z - x * sn + z * c);
      }
      case 'orto': return this.luogoAttivita('fiori') ?? this.casa(ab);
      default: {
        // alla porta di qualcun altro (o in un punto qualsiasi del villaggio, se non ci sono altre case)
        const altre = [...this.botteghe.entries()].filter(([id]) => id !== ab.dati.id).map(([, b]) => b);
        if (altre.length) {
          const b = altre[Math.floor(Math.random() * altre.length)];
          const p = new THREE.Vector3(Math.sin(b.rotation.y), 0, Math.cos(b.rotation.y)).multiplyScalar(2.6).add(b.position).setY(0);
          return p.add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5));
        }
        return this.postoLibero(ab, () => this.puntoCasuale());
      }
    }
  }

  /**
   * La postazione di lavoro di chi ha una casa con un mestiere: dove sta (dietro al banco), verso dove guarda
   * e dov'è il banco. È nella casa (creaAttrezziMestiere), quindi segue la casa se Giada la sposta o la gira.
   */
  private postazione(ab: Abitante): { punto: THREE.Vector3; verso: number; banco: THREE.Vector3 } | null {
    const b = this.botteghe.get(ab.dati.id);
    const p = b ? trovaPostazione(b) : null;
    if (!b || !p) return null;
    const c = Math.cos(b.rotation.y), s = Math.sin(b.rotation.y);
    const mondo = (x: number, z: number) => new THREE.Vector3(b.position.x + x * c + z * s, 0, b.position.z - x * s + z * c);
    return { punto: mondo(p.x, p.z), verso: b.rotation.y + p.verso, banco: mondo(p.banco.x, p.banco.z) };
  }

  /** È arrivato alla sua postazione? (solo lì si alza e fa i gesti del mestiere) */
  private allaPostazione(ab: Abitante): boolean {
    if (ab.attivita?.id !== 'lavoro' || ab.attivita.giro) return false;
    const p = this.postazione(ab);
    return !!p && p.punto.distanceTo(ab.m.gruppo.position) < 0.35;
  }

  /** Si siede sulle zampe dietro (come un cane), restando con le zampe davanti a terra o libere. */
  private siede(ab: Abitante, dt: number) {
    ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, -0.04, dt * 4);
    ab.m.zampe.slice(2).forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, 0, dt * 4)));
  }

  /** Scintille, trucioli, farina: quello che vola via dal banco mentre si lavora. */
  private trucioli(ab: Abitante, def: DefMestiere, gesto: string, t: number) {
    const colpo: Record<string, [number, string[]]> = {
      martella: [6, def.id === 'fabbro' ? ['#ffb347', '#ffe08a', '#ff7a2a'] : ['#c8a06a', '#a8a49c']],
      sega: [7, ['#e8c890', '#f4dcae']], taglia: [3, ['#e8c890', '#a06a40']], impasta: [5, ['#ffffff', '#f4ead8']],
      pianta: [4, ['#7a5232', '#8a6a42']], timbra: [4, ['#d8443a']],
    };
    const c = colpo[gesto];
    if (!c) return;
    // un colpo ogni mezzo giro del gesto
    const fase = Math.floor((t * c[0]) / Math.PI);
    if (fase === ab.ultimoColpo) return;
    ab.ultimoColpo = fase;
    if (fase % 2) return;
    const p = this.postazione(ab);
    if (!p) return;
    const dove = p.banco.clone().setY(def.id === 'fabbro' ? 0.65 : gesto === 'pianta' ? 0.1 : 0.78);
    for (let i = 0; i < 4; i++) {
      const col = c[1][i % c[1].length];
      if (!this.matBriciole.has(col)) this.matBriciole.set(col, new THREE.MeshBasicMaterial({ color: col }));
      const o = new THREE.Mesh(this.geoBriciola, this.matBriciole.get(col)!);
      o.position.copy(dove).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3));
      this.scene.add(o);
      this.effimeri.push({ o, vita: 0.5 + Math.random() * 0.3, vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 1.6) });
    }
  }
  private geoBriciola = new THREE.BoxGeometry(0.035, 0.035, 0.035);
  private matBriciole = new Map<string, THREE.MeshBasicMaterial>();

  /** Un punto a caso sulla riva del laghetto (il lago è ovale e si può girare con l'arredo). */
  private rivaDelLago(): THREE.Vector3 {
    const lg = this.strutture.get('laghetto');
    const [lx, lz, lr] = lg ? [lg.position.x, lg.position.z, lg.rotation.y] : POSTI_COSTRUZIONI.laghetto;
    const [x, z] = puntoLago(Math.random() * Math.PI * 2, 1.2);
    const c = Math.cos(lr), s = Math.sin(lr);
    return new THREE.Vector3(lx + x * c + z * s, 0, lz - x * s + z * c);
  }

  /** Dove si va a fare un'attività: vicino al castagno, sul bordo del laghetto, attorno al falò... */
  private luogoAttivita(id: string): THREE.Vector3 | null {
    const intorno = (x: number, z: number, r: number) => {
      const a = Math.random() * Math.PI * 2;
      return new THREE.Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r);
    };
    const posto = (k: string): [number, number] => {
      const g = this.strutture.get(k);
      return g ? [g.position.x, g.position.z] : [POSTI_COSTRUZIONI[k][0], POSTI_COSTRUZIONI[k][1]];
    };
    switch (id) {
      case 'raccogliere': return intorno(this.castagno.position.x, this.castagno.position.z, 1.6);
      case 'pescare': return this.rivaDelLago();
      case 'fiori': {
        // cura l'aiuola dei fiori o una delle aiuole di Giada
        const tutte = [posto('aiuola'), ...this.arredo.aiuole.map((a) => [a.x, a.z] as [number, number])];
        const p = tutte[Math.floor(Math.random() * tutte.length)];
        return intorno(p[0], p[1], 1.0);
      }
      case 'storie': { const p = posto('falo'); return intorno(p[0], p[1], 1.3); }
      case 'stelle': { const p = posto('torretta'); return intorno(p[0], p[1], 1.4); }
      default: return null;
    }
  }

  /** L'animale fa una cosa che ha imparato. */
  private faiAttivita(ab: Abitante, dt: number, t: number) {
    const att = ab.attivita!;
    const g = ab.m.gruppo;
    const def = REGOLE.abilita.find((d) => d.id === att.id);
    att.tempo -= dt;
    att.prossimo -= dt;
    if (att.prossimo <= 0 && def) {
      att.prossimo = 1.4 + Math.random() * 1.2;
      this.fumetto(ab, def.simbolo);
    }
    const guardaVerso = (x: number, z: number) => {
      const verso = Math.atan2(x - g.position.x, z - g.position.z);
      const d = Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y));
      g.rotation.y += d * Math.min(1, dt * 4);
    };
    ab.m.testa.rotation.x = 0;
    switch (att.id) {
      // (fuori dalla postazione nessuno alza le zampe davanti: si fa tutto da animali veri, a quattro zampe o seduti)
      case 'cantare':
        this.siede(ab, dt);
        ab.m.testa.rotation.z = Math.sin(t * 3) * 0.2;
        ab.m.testa.rotation.x = -0.35;
        break;
      case 'ballare':
        g.rotation.y += dt * 4;
        ab.m.corpo.position.y = Math.abs(Math.sin(t * 8)) * 0.15;
        ab.m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(t * 8 + i) * 0.4));
        break;
      case 'pescare': {
        const lg = this.strutture.get('laghetto');
        const p = lg ? [lg.position.x, lg.position.z] : POSTI_COSTRUZIONI.laghetto;
        guardaVerso(p[0], p[1]);
        if (!ab.canna) {
          ab.canna = creaCanna();
          ab.m.zampe[0].add(ab.canna);
        }
        this.siede(ab, dt);
        ab.m.zampe[0].rotation.x = -0.9 + Math.sin(t * 1.5) * 0.08;
        break;
      }
      case 'raccogliere':
      case 'fiori':
        // muso a terra e una zampa che raspa un po' (come fanno i cani)
        ab.m.corpo.rotation.x = 0.3 + Math.sin(t * 2.5) * 0.06;
        ab.m.testa.rotation.x = 0.35;
        ab.m.zampe[0].rotation.x = -0.25 + Math.sin(t * 7) * 0.25;
        ab.m.zampe[1].rotation.x = 0;
        if (att.id === 'raccogliere') guardaVerso(this.castagno.position.x, this.castagno.position.z);
        break;
      case 'intagliare':
        // sdraiato, rosicchia e liscia un pezzetto di legno tra le zampe
        ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, -0.08, dt * 4);
        ab.m.testa.rotation.x = 0.4 + Math.abs(Math.sin(t * 9)) * 0.06;
        break;
      case 'storie': {
        const fl = this.strutture.get('falo');
        const p = fl ? [fl.position.x, fl.position.z] : POSTI_COSTRUZIONI.falo;
        guardaVerso(p[0], p[1]);
        this.siede(ab, dt);
        ab.m.testa.rotation.x = Math.sin(t * 4) * 0.12;
        ab.m.testa.rotation.z = Math.sin(t * 1.7) * 0.12;
        break;
      }
      case 'stelle':
        ab.m.testa.rotation.x = -0.55;
        break;
      case 'lavoro': {
        this.lavora(ab, dt, t, guardaVerso);
        break;
      }
      case 'seduto': {
        // seduto nel suo posticino: dondola la testa, ogni tanto un sorriso
        ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, ab.eretto > 0.5 ? -0.14 : -0.04, dt * 4);
        ab.m.zampe.slice(2).forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, ab.eretto > 0.5 ? -1.35 : 0, dt * 4)));
        ab.m.zampe.slice(0, 2).forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, -0.3, dt * 4)));
        ab.m.testa.rotation.z = Math.sin(t * 0.9 + g.position.x) * 0.12;
        if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(t * 1.5) * 0.25;
        if (att.prossimo <= 0) {
          att.prossimo = 3 + Math.random() * 4;
          this.fumetto(ab, ['☺', '♪', '♥', '…', '✿'][Math.floor(Math.random() * 5)]);
        }
        break;
      }
      case 'riposino': {
        // seduto a sonnecchiare: occhi socchiusi, testa che ciondola
        ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, ab.eretto > 0.5 ? -0.14 : -0.04, dt * 4);
        ab.m.zampe.slice(2).forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, ab.eretto > 0.5 ? -1.35 : 0, dt * 4)));
        ab.m.testa.rotation.x = 0.2 + Math.sin(t * 0.7) * 0.08;
        for (const o of ab.m.occhi) o.scale.y = 0.25;
        if (att.prossimo <= 0) { att.prossimo = 4 + Math.random() * 3; this.fumetto(ab, '…'); }
        break;
      }
      case 'merenda': {
        // sgranocchia qualcosa: zampine alla bocca
        ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, ab.eretto > 0.5 ? -0.14 : -0.04, dt * 4);
        ab.m.zampe.slice(2).forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, ab.eretto > 0.5 ? -1.35 : 0, dt * 4)));
        // sgranocchia qualcosa che tiene tra le zampe, col muso giù
        ab.m.testa.rotation.x = 0.45 + Math.abs(Math.sin(t * 8)) * 0.06;
        if (att.prossimo <= 0) { att.prossimo = 3 + Math.random() * 3; this.fumetto(ab, ['🌰', '🍓', '☺'][Math.floor(Math.random() * 3)]); }
        break;
      }
      case 'guarda':
        // si guarda intorno, col naso all'insù quando è sera
        ab.m.testa.rotation.y = Math.sin(t * 0.5 + g.position.x) * 0.6;
        ab.m.testa.rotation.x = this.momento() === 'sera' ? -0.4 : -0.1;
        if (att.prossimo <= 0) { att.prossimo = 4 + Math.random() * 4; this.fumetto(ab, this.momento() === 'sera' ? '☆' : '♪'); }
        break;
      case 'annusa':
        // naso a terra tra l'erba e i fiori
        ab.m.corpo.rotation.x = 0.3 + Math.sin(t * 3) * 0.05;
        ab.m.testa.rotation.x = 0.35 + Math.sin(t * 12) * 0.05;
        ab.m.testa.rotation.y = Math.sin(t * 1.4) * 0.4;
        if (att.prossimo <= 0) { att.prossimo = 3 + Math.random() * 3; this.fumetto(ab, '✿'); }
        break;
      case 'stiracchia': {
        // si stiracchia come un gatto: zampe davanti allungate in avanti, sedere all'insù
        const s = Math.max(0, Math.min(1, Math.sin(Math.min(Math.PI, (att.tempo % 4) * 0.8)) * 1.3));
        ab.m.zampe.slice(0, 2).forEach((z) => (z.rotation.x = -0.7 * s));
        ab.m.corpo.rotation.x = 0.22 * s;
        ab.m.testa.rotation.x = -0.25 * s;
        ab.m.corpo.scale.set(1, 1, 1 + 0.05 * s);
        break;
      }
      case 'saltella':
        ab.m.corpo.position.y = Math.abs(Math.sin(t * 6)) * 0.18;
        g.rotation.y += dt * 1.2;
        if (att.prossimo <= 0) { att.prossimo = 2.5 + Math.random() * 2; this.fumetto(ab, '♪'); }
        break;
    }
    if (att.tempo <= 0) {
      this.fineAttivita(ab);
      ab.m.corpo.position.y = 0;
      ab.pausa = 1.5 + Math.random() * 2;
    }
  }

  private fumetto(ab: Abitante, simbolo: string) {
    const colore = simbolo === '♥' ? '#ff6b8a' : simbolo === '♪' ? '#8fd3ff' : simbolo === '✿' ? '#ffd166' : '#ffffff';
    const f = spriteTesto(simbolo, colore);
    f.scale.setScalar(0.42);
    f.position.copy(ab.m.gruppo.position).add(new THREE.Vector3(0, 1.75 * ab.m.gruppo.scale.x, 0));
    this.scene.add(f);
    this.effimeri.push({ o: f, vita: 1.1, vel: new THREE.Vector3(0, 0.35, 0) });
  }

  // ---------- primo piano: schiusa e sorprese ----------

  /** Questi animali sono già nati, ma restano uova finché Giada non vede la schiusa. */
  trattieni(ids: string[]) {
    for (const id of ids) this.trattenuti.add(id);
  }

  /** Si salta il riepilogo: chi era nato esce subito dall'uovo, senza spettacolo. */
  lasciaTutti() {
    this.trattenuti.clear();
    if (this.ultimoStato) this.aggiorna(this.ultimoStato);
  }

  private vibra(p: number | number[]) {
    try {
      navigator.vibrate?.(p);
    } catch {
      /* niente vibrazione */
    }
  }

  /** Telecamera davanti alla vetrata dell'acquario, per guardare i pesci. */
  inquadraAcquario(): boolean {
    const g = this.acquario?.gruppo;
    if (!g) return false;
    const p = new THREE.Vector3();
    this.cine = { segui: () => g.localToWorld(p.copy(CENTRO_VASCA)).setY(0), dist: 9.5, alt: 2.3, guardaY: -0.5, angolo: g.rotation.y, oggetto: g };
    return true;
  }

  /** Telecamera all'inizio di un sentiero, che guarda lontano verso il posto scoperto. */
  inquadraSentiero(id: string): boolean {
    const b = BIOMA[id];
    if (!b || !this.sentieri.portale(id)) return false;
    const a = ((this.sentieri.angoloDi(id) ?? b.angolo) * Math.PI) / 180;
    const meta = new THREE.Vector3(Math.cos(a) * (this.raggio + 5), 0, Math.sin(a) * (this.raggio + 5));
    this.cine = { segui: () => meta.clone(), dist: 10.5, alt: 4.6, guardaY: -0.6, torna: true, angolo: Math.atan2(-Math.cos(a), -Math.sin(a)), oggetto: this.sentieri.portale(id)! };
    return true;
  }

  /**
   * Da che parte partono i sentieri: vicino alla direzione del posto lontano, ma girando un po'
   * finché davanti non c'è una casa, una costruzione grande o un altro sentiero (e mai sul viale).
   */
  private angoliPerSentieri(biomi: DefBioma[]): Map<string, number> {
    const out = new Map<string, number>();
    const r = this.raggio;
    const ingombri = this.occupati().filter(([, , d]) => d >= 2);
    for (const b of biomi) {
      let scelto = b.angolo;
      for (let k = 0; k <= 30; k++) {
        const g = b.angolo + Math.ceil(k / 2) * 4 * (k % 2 ? 1 : -1);
        const a = (g * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
        if (Math.abs(((g - 90 + 540) % 360) - 180) < 40) continue;
        if ([...out.values()].some((x) => Math.abs(((g - x + 540) % 360) - 180) < 24)) continue;
        const urta = ingombri.some(([x, z, d]) => x * c + z * sn > r - 7 && Math.abs(-x * sn + z * c) < d * 0.8 + 1.6);
        if (!urta) { scelto = g; break; }
      }
      out.set(b.id, ((scelto % 360) + 360) % 360);
    }
    return out;
  }

  /** Quanti pesci nuotano nell'acquario (per le prove). */
  get pesciInVasca(): number {
    return this.acquario?.quanti ?? 0;
  }

  /** Telecamera ravvicinata su un animale, un uovo, il corvo o un edificio. */
  inquadra(cosa: { tipo: 'animale' | 'uovo' | 'edificio'; id: string } | { tipo: 'corvo' }): boolean {
    let o: THREE.Object3D | undefined;
    let dist = 2.6, alt = 0.9, guardaY = 0.55;
    if (cosa.tipo === 'animale') {
      const ab = this.abitanti.get(cosa.id);
      if (!ab) return false;
      o = ab.m.gruppo;
      const sc = o.scale.x;
      dist = 3.1 * sc + 0.6;
      alt = 1.1 * sc;
      guardaY = 0.6 * sc;
      // si ferma e si gira verso di noi
      ab.pausa = 999;
      if (ab.attivita) this.fineAttivita(ab);
      ab.salto = 0.8;
      this.cine = null;
      o.rotation.y = this.angolo;
      for (let i = 0; i < 6; i++) this.stellina(o.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.4 + Math.random() * 1.2 * sc, (Math.random() - 0.5) * 1.4)));
    } else if (cosa.tipo === 'uovo') {
      o = this.uova.get(cosa.id);
      dist = 2.5; alt = 1.85; guardaY = 0.35; // un po' dall'alto: il bordo del nido non copre l'uovo
      if (o) o.userData.scossa = 1;
    } else if (cosa.tipo === 'edificio') {
      o = this.edifici.get(cosa.id);
      dist = 6; alt = 2.4; guardaY = 1.4;
    } else {
      o = this.corvo.gruppo;
      dist = 3; alt = 1.2; guardaY = 1.6;
      this.corvoParla = 2;
    }
    if (!o) return false;
    const bersaglio = o;
    const pos = new THREE.Vector3();
    // angolo: dalla parte della telecamera di adesso, così il volo è breve
    const ang = Math.atan2(this.posCam.x - o.position.x, this.posCam.z - o.position.z);
    this.cine = { segui: () => bersaglio.getWorldPosition(pos).setY(0), dist, alt, guardaY, angolo: ang, animale: cosa.tipo === 'animale' ? cosa.id : undefined, oggetto: bersaglio };
    if (cosa.tipo === 'animale') (bersaglio as THREE.Group).rotation.y = ang;
    return true;
  }

  /** Ingombro di un oggetto visto dall'alto (raggio) e quanto è alto: calcolato una volta sola. */
  private ingombro(o: THREE.Object3D): { r: number; h: number } {
    let m = o.userData.ingombro as { r: number; h: number } | undefined;
    if (!m) {
      const box = new THREE.Box3().setFromObject(o);
      const dim = box.getSize(new THREE.Vector3());
      m = box.isEmpty() ? { r: 0, h: 0 } : { r: Math.min(2.5, Math.max(dim.x, dim.z) / 2), h: box.max.y };
      o.userData.ingombro = m;
    }
    return m;
  }

  /**
   * Durante il primo piano (schiusa, "mentre eri via") niente deve stare tra la telecamera
   * e quello che si guarda: alberi, case e animali di passaggio si tolgono di mezzo finché dura.
   */
  private liberaVista(bersaglio?: THREE.Object3D) {
    if (!bersaglio) return;
    const cam = this.posCam;
    const meta = this.guardaCam;
    const dx = meta.x - cam.x, dz = meta.z - cam.z;
    const lung2 = dx * dx + dz * dz || 1;
    const ora = new Set<THREE.Object3D>();
    const prova = (o: THREE.Object3D) => {
      if (o === bersaglio || o === this.bosco || o === this.selvatici || o === this.prato) return;
      if (this.pescata && (o === this.strutture.get('laghetto') || o === this.strutture.get('ponticello'))) return;
      if (o instanceof THREE.Light || o instanceof THREE.Points || o instanceof THREE.Sprite) return;
      if (!o.visible && !this.nascostiCine.has(o)) return;
      const p = o.position;
      const t = ((p.x - cam.x) * dx + (p.z - cam.z) * dz) / lung2;
      if (t <= 0 || t >= 1) return;
      const { r, h } = this.ingombro(o);
      if (r <= 0) return;
      const vicino = Math.hypot(p.x - meta.x, p.z - meta.z);
      if (vicino < 0.7) return; // il nido sotto l'uovo, la panchina dove sta seduto: restano
      const lontano = Math.hypot(p.x - (cam.x + dx * t), p.z - (cam.z + dz * t));
      const quotaRaggio = cam.y + (meta.y - cam.y) * t;
      if (lontano < r + 0.35 && h > quotaRaggio - 0.2) ora.add(o);
    };
    for (const o of this.scene.children) prova(o);
    for (const o of this.bosco.children) prova(o);
    for (const o of this.selvatici.children) prova(o);
    for (const o of ora) {
      if (!this.nascostiCine.has(o)) this.nascostiCine.set(o, o.visible);
      o.visible = false;
    }
    for (const [o, prima] of this.nascostiCine) {
      if (ora.has(o)) continue;
      o.visible = prima;
      this.nascostiCine.delete(o);
    }
  }

  private rimettiNascosti() {
    for (const [o, prima] of this.nascostiCine) o.visible = prima;
    this.nascostiCine.clear();
  }

  /** Finito il primo piano: si torna alla vista di sempre, centrata su quello che si è visto. */
  fineCinema() {
    const c = this.cine;
    if (!c) return;
    const p = c.segui();
    this.centroVoluto.set(p.x, 0, p.z);
    this.centro.copy(this.centroVoluto);
    this.angolo = c.angolo;
    // dal sentiero (fuori dal bosco) si torna piano piano in mezzo al villaggio
    if (c.torna) this.centroVoluto.set(0, 0, 0);
    this.cine = null;
    this.morbido = 1.8;
    for (const ab of this.abitanti.values()) if (ab.pausa > 100) ab.pausa = 1 + Math.random();
  }

  private stellina(p: THREE.Vector3, colore = '#ffe680') {
    const st = spriteTesto('✦', colore);
    st.scale.setScalar(0.12 + Math.random() * 0.1);
    st.position.copy(p);
    (st.material as THREE.SpriteMaterial).transparent = true;
    this.scene.add(st);
    this.stelline.push({ o: st, vita: 1 + Math.random() * 0.8 });
  }

  /**
   * La schiusa come spettacolo: l'uovo trema tre volte, si crepa, si illumina,
   * scoppia e ne esce il cucciolo che sbadiglia e saluta. Si risolve quando è finita (circa 9 secondi).
   */
  schiusa(id: string, onFase?: (f: 'trema' | 'crepa' | 'luce' | 'nato') => void): Promise<void> {
    return new Promise((fatto) => {
      const uovo = this.uova.get(id);
      if (!uovo || !this.trattenuti.has(id)) {
        this.trattenuti.delete(id);
        if (this.ultimoStato) this.aggiorna(this.ultimoStato);
        fatto();
        return;
      }
      this.inquadra({ tipo: 'uovo', id });
      // materiale tutto suo: quello di serie è condiviso con le altre uova
      const gu = uovo.getObjectByName('guscio') as THREE.Mesh | undefined;
      if (gu) gu.material = materiale({ color: '#fff7e6', rim: 0.5 });
      const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: puntoTondo(), color: '#fff1a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      alone.position.copy(uovo.position).setY(0.42);
      alone.scale.setScalar(0.01);
      const raggi = new THREE.Sprite(new THREE.SpriteMaterial({ map: texRaggi(), color: '#fff6c4', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      raggi.position.copy(alone.position);
      raggi.scale.setScalar(0.01);
      const luce = new THREE.PointLight('#ffe7a0', 0, 4);
      luce.position.copy(uovo.position).setY(0.6);
      this.scene.add(alone, raggi, luce);
      this.schiusaIn = { id, t: 0, uovo, crepe: 0, alone, raggi, luce, nato: false, gusci: [], base: 1, fatto, onFase };
      onFase?.('trema');
    });
  }

  private aggiornaSchiusa(dt: number, t: number) {
    const sc = this.schiusaIn;
    if (!sc) return;
    const prima = sc.t;
    sc.t += dt * this.velocita;
    const T = sc.t;
    const passa = (x: number) => prima < x && T >= x;
    const u = sc.uovo;

    if (!sc.nato) {
      // tre scossoni sempre più forti, ognuno lascia una crepa
      let ampiezza = Math.sin(t * 2.4) * 0.03;
      const scossoni = [1.5, 2.6, 3.6];
      scossoni.forEach((x, i) => {
        if (passa(x)) {
          this.crepa(u, i);
          this.vibra(40 + i * 40);
          if (i === 0) sc.onFase?.('crepa');
          for (let k = 0; k < 3 + i * 2; k++) this.stellina(u.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 0.3 + Math.random() * 0.6, (Math.random() - 0.5) * 0.7)), '#ffffff');
        }
        const d = T - x;
        if (d > 0 && d < 0.5) ampiezza += Math.sin(d * 40) * (0.12 + i * 0.07) * (1 - d / 0.5);
      });
      // luce che filtra dalle crepe, poi esplode
      const luce = THREE.MathUtils.clamp((T - 4.3) / 1.1, 0, 1);
      if (passa(4.3)) {
        sc.onFase?.('luce');
        this.vibra([30, 40, 30, 40, 30, 40, 60]);
      }
      if (luce > 0) ampiezza += Math.sin(T * 55) * 0.06 * luce;
      u.rotation.z = ampiezza;
      u.position.y = luce > 0 ? Math.abs(Math.sin(T * 30)) * 0.03 * luce : 0;
      const gu = u.getObjectByName('guscio') as THREE.Mesh | undefined;
      if (gu) {
        const m = gu.material as THREE.MeshToonMaterial;
        m.emissive?.set('#ffe08a');
        if (m.emissive) m.emissiveIntensity = luce * 0.9;
      }
      sc.alone.scale.setScalar(0.3 + luce * 1.6);
      (sc.alone.material as THREE.SpriteMaterial).opacity = luce * 0.9;
      sc.raggi.scale.setScalar(0.5 + luce * 2.6);
      (sc.raggi.material as THREE.SpriteMaterial).opacity = luce * 0.75;
      (sc.raggi.material as THREE.SpriteMaterial).rotation = T * 0.8;
      sc.luce.intensity = luce * 6;

      if (T >= 5.4) {
        // scoppia: gusci che volano, lampo, e il cucciolo
        sc.nato = true;
        this.vibra([90, 50, 140]);
        const pos = u.position.clone();
        sc.gusci = creaGusci();
        sc.gusci.forEach((g, i) => {
          g.position.copy(pos);
          if (i === 0) g.position.y += 0.4;
          g.userData.vel = i === 0 ? new THREE.Vector3(0.6, 2.6, 0.4) : new THREE.Vector3(0, 0, 0);
          this.scene.add(g);
        });
        this.coriandoli(pos.clone().setY(0.6), ['#ffd166', '#ff8fb1', '#7ccf6a', '#8fd3ff', '#ffffff']);
        for (let k = 0; k < 12; k++) this.stellina(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.3 + Math.random() * 1.4, (Math.random() - 0.5) * 1.6)));
        this.trattenuti.delete(sc.id);
        if (this.ultimoStato) this.aggiorna(this.ultimoStato);
        const ab = this.abitanti.get(sc.id);
        if (ab) {
          ab.pausa = 999;
          ab.salto = 0;
          sc.base = ab.m.gruppo.scale.x;
          ab.m.gruppo.scale.setScalar(0.01);
          ab.m.gruppo.position.copy(pos).setY(0);
          ab.m.gruppo.rotation.y = this.cine?.angolo ?? 0;
          // da qui la telecamera segue il cucciolo, un po' più indietro
          const g = ab.m.gruppo;
          const p = new THREE.Vector3();
          if (this.cine) this.cine = { ...this.cine, segui: () => g.getWorldPosition(p).setY(0), dist: 3.1 * sc.base + 0.6, alt: 1.1 * sc.base, guardaY: 0.6 * sc.base, animale: sc.id };
        }
        sc.onFase?.('nato');
      }
      return;
    }

    // dopo la nascita
    const D = T - 5.4;
    const lampo = Math.max(0, 1 - D / 0.6);
    sc.alone.scale.setScalar(1.9 + D * 3);
    (sc.alone.material as THREE.SpriteMaterial).opacity = lampo;
    (sc.raggi.material as THREE.SpriteMaterial).opacity = lampo * 0.75;
    sc.luce.intensity = lampo * 6;
    for (const g of sc.gusci) {
      const v = g.userData.vel as THREE.Vector3;
      if (v.lengthSq() > 0) {
        v.y -= 6 * dt;
        g.position.addScaledVector(v, dt);
        g.rotation.x += dt * 6;
        g.rotation.z += dt * 3;
        if (g.position.y < 0.05) { g.position.y = 0.05; v.set(0, 0, 0); }
      }
    }
    const ab = this.abitanti.get(sc.id);
    if (ab) {
      // spunta con un rimbalzo
      const k = Math.min(1, D / 0.55);
      const rimbalzo = k < 1 ? (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.3) : 1;
      ab.m.gruppo.scale.setScalar(Math.max(0.01, sc.base * rimbalzo));
      ab.pausa = 999;
      // sbadiglio: testa all'indietro, occhi chiusi, si stiracchia
      const sb = THREE.MathUtils.clamp((D - 1.1) / 1.6, 0, 1);
      const curva = Math.sin(sb * Math.PI);
      if (sb > 0 && sb < 1) {
        ab.m.testa.rotation.x = -0.45 * curva;
        ab.m.testa.rotation.z = 0.1 * curva;
        for (const o of ab.m.occhi) o.scale.y = 0.15;
        ab.m.corpo.scale.y = 1 + 0.1 * curva;
      } else if (sb >= 1) {
        ab.m.corpo.scale.y = 1;
      }
      if (passa(5.4 + 1.3)) this.vibra(20);
      if (passa(5.4 + 3.0)) {
        ab.salto = 0.7;
        const cuore = spriteTesto('♥', '#ff6b8a');
        cuore.scale.setScalar(0.4);
        cuore.position.copy(ab.m.gruppo.position).add(new THREE.Vector3(0, 1.5 * sc.base, 0));
        this.scene.add(cuore);
        this.effimeri.push({ o: cuore, vita: 1.6, vel: new THREE.Vector3(0, 0.6, 0) });
      }
    }
    if (D > 3.6) {
      this.scene.remove(sc.alone, sc.raggi, sc.luce);
      // il guscio di sotto resta un po' nel nido, poi sparisce
      const gusci = sc.gusci;
      setTimeout(() => gusci.forEach((g) => this.scene.remove(g)), 6000);
      const fatto = sc.fatto;
      this.schiusaIn = null;
      fatto();
    }
  }

  /** Una crepa a zig-zag sul lato dell'uovo che guarda la telecamera. */
  private crepa(u: THREE.Group, n: number) {
    const verso = Math.atan2(this.posCam.x - u.position.x, this.posCam.z - u.position.z);
    const m = new THREE.MeshBasicMaterial({ color: '#3a2a1a' });
    const punti: THREE.Vector3[] = [];
    const da = n === 0 ? -0.45 : n === 1 ? 0.35 : -1.2;
    const a = n === 0 ? 0.45 : n === 1 ? 1.25 : -0.35;
    const passi = 6;
    for (let i = 0; i <= passi; i++) {
      const phi = verso + da + ((a - da) * i) / passi;
      const y = 0.46 + (i % 2 ? 0.035 : -0.028) * (0.7 + Math.random() * 0.6) + n * 0.03;
      const dy = (y - 0.38) / 0.39;
      const r = 0.3 * Math.sqrt(Math.max(0, 1 - dy * dy)) * 1.03;
      punti.push(new THREE.Vector3(Math.sin(phi) * r, y, Math.cos(phi) * r));
    }
    if (n === 2) punti.push(new THREE.Vector3(punti[3].x * 0.98, 0.62, punti[3].z * 0.98));
    const g = new THREE.Group();
    for (let i = 1; i < punti.length; i++) {
      const p1 = n === 2 && i === punti.length - 1 ? punti[3] : punti[i - 1], p2 = punti[i];
      const len = p1.distanceTo(p2);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, len), m);
      seg.position.copy(p1).add(p2).multiplyScalar(0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p2.clone().sub(p1).normalize());
      g.add(seg);
    }
    u.add(g);
  }

  // ---------- la pesca: Giada manda un animale in fondo al pontile ----------

  /** L'animale va a pescare: si mette in fondo al pontile e la telecamera lo guarda da dietro le spalle. */
  iniziaPesca(id: string): Pescata | null {
    const lago = this.strutture.get('laghetto');
    const ab = this.abitanti.get(id);
    if (!lago || !ab || this.trattenuti.has(id)) return null;
    if (this.pescata) this.finePesca();
    if (ab.attivita) this.fineAttivita(ab);
    if (ab.amico) { const b = this.abitanti.get(ab.amico); if (b) b.amico = null; ab.amico = null; }
    if (ab.canna) { ab.canna.parent?.remove(ab.canna); ab.canna = null; }
    if (ab.mezzo) { ab.mezzo.parent?.remove(ab.mezzo); ab.mezzo = null; }
    for (const z of ab.z) z.parent?.remove(z);
    ab.z = [];
    if (ab.balloon) ab.balloon.visible = false;
    ab.pausa = 999;
    ab.salto = 0;
    const da = ab.m.gruppo.position.clone();
    for (let i = 0; i < 6; i++) this.stellina(da.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.3 + Math.random(), (Math.random() - 0.5) * 1.2)));
    const p = new Pescata(this.scene, ab.m, lago, id);
    this.pescata = p;
    this.ostacoliTra = 0;
    for (let i = 0; i < 6; i++) this.stellina(p.piedi.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.3 + Math.random(), (Math.random() - 0.5) * 1.2)));
    const sc = ab.m.gruppo.scale.x;
    // da dietro, un po' di lato: si vedono l'animale, la canna e il galleggiante sull'acqua
    this.cine = { segui: () => p.fuoco(), dist: 4.2 + sc * 0.6, alt: 2.5 + sc * 0.3, guardaY: 0.2, angolo: p.verso + Math.PI + 0.7, oggetto: ab.m.gruppo };
    return p;
  }

  /** Il pesce è preso: la telecamera gira davanti all'animale che lo fa vedere. */
  inquadraPescato() {
    const p = this.pescata;
    if (!p || !this.cine) return;
    const sc = p.m.gruppo.scale.x;
    // (dallo stesso lato di prima, così la telecamera gira intorno e non gli passa attraverso)
    this.cine = { ...this.cine, segui: () => p.piedi.clone().setY(0), dist: 3.2 + sc * 0.6, alt: 1.2 + sc * 0.4, guardaY: 0.7 * sc + 0.3, angolo: p.verso - 1.15 };
  }

  /** Torna alla vista da dietro (per un altro lancio). */
  inquadraLancio() {
    const p = this.pescata;
    if (!p || !this.cine) return;
    const sc = p.m.gruppo.scale.x;
    this.cine = { ...this.cine, segui: () => p.fuoco(), dist: 4.2 + sc * 0.6, alt: 2.5 + sc * 0.3, guardaY: 0.2, angolo: p.verso + Math.PI + 0.7 };
  }

  /** Basta pescare: l'animale scende dal pontile e la telecamera torna quella di sempre. */
  finePesca() {
    const p = this.pescata;
    if (!p) return;
    p.distruggi();
    this.pescata = null;
    const ab = this.abitanti.get(p.id);
    if (ab) {
      ab.pausa = 1.5;
      ab.meta.copy(ab.m.gruppo.position);
      ab.salto = 0.5;
    }
    this.fineCinema();
  }

  /** Ferma (o fa ripartire) il disegno del bosco, ad esempio mentre si guarda dentro una casa. */
  sospendi(si: boolean) {
    cancelAnimationFrame(this.raf);
    if (!si) {
      this.orologio.getDelta();
      this.ciclo();
    }
  }

  distruggi() {
    cancelAnimationFrame(this.raf);
    for (const t of this.tagli) t.smonta();
    this.festa?.distruggi();
    this.resizeObs.disconnect();
    this.renderer.dispose();
  }
}
