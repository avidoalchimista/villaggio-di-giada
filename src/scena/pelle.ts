// La "pelle" degli animali: un corpo solo, liscio, come disegnato.
// Invece di accostare palle, ovali e tubi (che si incastrano e lasciano le giunture in vista),
// il corpo si descrive con delle "gocce" morbide che si fondono tra loro come creta; da lì si ricava
// UNA superficie sola. Ogni goccia sa a quale osso appartiene: così la pelle si piega alle giunture
// (spalle, ginocchia, coda) senza spezzarsi, e tutto l'animale si disegna in un colpo solo.
import * as THREE from 'three';

type V = [number, number, number];

export interface Goccia {
  /** 0 = cono tondo (da a con raggio ra a b con raggio rb), 1 = uovo (centro a, raggi r3) */
  tipo: 0 | 1;
  a: V; b: V; ra: number; rb: number;
  r3: V;
  /** rotazione dell'uovo (inversa, già pronta) */
  qi: THREE.Quaternion | null;
  osso: number;
  /** casella della tavolozza (-1: non colora) */
  colore: number;
  /** quanto si fonde con le altre (raggio del raccordo) */
  k: number;
}

export interface PelleFatta {
  pos: Float32Array;
  nor: Float32Array;
  idx: Uint32Array;
  ossa: Uint16Array; // 4 per vertice
  pesi: Float32Array; // 4 per vertice
  /** le due caselle di colore più vicine e quanto si mescolano (0..0.5) */
  ca: Uint8Array; cb: Uint8Array; ct: Float32Array;
}

const tmp = new THREE.Vector3();

function distCono(px: number, py: number, pz: number, g: Goccia): number {
  const ax = g.a[0], ay = g.a[1], az = g.a[2];
  const bax = g.b[0] - ax, bay = g.b[1] - ay, baz = g.b[2] - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  if (l2 < 1e-9) return Math.sqrt(pax * pax + pay * pay + paz * paz) - g.ra;
  const rr = g.ra - g.rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - g.rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - g.ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - g.ra;
}

function distUovo(px: number, py: number, pz: number, g: Goccia): number {
  let x = px - g.a[0], y = py - g.a[1], z = pz - g.a[2];
  if (g.qi) { tmp.set(x, y, z).applyQuaternion(g.qi); x = tmp.x; y = tmp.y; z = tmp.z; }
  const rx = g.r3[0], ry = g.r3[1], rz = g.r3[2];
  const ux = x / rx, uy = y / ry, uz = z / rz;
  const k0 = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (k0 < 1e-6) return -Math.min(rx, ry, rz);
  const vx = ux / rx, vy = uy / ry, vz = uz / rz;
  const k1 = Math.sqrt(vx * vx + vy * vy + vz * vz);
  return (k0 * (k0 - 1)) / k1;
}

export const distGoccia = (p: V | THREE.Vector3, g: Goccia) => {
  const [x, y, z] = Array.isArray(p) ? p : [p.x, p.y, p.z];
  return g.tipo === 0 ? distCono(x, y, z, g) : distUovo(x, y, z, g);
};

/** Una goccia da usare solo per dipingere o misurare (non entra nella forma). */
export function goccia(o: { a: V; b?: V; ra?: number; rb?: number; r3?: V; rot?: THREE.Euler }): Goccia {
  const uovo = !!o.r3;
  return {
    tipo: uovo ? 1 : 0, a: o.a, b: o.b ?? o.a, ra: o.ra ?? 0, rb: o.rb ?? o.ra ?? 0, r3: o.r3 ?? [1, 1, 1],
    qi: o.rot ? new THREE.Quaternion().setFromEuler(o.rot).invert() : null, osso: 0, colore: -1, k: 0,
  };
}

export class Scultura {
  gocce: Goccia[] = [];

