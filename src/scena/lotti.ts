// Disegnare le cose ferme "a lotti": invece di mandare al telefono un pezzo alla volta (ogni foglia
// di ogni albero, ogni tegola di ogni casa, ogni bottone della giacca di un animale), i pezzi che stanno
// fermi tra loro si uniscono in uno solo. Si vede identico, ma il telefono fa molta meno fatica.
//
// Tutto è automatico e prudente:
// - un lotto si unisce solo quando le sue cose stanno ferme da un po' (spostando una casa si scioglie);
// - un pezzo che si muove da solo (una girandola, il fumo, gli occhi che sbattono) resta fuori;
// - i pezzi con colori semplici si uniscono anche se hanno colori diversi: il colore si "dipinge" sui vertici;
// - i pezzi originali restano dove sono (si toccano, si spostano, si tagliano come prima),
//   solo che la telecamera non li disegna: stanno su un altro "strato".
// Due tipi di lotto: nel mondo (il bosco a spicchi, le case) e "dentro" un pezzo che si muove
// (la testa di un animale: i pezzi della testa stanno fermi rispetto alla testa, e si uniscono lì).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GUSCI, materiale, matContorno } from './ps1';

/** Lo strato dove vanno i pezzi originali mentre si disegna il loro lotto (i raggi del tocco lo guardano). */
export const STRATO_LOTTI = 2;
const CALMA = 40; // fotogrammi fermi prima di unire

interface Pezzo { m: THREE.Mesh; r: THREE.Object3D; mt: Float64Array; mat: THREE.Material; geo: THREE.BufferGeometry; ver: number; vis: boolean; col: number }

class Lotto {
  pezzi: Pezzo[] = [];
  uniti: THREE.Mesh[] = [];
  radiciM: Float64Array[] = [];
  radiciVis: boolean[] = [];
  calma = 0;
  unito = false;
  /** spazio = null: nel mondo; altrimenti i pezzi uniti diventano figli di questo (e si muovono con lui) */
  constructor(public radici: THREE.Object3D[], public spazio: THREE.Object3D | null) {}
  private tmp = new THREE.Matrix4();
  // nel mondo conta dove sta ogni cosa; dentro uno spazio, solo come sta rispetto a lui
  matrice(o: THREE.Object3D) { return this.spazio ? relativa(o, this.spazio, this.tmp) : o.matrixWorld; }
}

const copia = (m: THREE.Matrix4) => Float64Array.from(m.elements);
function uguale(a: Float64Array, m: THREE.Matrix4) {
  const e = m.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(a[i] - e[i]) > 1e-6) return false;
  return true;
}
const versione = (g: THREE.BufferGeometry) => {
  let v = g.index?.version ?? 0;
  for (const k in g.attributes) v += (g.attributes[k] as THREE.BufferAttribute).version ?? 0;
  return v;
};
/** Visibile davvero: lui e tutti i genitori fino alla radice del lotto. */
function visibile(o: THREE.Object3D, radice: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) {
    if (!p.visible) return false;
    if (p === radice) return true;
  }
  return true;
}
const coloreDi = (m: THREE.Material) => ((m as THREE.MeshToonMaterial).color?.getHex() ?? -1);
const nessunTocco = () => {};

/** I materiali semplici (un colore, niente disegni né luci) si possono unire dipingendo il colore sui vertici. */
function dipingibile(m: THREE.Material): m is THREE.MeshToonMaterial {
  const t = m as THREE.MeshToonMaterial;
  return t.isMeshToonMaterial && !t.map && !t.alphaMap && !t.normalMap && !t.transparent && t.opacity === 1 && !t.vertexColors && t.emissive.getHex() === 0 && t.userData.rim !== undefined;
}
const dipinti = new Map<string, THREE.MeshToonMaterial>();
function materialeDipinto(m: THREE.MeshToonMaterial) {
  const k = `${m.userData.rim}|${m.side}|${m.fog}|${m.gradientMap?.uuid}`;
  let d = dipinti.get(k);
  if (!d) {
    d = materiale({ color: '#ffffff', vertexColors: true, rim: m.userData.rim as number, side: m.side, fog: m.fog, gradientMap: m.gradientMap });
    dipinti.set(k, d);
  }
  return d;
}

