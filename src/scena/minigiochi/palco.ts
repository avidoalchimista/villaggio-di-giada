// Il "palco" dei minigiochi delle botteghe: una piccola scena 3D tutta sua (il villaggio intanto si ferma,
// così non si rallenta niente), con il prato, qualche albero, la luce del momento e l'animale della bottega
// in piedi alla sua postazione, visto da fuori come nella pesca. Ogni minigioco ci mette sopra le sue cose
// e decide cosa succede ai tocchi; il palco pensa a disegnare, alle dimensioni dello schermo e al dito.
import * as THREE from 'three';
import { defMestiere } from '../../lib/mestieri';
import type { FormaStelle, PezzoTorta } from '../../lib/minigiochi';
import type { Animale } from '../../lib/tipi';
import { creaPostazione } from '../botteghe';
import { aggiornaMestiere, creaAlbero, creaAnimale, creaCespuglio, creaPino, espressione, mat, rifinisci, type Espressione, type ModelloAnimale } from '../modelli';
import { CURVA, ombra, spriteTesto } from '../ps1';

export interface Bottone { id: string; testo: string; colore?: string; scelto?: boolean }

export interface FineMinigioco {
  punti: number; // 0-1
  righe: string[]; // cosa è successo, in poche parole ("12 pezzi di legna")
  ricordo?: Record<string, unknown>;
}

export interface Info {
  testo: string; // il fumetto in basso
  conta?: string; // in alto, accanto al titolo (es. "Ciocco 3 di 6")
  urgente?: boolean;
  bottoni?: Bottone[];
  // i biglietti da copiare, disegnati sopra al gioco
  torta?: PezzoTorta[];
  vaso?: { nome: string; profilo: number[]; alto: number };
  stelle?: FormaStelle;
}

