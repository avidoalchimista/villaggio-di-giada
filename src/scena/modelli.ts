// Modelli costruiti in codice, stile "libro illustrato" morbido.
// Cuccioli secondo lo schema infantile (Lorenz): testa più grande del corpo, fronte alta,
// occhi grandi e bassi, guance piene, naso e bocca piccoli, zampe corte e tozze.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash, rng } from '../lib/caso';
import type { Animale, Emozione, Fase, Specie } from '../lib/tipi';
import { aggiornaGuardaroba, capo, conDivisa, indossati, type Parte } from '../lib/vestiti';
import { defMestiere, simboloMestiere, MESTIERI } from '../lib/mestieri';
import { creaAttrezzoInMano, mettiCapo, mettiOcchiali, type Attacchi } from './sartoria';
import { creaAttrezziMestiere, creaInsegnaMestiere } from './botteghe';
import { contorno, macchie, materiale, ombra, spriteTesto, strisce, texture } from './ps1';

export const geo = {
  palla: (r: number, s = 18) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75)),
  cono: (r: number, h: number, s = 12) => new THREE.ConeGeometry(r, h, s),
  cil: (r1: number, r2: number, h: number, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s),
  capsula: (r: number, h: number) => new THREE.CapsuleGeometry(r, h, 6, 12),
  scatola: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
};

const cache = new Map<string, THREE.MeshToonMaterial>();
export function mat(colore: string, extra: Parameters<typeof materiale>[0] = {}) {
  const k = colore + JSON.stringify(extra, (key, v) => (key === 'map' ? undefined : v));
  if (!extra.map && cache.has(k)) return cache.get(k)!;
  const m = materiale({ color: colore, ...extra });
  if (!extra.map) cache.set(k, m);
  return m;
}

/** Pelo dipinto: il colore base con sfumature più chiare e più scure. */
const cachePelo = new Map<string, THREE.MeshToonMaterial>();
function pelo(colore: string) {
  if (cachePelo.has(colore)) return cachePelo.get(colore)!;
  const c = new THREE.Color(colore);
  const chiaro = '#' + c.clone().offsetHSL(0, -0.05, 0.08).getHexString();
  const scuro = '#' + c.clone().offsetHSL(0.01, 0.05, -0.08).getHexString();
  const m = materiale({ color: '#ffffff', map: texture(128, macchie([colore, chiaro, scuro, colore], 0.8, colore.length * 31), 2), rim: 0.45 });
  cachePelo.set(colore, m);
  return m;
}

/** Margheritina: petali intorno a un bottone giallo. */
function fiore(petalo: string, centro: string) {
  const f = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    const pe = mesh(geo.palla(0.035, 8), mat(petalo, { rim: 0.2 }), Math.cos(ang) * 0.05, Math.sin(ang) * 0.05, 0);
    pe.scale.set(1, 1, 0.4);
    f.add(pe);
  }
  f.add(mesh(geo.palla(0.032, 8), mat(centro, { rim: 0.2 }), 0, 0, 0.01));
  f.traverse((c) => (c.userData.senzaContorno = true));
  f.scale.setScalar(1.6);
  return f;
}

function fiocco(colore: string) {
  const f = new THREE.Group();
  for (const s of [-1, 1]) {
    const ala = mesh(geo.cono(0.08, 0.16, 8), mat(colore), s * 0.08, 0, 0);
    ala.rotation.z = -s * Math.PI / 2;
    f.add(ala);
  }
  f.add(mesh(geo.palla(0.045, 8), mat(varia(colore, 0, -0.1)), 0, 0, 0));
  return f;
}

/** Tante piccole forme in una sola (meno lavoro per il telefono). */
function unisci(parti: THREE.BufferGeometry[]) {
  return mergeGeometries(parti.map((g) => { g.deleteAttribute('uv'); return g; })) ?? parti[0];
}

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}

// ---------- animali ----------

interface Mantello { corpo: string; pancia: string; muso: string; zampe: string; extra: string; occhi: string }
// quattro mantelli per specie, ben diversi tra loro (come le varietà vere: volpe rossa, argentata...)
const MANTI: Record<Specie, Mantello[]> = {
  volpe: [
    { corpo: '#e8803e', pancia: '#fff3e0', muso: '#fff3e0', zampe: '#6a3f2a', extra: '#fff3e0', occhi: '#3a2214' },
    { corpo: '#e6b04e', pancia: '#fff8e6', muso: '#fff8e6', zampe: '#8a5a2a', extra: '#fffaf0', occhi: '#4a2c10' },
    { corpo: '#9fa3b4', pancia: '#f4f4f8', muso: '#ffffff', zampe: '#3a3a48', extra: '#ffffff', occhi: '#1e2a3a' },
    { corpo: '#a24f2a', pancia: '#f2dcc4', muso: '#f2dcc4', zampe: '#3a2016', extra: '#f6e6d6', occhi: '#2a140a' },
  ],
  daino: [
    { corpo: '#d29c64', pancia: '#f7ead6', muso: '#f7ead6', zampe: '#9a6a44', extra: '#fffaf0', occhi: '#2e1c12' },
    { corpo: '#c46a3a', pancia: '#f6dcc4', muso: '#f6dcc4', zampe: '#7a3e20', extra: '#fff4e8', occhi: '#2a140a' },
    { corpo: '#ead7b2', pancia: '#ffffff', muso: '#ffffff', zampe: '#b89a74', extra: '#ffffff', occhi: '#3a2a1a' },
    { corpo: '#7e5236', pancia: '#e8d2b8', muso: '#e8d2b8', zampe: '#4a2e1c', extra: '#f0e2cc', occhi: '#1e120a' },
  ],
  tasso: [
    { corpo: '#9ea3ab', pancia: '#ecebe8', muso: '#ffffff', zampe: '#45454f', extra: '#34343c', occhi: '#1e1e24' },
    { corpo: '#c9a46c', pancia: '#f4e6cc', muso: '#fffaf0', zampe: '#6a4a2a', extra: '#4a3420', occhi: '#2a1a0c' },
    { corpo: '#5f6470', pancia: '#c4c6cc', muso: '#ffffff', zampe: '#2a2a32', extra: '#1e1e24', occhi: '#101014' },
    { corpo: '#dcdcdc', pancia: '#ffffff', muso: '#ffffff', zampe: '#8a8a94', extra: '#6a6a74', occhi: '#2a2a34' },
  ],
  riccio: [
    { corpo: '#d8b48c', pancia: '#f6e4cc', muso: '#f6e4cc', zampe: '#8a6644', extra: '#7a5a3c', occhi: '#2a1a10' },
    { corpo: '#a8784e', pancia: '#efd6b8', muso: '#efd6b8', zampe: '#5a3c24', extra: '#4a3220', occhi: '#20120a' },
    { corpo: '#ecd2a0', pancia: '#fff6e4', muso: '#fff6e4', zampe: '#a88a64', extra: '#b0946a', occhi: '#3a2a18' },
    { corpo: '#7a6a5e', pancia: '#d8ccc0', muso: '#d8ccc0', zampe: '#3a302a', extra: '#2a2420', occhi: '#141010' },
  ],
  scoiattolo: [
    { corpo: '#cf7444', pancia: '#fbe8d2', muso: '#fbe8d2', zampe: '#8a4426', extra: '#d98452', occhi: '#2a160c' },
    { corpo: '#8e929c', pancia: '#f2f2f4', muso: '#f2f2f4', zampe: '#4a4c54', extra: '#a4a8b0', occhi: '#1a1c22' },
    { corpo: '#3e3a3c', pancia: '#8a8284', muso: '#9a9294', zampe: '#1e1c1e', extra: '#4a4648', occhi: '#0a0a0a' },
    { corpo: '#e0a04c', pancia: '#fff0d4', muso: '#fff0d4', zampe: '#9a6a2a', extra: '#eab060', occhi: '#3a2410' },
  ],
  lepre: [
    { corpo: '#a8a4a0', pancia: '#ffffff', muso: '#ffffff', zampe: '#6a6662', extra: '#f4b9b9', occhi: '#2a1c14' },
    { corpo: '#d9c4a6', pancia: '#ffffff', muso: '#ffffff', zampe: '#b0916e', extra: '#f4b9b9', occhi: '#2a1c14' },
    { corpo: '#f4f2ee', pancia: '#ffffff', muso: '#ffffff', zampe: '#d4d0cc', extra: '#f4b9b9', occhi: '#a03040' },
    { corpo: '#8a6446', pancia: '#e8d8c4', muso: '#e8d8c4', zampe: '#4a3020', extra: '#e4a8a8', occhi: '#1a100a' },
  ],
  // cavallo: extra = criniera e coda
  cavallo: [
    { corpo: '#a8643a', pancia: '#c8865a', muso: '#d8a07a', zampe: '#3a2418', extra: '#2e1c14', occhi: '#2a160c' },
    { corpo: '#e8c27a', pancia: '#f4dca8', muso: '#f6e4c0', zampe: '#c89a5a', extra: '#fff6e0', occhi: '#3a2410' },
    { corpo: '#c8ccd4', pancia: '#e8eaee', muso: '#9aa0aa', zampe: '#6a707a', extra: '#f4f4f6', occhi: '#1e2430' },
    { corpo: '#3a3436', pancia: '#4e4648', muso: '#5a5254', zampe: '#242022', extra: '#1a1618', occhi: '#0a0a0a' },
  ],
  // asino: extra = criniera e punta delle orecchie
  asino: [
    { corpo: '#9a958e', pancia: '#e8e4de', muso: '#f2eee8', zampe: '#6a655e', extra: '#3a3632', occhi: '#1e1a16' },
    { corpo: '#8a6a50', pancia: '#e4d4c0', muso: '#f0e4d4', zampe: '#5a4232', extra: '#2e2018', occhi: '#1e120a' },
    { corpo: '#e4d6be', pancia: '#fbf6ec', muso: '#ffffff', zampe: '#b8a88e', extra: '#8a7a62', occhi: '#3a2a1a' },
    { corpo: '#5a5450', pancia: '#c8c2bc', muso: '#e8e2dc', zampe: '#34302c', extra: '#1e1a18', occhi: '#100e0c' },
  ],
  // mucca: extra = le macchie, muso = il musone rosa
  mucca: [
    { corpo: '#fbf8f2', pancia: '#ffffff', muso: '#f6b8bc', zampe: '#f2eee8', extra: '#2e2826', occhi: '#1e1614' },
    { corpo: '#fbf6ee', pancia: '#ffffff', muso: '#f6c0b8', zampe: '#7a4026', extra: '#a8502e', occhi: '#2a140a' },
    { corpo: '#a8784e', pancia: '#e8d2b4', muso: '#e8d8c8', zampe: '#5a3e26', extra: '#8a5e3a', occhi: '#1e120a' },
    { corpo: '#f2e2c0', pancia: '#fff8e8', muso: '#f8c8c0', zampe: '#c8a878', extra: '#e0c89a', occhi: '#3a2a18' },
  ],
  // maiale: extra = macchie (pezzato) o fascia (cinta)
  maiale: [
    { corpo: '#f6b4c0', pancia: '#fcd2da', muso: '#f39aac', zampe: '#e88a9c', extra: '#f6b4c0', occhi: '#2a1a1c' },
    { corpo: '#f8c4c8', pancia: '#fde0e2', muso: '#f2a4b0', zampe: '#e898a4', extra: '#4a3a3a', occhi: '#2a1a1c' },
    { corpo: '#3e3638', pancia: '#5a5052', muso: '#6a5a5c', zampe: '#2a2426', extra: '#f8f2ee', occhi: '#0e0a0a' },
    { corpo: '#d88a52', pancia: '#f2c49a', muso: '#e8a070', zampe: '#a8603a', extra: '#d88a52', occhi: '#2a140a' },
  ],
  // uccellino: muso = la faccina/il petto colorato, extra = il cappuccio e le ali
  uccellino: [
    { corpo: '#9a7a5a', pancia: '#f08a3a', muso: '#f08a3a', zampe: '#d89a4a', extra: '#7a5e44', occhi: '#1a100a' },
    { corpo: '#8aa86a', pancia: '#ffd84a', muso: '#ffffff', zampe: '#7a8aa0', extra: '#2a2a34', occhi: '#0e0e12' },
    { corpo: '#b08a62', pancia: '#e8dcc8', muso: '#d8c8b0', zampe: '#c89a6a', extra: '#6a4a30', occhi: '#1a100a' },
    { corpo: '#3a3436', pancia: '#4a4244', muso: '#3a3436', zampe: '#e8a030', extra: '#2a2426', occhi: '#0a0a0a' },
  ],
  // papera: muso = il becco, extra = la testa (verde nel germano)
  papera: [
    { corpo: '#fbf8f2', pancia: '#ffffff', muso: '#f6a030', zampe: '#f6a030', extra: '#fbf8f2', occhi: '#1e1612' },
    { corpo: '#a88466', pancia: '#d8c4a8', muso: '#e8c040', zampe: '#f09a3a', extra: '#2e7a52', occhi: '#1a100a' },
    { corpo: '#a8acb4', pancia: '#e4e6ea', muso: '#f0a83a', zampe: '#f0a03a', extra: '#8a909a', occhi: '#1a1c22' },
    { corpo: '#f2e4c4', pancia: '#fbf4e2', muso: '#f6a840', zampe: '#f6a040', extra: '#f2e4c4', occhi: '#2a1e12' },
  ],
};

export interface ModelloAnimale {
  gruppo: THREE.Group;
  corpo: THREE.Group;
  busto: THREE.Mesh;
  pancia: THREE.Mesh;
  testa: THREE.Group;
  zampe: THREE.Object3D[];
  coda: THREE.Object3D | null;
  occhi: THREE.Object3D[];
  accessorio: THREE.Object3D | null;
  mestiere: string | null;
  /** Le giunture per alzarsi sulle zampe dietro: il tronco gira sulle anche, spalle e testa restano dritte. */
  ossa: { tronco: THREE.Group; spalle: THREE.Group[]; perno: THREE.Group; alza: number };
}

export function varia(colore: string, tinta: number, luce: number) {
  return '#' + new THREE.Color(colore).offsetHSL(tinta, 0, luce).getHexString();
}

/** Per animali salvati prima che esistesse l'aspetto (non dovrebbe servire: lo aggiunge la migrazione). */
function aspettoDiRiserva(a: Animale) {
  const r = rng(hash(a.id));
  return { manto: Math.floor(r() * 4), tratto: 'lentiggini', forma: r() * 2 - 1, occhi: r(), orecchie: r(), taglia: 1, lato: 1 };
}

/** Un pezzo di una linea (da u = da a u = a), per i tubi della coda. */
class Tratto extends THREE.Curve<THREE.Vector3> {
  constructor(private linea: THREE.Curve<THREE.Vector3>, private da: number, private a: number) { super(); }
  getPoint(u: number, v = new THREE.Vector3()) { return this.linea.getPoint(this.da + (this.a - this.da) * u, v); }
}

// ---------- come è fatta ogni specie (proporzioni prese dagli animali veri, poi addolcite) ----------
// Riferimenti: foto e tavole anatomiche delle specie vere, e come i giochi di animali "credibili" (gestionali di zoo,
// giochi di fattoria, avventure naturalistiche low-poly) le rendono riconoscibili: prima la sagoma, poi i dettagli.
// Regola: si deve capire che animale è anche solo dall'ombra (collo, zampe, orecchie, coda, muso).
type Piede = 'zoccolo' | 'zampa' | 'artiglio';
interface Forma {
  taglia: number; // grandezza della specie nel villaggio (un riccio è più piccolo di un cavallo)
  L: number; H: number; W: number; // corpo: lunghezza, altezza, larghezza
  gamba: number; gR: number; piede: Piede; // zampe: altezza da terra, spessore, piede
  collo: number; colloA: number; colloR: number; // collo: lunghezza, inclinazione in avanti (0 = dritto), spessore
  testa: number; testaA: number; // grandezza della testa e quanto punta il naso in giù
  cranio: [number, number, number];
  muso: { l: number; r: number; punta: number; y: number }; // lunghezza, larghezza alla base e in punta, quanto scende
  occhiLato: number; // le prede hanno gli occhi più di lato
  alza: number; // quanto si alza sulle zampe dietro per lavorare
  inclina?: number; // il corpo che pende in avanti (la lepre ha il sedere alto)
}
const FORME: Record<Specie, Forma> = {
  volpe: { taglia: 0.92, L: 0.92, H: 0.4, W: 0.36, gamba: 0.42, gR: 0.032, piede: 'zampa', collo: 0.2, colloA: 0.75, colloR: 0.14, testa: 0.5, testaA: 0.05, cranio: [0.98, 0.86, 0.95], muso: { l: 0.36, r: 0.2, punta: 0.07, y: -0.13 }, occhiLato: 0.1, alza: 1.25 },
  daino: { taglia: 1.12, L: 1.0, H: 0.48, W: 0.4, gamba: 0.66, gR: 0.034, piede: 'zoccolo', collo: 0.46, colloA: 0.38, colloR: 0.13, testa: 0.56, testaA: 0.2, cranio: [0.92, 0.94, 1], muso: { l: 0.38, r: 0.21, punta: 0.12, y: -0.13 }, occhiLato: 0.4, alza: 1.2 },
  tasso: { taglia: 0.9, L: 1.0, H: 0.44, W: 0.52, gamba: 0.2, gR: 0.075, piede: 'artiglio', collo: 0.08, colloA: 1.1, colloR: 0.18, testa: 0.6, testaA: 0.22, cranio: [1.02, 0.86, 1.05], muso: { l: 0.34, r: 0.22, punta: 0.08, y: -0.12 }, occhiLato: 0.05, alza: 1.3 },
  riccio: { taglia: 0.72, L: 0.66, H: 0.42, W: 0.52, gamba: 0.12, gR: 0.05, piede: 'zampa', collo: 0.02, colloA: 1.2, colloR: 0.14, testa: 0.56, testaA: 0.25, cranio: [0.95, 0.9, 1], muso: { l: 0.3, r: 0.2, punta: 0.06, y: -0.12 }, occhiLato: 0.05, alza: 1.2 },
  scoiattolo: { taglia: 0.72, L: 0.58, H: 0.32, W: 0.3, gamba: 0.24, gR: 0.04, piede: 'zampa', collo: 0.06, colloA: 0.5, colloR: 0.12, testa: 0.56, testaA: -0.1, cranio: [0.96, 0.96, 1], muso: { l: 0.18, r: 0.2, punta: 0.11, y: -0.12 }, occhiLato: 0.25, alza: 1.25, inclina: -0.35 },
  lepre: { taglia: 0.85, L: 0.74, H: 0.42, W: 0.36, gamba: 0.38, gR: 0.04, piede: 'zampa', collo: 0.1, colloA: 0.4, colloR: 0.13, testa: 0.56, testaA: 0.1, cranio: [0.92, 0.98, 1.05], muso: { l: 0.2, r: 0.22, punta: 0.13, y: -0.12 }, occhiLato: 0.45, alza: 1.2, inclina: -0.2 },
  cavallo: { taglia: 1.3, L: 1.3, H: 0.62, W: 0.5, gamba: 0.7, gR: 0.055, piede: 'zoccolo', collo: 0.55, colloA: 0.62, colloR: 0.18, testa: 0.5, testaA: 0.75, cranio: [0.85, 0.9, 0.95], muso: { l: 0.72, r: 0.3, punta: 0.21, y: -0.12 }, occhiLato: 0.45, alza: 1.15 },
  asino: { taglia: 1.12, L: 1.1, H: 0.56, W: 0.48, gamba: 0.62, gR: 0.055, piede: 'zoccolo', collo: 0.4, colloA: 0.62, colloR: 0.18, testa: 0.66, testaA: 0.45, cranio: [0.92, 0.95, 0.95], muso: { l: 0.52, r: 0.27, punta: 0.22, y: -0.08 }, occhiLato: 0.4, alza: 1.15 },
  mucca: { taglia: 1.25, L: 1.4, H: 0.72, W: 0.62, gamba: 0.5, gR: 0.065, piede: 'zoccolo', collo: 0.26, colloA: 1.0, colloR: 0.24, testa: 0.56, testaA: 0.35, cranio: [0.95, 0.92, 0.95], muso: { l: 0.32, r: 0.27, punta: 0.24, y: -0.12 }, occhiLato: 0.4, alza: 1.1 },
  maiale: { taglia: 1.0, L: 1.08, H: 0.58, W: 0.56, gamba: 0.24, gR: 0.06, piede: 'zoccolo', collo: 0.05, colloA: 1.2, colloR: 0.26, testa: 0.66, testaA: 0.12, cranio: [1.02, 0.95, 1], muso: { l: 0.26, r: 0.24, punta: 0.2, y: -0.1 }, occhiLato: 0.2, alza: 1.2 },
  // gli uccelli hanno un corpo loro (vedi creaUccello)
  uccellino: { taglia: 0.62, L: 0.5, H: 0.5, W: 0.44, gamba: 0.16, gR: 0.02, piede: 'artiglio', collo: 0, colloA: 0, colloR: 0.1, testa: 0.62, testaA: 0, cranio: [1, 1, 1], muso: { l: 0, r: 0, punta: 0, y: 0 }, occhiLato: 0.5, alza: 0 },
  papera: { taglia: 0.78, L: 0.78, H: 0.46, W: 0.46, gamba: 0.16, gR: 0.03, piede: 'zampa', collo: 0.28, colloA: 0.1, colloR: 0.12, testa: 0.6, testaA: 0, cranio: [0.95, 0.92, 1.05], muso: { l: 0, r: 0, punta: 0, y: 0 }, occhiLato: 0.4, alza: 0 },
};
/** Quanto è grande la specie nel villaggio (per le case, le prove, il ritratto). */
export const tagliaSpecie = (s: Specie) => FORME[s].taglia;

