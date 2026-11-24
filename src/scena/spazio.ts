// Lo spazio del villaggio visto dall'alto: ogni cosa ferma ha la sua "impronta" per terra
// (un cerchio o un rettangolo girato), ogni animale è una capsula lunga quanto il suo corpo.
// Serve a due cose: gli animali non entrano nelle cose (né l'uno nell'altro), e le cose
// non si mettono una dentro l'altra.
import * as THREE from 'three';

export type Impronta =
  | { tipo: 'cerchio'; x: number; z: number; r: number; chi?: string; nome?: string; soloPosto?: boolean }
  | { tipo: 'scatola'; x: number; z: number; hx: number; hz: number; rot: number; chi?: string; nome?: string; soloPosto?: boolean };

const _m = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _b = new THREE.Box3();

/**
 * Il rettangolo per terra delle parti di `o` che toccano il suolo (che cominciano sotto `quota`),
 * nel sistema dell'oggetto senza la sua rotazione: [minX, maxX, minZ, maxZ], in metri del mondo.
 * Le chiome degli alberi e i tetti sporgenti non contano (ci si passa sotto), i dischi piatti nemmeno.
 */
export function rettangoloAlSuolo(o: THREE.Object3D, quota = 0.9): [number, number, number, number] | null {
  // il sistema dell'oggetto con la sola rotazione intorno all'asse verticale (la scala resta nelle misure)
  const w = postoNelMondo(o);
  o.updateMatrixWorld(true);
  _inv.makeRotationY(w.rot).setPosition(w.x, 0, w.z).invert();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  o.traverse((ch) => {
    if (!(ch instanceof THREE.Mesh) || ch instanceof THREE.Sprite) return;
    let p: THREE.Object3D | null = ch;
    // le parti nascoste, e quelle che hanno un'impronta loro (gli attrezzi davanti alle case), non contano
    while (p && p !== o) { if (!p.visible || p.userData.nonIngombra || p.userData.spazio) return; p = p.parent; }
    const g = ch.geometry as THREE.BufferGeometry;
    if (!g.boundingBox) g.computeBoundingBox();
    _m.multiplyMatrices(_inv, ch.matrixWorld);
    _b.copy(g.boundingBox!).applyMatrix4(_m);
    if (_b.min.y > quota) return; // in alto: chiome, tetti, insegne
    if (_b.max.y - _b.min.y < 0.03) return; // per terra e piatto: tappeti, ombre, terriccio
    minX = Math.min(minX, _b.min.x); maxX = Math.max(maxX, _b.max.x);
    minZ = Math.min(minZ, _b.min.z); maxZ = Math.max(maxZ, _b.max.z);
  });
  return minX < Infinity ? [minX, maxX, minZ, maxZ] : null;
}

const _pos = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

/** Posizione e rotazione (intorno alla verticale) di un oggetto nel mondo. */
export function postoNelMondo(o: THREE.Object3D): { x: number; z: number; rot: number; scala: number } {
  o.updateWorldMatrix(true, false);
  o.matrixWorld.decompose(_pos, _q, _s);
  return { x: _pos.x, z: _pos.z, rot: _e.setFromQuaternion(_q, 'YXZ').y, scala: _s.x };
}

/** L'impronta di una cosa ferma: un cerchio se è tonda, un rettangolo girato se è lunga. */
export function improntaDi(o: THREE.Object3D, opz: { quota?: number; tonda?: boolean; margine?: number; nome?: string } = {}): Impronta | null {
  const w = postoNelMondo(o);
  const chiave = 'impronta|' + (opz.quota ?? 0.9) + '|' + w.scala.toFixed(2);
  let loc = o.userData[chiave] as { cx: number; cz: number; hx: number; hz: number } | null | undefined;
  if (loc === undefined) {
    const r = rettangoloAlSuolo(o, opz.quota);
    loc = r ? { cx: (r[0] + r[1]) / 2, cz: (r[2] + r[3]) / 2, hx: (r[1] - r[0]) / 2, hz: (r[3] - r[2]) / 2 } : null;
    o.userData[chiave] = loc;
  }
  if (!loc) return null;
  const m = opz.margine ?? 0;
  const c = Math.cos(w.rot), s = Math.sin(w.rot);
  // il centro del rettangolo girato con l'oggetto (rotazione intorno a y: x' = x c + z s, z' = -x s + z c)
  const x = w.x + loc.cx * c + loc.cz * s, z = w.z - loc.cx * s + loc.cz * c;
  const hx = loc.hx + m, hz = loc.hz + m;
  const lungo = Math.max(hx, hz), corto = Math.min(hx, hz);
  if (opz.tonda || lungo < corto * 1.35) return { tipo: 'cerchio', x, z, r: opz.tonda ? lungo : (hx + hz) / 2, nome: opz.nome };
  return { tipo: 'scatola', x, z, hx, hz, rot: w.rot, nome: opz.nome };
}

/**
 * Di quanto un cerchio (px, pz, r) entra in un'impronta, e verso dove spingerlo fuori.
 * Restituisce null se non si toccano.
 */
