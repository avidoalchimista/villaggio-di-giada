// La radura del villaggio in 3D. Gli animali girano liberi, dormono, festeggiano.
// Il villaggio si allarga quando arrivano nuovi abitanti e nascono nuovi mestieri.
import * as THREE from 'three';
import { COLORE_VIRTU } from '../lib/etichette';
import { REGOLE } from '../lib/gioco';
import type { Animale, StatoGioco, Virtu } from '../lib/tipi';
import {
  aggiornaMestiere, creaAiuola, creaAlbero, creaAnimale, creaBottegaMestiere, creaCartello, creaChiosco, creaCorvo, creaFalo,
  creaCespuglio, creaCiuffo, creaFungo, creaTronco, posa,
  creaFiore, creaLaghetto, creaLanterna, creaMulino, creaNido, creaPanchina, creaPiazzaMusica, creaPino, creaPonticello, creaPozzo,
  creaQuaderno, creaSasso, creaStaccionata, creaTorretta, creaUovo, mat, type ModelloAnimale,
} from './modelli';
import { CURVA, materialeTerreno, spriteTesto } from './ps1';

export type Bersaglio =
  | { tipo: 'animale'; id: string }
  | { tipo: 'corvo' }
  | { tipo: 'quaderno' }
  | { tipo: 'uovo'; id: string }
  | { tipo: 'edificio'; tipo_edificio: string }
  | { tipo: 'bottega'; id: string };

interface Abitante {
  m: ModelloAnimale;
  dati: Animale;
  meta: THREE.Vector3;
  pausa: number;
  passo: number;
  salto: number;
  ammicca: number;
  z: THREE.Sprite[];
  eretto: number; // 0 = quattro zampe, 1 = in piedi
  amico: string | null; // con chi sta passando del tempo
  incontro: number; // secondi di chiacchierata rimasti
  prossimoBalloon: number;
  balloon: THREE.Sprite | null;
}

/** Grandezza della radura: cresce con gli abitanti, i mestieri e le costruzioni. */
export function raggioVillaggio(s: StatoGioco): number {
  const nati = s.animali.filter((a) => a.fase !== 'uovo').length;
  const mestieri = s.animali.filter((a) => a.mestiere).length;
  return Math.min(22, 12 + nati * 0.6 + mestieri * 0.8 + s.edifici.length * 1.0 + (s.costruzioni?.length ?? 0) * 0.3);
}