/** La posizione di `o` dentro lo spazio del lotto (o nel mondo). */
function relativa(o: THREE.Object3D, spazio: THREE.Object3D | null, out: THREE.Matrix4) {
  if (!spazio) return out.copy(o.matrixWorld);
  out.identity();
  for (let x: THREE.Object3D | null = o; x && x !== spazio; x = x.parent) out.premultiply(x.matrix);
  return out;
}

export class Lotti {
  readonly gruppo = new THREE.Group();
  /** Pezzi che si sono mossi da soli: non si uniscono più. */
  private mobili = new WeakSet<THREE.Object3D>();
  private lotti = new Map<string, Lotto>();
  attivo = true;

  constructor() {
    this.gruppo.name = 'lotti';
    this.gruppo.matrixAutoUpdate = false;
  }

  /**
   * Quali cose stanno in quale lotto (chiamato ogni tanto: se un lotto cambia composizione si rifà).
   * `dentro`: lotti dentro un pezzo che si muove (chiave → [spazio, pezzi figli]).
   */
  imposta(nuovi: Map<string, THREE.Object3D[]>, dentro = new Map<string, [THREE.Object3D, THREE.Object3D[]]>()) {
    for (const [k, l] of this.lotti) {
      const d = dentro.get(k);
      const n = d ? d[1] : nuovi.get(k);
      if (n && (!d || d[0] === l.spazio) && n.length === l.radici.length && n.every((r, i) => r === l.radici[i])) continue;
      this.sciogli(l);
      this.lotti.delete(k);
    }
    for (const [k, radici] of nuovi) if (!this.lotti.has(k) && radici.length) this.lotti.set(k, new Lotto(radici, null));
    for (const [k, [spazio, radici]] of dentro) if (!this.lotti.has(k) && radici.length) this.lotti.set(k, new Lotto(radici, spazio));
  }

  /** A ogni fotogramma: controlla che le cose unite siano ancora ferme, unisce quelle che si sono calmate. */
  passo() {
    let unitiOra = 0;
    for (const l of this.lotti.values()) {
      // (i lotti dentro gli animali restano anche nei primi piani: lì si toglie di mezzo solo quello che sta nel mondo)
      if (!this.attivo && !l.spazio) { this.sciogli(l); continue; }
      // le radici (la casa, l'albero) si sono spostate o nascoste? si scioglie e si aspetta che si calmino
      let ferme = l.radiciM.length === l.radici.length;
      for (let i = 0; ferme && i < l.radici.length; i++) {
        const r = l.radici[i];
        if (r.visible !== l.radiciVis[i] || !uguale(l.radiciM[i], l.matrice(r))) ferme = false;
      }
      if (!ferme) {
        this.sciogli(l);
        l.radiciM = l.radici.map((r) => copia(l.matrice(r)));
        l.radiciVis = l.radici.map((r) => r.visible);
        l.calma = 0;
        continue;
      }
      // un pezzo si è mosso da solo (o è cambiato): fuori per sempre, e il lotto si rifà
      let cambiato = false;
      for (const p of l.pezzi) {
        const m = p.m;
        if (this.mobili.has(m)) continue; // già fuori dal lotto: può fare quello che vuole
        const mosso = !uguale(p.mt, l.matrice(m));
        // (dentro un animale chi si muove lo trova `osserva`: qui basta sciogliere e aspettare)
        if (mosso && l.spazio && !(m.material !== p.mat || m.geometry !== p.geo || versione(m.geometry) !== p.ver || visibile(m, p.r) !== p.vis || coloreDi(p.mat) !== p.col)) { cambiato = true; continue; }
        if (m.material !== p.mat || m.geometry !== p.geo || versione(m.geometry) !== p.ver || mosso || visibile(m, p.r) !== p.vis || coloreDi(p.mat) !== p.col) {
          this.mobili.add(m);
          cambiato = true;
        }
      }
      if (cambiato) { this.sciogli(l); l.calma = 0; continue; }
      if (l.unito) continue;
      if (l.calma === 0) this.fotografa(l);
      if (++l.calma < CALMA) continue;
      if (unitiOra >= 3) continue; // non tutti nello stesso fotogramma: niente scatti
      // controlla anche i pezzi nuovi (aggiunti mentre si aspettava)
      if (this.contaPezzi(l) !== l.pezzi.length) { l.calma = 0; continue; }
      this.unisci(l);
      unitiOra++;
    }
  }

