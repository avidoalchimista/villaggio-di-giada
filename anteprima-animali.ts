// Pagina di prova (non nel gioco): griglia di animali per confrontare i modelli.
import * as THREE from 'three';
import { creaAnimale, creaCasaAnimale, posa } from './src/scena/modelli';
import { CURVA } from './src/scena/ps1';
import { TRATTI } from './src/lib/gioco';
import { SPECIE, VIRTU } from './src/lib/tipi';
import { aggiornaGuardaroba } from './src/lib/vestiti';
import { MESTIERI } from './src/lib/mestieri';
import { EMOZIONI } from './src/lib/tipi';
CURVA.valore = 0;
const q = new URLSearchParams(location.search);
const modo = q.get('modo') ?? 'specie'; // specie | tratti | tasso
const W = +(q.get('w') ?? 1600), H = +(q.get('h') ?? 1000);
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true });
r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor('#cfe8c4');
const sc = new THREE.Scene();
sc.add(new THREE.HemisphereLight('#bfe0ff', '#c9a27a', 1.3));
const sole = new THREE.DirectionalLight('#fff1d6', 2); sole.position.set(3, 5, 4); sc.add(sole);
type Cella = { etichetta?: string; mestiere?: string; divisa?: boolean; id?: string; vestiti?: string[]; specie: any; fase: string; sesso: 'f' | 'm'; manto: number; tratto: string; forma?: number; occhi?: number; orecchie?: number; lato?: number };
const celle: Cella[] = [];
const tr = (i: number) => TRATTI[i % TRATTI.length];
if (modo === 'specie') {
  SPECIE.forEach((s, i) => {
    celle.push({ specie: s, fase: 'cucciolo', sesso: 'f', manto: 0, tratto: '-' });
    celle.push({ specie: s, fase: 'adulto', sesso: 'm', manto: 0, tratto: '-' });
  });
} else if (modo === 'adulti') {
  // una specie per cella, grande: per confrontare le sagome (s=elenco, fase=cucciolo|adulto)
  const elenco = (q.get('s') ?? SPECIE.join(',')).split(',');
  elenco.forEach((s, i) => celle.push({ specie: s, fase: q.get('fase') ?? 'adulto', sesso: i % 2 ? 'f' : 'm', manto: +(q.get('manto') ?? 0), tratto: '-' }));
} else if (modo === 'tasso') {
  const sp = q.get('s') ?? 'tasso';
  for (let m = 0; m < 4; m++) celle.push({ specie: sp, fase: 'cucciolo', sesso: m % 2 ? 'm' : 'f', manto: m, tratto: '-' });
  for (let m = 0; m < 4; m++) celle.push({ specie: sp, fase: 'adulto', sesso: m % 2 ? 'f' : 'm', manto: m, tratto: '-' });
} else if (modo === 'vestiti') {
  // vestiti fatti da soli: animali diversi, ognuno coi suoi gusti (stesso carattere, combinazioni diverse)
  const n = +(q.get('n') ?? 18);
  for (let i = 0; i < n; i++) {
    const a: any = { id: 'v' + i + (q.get('seme') ?? ''), fase: 'adulto', xp: 300, nutrimento: { coraggio: (i * 7) % 6, umanita: (i * 5) % 7, saggezza: (i * 3) % 5, giustizia: i % 4, temperanza: (i * 11) % 6, trascendenza: (i * 13) % 7 } };
    aggiornaGuardaroba(a);
    celle.push({ specie: SPECIE[i % SPECIE.length], fase: 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: '-', vestiti: a.vestiti, id: a.id });
  }
} else if (modo === 'mestieri') {
  // ogni mestiere con la sua divisa e l'attrezzo in mano
  const da = +(q.get('da') ?? 0), quanti = +(q.get('n') ?? 12);
  MESTIERI.slice(da, da + quanti).forEach((m, i) => celle.push({ specie: SPECIE[(i + da) % SPECIE.length], fase: 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: '-', mestiere: m.id, divisa: true, etichetta: i % 2 ? m.m : m.f }));
} else if (modo === 'scelti') {
  for (const v of (q.get('t') ?? '').split(',')) { const i = +v; celle.push({ specie: SPECIE[i % SPECIE.length], fase: i % 3 ? 'cucciolo' : 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: tr(i), lato: 1, etichetta: tr(i) }); }
} else if (modo === 'tratti') {
  const da = +(q.get('da') ?? 0);
  for (let i = da; i < Math.min(TRATTI.length, da + 16); i++) celle.push({ specie: SPECIE[i % SPECIE.length], fase: i % 3 ? 'cucciolo' : 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: tr(i), lato: 1, etichetta: tr(i) });
}
const cols = modo === 'adulti' ? +(q.get('c') ?? 4) : modo === 'mestieri' ? 6 : modo === 'vestiti' ? 6 : modo === 'specie' ? 6 : modo === 'tratti' ? 8 : 4;

