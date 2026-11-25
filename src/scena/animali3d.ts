// Gli animali del villaggio, ridisegnati (2026-11-25):
// - un corpo solo, liscio, come disegnato (vedi pelle.ts), che si piega alle giunture senza pezzi incastrati;
// - da grandi stanno in piedi su due zampe (meglio per parlarsi, lavorare, tenere le cose in mano);
//   i cuccioli restano a quattro zampe;
// - occhi "da persona": bianco, iride, pupilla, palpebre e sopracciglia che mostrano come si sentono;
// - tutto l'animale (occhi e orecchie compresi) si disegna in un colpo solo: più leggero di prima.
import * as THREE from 'three';
import { hash, rng } from '../lib/caso';
import type { Animale, Specie } from '../lib/tipi';
import { aggiornaGuardaroba, capo, conDivisa, indossati, type Parte } from '../lib/vestiti';
import { defMestiere } from '../lib/mestieri';
import { creaAttrezzoInMano, mettiCapo, mettiOcchiali, type Attacchi } from './sartoria';
import { contorno, GUSCI, matContorno, materiale, ombra, strisce, texture } from './ps1';
import { fiocco, fiore, geo, mat, mesh, unisciTutto, varia } from './modelli';
import { Assemblaggio, distGoccia, goccia, Scultura, type Goccia, type PelleFatta, type Pittore } from './pelle';

type V = [number, number, number];

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
    { corpo: '#f9c9b6', pancia: '#fde4d8', muso: '#f4a79a', zampe: '#eb9c8e', extra: '#f9c9b6', occhi: '#2a1a1c' },
    { corpo: '#3e3638', pancia: '#5a5052', muso: '#6a5a5c', zampe: '#2a2426', extra: '#f8f2ee', occhi: '#0e0a0a' },
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

/** Come si sente (si vede da occhi, sopracciglia e bocca). */
export type Espressione = 'neutro' | 'gioia' | 'fiducia' | 'paura' | 'sorpresa' | 'tristezza' | 'disgusto' | 'rabbia' | 'attesa' | 'sonno' | 'impegno';
interface Viso { sopY: number; sopR: number; lidS: number; lidI: number; bocca: number; aperta: number }
const VISI: Record<Espressione, Viso> = {
  neutro: { sopY: 0.04, sopR: -0.05, lidS: 0.03, lidI: 0, bocca: 0.35, aperta: 0 },
  gioia: { sopY: 0.22, sopR: -0.12, lidS: 0.05, lidI: 0.55, bocca: 1, aperta: 0.45 },
  fiducia: { sopY: 0.08, sopR: -0.05, lidS: 0.14, lidI: 0.25, bocca: 0.7, aperta: 0 },
  paura: { sopY: 0.3, sopR: -0.42, lidS: 0, lidI: 0, bocca: -0.6, aperta: 0.35 },
  sorpresa: { sopY: 0.5, sopR: -0.08, lidS: 0, lidI: 0, bocca: 0, aperta: 0.8 },
  tristezza: { sopY: 0.05, sopR: -0.5, lidS: 0.4, lidI: 0.1, bocca: -1, aperta: 0 },
  disgusto: { sopY: -0.22, sopR: 0.22, lidS: 0.34, lidI: 0.35, bocca: -0.7, aperta: 0.12 },
  rabbia: { sopY: -0.34, sopR: 0.5, lidS: 0.22, lidI: 0.25, bocca: -0.85, aperta: 0 },
  attesa: { sopY: 0.26, sopR: 0.06, lidS: 0.03, lidI: 0.1, bocca: 0.45, aperta: 0.12 },
  sonno: { sopY: -0.05, sopR: -0.1, lidS: 1, lidI: 0, bocca: 0.2, aperta: 0 },
  impegno: { sopY: -0.16, sopR: 0.2, lidS: 0.12, lidI: 0.15, bocca: 0.1, aperta: 0 },
};

/** Le parti che si muovono da sole per sembrare vive (gomiti, ginocchia, coda, orecchie, viso). */
interface Vivo {
  gomiti: THREE.Object3D[]; ginocchia: THREE.Object3D[]; codaOssa: THREE.Object3D[]; orecchie: THREE.Object3D[];
  petto: THREE.Object3D; bacino: THREE.Object3D;
  palpebreS: THREE.Object3D[]; palpebreI: THREE.Object3D[]; sopr: THREE.Object3D[];
  sguardo: THREE.Object3D; angoli: THREE.Object3D; aperta: THREE.Object3D;
  R: number; // raggio dell'occhio (nelle misure della testa)
  siede: number; // di quanto scende per sedersi per terra
  floscio: number; // quanto ballano le orecchie
  viso: Viso; meta: Espressione; chiusi: number; parla: number;
  sguardoX: number; sguardoY: number; prossimoSguardo: number;
  yPrima: number; giroPrima: number; vy: number; vGiro: number; lag: number[]; seme: number; tPrima: number;
}

export interface ModelloAnimale {
  gruppo: THREE.Group;
  corpo: THREE.Group;
  /** Dove si appoggiano i vestiti: non si vede (il corpo vero è la pelle). */
  busto: THREE.Mesh;
  pancia: THREE.Mesh;
  testa: THREE.Object3D;
  /** 0-1: zampe davanti (le braccia, da grandi); 2-3: zampe dietro (le gambe). */
  zampe: THREE.Object3D[];
  coda: THREE.Object3D | null;
  /** Per chiuderli: scale.y piccola = occhi chiusi (lo legge rifinisci, che muove le palpebre). */
  occhi: THREE.Object3D[];
  accessorio: THREE.Object3D | null;
  mestiere: string | null;
  ossa: { tronco: THREE.Object3D; spalle: THREE.Object3D[]; perno: THREE.Object3D; alza: number };
  /** In piedi su due zampe (da giovane in poi); i cuccioli stanno a quattro zampe. */
  bipede: boolean;
  /** Le mani: qui si attaccano gli attrezzi, la canna da pesca... */
  mani: THREE.Object3D[];
  vivo: Vivo;
}

// ---------- come è fatta ogni specie ----------
// La testa (uguale da cucciolo e da grande, cambia solo la grandezza): proporzioni prese dagli animali veri e addolcite.
type Piede = 'zoccolo' | 'zampa' | 'artiglio';
interface Forma {
  taglia: number; // grandezza della specie nel villaggio
  // --- cucciolo a quattro zampe ---
  L: number; H: number; W: number; gamba: number; gR: number; collo: number; colloA: number; testa: number; testaA: number;
  // --- testa ---
  cranio: V; muso: { l: number; r: number; punta: number; y: number }; occhiLato: number; guance: number;
  piede: Piede;
  alza: number;
  // --- da grande, in piedi ---
  P: { gamba: number; gR: number; torso: V; braccio: number; bR: number; collo: number; testa: number; testaA: number; piedeL: number; muso: number };
}
const FORME: Record<Specie, Forma> = {
  volpe: { taglia: 0.92, L: 0.8, H: 0.36, W: 0.34, gamba: 0.3, gR: 0.045, collo: 0.1, colloA: 0.75, testa: 0.5, testaA: 0.05, cranio: [0.98, 0.86, 0.95], muso: { l: 0.36, r: 0.2, punta: 0.075, y: -0.13 }, occhiLato: 0.1, guance: 0.2, piede: 'zampa', alza: 1.25,
    P: { gamba: 0.27, gR: 0.052, torso: [0.2, 0.25, 0.17], braccio: 0.3, bR: 0.048, collo: 0.02, testa: 0.6, testaA: 0.06, piedeL: 0.1, muso: 0.82 } },
  daino: { taglia: 1.08, L: 0.86, H: 0.4, W: 0.34, gamba: 0.5, gR: 0.04, collo: 0.3, colloA: 0.45, testa: 0.54, testaA: 0.2, cranio: [0.92, 0.94, 1], muso: { l: 0.38, r: 0.21, punta: 0.12, y: -0.13 }, occhiLato: 0.4, guance: 0.12, piede: 'zoccolo', alza: 1.2,
    P: { gamba: 0.42, gR: 0.045, torso: [0.19, 0.26, 0.16], braccio: 0.34, bR: 0.042, collo: 0.13, testa: 0.56, testaA: 0.12, piedeL: 0.05, muso: 0.72 } },
  tasso: { taglia: 0.9, L: 0.88, H: 0.42, W: 0.48, gamba: 0.18, gR: 0.07, collo: 0.05, colloA: 1.1, testa: 0.6, testaA: 0.22, cranio: [1.02, 0.86, 1.05], muso: { l: 0.34, r: 0.22, punta: 0.085, y: -0.12 }, occhiLato: 0.05, guance: 0.2, piede: 'artiglio', alza: 1.3,
    P: { gamba: 0.17, gR: 0.075, torso: [0.26, 0.26, 0.23], braccio: 0.27, bR: 0.066, collo: 0, testa: 0.62, testaA: 0.1, piedeL: 0.11, muso: 0.82 } },
  riccio: { taglia: 0.72, L: 0.64, H: 0.42, W: 0.5, gamba: 0.11, gR: 0.055, collo: 0.02, colloA: 1.2, testa: 0.56, testaA: 0.25, cranio: [0.95, 0.9, 1], muso: { l: 0.3, r: 0.2, punta: 0.07, y: -0.12 }, occhiLato: 0.05, guance: 0.18, piede: 'zampa', alza: 1.2,
    P: { gamba: 0.11, gR: 0.06, torso: [0.25, 0.24, 0.24], braccio: 0.21, bR: 0.052, collo: 0, testa: 0.58, testaA: 0.1, piedeL: 0.09, muso: 0.85 } },
  scoiattolo: { taglia: 0.72, L: 0.56, H: 0.32, W: 0.3, gamba: 0.2, gR: 0.045, collo: 0.05, colloA: 0.5, testa: 0.56, testaA: -0.05, cranio: [0.96, 0.96, 1], muso: { l: 0.18, r: 0.2, punta: 0.11, y: -0.12 }, occhiLato: 0.25, guance: 0.22, piede: 'zampa', alza: 1.25,
    P: { gamba: 0.17, gR: 0.052, torso: [0.18, 0.22, 0.17], braccio: 0.24, bR: 0.045, collo: 0, testa: 0.6, testaA: 0, piedeL: 0.11, muso: 1 } },
  lepre: { taglia: 0.85, L: 0.66, H: 0.38, W: 0.34, gamba: 0.28, gR: 0.045, collo: 0.08, colloA: 0.4, testa: 0.56, testaA: 0.1, cranio: [0.92, 0.98, 1.05], muso: { l: 0.2, r: 0.22, punta: 0.13, y: -0.12 }, occhiLato: 0.45, guance: 0.2, piede: 'zampa', alza: 1.2,
    P: { gamba: 0.27, gR: 0.055, torso: [0.19, 0.24, 0.17], braccio: 0.27, bR: 0.046, collo: 0.02, testa: 0.58, testaA: 0.05, piedeL: 0.17, muso: 1 } },
  cavallo: { taglia: 1.25, L: 1.0, H: 0.5, W: 0.42, gamba: 0.58, gR: 0.055, collo: 0.34, colloA: 0.62, testa: 0.5, testaA: 0.7, cranio: [0.85, 0.9, 0.95], muso: { l: 0.72, r: 0.3, punta: 0.21, y: -0.12 }, occhiLato: 0.45, guance: 0.1, piede: 'zoccolo', alza: 1.15,
    P: { gamba: 0.46, gR: 0.06, torso: [0.24, 0.31, 0.21], braccio: 0.4, bR: 0.055, collo: 0.16, testa: 0.54, testaA: 0.32, piedeL: 0.06, muso: 0.72 } },
  asino: { taglia: 1.1, L: 0.9, H: 0.48, W: 0.42, gamba: 0.5, gR: 0.055, collo: 0.26, colloA: 0.62, testa: 0.62, testaA: 0.45, cranio: [0.92, 0.95, 0.95], muso: { l: 0.52, r: 0.27, punta: 0.22, y: -0.08 }, occhiLato: 0.4, guance: 0.1, piede: 'zoccolo', alza: 1.15,
    P: { gamba: 0.38, gR: 0.06, torso: [0.24, 0.29, 0.21], braccio: 0.36, bR: 0.055, collo: 0.1, testa: 0.62, testaA: 0.22, piedeL: 0.06, muso: 0.78 } },
  mucca: { taglia: 1.2, L: 1.06, H: 0.58, W: 0.54, gamba: 0.42, gR: 0.065, collo: 0.16, colloA: 1.0, testa: 0.56, testaA: 0.35, cranio: [0.95, 0.92, 0.95], muso: { l: 0.32, r: 0.27, punta: 0.24, y: -0.12 }, occhiLato: 0.4, guance: 0.1, piede: 'zoccolo', alza: 1.1,
    P: { gamba: 0.32, gR: 0.07, torso: [0.29, 0.32, 0.26], braccio: 0.36, bR: 0.065, collo: 0.04, testa: 0.6, testaA: 0.15, piedeL: 0.07, muso: 0.9 } },
  maiale: { taglia: 1.0, L: 0.9, H: 0.52, W: 0.52, gamba: 0.2, gR: 0.06, collo: 0.04, colloA: 1.2, testa: 0.64, testaA: 0.12, cranio: [1.02, 0.95, 1], muso: { l: 0.24, r: 0.24, punta: 0.2, y: -0.1 }, occhiLato: 0.2, guance: 0.2, piede: 'zoccolo', alza: 1.2,
    P: { gamba: 0.17, gR: 0.07, torso: [0.29, 0.28, 0.27], braccio: 0.26, bR: 0.064, collo: 0, testa: 0.66, testaA: 0.05, piedeL: 0.07, muso: 1 } },
  // gli uccelli stanno già su due zampe: stesso corpo da piccoli e da grandi
  uccellino: { taglia: 0.62, L: 0.5, H: 0.5, W: 0.44, gamba: 0.16, gR: 0.02, collo: 0, colloA: 0, testa: 0.62, testaA: 0, cranio: [1, 0.96, 1], muso: { l: 0, r: 0, punta: 0, y: 0 }, occhiLato: 0.35, guance: 0.16, piede: 'artiglio', alza: 0,
    P: { gamba: 0.2, gR: 0.02, torso: [0.22, 0.25, 0.23], braccio: 0.24, bR: 0.05, collo: 0, testa: 0.62, testaA: 0, piedeL: 0.08, muso: 1 } },
  papera: { taglia: 0.78, L: 0.78, H: 0.46, W: 0.46, gamba: 0.16, gR: 0.03, collo: 0.28, colloA: 0.1, testa: 0.6, testaA: 0, cranio: [0.95, 0.92, 1.05], muso: { l: 0, r: 0, punta: 0, y: 0 }, occhiLato: 0.3, guance: 0.15, piede: 'zampa', alza: 0,
    P: { gamba: 0.2, gR: 0.028, torso: [0.23, 0.26, 0.26], braccio: 0.28, bR: 0.05, collo: 0.14, testa: 0.6, testaA: 0, piedeL: 0.1, muso: 1 } },
};
/** Quanto è grande la specie nel villaggio (per le case, le prove, il ritratto). */
export const tagliaSpecie = (s: Specie) => FORME[s].taglia;