  cono(a: V, b: V, ra: number, rb: number, osso: number, colore: number, k = 0.05) {
    this.gocce.push({ tipo: 0, a, b, ra, rb, r3: [1, 1, 1], qi: null, osso, colore, k });
    return this;
  }
  palla(c: V, r: number, osso: number, colore: number, k = 0.05) {
    return this.cono(c, c, r, r, osso, colore, k);
  }
  uovo(c: V, r3: V, osso: number, colore: number, k = 0.05, rot?: THREE.Euler) {
    this.gocce.push({ tipo: 1, a: c, b: c, ra: 0, rb: 0, r3, qi: rot ? new THREE.Quaternion().setFromEuler(rot).invert() : null, osso, colore, k });
    return this;
  }
  /** Una fila di coni tondi lungo dei punti (code, colli): [x, y, z, raggio]. */
  catena(punti: [number, number, number, number][], ossa: number | number[], colore: number | number[], k = 0.05) {
    for (let i = 0; i < punti.length - 1; i++) {
      const p = punti[i], q = punti[i + 1];
      const o = Array.isArray(ossa) ? ossa[Math.min(ossa.length - 1, i)] : ossa;
      const c = Array.isArray(colore) ? colore[Math.min(colore.length - 1, i)] : colore;
      this.cono([p[0], p[1], p[2]], [q[0], q[1], q[2]], p[3], q[3], o, c, k);
    }
    return this;
  }

  private centri: Float32Array | null = null; // x, y, z, raggio che la contiene
  private prepara() {
    const n = this.gocce.length;
    this.dTutte = new Float32Array(n);
    const centri = (this.centri = new Float32Array(n * 4));
    this.gocce.forEach((g, i) => {
      if (g.tipo === 0) {
        const cx = (g.a[0] + g.b[0]) / 2, cy = (g.a[1] + g.b[1]) / 2, cz = (g.a[2] + g.b[2]) / 2;
        const l = Math.hypot(g.a[0] - g.b[0], g.a[1] - g.b[1], g.a[2] - g.b[2]) / 2;
        centri.set([cx, cy, cz, l + Math.max(g.ra, g.rb)], i * 4);
      } else centri.set([g.a[0], g.a[1], g.a[2], Math.max(...g.r3)], i * 4);
    });
  }