/** divisa: se sta lavorando, con la divisa del suo mestiere. */
export function creaAnimale(a: Animale, divisa = false): ModelloAnimale {
  const asp = a.aspetto ?? aspettoDiRiserva(a);
  const base = MANTI[a.specie][asp.manto % MANTI[a.specie].length];
  const t = { segno: asp.tratto, lato: asp.lato, taglia: asp.taglia };
  const p = { ...base, zampe: t.segno === 'calzini bianchi' ? '#fbf8f2' : base.zampe };
  const piccolo = a.fase === 'cucciolo';
  const uccello = a.specie === 'uccellino' || a.specie === 'papera';
  const F = FORME[a.specie];
  const orecchieDi: THREE.Object3D[] = [];
  const gruppo = new THREE.Group();
  const corpo = new THREE.Group();
  gruppo.add(corpo);

  // I cuccioli come quelli veri: testa più grande, muso più corto, occhi più grandi, corpo più corto.
  // (I puledri e i cerbiatti hanno già le zampe lunghe: le gambe restano quasi uguali.)
  const zoccoli = F.piede === 'zoccolo';
  const kTesta = piccolo ? 1.32 : a.fase === 'giovane' ? 1.1 : 1;
  const kMuso = piccolo ? 0.68 : a.fase === 'giovane' ? 0.88 : 1;
  const kOcchi = piccolo ? 1.25 : 1;
  const kCorpo = piccolo ? 0.82 : 1;
  const kGamba = piccolo ? (zoccoli ? 0.92 : 0.8) : 1;
  // corporatura: rotondetto (forma < 0) o slanciato (forma > 0)
  const L = F.L * kCorpo * (1 + asp.forma * 0.06), H = F.H * kCorpo * (1 - asp.forma * 0.05), W = F.W * kCorpo * (1 - asp.forma * 0.08);
  const gamba = F.gamba * kGamba;
  gruppo.add(ombra(Math.max(L * 0.62, 0.32)));

  // il tronco: gira sulle anche quando si alza sulle zampe dietro
  const yB = gamba + H * 0.38;
  const tronco = new THREE.Group();
  tronco.position.set(0, yB, -L * 0.32);
  tronco.rotation.x = F.inclina ?? 0;
  tronco.userData.inclina = F.inclina ?? 0;
  corpo.add(tronco);
  // il busto è la palla di sempre (i vestiti ci si appoggiano sopra), sdraiata in avanti e allungata:
  // il suo "davanti" diventa la pancia, la sua "schiena" la schiena, il suo "sopra" il petto verso il collo
  const busto = mesh(geo.palla(0.34, 22), pelo(p.corpo), 0, 0, L * 0.32);
  busto.rotation.x = Math.PI / 2;
  busto.scale.set(W / 0.68, L / 0.68, H / 0.68);
  tronco.add(busto);
  const pancia = mesh(geo.palla(0.26, 16), mat(p.pancia, { rim: 0.2 }), 0, 0.02, 0.12);
  pancia.scale.set(0.95, 1.05, 0.7);
  pancia.userData.senzaContorno = true;
  busto.add(pancia);
  /** La riga scura lungo la schiena (daino, asino): un arco che segue la curva del busto. */
  const rigaDorso = (colore: string, spessore: number) => {
    const r = mesh(new THREE.TorusGeometry(0.338, spessore, 5, 24, 2.2), mat(colore, { rim: 0 }));
    r.rotation.set(0, Math.PI / 2, Math.PI / 2 + 0.2);
    r.scale.set(1, 1, 0.5);
    return r;
  };
  /** Un pezzo appoggiato sul busto senza essere stirato come lui. */
  const sulBusto = (o: THREE.Object3D, s = 1) => {
    o.scale.set(s / busto.scale.x, s / busto.scale.y, s / busto.scale.z);
    busto.add(o);
    return o;
  };

  // ---- zampe ----
  const zampe: THREE.Object3D[] = [];
  const spalle: THREE.Group[] = [];
  const lungZ = gamba + H * 0.28; // dalla spalla/anca fino a terra
  const zampa = (davanti: boolean, s: number) => {
    const perno = new THREE.Group();
    const r = F.gR * (piccolo ? 1.05 : 1) * (davanti ? 1 : 1.1);
    const alta = davanti ? 1 : 1.25;
    // la coscia del colore del corpo, la parte di sotto del colore delle zampe (le "calze" della volpe, del cavallo baio)
    // la coscia: una massa morbida che entra nel corpo (la spalla, la natica), non un tubo
    const coscia = mesh(geo.palla(1, 14), pelo(p.corpo), 0, -H * 0.12, davanti ? r * 0.2 : -r * 0.4);
    coscia.scale.set(r * 1.8 * alta, H * 0.34 * (davanti ? 0.85 : 1), Math.max(r * 2.2, H * 0.22) * alta * (davanti ? 1 : 1.2));
    coscia.userData.senzaContorno = true; // si fonde col corpo
    perno.add(coscia);
    const stinco = mesh(geo.cil(r * 0.78, r * 1.15, lungZ * 0.72, 10), pelo(a.specie === 'lepre' ? varia(p.corpo, 0, -0.04) : p.zampe), 0, -lungZ * 0.55, 0);
    perno.add(stinco);
    let piede: THREE.Mesh;
    if (F.piede === 'zoccolo') {
      piede = mesh(geo.cil(r * 1.05, r * 1.3, Math.max(0.05, r * 1.3), 10), mat(a.specie === 'maiale' ? varia(p.zampe, 0, -0.15) : '#3e3029', { rim: 0.2 }), 0, -lungZ + r * 0.6, 0.005);
    } else {
      piede = mesh(geo.palla(r * 1.45, 10), mat(p.zampe), 0, -lungZ + r * 0.75, r * 0.6);
      piede.scale.set(1, 0.6, 1.35);
      if (F.piede === 'artiglio') for (const dx of [-1, 0, 1]) {
        const u = mesh(geo.cono(r * 0.3, r * 1.2, 5), mat('#f4ead8', { rim: 0 }), dx * r * 0.55, -lungZ + r * 0.5, r * 1.9);
        u.rotation.x = Math.PI / 2 + 0.3;
        u.userData.senzaContorno = true;
        perno.add(u);
      }
    }
    perno.add(piede);
    perno.userData.lunghezza = lungZ;
    if (davanti) {
      const spalla = new THREE.Group();
      spalla.position.set(s * W * 0.3, -H * 0.1, L * 0.32 + L * 0.3);
      spalla.add(perno);
      tronco.add(spalla);
      spalle.push(spalla);
    } else {
      perno.position.set(s * W * 0.3, yB - H * 0.1 + (F.inclina ? Math.sin(-F.inclina) * 0 : 0), -L * 0.32 - L * 0.0);
      corpo.add(perno);
    }
    zampe.push(perno);
    return perno;
  };
  if (!uccello) {
    zampa(true, -1); zampa(true, 1); zampa(false, -1); zampa(false, 1);
    // le anche: le zampe di dietro partono un po' più avanti della punta del sedere
    for (const z of zampe.slice(2)) z.position.z = -L * 0.32 + L * 0.06;
  }

  // ---- collo e testa ----
  const colloG = new THREE.Group();
  colloG.position.set(0, H * 0.22, L * 0.32 + L * 0.36);
  colloG.rotation.x = F.colloA;
  tronco.add(colloG);
  if (F.collo > 0.04) {
    // più grosso dove entra nelle spalle, più sottile sotto la testa
    const rc = F.colloR * (piccolo ? 0.9 : 1);
    colloG.add(mesh(geo.cil(rc * 0.8, rc * 1.3, F.collo, 14), pelo(p.corpo), 0, F.collo / 2, 0));
    colloG.add(mesh(geo.palla(rc * 1.3, 14), pelo(p.corpo), 0, 0, 0));
  }
  const perno = new THREE.Group();
  perno.position.set(0, F.collo, 0);
  perno.rotation.x = -F.colloA + F.testaA;
  perno.userData.base = perno.rotation.x;
  perno.scale.setScalar(F.testa * kTesta);
  colloG.add(perno);
  const testa = new THREE.Group();
  perno.add(testa);
  // sopra il collo la testa sta un po' più avanti, così il collo entra nella nuca
  testa.position.set(0, 0.12, 0.1);
  const cranio = mesh(geo.palla(0.46, 22), pelo(p.corpo));
  cranio.scale.set(...F.cranio);
  testa.add(cranio);

  // il muso: un cono morbido che esce dalla faccia, di sopra del colore del corpo e di sotto chiaro
  const lM = F.muso.l * kMuso;
  const davFaccia = 0.46 * F.cranio[2] * 0.72;
  const muso = new THREE.Group();
  muso.position.set(0, F.muso.y, davFaccia);
  testa.add(muso);
  const davantiMuso = davFaccia + lM + F.muso.punta * 0.6;
  const naso = mesh(geo.palla(0.06), mat('#2a1a14', { rim: 0 }), 0, F.muso.y + F.muso.punta * 0.45, davantiMuso);
  naso.scale.set(1.3, 0.9, 0.8);
  naso.userData.senzaContorno = true;
  const bocca = new THREE.Group();
  if (lM > 0) {
    const sopra = mesh(geo.cil(F.muso.punta, F.muso.r, lM, 14), pelo(p.corpo), 0, 0.02, lM / 2);
    sopra.rotation.x = Math.PI / 2;
    sopra.scale.set(1, 1, 0.85);
    muso.add(sopra);
    const tappo = mesh(geo.palla(F.muso.punta * 1.02, 12), pelo(p.corpo), 0, 0.02, lM);
    tappo.scale.set(1, 0.85, 0.75);
    muso.add(tappo);
    // la mandibola chiara
    const sotto = mesh(geo.palla(1, 14), mat(p.muso, { rim: 0.15 }), 0, -F.muso.r * 0.3, lM * 0.5);
    sotto.scale.set((F.muso.r + F.muso.punta) * 0.5, (F.muso.r + F.muso.punta) * 0.3, lM * 0.55 + F.muso.punta * 0.4);
    sotto.userData.senzaContorno = true;
    muso.add(sotto);
    testa.add(naso);
    // la bocca: una riga sottile sotto il naso, appena all'insù
    const riga = mesh(new THREE.TorusGeometry(F.muso.punta * 0.6, 0.007, 4, 10, Math.PI), mat('#3a2418', { rim: 0 }), 0, 0, 0);
    riga.rotation.z = Math.PI;
    riga.userData.senzaContorno = true;
    bocca.add(riga);
    bocca.position.set(0, F.muso.y - F.muso.punta * 0.15, davantiMuso - F.muso.punta * 0.35);
    bocca.rotation.x = -0.5;
    testa.add(bocca);
  }

  // occhi: lucidi e un po' grandi (teneri), ma messi dove li ha l'animale vero
  const occhi: THREE.Object3D[] = [];
  const dimOcchio = 0.085 * kOcchi * (0.85 + asp.occhi * 0.3);
  for (const s of [-1, 1]) {
    const x = s * 0.2, y = 0.04;
    const [sx, sy, sz] = F.cranio;
    const zS = 0.46 * sz * Math.sqrt(Math.max(0.05, 1 - (x / (0.46 * sx)) ** 2 - (y / (0.46 * sy)) ** 2));
    const g = new THREE.Group();
    g.position.set(x, y, zS - 0.02);
    g.rotation.y = s * (0.35 + F.occhiLato * 0.7);
    const coloreOcchio = t.segno === 'occhi di due colori' && s === t.lato ? '#3f86c8' : p.occhi;
    // la volpe ha l'iride ambra; gli altri l'occhio scuro
    if (a.specie === 'volpe') {
      const iride = mesh(geo.palla(dimOcchio, 14), mat('#c8892e', { rim: 0 }));
      iride.scale.set(1, 1, 0.5);
      g.add(iride);
      const pupilla = mesh(geo.palla(dimOcchio * 0.62, 12), mat(coloreOcchio === '#3f86c8' ? coloreOcchio : '#1a100a', { rim: 0 }), 0, 0, dimOcchio * 0.18);
      pupilla.scale.set(1, 1, 0.5);
      g.add(pupilla);
    } else {
      const bulbo = mesh(geo.palla(dimOcchio, 14), mat(coloreOcchio, { rim: 0 }));
      bulbo.scale.set(1.08, 0.95, 0.5);
      g.add(bulbo);
    }
    g.add(mesh(geo.palla(dimOcchio * 0.32, 8), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.8, rim: 0 }), dimOcchio * 0.3, dimOcchio * 0.35, dimOcchio * 0.45));
    // le femmine: due ciglia piccole
    if (a.sesso === 'f') for (let k = 0; k < 2; k++) {
      const ciglio = mesh(geo.capsula(0.009, 0.035), mat('#1e140e', { rim: 0 }), s * (dimOcchio * 0.55 + k * 0.025), dimOcchio * 0.95, 0.0);
      ciglio.rotation.z = -s * (0.6 + k * 0.4);
      ciglio.userData.senzaContorno = true;
      g.add(ciglio);
    }
    if (t.segno === 'macchia sull\'occhio' && s === t.lato) {
      const macchia = mesh(geo.palla(0.14), mat(a.specie === 'tasso' ? '#ffffff' : varia(base.corpo, 0, -0.2), { rim: 0 }), x * 1.05, y, zS - 0.08);
      macchia.scale.set(1, 1.05, 0.45);
      macchia.rotation.y = s * 0.5;
      macchia.userData.senzaContorno = true;
      testa.add(macchia);
    }
    testa.add(g);
    occhi.push(g);
  }

  /** Orecchio a punta (cono schiacciato) con l'interno chiaro. */
  const orecchio = (x: number, r: number, h: number, colore: string, inclina = 0.3, interno?: string, y = 0.32, z = -0.06) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.z = -Math.sign(x) * inclina;
    const o = mesh(geo.cono(r, h, 10), pelo(colore), 0, h / 2, 0);
    o.scale.z = 0.5;
    g.add(o);
    if (interno) {
      const i = mesh(geo.cono(r * 0.62, h * 0.72, 8), mat(interno, { rim: 0 }), 0, h * 0.4, 0.035);
      i.scale.z = 0.35;
      i.userData.senzaContorno = true;
      g.add(i);
    }
    testa.add(g);
    orecchieDi.push(g);
    return g;
  };
  /** Orecchio a foglia (cervidi, mucca, maiale). */
  const orecchioFoglia = (s: number, l: number, larga: number, colore: string, interno: string, rotZ: number, y: number, z = -0.04, x = 0.36) => {
    const g = new THREE.Group();
    g.position.set(s * x, y, z);
    g.rotation.z = -s * rotZ;
    const o = mesh(geo.palla(0.1, 12), pelo(colore), 0, l * 0.5, 0);
    o.scale.set(larga * 10, l * 10, 0.38);
    g.add(o);
    const i = mesh(geo.palla(0.075, 10), mat(interno, { rim: 0 }), 0, l * 0.5, 0.025);
    i.scale.set(larga * 10, l * 10, 0.25);
    i.userData.senzaContorno = true;
    g.add(i);
    testa.add(g);
    orecchieDi.push(g);
    return g;
  };
  /** Coda (o criniera) morbida: un tubo che segue una linea (z verso dietro, y in su) e cambia spessore. */
  const codaLungo = (punti: [number, number][], raggi: number[], colore: string, puntaColore?: string, quanteP = 0) => {
    const g = new THREE.Group();
    const linea = new THREE.CatmullRomCurve3(punti.map(([y, z]) => new THREE.Vector3(0, y, z)));
    const raggio = (u: number) => {
      const x = u * (raggi.length - 1), i = Math.min(raggi.length - 2, Math.floor(x));
      if (raggi.length === 1) return raggi[0];
      return THREE.MathUtils.lerp(raggi[i], raggi[i + 1], x - i) * (u > 0.9 ? Math.sqrt(Math.max(0.15, (1 - u) / 0.1)) : 1);
    };
    const pezzo = (da: number, a: number, m: THREE.Material, gonfio = 1) => {
      const curva = new Tratto(linea, da, a);
      const seg = 24, rad = 10;
      const tubo = new THREE.TubeGeometry(curva, seg, 1, rad, false);
      const pos = tubo.attributes.position;
      const v = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        curva.getPoint(u, c);
        const r = raggio(da + (a - da) * u) * gonfio;
        for (let j = 0; j <= rad; j++) {
          const k = i * (rad + 1) + j;
          v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
          pos.setXYZ(k, v.x, v.y, v.z);
        }
      }
      tubo.computeVertexNormals();
      g.add(mesh(tubo, m));
      // la radice chiusa da una pallina
      if (da === 0) g.add(mesh(geo.palla(raggio(0) * gonfio, 10), m, ...linea.getPoint(0).toArray()));
    };
    const fine = puntaColore ? 1 - Math.min(0.4, quanteP * 0.08) : 1;
    pezzo(0, puntaColore ? fine + 0.02 : 1, pelo(colore));
    if (puntaColore) pezzo(fine, 1, mat(puntaColore, { rim: 0.2 }), 1.02);
    g.userData.punta = linea.getPoint(1);
    return g;
  };
  let coda: THREE.Object3D | null = null;
  const attaccaCoda = (c: THREE.Object3D, y = H * 0.18, z = -L * 0.47) => {
    c.position.set(0, yB + y, z);
    corpo.add(c);
    coda = c;
  };

  switch (a.specie) {
    case 'volpe': {
      // Volpe rossa: orecchie grandi a punta col retro nero, muso lungo e sottile, guance e gola bianche,
      // "calze" nere sulle zampe, codone folto lungo quasi come il corpo con la punta bianca.
      for (const s of [-1, 1]) {
        const o = orecchio(s * 0.25, 0.17, 0.4, p.corpo, 0.22, '#fff3e0');
        const punta = mesh(geo.cono(0.08, 0.15, 10), mat('#2e1c12'), 0, 0.33, -0.005);
        punta.scale.z = 0.52;
        o.add(punta);
      }
      // guance, labbro e gola bianchi: la metà di sotto della faccia
      const mento = mesh(geo.palla(0.36, 16), mat(p.extra, { rim: 0.2 }), 0, -0.2, 0.12);
      mento.scale.set(1.12, 0.62, 0.95);
      mento.userData.senzaContorno = true;
      testa.add(mento);
      const petto = mesh(geo.palla(0.16, 12), mat(p.extra, { rim: 0.2 }), 0, 0.3, 0.12);
      petto.userData.senzaContorno = true;
      sulBusto(petto);
      petto.scale.y *= 0.6;
      const lunga = piccolo ? 0.6 : 1;
      attaccaCoda(codaLungo([[0, 0], [-0.08, -0.2 * lunga], [-0.18, -0.45 * lunga], [-0.2, -0.7 * lunga]], [0.08, 0.13, 0.15, 0.15, 0.13, 0.1], p.corpo, p.extra, 3));
      break;
    }
    case 'daino': {
      // Daino: zampe lunghe e sottili, collo lungo, orecchie grandi, mantello fulvo con le macchie bianche
      // (il daino le tiene anche da grande), riga scura sulla schiena, specchio bianco sul sedere
      // con la codina nera sopra. I maschi adulti hanno i palchi a pala.
      for (const s of [-1, 1]) orecchioFoglia(s, 0.3, 0.13, p.corpo, '#f0c8b8', 1.05, 0.26, -0.08, 0.3);
      const r = rng(hash(a.id + 'macchie'));
      const quante = piccolo ? 22 : 14;
      for (let k = 0; k < quante; k++) {
        // sui fianchi alti, in file lungo il corpo
        const lungo = -0.75 + r() * 1.4, giro = (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.55);
        const d = new THREE.Vector3(Math.sin(giro) * Math.sqrt(1 - lungo * lungo * 0.6), lungo, -Math.cos(giro) * Math.sqrt(1 - lungo * lungo * 0.6)).normalize();
        const m = mesh(geo.palla(0.022 + r() * 0.01, 6), mat(p.extra, { rim: 0 }), d.x * 0.34, d.y * 0.34, d.z * 0.34);
        m.userData.senzaContorno = true;
        sulBusto(m);
      }
      const riga = rigaDorso(varia(p.corpo, 0, -0.22), 0.028);
      riga.userData.senzaContorno = true;
      busto.add(riga);
      const specchio = mesh(geo.palla(0.13, 12), mat('#fbf6ee', { rim: 0 }), 0, -0.31, -0.08);
      specchio.scale.set(1, 0.35, 1.1);
      specchio.userData.senzaContorno = true;
      busto.add(specchio);
      const c = new THREE.Group();
      const codina = mesh(geo.capsula(0.035, 0.12), mat('#2a1c14'), 0, -0.08, -0.02);
      codina.rotation.x = 0.25;
      c.add(codina);
      c.userData.punta = new THREE.Vector3(0, -0.16, -0.04);
      attaccaCoda(c, H * 0.25);
      if (a.sesso === 'm') {
        if (piccolo) for (const s of [-1, 1]) testa.add(mesh(geo.palla(0.045), mat('#8a5a36'), s * 0.14, 0.4, -0.04));
        else for (const s of [-1, 1]) {
          // palco: un'asta che sale, la pala piatta in cima e qualche punta
          const palco = new THREE.Group();
          palco.position.set(s * 0.15, 0.36, -0.06);
          palco.rotation.z = -s * 0.45;
          const corno = mat('#c8a882', { rim: 0.2 });
          palco.add(mesh(geo.cil(0.025, 0.035, 0.32, 6), corno, 0, 0.16, 0));
          const punta1 = mesh(geo.cono(0.022, 0.14, 5), corno, 0, 0.12, 0.07);
          punta1.rotation.x = 1.0;
          palco.add(punta1);
          const pala = mesh(geo.palla(0.13, 10), corno, s * 0.06, 0.38, -0.04);
          pala.scale.set(1.25, 0.9, 0.22);
          pala.rotation.z = -s * 0.5;
          palco.add(pala);
          for (const k of [0, 1, 2]) {
            const pp = mesh(geo.cono(0.02, 0.1, 5), corno, s * (0.02 + k * 0.07), 0.48 + (k === 1 ? 0.04 : 0), -0.04);
            pp.rotation.z = -s * (0.3 + k * 0.25);
            palco.add(pp);
          }
          testa.add(palco);
        }
      }
      break;
    }
    case 'tasso': {
      // Tasso: basso e largo come una scavatrice, testa a cuneo bianca con due strisce nere dal naso alle orecchie,
      // orecchiette tonde orlate di bianco, zampe corte e nere con le unghie lunghe, codina corta.
      cranio.material = pelo(p.muso);
      for (const m of muso.children) if (m instanceof THREE.Mesh) m.material = pelo(p.muso);
      const scura = piccolo ? varia(p.extra, 0, 0.08) : p.extra;
      for (const s of [-1, 1]) {
        const arco = new THREE.Group();
        arco.position.x = s * 0.17;
        arco.rotation.y = -Math.PI / 2;
        const striscia = mesh(new THREE.TorusGeometry(0.43, 0.06, 8, 28, 2.4), mat(scura, { rim: 0.15 }));
        striscia.rotation.z = -0.15;
        striscia.scale.set(1.0, 0.9, 1.6);
        striscia.userData.senzaContorno = true;
        arco.add(striscia);
        testa.add(arco);
        // la striscia continua lungo il muso fin quasi al naso
        const sm = mesh(geo.cil(0.035, 0.055, lM * 0.9, 6), mat(scura, { rim: 0 }), s * F.muso.r * 0.62, F.muso.y + 0.07, davFaccia + lM * 0.42);
        sm.rotation.x = Math.PI / 2;
        sm.rotation.y = -s * 0.28;
        sm.userData.senzaContorno = true;
        testa.add(sm);
        const g = new THREE.Group();
        g.position.set(s * 0.36, 0.22, -0.14);
        g.rotation.z = -s * 0.7;
        const orlo = mesh(geo.palla(0.1), mat('#fbf8f2', { rim: 0.2 }), 0, 0.04, 0);
        orlo.scale.set(1, 0.85, 0.45);
        g.add(orlo);
        const dentro = mesh(geo.palla(0.075), mat(scura, { rim: 0 }), 0, 0.03, 0.025);
        dentro.scale.set(1, 0.85, 0.4);
        dentro.userData.senzaContorno = true;
        g.add(dentro);
        testa.add(g);
        orecchieDi.push(g);
      }
      // la pancia e le zampe scure, il dorso grigio
      pancia.material = mat(varia(p.zampe, 0, 0.05), { rim: 0.2 });
      const c = codaLungo([[0, 0], [-0.03, -0.1], [-0.05, -0.17]], [0.07, 0.08, 0.06], p.corpo);
      attaccaCoda(c, H * 0.05);
      break;
    }
    case 'riccio': {
      // Riccio: una cupola di aculei (scuri con la punta chiara) dalla fronte al sedere, faccina chiara a punta,
      // nasone nero lucido, occhietti neri, orecchiette tonde, zampette che quasi non si vedono.
      const coloreAculei = piccolo ? varia(p.extra, 0, 0.14) : p.extra;
      const puntaA = piccolo ? '#fbf3e6' : varia(p.muso, 0, 0.04);
      const lung = piccolo ? 0.1 : 0.15;
      const r = rng(hash(a.id + 'aculei'));
      cranio.material = pelo(p.muso);
      for (const m of muso.children) if (m instanceof THREE.Mesh) m.material = pelo(p.muso);
      naso.scale.set(1.5, 1.2, 1.2);
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(s * 0.34, 0.2, 0.05);
        g.rotation.set(0, s * 0.6, -s * 0.3);
        const o = mesh(geo.palla(0.08), pelo(p.muso), 0, 0, 0);
        o.scale.set(1, 1, 0.5);
        g.add(o);
        const i = mesh(geo.palla(0.05), mat('#f4b0b0', { rim: 0 }), 0, 0, 0.03);
        i.scale.set(1, 1, 0.4);
        i.userData.senzaContorno = true;
        g.add(i);
        testa.add(g);
        orecchieDi.push(g);
      }
      const aculei = (rx: number, ry: number, rz: number, quanti: number, tiene: (d: THREE.Vector3) => boolean, scala = 1) => {
        const scuri: THREE.BufferGeometry[] = [];
        const chiari: THREE.BufferGeometry[] = [];
        for (let k = 0; k < quanti; k++) {
          const y = 1 - (k + 0.5) / quanti * 2;
          const rr = Math.sqrt(1 - y * y);
          const th = k * 2.39996;
          const d = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
          if (!tiene(d)) continue;
          const pos = new THREE.Vector3(d.x * rx, d.y * ry, d.z * rz);
          const verso = d.clone().add(new THREE.Vector3(0, 0.15, -0.8)).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), verso);
          const l = lung * scala * (0.85 + r() * 0.3);
          const c = new THREE.ConeGeometry(0.045 * scala, l, 5);
          c.translate(0, l / 2 - 0.02, 0);
          c.applyQuaternion(q);
          c.translate(pos.x, pos.y, pos.z);
          scuri.push(c.toNonIndexed());
          const tt = new THREE.ConeGeometry(0.02 * scala, l * 0.36, 5);
          tt.translate(0, l * 0.82, 0);
          tt.applyQuaternion(q);
          tt.translate(pos.x, pos.y, pos.z);
          chiari.push(tt.toNonIndexed());
        }
        const g = new THREE.Group();
        g.add(mesh(unisci(scuri), mat(coloreAculei, { rim: 0.3 })));
        const tips = mesh(unisci(chiari), mat(puntaA, { rim: 0.2 }));
        tips.userData.senzaContorno = true;
        g.add(tips);
        return g;
      };
      // il mantello di aculei sopra il corpo (lascia scoperta la pancia)
      busto.material = pelo(coloreAculei);
      const dorso = aculei(W / 2, H / 2, L / 2, 340, (d) => d.y > -0.2 && d.z < 0.85);
      dorso.position.set(0, 0.02, L * 0.32);
      tronco.add(dorso);
      // la fronte: un cappuccio di aculei che lascia libera la faccina e scende a punta sulla fronte
      const cappuccio = mesh(geo.palla(0.45, 18), pelo(coloreAculei), 0, 0.08, -0.12);
      cappuccio.scale.set(1.05, 0.95, 0.95);
      testa.add(cappuccio);
      const testaAculei = aculei(0.48, 0.44, 0.46, 220, (d) => d.z < 0.55 - Math.abs(d.x) * 0.3 && d.y > -0.05 + Math.max(0, d.z) * 0.6, 1.3);
      testaAculei.position.set(0, 0.06, -0.1);
      testa.add(testaAculei);
      const c = new THREE.Group();
      c.add(mesh(geo.palla(0.04, 6), pelo(p.muso), 0, 0, 0));
      c.userData.punta = new THREE.Vector3(0, 0, -0.04);
      attaccaCoda(c, -H * 0.05);
      break;
    }
    case 'scoiattolo': {
      // Scoiattolo rosso: orecchie con i ciuffi, pancia bianca, zampe dietro forti, e il codone a "S"
      // che sale dietro la schiena (è la cosa che lo fa riconoscere da lontano).
      for (const s of [-1, 1]) {
        const o = orecchio(s * 0.22, 0.1, 0.24, p.corpo, 0.12, '#f2b9a0', 0.32, -0.08);
        if (!piccolo) o.add(mesh(geo.cono(0.06, 0.18, 6), pelo(varia(p.corpo, 0, -0.06)), 0, 0.28, 0));
      }
      for (const s of [-1, 1]) {
        const g = mesh(geo.palla(0.13), mat(p.pancia, { rim: 0.2 }), s * 0.17, -0.17, 0.25);
        g.userData.senzaContorno = true;
        testa.add(g);
      }
      for (const z of zampe.slice(2)) z.children[0].scale.multiply(new THREE.Vector3(1.3, 1.1, 1.3));
      const sottile = piccolo ? 0.75 : 1;
      const c = codaLungo([[0.0, -0.02], [0.15, -0.2], [0.42, -0.3], [0.7, -0.26], [0.86, -0.1], [0.84, 0.04]], [0.14, 0.2, 0.25, 0.27, 0.26, 0.23, 0.18].map((x) => x * sottile), p.extra);
      c.scale.x = 0.8; // un po' piatta, come una piuma
      // il pelo lungo e morbido sui bordi
      const rf = rng(hash(a.id + 'coda'));
      const linea = new THREE.CatmullRomCurve3([[0.0, -0.02], [0.15, -0.2], [0.42, -0.3], [0.7, -0.26], [0.86, -0.1], [0.84, 0.04]].map(([y, z]) => new THREE.Vector3(0, y, z)));
      for (let k = 2; k < 22; k++) {
        const u = k / 22, pt = linea.getPoint(u), tg = linea.getTangent(u);
        const fuori = new THREE.Vector3(0, -tg.z, tg.y).multiplyScalar(k % 2 ? 1 : -1);
        const r = (0.09 + rf() * 0.05) * sottile;
        pt.addScaledVector(fuori, 0.2 * sottile * (0.8 + rf() * 0.3));
        const f = mesh(geo.palla(r, 8), pelo(varia(p.extra, 0, 0.03)), (rf() - 0.5) * 0.05, pt.y, pt.z);
        f.scale.x = 0.7;
        c.add(f);
      }
      c.rotation.y = a.sesso === 'm' ? -0.25 : 0.25;
      attaccaCoda(c, H * 0.05, -L * 0.48);
      break;
    }
    case 'lepre': {
      // Lepre: orecchie lunghissime con la punta nera, occhioni ai lati, sedere alto con le zampe dietro grandi,
      // codina bianca col sopra scuro. Da piccola (leprotto) le orecchie sono più corte.
      const lunghe = piccolo ? 0.3 : 0.52;
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(s * 0.13, 0.3, -0.1);
        g.rotation.set(-0.35, 0, -s * 0.22);
        const o = mesh(geo.capsula(0.085, lunghe), pelo(p.corpo), 0, lunghe / 2 + 0.06, 0);
        o.scale.set(1, 1, 0.5);
        g.add(o);
        const i = mesh(geo.capsula(0.05, lunghe * 0.8), mat(p.extra, { rim: 0 }), 0, lunghe / 2 + 0.06, 0.035);
        i.scale.z = 0.35;
        i.userData.senzaContorno = true;
        g.add(i);
        if (!piccolo) {
          const punta = mesh(geo.palla(0.08), mat('#2e2420'), 0, lunghe + 0.1, 0);
          punta.scale.set(1.05, 1.3, 0.55);
          g.add(punta);
        }
        testa.add(g);
        orecchieDi.push(g);
      }
      // labbro diviso e dentini
      for (const x of [-0.022, 0.022]) {
        const d = mesh(geo.scatola(0.036, 0.045, 0.02), mat('#ffffff', { rim: 0 }), x, F.muso.y - 0.12, davantiMuso - 0.05);
        d.rotation.x = -0.3;
        testa.add(d);
      }
      // zampe dietro: coscia grande e piede lungo appoggiato a terra
      for (const z of zampe.slice(2)) {
        z.children[0].scale.multiply(new THREE.Vector3(1.35, 1.15, 1.4));
        const piede = z.children[2] as THREE.Mesh;
        piede.scale.set(1.1, 0.55, 2.6);
        piede.position.z += 0.04;
      }
      const c = new THREE.Group();
      c.add(mesh(geo.palla(0.09, 10), mat('#ffffff'), 0, 0, -0.02));
      c.add(mesh(geo.palla(0.06, 8), mat(varia(p.corpo, 0, -0.2)), 0, 0.04, -0.04));
      c.userData.punta = new THREE.Vector3(0, 0, -0.08);
      attaccaCoda(c, H * 0.2);
      break;
    }
    case 'cavallo':
    case 'asino': {
      // Cavallo: testa lunga con le narici, orecchie piccole e dritte, collo forte con la criniera che ricade,
      // coda lunga fino ai garretti, zampe lunghe con gli zoccoli. Il baio ha criniera, coda e zampe nere.
      // Asino: testa grossa, orecchie lunghissime, muso e anelli intorno agli occhi chiari, criniera corta e dritta,
      // croce scura sulle spalle, coda sottile col ciuffo.
      const asino = a.specie === 'asino';
      if (asino) for (const m of muso.children) if (m instanceof THREE.Mesh) m.material = mat(p.muso, { rim: 0.15 });
      naso.visible = false;
      for (const s of [-1, 1]) {
        const n = mesh(geo.palla(0.04, 8), mat('#2a1a14', { rim: 0 }), s * F.muso.punta * 0.55, F.muso.y + 0.03, davantiMuso - 0.04);
        n.scale.set(0.8, 1.2, 0.5);
        n.userData.senzaContorno = true;
        testa.add(n);
      }
      if (asino) {
        const lungO = piccolo ? 0.42 : 0.56;
        for (const s of [-1, 1]) {
          const o = orecchio(s * 0.2, 0.11, lungO, p.corpo, 0.3, '#f2e4dc', 0.3, -0.12);
          const punta = mesh(geo.cono(0.08, 0.13, 8), mat(p.extra), 0, lungO - 0.05, 0);
          punta.scale.z = 0.5;
          o.add(punta);
        }
        for (const s of [-1, 1]) {
          const anello = mesh(geo.palla(0.13), mat(p.muso, { rim: 0 }), s * 0.21, 0.04, 0.33);
          anello.scale.set(1, 1.1, 0.45);
          anello.rotation.y = s * 0.7;
          anello.userData.senzaContorno = true;
          testa.add(anello);
        }
        // la croce sulle spalle
        const riga = rigaDorso(p.extra, 0.025);
        riga.userData.senzaContorno = true;
        busto.add(riga);
        for (const s of [-1, 1]) {
          const b = mesh(geo.capsula(0.022, 0.2), mat(p.extra, { rim: 0 }), s * 0.18, 0.2, -0.28);
          b.rotation.y = s * 0.9;
          b.userData.senzaContorno = true;
          busto.add(b);
        }
      } else {
        for (const s of [-1, 1]) orecchio(s * 0.17, 0.08, 0.24, p.corpo, 0.08, '#f0c8b8', 0.34, -0.12);
        // la lista bianca giù per il muso
        const lista = mesh(geo.capsula(0.045, lM * 0.75), mat('#fffaf0', { rim: 0 }), 0, F.muso.y + F.muso.r * 0.62, davFaccia + lM * 0.3);
        lista.rotation.x = Math.PI / 2 - 0.08;
        lista.scale.set(1, 1, 0.35);
        lista.userData.senzaContorno = true;
        testa.add(lista);
      }
      // criniera lungo il collo (sul lato di dietro) e ciuffo sulla fronte
      const crin = new THREE.Group();
      const qc = asino ? 9 : 8;
      for (let k = 0; k < qc; k++) {
        const u = k / (qc - 1);
        const y = F.collo * (0.05 + u * 0.95);
        const c = asino
          ? mesh(geo.cono(0.05, 0.14, 6), pelo(p.extra), 0, y, -F.colloR * 0.85)
          : mesh(geo.palla(0.08, 10), pelo(p.extra), (k % 2 ? 0.04 : -0.02) + 0.06, y, -F.colloR * 0.75);
        if (asino) c.rotation.x = -1.2;
        else c.scale.set(0.7, 1.4, 1.0);
        crin.add(c);
      }
      if (!asino) {
        crin.clear();
        const rc = F.colloR * 0.9;
        const c = codaLungo([[F.collo * 1.05, -rc * 0.75], [F.collo * 0.6, -rc * 1.0], [F.collo * 0.1, -rc * 1.25], [-0.05, -rc * 1.3]], [0.06, 0.08, 0.09, 0.06], p.extra);
        c.scale.set(piccolo ? 0.8 : 1.1, 1, 1);
        c.position.x = 0.03;
        crin.add(c);
      }
      if (piccolo) crin.scale.set(1, 1, 0.7);
      colloG.add(crin);
      if (!asino) {
        // il ciuffo che scende sulla fronte, tra le orecchie
        const ciuffo = mesh(geo.palla(0.1, 10), pelo(p.extra), 0.02, 0.33, 0.12);
        ciuffo.scale.set(0.9, 0.55, 1.3);
        ciuffo.rotation.set(0.5, 0, -0.3);
        testa.add(ciuffo);
      }
      if (asino) {
        const c = codaLungo([[0, 0], [-0.15, -0.04], [-0.32, -0.06]], [0.03], p.corpo);
        c.add(mesh(geo.palla(0.065, 8), pelo(p.extra), 0, -0.38, -0.06));
        c.userData.punta = new THREE.Vector3(0, -0.38, -0.06);
        attaccaCoda(c, H * 0.3);
      } else {
        const l = piccolo ? 0.6 : 1;
        const c = codaLungo([[0, 0], [-0.05, -0.12], [-0.3 * l, -0.2], [-0.55 * l, -0.2]], [0.07, 0.09, 0.09, 0.08, 0.06], p.extra);
        attaccaCoda(c, H * 0.32);
      }
      break;
    }
    case 'mucca': {
      // Mucca: corpo grande e squadrato, musone largo e rosa con le narici, orecchie di lato, cornini,
      // macchie grandi, coda sottile col fiocco, la mammella rosa (le femmine adulte).
      for (const m of muso.children) if (m instanceof THREE.Mesh) m.material = mat(p.muso, { rim: 0.15 });
      naso.visible = false;
      for (const s of [-1, 1]) {
        const n = mesh(geo.palla(0.045, 8), mat(varia(p.muso, 0, -0.35), { rim: 0 }), s * 0.12, F.muso.y + 0.04, davantiMuso - 0.04);
        n.scale.set(1, 1.3, 0.5);
        n.userData.senzaContorno = true;
        testa.add(n);
      }
      for (const s of [-1, 1]) {
        orecchioFoglia(s, 0.26, 0.1, p.corpo, '#f4b0b8', 1.55, 0.12, -0.08, 0.38);
        if (!piccolo) {
          const corno = mesh(geo.cono(0.05, a.sesso === 'm' ? 0.24 : 0.16, 8), mat('#f4ead2'), s * 0.27, 0.36, -0.06);
          corno.rotation.z = -s * 1.0;
          testa.add(corno);
        }
      }
      // ciuffo in fronte
      const ciuffo = mesh(geo.palla(0.1, 8), pelo(p.corpo), 0, 0.4, 0.06);
      ciuffo.scale.set(1.3, 0.5, 0.9);
      testa.add(ciuffo);
      const r = rng(hash(a.id + 'macchie'));
      if (asp.manto % 4 < 2) {
        for (let k = 0; k < 6; k++) {
          const d = new THREE.Vector3(r() * 2 - 1, r() * 1.6 - 0.8, -0.2 - r() * 0.8).normalize();
          const m = mesh(geo.palla(0.13 + r() * 0.06, 10), mat(p.extra, { rim: 0 }), d.x * 0.335, d.y * 0.335, d.z * 0.335);
          m.scale.set(1, 1, 0.3);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
          m.userData.senzaContorno = true;
          busto.add(m);
        }
        for (let k = 0; k < 2; k++) {
          const th = (r() < 0.5 ? -1 : 1) * (1.6 + r() * 0.9), y = 0.1 + r() * 0.4;
          const d = new THREE.Vector3(Math.sin(th), y, Math.cos(th)).normalize();
          const m = mesh(geo.palla(0.14, 10), mat(p.extra, { rim: 0 }), d.x * 0.45, d.y * 0.42, d.z * 0.44);
          m.scale.set(1, 1, 0.3);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
          m.userData.senzaContorno = true;
          testa.add(m);
        }
      }
      if (a.sesso === 'f' && !piccolo) {
        const mam = mesh(geo.palla(0.1, 12), mat('#f4b8bc', { rim: 0.2 }), 0, -0.2, 0.3);
        mam.userData.senzaContorno = true;
        sulBusto(mam);
      }
      const c = codaLungo([[0, 0], [-0.15, -0.05], [-0.42, -0.06]], [0.03], p.corpo);
      c.add(mesh(geo.palla(0.065, 8), pelo(p.extra === p.corpo ? p.zampe : p.extra), 0, -0.46, -0.06));
      c.userData.punta = new THREE.Vector3(0, -0.46, -0.06);
      attaccaCoda(c, H * 0.32);
      break;
    }
    case 'maiale': {
      // Maiale: corpo lungo a botte, zampe corte, niente collo, grugno a disco con le narici,
      // orecchie a punta piegate in avanti, codina a ricciolo.
      for (const m of muso.children) if (m instanceof THREE.Mesh) m.material = mat(p.corpo, { rim: 0.2 });
      naso.visible = false;
      const grugno = mesh(geo.cil(F.muso.punta * 1.05, F.muso.punta * 1.05, 0.06, 18), mat(p.muso, { rim: 0.2 }), 0, F.muso.y + 0.02, davantiMuso - 0.08);
      grugno.rotation.x = Math.PI / 2;
      testa.add(grugno);
      for (const s of [-1, 1]) {
        const n = mesh(geo.palla(0.035, 8), mat(varia(p.muso, 0, -0.3), { rim: 0 }), s * 0.06, F.muso.y + 0.02, davantiMuso - 0.045);
        n.scale.set(0.8, 1.3, 0.4);
        n.userData.senzaContorno = true;
        testa.add(n);
      }
      for (const s of [-1, 1]) {
        const o = orecchio(s * 0.26, 0.16, 0.26, p.corpo, 0.45, varia(p.muso, 0, 0.05), 0.28, -0.04);
        o.rotation.x = 0.75;
      }
      if (asp.manto % 4 === 1) {
        const r = rng(hash(a.id + 'macchie'));
        for (let k = 0; k < 5; k++) {
          const d = new THREE.Vector3(r() * 2 - 1, r() * 1.6 - 0.8, -0.1 - r() * 0.9).normalize();
          const m = mesh(geo.palla(0.1 + r() * 0.04, 10), mat(p.extra, { rim: 0 }), d.x * 0.335, d.y * 0.335, d.z * 0.335);
          m.scale.set(1, 1, 0.3);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
          m.userData.senzaContorno = true;
          busto.add(m);
        }
      } else if (asp.manto % 4 === 2) {
        // cinta: la fascia chiara intorno alle spalle (e le zampe davanti chiare)
        const fascia = mesh(new THREE.TorusGeometry(0.33, 0.075, 8, 24), mat(p.extra, { rim: 0.2 }), 0, 0.16, 0);
        fascia.rotation.x = Math.PI / 2;
        fascia.userData.senzaContorno = true;
        busto.add(fascia);
      }
      const c = new THREE.Group();
      const ricciolo = mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 14, Math.PI * 1.7), mat(p.corpo), 0, 0, -0.04);
      ricciolo.rotation.y = Math.PI / 2;
      c.add(ricciolo);
      c.userData.punta = new THREE.Vector3(0, 0.05, -0.04);
      attaccaCoda(c, H * 0.2);
      break;
    }
    case 'uccellino':
    case 'papera': {
      creaUccello();
      break;
    }
  }

  /** Uccellino (pettirosso, cinciallegra, passero, merlo) e papera: corpo a goccia, ali chiuse sui fianchi, becco, zampette sottili. */
  function creaUccello() {
    const papera = a.specie === 'papera';
    const corpoC = papera && piccolo ? '#ffe270' : p.corpo;
    const panciaC = papera && piccolo ? '#fff2b0' : p.pancia;
    // per gli uccelli il busto sta dritto come prima (pancia davanti), solo un po' inclinato
    tronco.rotation.x = 0;
    tronco.userData.inclina = 0;
    tronco.position.set(0, 0, 0);
    busto.material = pelo(corpoC);
    pancia.material = mat(panciaC, { rim: 0.2 });
    pancia.userData.senzaContorno = false;
    if (papera) {
      // la papera: corpo orizzontale a barchetta, collo dritto, testa tonda, becco piatto
      busto.rotation.x = Math.PI / 2 - 0.12;
      busto.scale.set(0.46 / 0.68, 0.8 / 0.68 * kCorpo, 0.44 / 0.68);
      busto.position.set(0, 0.36, 0);
      pancia.position.set(0, 0.0, 0.12);
      colloG.position.set(0, 0.52, 0.22);
      colloG.rotation.x = -0.1;
      colloG.clear();
      colloG.add(mesh(geo.capsula(0.1, 0.2), pelo(corpoC), 0, 0.1, 0));
      colloG.add(perno);
      perno.position.set(0, 0.22, 0);
      perno.rotation.x = 0.1;
      perno.userData.base = 0.1;
      testa.position.set(0, 0.2, 0);
    } else {
      // l'uccellino: una pallina a goccia un po' inclinata, la testa attaccata al corpo
      busto.rotation.x = 0.45;
      busto.scale.set(0.44 / 0.68, 0.5 / 0.68 * kCorpo, 0.46 / 0.68);
      busto.position.set(0, 0.38, 0);
      pancia.position.set(0, -0.02, 0.12);
      colloG.position.set(0, 0.56, 0.08);
      colloG.rotation.x = 0;
      perno.position.set(0, 0.06, 0);
      perno.rotation.x = 0;
      perno.userData.base = 0;
      testa.position.set(0, 0, 0);
    }
    muso.visible = false;
    naso.visible = false;
    bocca.visible = false;
    const testaC = papera ? (piccolo ? '#ffe270' : a.sesso === 'm' || asp.manto % 4 !== 1 ? p.extra : p.corpo) : p.corpo;
    cranio.material = pelo(testaC);
    if (!papera) {
      const faccia = mesh(geo.palla(0.36, 20), mat(p.muso, { rim: 0.15 }), 0, -0.14, 0.14);
      faccia.scale.set(1.05, 0.8, 0.85);
      faccia.userData.senzaContorno = true;
      testa.add(faccia);
      const capp = mesh(geo.palla(0.47, 20), pelo(p.extra), 0, 0.07, -0.03);
      capp.scale.set(1.02, 0.82, 1.0);
      testa.add(capp);
      const becco = mesh(geo.cono(0.07, 0.24, 10), mat(asp.manto % 4 === 3 ? '#f2a020' : '#4a3a2e', { rim: 0.2 }), 0, -0.04, 0.54);
      becco.rotation.x = Math.PI / 2;
      testa.add(becco);
      // il petto colorato (rosso del pettirosso, giallo della cinciallegra) sul davanti del corpo
      pancia.material = mat(p.pancia, { rim: 0.2 });
    } else {
      const becco = mesh(geo.palla(0.15, 14), mat(piccolo ? '#f6b040' : p.muso, { rim: 0.2 }), 0, -0.12, 0.47);
      becco.scale.set(1.0, 0.36, 1.35);
      testa.add(becco);
      if (!piccolo && asp.manto % 4 === 1 && a.sesso === 'm') {
        const coll = mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 20), mat('#ffffff', { rim: 0 }), 0, 0.02, 0);
        coll.rotation.x = Math.PI / 2;
        colloG.add(coll);
      }
    }
    // le ali chiuse sui fianchi (fanno da "braccia" per gli attrezzi)
    const alaC = papera ? varia(corpoC, 0, -0.06) : p.extra;
    for (const s of [-1, 1]) {
      const spalla = new THREE.Group();
      spalla.position.set(s * (papera ? 0.21 : 0.2), papera ? 0.44 : 0.48, papera ? 0.06 : 0.02);
      tronco.add(spalla);
      spalle.push(spalla);
      const z = new THREE.Group();
      const ala = mesh(geo.palla(0.2, 12), pelo(alaC), 0, -0.1, -0.08);
      ala.scale.set(0.3, papera ? 0.55 : 0.8, papera ? 1.35 : 1.0);
      ala.rotation.x = papera ? -0.1 : 0.4;
      z.add(ala);
      z.userData.lunghezza = 0.25;
      spalla.add(z);
      zampe.push(z);
    }
    // zampette sottili (palmate per la papera)
    for (const s of [-1, 1]) {
      const z = new THREE.Group();
      z.position.set(s * 0.1, 0.22, 0.0);
      const colZ = papera ? p.zampe : '#c89a6a';
      z.add(mesh(geo.cil(0.02, 0.02, 0.2, 6), mat(colZ), 0, -0.11, 0));
      const piede = mesh(geo.palla(0.07, 10), mat(colZ), 0, -0.2, 0.04);
      piede.scale.set(papera ? 1.3 : 0.8, 0.25, papera ? 1.5 : 1.2);
      z.add(piede);
      z.userData.lunghezza = 0.22;
      corpo.add(z);
      zampe.push(z);
    }
    // la coda: un ventaglio di penne (alzata nella papera)
    const c = new THREE.Group();
    for (const [rz, dx] of [[0.3, -0.05], [0, 0], [-0.3, 0.05]]) {
      const penna = mesh(geo.palla(0.08, 8), pelo(papera ? corpoC : p.extra), dx, 0.02, -0.12);
      penna.scale.set(0.6, 0.28, 1.8);
      penna.rotation.set(papera ? -0.7 : 0.5, rz, 0);
      c.add(penna);
    }
    c.userData.punta = new THREE.Vector3(0, papera ? 0.12 : -0.08, -0.26);
    c.position.set(0, papera ? 0.42 : 0.3, papera ? -0.34 : -0.2);
    corpo.add(c);
    coda = c;
  }

  // orecchie più piccole o più grandi
  for (const o of orecchieDi) o.scale.multiplyScalar(0.85 + asp.orecchie * 0.3);

  // ---- segno particolare: unico nel villaggio ----
  const codaM = coda as THREE.Object3D | null;
  const collo = (oggetto: THREE.Object3D) => {
    oggetto.position.y -= 0.42;
    testa.add(oggetto);
  };
  switch (t.segno) {
    case 'orecchio piegato': {
      const o = orecchieDi.find((e) => Math.sign(e.position.x) === t.lato) ?? orecchieDi[0];
      if (o) {
        o.rotation.x = 1.1;
        o.scale.y *= 0.8;
      }
      break;
    }
    case 'ciuffo ribelle':
      for (let k = 0; k < 5; k++) {
        const c = mesh(geo.cono(0.06, 0.26, 6), pelo(varia(p.corpo, 0, 0.08)), (k - 2) * 0.05, 0.48, 0.1 - Math.abs(k - 2) * 0.03);
        c.rotation.set(-0.4, 0, (2 - k) * 0.35);
        testa.add(c);
      }
      break;
    case 'macchia a cuore': {
      const cuore = new THREE.Group();
      // cuore chiaro sui manti scuri, rosato sui manti chiari: si deve vedere sempre
      const mantoChiaro = new THREE.Color(base.corpo).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
      const chiaro = mat(mantoChiaro ? '#e0607a' : '#fff3e6', { rim: 0 });
      for (const x of [-0.045, 0.045]) cuore.add(mesh(geo.palla(0.06, 10), chiaro, x, 0.03, 0));
      const punta = mesh(geo.cono(0.085, 0.11, 10), chiaro, 0, -0.04, 0);
      punta.rotation.z = Math.PI;
      cuore.add(punta);
      cuore.scale.z = 0.4;
      cuore.traverse((c) => (c.userData.senzaContorno = true));
      // sul fianco, senza farsi stirare dal busto
      const fianco = new THREE.Group();
      fianco.add(cuore);
      fianco.position.set(t.lato * 0.335, uccello ? 0.05 : 0, uccello ? 0 : -0.1);
      cuore.rotation.y = t.lato * Math.PI / 2;
      if (!uccello) cuore.rotation.x = -Math.PI / 2;
      sulBusto(fianco, uccello ? 1 : 0.9);
      break;
    }
    case 'lentiggini':
      for (const x of [-1, 1]) for (let k = 0; k < 4; k++) {
        const l = mesh(geo.palla(0.017, 6), mat('#7a4a30', { rim: 0 }), x * (0.2 + k * 0.035), -0.1 + (k % 2) * 0.035, 0.39 - k * 0.02);
        l.userData.senzaContorno = true;
        testa.add(l);
      }
      break;
    case 'stellina in fronte': {
      const stella = mesh(new THREE.CircleGeometry(0.09, 5), mat('#fff7d6', { rim: 0, side: THREE.DoubleSide }), 0, 0.22, 0.43);
      stella.rotation.x = -0.3;
      stella.userData.senzaContorno = true;
      testa.add(stella);
      break;
    }
    case 'codaM extra folta':
      if (codaM) codaM.scale.setScalar(1.55);
      break;
    case 'fiocco rosso': {
      const f = new THREE.Group();
      for (const s of [-1, 1]) {
        const ala = mesh(geo.cono(0.08, 0.16, 8), mat('#e03a4a'), s * 0.08, 0, 0);
        ala.rotation.z = -s * Math.PI / 2;
        f.add(ala);
      }
      f.add(mesh(geo.palla(0.045, 8), mat('#c02a3a'), 0, 0, 0));
      f.position.set(t.lato * 0.24, 0.36, 0.12);
      f.rotation.z = t.lato * 0.4;
      testa.add(f);
      break;
    }
    case 'bandana blu': {
      const b = mesh(new THREE.TorusGeometry(0.25, 0.055, 8, 18), mat('#3a6ac8'), 0, 0, 0.02);
      b.rotation.x = Math.PI / 2;
      collo(b);
      const triangolo = mesh(geo.cono(0.13, 0.2, 3), mat('#3a6ac8'), 0, -0.54, 0.22);
      triangolo.rotation.set(0.3, 0, Math.PI);
      testa.add(triangolo);
      break;
    }
    case 'occhiali tondi':
      for (const x of [-0.19, 0.19]) {
        const lente = mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 20), mat('#3a2a1e', { rim: 0 }), x, -0.02, 0.44);
        lente.userData.senzaContorno = true;
        testa.add(lente);
      }
      testa.add(mesh(geo.scatola(0.12, 0.02, 0.02), mat('#3a2a1e', { rim: 0 }), 0, 0.0, 0.46));
      break;
    case 'collana di bacche':
      for (let k = 0; k < 11; k++) {
        const ang = (k / 11) * Math.PI * 2;
        const b = mesh(geo.palla(0.04, 8), mat(k % 2 ? '#d8344a' : '#7a3aa8', { rim: 0.3 }), Math.sin(ang) * 0.25, 0, Math.cos(ang) * 0.25 + 0.02);
        b.userData.senzaContorno = true;
        collo(b);
      }
      break;
    case 'cappellino di foglia': {
      const foglia = mesh(geo.palla(0.2, 10), mat('#6aa84a', { rim: 0.3 }), 0, 0.45, -0.02);
      foglia.scale.set(1.1, 0.18, 0.8);
      foglia.rotation.z = t.lato * 0.25;
      testa.add(foglia);
      testa.add(mesh(geo.cil(0.012, 0.012, 0.12, 5), mat('#5a3a20'), 0, 0.52, -0.02));
      break;
    }
    case 'campanellino': {
      const nastro = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 18), mat('#d8344a'), 0, 0, 0.02);
      nastro.rotation.x = Math.PI / 2;
      collo(nastro);
      const camp = mesh(geo.palla(0.06, 10), mat('#f2c230', { rim: 0.6, emissive: '#806010', emissiveIntensity: 0.2 }), 0, -0.48, 0.27);
      testa.add(camp);
      break;
    }
    case 'punta della codaM scura':
      if (codaM) {
        const pt = (codaM.userData.punta as THREE.Vector3 | undefined) ?? new THREE.Vector3();
        codaM.add(mesh(geo.palla(0.085), mat('#2e1c12'), pt.x, pt.y, pt.z));
      }
      break;
    case 'nasino a cuore': {
      naso.visible = false;
      const cuore = new THREE.Group();
      const rosa = mat('#e8607a', { rim: 0 });
      for (const x of [-0.028, 0.028]) cuore.add(mesh(geo.palla(0.037, 10), rosa, x, 0.015, 0));
      const punta = mesh(geo.cono(0.054, 0.07, 10), rosa, 0, -0.03, 0);
      punta.rotation.z = Math.PI;
      cuore.add(punta);
      cuore.scale.z = 0.6;
      cuore.position.copy(naso.position);
      cuore.position.z += 0.01;
      cuore.traverse((c) => (c.userData.senzaContorno = true));
      testa.add(cuore);
      break;
    }
    case 'fiore all\'orecchio': {
      const f = fiore('#ffffff', '#f2c230');
      f.position.set(t.lato * 0.3, 0.3, 0.16);
      f.rotation.set(-0.3, t.lato * 0.5, 0);
      testa.add(f);
      break;
    }
    case 'corona di margherite':
      for (let k = 0; k < 7; k++) {
        const ang = -1.3 + (k / 6) * 2.6;
        const f = fiore(k % 2 ? '#ffffff' : '#ffd6e4', '#f2c230');
        f.scale.setScalar(1.05);
        f.position.set(Math.sin(ang) * 0.34, 0.37 + Math.cos(ang) * 0.06, Math.cos(ang) * 0.14 - 0.02);
        f.rotation.set(-1.1, ang * 0.6, 0);
        testa.add(f);
      }
      break;
    case 'sciarpa a righe': {
      const righe = mat('#ffffff', { map: texture(64, strisce('#f2c230', '#e05a4a', 6)) });
      const sc = mesh(new THREE.TorusGeometry(0.25, 0.065, 8, 18), righe, 0, 0, 0.02);
      sc.rotation.x = Math.PI / 2;
      collo(sc);
      const lembo = mesh(geo.scatola(0.11, 0.24, 0.05), righe, -t.lato * 0.12, -0.58, 0.24);
      lembo.rotation.z = t.lato * 0.25;
      testa.add(lembo);
      break;
    }
    case 'baffi lunghi': {
      const davanti = davantiMuso;
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const b = mesh(geo.capsula(0.006, 0.2), mat('#3a2418', { rim: 0 }), s * (F.muso.punta + 0.1), naso.position.y - 0.04 + (k - 1) * 0.03, davanti - 0.06);
        b.rotation.z = s * (Math.PI / 2 + (k - 1) * 0.18);
        b.userData.senzaContorno = true;
        testa.add(b);
      }
      break;
    }
    case 'dentino sporgente': {
      const d = mesh(geo.scatola(0.045, 0.055, 0.02), mat('#ffffff', { rim: 0 }), t.lato * 0.025, bocca.position.y - 0.05, davantiMuso - F.muso.punta * 0.4);
      d.rotation.x = -0.3;
      testa.add(d);
      break;
    }
    case 'neo sulla guancia': {
      const scuro = new THREE.Color(base.corpo).getHSL({ h: 0, s: 0, l: 0 }).l < 0.35;
      const n = mesh(geo.palla(0.026, 8), mat(scuro ? '#f4e6d6' : '#5a3424', { rim: 0 }), t.lato * 0.24, -0.2, 0.38);
      n.userData.senzaContorno = true;
      testa.add(n);
      break;
    }
    case 'sopracciglia folte':
      for (const x of [-0.19, 0.19]) {
        const s = mesh(geo.capsula(0.03, 0.1), pelo(varia(p.corpo, 0, -0.18)), x, 0.13, 0.4);
        s.rotation.z = Math.PI / 2 + Math.sign(x) * 0.2;
        s.scale.z = 0.6;
        testa.add(s);
      }
      break;
    case 'zainetto': {
      const z = new THREE.Group();
      const sacca = mesh(geo.capsula(0.17, 0.08), mat('#5a8a3a', { rim: 0.3 }), 0, 0, 0);
      sacca.scale.z = 0.55;
      z.add(sacca);
      const tasca = mesh(geo.scatola(0.2, 0.1, 0.06), mat('#477030'), 0, -0.06, -0.08);
      z.add(tasca);
      for (const x of [-0.17, 0.17]) {
        const cinghia = mesh(new THREE.TorusGeometry(0.13, 0.018, 4, 12, Math.PI), mat('#7a5232'), x, 0.04, 0.12);
        cinghia.rotation.set(0, Math.PI / 2, -Math.PI / 2);
        z.add(cinghia);
      }
      if (uccello) {
        z.position.set(0, -0.02, -0.33);
        sulBusto(z, 0.9);
      } else {
        // sulla schiena: il "sopra" dello zaino guarda verso la testa
        z.position.set(0, 0.05, -0.33);
        sulBusto(z, 1.05);
      }
      break;
    }
    case 'nastro sulla codaM': {
      const f = fiocco('#4a8ad8');
      if (codaM) {
        const pt = (codaM.userData.punta as THREE.Vector3 | undefined) ?? new THREE.Vector3();
        f.scale.setScalar(1.1);
        f.position.copy(pt).multiplyScalar(0.6);
        codaM.add(f);
      } else {
        f.position.set(t.lato * 0.24, 0.36, 0.12);
        testa.add(f);
      }
      break;
    }
    case 'una zampa bianca': {
      const z = zampe[t.lato > 0 ? 1 : 0];
      for (const c of z.children) if (c instanceof THREE.Mesh) c.material = mat('#fbf8f2');
      break;
    }
    case 'pancia a pois':
      for (const [x, y] of [[-0.09, 0.08], [0.08, 0.12], [0.0, -0.02], [-0.07, -0.12], [0.1, -0.08]]) {
        const d = mesh(geo.palla(0.035, 8), mat(varia(p.pancia, 0, -0.14), { rim: 0 }), x, y, 0.18);
        d.scale.z = 0.4;
        d.userData.senzaContorno = true;
        pancia.add(d);
      }
      break;
    case 'orecchino d\'oro': {
      const o = orecchieDi.find((e) => Math.sign(e.position.x) === t.lato) ?? orecchieDi[0];
      const anello = mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 14), mat('#f2c230', { rim: 0.6, emissive: '#806010', emissiveIntensity: 0.2 }), 0, 0.03, 0.08);
      anello.userData.senzaContorno = true;
      anello.scale.setScalar(1.3);
      (o ?? testa).add(anello);
      break;
    }
    case 'ghianda al collo': {
      const filo = mesh(new THREE.TorusGeometry(0.25, 0.01, 4, 20), mat('#7a5232', { rim: 0 }), 0, 0, 0.02);
      filo.rotation.x = Math.PI / 2;
      collo(filo);
      const g = new THREE.Group();
      const frutto = mesh(geo.palla(0.06, 10), mat('#c8893e', { rim: 0.4 }), 0, -0.02, 0);
      frutto.scale.y = 1.25;
      g.add(frutto);
      const cappello = mesh(geo.palla(0.065, 10), mat('#6a4428'), 0, 0.04, 0);
      cappello.scale.y = 0.6;
      g.add(cappello);
      g.position.set(0, -0.53, 0.29);
      testa.add(g);
      break;
    }
    case 'cappellino a fungo': {
      const c = new THREE.Group();
      const cappa = mesh(geo.palla(0.2, 16), mat('#d8344a', { rim: 0.3 }), 0, 0.06, 0);
      cappa.scale.set(1, 0.6, 1);
      c.add(cappa);
      for (const [x, z] of [[0.08, 0.1], [-0.1, 0.05], [0.02, -0.12], [0.13, -0.06], [-0.05, 0.15]]) {
        const pois = mesh(geo.palla(0.03, 6), mat('#ffffff', { rim: 0 }), x, 0.15, z);
        pois.scale.y = 0.5;
        pois.userData.senzaContorno = true;
        c.add(pois);
      }
      c.position.set(t.lato * 0.12, 0.42, 0.02);
      c.rotation.z = -t.lato * 0.3;
      testa.add(c);
      break;
    }
    case 'striscia sul dorso':
      for (let k = 0; k < 5; k++) {
        const ang = 0.5 + k * 0.32;
        const m = mesh(geo.palla(0.07, 8), mat(varia(p.corpo, 0, -0.18), { rim: 0 }), 0, Math.cos(ang) * 0.335, -Math.sin(ang) * 0.335);
        m.scale.set(1, 1, 0.4);
        m.lookAt(0, 0, 0);
        m.userData.senzaContorno = true;
        busto.add(m);
      }
      break;
  }

  vesti(a, { testa, busto, pancia, corpo, collo, fiore, fiocco }, divisa);
  gruppo.userData.divisa = divisa;

  contorno(corpo);
  gruppo.userData.taglia = t.taglia * F.taglia;
  const m: ModelloAnimale = { gruppo, corpo, busto, pancia, testa, zampe, coda: coda as THREE.Object3D | null, occhi, accessorio: null, mestiere: null,
    ossa: { tronco, spalle, perno, alza: F.alza } };
  posa(m, 0);
  aggiornaMestiere(m, a.mestiere);
  gruppo.userData.id = a.id;
  return m;
}