/** Per animali salvati prima che esistesse l'aspetto (non dovrebbe servire: lo aggiunge la migrazione). */
function aspettoDiRiserva(a: Animale) {
  const r = rng(hash(a.id));
  return { manto: Math.floor(r() * 4), tratto: 'lentiggini', forma: r() * 2 - 1, occhi: r(), orecchie: r(), taglia: 1, lato: 1 };
}

// caselle della tavolozza
const C_CORPO = 0, C_PANCIA = 1, C_MUSO = 2, C_ZAMPE = 3, C_EXTRA = 4, C_ZOCCOLO = 5, C_TESTA = 6, C_CODA = 7, C_PUNTA = 8, C_ALI = 9;

const CELLA = 0.03;
const PELLI = new Map<string, PelleFatta>();
/** I vestiti già cuciti, per forma di animale e taglio del capo. */
const VESTITI = new Map<string, THREE.BufferGeometry>();
let _matPelle: THREE.MeshToonMaterial | null = null;
const matPelle = () => (_matPelle ??= materiale({ color: '#ffffff', vertexColors: true, rim: 0.22 }));

/** Una sfumatura irregolare, come il pelo dipinto a mano. */
function rumore(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}
function pennellate(p: THREE.Vector3) {
  const f = 9;
  const ix = Math.floor(p.x * f), iy = Math.floor(p.y * f), iz = Math.floor(p.z * f);
  const fx = p.x * f - ix, fy = p.y * f - iy, fz = p.z * f - iz;
  let v = 0;
  for (let k = 0; k < 8; k++) {
    const a = k & 1, b = (k >> 1) & 1, c = (k >> 2) & 1;
    v += rumore(ix + a, iy + b, iz + c) * (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz);
  }
  return v - 0.5;
}

const col = (c: string) => new THREE.Color(c);

/** Orecchio morbido: una foglia un po' a coppa, col dentro chiaro. La base sta in y = 0, la punta in y = l. */
function geoOrecchio(o: { l: number; w: number; e?: number; sp?: number; fuori: THREE.Color; dentro: THREE.Color; punta?: THREE.Color; quantaPunta?: number }) {
  const g = new THREE.SphereGeometry(1, 14, 12);
  const p = g.attributes.position;
  const colori = new Float32Array(p.count * 3);
  const e = o.e ?? 1, sp = o.sp ?? 0.42;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), x = p.getX(i), z = p.getZ(i);
    const u = (y + 1) / 2;
    const rho = Math.hypot(x, z) || 1e-6;
    const cs = x / rho, sn = z / rho;
    const hw = o.w * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * Math.pow(u, e))), 0.75) * (rho < 1e-4 ? 0 : 1);
    const davanti = sn > 0;
    // il davanti rientra: una coppa
    const zz = davanti ? -sn * hw * sp * 0.35 + (1 - Math.abs(cs)) * 0 : sn * hw * sp;
    p.setXYZ(i, cs * hw, (u - 0.08) * o.l, zz);
    const c = o.punta && u > 1 - (o.quantaPunta ?? 0.25) ? o.punta : davanti && sn > 0.3 && u > 0.1 && u < 0.93 ? o.dentro : o.fuori;
    colori[i * 3] = c.r; colori[i * 3 + 1] = c.g; colori[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colori, 3));
  g.computeVertexNormals();
  return g;
}

/** Una capsula stesa lungo x e piegata ad arco (sopracciglia, bocca). */
function geoArco(lungo: number, r: number, arco: number, fondo = 0) {
  const g = new THREE.CapsuleGeometry(r, lungo, 4, 10);
  g.rotateZ(Math.PI / 2);
  const p = g.attributes.position;
  const hw = lungo / 2 + r;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / hw;
    p.setY(i, p.getY(i) + arco * (1 - u * u));
    p.setZ(i, p.getZ(i) - fondo * u * u);
  }
  g.computeVertexNormals();
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
/** Una matrice "figlia": posizione, scala e rotazione dentro `gen`. */
function M(gen: THREE.Matrix4, p: V, s: V | number = 1, r?: V) {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(...s);
  _q.setFromEuler(new THREE.Euler(...(r ?? [0, 0, 0])));
  return gen.clone().multiply(_m.compose(new THREE.Vector3(...p), _q, sc));
}

/** Il corvo narratore: fatto come gli uccellini del villaggio, ma più grande, nero-blu e col becco lungo. */
const MANTO_CORVO: Mantello = { corpo: '#2e3142', pancia: '#4a4f6a', muso: '#454a63', zampe: '#e0a040', extra: '#23252f', occhi: '#8a5a20' };

