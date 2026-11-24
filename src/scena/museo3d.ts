// Il museo nella scena: un edificio di pietra chiara con le colonne davanti, il frontone,
// la scritta MUSEO e una cupola verde di rame con in cima un fungo rosso a pois (la sala dei funghi).
// Davanti, ai lati dei gradini, due vetrinette con dentro un fungo e un cristallo.
// Qui c'è anche la "cosa che brilla": il ritrovamento del giorno, per terra nel villaggio.
import * as THREE from 'three';
import { FUNGO, type DefFungo } from '../lib/funghi';
import { geo, mat, mesh } from './modelli';
import { contorno, macchie, ombra, spriteTesto, texture } from './ps1';

/** Un fungo in 3D (cappello e gambo), più o meno come la sua specie. Alto circa 1. */
export function creaFungo3D(d: DefFungo): THREE.Group {
  const g = new THREE.Group();
  const cap = mat(d.cappello, { rim: 0.35 });
  const gam = mat(d.gambo, { rim: 0.2 });
  const funghetto = (h: number, r: number, x = 0, z = 0, piega = 0) => {
    const f = new THREE.Group();
    f.add(mesh(geo.cil(r * 0.32, r * 0.4, h, 8), gam, 0, h / 2, 0));
    const c = mesh(geo.palla(r, 12), cap, 0, h, 0);
    c.scale.y = 0.55;
    f.add(c);
    f.position.set(x, 0, z);
    f.rotation.z = piega;
    return f;
  };
  switch (d.forma) {
    case 'porcino': {
      g.add(mesh(geo.palla(0.28, 10), gam, 0, 0.3, 0));
      g.children[0].scale.set(1, 1.25, 1);
      const c = mesh(geo.palla(0.5, 14), cap, 0, 0.68, 0);
      c.scale.y = 0.55;
      g.add(c);
      break;
    }
    case 'imbuto': {
      g.add(mesh(geo.cil(0.42, 0.1, 0.7, 12), cap, 0, 0.4, 0));
      break;
    }
    case 'gruppetto': {
      for (const [x, z, h] of [[0, 0, 0.75], [0.25, 0.1, 0.55], [-0.22, 0.12, 0.6], [0.05, -0.24, 0.5]]) g.add(funghetto(h, 0.2, x, z, x * 0.6));
      break;
    }
    case 'mazza': {
      g.add(mesh(geo.cil(0.06, 0.1, 1.1, 8), gam, 0, 0.55, 0));
      const c = mesh(geo.cono(0.55, 0.35, 14), cap, 0, 1.2, 0);
      g.add(c);
      break;
    }
    case 'spugna': {
      g.add(mesh(geo.cil(0.14, 0.18, 0.35, 8), gam, 0, 0.18, 0));
      const c = mesh(geo.palla(0.28, 8), cap, 0, 0.6, 0);
      c.scale.y = 1.5;
      g.add(c);
      break;
    }
    case 'mensola':
    case 'orecchio': {
      g.add(mesh(geo.scatola(0.12, 0.9, 0.5), mat('#7a5a3a'), -0.3, 0.45, 0)); // un pezzo di tronco
      for (let i = 0; i < (d.forma === 'mensola' ? 3 : 2); i++) {
        const c = mesh(geo.palla(0.32 - i * 0.06, 10), cap, -0.15, 0.3 + i * 0.25, 0);
        c.scale.set(1, 0.3, 1.2);
        g.add(c);
      }
      break;
    }
    case 'tartufo': {
      const c = mesh(geo.palla(0.3, 8), cap, 0, 0.25, 0);
      c.scale.set(1.1, 0.85, 1);
      g.add(c);
      break;
    }
    case 'gabbia': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        const arco = mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 10, Math.PI), cap, 0, 0.2, 0);
        arco.rotation.y = a;
        g.add(arco);
      }
      break;
    }
    case 'corallo': {
      for (let i = 0; i < 7; i++) {
        const r = mesh(geo.cil(0.03, 0.06, 0.6, 5), cap, Math.cos(i * 2.3) * 0.12, 0.3, Math.sin(i * 2.3) * 0.12);
        r.rotation.z = Math.cos(i * 1.7) * 0.5;
        r.rotation.x = Math.sin(i * 1.3) * 0.4;
        g.add(r);
      }
      break;
    }
    case 'palla': {
      g.add(mesh(geo.palla(0.3, 10), cap, 0, 0.28, 0));
      break;
    }
    default: { // ombrello
      const f = funghetto(0.75, 0.42);
      g.add(f);
    }
  }
  if (d.pois) {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = 0.12 + (i % 3) * 0.1;
      g.add(mesh(geo.palla(0.04, 6), mat('#ffffff'), Math.cos(a) * r, 0.92 - r * 0.25, Math.sin(a) * r));
    }
  }
  return g;
}