// ---------- vestiti che si fanno da soli (e la divisa da lavoro) ----------

/** Dove c'è già qualcosa per via del segno particolare. */
function partiOccupate(a: Animale): Set<Parte> {
  const o = new Set<Parte>();
  const tr = a.aspetto?.tratto ?? '';
  if (['cappellino di foglia', 'cappellino a fungo', 'corona di margherite', 'fiocco rosso', 'ciuffo ribelle'].includes(tr)) o.add('testa');
  if (['bandana blu', 'collana di bacche', 'campanellino', 'sciarpa a righe', 'ghianda al collo'].includes(tr)) o.add('collo');
  if (tr === 'pancia a pois') o.add('corpo');
  if (tr === 'zainetto') o.add('schiena');
  return o;
}

/** Veste l'animale: i suoi vestiti e, se sta lavorando, la divisa del suo mestiere al posto loro. */
function vesti(a: Animale, at: Omit<Attacchi, 'testaVera'>, divisa: boolean) {
  const copia = { ...a };
  if (!copia.vestiti || copia.vestiti.some((id) => !capo(id))) aggiornaGuardaroba(copia);
  const def = divisa ? defMestiere(a.mestiere) : undefined;
  const occupate = partiOccupate(a);
  // la divisa si mette sempre, anche sopra il segno particolare
  for (const p of Object.keys(def?.divisa ?? {})) occupate.delete(p as Parte);
  if (a.specie === 'riccio') occupate.add('schiena'); // gli aculei!
  // i cappelli stanno sopra gli aculei del riccio e tra le orecchie lunghe
  const cappelli = new THREE.Group();
  if (a.specie === 'riccio') { cappelli.position.set(0, 0.12, -0.04); cappelli.scale.setScalar(1.1); }
  at.testa.add(cappelli);
  for (const k of conDivisa(indossati(copia), def?.divisa)) if (!occupate.has(k.parte)) mettiCapo(k, { ...at, testaVera: at.testa, testa: k.parte === 'testa' ? cappelli : at.testa });
  if (def?.occhiali) mettiOcchiali(at.testa, a.specie === 'tasso');
}

