// Pagina di prova (non nel gioco): griglia di animali per confrontare i modelli.
import * as THREE from 'three';
import { creaAnimale, posa } from './src/scena/modelli';
import { CURVA } from './src/scena/ps1';
import { TRATTI } from './src/lib/gioco';
import { SPECIE, VIRTU } from './src/lib/tipi';
import { CAPI } from './src/lib/vestiti';
CURVA.valore = 0;
const q = new URLSearchParams(location.search);
const modo = q.get('modo') ?? 'specie'; // specie | tratti | tasso
const W = +(q.get('w') ?? 1600), H = +(q.get('h') ?? 1000);
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c') as HTMLCanvasElement, antialias: true });
r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor('#cfe8c4');
const sc = new THREE.Scene();
sc.add(new THREE.HemisphereLight('#bfe0ff', '#c9a27a', 1.3));
const sole = new THREE.DirectionalLight('#fff1d6', 2); sole.position.set(3, 5, 4); sc.add(sole);
type Cella = { vestiti?: string[]; specie: any; fase: string; sesso: 'f' | 'm'; manto: number; tratto: string; forma?: number; occhi?: number; orecchie?: number; lato?: number };
const celle: Cella[] = [];
const tr = (i: number) => TRATTI[i % TRATTI.length];
if (modo === 'specie') {
  SPECIE.forEach((s, i) => {
    celle.push({ specie: s, fase: 'cucciolo', sesso: 'f', manto: 0, tratto: '-' });
    celle.push({ specie: s, fase: 'adulto', sesso: 'm', manto: 0, tratto: '-' });
  });
} else if (modo === 'tasso') {
  const sp = q.get('s') ?? 'tasso';
  for (let m = 0; m < 4; m++) celle.push({ specie: sp, fase: 'cucciolo', sesso: m % 2 ? 'm' : 'f', manto: m, tratto: '-' });
  for (let m = 0; m < 4; m++) celle.push({ specie: sp, fase: 'adulto', sesso: m % 2 ? 'f' : 'm', manto: m, tratto: '-' });
} else if (modo === 'vestiti') {
  // ogni carattere con i suoi 4 capi (sopra) e solo i primi 2 (sotto)
  VIRTU.forEach((v, i) => celle.push({ specie: SPECIE[i], fase: 'adulto', sesso: i % 2 ? 'm' : 'f', manto: 0, tratto: '-', vestiti: CAPI.filter((k) => k.virtu === v).map((k) => k.id) }));
  VIRTU.forEach((v, i) => celle.push({ specie: SPECIE[(i + 3) % 6], fase: 'giovane', sesso: i % 2 ? 'f' : 'm', manto: 1, tratto: '-', vestiti: CAPI.filter((k) => k.virtu === v).slice(0, 2).map((k) => k.id) }));
} else if (modo === 'scelti') {
  for (const v of (q.get('t') ?? '').split(',')) { const i = +v; celle.push({ specie: SPECIE[i % 6], fase: i % 3 ? 'cucciolo' : 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: tr(i), lato: 1 }); }
} else if (modo === 'tratti') {
  const da = +(q.get('da') ?? 0);
  for (let i = da; i < Math.min(TRATTI.length, da + 16); i++) celle.push({ specie: SPECIE[i % 6], fase: i % 3 ? 'cucciolo' : 'adulto', sesso: i % 2 ? 'm' : 'f', manto: i % 4, tratto: tr(i), lato: 1 });
}
const cols = modo === 'vestiti' ? 6 : modo === 'specie' ? 6 : modo === 'tratti' ? 8 : 4;

const rows = Math.ceil(celle.length / cols);
const passo = 2.0;
celle.forEach((c, i) => {
  const col = modo === 'specie' ? Math.floor(i / 2) : i % cols;
  const row = modo === 'specie' ? i % 2 : Math.floor(i / cols);
  const a: any = { vestiti: c.vestiti ?? [], xp: 0, id: 'a' + i, nome: '', specie: c.specie, sesso: c.sesso, fase: c.fase, mestiere: null,
    aspetto: { manto: c.manto, tratto: c.tratto, forma: c.forma ?? 0, occhi: c.occhi ?? 0.5, orecchie: c.orecchie ?? 0.5, taglia: 1, lato: c.lato ?? 1 } };
  const m = creaAnimale(a);
  const e = c.fase === 'cucciolo' ? 0 : c.fase === 'giovane' ? 0.6 : 1;
  posa(m, e);
  m.gruppo.scale.setScalar(c.fase === 'cucciolo' ? 1.2 : 1.45);
  m.gruppo.position.set((col - (cols - 1) / 2) * passo, 0, -row * passo * 1.0 + 0);
  m.gruppo.position.y = -row * (modo === 'specie' || modo === 'vestiti' ? 3.1 : 2.6);
  m.gruppo.position.z = 0;
  m.gruppo.rotation.y = +(q.get('rot') ?? 0.35);
  sc.add(m.gruppo);
});
const box = new THREE.Box3().setFromObject(sc);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const cx = (box.min.x + box.max.x) / 2, cy = (box.min.y + box.max.y) / 2;
let hw = (box.max.x - box.min.x) / 2 + 0.3, hh = (box.max.y - box.min.y) / 2 + 0.3;
if (hw / hh > W / H) hh = hw * H / W; else hw = hh * W / H;
cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh;
cam.position.set(cx, cy, 10); cam.lookAt(cx, cy, 0); cam.updateProjectionMatrix();
r.render(sc, cam);
(window as any).pronto = true;