export class MuseoInScena {
  readonly gruppo = new THREE.Group();
  private finale: THREE.Group;

  constructor() {
    const g = this.gruppo;
    g.add(ombra(3.4));
    const pietra = mat('#ffffff', { map: texture(64, macchie(['#ece4d4', '#dcd2c0', '#f4eee2', '#d0c6b2'], 1, 61)), rim: 0.15 });
    const muro = mat('#ffffff', { map: texture(64, macchie(['#f6eedc', '#ece2cc', '#fbf6ea'], 0.6, 62)), rim: 0.2 });
    const colonna = mat('#f8f4ec', { rim: 0.35 });
    const rame = mat('#5aa890', { rim: 0.4 });
    const legno = mat('#6a3e24');
    // lo zoccolo e i gradini
    g.add(mesh(geo.scatola(6.2, 0.3, 4.2), pietra, 0, 0.15, -0.1));
    for (let i = 0; i < 3; i++) g.add(mesh(geo.scatola(2.4 - i * 0.2, 0.12, 0.35), pietra, 0, 0.06 + i * 0.1, 2.35 - i * 0.25));
    // la sala
    g.add(mesh(geo.scatola(5.2, 2.6, 2.8), muro, 0, 1.6, -0.6));
    // le colonne del portico
    for (let i = 0; i < 6; i++) {
      const x = -2.3 + i * 0.92;
      g.add(mesh(geo.scatola(0.42, 0.14, 0.42), pietra, x, 0.37, 1.25));
      g.add(mesh(geo.cil(0.15, 0.17, 2.3, 10), colonna, x, 1.55, 1.25));
      g.add(mesh(geo.scatola(0.42, 0.14, 0.42), pietra, x, 2.75, 1.25));
    }
    // l'architrave con la scritta, il tetto e il frontone
    const insegna = mat('#ffffff', { map: texture(256, (c, l) => {
      c.fillStyle = '#efe6d2'; c.fillRect(0, 0, l, l);
      c.fillStyle = '#5a3a1e'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `900 ${l * 0.16}px 'Nunito Variable', sans-serif`;
      c.save(); c.scale(1, 4); c.fillText('M U S E O', l / 2, l / 8 + 3); c.restore();
    }), rim: 0 });
    g.add(mesh(geo.scatola(5.5, 0.42, 0.6), pietra, 0, 3.03, 1.2));
    const scritta = mesh(geo.scatola(3.0, 0.3, 0.02), insegna, 0, 3.03, 1.51);
    g.add(scritta);
    g.add(mesh(geo.scatola(5.6, 0.18, 3.9), pietra, 0, 3.32, -0.1));
    const triangolo = new THREE.Shape();
    triangolo.moveTo(-2.8, 0);
    triangolo.lineTo(2.8, 0);
    triangolo.lineTo(0, 1.0);
    triangolo.closePath();
    const frontone = mesh(new THREE.ExtrudeGeometry(triangolo, { depth: 0.5, bevelEnabled: false }), pietra, 0, 3.41, 1.0);
    g.add(frontone);
    // un fungo dipinto nel frontone (è anche il museo dei funghi)
    const disegno = mesh(geo.palla(0.22, 10), mat('#d84a3a'), 0, 3.7, 1.52);
    disegno.scale.set(1.2, 0.6, 0.2);
    g.add(disegno);
    g.add(mesh(geo.scatola(0.1, 0.18, 0.05), mat('#f4ecd8'), 0, 3.55, 1.52));
    // la cupola di rame verde con il lanternino e il fungo in cima
    const cupola = mesh(new THREE.SphereGeometry(1.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), rame, 0, 3.41, -0.9);
    g.add(cupola);
    g.add(mesh(geo.cil(1.2, 1.2, 0.18, 18), pietra, 0, 3.45, -0.9));
    this.finale = creaFungo3D(FUNGO.muscaria);
    this.finale.scale.setScalar(0.55);
    this.finale.position.set(0, 4.5, -0.9);
    g.add(this.finale);
    // la porta grande in mezzo e le finestre ad arco
    g.add(mesh(geo.scatola(1.05, 1.75, 0.06), legno, 0, 1.18, 0.82));
    g.add(mesh(geo.palla(0.08, 6), mat('#f2c94c'), 0.32, 1.1, 0.88));
    for (const x of [-1.7, 1.7]) {
      g.add(mesh(geo.scatola(0.75, 1.0, 0.05), mat('#8ac8e0', { rim: 0.6, emissive: '#4a90b0', emissiveIntensity: 0.15 }), x, 1.55, 0.82));
      g.add(mesh(geo.scatola(0.9, 0.1, 0.12), pietra, x, 1.0, 0.86));
      const arco = mesh(geo.cil(0.38, 0.38, 0.06, 10, ), mat('#8ac8e0', { rim: 0.6 }), x, 2.05, 0.82);
      arco.rotation.x = Math.PI / 2;
      arco.scale.y = 1;
      g.add(arco);
    }
    // due stendardi ai lati
    for (const [x, c] of [[-2.75, '#c8443a'], [2.75, '#3a7a5a']] as const) {
      g.add(mesh(geo.cil(0.03, 0.03, 1.6, 5), legno, x, 2.0, 1.45));
      g.add(mesh(geo.scatola(0.5, 0.9, 0.02), mat(c), x, 2.25, 1.5));
    }
    // le vetrinette davanti: un fungo e un cristallo
    for (const [x, cosa] of [[-2.0, 'fungo'], [2.0, 'cristallo']] as const) {
      g.add(mesh(geo.scatola(0.6, 0.55, 0.6), legno, x, 0.57, 2.05));
      const dentro = cosa === 'fungo' ? creaFungo3D(FUNGO.porcino) : mesh(new THREE.OctahedronGeometry(0.16), mat('#b48ae8', { rim: 0.8, emissive: '#7a4ab0', emissiveIntensity: 0.3 }));
      dentro.scale.multiplyScalar(cosa === 'fungo' ? 0.42 : 1);
      dentro.position.set(x, cosa === 'fungo' ? 0.86 : 1.05, 2.05);
      g.add(dentro);
    }
    contorno(g);
    for (const x of [-2.0, 2.0]) {
      const vetro = mesh(geo.scatola(0.56, 0.5, 0.56), mat('#cfeeff', { transparent: true, opacity: 0.3, rim: 0.8, depthWrite: false }), x, 1.1, 2.05);
      g.add(vetro);
    }
    g.userData.ingombroCasa = 3.0;
  }