/**
 * Posa tra "a quattro zampe" (e = 0, come un animale vero) e "in piedi sulle zampe dietro" (e = 1, per lavorare):
 * il tronco gira sulle anche, le zampe davanti diventano braccia che pendono giù, la testa resta dritta.
 */
export function posa(m: ModelloAnimale, e: number) {
  const { tronco, spalle, perno, alza } = m.ossa;
  const a = e * alza;
  tronco.rotation.x = (tronco.userData.inclina as number) * (1 - e) - a;
  spalle.forEach((s) => {
    s.rotation.x = a;
    s.rotation.z = -Math.sign(s.position.x) * 0.25 * e;
  });
  perno.rotation.x = (perno.userData.base as number) + a;
}

/** Quanto oscilla una zampa camminando: le zampe lunghe (cavallo, daino) fanno passi più stretti, se no sembrano forbici. */
export function ampiezzaPasso(m: ModelloAnimale): number {
  const l = (m.zampe[2]?.userData.lunghezza as number | undefined) ?? 0.25;
  return THREE.MathUtils.clamp(0.3 / l, 0.32, 1);
}

/**
 * L'attrezzo del mestiere in mano (martello, mestolo, pennello...): si vede solo mentre lavora.
 * (La divisa invece è nel modello: vedi creaAnimale(a, divisa).)
 */