  dTutte!: Float32Array;
  /** La distanza dalla pelle (negativa dentro). Se `tutte`, lascia in dTutte la distanza da ogni goccia. */
  dist(px: number, py: number, pz: number, tutte = false): number {
    if (!this.centri) this.prepara();
    const gs = this.gocce, c = this.centri!;
    let d = 1e9;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      // lontana: non conta (e non si calcola)
      const dx = px - c[i * 4], dy = py - c[i * 4 + 1], dz = pz - c[i * 4 + 2];
      const lim = c[i * 4 + 3] + g.k + 0.3;
      if (dx * dx + dy * dy + dz * dz > lim * lim) {
        if (tutte) this.dTutte[i] = 1e9;
        continue;
      }
      const di = g.tipo === 0 ? distCono(px, py, pz, g) : distUovo(px, py, pz, g);
      if (tutte) this.dTutte[i] = di;
      const k = g.k;
      const h = Math.max(k - Math.abs(d - di), 0) / k;
      d = Math.min(d, di) - h * h * k * 0.25;
    }
    return d;
  }

  /** La casella di colore della goccia più vicina. */
  casella(px: number, py: number, pz: number): number {
    this.dist(px, py, pz, true);
    let c = 0, dm = 1e9;
    for (let k = 0; k < this.gocce.length; k++) if (this.gocce[k].colore >= 0 && this.dTutte[k] < dm) { dm = this.dTutte[k]; c = this.gocce[k].colore; }
    return c;
  }

  /** A quali ossa è attaccato un punto della pelle (le quattro più vicine, con quanto pesa ognuna). */
  legami(px: number, py: number, pz: number): { ossa: number[]; pesi: number[] } {
    this.dist(px, py, pz, true);
    const d = this.dTutte, gs = this.gocce;
    let dmin = 1e9;
    for (let k = 0; k < gs.length; k++) if (d[k] < dmin) dmin = d[k];
    const per = new Map<number, number>();
    for (let k = 0; k < gs.length; k++) {
      if (d[k] > 1e8) continue;
      const w = Math.exp(-(d[k] - dmin) / 0.028);
      if (w > 0.02) per.set(gs[k].osso, Math.max(per.get(gs[k].osso) ?? 0, w));
    }
    const ord = [...per.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
    const tot = ord.reduce((s, o) => s + o[1], 0) || 1;
    const ossa = [0, 0, 0, 0], pesi = [0, 0, 0, 0];
    ord.forEach(([o, w], k) => { ossa[k] = o; pesi[k] = w / tot; });
    return { ossa, pesi };
  }

  /** La stessa forma, gonfiata di un po' (per i vestiti, che stanno appena sopra la pelle). */
  gonfia(di: number, quali: (g: Goccia) => boolean): Scultura {
    const s = new Scultura();
    for (const g of this.gocce) if (quali(g)) s.gocce.push({ ...g, ra: g.ra + di, rb: g.rb + di, r3: g.tipo === 1 ? [g.r3[0] + di, g.r3[1] + di, g.r3[2] + di] : g.r3 });
    return s;
  }

  /** Dove un raggio tocca la pelle (per appoggiarci occhi, nei, bottoni) e come è girata lì. */
  tocca(o: THREE.Vector3, d: THREE.Vector3, max = 4): { p: THREE.Vector3; n: THREE.Vector3 } | null {
    let t = 0;
    const p = new THREE.Vector3();
    for (let i = 0; i < 160 && t < max; i++) {
      p.copy(o).addScaledVector(d, t);
      const v = this.dist(p.x, p.y, p.z);
      if (v < 0.0015) {
        const e = 0.01;
        const n = new THREE.Vector3(
          this.dist(p.x + e, p.y, p.z) - this.dist(p.x - e, p.y, p.z),
          this.dist(p.x, p.y + e, p.z) - this.dist(p.x, p.y - e, p.z),
          this.dist(p.x, p.y, p.z + e) - this.dist(p.x, p.y, p.z - e)).normalize();
        return { p, n };
      }
      t += Math.min(0.12, Math.max(v * 0.7, 0.003));
    }
    return null;
  }

  /** Ricava la superficie (reti di superficie: un vertice per cella attraversata, facce a quadrati). */
  costruisci(cella: number): PelleFatta {
    this.prepara();
    const gs = this.gocce;
    const centri = this.centri!;
    const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    for (let i = 0; i < gs.length; i++) for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], centri[i * 4 + a] - centri[i * 4 + 3]);
      max[a] = Math.max(max[a], centri[i * 4 + a] + centri[i * 4 + 3]);
    }
    const m = cella * 2;
    const nx = Math.ceil((max[0] - min[0] + m * 2) / cella) + 1;
    const ny = Math.ceil((max[1] - min[1] + m * 2) / cella) + 1;
    const nz = Math.ceil((max[2] - min[2] + m * 2) / cella) + 1;
    const ox = min[0] - m, oy = min[1] - m, oz = min[2] - m;
    const val = new Float32Array(nx * ny * nz);
    // a blocchi: dove la pelle è lontana non si calcola punto per punto
    const B = 4;
    for (let bz = 0; bz < nz; bz += B) for (let by = 0; by < ny; by += B) for (let bx = 0; bx < nx; bx += B) {
      const cx = ox + (bx + (B - 1) / 2) * cella, cy = oy + (by + (B - 1) / 2) * cella, cz = oz + (bz + (B - 1) / 2) * cella;
      const dc = this.dist(cx, cy, cz);
      const lontano = Math.abs(dc) > B * cella * 1.6 + 0.02;
      for (let z = bz; z < Math.min(nz, bz + B); z++) for (let y = by; y < Math.min(ny, by + B); y++) for (let x = bx; x < Math.min(nx, bx + B); x++) {
        val[x + nx * (y + ny * z)] = lontano ? dc : this.dist(ox + x * cella, oy + y * cella, oz + z * cella);
      }
    }
    const vIdx = new Int32Array(nx * ny * nz).fill(-1);
    const pos: number[] = [];
    const at = (x: number, y: number, z: number) => val[x + nx * (y + ny * z)];
    const SPIGOLI = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const c8 = new Float32Array(8);
    for (let z = 0; z < nz - 1; z++) for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
      let maschera = 0;
      for (let i = 0; i < 8; i++) {
        const v = at(x + (i & 1), y + ((i >> 1) & 1), z + ((i >> 2) & 1));
        c8[i] = v;
        if (v < 0) maschera |= 1 << i;
      }
      if (maschera === 0 || maschera === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of SPIGOLI) {
        if (((maschera >> a) & 1) === ((maschera >> b) & 1)) continue;
        const t = c8[a] / (c8[a] - c8[b]);
        sx += (a & 1) + ((b & 1) - (a & 1)) * t;
        sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
        sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
        n++;
      }
      vIdx[x + nx * (y + ny * z)] = pos.length / 3;
      pos.push(ox + (x + sx / n) * cella, oy + (y + sy / n) * cella, oz + (z + sz / n) * cella);
    }
    const idx: number[] = [];
    const quad = (a: number, b: number, c: number, d: number, gira: boolean) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (gira) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d);
    };
    const vi = (x: number, y: number, z: number) => vIdx[x + nx * (y + ny * z)];
    for (let z = 1; z < nz - 1; z++) for (let y = 1; y < ny - 1; y++) for (let x = 1; x < nx - 1; x++) {
      const d0 = at(x, y, z) < 0;
      if (d0 !== at(x + 1, y, z) < 0) quad(vi(x, y - 1, z - 1), vi(x, y, z - 1), vi(x, y, z), vi(x, y - 1, z), !d0);
      if (d0 !== at(x, y + 1, z) < 0) quad(vi(x - 1, y, z - 1), vi(x - 1, y, z), vi(x, y, z), vi(x, y, z - 1), !d0);
      if (d0 !== at(x, y, z + 1) < 0) quad(vi(x - 1, y - 1, z), vi(x, y - 1, z), vi(x, y, z), vi(x - 1, y, z), !d0);
    }

    // per ogni vertice: la normale (dalla forma stessa: liscia), a quali ossa è attaccato e di che colore è
    const nv = pos.length / 3;
    const nor = new Float32Array(nv * 3);
    const ossa = new Uint16Array(nv * 4), pesi = new Float32Array(nv * 4);
    const ca = new Uint8Array(nv), cb = new Uint8Array(nv), ct = new Float32Array(nv);
    const e = cella * 0.5;
    const perOsso = new Map<number, number>();
    for (let i = 0; i < nv; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const gx = this.dist(x + e, y, z) - this.dist(x - e, y, z);
      const gy = this.dist(x, y + e, z) - this.dist(x, y - e, z);
      const gz = this.dist(x, y, z + e) - this.dist(x, y, z - e);
      const gl = Math.hypot(gx, gy, gz) || 1;
      nor[i * 3] = gx / gl; nor[i * 3 + 1] = gy / gl; nor[i * 3 + 2] = gz / gl;
      this.dist(x, y, z, true);
      const d = this.dTutte;
      let dmin = 1e9;
      for (let k = 0; k < gs.length; k++) if (d[k] < dmin) dmin = d[k];
      perOsso.clear();
      let c1 = -1, c2 = -1, d1 = 1e9, d2 = 1e9;
      for (let k = 0; k < gs.length; k++) {
        if (d[k] > 1e8) continue;
        const w = Math.exp(-(d[k] - dmin) / 0.028);
        if (w > 0.02) perOsso.set(gs[k].osso, Math.max(perOsso.get(gs[k].osso) ?? 0, w));
        const col = gs[k].colore;
        if (col < 0) continue;
        if (d[k] < d1) { if (c1 !== col) { c2 = c1; d2 = d1; } c1 = col; d1 = d[k]; }
        else if (d[k] < d2 && col !== c1) { c2 = col; d2 = d[k]; }
      }
      const ord = [...perOsso.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4);
      const tot = ord.reduce((s, o) => s + o[1], 0) || 1;
      ord.forEach(([o, w], k) => { ossa[i * 4 + k] = o; pesi[i * 4 + k] = w / tot; });
      ca[i] = Math.max(0, c1); cb[i] = c2 < 0 ? Math.max(0, c1) : c2;
      const wb = c2 < 0 ? 0 : Math.exp(-(d2 - d1) / 0.012);
      ct[i] = wb / (1 + wb);
    }
    return { pos: new Float32Array(pos), nor, idx: new Uint32Array(idx), ossa, pesi, ca, cb, ct };
  }
}