/** Dove va ogni costruzione: [x, z, rotazione]. */
const POSTI_COSTRUZIONI: Record<string, [number, number, number]> = {
  cartello: [1.8, 8.2, -0.25],
  aiuola: [-1.6, 0.9, 0],
  staccionata: [-2.8, 1.6, 0],
  panchina: [2.9, 0.6, -1.3],
  laghetto: [4.4, 2.6, 0],
  falo: [0, 0, 0],
  ponticello: [4.4, 2.6, 0.2],
  pozzo: [-4.6, -1.6, 0.6],
  torretta: [-5.6, 4.4, 0.4],
  mulino: [5.8, -3.6, -0.8],
};

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
  private lanterne: THREE.Mesh[] = [];
  private lucciole: THREE.Points;
  private corvo = creaCorvo();
  private quaderno = creaQuaderno();
  private nido = creaNido();
  private prato!: THREE.Mesh;
  private matTerreno!: THREE.MeshLambertMaterial;
  private strutture = new Map<string, THREE.Object3D>();
  private giaAggiornata = false;
  private fiamma: THREE.Mesh | null = null;
  private pale: THREE.Group | null = null;
  private raggio = 0;
  private raggioMostrato = 5.5;
  private angolo = 0.0;
  private velAngolo = 0;
  private zoom = 1;
  private centro = new THREE.Vector3(); // punto guardato dalla telecamera
  private centroVoluto = new THREE.Vector3();
  private trascina: { x: number; y: number; mosso: number } | null = null;
  private dita = new Map<number, { x: number; y: number }>();
  private distanzaPizzico = 0;
  private angoloDita = 0;
  private raf = 0;
  private corvoParla = 0;
  private effimeri: { o: THREE.Object3D; vita: number; vel: THREE.Vector3 }[] = [];
  private resizeObs: ResizeObserver;
  onTocco: (b: Bersaglio) => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // niente tone mapping: così nebbia e cielo hanno esattamente lo stesso colore (prima gli alberi lontani sembravano fantasmi)
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene.fog = new THREE.Fog('#a9cfe4', 24, 62);
    this.scene.add(this.ambiente, this.sole);
    this.sole.position.set(6, 12, 8);

    this.costruisciFissi();
    this.scene.add(this.bosco);
    this.lucciole = this.creaLucciole();
    this.scene.add(this.lucciole);
    this.allarga(5.5);

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
    this.prato = new THREE.Mesh(new THREE.PlaneGeometry(130, 130, 64, 64), this.matTerreno);
    this.prato.rotation.x = -Math.PI / 2;
    this.scene.add(this.prato);

    // all'inizio la radura è selvatica: qualche sasso e un tronco caduto
    for (const [x, z, s] of [[3.4, -1.2, 0.6], [-2.2, -3.0, 0.45], [2.4, 3.6, 0.5], [-4.6, 3.2, 0.7]]) {
      const sasso = creaSasso(s);
      sasso.position.set(x, sasso.position.y, z);
      this.scene.add(sasso);
    }

    const grande = creaAlbero(1.5, 2);
    grande.position.set(-4.1, 0, 0.2);
    this.scene.add(grande);
    this.nido.scale.setScalar(1.3);
    this.nido.position.set(-2.8, 0, 1.6);
    this.scene.add(this.nido);

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
  }

  /** Ricostruisce il bosco intorno alla radura quando il villaggio si allarga. */
  private allarga(r: number) {
    const arrotondato = Math.round(r * 2) / 2;
    if (arrotondato === this.raggio) return;
    this.raggio = arrotondato;
    this.bosco.clear();
    let k = 0;
    for (let anello = 0; anello < 3; anello++) {
      const ra = r + 1.5 + anello * 2.6;
      const n = Math.round(ra * 1.9);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + anello * 0.37;
        // varco per il viale d'ingresso
        if (anello === 0 && Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.22) continue;
        const vicino = anello === 0;
        const albero = (i + anello) % 3 === 0 ? creaPino(0.95 + ((i * 7) % 5) * 0.12, vicino) : creaAlbero(0.9 + ((i * 5) % 4) * 0.12, k++, vicino);
        const jitter = ((i * 13) % 7) / 10 - 0.3;
        albero.position.set(Math.cos(a) * (ra + jitter), 0, Math.sin(a) * (ra + jitter));
        albero.rotation.y = i;
        this.bosco.add(albero);
      }
    }
    // natura selvatica: fiori, ciuffi d'erba alta, cespugli con bacche, funghi, tronchi caduti, sassi
    // (lontano dal centro e dai posti delle costruzioni, sempre negli stessi punti)
    const libero = (x: number, z: number) =>
      Math.hypot(x, z) > 3.2 && Object.values(POSTI_COSTRUZIONI).every(([px, pz]) => Math.hypot(x - px, z - pz) > 2.2);
    const colori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb', '#ff7b6b', '#8fd3ff'];
    const area = r * r;
    const metti = (n: number, f: (i: number) => THREE.Object3D, seme: number, min = 3.2) => {
      for (let i = 0; i < n; i++) {
        const a = (i + seme) * 2.39996, d = min + (((i * 37 + seme * 11) % 100) / 100) * (r - min - 0.5);
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (!libero(x, z)) continue;
        const o = f(i);
        o.position.set(x, o.position.y, z);
        o.rotation.y = i * 1.7;
        this.bosco.add(o);
      }
    };
    metti(Math.round(area * 0.22), (i) => { const f = creaFiore(colori[i % colori.length]); f.scale.setScalar(1 + (i % 3) * 0.2); return f; }, 1);
    metti(Math.round(area * 0.12), (i) => creaCiuffo(0.9 + (i % 4) * 0.2), 2);
    metti(Math.round(area * 0.035), (i) => creaCespuglio(0.8 + (i % 3) * 0.25, i), 3, 5);
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
    return new THREE.Points(g, new THREE.PointsMaterial({ color: '#fff3a0', size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
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
      case 'laghetto': g = creaLaghetto(); break;
      case 'falo': { const f = creaFalo(); g = f.gruppo; this.fiamma = f.fiamma; break; }
      case 'ponticello': g = creaPonticello(); break;
      case 'pozzo': g = creaPozzo(); break;
      case 'torretta': g = creaTorretta(); break;
      case 'mulino': { const m = creaMulino(); g = m.gruppo; this.pale = m.pale; break; }
    }
    if (!g) return;
    if (pos) {
      g.position.set(pos[0], 0, pos[1]);
      g.rotation.y = pos[2];
    }
    this.strutture.set(id, g);
    this.scene.add(g);
    if (nuova && id !== 'sentiero') {
      g.scale.setScalar(0.01);
      g.userData.cresce = 0;
      this.coriandoli(g.position.clone().setY(1), ['#f2c94c', '#ffffff', '#8fd3ff']);
    }
  }

  aggiorna(s: StatoGioco) {
    this.allarga(raggioVillaggio(s));
    const primaVolta = this.strutture.size === 0 && !this.giaAggiornata;
    for (const c of s.costruzioni) this.metti(c.id, s, !primaVolta);
    this.giaAggiornata = true;
    const visti = new Set<string>();
    s.animali.forEach((a, i) => {
      visti.add(a.id);
      if (a.fase === 'uovo') {
        this.togliAbitante(a.id);
        if (!this.uova.has(a.id)) {
          const u = creaUovo(COLORE_VIRTU[REGOLE.specieVirtu[a.specie]]);
          const n = this.uova.size;
          u.position.set(this.nido.position.x + ((n % 3) - 1) * 0.42, 0.06, this.nido.position.z + Math.floor(n / 3) * 0.36);
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
        this.coriandoli(uovo.position.clone().setY(0.6), ['#ffd166', '#ff8fb1', '#7ccf6a', '#8fd3ff']);
      }
      let ab = this.abitanti.get(a.id);
      if (!ab) {
        const m = creaAnimale(a);
        const pos = uovo?.position ?? new THREE.Vector3(Math.cos(i * 2.1) * 2.5, 0, Math.sin(i * 2.1) * 2.5);
        m.gruppo.position.set(pos.x, 0, pos.z);
        m.gruppo.userData.bersaglio = { tipo: 'animale', id: a.id };
        this.scene.add(m.gruppo);
        ab = {
          m, dati: a, meta: this.puntoCasuale(), pausa: 1 + Math.random() * 2, passo: Math.random() * 6, salto: uovo ? 1 : 0,
          ammicca: Math.random() * 4, z: [], eretto: 0, amico: null, incontro: 0, prossimoBalloon: 0, balloon: null,
        };
        this.abitanti.set(a.id, ab);
      }
      ab.dati = a;
      // i cuccioli sono piccoli e con la testa enorme; crescendo il corpo si allunga
      const scala = ({ cucciolo: 1.15, giovane: 1.35, adulto: 1.55, maestro: 1.65, uovo: 1 } as const)[a.fase];
      ab.m.gruppo.scale.setScalar(scala * ((ab.m.gruppo.userData.taglia as number) ?? 1));
      const proporzione = ({ cucciolo: 1.12, giovane: 1.0, adulto: 0.9, maestro: 0.9, uovo: 1 } as const)[a.fase];
      ab.m.testa.scale.setScalar(proporzione);
      aggiornaMestiere(ab.m, a.mestiere);
      this.aggiornaSonno(ab);

      // chi ha un mestiere si costruisce la sua bottega ai margini della radura
      if (a.mestiere && !this.botteghe.has(a.id)) {
        const b = creaBottegaMestiere(a.mestiere, COLORE_VIRTU[this.virtuMestiere(a.mestiere)]);
        b.userData.bersaglio = { tipo: 'bottega', id: a.id };
        this.botteghe.set(a.id, b);
        this.scene.add(b);
        this.coriandoli(new THREE.Vector3(0, 1, 0), ['#f2c94c', '#ffffff']);
      }
    });
    for (const id of [...this.abitanti.keys()]) if (!visti.has(id)) this.togliAbitante(id);

    // posti degli edifici e delle botteghe: in cerchio, dietro la radura, con il villaggio che si allarga
    const posti = [...s.edifici.map((e) => ({ k: 'e:' + e.tipo })), ...[...this.botteghe.keys()].map((id) => ({ k: 'b:' + id }))];
    posti.forEach((p, i) => {
      const n = posti.length;
      const ang = Math.PI * 1.5 + (i - (n - 1) / 2) * Math.min(0.75, 4.2 / Math.max(n, 1));
      const d = Math.min(9.5, this.raggio - 2);
      const x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      if (p.k.startsWith('e:')) {
        const tipo = p.k.slice(2);
        let g = this.edifici.get(tipo);
        if (!g) {
          g = tipo === 'chiosco' ? creaChiosco() : creaPiazzaMusica();
          g.userData.bersaglio = { tipo: 'edificio', tipo_edificio: tipo };
          this.edifici.set(tipo, g);
          this.scene.add(g);
        }
        g.position.set(x, 0, z);
        g.lookAt(0, 0, 0);
        const e = s.edifici.find((x) => x.tipo === tipo)!;
        g.rotation.z = e.stato === 'fermo' ? 0.04 : 0;
      } else {
        const g = this.botteghe.get(p.k.slice(2))!;
        g.position.set(x, 0, z);
        g.lookAt(0, 0, 0);
      }
    });
  }

  private virtuMestiere(m: string): Virtu {
    return (Object.entries(REGOLE.mestieri).find(([, l]) => l.includes(m))?.[0] ?? 'saggezza') as Virtu;
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

  private puntoCasuale(): THREE.Vector3 {
    const a = Math.random() * Math.PI * 2, r = 0.8 + Math.random() * Math.max(2, this.raggio - 2.2);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
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
      this.dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.dita.size === 1) this.trascina = { x: e.clientX, y: e.clientY, mosso: 0 };
      else {
        this.distanzaPizzico = this.distanzaDita();
        this.angoloDita = this.angoloTraDita();
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
        return;
      }
      if (!this.trascina) return;
      const dx = e.clientX - this.trascina.x, dy = e.clientY - this.trascina.y;
      this.trascina.mosso += Math.abs(dx) + Math.abs(dy);
      this.trascina.x = e.clientX;
      this.trascina.y = e.clientY;
      // sposto il punto guardato sul terreno, nella direzione del dito
      const k = 0.022 * this.zoom * (12 / Math.max(300, this.canvas.clientWidth)) * 30;
      const destra = new THREE.Vector3(Math.cos(this.angolo), 0, -Math.sin(this.angolo));
      const avanti = new THREE.Vector3(-Math.sin(this.angolo), 0, -Math.cos(this.angolo));
      this.centroVoluto.addScaledVector(destra, -dx * k).addScaledVector(avanti, dy * k);
      const lim = this.raggio - 1;
      if (this.centroVoluto.length() > lim) this.centroVoluto.setLength(lim);
    });
    const fine = (e: PointerEvent) => {
      this.dita.delete(e.pointerId);
      const t = this.trascina;
      if (this.dita.size === 0) {
        this.trascina = null;
        if (t && t.mosso < 8 && e.type === 'pointerup') this.tocca(e.clientX, e.clientY);
      }
    };
    c.addEventListener('pointerup', fine);
    c.addEventListener('pointercancel', fine);
    c.addEventListener('wheel', (e) => {
      this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + Math.sign(e.deltaY) * 0.08), 0.5, 2.4);
    }, { passive: true });
  }

  private angoloTraDita() {
    const [a, b] = [...this.dita.values()];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  /** Porta la vista su un punto (es. l'animale toccato). */
  guarda(p: THREE.Vector3) {
    this.centroVoluto.set(p.x, 0, p.z);
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
      this.corvo.gruppo, this.quaderno, ...this.uova.values(), ...this.edifici.values(), ...this.botteghe.values(),
      ...[...this.abitanti.values()].map((a) => a.m.gruppo),
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
    const notte = 1 - giorno;
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
    const dist = (verticale ? 1.6 : 1.3) * r * this.zoom + 1.5;
    const alt = (verticale ? 1.05 : 0.75) * r * this.zoom + 1;
    CURVA.valore = 0.0022 / Math.max(0.6, this.zoom);

    if (!this.trascina) {
      this.velAngolo *= 0.92;
      this.angolo += this.velAngolo;
    }
    this.centro.lerp(this.centroVoluto, Math.min(1, dt * 3));
    const oscilla = Math.sin(t * 0.15) * 0.04;
    this.camera.position.set(
      this.centro.x + Math.sin(this.angolo + oscilla) * dist,
      alt,
      this.centro.z + Math.cos(this.angolo + oscilla) * dist,
    );
    this.camera.lookAt(this.centro.x, 0.6, this.centro.z);

    if (Math.floor(t / 5) !== Math.floor((t - dt) / 5)) this.luceDelGiorno();

    for (const ab of this.abitanti.values()) this.muovi(ab, dt, t);

    for (const u of this.uova.values()) {
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
    if (this.pale) this.pale.rotation.z += dt * 0.6;

    const brilla = this.quaderno.getObjectByName('brilla');
    if (brilla) brilla.position.y = 1.4 + Math.sin(t * 3) * 0.08;

    const pos = this.lucciole.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, 0.6 + Math.sin(t * 0.8 + i) * 0.5 + (i % 3) * 0.4);
    pos.needsUpdate = true;

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

    if (ab.dati.addormentato) {
      ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 1.25, dt * 2);
      ab.m.corpo.position.y = THREE.MathUtils.lerp(ab.m.corpo.position.y, -0.05, dt * 2);
      ab.m.corpo.scale.y = 1 + Math.sin(t * 1.5) * 0.03;
      ab.z.forEach((z, i) => {
        const f = (t * 0.5 + i / 3) % 1;
        z.position.set(0.3 + f * 0.3, 0.9 + f * 0.9, 0);
        z.material.opacity = 1 - f;
      });
      return;
    }
    ab.m.corpo.rotation.z = THREE.MathUtils.lerp(ab.m.corpo.rotation.z, 0, dt * 4);

    if (ab.salto > 0) {
      ab.salto = Math.max(0, ab.salto - dt * 1.6);
      const fase = ab.salto % 0.5;
      ab.m.corpo.position.y = Math.sin((fase / 0.5) * Math.PI) * 0.45;
      ab.m.corpo.scale.set(1 + Math.sin(fase * 12) * 0.05, 1 - Math.sin(fase * 12) * 0.05, 1);
      return;
    }
    ab.m.corpo.scale.set(1, 1, 1);

    const dir = ab.meta.clone().sub(g.position);
    const dist = dir.length();
    const fase = ab.dati.fase;
    const cammina = ab.pausa <= 0 && dist >= 0.15;

    // postura: i cuccioli a quattro zampe, i giovani si alzano quando stanno fermi, gli adulti stanno in piedi
    const erettoVoluto = fase === 'cucciolo' ? 0 : fase === 'giovane' ? (cammina ? 0 : 0.6) : 1;
    ab.eretto += (erettoVoluto - ab.eretto) * Math.min(1, dt * 3);
    posa(ab.m, ab.eretto);

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
      ab.pausa = 1.5 + Math.random() * 4;
      return;
    }

    // camminata: i cuccioli trotterellano a quattro zampe, gli adulti camminano su due
    const gioca = ab.amico && fase === 'cucciolo';
    const vel = (fase === 'cucciolo' ? (gioca ? 1.5 : 0.7) : 0.95) * (ab.dati.umore > 50 ? 1 : 0.6);
    dir.normalize();
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
      ab.passo += dt * (gioca ? 16 : 11);
      ab.m.corpo.position.y = Math.abs(Math.sin(ab.passo)) * 0.1;
      ab.m.testa.rotation.z = Math.sin(ab.passo) * 0.06;
      ab.m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(ab.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7));
    }
    if (ab.m.coda) ab.m.coda.rotation.y = Math.sin(ab.passo) * 0.4;
  }

  /** Finita una pausa: a volte si va a trovare qualcuno, altrimenti si gironzola. */
  private scegliCosaFare(ab: Abitante) {
    const liberi = [...this.abitanti.values()].filter((b) => b !== ab && !b.amico && !b.dati.addormentato && b.salto <= 0);
    const voglia = ab.dati.fase === 'cucciolo' ? 0.3 : 0.45;
    if (liberi.length && Math.random() < voglia) {
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
    ab.meta = this.puntoCasuale();
  }

  private fumetto(ab: Abitante, simbolo: string) {
    const colore = simbolo === '♥' ? '#ff6b8a' : simbolo === '♪' ? '#8fd3ff' : simbolo === '✿' ? '#ffd166' : '#ffffff';
    const f = spriteTesto(simbolo, colore);
    f.scale.setScalar(0.42);
    f.position.copy(ab.m.gruppo.position).add(new THREE.Vector3(0, 1.75 * ab.m.gruppo.scale.x, 0));
    this.scene.add(f);
    this.effimeri.push({ o: f, vita: 1.1, vel: new THREE.Vector3(0, 0.35, 0) });
  }

  distruggi() {
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.renderer.dispose();
  }
}