/** divisa: se sta lavorando, con la divisa del suo mestiere. corvo: solo per il corvo narratore (vedi creaCorvo). */
export function creaAnimale(a: Animale, divisa = false, corvo = false): ModelloAnimale {
  const asp = a.aspetto ?? aspettoDiRiserva(a);
  const base = corvo ? MANTO_CORVO : MANTI[a.specie][asp.manto % MANTI[a.specie].length];
  const t = { segno: asp.tratto, lato: asp.lato, taglia: asp.taglia };
  const p = { ...base, zampe: t.segno === 'calzini bianchi' ? '#fbf8f2' : base.zampe };
  const piccolo = a.fase === 'cucciolo';
  const papera = a.specie === 'papera', uccello = a.specie === 'uccellino' || papera;
  const bipede = !piccolo || uccello;
  const F0 = FORME[a.specie];
  const F = corvo ? { ...F0, P: { ...F0.P, torso: [0.25, 0.3, 0.26] as [number, number, number], testa: 0.6 } } : F0;
  const P = F.P;
  const zoccoli = F.piede === 'zoccolo';
  // corporatura: rotondetto, normale o slanciato (tre forme per specie: la pelle si prepara una volta sola per ognuna)
  const formaQ = asp.forma < -0.33 ? -0.7 : asp.forma > 0.33 ? 0.7 : 0;
  const folta = t.segno === 'codaM extra folta';
  const kTesta = piccolo ? (uccello ? 1.12 : 1.3) : a.fase === 'giovane' ? 1.06 : 1;
  const kMuso = (piccolo ? 0.68 : a.fase === 'giovane' ? 0.9 : 1) * (bipede ? P.muso : 1);
  const kOcchi = piccolo ? 1.18 : 1;

  const gruppo = new THREE.Group();
  const corpo = new THREE.Group();
  gruppo.add(corpo);

  // ---------- lo scheletro ----------
  const ossa: THREE.Bone[] = [];
  const tmpV = new THREE.Vector3();
  /** Un osso nuovo, nel punto (del mondo dell'animale) dato. */
  const osso = (gen: THREE.Object3D, x: number, y: number, z: number) => {
    const b = new THREE.Bone();
    gen.updateWorldMatrix(true, false);
    b.position.copy(gen.worldToLocal(tmpV.set(x, y, z)));
    gen.add(b);
    b.userData.i = ossa.length;
    ossa.push(b);
    b.updateWorldMatrix(false, false);
    return b;
  };
  const I = (b: THREE.Object3D) => b.userData.i as number;
  const sc = new Scultura();

  // misure
  const tw = P.torso[0] * (1 - formaQ * 0.07), th = P.torso[1] * (1 + formaQ * 0.03), td = P.torso[2] * (1 - formaQ * 0.07);
  const kC = piccolo ? 0.82 : 1;
  const L = F.L * kC * (1 + formaQ * 0.05), H = F.H * kC * (1 - formaQ * 0.05), W = F.W * kC * (1 - formaQ * 0.07);
  const gambaQ = F.gamba * (piccolo ? (zoccoli ? 0.92 : 0.82) : 1);
  const yB = gambaQ + H * 0.42; // (cucciolo) altezza del centro del corpo
  const hipY = P.gamba;
  const cY = hipY + th * 0.8; // (in piedi) centro del busto

  const bacino = osso(corpo, 0, bipede ? hipY : yB, bipede ? 0 : -L * 0.3);
  const tronco = osso(corpo, 0, bipede ? hipY : yB, bipede ? 0 : -L * 0.3);
  const petto = osso(tronco, 0, bipede ? cY : yB, bipede ? 0 : L * 0.12);
  // il "busto" dei vestiti: una palla che non si vede, grande come il busto vero
  const vuota = () => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat('#ffffff')); m.userData.senzaContorno = true; m.raycast = () => {}; return m; };
  const busto = vuota();
  const pancia = vuota();
  busto.add(pancia);
  petto.add(busto);
  if (bipede) busto.scale.set(tw / 0.34, th / 0.34, td / 0.34);
  else {
    busto.position.set(0, 0, -L * 0.12);
    busto.rotation.x = Math.PI / 2;
    busto.scale.set(W / 0.68, L / 0.68, H / 0.68);
  }
  /** Un pezzo appoggiato sul busto senza essere stirato come lui. */
  const sulBusto = (o: THREE.Object3D, s = 1) => {
    o.scale.set(s / busto.scale.x, s / busto.scale.y, s / busto.scale.z);
    busto.add(o);
    return o;
  };

  // collo e testa
  const sT = (bipede ? P.testa : F.testa) * kTesta;
  const lCollo = bipede ? P.collo : F.collo;
  const colloA = bipede ? 0 : F.colloA;
  const pernoP: V = bipede ? [0, cY + th * (uccello ? 0.62 : 0.8), td * (uccello ? 0.25 : 0.08)] : [0, yB + H * 0.2 + Math.cos(colloA) * lCollo, L * 0.34 + Math.sin(colloA) * lCollo];
  const colloBase: V = bipede ? [0, cY + th * 0.55, td * 0.05] : [0, yB + H * 0.12, L * 0.3];
  const perno = osso(petto, ...pernoP);
  perno.scale.setScalar(sT);
  perno.rotation.x = bipede ? P.testaA : F.testaA;
  perno.userData.base = perno.rotation.x;
  perno.updateWorldMatrix(true, false);
  const testa = new THREE.Bone();
  testa.position.set(0, bipede ? 0.4 + lCollo / sT : 0.14, bipede ? 0.05 : 0.1);
  perno.add(testa);
  testa.userData.i = ossa.length;
  ossa.push(testa);
  testa.updateWorldMatrix(true, false);
  const MT = testa.matrixWorld.clone();
  const rotT = new THREE.Euler().setFromRotationMatrix(MT);
  /** Dalle misure della testa a quelle dell'animale. */
  const hu = (x: number, y: number, z: number): V => tmpV.set(x, y, z).applyMatrix4(MT).toArray() as V;
  const huV = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(MT);
  const dirT = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).transformDirection(MT);
  /** Un osso figlio della testa, in un punto dato nelle misure della testa. */
  const ossoT = (x: number, y: number, z: number, gen: THREE.Object3D = testa) => {
    const w = huV(x, y, z);
    const b = osso(gen, w.x, w.y, w.z);
    b.userData.p0 = b.position.clone();
    return b;
  };

  // braccia e gambe
  const zampe: THREE.Object3D[] = [], spalle: THREE.Object3D[] = [], gomiti: THREE.Object3D[] = [], ginocchia: THREE.Object3D[] = [], mani: THREE.Object3D[] = [];
  const arti: { s: number; S: V; E: V; Wp: V; A: V; G: V; Cv: V }[] = [];
  const bR = P.bR, gR = bipede ? P.gR : F.gR * (piccolo ? 1.08 : 1);
  for (const s of [-1, 1]) {
    let S: V, E: V, Wp: V, A: V, G: V, Cv: V;
    if (uccello) {
      // le ali: chiuse sui fianchi, fanno da braccia
      S = [s * tw * 0.86, cY + th * 0.3, 0];
      E = [s * (tw * 0.98 + 0.03), cY - th * 0.15, -td * 0.25];
      Wp = [s * (tw * 0.9 + 0.03), cY - th * 0.5, -td * 0.55];
      A = [s * tw * 0.42, hipY, 0]; G = [s * tw * 0.42, hipY * 0.5, 0]; Cv = [s * tw * 0.42, 0.02, 0];
    } else if (bipede) {
      // le braccia un po' aperte (così non si incollano ai fianchi), i piedi ben piantati
      const ang = 0.42;
      S = [s * tw * 0.8, cY + th * 0.46, 0];
      E = [S[0] + s * Math.sin(ang) * P.braccio * 0.5, S[1] - Math.cos(ang) * P.braccio * 0.5, 0.02];
      Wp = [S[0] + s * Math.sin(ang * 0.8) * P.braccio, S[1] - Math.cos(ang * 0.8) * P.braccio, 0.05];
      A = [s * Math.max(tw * 0.5, gR * 1.5), hipY + 0.02, 0];
      G = [A[0] * 1.04, hipY * 0.52, 0.015];
      Cv = [A[0] * 1.06, gR * 1.05, 0];
    } else {
      const lz = yB - H * 0.1;
      S = [s * W * 0.3, lz, L * 0.26]; E = [s * W * 0.3, lz * 0.5, L * 0.27]; Wp = [s * W * 0.3, gR, L * 0.26];
      A = [s * W * 0.3, lz, -L * 0.24]; G = [s * W * 0.31, lz * 0.5, -L * 0.22]; Cv = [s * W * 0.31, gR, -L * 0.25];
    }
    arti.push({ s, S, E, Wp, A, G, Cv });
  }
  for (const { S, E, Wp } of arti) {
    const spalla = osso(petto, ...S);
    const braccio = osso(spalla, ...S);
    const gomito = osso(braccio, ...E);
    const mano = new THREE.Group();
    gomito.updateWorldMatrix(true, false);
    mano.position.copy(gomito.worldToLocal(new THREE.Vector3(...Wp)));
    gomito.add(mano);
    braccio.userData.lunghezza = S[1] - Wp[1];
    spalle.push(spalla); zampe.push(braccio); gomiti.push(gomito); mani.push(mano);
  }
  for (const { A, G } of arti) {
    const coscia = osso(bacino, ...A);
    const ginocchio = osso(coscia, ...G);
    coscia.userData.lunghezza = A[1];
    zampe.push(coscia); ginocchia.push(ginocchio);
  }

  // ---------- la coda (una fila di gocce che si fonde col corpo) ----------
  // punti: [in su, indietro, raggio] a partire dall'attacco
  const codaP: V = bipede ? [0, hipY + th * (uccello ? 0.3 : 0.22), -td * (uccello ? 0.75 : 0.82)] : [0, yB + H * 0.12, -L * 0.46];
  let codaPunti: [number, number, number][] = [];
  let codaColori: number[] = [C_CODA];
  const kCoda = (piccolo ? 0.72 : 1) * (folta ? 1.35 : 1);
  switch (a.specie) {
    case 'volpe': codaPunti = bipede ? [[0, 0, 0.07], [-0.04, -0.17, 0.115], [0.02, -0.36, 0.14], [0.17, -0.5, 0.13], [0.33, -0.57, 0.085], [0.43, -0.59, 0.035]] : [[0, 0, 0.06], [-0.04, -0.16, 0.1], [-0.1, -0.34, 0.125], [-0.12, -0.52, 0.11], [-0.1, -0.66, 0.06], [-0.08, -0.72, 0.03]]; codaColori = [C_CODA, C_CODA, C_CODA, C_PUNTA, C_PUNTA]; break;
    case 'scoiattolo': codaPunti = bipede ? [[0, 0, 0.075], [-0.01, -0.2, 0.12], [0.16, -0.42, 0.16], [0.44, -0.52, 0.175], [0.72, -0.47, 0.16], [0.88, -0.33, 0.105]] : [[0, 0, 0.07], [0.04, -0.2, 0.11], [0.24, -0.34, 0.15], [0.5, -0.32, 0.16], [0.68, -0.2, 0.14], [0.74, -0.06, 0.09]]; break;
    case 'tasso': codaPunti = [[0, 0, 0.075], [-0.03, -0.1, 0.07], [-0.05, -0.18, 0.045]]; break;
    case 'lepre': codaPunti = [[0.02, -0.02, 0.085], [0.03, -0.07, 0.075]]; codaColori = [C_PUNTA]; break;
    case 'daino': codaPunti = [[0, 0, 0.05], [-0.06, -0.07, 0.045], [-0.13, -0.1, 0.03]]; break;
    case 'cavallo': codaPunti = [[0, 0, 0.06], [0.0, -0.12, 0.085], [-0.16, -0.2, 0.095], [-0.36, -0.22, 0.085], [-0.52, -0.2, 0.05]]; break;
    case 'uccellino': codaPunti = corvo ? [[0, 0, 0.09], [-0.08, -0.2, 0.08], [-0.2, -0.42, 0.05]] : [[0, 0, 0.07], [-0.05, -0.14, 0.06], [-0.1, -0.27, 0.04]]; break;
    case 'papera': codaPunti = [[0, 0, 0.09], [0.07, -0.14, 0.07], [0.15, -0.24, 0.035]]; break;
    default: break; // riccio, asino, mucca, maiale: coda sottile, fatta a parte
  }
  codaPunti = codaPunti.map(([y, z, r]) => [y * kCoda, z * kCoda, r * kCoda * (piccolo ? 1.1 : 1)]);
  const codaOssa: THREE.Object3D[] = [];
  {
    const n = Math.max(1, codaPunti.length - 1);
    let gen: THREE.Object3D = bipede ? bacino : tronco;
    for (let k = 0; k < 4; k++) {
      const pt = codaPunti[Math.min(codaPunti.length - 1, Math.floor((k * n) / 4))] ?? [0, 0, 0];
      const b = osso(gen, codaP[0], codaP[1] + pt[0], codaP[2] + pt[1]);
      codaOssa.push(b);
      gen = b;
    }
    codaPunti.slice(0, -1).forEach((pt, k) => {
      const q = codaPunti[k + 1];
      sc.cono([0, codaP[1] + pt[0], codaP[2] + pt[1]], [0, codaP[1] + q[0], codaP[2] + q[1]], pt[2], q[2], I(codaOssa[Math.min(3, Math.floor((k * 4) / n))]),
        codaColori[Math.min(codaColori.length - 1, k)], k === 0 ? 0.05 : 0.04);
    });
  }
  const coda = codaOssa[0];
  const ultimo = codaPunti[codaPunti.length - 1];
  const puntaCoda = new THREE.Vector3(0, codaP[1] + (ultimo?.[0] ?? 0), codaP[2] + (ultimo?.[1] ?? 0));

  // ---------- il corpo ----------
  const primaDelCorpo = sc.gocce.length;
  const colArto = a.specie === 'lepre' || a.specie === 'maiale' || uccello ? C_CORPO : C_ZAMPE;
  if (uccello) {
    sc.uovo([0, cY, 0], [tw, th, td], I(petto), C_CORPO, 0.05, new THREE.Euler(papera ? 0.35 : 0.2, 0, 0));
    sc.uovo([0, hipY + th * 0.5, -td * 0.12], [tw * 0.92, th * 0.6, td * 1.0], I(bacino), C_CORPO, 0.06);
    if (papera || lCollo > 0.02) sc.cono(colloBase, pernoP, tw * 0.5, tw * 0.42, I(perno), C_TESTA, 0.06);
    for (const { s, S, E, Wp } of arti) {
      const i = s < 0 ? 0 : 1;
      sc.uovo([(S[0] + E[0]) / 2, (S[1] + E[1]) / 2, (S[2] + E[2]) / 2 - 0.02], [0.04, th * 0.34, td * 0.42], I(zampe[i]), C_ALI, 0.03, new THREE.Euler(-0.5, 0, s * 0.12));
      sc.uovo([(Wp[0] + E[0]) / 2, (Wp[1] + E[1]) / 2, (Wp[2] + E[2]) / 2], [0.034, th * 0.3, td * 0.34], I(gomiti[i]), C_ALI, 0.03, new THREE.Euler(-0.75, 0, s * 0.1));
    }
  } else if (bipede) {
    // il busto a pera: è la stessa forma su cui si appoggiano i vestiti
    sc.uovo([0, cY, 0], [tw, th, td], I(petto), C_CORPO, 0.05);
    sc.uovo([0, hipY + th * 0.42, 0.005], [tw * 0.95, th * 0.5, td * 0.98], I(bacino), C_CORPO, 0.06);
    const rc = Math.min(tw * 0.62, sT * 0.3);
    sc.cono(colloBase, [pernoP[0], pernoP[1] + lCollo * 0.6, pernoP[2]], rc * 1.15, rc, I(perno), C_CORPO, 0.07);
    for (const { s, S, E, Wp, A, G, Cv } of arti) {
      const i = s < 0 ? 0 : 1;
      sc.cono(S, E, bR * 1.08, bR * 0.96, I(zampe[i]), C_CORPO, 0.035);
      sc.cono(E, Wp, bR * 0.96, bR * 0.94, I(gomiti[i]), colArto, 0.03);
      sc.palla([Wp[0] + s * 0.005, Wp[1] - bR * 0.35, Wp[2] + 0.01], bR * 1.22, I(gomiti[i]), zoccoli ? C_ZOCCOLO : colArto, 0.03);
      sc.cono(A, G, gR * 1.22, gR * 1.04, I(zampe[2 + i]), C_CORPO, 0.04);
      sc.cono(G, Cv, gR * 1.04, gR * 0.98, I(ginocchia[i]), colArto, 0.03);
      if (zoccoli) sc.cono([Cv[0], gR * 0.9, 0.0], [Cv[0], gR * 0.88, P.piedeL], gR * 1.16, gR * 1.08, I(ginocchia[i]), C_ZOCCOLO, 0.02);
      else sc.cono([Cv[0], gR * 0.95, 0.0], [Cv[0] + s * 0.012, gR * 0.82, P.piedeL], gR * 1.1, gR * 1.02, I(ginocchia[i]), colArto, 0.03);
    }
  } else {
    // cucciolo a quattro zampe: un corpo morbido, il sedere tondo, le zampe corte e cicciotte
    sc.uovo([0, yB, 0], [W / 2, H / 2, L / 2], I(tronco), C_CORPO, 0.06);
    sc.palla([0, yB + 0.005, -L * 0.24], H * 0.46, I(bacino), C_CORPO, 0.06);
    sc.palla([0, yB, L * 0.2], Math.min(W, H) * 0.47, I(petto), C_CORPO, 0.06);
    const rc = Math.min(W * 0.38, sT * 0.3);
    sc.cono(colloBase, pernoP, rc * 1.2, rc, I(perno), C_CORPO, 0.07);
    for (const { s, S, E, Wp, A, G, Cv } of arti) {
      const i = s < 0 ? 0 : 1;
      sc.cono([S[0], S[1] - 0.02, S[2]], E, gR * 1.25, gR, I(zampe[i]), C_CORPO, 0.045);
      sc.cono(E, Wp, gR, gR * 0.95, I(gomiti[i]), colArto, 0.03);
      sc.cono([A[0], A[1] - 0.02, A[2]], G, gR * 1.5, gR * 1.05, I(zampe[2 + i]), C_CORPO, 0.045);
      sc.cono(G, Cv, gR * 1.05, gR * 0.98, I(ginocchia[i]), colArto, 0.03);
      const avanti = zoccoli ? 0.012 : gR * 0.9;
      sc.cono([Wp[0], gR * 0.9, Wp[2]], [Wp[0], gR * 0.85, Wp[2] + avanti], gR * 1.12, gR * 1.05, I(gomiti[i]), zoccoli ? C_ZOCCOLO : colArto, 0.025);
      sc.cono([Cv[0], gR * 0.9, Cv[2]], [Cv[0], gR * 0.85, Cv[2] + avanti * (a.specie === 'lepre' ? 2.2 : 1)], gR * 1.14, gR * 1.05, I(ginocchia[i]), zoccoli ? C_ZOCCOLO : colArto, 0.025);
    }
  }

  // il busto da solo: è la forma su cui si cuciono i vestiti
  const delBusto = new Set(sc.gocce.slice(primaDelCorpo).filter((g) => g.osso === I(petto) || g.osso === I(bacino) || g.osso === I(tronco)));

  // ---------- la testa ----------
  const cr = F.cranio;
  const rT = (r: number) => r * sT;
  const iT = I(testa);
  sc.uovo(hu(0, 0, 0), [rT(0.46 * cr[0]), rT(0.46 * cr[1]), rT(0.46 * cr[2])], iT, C_TESTA, 0.05, rotT);
  for (const s of [-1, 1]) sc.palla(hu(s * 0.2, -0.15, 0.14), rT(F.guance), iT, C_TESTA, 0.06);
  const lM = F.muso.l * kMuso;
  const dav = 0.46 * cr[2] * 0.72;
  const giu = lM * (bipede ? 0.22 : 0.12);
  const my = F.muso.y;
  const punta = F.muso.punta * (piccolo ? 0.95 : 1);
  const colMuso = ['asino', 'mucca', 'maiale'].includes(a.specie) ? C_MUSO : C_TESTA;
  if (lM > 0) {
    sc.cono(hu(0, my, dav * 0.55), hu(0, my - giu, dav + lM), rT(F.muso.r), rT(punta), iT, C_TESTA, 0.05);
    sc.palla(hu(0, my - giu, dav + lM + punta * 0.12), rT(punta * 1.02), iT, colMuso, 0.03);
    // la mandibola
    sc.cono(hu(0, my - F.muso.r * 0.55, dav * 0.5), hu(0, my - giu - punta * 0.42, dav + lM * 0.86), rT(F.muso.r * 0.62), rT(punta * 0.72), iT, C_MUSO, 0.04);
  }
  const davantiMuso = dav + lM + punta * 1.1;
  const nasoP: V = [0, my - giu + punta * 0.5, dav + lM + punta * 0.82];

  // criniere e ciuffi che fanno parte del corpo
  if (a.specie === 'cavallo' || a.specie === 'asino') {
    const asino = a.specie === 'asino';
    const r = asino ? 0.06 : 0.085;
    const dietro = -0.46 * cr[2];
    const giuCollo = bipede ? -0.5 - lCollo / sT : -0.3;
    const pts: V[] = asino ? [[0, 0.4, -0.1], [0, 0.22, dietro - 0.02], [0, -0.1, dietro - 0.04], [0, giuCollo, dietro + 0.06]]
      : [[0, 0.36, 0.2], [0, 0.45, -0.02], [0.02, 0.26, dietro - 0.03], [0.03, -0.1, dietro - 0.07], [0.03, giuCollo, dietro + 0.04], [0.02, giuCollo - 0.3, dietro + 0.14]];
    pts.slice(0, -1).forEach((q, k) => sc.cono(hu(...q), hu(...pts[k + 1]), rT(r * (k === 0 && !asino ? 0.9 : 1.1)), rT(r * (k === pts.length - 2 ? 0.6 : 1.1)), k < 3 ? iT : I(perno), C_EXTRA, 0.025));
  }
  if (a.specie === 'mucca') sc.uovo(hu(0, 0.42, 0.08), [rT(0.14), rT(0.07), rT(0.11)], iT, C_TESTA, 0.03, rotT);
  if (a.specie === 'volpe') for (const s of [-1, 1]) sc.cono(hu(s * 0.22, -0.16, 0.1), hu(s * 0.44, -0.24, 0.02), rT(0.16), rT(0.05), iT, C_TESTA, 0.05);

  // ---------- la pelle: si prepara una volta per forma, poi si colora per ogni animale ----------
  const chiave = [corvo ? 'corvo' : a.specie, piccolo ? 'c' : a.fase === 'giovane' ? 'g' : 'a', formaQ, folta ? 'f' : ''].join('|');
  let pelle = PELLI.get(chiave);
  if (!pelle) PELLI.set(chiave, (pelle = sc.costruisci(CELLA)));

  // la tavolozza di questo animale
  const corpoC = papera && piccolo ? '#ffe270' : p.corpo;
  const panciaC = papera && piccolo ? '#fff2b0' : a.specie === 'tasso' ? varia(p.zampe, 0, 0.05) : p.pancia;
  const testaC = a.specie === 'tasso' || a.specie === 'riccio' ? p.muso : papera ? (piccolo ? '#ffe270' : a.sesso === 'm' || asp.manto % 4 !== 1 ? p.extra : p.corpo) : corpoC;
  const tav: THREE.Color[] = [];
  tav[C_CORPO] = col(corpoC); tav[C_PANCIA] = col(panciaC); tav[C_MUSO] = col(a.specie === 'tasso' || a.specie === 'riccio' ? p.muso : uccello ? testaC : p.muso);
  tav[C_ZAMPE] = col(p.zampe); tav[C_EXTRA] = col(p.extra);
  tav[C_ZOCCOLO] = col(a.specie === 'maiale' ? varia(p.zampe, 0, -0.18) : '#3e3029');
  tav[C_TESTA] = col(testaC);
  tav[C_CODA] = col(a.specie === 'scoiattolo' || a.specie === 'cavallo' ? p.extra : a.specie === 'daino' ? '#2a1c14' : a.specie === 'uccellino' ? p.extra : corpoC);
  tav[C_PUNTA] = col(a.specie === 'lepre' ? '#ffffff' : p.extra);
  tav[C_ALI] = col(papera ? varia(corpoC, 0, -0.07) : p.extra);
  if (a.specie === 'maiale') tav[C_MUSO] = col(varia(p.corpo, 0, -0.02));

  // ---------- le pennellate: pancia chiara, macchie, strisce... ----------
  const pitture: Pittore[] = [];
  const macchia = (g: Goccia, c: THREE.Color | string, bordo = 0.014, forza = 1) => {
    const cc = typeof c === 'string' ? col(c) : c;
    pitture.push((pt, out) => {
      const d = distGoccia(pt, g);
      if (d < bordo) out.lerp(cc, forza * (d < -bordo ? 1 : 0.5 - d / (2 * bordo)));
    });
  };
  /** Una goccia nelle misure della testa. */
  const gT = (o: { a: V; b?: V; ra?: number; rb?: number; r3?: V }) => goccia({
    a: hu(...o.a), b: o.b ? hu(...o.b) : undefined, ra: o.ra !== undefined ? rT(o.ra) : undefined, rb: o.rb !== undefined ? rT(o.rb) : undefined,
    r3: o.r3 ? [rT(o.r3[0]), rT(o.r3[1]), rT(o.r3[2])] : undefined, rot: o.r3 ? rotT : undefined,
  });
  const r0 = rng(hash(a.id + 'macchie'));
  // la pancia chiara
  if (uccello) macchia(goccia({ a: [0, cY - th * 0.1, td * 0.75], r3: [tw * 0.78, th * 0.8, td * 0.75] }), tav[C_PANCIA]);
  else if (bipede) macchia(goccia({ a: [0, cY - th * 0.14, td * 0.72], r3: [tw * 0.7, th * 0.74, td * 0.66] }), tav[C_PANCIA]);
  else macchia(goccia({ a: [0, yB - H * 0.42, 0], r3: [W * 0.4, H * 0.34, L * 0.44] }), tav[C_PANCIA]);
  // il sotto del muso chiaro
  if (lM > 0 && colMuso === C_TESTA && a.specie !== 'tasso' && a.specie !== 'riccio')
    macchia(gT({ a: [0, my - F.muso.r * 0.2, dav * 0.5], b: [0, my - giu + punta * 0.1, dav + lM + punta * 0.4], ra: F.muso.r * 0.75, rb: punta * 0.9 }), col(p.muso), 0.01, a.specie === 'cavallo' ? 0.75 : 1);

  /** Punto sul dorso/fianchi del corpo (u lungo il corpo 0..1, giro -1..1 intorno alla schiena). */
  const sulDorso = (u: number, giro: number): V => bipede
    ? [Math.sin(giro * 2.2) * tw, cY + (u - 0.5) * th * 1.5, -Math.cos(giro * 2.2) * td]
    : [Math.sin(giro * 1.6) * W * 0.5, yB + Math.cos(giro * 1.6) * H * 0.5, (u - 0.5) * L * 0.8];
  const schiena = (larga: number, colore: string) => macchia(bipede
    ? goccia({ a: [0, cY + th * 0.1, -td * 0.95], r3: [larga, th * 0.95, td * 0.4] })
    : goccia({ a: [0, yB + H * 0.48, 0], r3: [larga, H * 0.2, L * 0.52] }), colore, 0.01);

  switch (a.specie) {
    case 'volpe':
      // guance, mento e petto bianchi
      macchia(gT({ a: [0, -0.3, 0.14], r3: [0.56, 0.2, 0.42] }), p.extra, 0.012);
      if (bipede) macchia(goccia({ a: [0, cY + th * 0.5, td * 0.6], r3: [tw * 0.6, th * 0.4, td * 0.6] }), p.extra);
      else macchia(goccia({ a: [0, yB - H * 0.05, L * 0.42], r3: [W * 0.3, H * 0.3, L * 0.14] }), p.extra);
      break;
    case 'daino': {
      schiena(0.035, varia(p.corpo, 0, -0.2));
      const quante = piccolo ? 20 : 13;
      for (let k = 0; k < quante; k++) {
        const pt = sulDorso(0.1 + r0() * 0.8, (r0() < 0.5 ? -1 : 1) * (0.14 + r0() * 0.3));
        macchia(goccia({ a: pt, ra: 0.03 + r0() * 0.012 }), p.extra, 0.012);
      }
      // lo specchio bianco sul sedere
      macchia(bipede ? goccia({ a: [0, hipY + th * 0.3, -td * 0.95], r3: [tw * 0.5, th * 0.32, td * 0.4] }) : goccia({ a: [0, yB, -L * 0.5], r3: [W * 0.3, H * 0.34, L * 0.1] }), '#fbf6ee');
      break;
    }
    case 'tasso': {
      // due strisce nere dal naso alle orecchie, passando sugli occhi
      const scura = piccolo ? varia(p.extra, 0, 0.08) : p.extra;
      for (const s of [-1, 1]) {
        macchia(gT({ a: [s * 0.09, my + 0.02, dav + lM * 0.75], b: [s * 0.21, 0.07, 0.36], ra: 0.05, rb: 0.115 }), scura, 0.008);
        macchia(gT({ a: [s * 0.21, 0.07, 0.36], b: [s * 0.36, 0.3, -0.16], ra: 0.115, rb: 0.14 }), scura, 0.008);
      }
      break;
    }
    case 'riccio':
      // il dorso scuro sotto gli aculei, e il cappuccio sulla fronte
      pitture.push((pt, out) => {
        const lim = bipede ? 0.02 + (pt.y - cY) * 0.1 : 0;
        const dietro = bipede ? pt.z < lim && pt.y > hipY + 0.02 && pt.y < cY + th * 0.9 : pt.y > yB - H * 0.05 && pt.z < L * 0.36;
        if (dietro && Math.abs(pt.x) < 2) out.lerp(col(piccolo ? varia(p.extra, 0, 0.14) : p.extra), 0.92);
      });
      macchia(gT({ a: [0, 0.2, -0.3], r3: [0.56, 0.44, 0.5] }), piccolo ? varia(p.extra, 0, 0.14) : p.extra, 0.01);
      break;
    case 'lepre':
      if (bipede) macchia(goccia({ a: [0, cY + th * 0.5, td * 0.6], r3: [tw * 0.5, th * 0.3, td * 0.5] }), p.pancia);
      break;
    case 'cavallo':
      // la lista bianca giù per il muso
      macchia(gT({ a: [0, 0.16, dav + 0.1], b: [0, my - giu + punta * 0.9, dav + lM * 0.9], ra: 0.075, rb: 0.06 }), '#fffaf0', 0.008);
      break;
    case 'asino':
      for (const s of [-1, 1]) macchia(gT({ a: [s * 0.22, 0.07, 0.36], r3: [0.17, 0.19, 0.2] }), p.muso, 0.02, 0.8);
      schiena(0.03, p.extra);
      // la croce sulle spalle
      macchia(bipede ? goccia({ a: [0, cY + th * 0.5, -td * 0.85], r3: [tw * 0.8, 0.03, td * 0.4] }) : goccia({ a: [0, yB + H * 0.4, L * 0.22], r3: [W * 0.42, H * 0.2, 0.03] }), p.extra, 0.008);
      break;
    case 'mucca':
      if (asp.manto % 4 < 2) {
        for (let k = 0; k < 7; k++) {
          const pt = sulDorso(r0(), (r0() * 2 - 1) * 0.42);
          macchia(goccia({ a: pt, r3: [0.09 + r0() * 0.07, 0.1 + r0() * 0.08, 0.1 + r0() * 0.06] }), p.extra, 0.008);
        }
        const s = r0() < 0.5 ? -1 : 1;
        macchia(gT({ a: [s * 0.3, 0.16, 0.12], r3: [0.24, 0.3, 0.34] }), p.extra, 0.008);
        if (r0() < 0.6) macchia(gT({ a: [-s * 0.34, 0.3, -0.2], r3: [0.2, 0.22, 0.26] }), p.extra, 0.008);
      }
      break;
    case 'maiale':
      if (asp.manto % 4 === 1) for (let k = 0; k < 7; k++) {
        const pt = sulDorso(r0(), (r0() * 2 - 1) * 0.8);
        macchia(goccia({ a: pt, r3: [0.1 + r0() * 0.07, 0.11 + r0() * 0.07, 0.11 + r0() * 0.07] }), p.extra, 0.008);
      } else if (asp.manto % 4 === 3) {
        // cinta: la fascia chiara intorno alle spalle (e le braccia chiare)
        const chiara = col(p.extra);
        pitture.push((pt, out) => {
          const u = bipede ? (pt.y - (cY + th * 0.42)) / 0.11 : (pt.z - L * 0.24) / 0.1;
          const sottoIlCollo = bipede ? pt.y < cY + th * 0.75 : pt.z < L * 0.36;
          if (Math.abs(u) < 1 && sottoIlCollo) out.lerp(chiara, Math.min(1, (1 - Math.abs(u)) * 4));
        });
      }
      break;
    case 'uccellino':
      // la faccina e il petto colorati, il cappuccio scuro
      if (!corvo) {
        macchia(gT({ a: [0, -0.16, 0.2], r3: [0.42, 0.34, 0.4] }), p.muso, 0.012);
        macchia(gT({ a: [0, 0.3, -0.1], r3: [0.56, 0.3, 0.56] }), p.extra, 0.012);
      }
      break;
    case 'papera':
      if (!piccolo && asp.manto % 4 === 1 && a.sesso === 'm') pitture.push((pt, out) => { const u = (pt.y - (pernoP[1] + 0.015)) / 0.028; if (Math.abs(u) < 1 && Math.abs(pt.x) < 0.2 && pt.z > -0.1) out.lerp(col('#ffffff'), 1); });
      break;
  }
  if (a.specie === 'volpe' || a.specie === 'lepre') {
    // la punta delle orecchie scura la fa l'orecchio; qui il sopra della codina della lepre
    if (a.specie === 'lepre') macchia(goccia({ a: [0, puntaCoda.y + 0.06, puntaCoda.z - 0.02], ra: 0.06 }), varia(p.corpo, 0, -0.2));
  }

  // ---------- il segno particolare che si dipinge sulla pelle ----------
  const occhioP = (s: number): V => [s * (0.2 + F.occhiLato * 0.05), 0.07, 0];
  switch (t.segno) {
    case 'macchia sull\'occhio': macchia(gT({ a: [t.lato * 0.22, 0.08, 0.3], r3: [0.2, 0.22, 0.24] }), a.specie === 'tasso' ? '#ffffff' : varia(base.corpo, 0, -0.2), 0.008); break;
    case 'punta della codaM scura': macchia(goccia({ a: puntaCoda.toArray() as V, ra: 0.11 * kCoda }), '#2e1c12', 0.012); break;
    case 'striscia sul dorso': schiena(0.05, varia(p.corpo, 0, -0.18)); break;
    case 'una zampa bianca': {
      const ar = arti[t.lato > 0 ? 1 : 0];
      macchia(goccia({ a: ar.E, b: [ar.Wp[0], ar.Wp[1] - 0.05, ar.Wp[2] + 0.02], ra: bR * 1.6, rb: bR * 2 }), '#fbf8f2', 0.01);
      break;
    }
  }
  const pittore: Pittore = (pt, out) => {
    for (const f of pitture) f(pt, out);
    const n = pennellate(pt);
    out.offsetHSL(0, 0, n * 0.05);
  };
  const as = new Assemblaggio();
  as.pelle(pelle, tav, pittore);
  /** Il colore della pelle in un punto (per le palpebre). */
  const coloreIn = (pt: THREE.Vector3) => {
    const c = tav[sc.casella(pt.x, pt.y, pt.z)].clone();
    for (const f of pitture) f(pt, c);
    return c;
  };

  // ---------- gli occhi: bianco, iride, pupilla, palpebre, sopracciglia ----------
  const R = 0.122 * kOcchi * (0.9 + asp.occhi * 0.2) * (uccello ? 0.88 : 1);
  const occhi: THREE.Object3D[] = [];
  const palpebreS: THREE.Object3D[] = [], palpebreI: THREE.Object3D[] = [], sopr: THREE.Object3D[] = [];
  const sguardo = ossoT(0, 0, 0);
  const scuro = col('#2a1a12');
  const bianco = col('#fffaf2');
  const nero = col('#140c08');
  const coloreCiglia = col(varia(testaC, 0, -0.3)).lerp(scuro, 0.6);
  const lum = col(testaC).getHSL({ h: 0, s: 0, l: 0 }).l;
  const coloreSopr = lum < 0.3 ? col(varia(testaC, 0, 0.32)) : col(testaC).lerp(scuro, 0.82);
  for (const s of [-1, 1]) {
    const [ex, ey] = occhioP(s);
    const colpo = sc.tocca(huV(ex, ey, 2), dirT(0, 0, -1));
    const pMondo = colpo?.p ?? huV(ex, ey, 0.4);
    const nMondo = colpo?.n ?? dirT(0, 0, 1);
    // nelle misure della testa
    const inv = MT.clone().invert();
    const pe = pMondo.clone().applyMatrix4(inv);
    const ne = nMondo.clone().transformDirection(inv);
    // guarda in avanti e un po' di lato, non proprio come la pelle sotto (così da davanti si vedono tutti e due)
    const f = ne.clone().multiplyScalar(0.5).add(new THREE.Vector3(s * (0.08 + F.occhiLato * 0.45), 0.04, 0.7)).normalize();
    pe.addScaledVector(f, -R * 0.12);
    const rotE = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), f));
    const ME = MT.clone().multiply(new THREE.Matrix4().compose(pe, new THREE.Quaternion().setFromEuler(rotE), new THREE.Vector3(R, R, R)));
    const coloreOcchio = t.segno === 'occhi di due colori' && s === t.lato ? '#3f86c8' : a.specie === 'volpe' ? '#c8892e' : p.occhi;
    const iride = col(coloreOcchio);
    const hsl = iride.getHSL({ h: 0, s: 0, l: 0 });
    // l'iride: un marrone caldo (o il colore suo, se ne ha uno), mai nero come un bottone
    if (hsl.l < 0.3) { if (hsl.s < 0.35 || hsl.h > 0.75) iride.set(hsl.h > 0.5 && hsl.h < 0.75 ? '#4a6a8a' : '#7a4a26'); else iride.setHSL(hsl.h, Math.max(hsl.s, 0.6), 0.3); }
    const pelleQui = coloreIn(pMondo);
    // il bordo scuro e il bianco
    as.pezzo(new THREE.SphereGeometry(1, 18, 12), M(ME, [0, 0, -0.1], [1.07, 1.15, 0.42]), scuro, iT);
    as.pezzo(new THREE.SphereGeometry(1, 18, 12), M(ME, [0, 0, 0], [0.98, 1.06, 0.5]), bianco, iT);
    // iride, pupilla e lucina: si spostano insieme (lo sguardo)
    const iS = I(sguardo);
    as.pezzo(new THREE.SphereGeometry(1, 16, 10), M(ME, [-s * 0.06, -0.06, 0.31], [0.72, 0.76, 0.22]), iride, iS);
    as.pezzo(new THREE.SphereGeometry(1, 14, 8), M(ME, [-s * 0.06, -0.06, 0.4], [0.45, 0.48, 0.16]), nero, iS);
    as.pezzo(new THREE.SphereGeometry(1, 10, 8), M(ME, [-s * 0.06 + 0.24, 0.22, 0.5], [0.2, 0.2, 0.08]), col('#ffffff'), iS);
    as.pezzo(new THREE.SphereGeometry(1, 8, 6), M(ME, [-s * 0.06 - 0.2, -0.3, 0.5], [0.09, 0.09, 0.05]), col('#ffffff'), iS);
    // la palpebra di sopra: una tendina che scende (attaccata in alto alla testa, in basso al suo osso)
    const lidS = ossoT(pe.x, pe.y, pe.z);
    const gS = new THREE.SphereGeometry(1, 16, 12);
    {
      const cc = new Float32Array(gS.attributes.position.count * 3);
      const pelleLid = pelleQui.clone().multiplyScalar(0.97);
      for (let i = 0; i < gS.attributes.position.count; i++) {
        const c = gS.attributes.position.getY(i) < -0.8 && gS.attributes.position.getZ(i) > 0 ? coloreCiglia : pelleLid;
        cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
      }
      gS.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    }
    as.pezzo(gS, M(ME, [0, 0, 0.02], [1.09, 1.17, 0.64]), bianco, iT, { osso2: I(lidS), peso: (l) => (1 - l.y) / 2 });
    palpebreS.push(lidS);
    // la palpebra di sotto: sale quando sorride
    const lidI = ossoT(pe.x, pe.y, pe.z);
    as.pezzo(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI * 0.46, Math.PI * 0.54), M(ME, [0, 0, 0.03], [1.1, 1.17, 0.68]), pelleQui.clone().multiplyScalar(0.98), iT, { osso2: I(lidI), peso: (l) => (l.y + 1) / 1.15 });
    palpebreI.push(lidI);
    // il sopracciglio
    const folte = t.segno === 'sopracciglia folte' ? 1.6 : 1;
    const sp = ossoT(pe.x, pe.y + R * 1.55, pe.z);
    as.pezzo(geoArco(1.2, 0.2 * folte, 0.22), M(ME, [0, 1.55, 0.05], [1, 1, 0.6]), coloreSopr, I(sp));
    sopr.push(sp);
    // le femmine: due ciglia
    if (a.sesso === 'f') for (let k = 0; k < 2; k++) {
      as.pezzo(new THREE.CapsuleGeometry(0.06, 0.34, 3, 6), M(ME, [s * (0.78 + k * 0.2), 0.62 - k * 0.3, 0.1], 1, [0, 0, -s * (0.75 + k * 0.5)]), coloreCiglia, iT);
    }
    const finto = new THREE.Group();
    finto.name = 'occhio';
    testa.add(finto);
    occhi.push(finto);
  }

  // ---------- naso e bocca ----------
  const angoli = ossoT(0, my - giu - punta * 0.5, dav + lM);
  const aperta = ossoT(0, my - giu - punta * 0.5, dav + lM);
  const nasoM = new THREE.Group(); // (per i segni che lo cercano)
  nasoM.position.set(...nasoP);
  if (lM > 0) {
    const due = a.specie === 'cavallo' || a.specie === 'asino' || a.specie === 'mucca' || a.specie === 'maiale';
    if (a.specie === 'maiale') {
      // il grugno: un disco piatto in punta al muso
      as.pezzo(new THREE.CylinderGeometry(punta * 1.04, punta * 1.08, 0.07, 20), M(MT, [0, my - giu, dav + lM + punta * 0.72], 1, [Math.PI / 2 + giu * 0.4, 0, 0]), col(p.muso), iT, { contorno: true });
    }
    if (due) for (const s of [-1, 1]) {
      const z = a.specie === 'maiale' ? dav + lM + punta * 0.72 + 0.03 : dav + lM + punta * 0.95;
      const colpo = a.specie === 'maiale' ? null : sc.tocca(huV(s * punta * 0.45, my - giu + punta * 0.25, 3), dirT(0, 0, -1));
      const q = colpo ? colpo.p.clone().applyMatrix4(MT.clone().invert()) : new THREE.Vector3(s * punta * 0.42, my - giu + 0.02, z);
      as.pezzo(new THREE.SphereGeometry(1, 10, 8), M(MT, [q.x, q.y, q.z], [0.034, 0.05, 0.02]), col(a.specie === 'mucca' || a.specie === 'maiale' ? varia(p.muso, 0, -0.32) : '#2a1a14'), iT);
    } else if (t.segno === 'nasino a cuore') {
      const rosa = col('#e8607a');
      for (const x of [-0.03, 0.03]) as.pezzo(new THREE.SphereGeometry(0.04, 10, 8), M(MT, [nasoP[0] + x, nasoP[1] + 0.015, nasoP[2]], [1, 1, 0.6]), rosa, iT);
      as.pezzo(new THREE.ConeGeometry(0.058, 0.075, 10), M(MT, [nasoP[0], nasoP[1] - 0.032, nasoP[2]], [1, 1, 0.6], [0, 0, Math.PI]), rosa, iT);
    } else {
      const grande = a.specie === 'riccio' ? 1.35 : 1;
      as.pezzo(new THREE.SphereGeometry(1, 12, 10), M(MT, nasoP, [0.075 * grande, 0.055 * grande, 0.05 * grande], [-0.3, 0, 0]), col('#2a1a14'), iT);
    }
    // la bocca: una riga che si incurva (sorriso o broncio) e si apre
    const hw = Math.min(punta * 0.95, 0.16);
    const by = my - giu - punta * 0.52, bz = dav + lM + punta * (a.specie === 'maiale' ? 0.5 : 0.62);
    const colpoB = sc.tocca(huV(0, by, 3), dirT(0, 0, -1));
    const zB = colpoB ? colpoB.p.clone().applyMatrix4(MT.clone().invert()).z + 0.004 : bz;
    angoli.position.copy(testa.worldToLocal(huV(0, by, zB)));
    angoli.userData.p0 = angoli.position.clone();
    aperta.position.copy(angoli.position);
    aperta.userData.p0 = aperta.position.clone();
    as.pezzo(geoArco(hw * 2, 0.013, -hw * 0.22, hw * 0.5), M(MT, [0, by, zB]), col('#3a2418'), iT, { osso2: I(angoli), peso: (l) => Math.pow(Math.abs(l.x) / (hw + 0.013), 1.6) });
    as.pezzo(new THREE.SphereGeometry(1, 12, 8), M(MT, [0, by - hw * 0.5, zB - hw * 0.12], [hw * 0.62, hw * 0.5, 0.03]), col('#5a1e22'), I(aperta));
  } else {
    // gli uccelli: il becco
    if (papera) {
      const g = new THREE.SphereGeometry(0.15, 14, 10);
      as.pezzo(g, M(MT, [0, -0.1, 0.5], [1.0, 0.34, 1.3]), col(piccolo ? '#f6b040' : p.muso), iT, { contorno: true });
    } else {
      if (corvo) as.pezzo(new THREE.ConeGeometry(0.12, 0.46, 10), M(MT, [0, -0.07, 0.62], [1, 1, 0.8], [Math.PI / 2, 0, 0]), col('#6a6e80'), iT, { contorno: true });
      else as.pezzo(new THREE.ConeGeometry(0.075, 0.26, 10), M(MT, [0, -0.04, 0.55], 1, [Math.PI / 2, 0, 0]), col(asp.manto % 4 === 3 ? '#f2a020' : '#4a3a2e'), iT, { contorno: true });
    }
    // zampette sottili (palmate per la papera)
    const colZ = col(papera || corvo ? p.zampe : '#c89a6a');
    for (const { s, A } of arti) {
      const i = s < 0 ? 2 : 3;
      as.pezzo(new THREE.CylinderGeometry(0.02, 0.02, hipY * 1.05, 6), new THREE.Matrix4().makeTranslation(A[0], hipY * 0.5, 0), colZ, I(zampe[i]), { contorno: true });
      const piede = new THREE.SphereGeometry(0.07, 10, 8);
      as.pezzo(piede, M(new THREE.Matrix4(), [A[0], 0.02, 0.04], [papera ? 1.3 : 0.85, 0.25, papera ? 1.5 : 1.25]), colZ, I(zampe[i]), { contorno: true });
    }
  }

  // ---------- le orecchie (ognuna col suo osso: ballano quando salta) ----------
  const orecchie: THREE.Object3D[] = [];
  const kOr = 0.88 + asp.orecchie * 0.26;
  const orecchio = (s: number, pos: V, o: Parameters<typeof geoOrecchio>[0], rot: V) => {
    const b = ossoT(...pos);
    b.userData.lato = s;
    as.pezzo(geoOrecchio({ ...o, l: o.l * kOr, w: o.w * kOr }), M(MT, pos, 1, rot), bianco, I(b), { contorno: true });
    orecchie.push(b);
    return b;
  };
  const cFuori = col(testaC === p.muso && a.specie !== 'riccio' ? p.corpo : corpoC);
  let floscio = 0.25;
  for (const s of [-1, 1]) switch (a.specie) {
    case 'volpe': orecchio(s, [s * 0.26, 0.26, -0.06], { l: 0.46, w: 0.19, e: 0.55, fuori: cFuori, dentro: col('#fff3e0'), punta: col('#2e1c12'), quantaPunta: 0.3 }, [-0.05, s * 0.25, -s * 0.24]); break;
    case 'daino': orecchio(s, [s * 0.32, 0.24, -0.1], { l: 0.36, w: 0.14, e: 0.9, fuori: cFuori, dentro: col('#f0c8b8') }, [0, s * 0.5, -s * 1.0]); floscio = 0.4; break;
    case 'tasso': orecchio(s, [s * 0.36, 0.26, -0.14], { l: 0.17, w: 0.12, e: 1, fuori: col('#fbf8f2'), dentro: col(p.extra) }, [0, s * 0.3, -s * 0.6]); break;
    case 'riccio': orecchio(s, [s * 0.38, 0.14, 0.06], { l: 0.15, w: 0.1, e: 1, fuori: col(p.muso), dentro: col('#f4b0b0') }, [0, s * 0.5, -s * 0.5]); break;
    case 'scoiattolo': orecchio(s, [s * 0.24, 0.3, -0.08], { l: piccolo ? 0.27 : 0.36, w: 0.11, e: 0.6, fuori: cFuori, dentro: col('#f2b9a0'), punta: piccolo ? undefined : col(varia(p.corpo, 0, -0.1)), quantaPunta: 0.3 }, [0, s * 0.2, -s * 0.14]); break;
    case 'lepre': orecchio(s, [s * 0.15, 0.32, -0.12], { l: piccolo ? 0.46 : 0.78, w: 0.12, e: 1.05, fuori: cFuori, dentro: col(p.extra), punta: piccolo ? undefined : col('#2e2420'), quantaPunta: 0.14 }, [-0.3, s * 0.15, -s * 0.2]); floscio = 0.9; break;
    case 'cavallo': orecchio(s, [s * 0.2, 0.34, -0.14], { l: 0.28, w: 0.09, e: 0.6, fuori: cFuori, dentro: col('#f0c8b8') }, [0, s * 0.2, -s * 0.12]); break;
    case 'asino': orecchio(s, [s * 0.2, 0.32, -0.14], { l: piccolo ? 0.5 : 0.66, w: 0.12, e: 0.85, fuori: cFuori, dentro: col('#f2e4dc'), punta: col(p.extra), quantaPunta: 0.18 }, [-0.1, s * 0.25, -s * 0.34]); floscio = 0.7; break;
    case 'mucca': orecchio(s, [s * 0.38, 0.14, -0.1], { l: 0.3, w: 0.11, e: 0.9, fuori: cFuori, dentro: col('#f4b0b8') }, [0, s * 0.3, -s * 1.5]); floscio = 0.5; break;
    case 'maiale': orecchio(s, [s * 0.28, 0.3, -0.02], { l: 0.3, w: 0.17, e: 0.55, fuori: cFuori, dentro: col(varia(p.muso, 0, 0.05)) }, [0.7, s * 0.2, -s * 0.5]); floscio = 0.6; break;
  }

  // ---------- pezzi fatti a parte che fanno comunque parte del corpo (entrano nella stessa forma) ----------
  // (si aggiungono qui come piccoli modelli attaccati alle ossa; in fondo vengono "cotti" nella pelle)
  const daCuocere: THREE.Object3D[] = [];
  const cuoci = <T extends THREE.Object3D>(o: T, gen: THREE.Object3D) => { gen.add(o); daCuocere.push(o); return o; };
  const sullaTesta = <T extends THREE.Object3D>(o: T) => cuoci(o, testa);
  const piatto = <T extends THREE.Object3D>(o: T) => { o.userData.senzaContorno = true; return o; };
  /** Un pezzo piatto appoggiato sulla faccia in (x, y) (nelle misure della testa). */
  const sulViso = (o: THREE.Object3D, x: number, y: number, fuori = 0.005) => {
    const colpo = sc.tocca(huV(x, y, 3), dirT(0, 0, -1));
    const inv = MT.clone().invert();
    const q = colpo ? colpo.p.clone().applyMatrix4(inv) : new THREE.Vector3(x, y, 0.42);
    const n = colpo ? colpo.n.clone().transformDirection(inv) : new THREE.Vector3(0, 0, 1);
    o.position.copy(q).addScaledVector(n, fuori);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    o.traverse((c) => (c.userData.senzaContorno = true));
    return sullaTesta(o);
  };
  /** Un pezzo piatto appoggiato sul corpo, visto da una direzione. */
  const sulCorpo = (o: THREE.Object3D, da: V, verso: V, fuori = 0.004) => {
    const colpo = sc.tocca(new THREE.Vector3(...da), new THREE.Vector3(...verso).normalize());
    if (!colpo) return;
    petto.updateWorldMatrix(true, false);
    o.position.copy(petto.worldToLocal(colpo.p.clone().addScaledVector(colpo.n, fuori)));
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), colpo.n);
    o.traverse((c) => (c.userData.senzaContorno = true));
    cuoci(o, petto);
  };

  switch (a.specie) {
    case 'daino':
      if (a.sesso === 'm') {
        if (piccolo) for (const s of [-1, 1]) sullaTesta(mesh(geo.palla(0.045), mat('#8a5a36'), s * 0.14, 0.42, -0.04));
        else for (const s of [-1, 1]) {
          // palco: un ramo che sale curvando in fuori, con le sue punte (più piccolo da giovani)
          const palco = new THREE.Group();
          palco.position.set(s * 0.15, 0.36, -0.06);
          palco.scale.setScalar(a.fase === 'giovane' ? 0.62 : 1);
          const corno = mat('#ead9b8', { rim: 0.25 });
          const ramo = (da: V, a2: V, r1: number, r2: number) => {
            const p1 = new THREE.Vector3(...da), p2 = new THREE.Vector3(...a2);
            const r = mesh(geo.cil(r2, r1, p1.distanceTo(p2), 6), corno);
            r.position.copy(p1).add(p2).multiplyScalar(0.5);
            r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
            palco.add(r);
            const nodo = mesh(geo.palla(r2, 6), corno);
            nodo.position.copy(p2);
            palco.add(nodo);
          };
          const A: V = [0, 0, 0], B: V = [s * 0.1, 0.2, -0.04], C: V = [s * 0.22, 0.4, -0.03], D: V = [s * 0.24, 0.6, 0.05];
          ramo(A, B, 0.042, 0.034); ramo(B, C, 0.034, 0.028); ramo(C, D, 0.028, 0.012);
          ramo(B, [s * 0.08, 0.3, 0.14], 0.026, 0.01); // la punta davanti
          if (a.fase !== 'giovane') {
            ramo(C, [s * 0.38, 0.5, -0.04], 0.024, 0.01);
            ramo(C, [s * 0.16, 0.52, -0.16], 0.022, 0.01);
          }
          sullaTesta(palco);
        }
      }
      break;
    case 'riccio': {
      // gli aculei: scuri con la punta chiara, dalla fronte al sedere
      const coloreAculei = col(piccolo ? varia(p.extra, 0, 0.14) : p.extra);
      const puntaA = col(piccolo ? '#fbf3e6' : varia(p.muso, 0, 0.04));
      const lung = piccolo ? 0.08 : 0.115;
      const r = rng(hash(a.id + 'aculei'));
      const aculei = (centro: THREE.Vector3, rx: number, ry: number, rz: number, quanti: number, tiene: (d: THREE.Vector3) => boolean, scala: number, o: number, indietro: THREE.Vector3) => {
        for (let k = 0; k < quanti; k++) {
          const y = 1 - ((k + 0.5) / quanti) * 2;
          const rr = Math.sqrt(1 - y * y);
          const th2 = k * 2.39996;
          const d = new THREE.Vector3(Math.cos(th2) * rr, y, Math.sin(th2) * rr);
          if (!tiene(d)) continue;
          const colpo = sc.tocca(centro.clone().add(new THREE.Vector3(d.x * rx, d.y * ry, d.z * rz).multiplyScalar(3)), d.clone().multiply(new THREE.Vector3(rx, ry, rz)).normalize().negate());
          if (!colpo) continue;
          const verso = colpo.n.clone().addScaledVector(indietro, 0.6).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), verso);
          const l = lung * scala * (0.85 + r() * 0.3);
          const m4 = new THREE.Matrix4().compose(colpo.p, q, new THREE.Vector3(1, 1, 1));
          const c = new THREE.ConeGeometry(0.036 * scala, l, 5);
          c.translate(0, l / 2 - 0.02, 0);
          const cc = new Float32Array(c.attributes.position.count * 3);
          for (let i = 0; i < c.attributes.position.count; i++) { const u = c.attributes.position.getY(i) > l * 0.3 ? puntaA : coloreAculei; cc[i * 3] = u.r; cc[i * 3 + 1] = u.g; cc[i * 3 + 2] = u.b; }
          c.setAttribute('color', new THREE.BufferAttribute(cc, 3));
          as.pezzo(c, m4, coloreAculei, o, { contorno: true });
        }
      };
      if (bipede) aculei(new THREE.Vector3(0, cY - th * 0.05, 0), tw, th * 1.05, td, 210, (d) => d.z < -0.12 + Math.abs(d.x) * 0.1 && d.y > -0.8 && d.y < 0.72, 1, I(petto), new THREE.Vector3(0, -0.4, -0.5));
      else aculei(new THREE.Vector3(0, yB, 0), W / 2, H / 2, L / 2, 200, (d) => d.y > -0.15 && d.z < 0.72, 1, I(tronco), new THREE.Vector3(0, 0.1, -0.8));
      aculei(huV(0, 0, 0), rT(0.46), rT(0.46), rT(0.46), 150, (d) => d.z < 0.3 - Math.abs(d.x) * 0.35 + Math.max(0, d.y - 0.55) * 1.2 && d.y > -0.25 + Math.max(0, d.z) * 1.2, piccolo ? 0.8 : 0.9, iT, dirT(0, 0.1, -0.8));
      break;
    }
    case 'lepre':
      // i dentini
      for (const x of [-0.022, 0.022]) {
        const d = mesh(geo.scatola(0.036, 0.05, 0.02), mat('#ffffff', { rim: 0 }), x, my - giu - punta * 0.72, dav + lM + punta * 0.5);
        d.rotation.x = -0.3;
        sullaTesta(piatto(d));
      }
      break;
    case 'mucca':
      if (!piccolo) for (const s of [-1, 1]) {
        const corno = mesh(geo.cono(0.05, a.sesso === 'm' ? 0.26 : 0.17, 8), mat('#f4ead2'), s * 0.27, 0.4, -0.06);
        corno.rotation.z = -s * 0.9;
        sullaTesta(corno);
      }
      break;
  }
  // code sottili (asino, mucca, maiale) e codino del riccio: un tubicino che segue le ossa della coda
  {
    const tubo = (punti: V[], r: number, colore: THREE.Color, ciuffo?: THREE.Color) => {
      const curva = new THREE.CatmullRomCurve3(punti.map((q) => new THREE.Vector3(q[0], codaP[1] + q[1], codaP[2] + q[2])));
      const g = new THREE.TubeGeometry(curva, 14, r, 6, false);
      const y0 = codaP[1], lung = Math.abs(punti[punti.length - 1][1]) || 0.1;
      as.pezzo(g, new THREE.Matrix4(), colore, I(codaOssa[0]), { contorno: true, osso2: I(codaOssa[1]), peso: (l) => Math.abs(l.y - y0) / lung });
      const fine = curva.getPoint(1);
      if (ciuffo) as.pezzo(new THREE.SphereGeometry(1, 10, 8), new THREE.Matrix4().compose(fine, new THREE.Quaternion(), new THREE.Vector3(0.05, 0.075, 0.05)), ciuffo, I(codaOssa[1]), { contorno: true });
      puntaCoda.copy(fine);
    };
    const kk = piccolo ? 0.7 : 1;
    if (a.specie === 'asino') tubo([[0, 0, 0.02], [0, -0.14 * kk, -0.07], [0, -0.3 * kk, -0.09]], 0.022, col(p.corpo), col(p.extra));
    if (a.specie === 'mucca') tubo([[0, 0, 0.02], [0, -0.16 * kk, -0.07], [0, -0.38 * kk, -0.08]], 0.022, col(p.corpo), col(p.extra === p.corpo ? p.zampe : p.extra));
    if (a.specie === 'maiale') {
      // il ricciolo
      const pts: V[] = [];
      for (let k = 0; k <= 10; k++) { const u = k / 10, an = u * Math.PI * 2.6; pts.push([Math.sin(an) * 0.045, 0.02 + (1 - Math.cos(an)) * 0.03, -0.02 - u * 0.1]); }
      const curva = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], codaP[1] + q[1], codaP[2] + q[2])));
      as.pezzo(new THREE.TubeGeometry(curva, 20, 0.018, 6, false), new THREE.Matrix4(), col(corpoC), I(codaOssa[0]), { contorno: true });
      puntaCoda.copy(curva.getPoint(1));
    }
  }

  // ---------- il segno particolare ----------
  const collo = (oggetto: THREE.Object3D) => {
    oggetto.position.y -= 0.42;
    testa.add(oggetto);
  };
  const orecchioDi = (lato: number) => orecchie.find((e) => e.userData.lato === lato) ?? orecchie[0];
  switch (t.segno) {
    case 'orecchio piegato': {
      const o = orecchioDi(t.lato);
      if (o) { o.userData.piega = 1.2; o.scale.y = 0.85; }
      break;
    }
    case 'ciuffo ribelle':
      for (let k = 0; k < 5; k++) {
        const c = mesh(geo.cono(0.06, 0.26, 6), mat(varia(testaC, 0, 0.08)), (k - 2) * 0.05, 0.46 * cr[1] + 0.06, 0.1 - Math.abs(k - 2) * 0.03);
        c.rotation.set(-0.4, 0, (2 - k) * 0.35);
        sullaTesta(c);
      }
      break;
    case 'macchia a cuore': {
      const cuore = new THREE.Group();
      // cuore chiaro sui manti scuri, rosato sui manti chiari: si deve vedere sempre
      const mantoChiaro = col(base.corpo).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
      const chiaro = mat(mantoChiaro ? '#e0607a' : '#fff3e6', { rim: 0 });
      for (const x of [-0.045, 0.045]) cuore.add(mesh(geo.palla(0.06, 10), chiaro, x, 0.03, 0));
      const punta2 = mesh(geo.cono(0.085, 0.11, 10), chiaro, 0, -0.04, 0);
      punta2.rotation.z = Math.PI;
      cuore.add(punta2);
      cuore.scale.set(0.9, 0.9, 0.3);
      const fianco = new THREE.Group();
      fianco.add(cuore);
      if (!bipede) cuore.rotation.z = -t.lato * Math.PI / 2;
      sulCorpo(fianco, bipede ? [t.lato * 2, cY - th * 0.05, -td * 0.15] : [t.lato * 2, yB + H * 0.1, -L * 0.1], [-t.lato, 0, 0]);
      break;
    }
    case 'lentiggini':
      for (const x of [-1, 1]) for (let k = 0; k < 4; k++) sulViso(mesh(geo.palla(0.018, 6), mat('#7a4a30', { rim: 0 })), x * (0.21 + k * 0.04), -0.1 + (k % 2) * 0.04, 0);
      break;
    case 'stellina in fronte':
      sulViso(mesh(new THREE.CircleGeometry(0.09, 5), mat('#fff7d6', { rim: 0, side: THREE.DoubleSide })), 0, 0.26, 0.006);
      break;
    case 'fiocco rosso': {
      const f = fiocco('#e03a4a');
      f.position.set(t.lato * 0.24, 0.38, 0.12);
      f.rotation.z = t.lato * 0.4;
      sullaTesta(f);
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
    case 'occhiali tondi': {
      const occhiali = new THREE.Group();
      for (const x of [-0.2, 0.2]) occhiali.add(piatto(mesh(new THREE.TorusGeometry(0.135, 0.016, 6, 20), mat('#3a2a1e', { rim: 0 }), x, 0.06, 0)));
      occhiali.add(piatto(mesh(geo.scatola(0.13, 0.02, 0.02), mat('#3a2a1e', { rim: 0 }), 0, 0.08, 0.0)));
      const colpo = sc.tocca(huV(0.2, 0.07, 3), dirT(0, 0, -1));
      occhiali.position.z = (colpo ? colpo.p.clone().applyMatrix4(MT.clone().invert()).z : 0.42) + R * 0.5;
      sullaTesta(occhiali);
      break;
    }
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
      sullaTesta(foglia);
      sullaTesta(mesh(geo.cil(0.012, 0.012, 0.12, 5), mat('#5a3a20'), 0, 0.52, -0.02));
      break;
    }
    case 'campanellino': {
      const nastro = mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 18), mat('#d8344a'), 0, 0, 0.02);
      nastro.rotation.x = Math.PI / 2;
      collo(nastro);
      testa.add(mesh(geo.palla(0.06, 10), mat('#f2c230', { rim: 0.6, emissive: '#806010', emissiveIntensity: 0.2 }), 0, -0.48, 0.27));
      break;
    }
    case 'fiore all\'orecchio': {
      const f = fiore('#ffffff', '#f2c230');
      f.position.set(t.lato * 0.3, 0.3, 0.16);
      f.rotation.set(-0.3, t.lato * 0.5, 0);
      sullaTesta(f);
      break;
    }
    case 'corona di margherite':
      for (let k = 0; k < 7; k++) {
        const ang = -1.3 + (k / 6) * 2.6;
        const f = fiore(k % 2 ? '#ffffff' : '#ffd6e4', '#f2c230');
        f.scale.setScalar(1.05);
        f.position.set(Math.sin(ang) * 0.34, 0.37 + Math.cos(ang) * 0.06, Math.cos(ang) * 0.14 - 0.02);
        f.rotation.set(-1.1, ang * 0.6, 0);
        sullaTesta(f);
      }
      break;
    case 'sciarpa a righe': {
      const righe = mat('#ffffff', { map: texture(64, strisce('#f2c230', '#e05a4a', 6)) });
      const sciarpa = mesh(new THREE.TorusGeometry(0.25, 0.065, 8, 18), righe, 0, 0, 0.02);
      sciarpa.rotation.x = Math.PI / 2;
      collo(sciarpa);
      const lembo = mesh(geo.scatola(0.11, 0.24, 0.05), righe, -t.lato * 0.12, -0.58, 0.24);
      lembo.rotation.z = t.lato * 0.25;
      testa.add(lembo);
      break;
    }
    case 'baffi lunghi':
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
        const b = mesh(geo.capsula(0.006, 0.2), mat('#3a2418', { rim: 0 }), s * (punta + 0.1), nasoP[1] - 0.05 + (k - 1) * 0.03, davantiMuso - punta * 0.9);
        b.rotation.z = s * (Math.PI / 2 + (k - 1) * 0.18);
        sullaTesta(piatto(b));
      }
      break;
    case 'dentino sporgente': {
      const d = mesh(geo.scatola(0.045, 0.055, 0.02), mat('#ffffff', { rim: 0 }), t.lato * 0.025, my - giu - punta * 0.75, dav + lM + punta * 0.5);
      d.rotation.x = -0.3;
      sullaTesta(piatto(d));
      break;
    }
    case 'neo sulla guancia': {
      const neoScuro = col(base.corpo).getHSL({ h: 0, s: 0, l: 0 }).l < 0.35;
      sulViso(mesh(geo.palla(0.028, 8), mat(neoScuro ? '#f4e6d6' : '#5a3424', { rim: 0 })), t.lato * 0.27, -0.2, 0);
      break;
    }
    case 'zainetto': {
      const z = new THREE.Group();
      const sacca = mesh(geo.capsula(0.17, 0.08), mat('#5a8a3a', { rim: 0.3 }), 0, 0, 0);
      sacca.scale.z = 0.55;
      z.add(sacca);
      z.add(mesh(geo.scatola(0.2, 0.1, 0.06), mat('#477030'), 0, -0.06, -0.08));
      for (const x of [-0.17, 0.17]) {
        const cinghia = mesh(new THREE.TorusGeometry(0.13, 0.018, 4, 12, Math.PI), mat('#7a5232'), x, 0.04, 0.12);
        cinghia.rotation.set(0, Math.PI / 2, -Math.PI / 2);
        z.add(cinghia);
      }
      if (bipede) { z.position.set(0, 0.02, -0.34); sulBusto(z, 0.85); }
      else { z.position.set(0, 0.05, -0.33); sulBusto(z, 0.95); }
      break;
    }
    case 'nastro sulla codaM': {
      const f = fiocco('#4a8ad8');
      if (codaPunti.length > 2 || ['asino', 'mucca'].includes(a.specie)) {
        const osCoda = codaOssa[codaPunti.length > 2 ? 2 : 1];
        f.scale.setScalar(1.1);
        osCoda.updateWorldMatrix(true, false);
        const q = codaPunti.length > 2 ? osCoda.getWorldPosition(new THREE.Vector3()) : puntaCoda.clone();
        f.position.copy(osCoda.worldToLocal(q.add(new THREE.Vector3(0, 0.04, -0.06))));
        osCoda.add(f);
      } else {
        f.position.set(t.lato * 0.24, 0.38, 0.12);
        sullaTesta(f);
      }
      break;
    }
    case 'pancia a pois':
      for (const [x, y] of [[-0.09, 0.08], [0.08, 0.12], [0.0, -0.02], [-0.07, -0.12], [0.1, -0.08]]) {
        const d = mesh(geo.palla(0.036, 8), mat(varia(panciaC, 0, -0.14), { rim: 0 }));
        d.scale.z = 0.3;
        if (bipede) sulCorpo(d, [x * 1.1, cY - th * 0.15 + y * 1.1, 2], [0, 0, -1], 0);
        else sulCorpo(d, [x * 1.1, -1, y * 1.2], [0, 1, 0], 0);
      }
      break;
    case 'orecchino d\'oro': {
      const o = orecchioDi(t.lato);
      const anello = mesh(new THREE.TorusGeometry(0.055, 0.015, 6, 14), mat('#f2c230', { rim: 0.6 }), 0, 0, 0);
      anello.userData.senzaContorno = true;
      anello.scale.setScalar(1.3);
      if (o) { anello.position.set(t.lato * 0.02, 0.1, 0.05); cuoci(anello, o); } else { anello.position.set(t.lato * 0.44, 0, 0); sullaTesta(anello); }
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
      sullaTesta(c);
      break;
    }
  }

  // i pezzi a tinta unita entrano nella pelle (un disegno solo); gli altri restano attaccati alle ossa
  gruppo.updateMatrixWorld(true);
  for (const radice of daCuocere) {
    const pezzi: THREE.Mesh[] = [];
    radice.traverse((c) => { if ((c as THREE.Mesh).isMesh) pezzi.push(c as THREE.Mesh); });
    let o: THREE.Object3D | null = radice.parent;
    while (o && !(o as THREE.Bone).isBone) o = o.parent;
    for (const c of pezzi) {
      const m = c.material as THREE.MeshToonMaterial;
      as.pezzo(c.geometry, c.matrixWorld, m.color.clone(), o ? I(o) : I(petto), { contorno: !c.userData.senzaContorno });
    }
    radice.removeFromParent();
  }

  // ---------- la pelle finita ----------
  const { forma, contorno: formaContorno } = as.finisci();
  const scheletro = new THREE.Skeleton(ossa);
  const pelleM = new THREE.SkinnedMesh(forma, matPelle());
  pelleM.name = 'pelle';
  pelleM.userData.senzaContorno = true;
  corpo.add(pelleM);
  pelleM.bind(scheletro, new THREE.Matrix4());
  const guscio = new THREE.SkinnedMesh(formaContorno, matContorno);
  guscio.name = 'contornoPelle';
  guscio.userData.senzaContorno = true;
  guscio.raycast = () => {};
  corpo.add(guscio);
  guscio.bind(scheletro, new THREE.Matrix4());
  GUSCI.push(guscio);
  // quanto è grande (per non sparire ai bordi dello schermo e per l'ombra)
  forma.computeBoundingBox();
  const scatola = forma.boundingBox!.clone().expandByScalar(0.15);
  const palla = scatola.getBoundingSphere(new THREE.Sphere());
  for (const s of [pelleM, guscio]) { s.boundingBox = scatola.clone(); s.boundingSphere = palla.clone(); }
  forma.boundingSphere = palla.clone();
  formaContorno.boundingSphere = palla.clone();
  // toccarlo: basta la sua sagoma tonda (testa e corpo), senza contare ogni triangolo
  const centroTocco = new THREE.Vector3(), piuVicino = new THREE.Vector3();
  pelleM.raycast = (ray, colpi) => {
    for (const [o, r] of [[testa, 0.5 * sT], [petto, Math.max(tw, th, bipede ? 0 : L * 0.5)]] as [THREE.Object3D, number][]) {
      o.getWorldPosition(centroTocco);
      const scala = pelleM.matrixWorld.getMaxScaleOnAxis();
      ray.ray.closestPointToPoint(centroTocco, piuVicino);
      if (piuVicino.distanceTo(centroTocco) > r * scala) continue;
      const distance = ray.ray.origin.distanceTo(piuVicino);
      if (distance < ray.near || distance > ray.far) continue;
      colpi.push({ distance, point: piuVicino.clone(), object: pelleM });
    }
  };

  gruppo.add(ombra(Math.max(bipede ? tw * 1.5 : L * 0.62, 0.3)));

  // ---------- i vestiti cuciti addosso ----------
  // Una maglia non è più una palla infilata sul corpo: ogni suo punto si appoggia sulla forma vera del busto
  // (appena sopra la pelle) e si piega con le stesse ossa, così non buca e non lascia vuoti.
  busto.updateWorldMatrix(true, false);
  const MB = busto.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.01, 0));
  const centroB = new THREE.Vector3().setFromMatrixPosition(MB);
  const sopra = (r: number) => (r - 0.34) * 0.5;
  const sculture = new Map<number, Scultura>();
  const gonfiato = (di: number) => {
    let g = sculture.get(di);
    if (!g) sculture.set(di, (g = sc.gonfia(di, (x) => delBusto.has(x))));
    return g;
  };
  /** Dal centro del busto verso fuori (misure del busto): dove passa la stoffa. */
  const sulVestito = (dir: THREE.Vector3, di: number) => {
    const da = dir.clone().normalize().multiplyScalar(0.8).applyMatrix4(MB);
    const verso = centroB.clone().sub(da);
    const lung = verso.length();
    return gonfiato(di).tocca(da, verso.normalize(), lung);
  };
  const vestitiPelle: THREE.SkinnedMesh[] = [];
  const guscioVestito = (g: THREE.SphereGeometry, m: THREE.Material) => {
    const q = g.parameters;
    const di = sopra(q.radius);
    const k = [chiave, q.radius, q.widthSegments, q.heightSegments, q.phiStart, q.phiLength, q.thetaStart, q.thetaLength].join('|');
    let geoV = VESTITI.get(k);
    if (!geoV) {
      geoV = g;
      const pos = g.attributes.position as THREE.BufferAttribute, nor = g.attributes.normal as THREE.BufferAttribute;
      const io = new Uint16Array(pos.count * 4), pe = new Float32Array(pos.count * 4);
      const v = new THREE.Vector3();
      const forma = gonfiato(di);
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const t = sulVestito(v, di);
        if (t) { pos.setXYZ(i, t.p.x, t.p.y, t.p.z); nor.setXYZ(i, t.n.x, t.n.y, t.n.z); }
        else { v.applyMatrix4(MB); pos.setXYZ(i, v.x, v.y, v.z); }
        const l = forma.legami(pos.getX(i), pos.getY(i), pos.getZ(i));
        io.set(l.ossa, i * 4); pe.set(l.pesi, i * 4);
      }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(io, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(pe, 4));
      g.boundingSphere = palla.clone();
      g.boundingBox = scatola.clone();
      VESTITI.set(k, g);
    } else g.dispose();
    const capoM = new THREE.SkinnedMesh(geoV, m);
    capoM.userData.senzaContorno = true;
    capoM.raycast = () => {};
    capoM.boundingBox = scatola.clone(); capoM.boundingSphere = palla.clone();
    corpo.add(capoM);
    capoM.bind(scheletro, new THREE.Matrix4());
    vestitiPelle.push(capoM);
    // il contorno: solo ai capi interi e di sopra (le pettorine e le magliette sotto non ne hanno bisogno)
    if (q.phiLength >= Math.PI * 2 && q.thetaLength >= Math.PI && q.radius >= 0.37) {
      const c = new THREE.SkinnedMesh(geoV, matContorno);
      c.userData.senzaContorno = true;
      c.raycast = () => {};
      c.boundingBox = scatola.clone(); c.boundingSphere = palla.clone();
      corpo.add(c);
      c.bind(scheletro, new THREE.Matrix4());
      GUSCI.push(c);
      vestitiPelle.push(c);
    }
  };
  /** Bottoni, taschini e simili: dalla palla di una volta alla stoffa vera. */
  const appoggia = (o: THREE.Object3D) => {
    const gm = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!gm || gm.type === 'TorusGeometry' || gm.type === 'CylinderGeometry') return;
    const d = o.position.clone().setY(o.position.y + 0.01);
    const r = d.length();
    if (r < 0.3 || r > 0.45 || Math.hypot(d.x, d.z) < 0.12) return;
    const t = sulVestito(d, sopra(0.375));
    if (!t) return;
    const qui = t.p.applyMatrix4(MB.clone().invert());
    o.position.copy(qui.multiplyScalar(r / 0.375));
    o.position.y -= 0.01;
  };

  vesti(a, { testa, busto, pancia, corpo, collo, fiore, fiocco, guscio: guscioVestito }, divisa, appoggia);
  gruppo.userData.divisa = divisa;
  // i pezzi dei vestiti con lo stesso colore diventano uno solo; poi il contorno
  unisciTutto(corpo, new Set<THREE.Object3D>([busto, pancia, pelleM, guscio, ...vestitiPelle]));
  contorno(corpo);
  gruppo.userData.taglia = t.taglia * F.taglia;

  const vivo: Vivo = {
    gomiti, ginocchia, codaOssa, orecchie, petto, bacino, palpebreS, palpebreI, sopr, sguardo, angoli, aperta, R, floscio,
    siede: bipede ? Math.max(0.04, hipY - gR * 1.5) : 0.04,
    viso: { ...VISI.neutro }, meta: 'neutro', chiusi: 0, parla: 0, sguardoX: 0, sguardoY: 0, prossimoSguardo: 1,
    yPrima: 0, giroPrima: 0, vy: 0, vGiro: 0, lag: [0, 0, 0, 0], seme: (hash(a.id) % 1000) / 100, tPrima: -1,
  };
  const m: ModelloAnimale = { gruppo, corpo, busto, pancia, testa, zampe, coda, occhi, accessorio: null, mestiere: null,
    ossa: { tronco, spalle, perno, alza: bipede ? 0 : F.alza }, bipede, mani, vivo };
  posa(m, 0);
  rifinisci(m, 0, 0);
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
function vesti(a: Animale, at: Omit<Attacchi, 'testaVera'>, divisa: boolean, appoggia: (o: THREE.Object3D) => void) {
  const copia = { ...a };
  if (!copia.vestiti || copia.vestiti.some((id) => !capo(id))) aggiornaGuardaroba(copia);
  const def = divisa ? defMestiere(a.mestiere) : undefined;
  const occupate = partiOccupate(a);
  // la divisa si mette sempre, anche sopra il segno particolare
  for (const p of Object.keys(def?.divisa ?? {})) occupate.delete(p as Parte);
  if (a.specie === 'riccio') occupate.add('schiena'); // gli aculei!
  // i cappelli stanno sopra gli aculei del riccio e tra le orecchie lunghe
  const cappelli = new THREE.Group();
  if (a.specie === 'riccio') { cappelli.position.set(0, 0.1, -0.04); cappelli.scale.setScalar(1.08); }
  at.testa.add(cappelli);
  for (const k of conDivisa(indossati(copia), def?.divisa)) {
    if (occupate.has(k.parte)) continue;
    const prima = new Set(at.busto.children);
    mettiCapo(k, { ...at, testaVera: at.testa, testa: k.parte === 'testa' ? cappelli : at.testa });
    for (const o of at.busto.children) if (!prima.has(o)) appoggia(o);
  }
  if (def?.occhiali) mettiOcchiali(at.testa, a.specie === 'tasso');
}