// ---------- mettere insieme la pelle e i pezzi aggiunti (orecchie, occhi, corna...) in una sola forma ----------

export type Pittore = (p: THREE.Vector3, base: THREE.Color) => void;

export class Assemblaggio {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private ossa: number[] = [];
  private pesi: number[] = [];
  private conContorno: number[] = [];
  private senza: number[] = [];
  private v = new THREE.Vector3();
  private c = new THREE.Color();

  get vertici() { return this.pos.length / 3; }

  /** La pelle: i colori vengono dalla tavolozza dell'animale, poi ci passa sopra il pittore (macchie, pancia chiara...). */
  pelle(f: PelleFatta, tavolozza: THREE.Color[], pittore?: Pittore) {
    const base = this.vertici;
    const nv = f.pos.length / 3;
    for (let i = 0; i < nv; i++) {
      this.pos.push(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]);
      this.nor.push(f.nor[i * 3], f.nor[i * 3 + 1], f.nor[i * 3 + 2]);
      this.c.copy(tavolozza[f.ca[i]]).lerp(tavolozza[f.cb[i]], f.ct[i]);
      if (pittore) pittore(this.v.set(f.pos[i * 3], f.pos[i * 3 + 1], f.pos[i * 3 + 2]), this.c);
      this.col.push(this.c.r, this.c.g, this.c.b);
      for (let k = 0; k < 4; k++) { this.ossa.push(f.ossa[i * 4 + k]); this.pesi.push(f.pesi[i * 4 + k]); }
    }
    for (let i = 0; i < f.idx.length; i++) this.conContorno.push(base + f.idx[i]);
  }

  /**
   * Un pezzo fatto a parte (un orecchio, un occhio, un corno): entra nella stessa forma, attaccato a un osso.
   * `peso`: per i pezzi che si stirano tra due ossa (le palpebre): quanto ogni vertice segue il secondo osso.
   */
  pezzo(g: THREE.BufferGeometry, m: THREE.Matrix4, colore: THREE.Color | ((p: THREE.Vector3, c: THREE.Color) => void), osso: number,
    opz: { contorno?: boolean; osso2?: number; peso?: (locale: THREE.Vector3) => number } = {}) {
    const base = this.vertici;
    const p = g.attributes.position, n = g.attributes.normal, suoi = g.attributes.color;
    const mn = new THREE.Matrix3().getNormalMatrix(m);
    const gira = m.determinant() < 0;
    const loc = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      loc.fromBufferAttribute(p, i);
      const w2 = opz.peso ? THREE.MathUtils.clamp(opz.peso(loc), 0, 1) : 0;
      this.v.copy(loc).applyMatrix4(m);
      this.pos.push(this.v.x, this.v.y, this.v.z);
      if (suoi) this.c.fromBufferAttribute(suoi as THREE.BufferAttribute, i);
      else if (typeof colore === 'function') { this.c.setRGB(1, 1, 1); colore(this.v, this.c); } else this.c.copy(colore);
      this.col.push(this.c.r, this.c.g, this.c.b);
      this.v.fromBufferAttribute(n, i).applyMatrix3(mn).normalize();
      this.nor.push(this.v.x, this.v.y, this.v.z);
      this.ossa.push(osso, opz.osso2 ?? 0, 0, 0);
      this.pesi.push(1 - w2, w2, 0, 0);
    }
    const dove = opz.contorno ? this.conContorno : this.senza;
    const ix = g.index;
    const quanti = ix ? ix.count : p.count;
    for (let i = 0; i < quanti; i += 3) {
      const a = base + (ix ? ix.getX(i) : i), b = base + (ix ? ix.getX(i + 1) : i + 1), c = base + (ix ? ix.getX(i + 2) : i + 2);
      if (gira) dove.push(a, c, b); else dove.push(a, b, c);
    }
    g.dispose();
  }

  /** La forma finita e, a parte, quella del contorno scuro (stessi vertici, solo le facce che lo vogliono). */
  finisci(): { forma: THREE.BufferGeometry; contorno: THREE.BufferGeometry } {
    const forma = new THREE.BufferGeometry();
    forma.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    forma.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    forma.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    forma.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.ossa, 4));
    forma.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.pesi, 4));
    forma.setIndex([...this.conContorno, ...this.senza]);
    const contorno = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) contorno.setAttribute(k, forma.attributes[k]);
    contorno.setIndex(this.conContorno);
    return { forma, contorno };
  }
}