  /** I pezzi di un lotto: nel mondo tutto quello che sta sotto le radici; dentro uno spazio, solo i figli diretti e i loro contorni. */
  private ognuno(l: Lotto, f: (m: THREE.Mesh, r: THREE.Object3D) => void) {
    for (const r of l.radici) {
      if (!l.spazio) { r.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.lottoUnito) f(o as THREE.Mesh, r); }); continue; }
      if ((r as THREE.Mesh).isMesh) f(r as THREE.Mesh, r);
      for (const c of r.children) if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material === matContorno) f(c as THREE.Mesh, r);
    }
  }

  private contaPezzi(l: Lotto) {
    let n = 0;
    this.ognuno(l, () => n++);
    return n;
  }

  /** Si ricorda com'è ogni pezzo adesso (per accorgersi di chi si muove). */
  private fotografa(l: Lotto) {
    l.pezzi = [];
    this.ognuno(l, (m, r) => {
      const mat = m.material as THREE.Material;
      l.pezzi.push({ m, r, mt: copia(l.matrice(m)), mat, geo: m.geometry, ver: versione(m.geometry), vis: visibile(m, r), col: coloreDi(mat) });
    });
  }

  private unisci(l: Lotto) {
    const gruppi = new Map<string, { mat: THREE.Material; pezzi: Pezzo[]; guscio: boolean; dipinto: boolean; ordine: number }>();
    for (const p of l.pezzi) {
      const m = p.m;
      if (!p.vis || this.mobili.has(m) || Array.isArray(m.material) || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) continue;
      if (m.geometry.morphAttributes && Object.keys(m.geometry.morphAttributes).length) continue;
      if (!m.frustumCulled || m.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) continue;
      const g = m.geometry;
      if (!g.attributes.position || !g.attributes.normal) continue;
      const guscio = m.material === matContorno;
      const dip = !guscio && dipingibile(m.material);
      const mat = dip ? materialeDipinto(m.material as THREE.MeshToonMaterial) : m.material;
      const attr = guscio || dip ? 'pn' : Object.keys(g.attributes).sort().join(',');
      const k = mat.uuid + '|' + attr + '|' + (g.index ? 'i' : 'n') + '|' + m.renderOrder;
      let v = gruppi.get(k);
      if (!v) gruppi.set(k, (v = { mat, pezzi: [], guscio, dipinto: dip, ordine: m.renderOrder }));
      v.pezzi.push(p);
    }
    const rel = new THREE.Matrix4();
    for (const { mat, pezzi, guscio, dipinto, ordine } of gruppi.values()) {
      if (pezzi.length < 2) continue;
      const geos = pezzi.map(({ m }) => {
        const g = m.geometry.clone();
        const tieni = guscio || dipinto ? ['position', 'normal'] : ['position', 'normal', 'uv', 'color'];
        for (const n of Object.keys(g.attributes)) if (!tieni.includes(n)) g.deleteAttribute(n);
        relativa(m, l.spazio, rel);
        g.applyMatrix4(rel);
        if (dipinto) {
          const c = (m.material as THREE.MeshToonMaterial).color;
          const n = g.attributes.position.count, a = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
          g.setAttribute('color', new THREE.BufferAttribute(a, 3));
        }
        // un pezzo specchiato va rigirato, altrimenti si vedrebbe "da dentro"
        if (rel.determinant() < 0) {
          if (g.index) {
            const a = g.index.array;
            for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; }
          } else {
            for (const nome of Object.keys(g.attributes)) {
              const at = g.attributes[nome], n = at.itemSize, arr = at.array;
              for (let i = 0; i < at.count; i += 3) for (let j = 0; j < n; j++) {
                const t = arr[(i + 1) * n + j]; arr[(i + 1) * n + j] = arr[(i + 2) * n + j]; arr[(i + 2) * n + j] = t;
              }
            }
          }
        }
        g.groups = [];
        return g;
      });
      let unita: THREE.BufferGeometry | null = null;
      try { unita = mergeGeometries(geos, false); } catch { unita = null; }
      geos.forEach((g) => g.dispose());
      if (!unita) continue;
      unita.computeBoundingSphere();
      const u = new THREE.Mesh(unita, mat);
      u.raycast = nessunTocco;
      u.renderOrder = ordine;
      u.userData.lottoUnito = true;
      u.userData.senzaContorno = true;
      if (guscio) {
        // i contorni uniti si spengono da lontano come gli altri (vedi contorniLontani in scena.ts)
        u.userData.lotto = { centro: unita.boundingSphere!.center.clone(), raggio: unita.boundingSphere!.radius, spazio: l.spazio };
        GUSCI.push(u);
      }
      if (l.spazio) l.spazio.add(u);
      else { u.matrixAutoUpdate = false; this.gruppo.add(u); }
      l.uniti.push(u);
      for (const { m } of pezzi) {
        m.layers.set(STRATO_LOTTI);
        m.userData.inLotto = true;
      }
    }
    l.unito = true;
  }

  private sciogli(l: Lotto) {
    if (!l.unito) return;
    for (const u of l.uniti) {
      u.removeFromParent();
      u.geometry.dispose();
      const i = GUSCI.indexOf(u);
      if (i >= 0) GUSCI.splice(i, 1);
    }
    l.uniti = [];
    for (const p of l.pezzi) {
      if (!p.m.userData.inLotto) continue;
      p.m.layers.set(0);
      delete p.m.userData.inLotto;
    }
    l.unito = false;
  }

  // ---------- chi si muove dentro un animale ----------
  private snodi = new WeakMap<THREE.Object3D, Float64Array>();
  private mossi = new WeakSet<THREE.Object3D>();

  /** A ogni fotogramma: si accorge di quali parti di un animale si muovono (zampe, testa, coda, occhi...). */
  osserva(radice: THREE.Object3D) {
    radice.traverse((o) => {
      if (o === radice || o.userData.lottoUnito || this.mossi.has(o)) return;
      const prima = this.snodi.get(o);
      if (!prima) this.snodi.set(o, copia(o.matrix));
      else if (!uguale(prima, o.matrix)) this.mossi.add(o);
    });
  }

  /**
   * I lotti dentro un animale: ogni pezzo fermo va con la parte che si muove più vicina sopra di lui
   * (le orecchie con la testa, i bottoni con il corpo, il corpo con tutto l'animale) e lì si unisce agli altri.
   */
  lottiDentro(radice: THREE.Object3D, out: Map<string, [THREE.Object3D, THREE.Object3D[]]>) {
    const giro = (o: THREE.Object3D, ancora: THREE.Object3D) => {
      for (const c of o.children) {
        if (c.userData.lottoUnito) continue;
        const mesh = (c as THREE.Mesh).isMesh && (c as THREE.Mesh).material !== matContorno;
        if (mesh && !this.mossi.has(c)) {
          const k = 'v:' + ancora.uuid;
          const v = out.get(k);
          if (v) v[1].push(c); else out.set(k, [ancora, [c]]);
        }
        giro(c, this.mossi.has(c) ? c : ancora);
      }
    };
    giro(radice, radice);
    for (const [k, v] of out) if (v[1].length < 2) out.delete(k);
  }

  /** Quanti disegni ha risparmiato (per le prove). */
  conta() {
    let lotti = 0, uniti = 0, pezzi = 0;
    for (const l of this.lotti.values()) if (l.unito) { lotti++; uniti += l.uniti.length; pezzi += l.pezzi.filter((p) => p.m.userData.inLotto).length; }
    return { lotti, uniti, pezzi, totali: this.lotti.size };
  }

  distruggi() {
    for (const l of this.lotti.values()) this.sciogli(l);
    this.lotti.clear();
  }
}