export abstract class Palco {
  protected renderer: THREE.WebGLRenderer;
  protected scene = new THREE.Scene();
  protected camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);
  protected sole = new THREE.DirectionalLight('#fff1d6', 1.5);
  protected ambiente = new THREE.HemisphereLight('#eaf6ff', '#7a8a4a', 1.25);
  protected orologio = new THREE.Clock();
  protected raf = 0;
  protected curva = 0; // il mondo curvo del villaggio (solo per il giro in moto)
  protected ascolto = new AbortController();
  private resizeObs: ResizeObserver;
  protected m!: ModelloAnimale;
  protected postazione: THREE.Group | null = null;
  protected effimeri: { o: THREE.Object3D; vita: number; vel: THREE.Vector3; gira?: number }[] = [];
  protected giocando = false;
  protected finito = false;
  protected ray = new THREE.Raycaster();
  /** Il minigioco vuole aggiornare il fumetto e i bottoni (chi si collega dopo riceve subito l'ultimo). */
  private _onInfo: (i: Info) => void = () => {};
  private ultimaInfo: Info | null = null;
  get onInfo(): (i: Info) => void {
    return (i: Info) => { this.ultimaInfo = i; this._onInfo(i); };
  }
  set onInfo(f: (i: Info) => void) {
    this._onInfo = f;
    if (this.ultimaInfo) f(this.ultimaInfo);
  }
  /** Partita finita. */
  onFine: (f: FineMinigioco) => void = () => {};

  constructor(protected canvas: HTMLCanvasElement, protected dati: Animale, protected livello: number, protected notte = false) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    // sul telefono basta una densità di 1.5: il gioco resta fluido e si vede nitido
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene.add(this.ambiente, this.sole);
    this.sole.position.set(3, 8, 5);
    this.resizeObs = new ResizeObserver(() => this.ridimensiona());
    this.resizeObs.observe(canvas);
  }

  /** Da chiamare alla fine del costruttore di ogni minigioco. */
  protected avvia() {
    this.ridimensiona();
    this.collegaInput();
    this.ciclo();
  }

  // ---------- il posto ----------

  /** Il prato tondo con qualche albero intorno e il cielo del momento. */
  protected prato(colore = '#8cc068', cielo = '#a9d8f0', raggio = 9) {
    this.scene.background = new THREE.Color(cielo);
    this.scene.fog = new THREE.Fog(cielo, raggio * 1.1, raggio * 2.6);
    // (a quadretti fitti: col mondo curvo ogni punto deve potersi piegare)
    const p = new THREE.Mesh(new THREE.PlaneGeometry(raggio * 6, raggio * 6, 48, 48), mat(colore, { rim: 0 }));
    p.rotation.x = -Math.PI / 2;
    p.userData.senzaContorno = true;
    this.scene.add(p);
    // alberi e cespugli in cerchio, più fitti dietro
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.2;
      if (Math.sin(a) > 0.55) continue; // davanti alla telecamera niente alberi
      const r = raggio * (0.75 + ((i * 37) % 10) / 30);
      const t = i % 3 === 0 ? creaPino(0.9 + (i % 4) * 0.1, false) : i % 3 === 1 ? creaAlbero(1 + (i % 3) * 0.1, i % 4, false) : creaCespuglio(1.2);
      t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1);
      t.rotation.y = i;
      this.scene.add(t);
    }
  }

  /** L'animale della bottega, con la divisa da lavoro. */
  protected animale(x = 0, z = 0, verso = 0): ModelloAnimale {
    const m = creaAnimale(this.dati, true);
    aggiornaMestiere(m, this.dati.mestiere);
    const scala = ({ cucciolo: 1.15, giovane: 1.22, adulto: 1.28, maestro: 1.32, uovo: 1 } as const)[this.dati.fase] * 0.85;
    m.gruppo.scale.setScalar(scala * Math.min(1.05, (m.gruppo.userData.taglia as number) ?? 1));
    m.testa.scale.setScalar(this.dati.fase === 'adulto' || this.dati.fase === 'maestro' ? 0.92 : 1);
    m.gruppo.position.set(x, 0, z);
    m.gruppo.rotation.y = verso;
    if (m.accessorio?.userData.grembiule) m.accessorio.visible = true;
    this.scene.add(m.gruppo);
    this.m = m;
    return m;
  }

  /** La postazione del mestiere (il ceppo, il tornio, il telescopio...), come davanti alla sua bottega. */
  protected bancoDaLavoro(x = 0, z = 0, verso = 0): THREE.Group | null {
    const d = defMestiere(this.dati.mestiere);
    if (!d) return null;
    const g = creaPostazione(d.postazione, d);
    g.position.set(x, 0, z);
    g.rotation.y = verso;
    this.scene.add(g);
    this.postazione = g;
    return g;
  }

  protected faccia(e: Espressione) {
    if (this.m) espressione(this.m, e);
  }

  /** Un fumetto che sale e svanisce (♥, +3, ✦...). */
  protected sbuffo(testo: string, dove: THREE.Vector3, colore = '#ffffff', taglia = 0.5) {
    const s = spriteTesto(testo, colore);
    s.scale.multiplyScalar(taglia);
    s.position.copy(dove);
    this.scene.add(s);
    this.effimeri.push({ o: s, vita: 1.2, vel: new THREE.Vector3(0, 0.9, 0) });
  }

  /** Coriandoli di fine partita intorno all'animale. */
  protected festa(dove: THREE.Vector3, n = 24) {
    const colori = ['#ff6b6b', '#ffd166', '#6bcf8a', '#5ab0ff', '#c38bff'];
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), new THREE.MeshBasicMaterial({ color: colori[i % colori.length], side: THREE.DoubleSide }));
      c.position.copy(dove);
      this.scene.add(c);
      const a = Math.random() * Math.PI * 2;
      this.effimeri.push({ o: c, vita: 1.6 + Math.random(), vel: new THREE.Vector3(Math.cos(a) * 1.4, 2.5 + Math.random() * 1.5, Math.sin(a) * 1.4), gira: 6 });
    }
  }

  /** Un oggetto 3D che vola via con la gravità (pezzi di legna, schizzi...). */
  protected vola(o: THREE.Object3D, vel: THREE.Vector3, vita = 1.4, gira = 4) {
    this.scene.add(o);
    this.effimeri.push({ o, vita, vel, gira });
  }

  // ---------- il gioco ----------

  /** Comincia a giocare (dopo la spiegazione). */
  inizia() {
    this.giocando = true;
    this.finito = false;
  }

  /** Un bottone della barra in basso (panna/fragola, un colore, Fatto!, Scatta...). */
  bottone(_id: string) {}

  protected finisci(f: FineMinigioco) {
    if (this.finito) return;
    this.finito = true;
    this.giocando = false;
    this.faccia(f.punti >= 0.45 ? 'gioia' : 'fiducia');
    if (this.m) this.festa(this.m.gruppo.position.clone().add(new THREE.Vector3(0, 1.6, 0)), f.punti >= 0.45 ? 30 : 14);
    setTimeout(() => this.onFine(f), 900);
  }

  /** Ogni fotogramma: il minigioco muove le sue cose. */
  protected abstract aggiorna(dt: number, t: number): void;
  /** Il dito tocca lo schermo (x, y tra -1 e 1, come per il raycaster). */
  protected giu(_p: THREE.Vector2, _e: PointerEvent) {}
  protected muovi(_p: THREE.Vector2, _e: PointerEvent) {}
  protected su(_p: THREE.Vector2, _e: PointerEvent) {}

  /** Dove cade il dito su un oggetto (o niente). */
  protected colpisci(p: THREE.Vector2, oggetti: THREE.Object3D[]): THREE.Intersection | null {
    this.ray.setFromCamera(p, this.camera);
    return this.ray.intersectObjects(oggetti, true)[0] ?? null;
  }

  /** Dove cade il dito su un piano orizzontale all'altezza y. */
  protected sulPiano(p: THREE.Vector2, y: number): THREE.Vector3 | null {
    this.ray.setFromCamera(p, this.camera);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), out);
  }

  private ndc(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private collegaInput() {
    const c = this.canvas;
    const { signal } = this.ascolto;
    let giu = false;
    c.addEventListener('pointerdown', (e) => {
      giu = true;
      try { c.setPointerCapture(e.pointerId); } catch { /* niente */ }
      if (this.giocando) this.giu(this.ndc(e), e);
    }, { signal });
    c.addEventListener('pointermove', (e) => { if (this.giocando) this.muovi(this.ndc(e), e); }, { signal });
    const fine = (e: PointerEvent) => {
      if (!giu) return;
      giu = false;
      if (this.giocando) this.su(this.ndc(e), e);
    };
    c.addEventListener('pointerup', fine, { signal });
    c.addEventListener('pointercancel', fine, { signal });
  }

  protected ridimensiona() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.inquadra(w / h);
  }

  /** Sul telefono in verticale la telecamera si allontana un po', se no non ci sta tutto. */
  protected inquadra(_aspetto: number) {}

  private ciclo = () => {
    this.raf = requestAnimationFrame(this.ciclo);
    const dt = Math.min(0.05, this.orologio.getDelta());
    this.passo(dt, this.orologio.elapsedTime);
  };

  /** Un passo (separato dal ciclo, così le prove lo possono chiamare a mano). */
  passo(dt: number, t: number) {
    this.aggiorna(dt, t);
    if (this.m) rifinisci(this.m, dt, t);
    for (let i = this.effimeri.length - 1; i >= 0; i--) {
      const e = this.effimeri[i];
      e.vita -= dt;
      e.o.position.addScaledVector(e.vel, dt);
      if (e.gira !== undefined) {
        e.vel.y -= 9 * dt;
        e.o.rotation.x += e.gira * dt;
        e.o.rotation.z += e.gira * 0.7 * dt;
        if (e.o.position.y < 0.03) { e.o.position.y = 0.03; e.vel.multiplyScalar(0.4); e.vel.y = Math.abs(e.vel.y) * 0.3; e.gira *= 0.5; }
      }
      if (e.o instanceof THREE.Sprite) (e.o.material as THREE.SpriteMaterial).opacity = Math.min(1, e.vita * 1.5);
      if (e.vita <= 0) {
        this.scene.remove(e.o);
        this.effimeri.splice(i, 1);
      }
    }
    const prima = CURVA.valore;
    CURVA.valore = this.curva;
    this.renderer.render(this.scene, this.camera);
    CURVA.valore = prima;
  }

  /** Una foto di quello che si vede adesso (per l'album): piccola, in jpeg. */
  fotografa(cam: THREE.Camera, w = 320, h = 240): string {
    const rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace });
    const prima = CURVA.valore;
    CURVA.valore = this.curva;
    this.renderer.setRenderTarget(rt);
    this.renderer.render(this.scene, cam);
    this.renderer.setRenderTarget(null);
    CURVA.valore = prima;
    const px = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    // la foto esce capovolta: si raddrizza riga per riga
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.72);
  }

  distruggi() {
    cancelAnimationFrame(this.raf);
    this.ascolto.abort();
    this.resizeObs.disconnect();
    this.renderer.dispose();
  }
}

export { ombra };