export function aggiornaMestiere(m: ModelloAnimale, mestiere: string | null) {
  if (m.mestiere === mestiere) return;
  if (m.accessorio) m.accessorio.parent?.remove(m.accessorio);
  m.accessorio = null;
  m.mestiere = mestiere;
  const id = defMestiere(mestiere)?.inMano;
  if (!id) return;
  const g = contorno(creaAttrezzoInMano(id));
  // in fondo alla zampa davanti (la "mano")
  const lung = (m.zampe[0].userData.lunghezza as number | undefined) ?? 0.2;
  g.position.set(0, -lung * 0.85, 0.02);
  m.zampe[0].add(g);
  // si tiene in mano solo per lavorare (il nome "grembiule" è rimasto da quando era un grembiule)
  g.userData.grembiule = true;
  g.visible = false;
  m.accessorio = g;
}

/** Il simbolo di ogni mestiere (fumetti mentre lavora). */
export const SIMBOLI_MESTIERE: Record<string, string> = Object.fromEntries(MESTIERI.map((x) => [x.id, x.simbolo]));
export { simboloMestiere };

// ---------- uovo e nido ----------

export function creaUovo(colore: string): THREE.Group {
  const g = new THREE.Group();
  const guscio = mesh(geo.palla(0.3), mat('#fff7e6', { rim: 0.5 }), 0, 0.38, 0);
  guscio.scale.set(1, 1.3, 1);
  guscio.name = 'guscio';
  g.add(guscio);
  for (const [x, y, z, r] of [[0.16, 0.48, 0.2, 0.07], [-0.2, 0.32, 0.14, 0.06], [0.05, 0.22, 0.26, 0.05], [-0.06, 0.6, 0.18, 0.05], [0.24, 0.3, -0.05, 0.05]]) {
    const m = mesh(geo.palla(r, 10), mat(colore, { rim: 0 }), x, y, z);
    m.userData.senzaContorno = true;
    g.add(m);
  }
  return contorno(g);
}

export function creaNido(): THREE.Group {
  const g = new THREE.Group();
  const paglia = mat('#ffffff', { map: texture(64, macchie(['#b88a58', '#9c7348', '#d4a870', '#7d5a36'], 1.4, 7), 3) });
  const anello = mesh(new THREE.TorusGeometry(0.75, 0.24, 10, 20), paglia);
  anello.rotation.x = Math.PI / 2;
  anello.position.y = 0.14;
  g.add(anello);
  g.add(mesh(geo.cil(0.72, 0.6, 0.12, 20), mat('#7d5a36'), 0, 0.06, 0));
  return contorno(g);
}

// ---------- corvo ----------

export interface ModelloCorvo { gruppo: THREE.Group; testa: THREE.Group; ali: THREE.Object3D[] }

export function creaCorvo(): ModelloCorvo {
  const gruppo = new THREE.Group();
  gruppo.add(ombra(0.5));
  const legno = mat('#ffffff', { map: texture(64, macchie(['#8a6440', '#6e4e30', '#a07852'], 1, 3)) });
  gruppo.add(contorno(mesh(geo.cil(0.12, 0.15, 1.6, 10), legno, 0, 0.8, 0)));
  const uccello = new THREE.Group();
  uccello.position.y = 1.6;
  gruppo.add(uccello);
  const nero = mat('#2e3142', { rim: 0.6 });
  const corpo = mesh(geo.palla(0.32), nero, 0, 0.3, 0);
  corpo.scale.set(0.95, 1.1, 1);
  uccello.add(corpo);
  uccello.add(mesh(geo.palla(0.2), mat('#454a63', { rim: 0.3 }), 0, 0.26, 0.17));
  for (const x of [-0.08, 0.08]) uccello.add(mesh(geo.cil(0.03, 0.03, 0.14, 6), mat('#e0a040'), x, 0.02, 0.06));
  const coda = mesh(geo.scatola(0.26, 0.05, 0.38), nero, 0, 0.18, -0.36);
  coda.rotation.x = 0.5;
  uccello.add(coda);
  const ali: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const perno = new THREE.Group();
    perno.position.set(s * 0.27, 0.42, 0);
    const ala = mesh(geo.palla(0.22), mat('#262836', { rim: 0.5 }), s * 0.05, -0.12, -0.04);
    ala.scale.set(0.35, 1, 1.25);
    perno.add(ala);
    uccello.add(perno);
    ali.push(perno);
  }
  const testa = new THREE.Group();
  testa.position.set(0, 0.78, 0.04);
  uccello.add(testa);
  testa.add(mesh(geo.palla(0.28), nero));
  const becco = mesh(geo.cono(0.085, 0.34, 10), mat('#565a6a', { rim: 0.4 }), 0, -0.05, 0.37);
  becco.rotation.x = Math.PI / 2;
  testa.add(becco);
  for (const x of [-0.12, 0.12]) {
    const o = mesh(geo.palla(0.075), mat('#ffffff', { rim: 0 }), x, 0.06, 0.21);
    o.userData.senzaContorno = true;
    testa.add(o);
    const p = mesh(geo.palla(0.045), mat('#111111', { rim: 0 }), x * 1.05, 0.06, 0.27);
    p.userData.senzaContorno = true;
    testa.add(p);
  }
  const cappello = new THREE.Group();
  cappello.position.y = 0.2;
  cappello.rotation.z = -0.12;
  cappello.add(mesh(geo.cil(0.38, 0.38, 0.04, 20), mat('#7a5a3c')));
  cappello.add(mesh(geo.cil(0.18, 0.22, 0.22, 20), mat('#7a5a3c'), 0, 0.12, 0));
  cappello.add(mesh(geo.cil(0.226, 0.226, 0.06, 20), mat('#b5452e'), 0, 0.06, 0));
  const piuma1 = mesh(geo.capsula(0.04, 0.36), mat('#e2683a'), 0.2, 0.3, -0.05);
  piuma1.rotation.z = -0.6;
  cappello.add(piuma1);
  const piuma2 = mesh(geo.capsula(0.035, 0.3), mat('#f2c94c'), 0.25, 0.24, -0.1);
  piuma2.rotation.z = -0.9;
  cappello.add(piuma2);
  testa.add(cappello);
  contorno(uccello);
  return { gruppo, testa, ali };
}

// ---------- ambiente ----------

// verdi più naturali e profondi (meno pastello): atmosfera più da avventura che da cartolina
const VERDI = ['#5d9a4a', '#4e8a40', '#6ba552', '#58924a'];
const cacheChioma = new Map<number, THREE.MeshToonMaterial>();
function chioma(i: number) {
  const k = i % VERDI.length;
  if (!cacheChioma.has(k)) {
    const v = VERDI[k];
    const c = new THREE.Color(v);
    cacheChioma.set(k, materiale({ color: '#ffffff', map: texture(64, macchie([v, '#' + c.clone().offsetHSL(0, 0, 0.08).getHexString(), '#' + c.clone().offsetHSL(0.02, 0, -0.1).getHexString()], 1, k + 5)), rim: 0.3 }));
  }
  return cacheChioma.get(k)!;
}
export const corteccia = () => mat('#ffffff', { map: texture(64, macchie(['#8a5a36', '#6d4428', '#a06a40'], 1, 11)) });

export function creaAlbero(scala = 1, tinta = 0, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.16, 0.24, 1.2, 8), corteccia(), 0, 0.6, 0));
  // chioma a nuvola: tante palle morbide
  for (const [x, y, z, r] of [[0, 1.55, 0, 0.8], [0.45, 1.35, 0.1, 0.55], [-0.45, 1.4, -0.05, 0.58], [0.1, 2.05, -0.1, 0.6], [-0.15, 1.35, 0.42, 0.5]])
    g.add(mesh(geo.palla(r, 12), chioma(tinta), x, y, z));
  g.add(ombra(0.9));
  g.scale.setScalar(scala);
  return conContorno ? contorno(g) : g;
}

export function creaPino(scala = 1, conContorno = true): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.12, 0.16, 0.6, 8), corteccia(), 0, 0.3, 0));
  for (const [y, r, h] of [[0.9, 0.85, 1.1], [1.5, 0.65, 0.95], [2.0, 0.42, 0.8]]) g.add(mesh(geo.cono(r, h, 10), mat('#3d7550', { rim: 0.2 }), 0, y, 0));
  g.add(ombra(0.8));
  g.scale.setScalar(scala);
  return conContorno ? contorno(g) : g;
}

export function creaFiore(colore: string): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.02, 0.02, 0.25, 5), mat('#3c8a3c', { rim: 0 }), 0, 0.12, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = mesh(geo.palla(0.05, 8), mat(colore, { rim: 0.2 }), Math.cos(a) * 0.06, 0.27, Math.sin(a) * 0.06);
    g.add(p);
  }
  g.add(mesh(geo.palla(0.04, 8), mat('#ffd34d', { rim: 0 }), 0, 0.29, 0));
  return g;
}

// ---------- castagno e castagne ----------

export function creaCastagno(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.28, 0.42, 1.8, 10), corteccia(), 0, 0.9, 0));
  for (const [x, y, z, r] of [[0, 2.5, 0, 1.2], [0.8, 2.1, 0.3, 0.85], [-0.85, 2.2, -0.1, 0.9], [0.2, 3.1, -0.2, 0.85], [-0.3, 2.0, 0.75, 0.75], [0.4, 2.2, -0.8, 0.8]])
    g.add(mesh(geo.palla(r, 12), chioma(1), x, y, z));
  // ricci spinosi tra le foglie
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, rr = 1.05 + (i % 3) * 0.2;
    const riccio = mesh(new THREE.IcosahedronGeometry(0.11, 0), mat('#b8c44a', { rim: 0.2 }), Math.cos(a) * rr, 2.0 + (i % 4) * 0.35, Math.sin(a) * rr);
    riccio.userData.senzaContorno = true;
    g.add(riccio);
  }
  g.add(ombra(1.6));
  return contorno(g);
}

export function creaCastagna(): THREE.Mesh {
  const c = mesh(geo.palla(0.09, 10), mat('#7a3e1c', { rim: 0.5 }), 0, 0.07, 0);
  c.scale.set(1, 0.8, 0.9);
  return c;
}

/** Canna da pesca (si dà in mano a chi sa pescare). */
export function creaCanna(): THREE.Group {
  const g = new THREE.Group();
  const asta = mesh(geo.cil(0.015, 0.025, 1.3, 5), mat('#8a5a36'), 0, 0.6, 0.2);
  asta.rotation.x = 0.9;
  g.add(asta);
  return g;
}

// ---------- natura selvatica della radura ----------

export function creaCespuglio(scala = 1, tinta = 0): THREE.Group {
  const g = new THREE.Group();
  for (const [x, y, z, r] of [[0, 0.35, 0, 0.45], [0.35, 0.28, 0.1, 0.33], [-0.32, 0.27, 0.05, 0.35], [0.05, 0.3, 0.32, 0.3]])
    g.add(mesh(geo.palla(r, 10), chioma(tinta + 1), x, y, z));
  if (tinta % 2 === 0) for (const [x, y, z] of [[0.2, 0.55, 0.3], [-0.25, 0.45, 0.3], [0.4, 0.4, 0.25]]) {
    const bacca = mesh(geo.palla(0.05, 6), mat('#d8344a', { rim: 0 }), x, y, z);
    bacca.userData.senzaContorno = true;
    g.add(bacca);
  }
  g.add(ombra(0.6));
  g.scale.setScalar(scala);
  return g;
}

export function creaFungo(scala = 1): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.05, 0.07, 0.2, 8), mat('#f4ead8'), 0, 0.1, 0));
  const cappello = mesh(geo.palla(0.14, 10), mat('#c8402e', { rim: 0.3 }), 0, 0.2, 0);
  cappello.scale.y = 0.6;
  g.add(cappello);
  for (const [x, z] of [[0.06, 0.05], [-0.05, 0.07], [0.0, -0.08]]) {
    const p = mesh(geo.palla(0.02, 5), mat('#ffffff', { rim: 0 }), x, 0.27, z);
    p.userData.senzaContorno = true;
    g.add(p);
  }
  g.scale.setScalar(scala);
  return g;
}

export function creaTronco(): THREE.Group {
  const g = new THREE.Group();
  const t = mesh(geo.cil(0.22, 0.25, 1.6, 10), corteccia(), 0, 0.22, 0);
  t.rotation.z = Math.PI / 2;
  g.add(t);
  for (const x of [-0.8, 0.8]) {
    const anelli = mesh(geo.cil(0.21, 0.21, 0.02, 10), mat('#d8b07a'), x, 0.22, 0);
    anelli.rotation.z = Math.PI / 2;
    g.add(anelli);
  }
  const muschio = mesh(geo.palla(0.2, 8), mat('#6a9a48'), 0.2, 0.4, 0);
  muschio.scale.set(1.8, 0.35, 0.9);
  g.add(muschio);
  g.add(ombra(0.9));
  return g;
}

/** Ciuffi d'erba alta: tanti fili sottili che spuntano dal prato. */
export function creaCiuffo(scala = 1): THREE.Group {
  const g = new THREE.Group();
  const m = mat('#5f9a44', { rim: 0.2, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const filo = mesh(geo.cono(0.035, 0.42 + (i % 3) * 0.12, 3), m, Math.cos(i * 2.3) * 0.08, 0.2, Math.sin(i * 2.3) * 0.08);
    filo.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.7) * 0.3);
    g.add(filo);
  }
  g.scale.setScalar(scala);
  return g;
}

