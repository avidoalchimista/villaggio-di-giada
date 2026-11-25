// Dentro casa: una stanza "da casa delle bambole" (due pareti, il resto aperto verso di noi)
// dove si vede la famiglia che ci abita fare le sue cose, secondo l'ora e il carattere di ognuno.
// Due tipi di casa: la casa di chi ha un mestiere (con il banco da lavoro) e la tana sotto il grande
// albero, dove vivono insieme i piccoli che una casa loro non ce l'hanno ancora.
import * as THREE from 'three';
import { carattereDi, cosaFaInCasa, type Arredo, type AttivitaCasa, type Momento, type Posto } from '../lib/carattere';
import { hash } from '../lib/caso';
import type { Animale } from '../lib/tipi';
import { aggiornaMestiere, ampiezzaPasso, creaAnimale, espressione, mat, posa, rifinisci, seduta, SIMBOLI_MESTIERE, type ModelloAnimale } from './modelli';
import { contorno, CURVA, macchie, ombra, spriteTesto, texture } from './ps1';

const geo = {
  palla: (r: number, s = 16) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75)),
  cono: (r: number, h: number, s = 12) => new THREE.ConeGeometry(r, h, s),
  cil: (r1: number, r2: number, h: number, s = 14) => new THREE.CylinderGeometry(r1, r2, h, s),
  scatola: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
  toro: (r: number, t: number) => new THREE.TorusGeometry(r, t, 8, 20),
};
function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

// misure della stanza
const LX = 3.6; // metà larghezza
const LZ = 2.6; // metà profondità
const ALTO = 3.3;

type Tipo = 'casa' | 'tana';

/** Tiene un punto dentro la stanza, lontano dai due muri quanto basta perché un animale non ci entri. */
function dentroStanza(p: THREE.Vector3): THREE.Vector3 {
  p.x = THREE.MathUtils.clamp(p.x, -LX + 0.6, LX - 0.45);
  p.z = THREE.MathUtils.clamp(p.z, -LZ + 0.55, LZ - 0.35);
  return p;
}

interface Ospite {
  dati: Animale;
  m: ModelloAnimale;
  att: AttivitaCasa;
  meta: THREE.Vector3;
  guarda: number; // verso dove si gira una volta arrivato
  tappa: THREE.Vector3 | null; // passa dal centro della stanza, così non attraversa i mobili
  passo: number;
  eretto: number;
  fumetto: number;
  z: THREE.Sprite[];
  salto: number;
  turno: number;
  ammicca: number;
  chiave: string; // il punto della stanza dove sta andando
}

export interface StatoOspite {
  id: string;
  testo: string;
}

/** Dove sta ogni posto della stanza: [x, z, verso cui guardare]. */
type Ancora = [number, number, number];

export class Interno {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  private luceLampada = new THREE.PointLight('#ffc977', 0, 9, 1.4);
  private sole = new THREE.DirectionalLight('#fff1d6', 1.2);
  private ambiente = new THREE.HemisphereLight('#fff4e0', '#8a6a4a', 1.2);
  private paralume!: THREE.Mesh;
  private vetro!: THREE.Mesh;
  private ospiti: Ospite[] = [];
  private ancore = new Map<string, Ancora>(); // posto (+ id per quelli personali) → dove
  private effimeri: { o: THREE.Object3D; vita: number; vel: THREE.Vector3 }[] = [];
  private orologio = new THREE.Clock();
  private raf = 0;
  private angolo = 0;
  private angoloVoluto = 0;
  private trascina: { x: number; mosso: number } | null = null;
  private resizeObs: ResizeObserver;
  private momentoAttuale: Momento;
  private lancette: THREE.Object3D | null = null;
  private grammofono: THREE.Object3D | null = null;
  onTocco: (id: string) => void = () => {};
  onCambio: () => void = () => {};

  constructor(
    private canvas: HTMLCanvasElement,
    private tipo: Tipo,
    abitanti: Animale[],
    private momento: () => Momento,
    proprietario?: Animale,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene.add(this.ambiente, this.sole, this.luceLampada);
    this.sole.position.set(1, 6, -6);
    this.luceLampada.position.set(0.2, 2.6, 0.2);
    this.momentoAttuale = momento();

    const chi = proprietario ?? abitanti[0];
    if (tipo === 'casa' && chi) this.arredaCasa(chi);
    else this.arredaTana(abitanti);
    for (const a of abitanti) this.aggiungiOspite(a);
    this.luci();

    this.resizeObs = new ResizeObserver(() => this.ridimensiona());
    this.resizeObs.observe(canvas);
    this.ridimensiona();
    this.collegaInput();
    this.ciclo();
  }

  // ---------- la stanza ----------

  private stanza(muro: THREE.Material, pavimento: THREE.Material, battiscopa: string) {
    const pav = mesh(geo.scatola(LX * 2 + 0.3, 0.2, LZ * 2 + 0.3), pavimento, 0, -0.1, 0);
    this.scene.add(pav);
    const fondo = mesh(geo.scatola(LX * 2 + 0.3, ALTO, 0.2), muro, 0, ALTO / 2, -LZ - 0.1);
    const lato = mesh(geo.scatola(0.2, ALTO, LZ * 2 + 0.3), muro, -LX - 0.1, ALTO / 2, 0);
    this.scene.add(fondo, lato);
    // battiscopa e travetto in alto: fanno subito "casetta"
    const legno = mat(battiscopa);
    this.scene.add(mesh(geo.scatola(LX * 2 + 0.3, 0.16, 0.06), legno, 0, 0.08, -LZ + 0.01));
    this.scene.add(mesh(geo.scatola(0.06, 0.16, LZ * 2 + 0.3), legno, -LX + 0.01, 0.08, 0));
    const trave1 = mesh(geo.scatola(LX * 2 + 0.5, 0.22, 0.3), legno, 0, ALTO + 0.05, -LZ - 0.05);
    const trave2 = mesh(geo.scatola(0.3, 0.22, LZ * 2 + 0.5), legno, -LX - 0.05, ALTO + 0.05, 0);
    this.scene.add(contorno(trave1), contorno(trave2));
    // bordo del pavimento tagliato, come una casa delle bambole
    const bordo = mat('#6a4a30');
    this.scene.add(mesh(geo.scatola(LX * 2 + 0.3, 0.28, 0.08), bordo, 0, -0.06, LZ + 0.16));
    this.scene.add(mesh(geo.scatola(0.08, 0.28, LZ * 2 + 0.3), bordo, LX + 0.16, -0.06, 0));
  }