/**
 * Solo per i cuccioli (i grandi stanno già in piedi): da "a quattro zampe" (e = 0) a "seduto sulle zampe dietro" (e = 1).
 * Il tronco gira sulle anche, le zampe davanti pendono giù, la testa resta dritta.
 */
export function posa(m: ModelloAnimale, e: number) {
  if (m.bipede) return;
  const { tronco, spalle, perno, alza } = m.ossa;
  const a = e * alza;
  tronco.rotation.x = -a;
  spalle.forEach((s) => {
    s.rotation.x = a;
    s.rotation.z = -Math.sign(s.position.x) * 0.25 * e;
  });
  perno.rotation.x = (perno.userData.base as number) + a;
}

/** Quanto oscilla una zampa camminando: le zampe lunghe fanno passi più stretti, se no sembrano forbici. */
export function ampiezzaPasso(m: ModelloAnimale): number {
  const l = (m.zampe[2]?.userData.lunghezza as number | undefined) ?? 0.25;
  return THREE.MathUtils.clamp(0.3 / l, 0.32, 1);
}

/** Seduto per terra (k = 1) o in piedi (k = 0): di quanto scende il corpo e quanto vanno avanti le gambe. */
export function seduta(m: ModelloAnimale): { giu: number; gambe: number } {
  return m.bipede ? { giu: -m.vivo.siede, gambe: -1.45 } : { giu: -0.04, gambe: 0 };
}