export function creaSasso(scala = 1): THREE.Mesh {
  const s = mesh(new THREE.DodecahedronGeometry(0.4, 1), mat('#b4aea4', { rim: 0.3 }));
  s.scale.set(scala * 1.2, scala * 0.7, scala);
  s.position.y = 0.15 * scala;
  s.rotation.y = scala * 3;
  return contorno(s);
}

export function creaLanterna(): { gruppo: THREE.Group; luce: THREE.Mesh } {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(0.05, 0.06, 1.3, 8), mat('#4a3a2c'), 0, 0.65, 0));
  const luce = mesh(geo.palla(0.15, 12), mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 0.2, rim: 0 }), 0, 1.42, 0);
  g.add(luce);
  g.add(mesh(geo.cono(0.2, 0.14, 8), mat('#4a3a2c'), 0, 1.6, 0));
  contorno(g);
  return { gruppo: g, luce };
}

export function creaQuaderno(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.5));
  const legno = mat('#9a6a40');
  g.add(mesh(geo.cil(0.08, 0.1, 0.8, 8), legno, 0, 0.4, 0));
  const piano = mesh(geo.scatola(0.8, 0.06, 0.55), legno, 0, 0.82, 0);
  piano.rotation.x = -0.45;
  g.add(piano);
  const pagine = mesh(geo.scatola(0.72, 0.05, 0.48), mat('#ffffff', { map: texture(64, (c, l) => {
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#9ab4d8'; for (let y = 8; y < l; y += 8) c.fillRect(4, y, l - 8, 2);
    c.fillStyle = '#e07a5a'; c.fillRect(l / 2 - 1, 0, 2, l);
  }), rim: 0.2 }), 0, 0.87, 0.02);
  pagine.rotation.x = -0.45;
  g.add(pagine);
  const segnalibro = mesh(geo.scatola(0.06, 0.02, 0.3), mat('#e2683a'), 0.15, 0.85, 0.28);
  segnalibro.rotation.x = 0.4;
  g.add(segnalibro);
  return contorno(g);
}

// ---------- costruzioni che Giada sblocca con le ghiande ----------

const pietra = () => mat('#ffffff', { map: texture(64, macchie(['#9c968c', '#857f76', '#b2aca2', '#6f6a62'], 1.2, 41)), rim: 0.15 });
const assi = () => mat('#ffffff', { map: texture(64, macchie(['#9a6c44', '#83592f', '#b08050'], 1, 23)), rim: 0.1 });

export function creaCartello(nome: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.6));
  for (const x of [-0.55, 0.55]) g.add(mesh(geo.cil(0.06, 0.07, 1.4, 8), assi(), x, 0.7, 0));
  const tavola = mesh(geo.scatola(1.5, 0.55, 0.08), mat('#ffffff', { map: texture(256, (c, l) => {
    c.fillStyle = '#b08050'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#9a6c44'; for (let y = 0; y < l; y += 22) c.fillRect(0, y, l, 3);
    c.fillStyle = '#fff3d6'; c.font = `900 ${l * 0.17}px 'Nunito Variable', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = '#4a3020';
    const testo = nome.length > 16 ? nome.slice(0, 15) + '…' : nome;
    c.strokeText(testo, l / 2, l / 2); c.fillText(testo, l / 2, l / 2);
  }), rim: 0 }), 0, 1.15, 0.02);
  tavola.scale.y = 1;
  g.add(tavola);
  return contorno(g);
}

export function creaAiuola(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = mesh(geo.palla(0.13, 8), pietra(), Math.cos(a) * 0.75, 0.06, Math.sin(a) * 0.55);
    s.scale.y = 0.6;
    g.add(s);
  }
  const terriccio = mesh(geo.cil(0.72, 0.72, 0.06, 18), mat('#6b4a30'), 0, 0.03, 0);
  terriccio.scale.z = 0.75;
  g.add(terriccio);
  const colori = ['#ff6f91', '#ffd166', '#ffffff', '#b39ddb', '#ff7b54', '#7fc8f8'];
  for (let i = 0; i < 16; i++) {
    const f = creaFiore(colori[i % colori.length]);
    const a = i * 2.4, d = 0.15 + (i % 4) * 0.13;
    f.position.set(Math.cos(a) * d, 0.04, Math.sin(a) * d * 0.75);
    f.scale.setScalar(1.3);
    g.add(f);
  }
  return g;
}

export function creaStaccionata(raggio = 1.5): THREE.Group {
  const g = new THREE.Group();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i === 3) continue; // il cancelletto aperto
    const paletto = mesh(geo.scatola(0.1, 0.6, 0.06), assi(), Math.cos(a) * raggio, 0.3, Math.sin(a) * raggio);
    paletto.rotation.y = -a + Math.PI / 2;
    g.add(paletto);
    const b = (i + 0.5) / n * Math.PI * 2;
    const trave = mesh(geo.scatola(0.06, 0.07, raggio * 0.52), assi(), Math.cos(b) * raggio * 0.98, 0.42, Math.sin(b) * raggio * 0.98);
    trave.rotation.y = -b;
    g.add(trave);
  }
  return contorno(g);
}

export function creaPanchina(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.7));
  g.add(mesh(geo.scatola(1.2, 0.08, 0.38), assi(), 0, 0.42, 0));
  const schienale = mesh(geo.scatola(1.2, 0.3, 0.06), assi(), 0, 0.68, -0.18);
  schienale.rotation.x = -0.15;
  g.add(schienale);
  for (const x of [-0.5, 0.5]) for (const z of [-0.14, 0.14]) g.add(mesh(geo.cil(0.04, 0.04, 0.42, 6), mat('#4a3a2c'), x, 0.21, z));
  return contorno(g);
}

export function creaFalo(): { gruppo: THREE.Group; fiamma: THREE.Mesh } {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = mesh(geo.palla(0.14, 8), pietra(), Math.cos(a) * 0.5, 0.07, Math.sin(a) * 0.5);
    s.scale.y = 0.7;
    g.add(s);
  }
  for (let i = 0; i < 4; i++) {
    const l = mesh(geo.cil(0.06, 0.07, 0.7, 6), assi(), 0, 0.18, 0);
    l.rotation.set(1.15, (i / 4) * Math.PI * 2, 0);
    l.position.set(Math.sin((i / 4) * Math.PI * 2) * 0.12, 0.2, Math.cos((i / 4) * Math.PI * 2) * 0.12);
    g.add(l);
  }
  const fiamma = mesh(geo.cono(0.22, 0.6, 8), mat('#ffb347', { emissive: '#ff7a1a', emissiveIntensity: 1.6, rim: 0 }), 0, 0.5, 0);
  fiamma.userData.senzaContorno = true;
  g.add(fiamma);
  const cuore = mesh(geo.cono(0.12, 0.38, 8), mat('#fff0a0', { emissive: '#ffd060', emissiveIntensity: 2, rim: 0 }), 0, 0.42, 0);
  cuore.userData.senzaContorno = true;
  g.add(cuore);
  return { gruppo: g, fiamma };
}

/** Il contorno un po' irregolare del laghetto (raggi x 2,4 e z 1,6). */
const RX_LAGO = 2.4, RZ_LAGO = 1.6;
function rivaLago(th: number) {
  return 1 + Math.sin(th * 3 + 0.6) * 0.07 + Math.cos(th * 5) * 0.04;
}
function formaLago(scala: number) {
  const f = new THREE.Shape();
  for (let i = 0; i <= 48; i++) {
    const th = (i / 48) * Math.PI * 2, r = rivaLago(th) * scala;
    const x = Math.cos(th) * RX_LAGO * r, y = -Math.sin(th) * RZ_LAGO * r;
    if (i === 0) f.moveTo(x, y); else f.lineTo(x, y);
  }
  return new THREE.ShapeGeometry(f);
}
/** Se il punto (in coordinate del lago) è nell'acqua, il punto più vicino sulla riva (a k volte il bordo); se no null. */
export function fuoriDalLago(x: number, z: number, k = 1.05): [number, number] | null {
  const nx = x / RX_LAGO, nz = z / RZ_LAGO;
  const n = Math.hypot(nx, nz), th = Math.atan2(nz, nx);
  const bordo = rivaLago(th) * k;
  if (n >= bordo) return null;
  if (n < 1e-4) return puntoLago(th, k);
  return [x * (bordo / n), z * (bordo / n)];
}

/** Un punto sulla riva (o dentro il lago, con k < 1). */
export function puntoLago(th: number, k = 1): [number, number] {
  const r = rivaLago(th) * k;
  return [Math.cos(th) * RX_LAGO * r, Math.sin(th) * RZ_LAGO * r];
}

/** Un pesciolino arancione-argento (per i salti nel laghetto). */
function pesciolino(colore: string) {
  const g = new THREE.Group();
  const corpo = mesh(geo.palla(0.12, 10), materiale({ color: colore, rim: 0.5 }));
  corpo.scale.set(0.55, 0.75, 1.5);
  g.add(corpo);
  const coda = mesh(geo.cono(0.1, 0.14, 6), mat(colore, { rim: 0.5 }), 0, 0, -0.22);
  coda.rotation.x = -Math.PI / 2;
  coda.scale.x = 0.3;
  g.add(coda);
  return g;
}

/**
 * Il laghetto: acqua con la riva di sabbia, ninfee fiorite, canne palustri, sassi,
 * un pontiletto di legno per pescare e i pesci che ogni tanto saltano (vedi animaLaghetto).
 */
export function creaLaghetto(): THREE.Group {
  const g = new THREE.Group();
  const piatto = (geom: THREE.BufferGeometry, m: THREE.Material, y: number) => {
    const o = mesh(geom, m);
    o.rotation.x = -Math.PI / 2;
    o.position.y = y;
    o.userData.senzaContorno = true;
    g.add(o);
    return o;
  };
  const sopra = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
  piatto(formaLago(1.16), materiale({ color: '#e6d3a0', rim: 0.2, ...sopra }), 0.015);
  const acqua = piatto(formaLago(1), materiale({ color: '#4f9fd4', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), 0.03);
  acqua.name = 'acqua';
  // il centro più profondo e qualche riflesso
  piatto(formaLago(0.6), materiale({ color: '#3a86c0', emissive: '#1e5a86', emissiveIntensity: 0.25, rim: 0.4, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 }), 0.035);
  for (const [x, z, l] of [[-0.6, -0.5, 0.5], [0.5, 0.35, 0.35], [-1.1, 0.5, 0.3]]) {
    const r = mesh(geo.scatola(l, 0.01, 0.05), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.5, rim: 0 }), x, 0.045, z);
    r.userData.senzaContorno = true;
    g.add(r);
  }
  // sassi sulla riva (ma non davanti al pontile)
  for (let i = 0; i < 14; i++) {
    const th = (i / 14) * Math.PI * 2 + 0.2;
    if (Math.abs(th - Math.PI * 0.5) < 0.35) continue;
    const s = creaSasso(0.32 + (i % 3) * 0.1);
    const [x, z] = puntoLago(th, 1.1);
    s.position.set(x, s.position.y, z);
    g.add(s);
  }
  // canne palustri con il pennacchio marrone, a ciuffi
  const verde = mat('#5a9a3a', { rim: 0.2 }), marrone = mat('#7a4a26', { rim: 0.2 });
  for (const [th, n] of [[2.6, 6], [3.3, 5], [5.6, 6], [0.2, 4]] as const) {
    const ciuffo = new THREE.Group();
    const [x, z] = puntoLago(th, 0.98);
    ciuffo.position.set(x, 0, z);
    for (let k = 0; k < n; k++) {
      const h = 0.7 + ((k * 37) % 10) / 20;
      const dx = Math.cos(k * 2.3) * 0.18, dz = Math.sin(k * 2.3) * 0.14;
      const stelo = mesh(geo.cil(0.012, 0.018, h, 4), verde, dx, h / 2, dz);
      stelo.rotation.z = Math.cos(k * 1.7) * 0.12;
      ciuffo.add(stelo);
      if (k % 2 === 0) ciuffo.add(mesh(geo.capsula(0.035, 0.14), marrone, dx + stelo.rotation.z * -h / 2, h + 0.02, dz));
      else {
        const foglia = mesh(geo.cono(0.04, h * 0.8, 4), verde, dx * 1.4, h * 0.4, dz * 1.4);
        foglia.scale.z = 0.3;
        foglia.rotation.z = -Math.cos(k) * 0.4;
        ciuffo.add(foglia);
      }
    }
    g.add(ciuffo);
  }
  // ninfee: foglie tonde con lo spicchio, alcune col fiore rosa o bianco
  for (const [x, z, r, fiore] of [[0.9, -0.4, 0.22, '#ff9ab8'], [-0.9, -0.2, 0.18, ''], [-0.4, 0.75, 0.2, '#ffffff'], [1.5, 0.4, 0.16, ''], [-1.5, -0.55, 0.2, '#ff9ab8'], [0.2, -0.9, 0.15, '']] as const) {
    const foglia = mesh(new THREE.CylinderGeometry(r, r, 0.02, 14, 1, false, 0.3, Math.PI * 2 - 0.6), mat('#4f9a50', { rim: 0.3 }), x, 0.05, z);
    foglia.rotation.y = x * 3;
    g.add(foglia);
    if (fiore) {
      const f = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const pe = mesh(geo.cono(0.04, 0.12, 5), mat(fiore, { rim: 0.2 }), Math.cos(k) * 0.04, 0.05, Math.sin(k) * 0.04);
        pe.rotation.set(Math.sin(k) * 0.6, 0, -Math.cos(k) * 0.6);
        f.add(pe);
      }
      f.add(mesh(geo.palla(0.03, 6), mat('#ffd34d'), 0, 0.05, 0));
      f.position.set(x + 0.05, 0.06, z + 0.03);
      g.add(f);
    }
  }
  // il pontile di legno (davanti, dove si pesca)
  const pontile = new THREE.Group();
  const legno = assi();
  for (let i = 0; i < 6; i++) pontile.add(mesh(geo.scatola(0.62, 0.06, 0.2), legno, 0, 0.2, -i * 0.22));
  for (const x of [-0.27, 0.27]) for (const z of [0, -1.1]) pontile.add(mesh(geo.cil(0.045, 0.045, 0.45, 6), legno, x, 0.1, z));
  const [px, pz] = puntoLago(Math.PI * 0.5, 1.05);
  pontile.position.set(px + 0.2, 0, pz);
  pontile.name = 'pontile';
  g.add(pontile);
  // i pesci che saltano e i cerchi nell'acqua
  const salto = pesciolino('#f08a3a');
  salto.name = 'salto';
  salto.visible = false;
  g.add(salto);
  const cerchio = mesh(new THREE.TorusGeometry(0.2, 0.012, 4, 24), mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.6, rim: 0, transparent: true }), 0, 0.05, 0);
  cerchio.rotation.x = Math.PI / 2;
  cerchio.name = 'cerchio';
  cerchio.userData.senzaContorno = true;
  cerchio.visible = false;
  g.add(cerchio);
  return contorno(g);
}

/** Ogni tanto un pesce salta fuori dall'acqua e lascia un cerchio (t in secondi). */
export function animaLaghetto(g: THREE.Object3D, t: number) {
  const salto = g.getObjectByName('salto');
  const cerchio = g.getObjectByName('cerchio') as THREE.Mesh | undefined;
  if (!salto || !cerchio) return;
  const periodo = 4.5, n = Math.floor(t / periodo), f = t / periodo - n;
  const r = rng(hash('salto' + n));
  const [x, z] = puntoLago(r() * Math.PI * 2, 0.25 + r() * 0.45);
  const durata = 0.18; // in frazione del periodo
  salto.visible = f < durata;
  if (salto.visible) {
    const k = f / durata;
    salto.position.set(x + (k - 0.5) * 0.5, 0.05 + Math.sin(k * Math.PI) * 0.55, z);
    salto.rotation.set(0, Math.PI / 2, 0);
    salto.rotateX(-(k - 0.5) * 2.4);
    ((salto.children[0] as THREE.Mesh).material as THREE.MeshToonMaterial).color.set(r() < 0.5 ? '#f08a3a' : '#b8c8d8');
  }
  const c = (f - durata * 0.9) / 0.35;
  cerchio.visible = c > 0 && c < 1;
  if (cerchio.visible) {
    cerchio.position.set(x + 0.25, 0.05, z);
    cerchio.scale.setScalar(0.5 + c * 2.5);
    (cerchio.material as THREE.MeshToonMaterial).opacity = 1 - c;
  }
}

export function creaPonticello(): THREE.Group {
  const g = new THREE.Group();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const asse = mesh(geo.scatola(0.3, 0.06, 0.8), assi(), t * 3.6, 0.3 + Math.cos(t * Math.PI) * 0.35, 0);
    asse.rotation.z = -Math.sin(t * Math.PI) * 0.45;
    g.add(asse);
  }
  for (const z of [-0.42, 0.42]) for (let i = 0; i <= 4; i++) {
    const t = i / 4 - 0.5;
    g.add(mesh(geo.cil(0.04, 0.04, 0.5, 6), assi(), t * 3.3, 0.55 + Math.cos(t * Math.PI) * 0.35, z));
  }
  return contorno(g);
}

export function creaPozzo(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1));
  const muro = mesh(geo.cil(0.6, 0.65, 0.7, 16), pietra(), 0, 0.35, 0);
  g.add(muro);
  g.add(mesh(geo.cil(0.48, 0.48, 0.05, 16), mat('#20303a'), 0, 0.68, 0));
  for (const x of [-0.55, 0.55]) g.add(mesh(geo.cil(0.06, 0.06, 1.3, 6), assi(), x, 1.2, 0));
  const tetto = mesh(geo.cono(0.95, 0.55, 4), mat('#a0503a', { rim: 0.3 }), 0, 2.05, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  const rullo = mesh(geo.cil(0.07, 0.07, 1.1, 8), assi(), 0, 1.5, 0);
  rullo.rotation.z = Math.PI / 2;
  g.add(rullo);
  g.add(mesh(geo.cil(0.12, 0.1, 0.18, 10), mat('#7a6a5a'), 0, 1.15, 0));
  return contorno(g);
}

export function creaTorretta(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.1));
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const p = mesh(geo.cil(0.07, 0.09, 3, 6), assi(), x * 0.85, 1.5, z * 0.85);
    p.rotation.set(z * 0.08, 0, -x * 0.08);
    g.add(p);
  }
  g.add(mesh(geo.scatola(1.3, 0.1, 1.3), assi(), 0, 3.0, 0));
  for (const s of [-1, 1]) {
    g.add(mesh(geo.scatola(1.3, 0.3, 0.06), assi(), 0, 3.2, s * 0.62));
    g.add(mesh(geo.scatola(0.06, 0.3, 1.3), assi(), s * 0.62, 3.2, 0));
  }
  const tetto = mesh(geo.cono(1.1, 0.8, 4), mat('#3b4a7a', { rim: 0.3 }), 0, 3.8, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  const bandiera = mesh(geo.scatola(0.4, 0.25, 0.02), mat('#e2683a'), 0.22, 4.45, 0);
  g.add(bandiera);
  g.add(mesh(geo.cil(0.02, 0.02, 0.5, 5), mat('#4a3a2c'), 0, 4.35, 0));
  return contorno(g);
}

export function creaMulino(): { gruppo: THREE.Group; pale: THREE.Group } {
  const g = new THREE.Group();
  g.add(ombra(1.5));
  g.add(mesh(geo.cil(0.8, 1.1, 2.6, 12), mat('#ece0c8', { map: texture(64, macchie(['#ece0c8', '#ddd0b4', '#f6eedc'], 0.6, 61)) }), 0, 1.3, 0));
  g.add(mesh(geo.cono(1.0, 1.0, 12), mat('#8a4a34', { rim: 0.3 }), 0, 3.1, 0));
  g.add(mesh(geo.scatola(0.4, 0.7, 0.05), mat('#6a4a2e'), 0, 0.35, 1.02));
  const pale = new THREE.Group();
  pale.position.set(0, 2.4, 0.95);
  for (let i = 0; i < 4; i++) {
    const braccio = new THREE.Group();
    braccio.rotation.z = (i / 4) * Math.PI * 2;
    braccio.add(mesh(geo.scatola(0.08, 1.6, 0.05), assi(), 0, 0.8, 0));
    braccio.add(mesh(geo.scatola(0.4, 1.2, 0.02), mat('#f6eedc'), 0.22, 0.95, 0.03));
    pale.add(braccio);
  }
  pale.add(mesh(geo.palla(0.14, 10), mat('#6a4a2e'), 0, 0, 0.05));
  g.add(pale);
  contorno(g);
  return { gruppo: g, pale };
}

// ---------- edifici ----------

function legnoMat() {
  return mat('#ffffff', { map: texture(64, macchie(['#c48c58', '#b07a48', '#d6a06a'], 1, 21)) });
}

export function creaChiosco(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.4));
  const legno = legnoMat();
  g.add(mesh(geo.scatola(2, 0.9, 0.8), legno, 0, 0.45, 0.3));
  g.add(mesh(geo.scatola(2.1, 0.08, 0.95), mat('#f0dcb4'), 0, 0.94, 0.3));
  for (const x of [-0.95, 0.95]) g.add(mesh(geo.cil(0.06, 0.06, 2.1, 8), legno, x, 1.05, -0.05));
  const tenda = mesh(geo.scatola(2.3, 0.08, 1.3), mat('#ffffff', { map: texture(64, strisce('#e8584a', '#fff4e0', 6)) }), 0, 2.15, 0.25);
  tenda.rotation.x = 0.25;
  g.add(tenda);
  g.add(mesh(geo.cil(0.22, 0.18, 0.25, 12), mat('#6a6a78'), -0.5, 1.1, 0.3));
  return contorno(g);
}

export function creaPiazzaMusica(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(geo.cil(1.3, 1.4, 0.25, 24), mat('#ffffff', { map: texture(64, macchie(['#e0d6c6', '#cfc3b0', '#ece4d6'], 1, 31)) }), 0, 0.12, 0));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(mesh(geo.cil(0.07, 0.07, 1.6, 8), mat('#8a5a36'), Math.cos(a) * 1.15, 1.0, Math.sin(a) * 1.15));
  }
  g.add(mesh(geo.cono(1.6, 0.8, 12), mat('#6a8fd8', { rim: 0.4 }), 0, 2.2, 0));
  g.add(mesh(geo.palla(0.12), mat('#f2c94c'), 0, 2.65, 0));
  return contorno(g);
}

/** Casetta-bottega di un mestiere: ogni animale con un lavoro si costruisce la sua. */
export function creaBottegaMestiere(mestiere: string, colore: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(1.1));
  g.add(mesh(geo.scatola(1.3, 1.0, 1.1), mat('#f3e3c0', { map: texture(64, macchie(['#f3e3c0', '#e8d4ac', '#fbefd6'], 0.6, mestiere.length)) }), 0, 0.5, 0));
  const tetto = mesh(geo.cono(1.15, 0.8, 4), mat(colore, { rim: 0.4 }), 0, 1.4, 0);
  tetto.rotation.y = Math.PI / 4;
  g.add(tetto);
  g.add(mesh(geo.scatola(0.36, 0.6, 0.05), mat('#7a5232'), 0, 0.3, 0.56));
  g.add(mesh(geo.palla(0.035), mat('#f2c94c'), 0.1, 0.32, 0.6));
  for (const x of [-0.42, 0.42]) {
    g.add(mesh(geo.scatola(0.26, 0.26, 0.05), mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.1 }), x, 0.6, 0.56));
  }
  // insegna con il simbolo del mestiere
  const simboli = SIMBOLI_MESTIERE;
  const insegna = mesh(geo.scatola(0.5, 0.5, 0.04), mat('#ffffff', { map: texture(64, (c, l) => {
    c.fillStyle = '#fff8e7'; c.fillRect(0, 0, l, l);
    c.strokeStyle = '#8a5a36'; c.lineWidth = 6; c.strokeRect(3, 3, l - 6, l - 6);
    c.font = `${l * 0.55}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#4a3424'; c.fillText(simboli[mestiere] ?? '★', l / 2, l / 2 + 2);
  }), rim: 0 }), 0, 1.05, 0.58);
  g.add(insegna);
  return contorno(g);
}