  private finestra(x: number, y: number, tonda = false) {
    const g = new THREE.Group();
    const cornice = mat('#f6ead2');
    if (tonda) {
      g.add(mesh(geo.toro(0.62, 0.09), cornice));
      this.vetro = mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: '#a9d8f0' }), 0, 0, 0);
      g.add(this.vetro);
    } else {
      for (const [w, h, px, py] of [[1.5, 0.12, 0, 0.62], [1.5, 0.12, 0, -0.62], [0.12, 1.36, -0.72, 0], [0.12, 1.36, 0.72, 0], [0.08, 1.2, 0, 0], [1.4, 0.08, 0, 0]] as const)
        g.add(mesh(geo.scatola(w, h, 0.1), cornice, px, py, 0.02));
      this.vetro = mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: '#a9d8f0' }), 0, 0, -0.01);
      g.add(this.vetro);
      // davanzale e tendine
      g.add(mesh(geo.scatola(1.7, 0.08, 0.3), cornice, 0, -0.7, 0.12));
      for (const s of [-1, 1]) {
        const tenda = mesh(geo.scatola(0.32, 1.45, 0.04), mat('#fff4f0'), s * 0.92, 0.04, 0.12);
        tenda.rotation.z = s * 0.04;
        g.add(tenda);
      }
    }
    g.position.set(x, y, -LZ + 0.07);
    this.scene.add(contorno(g));
  }

  private lampada(x: number, z: number) {
    const g = new THREE.Group();
    g.add(mesh(geo.cil(0.012, 0.012, 0.6, 6), mat('#4a3424'), 0, 0.3, 0));
    this.paralume = mesh(geo.cono(0.36, 0.34, 16), mat('#ffe3a0', { emissive: '#ffb84a', emissiveIntensity: 0 }), 0, -0.05, 0);
    g.add(this.paralume);
    g.position.set(x, ALTO - 0.6, z);
    this.scene.add(contorno(g));
    this.luceLampada.position.set(x, ALTO - 0.9, z);
  }

  private tappeto(x: number, z: number, a: string, b: string, r = 1.0) {
    const t = mesh(new THREE.CircleGeometry(r, 28), mat('#ffffff', { map: texture(128, (c, l) => {
      c.fillStyle = a; c.fillRect(0, 0, l, l);
      c.strokeStyle = b; c.lineWidth = l * 0.06;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.arc(l / 2, l / 2, (l / 2) * (i / 5), 0, Math.PI * 2); c.stroke(); }
    }), rim: 0 }), x, 0.02, z);
    t.rotation.x = -Math.PI / 2;
    t.scale.set(1.3, 1, 1);
    this.scene.add(t);
  }

  private carta(colore: string, motivo: 'pois' | 'righe' | 'fiori') {
    const scuro = '#' + new THREE.Color(colore).offsetHSL(0, 0.02, -0.07).getHexString();
    return mat('#ffffff', { rim: 0, map: texture(128, (c, l) => {
      c.fillStyle = colore; c.fillRect(0, 0, l, l);
      c.fillStyle = scuro; c.strokeStyle = scuro;
      if (motivo === 'righe') for (let i = 0; i < 8; i += 2) c.fillRect((i * l) / 8, 0, l / 16, l);
      else if (motivo === 'pois') for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.beginPath(); c.arc((i + 0.5 + (j % 2) * 0.5) * l / 4, (j + 0.5) * l / 4, l * 0.025, 0, 7); c.fill(); }
      else for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * l / 3, y = (j + 0.5) * l / 3;
        for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.256) * 6, y + Math.sin(k * 1.256) * 6, 4.5, 0, 7); c.fill(); }
      }
    }, 4) });
  }

  private parquet(a = '#c8935e', b = '#b07a48') {
    return mat('#ffffff', { rim: 0, map: texture(128, (c, l) => {
      for (let i = 0; i < 8; i++) {
        c.fillStyle = i % 2 ? a : b; c.fillRect(0, (i * l) / 8, l, l / 8);
        c.fillStyle = '#00000018'; c.fillRect(((i * 37) % 100) / 100 * l, (i * l) / 8, 2, l / 8);
      }
    }, 3) });
  }

  // ---------- la casa di chi ha un mestiere ----------

  private arredaCasa(a: Animale) {
    const c = carattereDi(a);
    const terra = a.specie === 'tasso' || a.specie === 'riccio';
    const muro = terra ? mat('#ffffff', { rim: 0, map: texture(128, macchie(['#c9a27a', '#b88f66', '#d8b58c'], 0.8, 7), 3) }) : this.carta(c.muro, (['pois', 'righe', 'fiori'] as const)[hash(a.id) % 3]);
    this.stanza(muro, this.parquet(), '#8a5a36');
    this.finestra(0.4, 1.9);
    this.lampada(0.3, 0.3);
    this.tappeto(1.3, -0.3, c.coperta, '#fff4e0');

    // letto
    this.letto(-2.5, -1.6, c.coperta, 'letto');
    // tavolo con due sedie
    this.tavolo(0.2, 1.3);
    // cucina sulla parete di sinistra
    this.cucina(-LX + 0.4, -0.1);
    // il pezzo che racconta il carattere
    this.pezzoCarattere(c.arredo, 2.4, -1.6, 'hobby');
    // il banco del mestiere
    if (a.mestiere) this.banco(a.mestiere, -LX + 0.5, 1.6);
    else this.ancore.set('lavoro', [1.3, -0.2, 0]);
    // decorazioni
    for (const d of c.decorazioni) this.decorazione(d, a);
    // le cose che arrivano migliorando la casa (vedi lib/migliorie.ts), senza doppioni né cose sovrapposte
    const livello = a.livelloCasa ?? 1;
    const extra: string[] = [];
    if (livello >= 2) extra.push('vasetti');
    if (livello >= 3 && !c.decorazioni.some((d) => d === 'bandierine' || d === 'stelle')) extra.push('lucine');
    if (livello >= 4) extra.push('foto', 'palloncini');
    for (const d of extra) if (!c.decorazioni.includes(d)) this.decorazione(d, a);
    // il ritratto di Giada (un cuoricino) sopra il letto: ogni casa ne ha uno
    this.quadretto(-2.5, 2.3, '♥', '#ff8fb1');
    this.ancore.set('tappeto', [1.3, -0.2, 0.4]);
    this.ancore.set('finestra', [0.4, -1.55, Math.PI]);
  }

  // ---------- la tana dei piccoli sotto il grande albero ----------

  private arredaTana(abitanti: Animale[]) {
    const muro = mat('#ffffff', { rim: 0, map: texture(128, macchie(['#a77b52', '#946a44', '#b88d62', '#8a6040'], 0.9, 3), 3) });
    this.stanza(muro, mat('#ffffff', { rim: 0, map: texture(128, macchie(['#b08a5e', '#a07a50', '#c09a6c'], 0.8, 11), 3) }), '#6a4a30');
    // radici che scendono dal soffitto
    for (const [x, z, h] of [[-2.6, -LZ + 0.15, 1.1], [-1.2, -LZ + 0.12, 0.7], [2.6, -LZ + 0.15, 0.9], [-LX + 0.15, 1.4, 0.8], [-LX + 0.12, -0.6, 1.2]]) {
      const r = mesh(geo.cono(0.09, h, 6), mat('#6a4a2a'), x, ALTO - h / 2, z);
      r.rotation.x = Math.PI;
      this.scene.add(contorno(r));
    }
    this.finestra(1.2, 2.0, true);
    this.lampada(0.2, 0.4);
    this.tappeto(0.5, 0.6, '#e8c27a', '#c9873e', 1.15);
    this.tavolo(-1.2, 1.2, true);
    // un lettino a nido per ognuno: lungo il fondo, poi lungo la parete di sinistra
    abitanti.forEach((a, i) => {
      const c = carattereDi(a);
      const [x, z, r] = i < 4 ? [-2.95 + i * 0.92, -1.85, 0] : [-2.85, -0.6 + (i - 4) * 0.95, Math.PI / 2];
      this.lettino(x, z, r, c.coperta, 'letto:' + a.id, a.nome);
    });
    // gli angolini dei caratteri presenti (al massimo due, gli altri giocano sul tappeto)
    const caratteri = [...new Set(abitanti.map((a) => carattereDi(a).arredo))];
    const posti: [number, number][] = [[2.6, -1.6], [2.9, 1.3]];
    caratteri.slice(0, 2).forEach((arr, i) => this.pezzoCarattere(arr, posti[i][0], posti[i][1], 'hobby:' + arr, 0.85));
    // la cassa dei giochi e i disegni dei piccoli
    this.cassaGiochi(-2.7, 2.0);
    this.quadretto(-0.2, 2.3, '☀', '#ffd166');
    this.quadretto(2.4, 2.4, '✿', '#ff8fb1');
    this.scene.add(contorno(mesh(geo.palla(0.2), mat('#e85a4a'), -1.9, 0.2, 2.1)));
    this.ancore.set('tappeto', [0.5, 0.6, 0.4]);
    this.ancore.set('finestra', [1.2, -1.4, Math.PI]);
    this.ancore.set('cucina', [-1.2, 0.5, 0]);
    this.ancore.set('lavoro', [0.5, 0.6, 0.4]);
  }

  // ---------- mobili ----------

  private letto(x: number, z: number, coperta: string, chiave: string) {
    const g = new THREE.Group();
    const legno = mat('#a8703e');
    g.add(mesh(geo.scatola(2.0, 0.4, 1.2), legno, 0, 0.2, 0));
    g.add(mesh(geo.scatola(0.12, 1.1, 1.3), legno, -1.0, 0.55, 0));
    g.add(mesh(geo.scatola(0.12, 0.7, 1.3), legno, 1.0, 0.35, 0));
    g.add(mesh(geo.scatola(1.9, 0.16, 1.15), mat('#fffaf0'), 0, 0.46, 0));
    const cop = mesh(geo.scatola(1.3, 0.12, 1.2), mat('#ffffff', { map: texture(64, (c, l) => {
      c.fillStyle = coperta; c.fillRect(0, 0, l, l);
      c.fillStyle = '#ffffff44';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) c.fillRect((i * l) / 4, (j * l) / 4, l / 4, l / 4);
    }) }), 0.3, 0.55, 0);
    g.add(cop);
    const cuscino = mesh(geo.palla(0.3), mat('#ffffff'), -0.62, 0.62, 0);
    cuscino.scale.set(0.9, 0.42, 1.5);
    g.add(cuscino);
    g.position.set(x, 0, z);
    this.scene.add(contorno(g));
    // ci si sdraia verso il cuscino (a sinistra): il punto d'appoggio sta dalla parte dei piedi, così la testa non entra nel muro
    this.ancore.set(chiave, [x + 0.55, z, 0]);
  }

  private lettino(x: number, z: number, rot: number, coperta: string, chiave: string, nome: string) {
    const g = new THREE.Group();
    const nido = mesh(geo.toro(0.38, 0.14), mat('#8a6a3a', { map: texture(64, macchie(['#8a6a3a', '#a8844e', '#6a8a3a'], 1, 5)) }), 0, 0.12, 0);
    nido.rotation.x = Math.PI / 2;
    g.add(nido);
    const cuscino = mesh(geo.cil(0.36, 0.36, 0.1, 18), mat(coperta), 0, 0.08, 0);
    g.add(cuscino);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.scene.add(contorno(g));
    // il nome scritto su una tavoletta
    if (nome) {
      const t = spriteTesto(nome.slice(0, 1).toUpperCase(), '#fff4e0', 64);
      t.scale.setScalar(0.32);
      t.position.set(x, 0.55, z - (rot ? 0 : 0.35));
      if (rot) t.position.x -= 0.35;
      this.scene.add(t);
    }
    this.ancore.set(chiave, [x, z, rot ? Math.PI / 2 : 0]);
  }

  private tavolo(x: number, z: number, basso = false) {
    const g = new THREE.Group();
    const h = basso ? 0.45 : 0.75;
    const legno = mat('#c08850');
    g.add(mesh(geo.cil(0.62, 0.62, 0.08, 20), mat('#ffffff', { map: texture(64, (c, l) => {
      c.fillStyle = '#fff4f0'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#e86a6a';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) c.fillRect((i * l) / 8, (j * l) / 8, l / 8, l / 8);
    }) }), 0, h, 0));
    g.add(mesh(geo.cil(0.07, 0.12, h, 8), legno, 0, h / 2, 0));
    // scodelle
    for (const [px, pz] of [[0.28, 0.12], [-0.22, -0.2]]) {
      g.add(mesh(geo.cil(0.12, 0.08, 0.08, 12), mat('#fffaf0'), px, h + 0.08, pz));
      g.add(mesh(geo.cil(0.1, 0.1, 0.02, 12), mat('#e8b04e'), px, h + 0.11, pz));
    }
    if (!basso) for (const a of [0.6, 2.6]) {
      const sedia = new THREE.Group();
      sedia.add(mesh(geo.scatola(0.44, 0.06, 0.44), legno, 0, 0.42, 0));
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) sedia.add(mesh(geo.scatola(0.05, 0.42, 0.05), legno, lx, 0.21, lz));
      sedia.add(mesh(geo.scatola(0.44, 0.5, 0.05), legno, 0, 0.7, -0.2));
      sedia.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95);
      sedia.rotation.y = -a - Math.PI / 2;
      g.add(sedia);
    }
    g.add(ombra(0.8));
    g.position.set(x, 0, z);
    this.scene.add(contorno(g));
    this.ancore.set('tavolo', [x, z, 0]);
  }

  private cucina(x: number, z: number) {
    const g = new THREE.Group();
    g.add(mesh(geo.scatola(0.8, 0.9, 1.2), mat('#f2e6d0'), 0, 0.45, 0));
    g.add(mesh(geo.scatola(0.82, 0.06, 1.22), mat('#8a6a4a'), 0, 0.92, 0));
    g.add(mesh(geo.scatola(0.05, 0.4, 0.5), mat('#3a2a20'), 0.41, 0.4, 0));
    const fuoco = mesh(geo.scatola(0.04, 0.2, 0.36), mat('#ff9a3a', { emissive: '#ff7a1a', emissiveIntensity: 0.9 }), 0.42, 0.34, 0);
    fuoco.name = 'fuoco';
    g.add(fuoco);
    // pentola
    g.add(mesh(geo.cil(0.22, 0.2, 0.26, 14), mat('#5a6a7a'), 0.05, 1.08, 0.2));
    g.add(mesh(geo.cil(0.2, 0.2, 0.02, 14), mat('#e8a24e'), 0.05, 1.21, 0.2));
    // mestolo e barattoli
    g.add(mesh(geo.cil(0.08, 0.08, 0.18, 10), mat('#d8c0a0'), 0, 1.04, -0.35));
    // mensola con piatti
    g.add(mesh(geo.scatola(0.3, 0.05, 1.2), mat('#a8703e'), -0.25, 1.85, 0));
    for (const pz of [-0.4, -0.1, 0.2]) g.add(mesh(geo.cil(0.13, 0.13, 0.03, 14), mat('#ffffff'), -0.25, 2.0, pz).rotateZ(Math.PI / 2));
    g.position.set(x, 0, z);
    this.scene.add(contorno(g));
    this.ancore.set('cucina', [x + 0.95, z + 0.15, -Math.PI / 2]);
  }

  private banco(mestiere: string, x: number, z: number) {
    const g = new THREE.Group();
    const legno = mat('#9a6a3a');
    g.add(mesh(geo.scatola(1.6, 0.1, 0.8), legno, 0, 0.8, 0));
    for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) g.add(mesh(geo.scatola(0.08, 0.8, 0.08), legno, lx, 0.4, lz));
    // gli attrezzi del mestiere sopra il banco
    const simbolo = SIMBOLI_MESTIERE[mestiere] ?? '★';
    const insegna = mesh(geo.scatola(0.6, 0.6, 0.04), mat('#ffffff', { rim: 0, map: texture(64, (c, l) => {
      c.fillStyle = '#fff8e7'; c.fillRect(0, 0, l, l);
      c.strokeStyle = '#8a5a36'; c.lineWidth = 6; c.strokeRect(3, 3, l - 6, l - 6);
      c.font = `${l * 0.55}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#4a3424'; c.fillText(simbolo, l / 2, l / 2 + 2);
    }) }), 0, 1.6, -0.3);
    insegna.rotation.x = -0.1;
    g.add(insegna);
    const roba: Record<string, () => void> = {
      cuoco: () => { g.add(mesh(geo.cil(0.24, 0.2, 0.3, 14), mat('#b0b8c0'), -0.3, 1.0, 0)); g.add(mesh(geo.palla(0.1), mat('#e85a4a'), 0.3, 0.92, 0.1)); g.add(mesh(geo.palla(0.09), mat('#7ccf6a'), 0.48, 0.91, -0.05)); },
      musicista: () => { const v = mesh(geo.palla(0.22), mat('#b0683a'), 0, 0.98, 0); v.scale.set(1, 0.4, 1.4); g.add(v); g.add(mesh(geo.scatola(0.06, 0.04, 0.6), mat('#3a2a20'), 0, 1.02, 0.5)); },
      artigiano: () => { g.add(mesh(geo.scatola(0.4, 0.2, 0.3), mat('#d8b080'), -0.3, 0.95, 0)); g.add(mesh(geo.cil(0.03, 0.03, 0.4, 6), mat('#6a4a2a'), 0.35, 0.88, 0).rotateZ(Math.PI / 2)); },
      pittore: () => { const t = mesh(geo.scatola(0.5, 0.6, 0.04), mat('#ffffff', { map: texture(64, macchie(['#fffaf0', '#ff8fb1', '#8fd3ff', '#ffd166'], 0.4, 9)) }), 0, 1.15, 0); t.rotation.x = -0.3; g.add(t); },
    };
    (roba[mestiere] ?? (() => { g.add(mesh(geo.scatola(0.4, 0.2, 0.3), mat('#d8b080'), -0.3, 0.95, 0)); g.add(mesh(geo.palla(0.12), mat('#f2c94c'), 0.3, 0.97, 0)); }))();
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI / 2; // contro la parete di sinistra, il davanti verso la stanza
    this.scene.add(contorno(g));
    this.ancore.set('lavoro', [x + 0.95, z, -Math.PI / 2]);
  }

  private cassaGiochi(x: number, z: number) {
    const g = new THREE.Group();
    g.add(mesh(geo.scatola(0.9, 0.5, 0.6), mat('#e8a24e'), 0, 0.25, 0));
    g.add(mesh(geo.scatola(0.25, 0.25, 0.25), mat('#7ccf6a'), -0.2, 0.62, 0));
    g.add(mesh(geo.scatola(0.22, 0.22, 0.22), mat('#8fd3ff'), 0.15, 0.6, 0.05).rotateY(0.5));
    g.position.set(x, 0, z);
    this.scene.add(contorno(g));
  }

  private quadretto(x: number, y: number, simbolo: string, colore: string, parete: 'fondo' | 'lato' = 'fondo') {
    const q = mesh(geo.scatola(0.55, 0.55, 0.05), mat('#ffffff', { rim: 0, map: texture(64, (c, l) => {
      c.fillStyle = '#a8703e'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#fffaf0'; c.fillRect(6, 6, l - 12, l - 12);
      c.font = `900 ${l * 0.5}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = colore; c.fillText(simbolo, l / 2, l / 2 + 2);
    }) }));
    if (parete === 'fondo') q.position.set(x, y, -LZ + 0.03);
    else { q.position.set(-LX + 0.03, y, x); q.rotation.y = Math.PI / 2; }
    this.scene.add(q);
  }

  /** Il mobile del carattere: telescopio, grammofono, scaffale dei barattoli, cuscinone... */
  private pezzoCarattere(arr: Arredo, x: number, z: number, chiave: string, scala = 1) {
    const g = new THREE.Group();
    let davanti: [number, number] = [-0.9, 0.4]; // dove si mette l'animale (rispetto al mobile)
    switch (arr) {
      case 'telescopio': {
        for (const a of [0, 2.1, 4.2]) { const gamba = mesh(geo.cil(0.025, 0.025, 1.1, 6), mat('#6a4a2a'), Math.cos(a) * 0.2, 0.5, Math.sin(a) * 0.2); gamba.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(gamba); }
        const tubo = mesh(geo.cil(0.09, 0.13, 1.0, 14), mat('#3a4a8a'), 0, 1.25, 0);
        tubo.rotation.set(-0.6, 0, 0.5);
        g.add(tubo);
        g.add(mesh(geo.toro(0.12, 0.03), mat('#f2c94c'), -0.2, 1.5, -0.25));
        davanti = [-0.7, 0.5];
        break;
      }
      case 'grammofono': {
        g.add(mesh(geo.scatola(0.7, 0.7, 0.6), mat('#8a4a2a'), 0, 0.35, 0));
        g.add(mesh(geo.cil(0.25, 0.25, 0.03, 20), mat('#2a2a2a'), 0, 0.72, 0));
        const tromba = mesh(geo.cono(0.35, 0.6, 16, ), mat('#f2c94c'), -0.15, 1.15, 0);
        tromba.rotation.z = 0.9;
        g.add(tromba);
        g.name = 'grammofono';
        break;
      }
      case 'scaffale': {
        g.add(mesh(geo.scatola(1.4, 2.2, 0.4), mat('#b07a48'), 0, 1.1, 0));
        const colori = ['#e85a4a', '#f2c94c', '#7ccf6a', '#8fd3ff', '#c77dff'];
        for (let r = 0; r < 4; r++) {
          g.add(mesh(geo.scatola(1.3, 0.04, 0.38), mat('#8a5a36'), 0, 0.25 + r * 0.52, 0.02));
          for (let k = 0; k < 4; k++) {
            g.add(mesh(geo.cil(0.11, 0.11, 0.26, 10), mat('#e8f4ff', { opacity: 0.85, transparent: true }), -0.45 + k * 0.3, 0.42 + r * 0.52, 0.06));
            g.add(mesh(geo.cil(0.09, 0.09, 0.16, 10), mat(colori[(r + k) % colori.length]), -0.45 + k * 0.3, 0.38 + r * 0.52, 0.06));
            g.add(mesh(geo.cil(0.115, 0.115, 0.04, 10), mat('#e86a6a'), -0.45 + k * 0.3, 0.57 + r * 0.52, 0.06));
          }
        }
        davanti = [-0.6, 0.75];
        break;
      }
      case 'cuscinone': {
        const c = mesh(geo.palla(0.8, 20), mat('#c49be0'), 0, 0.3, 0);
        c.scale.set(1.1, 0.4, 1);
        g.add(c);
        const coperta = mesh(geo.scatola(0.9, 0.06, 0.7), mat('#ffd6e8'), 0.3, 0.6, 0.2);
        coperta.rotation.z = -0.2;
        g.add(coperta);
        g.add(mesh(geo.cil(0.18, 0.15, 0.22, 12), mat('#f2c94c'), 0.95, 0.11, 0.6));
        for (let k = 0; k < 3; k++) g.add(mesh(geo.cil(0.07, 0.07, 0.03, 10), mat('#c08850'), 0.9 + k * 0.05, 0.26 + k * 0.035, 0.6));
        davanti = [0, 0];
        break;
      }
      case 'attrezzi': {
        const bil = new THREE.Group();
        bil.add(mesh(geo.cil(0.03, 0.03, 0.9, 6), mat('#8a8a94'), 0, 0, 0).rotateZ(Math.PI / 2));
        for (const s of [-1, 1]) { const gh = mesh(geo.palla(0.2), mat('#b07a48'), s * 0.45, 0, 0); gh.scale.set(0.9, 1.1, 0.9); bil.add(gh); bil.add(mesh(geo.cono(0.21, 0.14, 12), mat('#6a4a2a'), s * 0.45, 0.2, 0)); }
        bil.position.set(0, 0.2, 0.2);
        g.add(bil);
        g.add(mesh(geo.scatola(1.1, 0.04, 0.6), mat('#7ccf6a'), -0.5, 0.02, 0.8));
        const corda = mesh(geo.toro(0.3, 0.02), mat('#e85a4a'), 0.4, 0.5, -0.2);
        g.add(corda);
        davanti = [-0.5, 0.8];
        break;
      }
      case 'dondolo': {
        const legno = mat('#8a5a36');
        g.add(mesh(geo.scatola(0.8, 0.12, 0.7), mat('#a85a4a'), 0, 0.5, 0));
        g.add(mesh(geo.scatola(0.8, 0.9, 0.12), mat('#a85a4a'), 0, 0.95, -0.3));
        for (const s of [-1, 1]) {
          g.add(mesh(geo.scatola(0.08, 0.35, 0.6), legno, s * 0.38, 0.7, 0));
          const arco = mesh(new THREE.TorusGeometry(0.6, 0.04, 6, 16, 1.6), legno, s * 0.38, 0.62, 0);
          arco.rotation.set(0, Math.PI / 2, Math.PI + 0.75);
          g.add(arco);
        }
        // cesto di gomitoli e teiera
        g.add(mesh(geo.cil(0.3, 0.24, 0.24, 12), mat('#c8a06a'), 0.85, 0.12, 0.3));
        for (const [i, col] of ['#e85a4a', '#7ccf6a', '#8fd3ff'].entries()) g.add(mesh(geo.palla(0.12), mat(col), 0.75 + i * 0.1, 0.3, 0.25 + (i % 2) * 0.1));
        g.name = 'dondolo';
        davanti = [0, 0.05];
        break;
      }
      case 'vetrina': {
        g.add(mesh(geo.scatola(1.3, 1.9, 0.45), mat('#7a5232'), 0, 0.95, 0));
        g.add(mesh(geo.scatola(1.15, 1.7, 0.02), mat('#cfeaff', { opacity: 0.35, transparent: true }), 0, 1.0, 0.23));
        const cose = ['#d8d0c4', '#f6c0d0', '#8fd3ff', '#f2c94c', '#9a9aa4', '#e8b04e'];
        for (let r = 0; r < 3; r++) {
          g.add(mesh(geo.scatola(1.15, 0.03, 0.4), mat('#5a3a22'), 0, 0.4 + r * 0.55, 0));
          for (let k = 0; k < 3; k++) {
            const o = mesh(k % 2 ? geo.palla(0.1, 8) : geo.cono(0.1, 0.2, 5), mat(cose[(r * 3 + k) % cose.length]), -0.35 + k * 0.35, 0.52 + r * 0.55, 0);
            g.add(o);
          }
        }
        // lente d'ingrandimento sul davanzale
        g.add(mesh(geo.toro(0.12, 0.025), mat('#f2c94c'), 0.75, 0.25, 0.3));
        davanti = [-0.55, 0.75];
        break;
      }
      case 'piante': {
        for (const [px, pz, h, col] of [[0, 0, 1.2, '#5aa04a'], [0.6, 0.3, 0.8, '#7ccf6a'], [-0.5, 0.25, 0.6, '#4a8a3a']] as const) {
          g.add(mesh(geo.cil(0.22, 0.16, 0.34, 12), mat('#d0703a'), px, 0.17, pz));
          const chioma = mesh(geo.palla(0.3 + h * 0.15), mat(col), px, 0.34 + h * 0.45, pz);
          chioma.scale.set(1, 1.2, 1);
          g.add(chioma);
          if (h < 1) for (let k = 0; k < 3; k++) g.add(mesh(geo.palla(0.06, 8), mat(k % 2 ? '#ff8fb1' : '#ffd166'), px + Math.cos(k * 2) * 0.25, 0.4 + h * 0.6, pz + Math.sin(k * 2) * 0.25));
        }
        // annaffiatoio
        g.add(mesh(geo.cil(0.14, 0.16, 0.26, 12), mat('#7ab0d8'), -0.9, 0.13, 0.6));
        davanti = [-0.8, 0.85];
        break;
      }
    }
    g.add(ombra(0.8));
    g.scale.setScalar(scala);
    g.position.set(x, 0, z);
    g.rotation.y = x > 0 ? -0.5 : 0.3;
    this.scene.add(contorno(g));
    if (arr === 'grammofono') this.grammofono = g;
    const dav = new THREE.Vector3(davanti[0], 0, davanti[1]).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y).multiplyScalar(scala);
    const px = x + dav.x, pz = z + dav.z;
    this.ancore.set(chiave, [px, pz, Math.atan2(x - px, z - pz) || 0]);
  }

  private decorazione(d: string, a: Animale) {
    const c = carattereDi(a);
    switch (d) {
      case 'stelle':
        for (let i = 0; i < 6; i++) {
          const x = -2.8 + i * 1.1, h = 0.4 + (i % 3) * 0.25;
          this.scene.add(mesh(geo.cil(0.005, 0.005, h, 4), mat('#ffffff'), x, ALTO - h / 2, -LZ + 0.3));
          const st = spriteTesto('★', '#ffe08a');
          st.scale.setScalar(0.35);
          st.position.set(x, ALTO - h - 0.1, -LZ + 0.3);
          st.name = 'pendente';
          this.scene.add(st);
        }
        break;
      case 'lucine':
      case 'bandierine': {
        for (let i = 0; i < 14; i++) {
          const x = -LX + 0.3 + i * 0.5, y = ALTO - 0.25 - Math.sin((i / 13) * Math.PI) * 0.35;
          const col = ['#ff8fb1', '#ffd166', '#7ccf6a', '#8fd3ff'][i % 4];
          if (d === 'lucine') this.scene.add(mesh(geo.palla(0.06, 8), mat(col, { emissive: col, emissiveIntensity: 0.8 }), x, y, -LZ + 0.08));
          else { const b = mesh(geo.cono(0.14, 0.3, 3), mat(col), x, y - 0.12, -LZ + 0.08); b.rotation.x = Math.PI; this.scene.add(b); }
        }
        break;
      }
      case 'poesie':
        for (let i = 0; i < 3; i++) {
          const f = mesh(geo.scatola(0.35, 0.45, 0.01), mat('#ffffff', { rim: 0, map: texture(32, (cx, l) => { cx.fillStyle = '#fffaf0'; cx.fillRect(0, 0, l, l); cx.fillStyle = '#8a8aa8'; for (let r = 0; r < 5; r++) cx.fillRect(4, 5 + r * 5, l - 8 - (r % 2) * 6, 1.5); }) }), 1.8 + i * 0.45, 1.9 + (i % 2) * 0.2, -LZ + 0.03);
          f.rotation.z = (i - 1) * 0.12;
          this.scene.add(f);
        }
        break;
      case 'palloncini':
        for (let i = 0; i < 3; i++) {
          const p = mesh(geo.palla(0.22), mat(['#ff7a8a', '#ffd166', '#8fd3ff'][i]), 1.8 + i * 0.3, 2.4 + (i % 2) * 0.25, -1.4);
          p.scale.y = 1.2;
          p.name = 'pendente';
          this.scene.add(contorno(p));
        }
        break;
      case 'quadri':
        this.quadretto(1.6, 2.2, ['✿', '☀', '♪', '♥'][hash(a.id) % 4], c.coperta);
        this.quadretto(0.6, 2.3, '☁', '#8fb3e8', 'lato');
        break;
      case 'orologio': {
        const o = new THREE.Group();
        o.add(mesh(geo.cil(0.32, 0.32, 0.06, 24), mat('#fffaf0'), 0, 0, 0).rotateX(Math.PI / 2));
        o.add(mesh(geo.toro(0.32, 0.04), mat('#8a5a36')));
        const lanc = new THREE.Group();
        lanc.add(mesh(geo.scatola(0.03, 0.22, 0.02), mat('#3a2a20'), 0, 0.1, 0.05));
        o.add(lanc);
        this.lancette = lanc;
        o.position.set(-1.4, 2.4, -LZ + 0.06);
        this.scene.add(contorno(o));
        break;
      }
      case 'biscotti':
        this.scene.add(contorno(mesh(geo.cil(0.16, 0.16, 0.3, 12), mat('#e8f4ff', { opacity: 0.8, transparent: true }), 0.45, 0.94, 1.45)));
        break;
      case 'coperte':
        for (let i = 0; i < 3; i++) this.scene.add(contorno(mesh(geo.scatola(0.7, 0.12, 0.5), mat(['#ffd6e8', '#c4e0ff', '#fff0b0'][i]), 2.9, 0.06 + i * 0.13, 0.9)));
        break;
      case 'coppe':
        for (let i = 0; i < 3; i++) {
          const k = new THREE.Group();
          k.add(mesh(geo.cil(0.14, 0.06, 0.22, 12), mat('#f2c94c', { emissive: '#f2c94c', emissiveIntensity: 0.15 }), 0, 0.2, 0));
          k.add(mesh(geo.cil(0.08, 0.1, 0.08, 8), mat('#8a5a36'), 0, 0.04, 0));
          k.position.set(1.4 + i * 0.45, 1.55, -LZ + 0.2);
          this.scene.add(contorno(k));
        }
        this.scene.add(contorno(mesh(geo.scatola(1.5, 0.06, 0.35), mat('#8a5a36'), 1.85, 1.55, -LZ + 0.2)));
        break;
      case 'palla':
        this.scene.add(contorno(mesh(geo.palla(0.22), mat('#ffffff', { map: texture(32, (cx, l) => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, l, l); cx.fillStyle = '#e85a4a'; cx.fillRect(0, l * 0.35, l, l * 0.3); }) }), 2.4, 0.22, 1.0)));
        break;
      case 'gomitoli':
      case 'regali':
        for (let i = 0; i < 3; i++) {
          const col = ['#e85a4a', '#7ccf6a', '#8fd3ff'][i];
          if (d === 'regali') {
            const r = new THREE.Group();
            r.add(mesh(geo.scatola(0.34, 0.28, 0.34), mat(col), 0, 0.14, 0));
            r.add(mesh(geo.scatola(0.36, 0.3, 0.06), mat('#fff4e0'), 0, 0.14, 0));
            r.position.set(2.5 + i * 0.4, 0, 0.6 + (i % 2) * 0.35);
            r.rotation.y = i;
            this.scene.add(contorno(r));
          }
        }
        break;
      case 'mappa':
        this.scene.add(mesh(geo.scatola(0.05, 0.9, 1.2), mat('#ffffff', { rim: 0, map: texture(64, (cx, l) => {
          cx.fillStyle = '#f2e2b8'; cx.fillRect(0, 0, l, l);
          cx.strokeStyle = '#8a5a36'; cx.setLineDash([3, 3]); cx.lineWidth = 2;
          cx.beginPath(); cx.moveTo(8, 50); cx.bezierCurveTo(20, 10, 40, 60, 56, 14); cx.stroke();
          cx.fillStyle = '#e85a4a'; cx.font = '900 14px sans-serif'; cx.fillText('✕', 48, 20);
          cx.fillStyle = '#5aa04a'; for (const [px, py] of [[14, 20], [30, 44], [44, 36]]) { cx.beginPath(); cx.arc(px, py, 5, 0, 7); cx.fill(); }
        }) }), -1.3, 2.0, -LZ + 0.04).rotateY(Math.PI / 2));
        break;
      case 'libri':
        for (let i = 0; i < 4; i++) this.scene.add(contorno(mesh(geo.scatola(0.5 - i * 0.04, 0.1, 0.36), mat(['#3a6aa8', '#a83a3a', '#5aa04a', '#e8a24e'][i]), 2.8, 0.05 + i * 0.1, 0.8).rotateY(i * 0.2)));
        break;
      case 'piume':
        this.scene.add(contorno(mesh(geo.cil(0.08, 0.1, 0.22, 10), mat('#8fd3ff'), -0.05, 0.9, 1.1)));
        for (let i = 0; i < 3; i++) { const p = mesh(geo.cono(0.04, 0.4, 6), mat(['#3a3a48', '#f2c94c', '#ffffff'][i]), -0.05 + (i - 1) * 0.06, 1.2, 1.1); p.rotation.z = (i - 1) * 0.3; this.scene.add(p); }
        break;
      case 'foto':
        for (let i = 0; i < 3; i++) this.quadretto(-2.0 + i * 0.7, 2.25 - (i % 2) * 0.15, '♥', ['#ff8fb1', '#ffd166', '#8fd3ff'][i], 'lato');
        break;
      case 'vasetti':
        for (let i = 0; i < 3; i++) {
          this.scene.add(contorno(mesh(geo.cil(0.09, 0.07, 0.14, 10), mat('#d0703a'), -0.1 + i * 0.5, 1.29, -LZ + 0.15)));
          this.scene.add(mesh(geo.palla(0.09, 8), mat(['#ff8fb1', '#ffd166', '#c77dff'][i]), -0.1 + i * 0.5, 1.43, -LZ + 0.15));
        }
        break;
      default:
        break;
    }
  }

  // ---------- chi abita qui ----------

  private aggiungiOspite(a: Animale) {
    const m = creaAnimale(a);
    aggiornaMestiere(m, a.mestiere);
    const scala = ({ cucciolo: 1.15, giovane: 1.22, adulto: 1.28, maestro: 1.32, uovo: 1 } as const)[a.fase] * 0.82;
    // in casa i grandi (cavallo, mucca) si fanno un po' più piccoli, se no non ci stanno
    m.gruppo.scale.setScalar(scala * Math.min(1.02, (m.gruppo.userData.taglia as number) ?? 1));
    m.testa.scale.setScalar(({ cucciolo: 1.12, giovane: 1.0, adulto: 0.9, maestro: 0.9, uovo: 1 } as const)[a.fase]);
    m.gruppo.userData.ospite = a.id;
    const i = this.ospiti.length;
    m.gruppo.position.set(0.6 + (i % 3) * 0.6 - 0.6, 0, 1.0 + Math.floor(i / 3) * 0.5);
    this.scene.add(m.gruppo);
    const o: Ospite = {
      dati: a, m, att: cosaFaInCasa(a, this.momentoAttuale), meta: new THREE.Vector3(), guarda: 0, tappa: null,
      passo: Math.random() * 6, eretto: a.fase === 'cucciolo' ? 0 : 1, fumetto: 1 + Math.random() * 2, z: [], salto: 0, turno: 0, ammicca: Math.random() * 3, chiave: '',
    };
    this.ospiti.push(o);
    this.destinazione(o, true);
  }

  /** Dove deve andare per fare la sua attività (più animali nello stesso posto si mettono vicini). */
  private destinazione(o: Ospite, subito = false) {
    const p = o.att.posto;
    // il posto vero: il suo lettino, l'angolo del suo carattere, o quello comune
    const chiavi = [p + ':' + o.dati.id, ...(p === 'hobby' ? ['hobby:' + carattereDi(o.dati).arredo] : []), p, 'tappeto'];
    const chiave = chiavi.find((c) => this.ancore.has(c));
    const anc = chiave ? this.ancore.get(chiave)! : ([0.8, 0.3, 0.4] as Ancora);
    const [x, z, verso] = anc;
    o.chiave = `${anc[0]},${anc[1]}`;
    // chi va nello stesso punto si mette accanto, non addosso
    const qui = this.ospiti.filter((b) => b.chiave === o.chiave).indexOf(o);
    let dx = 0, dz = 0, vv = verso;
    if (p === 'tavolo') {
      // intorno al tavolo, ognuno dal suo lato
      const ang = [0.6, 2.6, 1.6, -0.6, 3.6][Math.max(0, qui) % 5];
      dx = Math.cos(ang) * 0.95; dz = Math.sin(ang) * 0.95;
      vv = Math.atan2(-dx, -dz);
    } else if (chiave === 'tappeto' && qui > 0) {
      // sul tappeto si gioca in cerchio
      const ang = qui * 2.2;
      dx = Math.cos(ang) * 1.35; dz = Math.sin(ang) * 1.0;
      vv = Math.atan2(-dx, -dz);
    } else if (qui > 0) {
      dx = ((qui % 2) ? 1 : -1) * Math.ceil(qui / 2) * 1.0;
      dz = Math.ceil(qui / 2) * 0.45;
    }
    o.meta.copy(dentroStanza(new THREE.Vector3(x + dx, 0, z + dz)));
    o.guarda = vv;
    if (subito) {
      o.m.gruppo.position.copy(o.meta);
      o.m.gruppo.rotation.y = vv;
      o.tappa = null;
    } else {
      o.tappa = o.m.gruppo.position.distanceTo(o.meta) > 1.6 ? new THREE.Vector3(0.6, 0, 0.7) : null;
    }
  }

  stato(): StatoOspite[] {
    return this.ospiti.map((o) => ({ id: o.dati.id, testo: o.att.testo }));
  }

  /** Fa saltare di gioia chi viene toccato (e lo fa girare verso di noi). */
  saluta(id: string) {
    const o = this.ospiti.find((x) => x.dati.id === id);
    if (!o) return;
    if (o.att.gesto !== 'dorme') o.salto = 0.5;
    this.fumetto(o, o.att.gesto === 'dorme' ? 'z' : '♥');
  }

  // ---------- luce del momento ----------

  private luci() {
    const m = this.momentoAttuale;
    const cielo = ({ mattina: '#ffd6b0', lavoro: '#a9d8f0', pranzo: '#a9d8f0', sera: '#f4a070', notte: '#1f2a5c' } as const)[m];
    const v = this.vetro.material as THREE.MeshBasicMaterial;
    if (m === 'notte' || m === 'sera') {
      v.map = texture(64, (c, l) => {
        const g = c.createLinearGradient(0, 0, 0, l);
        g.addColorStop(0, m === 'notte' ? '#141c44' : '#6a5aa8');
        g.addColorStop(1, m === 'notte' ? '#2a3a7a' : '#f4a070');
        c.fillStyle = g; c.fillRect(0, 0, l, l);
        c.fillStyle = '#fff8d0';
        for (let i = 0; i < (m === 'notte' ? 14 : 4); i++) c.fillRect((i * 37) % l, (i * 23) % (l * 0.6), 2, 2);
        if (m === 'notte') { c.beginPath(); c.arc(l * 0.7, l * 0.3, l * 0.12, 0, 7); c.fill(); c.fillStyle = '#141c44'; c.beginPath(); c.arc(l * 0.75, l * 0.27, l * 0.11, 0, 7); c.fill(); }
      });
      v.color.set('#ffffff');
    } else {
      v.map = null;
      v.color.set(cielo);
    }
    v.needsUpdate = true;
    const notte = m === 'notte', sera = m === 'sera';
    this.scene.background = new THREE.Color(notte ? '#1a1830' : sera ? '#3a2a3a' : '#f3e6cf');
    this.sole.intensity = notte ? 0.15 : sera ? 0.5 : 1.3;
    this.sole.color.set(notte ? '#8fa0ff' : sera ? '#ffb070' : '#fff1d6');
    this.ambiente.intensity = notte ? 0.8 : sera ? 0.95 : 1.25;
    this.ambiente.color.set(notte ? '#7c88d8' : '#fff4e0');
    // la lampada si accende la sera; di notte resta una lucina
    this.luceLampada.intensity = notte ? 1.2 : sera ? 5 : 0;
    const pm = this.paralume.material as THREE.MeshToonMaterial;
    pm.emissiveIntensity = notte ? 0.3 : sera ? 0.9 : 0;
  }

  // ---------- input ----------

  private ascolto = new AbortController();
  private collegaInput() {
    const c = this.canvas;
    const { signal } = this.ascolto;
    c.addEventListener('pointerdown', (e) => {
      this.trascina = { x: e.clientX, mosso: 0 };
      c.setPointerCapture(e.pointerId);
    }, { signal });
    c.addEventListener('pointermove', (e) => {
      if (!this.trascina) return;
      const dx = e.clientX - this.trascina.x;
      this.trascina.mosso += Math.abs(dx);
      this.trascina.x = e.clientX;
      this.angoloVoluto = THREE.MathUtils.clamp(this.angoloVoluto - dx * 0.004, -0.45, 0.35);
    }, { signal });
    const fine = (e: PointerEvent) => {
      const t = this.trascina;
      this.trascina = null;
      if (t && t.mosso < 8 && e.type === 'pointerup') this.tocca(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', fine, { signal });
    c.addEventListener('pointercancel', fine, { signal });
  }

  private tocca(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray.intersectObjects(this.ospiti.map((o) => o.m.gruppo), true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.ospite) o = o.parent;
    if (o) this.onTocco(o.userData.ospite as string);
  }

  // ---------- ciclo ----------

  private ridimensiona() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private ciclo = () => {
    this.raf = requestAnimationFrame(this.ciclo);
    const dt = Math.min(0.05, this.orologio.getDelta());
    this.passo(dt, this.orologio.elapsedTime);
  };

  /** Un passo di vita (separato dal ciclo, così le prove lo possono accelerare). */
  passo(dt: number, t: number) {
    // il momento della giornata cambia mentre guardi? cambiano anche le attività
    const m = this.momento();
    if (m !== this.momentoAttuale) {
      this.momentoAttuale = m;
      this.luci();
      for (const o of this.ospiti) this.nuovaAttivita(o);
    }

    // la telecamera: di tre quarti, come guardare dentro una casa delle bambole
    this.angolo += (this.angoloVoluto - this.angolo) * Math.min(1, dt * 5);
    // la stanza deve stare tutta in larghezza; in alto il titolo, in basso chi abita qui
    const asp = this.camera.aspect;
    this.camera.fov = 40;
    const mezzoOrizz = Math.atan(Math.tan(THREE.MathUtils.degToRad(20)) * asp);
    const dist = Math.min(19, Math.max(9.5, 5.9 / Math.tan(mezzoOrizz)));
    const base = 0.36 + this.angolo;
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    // il centro della stanza va un po' più in alto del centro dello schermo (sotto c'è l'elenco)
    this.camera.setViewOffset(w, h, 0, asp < 0.9 ? h * 0.0 : h * 0.05, w, h);
    this.camera.updateProjectionMatrix();
    this.camera.position.set(Math.sin(base) * dist, dist * (asp < 0.9 ? 0.8 : 0.55), Math.cos(base) * dist);
    this.camera.lookAt(-0.35, 0.9, -0.1);

    for (const o of this.ospiti) {
      this.muovi(o, dt, t);
      espressione(o.m, o.att.gesto === 'dorme' ? 'sonno' : o.salto > 0 ? 'gioia' : o.att.gesto === 'lavora' ? 'impegno' : 'fiducia');
      rifinisci(o.m, dt, t);
    }

    if (this.lancette) this.lancette.rotation.z = -t * 0.5;
    if (this.grammofono && this.ospiti.some((o) => o.att.posto === 'hobby' && o.att.gesto !== 'dorme')) {
      const disco = this.grammofono.children[1];
      if (disco) disco.rotation.y += dt * 3;
    }
    this.scene.traverse((c) => { if (c.name === 'pendente') c.position.y += Math.sin(t * 1.5 + c.position.x) * 0.0015; });

    this.effimeri = this.effimeri.filter((e) => {
      e.vita -= dt;
      e.o.position.addScaledVector(e.vel, dt);
      ((e.o as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.min(1, e.vita * 1.5);
      if (e.vita > 0) return true;
      this.scene.remove(e.o);
      return false;
    });

    // dentro casa il mondo non è curvo
    const curva = CURVA.valore;
    CURVA.valore = 0;
    this.renderer.render(this.scene, this.camera);
    CURVA.valore = curva;
  }

  private nuovaAttivita(o: Ospite) {
    const prima = o.att.testo;
    o.att = cosaFaInCasa(o.dati, this.momentoAttuale, Math.floor(o.turno));
    this.destinazione(o);
    // se continua a fare la stessa cosa, prima fa due passi per la stanza (alla finestra, a sgranchirsi)
    if (prima === o.att.testo && o.att.gesto !== 'dorme') {
      const giro = Math.random() * Math.PI * 2;
      o.tappa = dentroStanza(new THREE.Vector3(0.4 + Math.cos(giro) * 1.4, 0, 0.5 + Math.sin(giro) * 0.9));
    }
    if (prima !== o.att.testo) this.onCambio();
  }

  private fumetto(o: Ospite, simbolo: string) {
    const colore = simbolo === '♥' ? '#ff6b8a' : simbolo === '♪' || simbolo === '♫' ? '#8fd3ff' : simbolo === '✿' ? '#ffd166' : '#ffffff';
    const f = spriteTesto(simbolo, colore);
    f.scale.setScalar(0.4);
    f.position.copy(o.m.gruppo.position).add(new THREE.Vector3(0, 1.6 * o.m.gruppo.scale.x, 0));
    this.scene.add(f);
    this.effimeri.push({ o: f, vita: 1.2, vel: new THREE.Vector3(0, 0.35, 0) });
  }

  private zeta(o: Ospite, accese: boolean) {
    if (accese && !o.z.length) {
      for (let i = 0; i < 3; i++) {
        const z = spriteTesto('z', '#ffffff');
        z.scale.setScalar(0.25 + i * 0.07);
        o.m.gruppo.add(z);
        o.z.push(z);
      }
    } else if (!accese && o.z.length) {
      o.z.forEach((z) => o.m.gruppo.remove(z));
      o.z = [];
    }
  }

  private muovi(o: Ospite, dt: number, t: number) {
    const g = o.m.gruppo, m = o.m;
    // occhi che sbattono
    o.ammicca -= dt;
    if (o.ammicca <= 0) o.ammicca = 2 + Math.random() * 4;
    const dorme = o.att.gesto === 'dorme';
    for (const e of m.occhi) e.scale.y = dorme ? 0.12 : o.ammicca < 0.12 ? 0.15 : 1;
    if (m.accessorio?.userData.grembiule) m.accessorio.visible = o.att.gesto === 'lavora';

    // ogni tanto cambia attività (ma resta dentro il suo carattere)
    o.turno += dt / 14;
    if (Math.floor(o.turno) !== Math.floor(o.turno - dt / 14) && !dorme) this.nuovaAttivita(o);

    const meta = o.tappa ?? o.meta;
    const dir = meta.clone().sub(g.position).setY(0);
    const dist = dir.length();
    const cammina = dist > 0.06;
    // in casa camminano a quattro zampe e si alzano solo per fare le loro cose (leggere, cucinare, suonare...)
    // (da grandi stanno in piedi; i cuccioli a quattro zampe)
    o.eretto = m.bipede ? 1 : 0;
    posa(m, o.eretto);

    if (o.salto > 0) {
      o.salto = Math.max(0, o.salto - dt * 1.6);
      m.corpo.position.y = Math.sin(((o.salto % 0.5) / 0.5) * Math.PI) * 0.4;
      return;
    }

    if (cammina) {
      if (o.z.length) this.zeta(o, false);
      m.corpo.rotation.z = THREE.MathUtils.lerp(m.corpo.rotation.z, 0, dt * 6);
      m.corpo.rotation.x = 0;
      dir.normalize();
      g.position.addScaledVector(dir, Math.min(dist, 1.0 * dt));
      dentroStanza(g.position);
      const verso = Math.atan2(dir.x, dir.z);
      g.rotation.y += Math.atan2(Math.sin(verso - g.rotation.y), Math.cos(verso - g.rotation.y)) * Math.min(1, dt * 7);
      m.testa.rotation.set(0, 0, 0);
      if (o.eretto > 0.6) {
        o.passo += dt * 8;
        m.corpo.position.y = Math.abs(Math.sin(o.passo)) * 0.05;
        m.corpo.rotation.z = Math.sin(o.passo) * 0.06;
        m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(o.passo + (i % 2 === 0 ? 0 : Math.PI) + (i < 2 ? Math.PI : 0)) * (i < 2 ? 0.5 : 0.65)));
      } else {
        o.passo += dt * 11;
        m.corpo.position.y = Math.abs(Math.sin(o.passo)) * 0.1;
        m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(o.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * ampiezzaPasso(m)));
      }
      if (m.coda) m.coda.rotation.y = Math.sin(o.passo) * 0.4;
      return;
    }
    if (o.tappa) { o.tappa = null; return; }

    // arrivato: si gira e fa la sua cosa
    g.rotation.y += Math.atan2(Math.sin(o.guarda - g.rotation.y), Math.cos(o.guarda - g.rotation.y)) * Math.min(1, dt * 5);
    o.fumetto -= dt;
    if (o.fumetto <= 0) {
      o.fumetto = dorme ? 2.2 : 1.8 + Math.random() * 1.8;
      if (!dorme && o.att.fumetto) this.fumetto(o, o.att.fumetto);
    }
    this.gesto(o, dt, t);
  }

  private gesto(o: Ospite, dt: number, t: number) {
    const m = o.m;
    const braccia = m.zampe.slice(0, 2);
    const lerp = (a: number, b: number) => THREE.MathUtils.lerp(a, b, Math.min(1, dt * 5));
    const acciambellato = o.att.gesto === 'dorme' && o.att.posto === 'letto' && this.ancore.has('letto:' + o.dati.id);
    if (!acciambellato) m.corpo.rotation.x = lerp(m.corpo.rotation.x, 0);
    if (o.att.gesto !== 'dorme') {
      if (o.z.length) this.zeta(o, false);
      m.corpo.rotation.z = lerp(m.corpo.rotation.z, 0);
      m.corpo.scale.set(1, 1, 1);
    }
    m.testa.rotation.set(0, 0, 0);
    const seduto = () => (m.corpo.position.y = lerp(m.corpo.position.y, seduta(m).giu));
    switch (o.att.gesto) {
      case 'dorme': {
        if (!o.z.length) this.zeta(o, true);
        // sdraiato sul letto (o sul lettino, o sul cuscinone)
        const suLetto = o.att.posto === 'letto' && !this.ancore.has('letto:' + o.dati.id);
        if (acciambellato) {
          // nel lettino a nido ci si acciambella a pancia in giù, verso la stanza: niente muri né vicini addosso
          m.corpo.rotation.z = lerp(m.corpo.rotation.z, 0.15);
          m.corpo.rotation.x = THREE.MathUtils.lerp(m.corpo.rotation.x, 0.95, Math.min(1, dt * 5));
        } else m.corpo.rotation.z = lerp(m.corpo.rotation.z, 1.35);
        m.corpo.position.y = lerp(m.corpo.position.y, suLetto ? 0.5 : o.att.posto === 'hobby' ? 0.2 : 0.06);
        m.corpo.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
        o.z.forEach((z, i) => {
          const f = (t * 0.5 + i / 3) % 1;
          z.position.set(0.3 + f * 0.3, 0.9 + f * 0.9, 0);
          z.material.opacity = 1 - f;
        });
        break;
      }
      case 'mangia':
        seduto();
        m.testa.rotation.x = 0.2 + Math.max(0, Math.sin(t * 3)) * 0.15;
        braccia[0].rotation.x = -1.3 + Math.max(0, Math.sin(t * 3)) * 0.5;
        braccia[1].rotation.x = lerp(braccia[1].rotation.x, -0.6);
        break;
      case 'cucina':
        m.testa.rotation.x = 0.3;
        braccia[0].rotation.x = -1.1 + Math.sin(t * 5) * 0.25;
        braccia[0].rotation.z = Math.cos(t * 5) * 0.3;
        braccia[1].rotation.x = lerp(braccia[1].rotation.x, -0.5);
        break;
      case 'legge':
        seduto();
        m.testa.rotation.x = 0.35;
        m.testa.rotation.y = Math.sin(t * 0.7) * 0.15;
        braccia.forEach((z) => (z.rotation.x = lerp(z.rotation.x, -1.1)));
        break;
      case 'scrive':
        seduto();
        m.testa.rotation.x = 0.35;
        m.testa.rotation.z = Math.sin(t * 1.3) * 0.08;
        braccia[0].rotation.x = -1.0 + Math.sin(t * 10) * 0.12;
        braccia[1].rotation.x = lerp(braccia[1].rotation.x, -0.7);
        break;
      case 'guarda':
        m.testa.rotation.x = -0.3;
        m.testa.rotation.z = Math.sin(t * 0.8) * 0.15;
        m.corpo.position.y = Math.sin(t * 1.5) * 0.01;
        break;
      case 'osserva':
        m.corpo.rotation.x = 0.25 + Math.sin(t * 0.9) * 0.08;
        m.testa.rotation.x = -0.15 + Math.sin(t * 1.7) * 0.1;
        braccia[0].rotation.x = -1.3;
        break;
      case 'balla':
        o.m.gruppo.rotation.y += dt * 3;
        m.corpo.position.y = Math.abs(Math.sin(t * 7)) * 0.14;
        m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(t * 7 + i) * 0.8));
        break;
      case 'canta':
        m.testa.rotation.z = Math.sin(t * 3) * 0.2;
        m.testa.rotation.x = -0.2;
        braccia.forEach((z) => (z.rotation.x = -1.3 + Math.sin(t * 3) * 0.2));
        break;
      case 'ginnastica':
        m.corpo.position.y = -Math.abs(Math.sin(t * 3)) * 0.15;
        braccia.forEach((z) => (z.rotation.x = -2.6 + Math.abs(Math.sin(t * 3)) * 1.6));
        break;
      case 'salta':
        m.corpo.position.y = Math.abs(Math.sin(t * 5)) * 0.35;
        braccia.forEach((z, i) => (z.rotation.x = -1.5 + Math.sin(t * 10 + i) * 0.4));
        break;
      case 'stiracchia':
        m.corpo.scale.y = 1 + Math.max(0, Math.sin(t * 0.9)) * 0.08;
        braccia.forEach((z) => (z.rotation.x = -2.8 + Math.max(0, -Math.sin(t * 0.9)) * 2));
        m.testa.rotation.x = -0.2;
        break;
      case 'maglia':
        seduto();
        m.testa.rotation.x = 0.3;
        braccia.forEach((z, i) => (z.rotation.x = -1.1 + Math.sin(t * 9 + i * Math.PI) * 0.15));
        if (o.att.posto === 'hobby') m.corpo.rotation.x = Math.sin(t * 1.2) * 0.08; // dondola
        break;
      case 'spolvera':
        braccia[0].rotation.x = -1.6 + Math.sin(t * 6) * 0.4;
        braccia[0].rotation.z = Math.sin(t * 3) * 0.5;
        m.testa.rotation.z = Math.sin(t * 3) * 0.1;
        break;
      case 'annaffia':
        m.corpo.rotation.x = 0.25;
        braccia[0].rotation.x = -1.2 + Math.sin(t * 1.5) * 0.15;
        m.testa.rotation.x = 0.25;
        break;
      case 'beve':
        seduto();
        braccia[0].rotation.x = -1.2 - Math.max(0, Math.sin(t * 1.2)) * 0.6;
        m.testa.rotation.x = -Math.max(0, Math.sin(t * 1.2)) * 0.2;
        if (o.att.posto === 'hobby') m.corpo.rotation.x = Math.sin(t * 1.2) * 0.08;
        break;
      case 'lavora':
        m.testa.rotation.x = 0.25;
        braccia.forEach((z, i) => (z.rotation.x = -1.0 + Math.sin(t * 7 + i * Math.PI) * 0.35));
        m.corpo.position.y = Math.abs(Math.sin(t * 7)) * 0.02;
        if (o.fumetto <= 0.05) this.fumetto(o, SIMBOLI_MESTIERE[o.dati.mestiere ?? ''] ?? '★');
        break;
      case 'seduto':
      default:
        seduto();
        m.testa.rotation.z = Math.sin(t * 0.8) * 0.15;
        braccia.forEach((z) => (z.rotation.x = lerp(z.rotation.x, 0)));
        break;
    }
    if (m.coda) m.coda.rotation.y = Math.sin(t * 2.5) * 0.3;
  }

  /** Solo per le prove: fa passare il tempo (per mandare ognuno al suo posto). */
  avanza(secondi: number) {
    for (let k = 0; k < secondi * 30; k++) this.passo(1 / 30, k / 30);
  }

  distruggi() {
    cancelAnimationFrame(this.raf);
    this.ascolto.abort();
    this.resizeObs.disconnect();
    this.renderer.dispose();
  }
}

export type { Posto };