/** Come si sente adesso: occhi, sopracciglia e bocca ci arrivano piano (vedi rifinisci). */
export function espressione(m: ModelloAnimale, e: Espressione) {
  m.vivo.meta = e;
}
/** Sta parlando: la bocca si muove per un po'. */
export function parla(m: ModelloAnimale, secondi = 1.6) {
  m.vivo.parla = Math.max(m.vivo.parla, secondi);
}

const liscio = (da: number, a: number, k: number) => da + (a - da) * Math.min(1, k);

/**
 * Da chiamare a ogni fotogramma DOPO aver mosso zampe, testa e coda: aggiunge tutto quello che fa sembrare vivo
 * un animale e che nessuno comanda a mano. Gomiti e ginocchia che si piegano col passo, il busto che accompagna,
 * la coda e le orecchie che arrivano un attimo dopo, il respiro, lo sguardo, le palpebre, le sopracciglia, la bocca.
 */
export function rifinisci(m: ModelloAnimale, dt: number, t: number) {
  const v = m.vivo;
  const bip = m.bipede;
  const [bS, bD, gS, gD] = m.zampe.map((z) => z.rotation.x);
  // --- gomiti e ginocchia ---
  m.zampe.forEach((z, i) => {
    const r = z.rotation.x;
    if (i < 2) {
      const avanti = Math.sin(THREE.MathUtils.clamp(-r, 0, Math.PI));
      v.gomiti[i].rotation.x = bip ? -(0.22 + avanti * 0.55 + Math.max(0, r) * 0.15) : Math.max(0, r) * 0.5 + avanti * 0.15;
    } else {
      // camminando il ginocchio si piega; seduto per terra le gambe stanno distese in avanti (in sella no: piegate)
      const avanti = Math.max(0, -r), dietro = Math.max(0, r);
      const seduto = Math.min(Math.max(0, -gS), Math.max(0, -gD));
      const inSella = m.corpo.position.y > 0.2;
      v.ginocchia[i - 2].rotation.x = bip ? Math.min(1.5, (avanti - seduto) * 0.95 + seduto * (inSella ? 0.95 : 0.12) + dietro * 0.45) : Math.min(1.2, dietro * 0.55 + avanti * 0.2);
    }
  });
  // --- il busto accompagna il passo, il respiro ---
  const passo = (gS - gD) * 0.5;
  const fiato = Math.sin(t * 2.1 + v.seme);
  if (bip) {
    v.petto.rotation.y = passo * 0.16;
    v.bacino.rotation.y = -passo * 0.1;
    v.petto.rotation.z = (bS - bD) * 0.02;
    v.petto.position.y = (v.petto.userData.y0 ??= v.petto.position.y) + fiato * 0.004;
  } else {
    v.petto.rotation.y = (bS - bD) * 0.06;
    v.bacino.rotation.y = -(gS - gD) * 0.06;
  }
  v.petto.scale.set(1 + fiato * 0.012, 1 + fiato * 0.008, 1 + fiato * 0.02);
  if (dt <= 0) { posaViso(m, t); return; }

  // --- quanto si sta muovendo (per la coda e le orecchie che arrivano dopo) ---
  const y = m.corpo.position.y, giro = m.gruppo.rotation.y;
  if (v.tPrima >= 0) {
    const dGiro = Math.atan2(Math.sin(giro - v.giroPrima), Math.cos(giro - v.giroPrima));
    v.vy = liscio(v.vy, THREE.MathUtils.clamp((y - v.yPrima) / dt, -2, 2), dt * 14);
    v.vGiro = liscio(v.vGiro, THREE.MathUtils.clamp(dGiro / dt, -4, 4), dt * 10);
  }
  v.yPrima = y; v.giroPrima = giro; v.tPrima = t;

  // --- la coda: ogni pezzo segue quello prima con un attimo di ritardo, come una frusta morbida ---
  const radice = v.codaOssa[0];
  let prima = radice.rotation.y - v.vGiro * 0.06;
  for (let k = 1; k < v.codaOssa.length; k++) {
    v.lag[k] = liscio(v.lag[k], prima, dt * (9 - k * 1.6));
    const o = v.codaOssa[k];
    o.rotation.y = v.lag[k] * 0.75 + Math.sin(t * 1.4 + k * 0.9 + v.seme) * 0.05;
    o.rotation.x = Math.sin(t * 1.1 + k * 0.7 + v.seme) * 0.035 + THREE.MathUtils.clamp(v.vy * 0.12, -0.25, 0.25);
    prima = v.lag[k];
  }
  // --- le orecchie: ballano quando salta o gira la testa, ogni tanto si scuotono ---
  const scatto = Math.max(0, Math.sin(t * 0.37 + v.seme * 3) - 0.985) * 40;
  v.orecchie.forEach((o, i) => {
    const lato = o.userData.lato as number;
    const piega = (o.userData.piega as number | undefined) ?? 0;
    const voluto = piega + THREE.MathUtils.clamp(-v.vy * 0.28, -0.5, 0.5) * v.floscio + m.testa.rotation.x * 0.3 * v.floscio;
    o.rotation.x = liscio(o.rotation.x, voluto, dt * 9);
    o.rotation.z = liscio(o.rotation.z, -lato * (scatto * (i ? 0.5 : 0.35) + v.viso.lidS * 0.12 * v.floscio) + m.testa.rotation.z * 0.5 * v.floscio, dt * 12);
  });

  // --- il viso ---
  const meta = VISI[v.meta];
  const k = dt * 7;
  for (const c of ['sopY', 'sopR', 'lidS', 'lidI', 'bocca', 'aperta'] as const) v.viso[c] = liscio(v.viso[c], meta[c], k);
  // gli occhi chiusi li comanda chi muove l'animale (battito, sonno): qui diventano palpebre che scendono morbide
  const s = m.occhi[0].scale.y;
  const chiusura = THREE.MathUtils.clamp((1 - s) / 0.85, 0, 1);
  v.chiusi = liscio(v.chiusi, chiusura, dt * (chiusura > v.chiusi ? 34 : 15));
  v.parla = Math.max(0, v.parla - dt);
  // lo sguardo: ogni tanto guarda altrove, e anticipa la testa quando gira
  v.prossimoSguardo -= dt;
  if (v.prossimoSguardo <= 0) {
    v.prossimoSguardo = 1.2 + Math.random() * 3.5;
    const fermo = Math.random() < 0.45;
    v.sguardoX = fermo ? 0 : (Math.random() * 2 - 1) * 0.3;
    v.sguardoY = fermo ? 0 : (Math.random() * 2 - 1) * 0.14;
  }
  posaViso(m, t, dt);
}