const rows = Math.ceil(celle.length / cols);
const etichette: { testo: string; x: number; y: number }[] = [];
const passo = +(q.get('passo') ?? 2.0);
celle.forEach((c, i) => {
  const col = modo === 'specie' ? Math.floor(i / 2) : i % cols;
  const row = modo === 'specie' ? i % 2 : Math.floor(i / cols);
  const a: any = { vestiti: c.vestiti ?? [], xp: 0, id: c.id ?? 'a' + i, nome: '', specie: c.specie, sesso: c.sesso, fase: c.fase, mestiere: c.mestiere ?? null,
    aspetto: { manto: c.manto, tratto: c.tratto, forma: c.forma ?? 0, occhi: c.occhi ?? 0.5, orecchie: c.orecchie ?? 0.5, taglia: 1, lato: c.lato ?? 1 } };
  const m = creaAnimale(a, !!c.divisa);
  if (m.accessorio) m.accessorio.visible = true;
  if (c.divisa) { m.zampe[0].rotation.x = -1.0; }
  // a quattro zampe come gli animali veri; in piedi (e=1) solo per lavorare (o con ?e=1)
  const e = c.divisa ? 1 : +(q.get('e') ?? 0);
  posa(m, e);
  m.gruppo.scale.setScalar((c.fase === 'cucciolo' ? 1.15 : 1.28) * (m.gruppo.userData.taglia ?? 1));
  m.gruppo.position.set((col - (cols - 1) / 2) * passo, 0, -row * passo * 1.0 + 0);
  m.gruppo.position.y = -row * (modo === 'specie' || modo === 'vestiti' || modo === 'mestieri' ? 3.1 : 2.6);
  if (c.etichetta) etichette.push({ testo: c.etichetta, x: m.gruppo.position.x, y: m.gruppo.position.y - 0.25 });
  m.gruppo.position.z = 0;
  m.gruppo.rotation.y = +(q.get('rot') ?? 0.9);
  sc.add(m.gruppo);
});
if (modo === 'case') {
  // le case dei mestieri, viste da davanti e un po' dall'alto
  const da = +(q.get('da') ?? 0), quanti = +(q.get('n') ?? 6), colonne = +(q.get('c') ?? 3);
  const specie = q.get('s')?.split(',') ?? ['volpe', 'daino', 'tasso', 'riccio', 'scoiattolo', 'lepre'];
  // modo=case&livelli=1: ogni riga è una casa, da sinistra a destra i 4 livelli di miglioria (vedi lib/migliorie.ts)
  const livelli = q.has('livelli');
  const quali = livelli
    ? MESTIERI.slice(da, da + quanti / 4).flatMap((m) => [1, 2, 3, 4].map((l) => ({ m, l })))
    : MESTIERI.slice(da, da + quanti).map((m) => ({ m, l: +(q.get('livello') ?? 1) }));
  quali.forEach(({ m, l }, i) => {
    const k = livelli ? Math.floor(i / 4) : i;
    const casa = creaCasaAnimale(specie[(k + da) % specie.length] as any, EMOZIONI[(k + da) % 8], 'adulto', q.get('senza') ? null : m.id, l);
    const col = i % colonne, row = Math.floor(i / colonne);
    const passo = +(q.get('passo') ?? 6.6);
    casa.position.set((col - (colonne - 1) / 2) * passo, 0, row * 6.2);
    sc.add(casa);
  });
  const terra = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: '#8cc06a' }));
  terra.rotation.x = -Math.PI / 2;
  sc.add(terra);
  const righe = Math.ceil(quali.length / colonne);
  const cam = new THREE.PerspectiveCamera(34, W / H, 0.1, 200);
  const lontano = +(q.get('lontano') ?? 1);
  cam.position.set(0, (7 + righe * 2.2) * lontano, ((righe - 1) * 6.2 + 11) * lontano);
  cam.lookAt(0, 0.6, (righe - 1) * 3.1);
  r.render(sc, cam);
  (window as any).pronto = true;
  throw new Error('fatto');
}
const box = new THREE.Box3().setFromObject(sc);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
let hw = (box.max.x - box.min.x) / 2 + 0.3, hh = (box.max.y - box.min.y) / 2 + 0.3;
if (hw / hh > W / H) hh = hw * H / W; else hw = hh * W / H;
cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
cam.position.set(cx, cy, 10); cam.lookAt(cx, cy, 0); cam.updateProjectionMatrix();
r.render(sc, cam);
for (const e of etichette) {
  const v = new THREE.Vector3(e.x, e.y, 0).project(cam);
  const d = document.createElement('div');
  d.textContent = e.testo;
  d.style.cssText = `position:absolute;left:${(v.x + 1) / 2 * W}px;top:${(1 - v.y) / 2 * H}px;transform:translate(-50%,0);font:700 22px sans-serif;color:#3b2616;background:#fff8e7;padding:2px 10px;border-radius:10px`;
  document.body.appendChild(d);
}
(window as any).pronto = true;