// ---------- arredo: aiuole con le piante di Giada, quadretti ----------

/** Cassetta di legno con il terriccio: 3 posti per le piante, da sinistra a destra. */
export const POSTI_CASSETTA = [-0.48, 0, 0.48];
export function creaCassetta(): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.95));
  const legno = assi();
  for (const z of [-0.3, 0.3]) g.add(mesh(geo.scatola(1.6, 0.26, 0.08), legno, 0, 0.13, z));
  for (const x of [-0.78, 0.78]) g.add(mesh(geo.scatola(0.08, 0.26, 0.6), legno, x, 0.13, 0));
  g.add(mesh(geo.scatola(1.5, 0.05, 0.52), mat('#5e3f26'), 0, 0.22, 0));
  for (const x of POSTI_CASSETTA) {
    const buca = mesh(geo.palla(0.1, 8), mat('#4a3020'), x, 0.24, 0);
    buca.scale.y = 0.3;
    g.add(buca);
  }
  return contorno(g);
}

/** Una pianta di Giada. fase 0 seme, 1 germoglio, 2 piantina, 3 fiorita/con i frutti. */
export function creaPianta(specie: string, colore: string, fase: number): THREE.Group {
  const g = new THREE.Group();
  const verde = mat('#4f9a3c', { rim: 0.2 });
  const foglia = (x: number, y: number, z: number, s: number, rot: number) => {
    const f = mesh(geo.palla(0.07, 6), verde, x, y, z);
    f.scale.set(s * 1.6, s * 0.4, s);
    f.rotation.y = rot;
    g.add(f);
  };
  if (fase === 0) {
    const m = mesh(geo.palla(0.08, 6), mat('#7a5232'), 0, 0.02, 0);
    m.scale.y = 0.5;
    g.add(m);
    g.add(mesh(geo.cil(0.01, 0.01, 0.12, 4), mat('#c8b080'), 0.06, 0.08, 0)); // bastoncino col cartellino
    g.add(mesh(geo.scatola(0.08, 0.06, 0.01), mat(colore), 0.06, 0.15, 0));
    return g;
  }
  if (fase === 1) {
    g.add(mesh(geo.cil(0.012, 0.015, 0.12, 4), verde, 0, 0.06, 0));
    foglia(0.04, 0.12, 0, 0.6, 0);
    foglia(-0.04, 0.12, 0, 0.6, Math.PI);
    return g;
  }
  const grande = fase === 3;
  const k = grande ? 1 : 0.6;
  switch (specie) {
    case 'melo': {
      g.add(mesh(geo.cil(0.04, 0.06, 0.7 * k, 6), mat('#8a5a36'), 0, 0.35 * k, 0));
      g.add(mesh(geo.palla(0.38 * k, 10), chioma(2), 0, 0.85 * k, 0));
      if (grande) for (let i = 0; i < 6; i++) {
        const a = i * 1.1;
        g.add(mesh(geo.palla(0.06, 6), mat(colore, { rim: 0.3 }), Math.cos(a) * 0.32, 0.8 + (i % 3) * 0.12, Math.sin(a) * 0.32));
      }
      break;
    }
    case 'zucca': {
      for (let i = 0; i < 4; i++) foglia(Math.cos(i * 1.6) * 0.15, 0.05, Math.sin(i * 1.6) * 0.12, 1.4 * k, i);
      if (grande) {
        const z = mesh(geo.palla(0.17, 10), mat(colore, { rim: 0.3 }), 0.05, 0.13, 0.04);
        z.scale.y = 0.75;
        g.add(z);
        g.add(mesh(geo.cil(0.015, 0.02, 0.07, 5), mat('#5e7a2e'), 0.05, 0.27, 0.04));
      }
      break;
    }
    case 'fragola': {
      for (let i = 0; i < 5; i++) foglia(Math.cos(i * 1.25) * 0.1, 0.06, Math.sin(i * 1.25) * 0.1, 1.0 * k, i * 1.25);
      if (grande) for (const [x, z] of [[0.12, 0.08], [-0.1, 0.1], [0.02, -0.12]]) {
        const f = mesh(geo.cono(0.045, 0.08, 6), mat(colore, { rim: 0.3 }), x, 0.05, z);
        f.rotation.x = Math.PI;
        g.add(f);
      }
      break;
    }
    case 'lavanda': {
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, d = (i % 3) * 0.05;
        g.add(mesh(geo.cil(0.008, 0.01, 0.35 * k, 4), verde, Math.cos(a) * d, 0.17 * k, Math.sin(a) * d));
        if (grande) {
          const spiga = mesh(geo.capsula(0.025, 0.1), mat(colore, { rim: 0.3 }), Math.cos(a) * d, 0.38, Math.sin(a) * d);
          g.add(spiga);
        }
      }
      break;
    }
    default: {
      // fiori: uno stelo per ogni fiore (girasole e rosa più alti)
      const def = { girasole: [1, 0.7, 0.13], rosa: [3, 0.45, 0.06], tulipano: [3, 0.32, 0.05], margherita: [4, 0.25, 0.05] }[specie] ?? [3, 0.3, 0.05];
      const [n, h, r] = def;
      for (let i = 0; i < n; i++) {
        const a = i * 2.1, d = n > 1 ? 0.09 : 0;
        const x = Math.cos(a) * d, z = Math.sin(a) * d, hh = h * k * (1 - (i % 2) * 0.15);
        g.add(mesh(geo.cil(0.012, 0.015, hh, 4), verde, x, hh / 2, z));
        foglia(x + 0.04, hh * 0.4, z, 0.7, a);
        if (!grande) continue;
        if (specie === 'tulipano') {
          const c = mesh(geo.palla(r, 8), mat(colore, { rim: 0.3 }), x, hh + 0.02, z);
          c.scale.y = 1.4;
          g.add(c);
        } else if (specie === 'rosa') {
          g.add(mesh(geo.palla(r * 1.2, 8), mat(colore, { rim: 0.3 }), x, hh, z));
        } else {
          const petali = mesh(geo.cil(r * 1.9, r * 1.9, 0.02, 10), mat(colore, { rim: 0.2 }), x, hh, z);
          petali.rotation.x = specie === 'girasole' ? 1.1 : 0;
          g.add(petali);
          const cuore = mesh(geo.palla(r * 0.8, 8), mat(specie === 'girasole' ? '#6a3f1a' : '#ffd34d', { rim: 0 }), x, hh + (specie === 'girasole' ? 0.02 : 0.015), z + (specie === 'girasole' ? 0.02 : 0));
          cuore.scale.y = 0.5;
          if (specie === 'girasole') cuore.rotation.x = 1.1;
          g.add(cuore);
        }
      }
    }
  }
  return g;
}

export const CORNICI = [
  { nome: 'Legno', colore: '#9a6a40' },
  { nome: 'Oro', colore: '#e0b23c' },
  { nome: 'Bianca', colore: '#f4efe6' },
  { nome: 'Blu', colore: '#3f63b8' },
];

/** Un quadretto dipinto da Giada, su un cavalletto. */
export function creaQuadretto(disegno: string, cornice: number): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.5));
  const legno = mat('#8a5a36');
  for (const x of [-0.3, 0.3]) {
    const gamba = mesh(geo.cil(0.025, 0.03, 1.3, 5), legno, x, 0.62, 0);
    gamba.rotation.z = x > 0 ? -0.12 : 0.12;
    g.add(gamba);
  }
  const dietro = mesh(geo.cil(0.025, 0.03, 1.2, 5), legno, 0, 0.55, -0.22);
  dietro.rotation.x = -0.35;
  g.add(dietro);
  g.add(mesh(geo.scatola(0.8, 0.05, 0.08), legno, 0, 0.55, 0.04));
  const quadro = new THREE.Group();
  quadro.position.set(0, 0.98, 0.03);
  quadro.rotation.x = -0.12;
  quadro.add(mesh(geo.scatola(0.84, 0.66, 0.05), mat(CORNICI[cornice]?.colore ?? CORNICI[0].colore, { rim: 0.2 })));
  const tex = new THREE.TextureLoader().load(disegno);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  const tela = mesh(new THREE.PlaneGeometry(0.72, 0.54), mat('#ffffff', { map: tex, rim: 0 }), 0, 0, 0.03);
  tela.userData.senzaContorno = true;
  quadro.add(tela);
  g.add(quadro);
  return contorno(g);
}

// ---------- case degli animali ----------

/** Colori e decorazione della casa secondo l'emozione con cui l'animale è nato. */
const CASA_EMOZIONE: Record<Emozione, { tetto: string; porta: string; muro: string }> = {
  gioia: { tetto: '#f2b43c', porta: '#e8584a', muro: '#fbecc4' },
  fiducia: { tetto: '#5fa86a', porta: '#8a5a36', muro: '#f1ead2' },
  paura: { tetto: '#3f4f8a', porta: '#6a4a8a', muro: '#e6e2ee' },
  sorpresa: { tetto: '#ff8a3c', porta: '#3f8ad8', muro: '#fff1dc' },
  tristezza: { tetto: '#5f8fc8', porta: '#3f5a8a', muro: '#e8eef4' },
  disgusto: { tetto: '#7a9a3c', porta: '#5a3f6a', muro: '#eef0d8' },
  rabbia: { tetto: '#c8463a', porta: '#4a2e20', muro: '#f4e2d0' },
  attesa: { tetto: '#a58be0', porta: '#c87a3a', muro: '#f6eef8' },
};


/**
 * La casa di un animale: la forma dipende dalla specie, i colori e la decorazione dall'emozione
 * della pagina con cui è nato. Crescendo la abbellisce (vasi, recinto, comignolo...).
 * È grande: circa 2,5 metri di lato, porta davanti (verso +z).
 */