  anima(t: number) {
    this.finale.rotation.y = t * 0.2;
  }
}

/** Il centro della porta del museo (per la telecamera). */
export const PORTA_MUSEO = new THREE.Vector3(0, 1.4, 1.5);

/**
 * La cosa che brilla per terra: un luccichio con una stellina che pulsa sopra.
 * Si tocca e Giada la prende (vedi lib/museo.ts).
 */
export function creaScintilla(): THREE.Group {
  const g = new THREE.Group();
  const gemma = mesh(new THREE.OctahedronGeometry(0.2), mat('#fff2b0', { rim: 1, emissive: '#ffd860', emissiveIntensity: 0.9 }), 0, 0.3, 0);
  gemma.name = 'gemma';
  g.add(gemma);
  const anello = mesh(new THREE.RingGeometry(0.18, 0.3, 20), new THREE.MeshBasicMaterial({ color: '#fff4c0', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }), 0, 0.03, 0);
  anello.rotation.x = -Math.PI / 2;
  anello.name = 'anello';
  g.add(anello);
  // una colonnina di luce, che si vede anche da lontano
  const luce = mesh(geo.cil(0.22, 0.32, 2.4, 12), new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 1.2, 0);
  luce.name = 'luce';
  g.add(luce);
  const stella = spriteTesto('✦', '#fff4b0', 64);
  stella.scale.setScalar(0.45);
  stella.position.y = 1.0;
  stella.name = 'stella';
  g.add(stella);
  // una zona più grande e invisibile, così è facile da toccare col dito
  const presa = mesh(geo.palla(0.6, 8), new THREE.MeshBasicMaterial({ visible: false }), 0, 0.4, 0);
  g.add(presa);
  g.userData.bersaglio = { tipo: 'ritrovamento' };
  return g;
}

export function animaScintilla(g: THREE.Object3D, t: number) {
  const gemma = g.getObjectByName('gemma');
  if (gemma) { gemma.rotation.y = t * 2; gemma.position.y = 0.4 + Math.sin(t * 3) * 0.08; }
  const luce = g.getObjectByName('luce');
  if (luce) ((luce as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.14 + (Math.sin(t * 2) * 0.5 + 0.5) * 0.14;
  const stella = g.getObjectByName('stella');
  if (stella) { const k = 0.45 + (Math.sin(t * 5) * 0.5 + 0.5) * 0.4; stella.scale.setScalar(k); }
  const anello = g.getObjectByName('anello');
  if (anello) { const k = 1 + ((t * 0.8) % 1) * 0.8; anello.scale.setScalar(k); ((anello as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - ((t * 0.8) % 1)); }
}