export function spintaFuori(px: number, pz: number, r: number, o: Impronta): { x: number; z: number; d: number } | null {
  if (o.tipo === 'cerchio') {
    const dx = px - o.x, dz = pz - o.z, d = Math.hypot(dx, dz), R = o.r + r;
    if (d >= R) return null;
    if (d < 1e-4) return { x: 1, z: 0, d: R };
    return { x: dx / d, z: dz / d, d: R - d };
  }
  // nel sistema del rettangolo
  const c = Math.cos(o.rot), s = Math.sin(o.rot);
  const dx = px - o.x, dz = pz - o.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  const qx = THREE.MathUtils.clamp(lx, -o.hx, o.hx), qz = THREE.MathUtils.clamp(lz, -o.hz, o.hz);
  let nx: number, nz: number, d: number;
  if (qx === lx && qz === lz) {
    // il centro è dentro: esce dal lato più vicino
    const ex = o.hx - Math.abs(lx), ez = o.hz - Math.abs(lz);
    if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; d = ex + r; }
    else { nx = 0; nz = Math.sign(lz) || 1; d = ez + r; }
  } else {
    const ox = lx - qx, oz = lz - qz, l = Math.hypot(ox, oz);
    if (l >= r) return null;
    nx = ox / l; nz = oz / l; d = r - l;
  }
  // di nuovo nel mondo
  return { x: nx * c + nz * s, z: -nx * s + nz * c, d };
}

/** Distanza (con segno: negativa se si sovrappongono) tra due impronte. Per i rettangoli usa i lati. */
export function sovrapposte(a: Impronta, b: Impronta, margine = 0): boolean {
  if (a.tipo === 'cerchio') return !!spintaFuori(a.x, a.z, a.r + margine, b);
  if (b.tipo === 'cerchio') return !!spintaFuori(b.x, b.z, b.r + margine, a);
  // due rettangoli: assi separatori (i 4 lati)
  const assi = [a.rot, a.rot + Math.PI / 2, b.rot, b.rot + Math.PI / 2];
  for (const ang of assi) {
    const ax = Math.cos(ang), az = -Math.sin(ang);
    const proietta = (o: Extract<Impronta, { tipo: 'scatola' }>) => {
      const c = Math.cos(o.rot), s = Math.sin(o.rot);
      // gli assi del rettangolo nel mondo
      const ux = c, uz = -s, vx = s, vz = c;
      const centro = o.x * ax + o.z * az;
      const raggio = Math.abs(ux * ax + uz * az) * o.hx + Math.abs(vx * ax + vz * az) * o.hz;
      return [centro - raggio, centro + raggio];
    };
    const [a0, a1] = proietta(a), [b0, b1] = proietta(b);
    if (a1 + margine <= b0 || b1 + margine <= a0) return false;
  }
  return true;
}

/** Il raggio di un'impronta, per i controlli veloci. */
export function raggioDi(o: Impronta): number {
  return o.tipo === 'cerchio' ? o.r : Math.hypot(o.hx, o.hz);
}

/** Un animale visto dall'alto: una capsula lungo la direzione in cui guarda. */
export interface Capsula { x: number; z: number; dx: number; dz: number; mezza: number; r: number }

/** I tre punti (davanti, in mezzo, dietro) con cui una capsula si controlla contro le cose. */
export function puntiCapsula(c: Capsula): [number, number][] {
  if (c.mezza < 0.05) return [[c.x, c.z]];
  return [[c.x + c.dx * c.mezza, c.z + c.dz * c.mezza], [c.x, c.z], [c.x - c.dx * c.mezza, c.z - c.dz * c.mezza]];
}

/** Il punto più vicino tra due segmenti (le spine di due capsule): restituisce i due punti. */
export function piuViciniCapsule(a: Capsula, b: Capsula): [number, number, number, number] {
  const p1x = a.x - a.dx * a.mezza, p1z = a.z - a.dz * a.mezza;
  const d1x = a.dx * a.mezza * 2, d1z = a.dz * a.mezza * 2;
  const p2x = b.x - b.dx * b.mezza, p2z = b.z - b.dz * b.mezza;
  const d2x = b.dx * b.mezza * 2, d2z = b.dz * b.mezza * 2;
  const rx = p1x - p2x, rz = p1z - p2z;
  const A = d1x * d1x + d1z * d1z, E = d2x * d2x + d2z * d2z, F = d2x * rx + d2z * rz;
  let s = 0, t = 0;
  if (A < 1e-8 && E < 1e-8) { s = 0; t = 0; }
  else if (A < 1e-8) { s = 0; t = THREE.MathUtils.clamp(F / E, 0, 1); }
  else {
    const C = d1x * rx + d1z * rz;
    if (E < 1e-8) { t = 0; s = THREE.MathUtils.clamp(-C / A, 0, 1); }
    else {
      const B = d1x * d2x + d1z * d2z, den = A * E - B * B;
      s = den > 1e-8 ? THREE.MathUtils.clamp((B * F - C * E) / den, 0, 1) : 0;
      t = (B * s + F) / E;
      if (t < 0) { t = 0; s = THREE.MathUtils.clamp(-C / A, 0, 1); }
      else if (t > 1) { t = 1; s = THREE.MathUtils.clamp((B - C) / A, 0, 1); }
    }
  }
  return [p1x + d1x * s, p1z + d1z * s, p2x + d2x * t, p2z + d2z * t];
}