export function creaCasaAnimale(specie: Specie, emozione: Emozione, fase: Fase, mestiere: string | null, livelloCasa = 1): THREE.Group {
  const g = new THREE.Group();
  const c = CASA_EMOZIONE[emozione] ?? CASA_EMOZIONE.gioia;
  const muro = mat('#ffffff', { map: texture(64, macchie([c.muro, '#' + new THREE.Color(c.muro).offsetHSL(0, 0, -0.06).getHexString(), c.muro], 0.6, specie.length + emozione.length)) });
  const tetto = mat(c.tetto, { rim: 0.4 });
  const porta = mat(c.porta);
  const vetro = mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.15 });
  const legno = legnoMat();
  g.add(ombra(1.9));
  let fronte = 1.1; // z della facciata
  let altPorta = 0;
  switch (specie) {
    case 'tasso': {
      // collinetta erbosa con la porta tonda
      const colle = mesh(geo.palla(1.5, 16), mat('#6ba552', { rim: 0.3 }), 0, 0, 0);
      colle.scale.set(1.1, 0.85, 1);
      g.add(colle);
      const pd = mesh(geo.cil(0.5, 0.5, 0.1, 18), porta, 0, 0.55, 1.42);
      pd.rotation.x = Math.PI / 2;
      g.add(pd);
      const cornice = mesh(new THREE.TorusGeometry(0.52, 0.07, 6, 18), mat('#8a7a6a'), 0, 0.55, 1.44);
      g.add(cornice);
      for (const x of [-0.95, 0.95]) {
        const f = mesh(geo.cil(0.2, 0.2, 0.08, 12), vetro, x, 0.65, 1.12);
        f.rotation.x = Math.PI / 2 - 0.5;
        g.add(f);
      }
      fronte = 1.45;
      altPorta = 0.55;
      break;
    }
    case 'riccio': {
      // capanna a cupola di foglie a scaglie
      g.add(mesh(geo.cil(1.2, 1.25, 0.9, 14), muro, 0, 0.45, 0));
      for (let i = 0; i < 4; i++) {
        const strato = mesh(geo.cono(1.55 - i * 0.32, 0.6, 14), mat(i % 2 ? c.tetto : '#c8803a', { rim: 0.4 }), 0, 1.1 + i * 0.38, 0);
        g.add(strato);
      }
      g.add(mesh(geo.scatola(0.6, 0.85, 0.08), porta, 0, 0.42, 1.21));
      fronte = 1.25;
      break;
    }
    case 'scoiattolo': {
      // casetta sull'albero: tronco, piattaforma e scaletta
      g.add(mesh(geo.cil(0.35, 0.5, 1.6, 10), mat('#ffffff', { map: texture(64, macchie(['#8a5a36', '#6d4428', '#a06a40'], 1, 11)) }), 0, 0.8, 0));
      g.add(mesh(geo.cil(1.3, 1.3, 0.12, 12), legno, 0, 1.6, 0));
      g.add(mesh(geo.scatola(1.6, 1.1, 1.4), muro, 0, 2.2, 0));
      const t2 = mesh(geo.cono(1.35, 0.9, 4), tetto, 0, 3.2, 0);
      t2.rotation.y = Math.PI / 4;
      g.add(t2);
      g.add(mesh(geo.scatola(0.5, 0.8, 0.06), porta, 0, 2.05, 0.72));
      for (let i = 0; i < 5; i++) g.add(mesh(geo.scatola(0.5, 0.05, 0.06), legno, 0, 0.25 + i * 0.3, 1.25));
      for (const x of [-0.25, 0.25]) {
        const st = mesh(geo.cil(0.03, 0.03, 1.7, 5), legno, x, 0.8, 1.2);
        st.rotation.x = -0.12;
        g.add(st);
      }
      fronte = 0.73;
      altPorta = 2.05;
      break;
    }
    case 'lepre': {
      // casa tonda di pietra con il tetto di paglia
      g.add(mesh(geo.cil(1.15, 1.2, 1.3, 16), pietra(), 0, 0.65, 0));
      g.add(mesh(geo.cono(1.55, 1.3, 16), mat('#e2c46a', { rim: 0.4 }), 0, 1.95, 0));
      g.add(mesh(geo.palla(0.16, 8), tetto, 0, 2.65, 0));
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 1.18));
      fronte = 1.2;
      break;
    }
    case 'daino': {
      // casa alta di legno chiaro, due piani, tetto ripido
      g.add(mesh(geo.scatola(2.0, 2.0, 1.6), muro, 0, 1.0, 0));
      const t2 = mesh(geo.cono(1.75, 1.3, 4), tetto, 0, 2.65, 0);
      t2.rotation.y = Math.PI / 4;
      t2.scale.z = 0.8;
      g.add(t2);
      g.add(mesh(geo.scatola(0.55, 0.95, 0.08), porta, 0, 0.48, 0.82));
      for (const x of [-0.6, 0.6]) g.add(mesh(geo.scatola(0.35, 0.35, 0.06), vetro, x, 1.5, 0.82));
      fronte = 0.82;
      break;
    }
    case 'mucca':
    case 'cavallo': {
      // il fienile (mucca) e la scuderia (cavallo): tetto a capanna, porte grandi con la croce bianca
      const stalla = specie === 'cavallo';
      const L = stalla ? 2.5 : 2.1, H = stalla ? 1.4 : 1.7, P = 1.7;
      g.add(mesh(geo.scatola(L, H, P), muro, 0, H / 2, 0));
      const tA = tettoA(L + 0.3, stalla ? 0.9 : 1.2, P + 0.3, tetto);
      tA.position.y = H;
      g.add(tA);
      fronte = P / 2;
      const bianco = mat('#fbf8f2');
      if (stalla) {
        // porta a due metà, come nelle scuderie, e il ferro di cavallo portafortuna
        g.add(mesh(geo.scatola(0.7, 0.55, 0.08), porta, 0, 0.3, fronte + 0.02));
        g.add(mesh(geo.scatola(0.7, 0.5, 0.08), porta, 0, 0.88, fronte + 0.05));
        const ferro = mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI * 1.3), mat('#c8c8d0', { rim: 0.6 }), 0, 1.25, fronte + 0.06);
        ferro.rotation.z = -Math.PI * 0.15 + Math.PI;
        g.add(ferro);
        for (const x of [-0.85, 0.85]) g.add(mesh(geo.scatola(0.4, 0.35, 0.06), vetro, x, 0.85, fronte + 0.01));
        altPorta = 0.55;
      } else {
        g.add(mesh(geo.scatola(0.95, 1.05, 0.08), porta, 0, 0.53, fronte + 0.02));
        for (const r of [0.83, -0.83]) {
          const asse = mesh(geo.scatola(0.08, 1.35, 0.03), bianco, 0, 0.53, fronte + 0.07);
          asse.rotation.z = r;
          g.add(asse);
        }
        g.add(mesh(geo.scatola(1.05, 0.08, 0.04), bianco, 0, 1.08, fronte + 0.07));
        // la finestrella del fienile, con il fieno che spunta
        g.add(mesh(geo.scatola(0.45, 0.4, 0.06), mat('#5a3a20'), 0, H + 0.4, fronte + 0.17));
        g.add(mesh(geo.palla(0.16, 8), mat('#e8c860', { rim: 0.3 }), 0, H + 0.3, fronte + 0.24));
        altPorta = 0.55;
      }
      // una balla di fieno di lato
      const balla = mesh(geo.cil(0.32, 0.32, 0.5, 12), mat('#e2c46a', { rim: 0.3 }), L / 2 + 0.35, 0.32, 0.3);
      balla.rotation.x = Math.PI / 2;
      g.add(balla);
      break;
    }
    case 'asino': {
      // la casetta dell'asinello: di pietra, con la tettoia di legno e il fieno sotto
      g.add(mesh(geo.scatola(1.7, 1.3, 1.5), pietra(), -0.2, 0.65, 0));
      const tA = tettoA(1.95, 0.8, 1.75, tetto);
      tA.position.set(-0.2, 1.3, 0);
      g.add(tA);
      const tettoia = mesh(geo.scatola(1.0, 0.08, 1.5), legno, 1.1, 1.15, 0.05);
      tettoia.rotation.z = -0.25;
      g.add(tettoia);
      for (const z of [-0.6, 0.65]) g.add(mesh(geo.cil(0.05, 0.05, 1.05, 6), legno, 1.5, 0.52, z));
      const fieno = mesh(geo.palla(0.4, 10), mat('#e2c46a', { rim: 0.3 }), 1.05, 0.25, 0);
      fieno.scale.set(1, 0.6, 1.2);
      g.add(fieno);
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, -0.2, 0.45, 0.77));
      g.add(mesh(geo.scatola(0.32, 0.32, 0.06), vetro, -0.75, 0.85, 0.77));
      fronte = 0.77;
      break;
    }
    case 'maiale': {
      // casetta di mattoni con il comignolo, le finestre tonde e la pozzanghera di fango
      const mattoni = mat('#ffffff', { map: texture(64, (cx, l) => {
        cx.fillStyle = '#e8eae4'; cx.fillRect(0, 0, l, l);
        for (let r = 0; r < 8; r++) for (let k = -1; k < 4; k++) {
          cx.fillStyle = ['#c8644a', '#b85a42', '#d4765a'][(r + k + 3) % 3];
          cx.fillRect(k * 16 + (r % 2) * 8 + 1, r * 8 + 1, 14, 6);
        }
      }, 2) });
      g.add(mesh(geo.scatola(2.0, 1.35, 1.7), mattoni, 0, 0.68, 0));
      const tA = tettoA(2.35, 0.95, 2.0, tetto);
      tA.position.y = 1.35;
      g.add(tA);
      g.add(mesh(geo.scatola(0.3, 0.6, 0.3), mattoni, 0.55, 2.0, -0.2));
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 0.87));
      for (const x of [-0.6, 0.6]) {
        const f = mesh(geo.cil(0.18, 0.18, 0.06, 14), vetro, x, 0.85, 0.87);
        f.rotation.x = Math.PI / 2;
        g.add(f);
      }
      const fango = mesh(geo.cil(0.5, 0.5, 0.03, 14), mat('#7a5232', { rim: 0.4 }), 1.35, 0.02, 1.0);
      fango.scale.z = 0.65;
      fango.userData.senzaContorno = true;
      g.add(fango);
      fronte = 0.87;
      break;
    }
    case 'uccellino': {
      // una grande casetta per uccelli in cima a un palo, con il posatoio davanti al buco
      g.add(mesh(geo.cil(0.12, 0.15, 1.5, 8), legno, 0, 0.75, 0));
      g.add(mesh(geo.scatola(1.5, 1.25, 1.3), muro, 0, 2.1, 0));
      const tA = tettoA(1.8, 0.75, 1.6, tetto);
      tA.position.y = 2.72;
      g.add(tA);
      const buco = mesh(geo.cil(0.27, 0.27, 0.06, 16), mat('#3a2418'), 0, 2.15, 0.66);
      buco.rotation.x = Math.PI / 2;
      g.add(buco);
      const posatoio = mesh(geo.cil(0.035, 0.035, 0.35, 6), legno, 0, 1.78, 0.8);
      posatoio.rotation.x = Math.PI / 2;
      g.add(posatoio);
      // qualche fiorellino ai piedi del palo
      for (const [x, z] of [[-0.35, 0.3], [0.3, 0.35]]) { const f = creaFiore('#ff9ab8'); f.scale.setScalar(2); f.position.set(x, 0, z); g.add(f); }
      fronte = 0.66;
      altPorta = 2.15;
      break;
    }
    case 'papera': {
      // la casetta a punta della paperella, con il suo stagno davanti e la passerella
      const tA = tettoA(2.0, 1.7, 1.8, tetto);
      g.add(tA);
      g.add(mesh(geo.scatola(1.5, 0.3, 1.6), muro, 0, 0.15, 0));
      const pd = mesh(geo.cil(0.36, 0.36, 0.08, 16), porta, 0, 0.55, 0.88);
      pd.rotation.x = Math.PI / 2;
      g.add(pd);
      const stagno = mesh(new THREE.CircleGeometry(0.75, 20), materiale({ color: '#5aa8d8', emissive: '#2a6f9a', emissiveIntensity: 0.25, rim: 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      stagno.rotation.x = -Math.PI / 2;
      stagno.position.set(1.3, 0.03, 1.25);
      stagno.scale.set(1, 0.7, 1);
      stagno.userData.senzaContorno = true;
      g.add(stagno);
      for (let i = 0; i < 4; i++) g.add(mesh(geo.scatola(0.5, 0.05, 0.14), legno, 0, 0.05, 1.1 + i * 0.17));
      fronte = 0.88;
      altPorta = 0.55;
      break;
    }
    default: {
      // volpe: casetta col tetto spiovente e il comignolo
      g.add(mesh(geo.scatola(2.0, 1.4, 1.7), muro, 0, 0.7, 0));
      const t2 = mesh(geo.cono(1.7, 1.1, 4), tetto, 0, 1.95, 0);
      t2.rotation.y = Math.PI / 4;
      g.add(t2);
      g.add(mesh(geo.scatola(0.55, 0.9, 0.08), porta, 0, 0.45, 0.87));
      for (const x of [-0.6, 0.6]) g.add(mesh(geo.scatola(0.35, 0.35, 0.06), vetro, x, 0.8, 0.87));
      fronte = 0.87;
    }
  }
  if (!altPorta) altPorta = 0.45;
  g.add(mesh(geo.palla(0.04), mat('#f2c94c'), 0.15, altPorta, fronte + 0.04));

  // insegna del mestiere sopra la porta, con la scritta; davanti il bancone e gli attrezzi del mestiere
  if (mestiere) {
    const ins = creaInsegnaMestiere(mestiere);
    // sopra la porta; dove il tetto sporge (riccio, lepre) appoggiata sul tetto, sullo scoiattolo appesa sotto la piattaforma
    const dove: Partial<Record<Specie, [number, number, number, number]>> = {
      riccio: [0, 1.32, 1.34, -0.35], lepre: [0, 1.85, 1.1, -0.6], uccellino: [0, 1.5, 0.75, 0], papera: [0, 1.15, 0.6, -0.5], scoiattolo: [1.15, 1.22, 1.08, 0], tasso: [0, altPorta + 0.8, fronte + 0.12, -0.15],
    };
    // con il portico (casa migliorata) l'insegna sale sopra il tettuccio, sul davanti, così si legge da lontano
    const [xi, yi, zi, ri] = livelloCasa >= 2 ? [0, altPorta + 1.38, fronte + 0.72, -0.12] : dove[specie] ?? [0, altPorta + 0.68, fronte + 0.1, 0];
    ins.position.set(xi, yi, zi);
    ins.rotation.x = ri;
    g.add(ins);
    g.add(creaAttrezziMestiere(mestiere, fronte));
  }

  // la decorazione dell'emozione, davanti a casa
  const davanti = (x: number, o: THREE.Object3D) => { o.position.x += x; o.position.z += Math.max(fronte, 1.1) + 0.45; g.add(o); return o; };
  switch (emozione) {
    case 'gioia': for (const x of [-0.9, -0.65]) { const f = creaFiore('#ffcf33'); f.scale.setScalar(2.4); davanti(x, f); } break;
    case 'fiducia': { const b = mesh(geo.scatola(0.9, 0.08, 0.3), legno, 0, 0.35, 0); b.add(mesh(geo.scatola(0.08, 0.35, 0.08), legno, -0.38, -0.17, 0)); b.add(mesh(geo.scatola(0.08, 0.35, 0.08), legno, 0.38, -0.17, 0)); davanti(-1.0, b); break; }
    case 'paura': { const l = creaLanterna(); l.luce.material = mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 1.2, rim: 0 }); davanti(0.75, l.gruppo); break; }
    case 'sorpresa': {
      const filo = new THREE.Group();
      const colori = ['#ff6f91', '#ffd166', '#7fc8f8', '#7ccf6a', '#b39ddb'];
      for (let i = 0; i < 5; i++) { const b = mesh(geo.cono(0.09, 0.18, 3), mat(colori[i]), -0.8 + i * 0.4, 0, 0); b.rotation.x = Math.PI; filo.add(b); }
      filo.position.set(0, altPorta + 0.45, fronte + 0.1);
      g.add(filo);
      break;
    }
    case 'tristezza': for (const x of [-0.9, 0.9]) { const v = mesh(geo.cil(0.16, 0.12, 0.25, 8), mat('#c8805a'), 0, 0.12, 0); for (let i = 0; i < 3; i++) { const f = creaFiore('#7fb4f8'); f.position.set((i - 1) * 0.07, 0.15, 0); v.add(f); } davanti(x, v); } break;
    case 'disgusto': for (let i = 0; i < 3; i++) { const e = creaCiuffo(0.8); e.traverse((o) => { if (o instanceof THREE.Mesh) o.material = mat('#8fbf5a', { rim: 0.2, side: THREE.DoubleSide }); }); davanti(-0.9 + i * 0.3, e); } break;
    case 'rabbia': { const leg = new THREE.Group(); for (let i = 0; i < 6; i++) { const t2 = mesh(geo.cil(0.09, 0.09, 0.6, 8), mat('#a06a40'), (i % 3) * 0.19 - 0.19, 0.09 + Math.floor(i / 3) * 0.17, 0); t2.rotation.z = Math.PI / 2; t2.rotation.y = Math.PI / 2; leg.add(t2); } davanti(1.0, leg); break; }
    case 'attesa': { const p = mesh(geo.cil(0.04, 0.04, 0.9, 6), legno, 0, 0.45, 0); p.add(mesh(geo.scatola(0.32, 0.22, 0.4), mat(c.porta), 0, 0.5, 0)); davanti(1.0, p); break; }
  }

  // crescendo l'animale abbellisce la casa
  const livello = { uovo: 0, cucciolo: 0, giovane: 1, adulto: 2, maestro: 3 }[fase];
  if (livello >= 2) {
    // un vialetto di sassi piatti fino alla porta
    for (let i = 0; i < 3; i++) {
      const s = mesh(geo.cil(0.18, 0.2, 0.05, 8), pietra(), (i % 2) * 0.12 - 0.06, 0.03, Math.max(fronte, 1.1) + 0.35 + i * 0.4);
      s.userData.senzaContorno = true;
      g.add(s);
    }
  }
  if (livello >= 3) {
    // un piccolo recinto basso intorno
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
      g.add(mesh(geo.scatola(0.08, 0.45, 0.08), legno, Math.cos(a + Math.PI) * 1.9, 0.22, -Math.sin(a + Math.PI) * 1.9 * 0.8));
    }
  }
  if (livelloCasa >= 2) miglioraCasa(g, specie, c, livelloCasa, fronte, altPorta);
  return contorno(g);
}

/** Tetto a capanna (prisma triangolare): base larga `l`, alto `h`, profondo `p`, appoggiato a y = 0. */
function tettoA(l: number, h: number, p: number, m: THREE.Material): THREE.Mesh {
  const f = new THREE.Shape();
  f.moveTo(-l / 2, 0);
  f.lineTo(l / 2, 0);
  f.lineTo(0, h);
  f.closePath();
  const geom = new THREE.ExtrudeGeometry(f, { depth: p, bevelEnabled: false });
  geom.translate(0, 0, -p / 2);
  return mesh(geom, m);
}

/** Mezza larghezza e cima del tetto di ogni casa, per appoggiare le migliorie. */
export const SAGOMA_CASA: Record<Specie, { mezza: number; cima: number }> = {
  volpe: { mezza: 1.0, cima: 2.5 }, daino: { mezza: 1.0, cima: 3.3 }, lepre: { mezza: 1.2, cima: 2.8 },
  riccio: { mezza: 1.25, cima: 2.55 }, scoiattolo: { mezza: 0.8, cima: 3.65 }, tasso: { mezza: 1.6, cima: 1.35 },
  cavallo: { mezza: 1.25, cima: 2.3 }, mucca: { mezza: 1.05, cima: 2.9 }, asino: { mezza: 1.1, cima: 2.1 },
  maiale: { mezza: 1.0, cima: 2.3 }, uccellino: { mezza: 0.75, cima: 3.47 }, papera: { mezza: 1.0, cima: 1.7 },
};

/**
 * Le migliorie che Giada compra con le castagne (vedi lib/migliorie.ts):
 * 2 portico e vasi di fiori, 3 una stanza in più col camino e le lanterne, 4 bandierine, stella, bandiera e giardino.
 */
function miglioraCasa(g: THREE.Group, specie: Specie, c: { muro: string; tetto: string; porta: string }, livello: number, fronte: number, altPorta: number) {
  const legno = legnoMat();
  const tetto = mat(c.tetto, { rim: 0.4 });
  const { mezza, cima } = SAGOMA_CASA[specie];
  const base = specie === 'scoiattolo' ? 1.66 : 0;
  const alto = altPorta + 1.0; // il tettuccio del portico, sopra l'insegna
  const zp = fronte + 0.6;

  // 2: il portico di legno davanti alla porta e i vasi alle finestre
  for (const x of [-0.6, 0.6]) g.add(mesh(geo.cil(0.05, 0.06, alto - base, 6), legno, x, base + (alto - base) / 2, zp));
  const tettuccio = mesh(geo.scatola(1.5, 0.07, 0.8), tetto, 0, alto + 0.05, fronte + 0.3);
  tettuccio.rotation.x = 0.22;
  g.add(tettuccio);
  if (base) g.add(mesh(geo.scatola(1.4, 0.06, 0.7), legno, 0, base, fronte + 0.32));
  const fiori = ['#ff8fb1', '#ffd166', '#ffffff', '#b39ddb'];
  for (const [i, x] of [-0.95, 0.95].entries()) {
    const vaso = mesh(geo.cil(0.16, 0.12, 0.22, 8), mat('#c8805a'), x, base + 0.11, zp + 0.05);
    for (let k = 0; k < 3; k++) {
      const f = creaFiore(fiori[(i + k) % fiori.length]);
      f.scale.setScalar(1.6);
      f.position.set((k - 1) * 0.08, 0.1, 0);
      vaso.add(f);
    }
    g.add(vaso);
  }
  if (livello < 3) return;

  // 3: una stanza in più sul retro, col suo tettino e il camino che fuma; due lanterne al portico
  const muro = mat(c.muro, { rim: 0.2 });
  const xs = -(mezza + 0.35);
  const stanza = new THREE.Group();
  stanza.position.set(xs, 0, -0.7);
  const vetro = mat('#9fd3f0', { emissive: '#ffd27a', emissiveIntensity: 0.25 });
  let altoCamino = 1.55;
  if (specie === 'tasso') {
    // per il tasso una collinetta più piccola, con la finestrella tonda
    const colle = mesh(geo.palla(0.8, 12), mat('#6ba552', { rim: 0.3 }), 0, 0, 0);
    colle.scale.set(1, 0.9, 1);
    stanza.add(colle);
    const f = mesh(geo.cil(0.16, 0.16, 0.06, 12), vetro, 0, 0.4, 0.7);
    f.rotation.x = Math.PI / 2 - 0.4;
    stanza.add(f);
    altoCamino = 0.85;
  } else {
    stanza.add(mesh(geo.scatola(1.1, 1.0, 1.1), muro, 0, 0.5, 0));
    const t2 = mesh(geo.cono(0.95, 0.7, 4), tetto, 0, 1.35, 0);
    t2.rotation.y = Math.PI / 4;
    stanza.add(t2);
    stanza.add(mesh(geo.scatola(0.3, 0.3, 0.05), vetro, 0, 0.6, 0.56));
  }
  stanza.add(mesh(geo.scatola(0.22, 0.6, 0.22), pietra(), 0.25, altoCamino, -0.15));
  const fumo = new THREE.Group();
  fumo.name = 'fumo';
  for (let i = 0; i < 3; i++) {
    const p = mesh(geo.palla(0.12 + i * 0.05, 8), mat('#eeeeee', { transparent: true, opacity: 0.75 - i * 0.18 }), Math.sin(i) * 0.08, 0.3 + i * 0.28, 0);
    p.userData.senzaContorno = true;
    fumo.add(p);
  }
  fumo.position.set(0.25, altoCamino + 0.3, -0.15);
  stanza.add(fumo);
  g.add(stanza);
  for (const x of [-0.6, 0.6]) {
    g.add(mesh(geo.cil(0.01, 0.01, 0.15, 4), mat('#4a3a2c'), x, alto - 0.08, zp));
    g.add(mesh(geo.palla(0.09, 10), mat('#ffe2a0', { emissive: '#ffb347', emissiveIntensity: 0.9, rim: 0 }), x, alto - 0.22, zp));
    g.add(mesh(geo.cono(0.11, 0.08, 8), mat('#4a3a2c'), x, alto - 0.12, zp));
  }
  if (livello < 4) return;

  // 4: bottega famosa: bandierine dal portico al tetto, la stella in cima, la bandiera e il giardino fiorito
  const colori = ['#ff6f91', '#ffd166', '#7fc8f8', '#7ccf6a', '#b39ddb'];
  for (const lato of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const k = (i + 0.5) / 5;
      const b = mesh(geo.cono(0.08, 0.16, 3), mat(colori[i]), lato * (0.6 + k * (mezza - 0.4)), alto + 0.1 + k * (cima - alto - 0.6) - Math.sin(k * Math.PI) * 0.15, zp - k * 0.6);
      b.rotation.x = Math.PI;
      g.add(b);
    }
  }
  const stella = spriteTesto('★', '#ffd23f');
  stella.scale.setScalar(0.7);
  stella.position.set(0, cima + 0.3, 0);
  g.add(stella);
  const asta = mesh(geo.cil(0.035, 0.04, 3.2, 6), legno, mezza + 0.35, 1.6, -0.6);
  g.add(asta);
  const bandiera = mesh(geo.scatola(0.6, 0.38, 0.02), mat(c.porta, { side: THREE.DoubleSide }), mezza + 0.66, 3.0, -0.6);
  bandiera.name = 'bandiera';
  g.add(bandiera);
  const zg = Math.max(fronte, 1.1) + 1.25;
  for (let i = 0; i < 8; i++) {
    const x = (i < 4 ? -1 : 1) * (0.45 + (i % 4) * 0.22);
    const f = creaFiore(colori[i % colori.length]);
    f.scale.setScalar(2.2);
    f.position.set(x, 0, zg + (i % 2) * 0.18);
    g.add(f);
  }
}

/** Cartello a freccia per indicare la via, con una scritta di Giada. */
export function creaCartelloVia(testo: string): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.4));
  const legno = assi();
  g.add(mesh(geo.cil(0.05, 0.06, 1.5, 6), legno, 0, 0.75, 0));
  const tav = texture(256, (c, l) => {
    c.fillStyle = '#c4935e'; c.fillRect(0, 0, l, l);
    c.fillStyle = '#a87a48'; for (let y = 0; y < l; y += 40) c.fillRect(0, y, l, 4);
    c.fillStyle = '#4a3020'; c.font = `900 ${l * 0.2}px 'Nunito Variable', sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const t = testo.length > 14 ? testo.slice(0, 13) + '…' : testo;
    let size = l * 0.3;
    c.font = `900 ${size}px 'Nunito Variable', sans-serif`;
    while (c.measureText(t).width > l * 0.86 && size > 20) { size -= 4; c.font = `900 ${size}px 'Nunito Variable', sans-serif`; }
    c.fillText(t, l * 0.45, l / 2);
  });
  tav.repeat.set(1, 1);
  // la freccia: un'asse con la punta, che indica verso destra (ruotando il cartello si cambia direzione)
  const forma = new THREE.Shape();
  forma.moveTo(-0.5, -0.17); forma.lineTo(0.38, -0.17); forma.lineTo(0.55, 0); forma.lineTo(0.38, 0.17); forma.lineTo(-0.5, 0.17); forma.closePath();
  const geoF = new THREE.ExtrudeGeometry(forma, { depth: 0.05, bevelEnabled: false });
  // coordinate uv da -0.5..0.55 → 0..1
  const uv = geoF.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 0.5) / 1.05, uv.getY(i) / 1.05 + 0.5);
  const freccia = mesh(geoF, mat('#ffffff', { map: tav, rim: 0 }), 0.05, 1.25, -0.025);
  g.add(freccia);
  return contorno(g);
}

/** Un pezzo di recinto lungo 2 metri: si mettono in fila e si girano come si vuole. */
export function creaRecinto(): THREE.Group {
  const g = new THREE.Group();
  const legno = assi();
  for (const x of [-1, 0, 1]) {
    g.add(mesh(geo.scatola(0.11, 0.75, 0.11), legno, x, 0.37, 0));
    g.add(mesh(geo.cono(0.08, 0.12, 4), legno, x, 0.8, 0));
  }
  for (const y of [0.3, 0.58]) g.add(mesh(geo.scatola(2.05, 0.09, 0.05), legno, 0, y, 0.06));
  return contorno(g);
}