function posaViso(m: ModelloAnimale, t: number, dt = 1) {
  const v = m.vivo, e = v.viso, R = v.R;
  const chiuso = Math.max(e.lidS, v.chiusi);
  v.palpebreS.forEach((o, i) => {
    const p0 = o.userData.p0 as THREE.Vector3;
    o.position.y = p0.y + (1 - chiuso) * 2.2 * R;
    o.rotation.z = (i ? 1 : -1) * e.sopR * 0.35 * (1 - chiuso);
  });
  v.palpebreI.forEach((o) => {
    const p0 = o.userData.p0 as THREE.Vector3;
    o.position.y = p0.y - (1 - e.lidI * (1 - v.chiusi) * 0.75) * 1.12 * R;
  });
  v.sopr.forEach((o, i) => {
    const p0 = o.userData.p0 as THREE.Vector3;
    o.position.y = p0.y + (e.sopY - chiuso * 0.12) * R;
    o.rotation.z = (i ? 1 : -1) * e.sopR;
  });
  const sg = v.sguardo, s0 = sg.userData.p0 as THREE.Vector3;
  const gx = THREE.MathUtils.clamp(v.sguardoX + m.testa.rotation.y * 0.5, -0.36, 0.36), gy = THREE.MathUtils.clamp(v.sguardoY - m.testa.rotation.x * 0.3, -0.2, 0.2);
  sg.position.x = liscio(sg.position.x, s0.x + gx * R, dt * 16);
  sg.position.y = liscio(sg.position.y, s0.y + gy * R, dt * 16);
  const a0 = v.angoli.userData.p0 as THREE.Vector3;
  v.angoli.position.y = a0.y + e.bocca * 0.035 - 0.012;
  const parlando = v.parla > 0 ? 0.35 + Math.sin(t * 15) * 0.3 + Math.sin(t * 23.7) * 0.15 : 0;
  const ap = Math.min(1, Math.max(e.aperta, parlando) * (1 - v.chiusi * 0.5));
  if (ap < 0.04) v.aperta.scale.setScalar(0.001); else v.aperta.scale.set(0.5 + ap * 0.5, ap, 1);
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
  // nella mano
  g.position.set(0, 0.06, 0.02);
  m.mani[0].add(g);
  // si tiene in mano solo per lavorare (il nome "grembiule" è rimasto da quando era un grembiule)
  g.userData.grembiule = true;
  g.visible = false;
  m.accessorio = g;
}
