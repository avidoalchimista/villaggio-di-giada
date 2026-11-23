// La sartoria del villaggio: come si costruiscono in 3D i capi (forma + colore + motivo),
// gli occhiali e gli attrezzi che gli animali tengono in mano mentre lavorano.
import * as THREE from 'three';
import type { Capo, Motivo } from '../lib/vestiti';
import { geo, mat, mesh, varia } from './modelli';
import { texture } from './ps1';

export interface Attacchi {
  testa: THREE.Group; // per i cappelli: già spostato sopra aculei e orecchie
  testaVera: THREE.Group;
  busto: THREE.Mesh;
  pancia: THREE.Mesh;
  corpo: THREE.Group;
  collo: (o: THREE.Object3D) => void;
  fiore: (petalo: string, centro: string) => THREE.Group;
  fiocco: (colore: string) => THREE.Group;
}

// ---------- stoffe ----------

const cacheStoffe = new Map<string, THREE.Material>();
/** La stoffa del capo: tinta unita, righe, quadri, pois, cuoricini, stelline, macchie di colore. */
export function stoffa(colore: string, motivo: Motivo, colore2: string, ripeti = 2, lati: THREE.Side = THREE.FrontSide): THREE.Material {
  if (motivo === 'tinta') return mat(colore, { rim: 0.3, side: lati });
  const k = [colore, motivo, colore2, ripeti, lati].join('|');
  if (cacheStoffe.has(k)) return cacheStoffe.get(k)!;
  const t = texture(64, (c, l) => {
    c.fillStyle = colore;
    c.fillRect(0, 0, l, l);
    c.fillStyle = colore2;
    switch (motivo) {
      case 'righe':
        for (let i = 0; i < 4; i++) c.fillRect(0, i * (l / 4), l, l / 8);
        break;
      case 'bande':
        c.fillRect(0, l * 0.3, l, l * 0.12);
        c.fillRect(0, l * 0.7, l, l * 0.12);
        break;
      case 'quadri':
        c.globalAlpha = 0.55;
        for (let i = 0; i < 4; i++) { c.fillRect(i * (l / 4), 0, l / 10, l); c.fillRect(0, i * (l / 4), l, l / 10); }
        c.globalAlpha = 1;
        break;
      case 'pois':
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          c.beginPath();
          c.arc((x + (y % 2) * 0.5) * (l / 4) + l / 8, y * (l / 4) + l / 8, l / 16, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'cuori':
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
          const cx = (x + (y % 2) * 0.5) * (l / 3) + l / 6, cy = y * (l / 3) + l / 6, r = l / 22;
          c.beginPath(); c.arc(cx - r, cy, r, 0, Math.PI * 2); c.arc(cx + r, cy, r, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(cx - 2 * r, cy + r * 0.3); c.lineTo(cx, cy + 2.6 * r); c.lineTo(cx + 2 * r, cy + r * 0.3); c.fill();
        }
        break;
      case 'stelle':
        for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
          const cx = (x + (y % 2) * 0.5) * (l / 3) + l / 6, cy = y * (l / 3) + l / 6;
          c.beginPath();
          for (let p = 0; p < 10; p++) {
            const r = p % 2 ? l / 30 : l / 13, a = (p / 10) * Math.PI * 2 - Math.PI / 2;
            c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          c.fill();
        }
        break;
      case 'macchie': {
        const tinte = ['#d8443a', '#3a5aa8', '#f2c230', '#4f9a5a', '#8a5ac8', '#8a5a36'];
        for (let i = 0; i < 14; i++) {
          c.fillStyle = tinte[i % tinte.length];
          c.beginPath();
          c.arc(((i * 37) % 64) / 64 * l, ((i * 23 + 11) % 64) / 64 * l, l / 18 + (i % 3) * 2, 0, Math.PI * 2);
          c.fill();
        }
        break;
      }
    }
  }, ripeti);
  const m = mat('#ffffff', { map: t, rim: 0.3, side: lati });
  cacheStoffe.set(k, m);
  return m;
}

/** La stoffa vista da tutte e due le parti (gilet, mantelle, grembiuli aperti). */
const doppia = (k: Capo) => stoffa(k.colore, k.motivo, k.colore2, 2, THREE.DoubleSide);

const piatto = (o: THREE.Object3D) => { o.traverse((c) => (c.userData.senzaContorno = true)); return o; };
const calotta = (r: number, apertura: number) => new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, apertura);
const anello = (r: number, spessore: number, m: THREE.Material, y: number, sx = 1.07) => {
  const t = mesh(new THREE.TorusGeometry(r, spessore, 6, 24), m, 0, y, -0.02);
  t.rotation.x = Math.PI / 2;
  t.scale.set(sx, 1, 1);
  return t;
};

// ---------- i capi ----------

export function mettiCapo(k: Capo, at: Attacchi) {
  const { testa, testaVera, busto, pancia, collo, fiocco } = at;
  const tinta = stoffa(k.colore, k.motivo, k.colore2);
  const unita = mat(k.colore, { rim: 0.3 });
  const scuro = mat(varia(k.colore, 0, -0.15), { rim: 0.2 });
  const secondo = mat(k.colore2, { rim: 0.3 });
  const oro = mat('#f2c230', { rim: 0.4 });
  switch (k.forma) {
    // ======== testa ========
    case 'berretto': case 'puntuto': {
      const cap = mesh(calotta(0.5, 1.15), tinta, 0, 0.04, -0.02);
      cap.scale.set(1.08, 0.95, 1.02);
      testa.add(cap, anello(0.46, 0.05, scuro, 0.24));
      if (k.forma === 'puntuto') {
        const punta = mesh(geo.cono(0.26, 0.5, 12), tinta, 0.08, 0.7, -0.06);
        punta.rotation.z = -0.45;
        testa.add(punta, mesh(geo.palla(0.07, 8), secondo, 0.3, 0.88, -0.06));
      } else testa.add(mesh(geo.palla(0.11, 10), secondo, 0, 0.58, -0.02));
      break;
    }
    case 'cuffia': {
      const cap = mesh(calotta(0.5, 1.25), tinta, 0, 0.02, -0.02);
      cap.scale.set(1.08, 0.95, 1.02);
      testa.add(cap);
      for (const s of [-1, 1]) {
        const p = mesh(geo.palla(0.15, 10), tinta, s * 0.47, -0.02, 0);
        p.scale.set(0.45, 1, 0.9);
        testa.add(p, mesh(geo.cil(0.012, 0.012, 0.25, 4), scuro, s * 0.47, -0.22, 0.02));
        testa.add(mesh(geo.palla(0.04, 6), secondo, s * 0.47, -0.36, 0.02));
      }
      break;
    }
    case 'paglia': case 'velo': {
      const paglia = mat('#e8c870', { rim: 0.4 });
      const tesa = mesh(geo.cil(0.6, 0.6, 0.03, 22), paglia, 0, 0.36, -0.02);
      tesa.rotation.x = -0.1;
      testa.add(tesa, mesh(geo.cil(0.27, 0.3, 0.22, 16), paglia, 0, 0.48, -0.04));
      testa.add(mesh(geo.cil(0.305, 0.305, 0.06, 16), k.forma === 'velo' ? mat('#fbfbf6') : unita, 0, 0.42, -0.04));
      if (k.forma === 'velo') {
        const rete = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.62, 20, 1, true), mat('#ffffff', { transparent: true, opacity: 0.35, side: THREE.DoubleSide, rim: 0 }), 0, 0.06, -0.02);
        testa.add(piatto(rete));
      }
      break;
    }
    case 'coppola': case 'visiera': case 'caschetto': {
      const cap = mesh(calotta(0.49, k.forma === 'caschetto' ? 1.3 : 1.05), k.forma === 'caschetto' ? mat(k.colore, { rim: 0.5 }) : tinta, 0, k.forma === 'coppola' ? 0.1 : 0.06, -0.02);
      cap.scale.set(1.08, k.forma === 'coppola' ? 0.62 : 0.95, 1.05);
      testa.add(cap);
      const vis = mesh(geo.cil(0.24, 0.24, 0.03, 16, ), k.forma === 'caschetto' ? unita : scuro, 0, k.forma === 'coppola' ? 0.27 : 0.3, 0.36);
      vis.scale.set(1.1, 1, 0.7);
      vis.rotation.x = k.forma === 'coppola' ? 0.25 : 0.12;
      testa.add(vis);
      if (k.forma === 'visiera') testa.add(mesh(geo.palla(0.045, 8), secondo, 0, 0.58, -0.02), piatto(mesh(geo.scatola(0.14, 0.1, 0.02), oro, 0, 0.42, 0.44)));
      if (k.forma === 'caschetto') testa.add(anello(0.5, 0.04, unita, 0.22, 1.08), mesh(geo.scatola(0.06, 0.08, 0.66), scuro, 0, 0.6, 0));
      break;
    }
    case 'bombetta': case 'tesa': case 'piuma': {
      const tesa = mesh(geo.cil(k.forma === 'bombetta' ? 0.4 : 0.48, k.forma === 'bombetta' ? 0.4 : 0.48, 0.03, 20), unita, 0, 0.36, -0.03);
      tesa.rotation.x = -0.15;
      testa.add(tesa);
      if (k.forma === 'bombetta') {
        const cupola = mesh(geo.palla(0.29, 16), unita, 0, 0.42, -0.05);
        cupola.scale.y = 0.85;
        testa.add(cupola);
      } else testa.add(mesh(geo.cil(0.25, 0.28, 0.26, 16), unita, 0, 0.5, -0.05));
      testa.add(mesh(geo.cil(0.29, 0.29, 0.06, 16), secondo, 0, 0.42, -0.05));
      if (k.forma === 'piuma') {
        const p = mesh(geo.palla(0.08, 8), mat(k.colore2 === '#f4ecd8' ? '#f2c230' : k.colore2), 0.24, 0.66, -0.1);
        p.scale.set(0.6, 3, 0.4);
        p.rotation.z = -0.5;
        testa.add(p);
      }
      break;
    }
    case 'basco': {
      const b = mesh(geo.palla(0.4, 18), tinta, 0.04, 0.42, -0.03);
      b.scale.set(1.08, 0.32, 1);
      b.rotation.z = -0.2;
      testa.add(b, mesh(geo.cil(0.02, 0.02, 0.07, 5), scuro, 0.06, 0.55, -0.03));
      break;
    }
    case 'fazzoletto': {
      const cap = mesh(calotta(0.5, 1.2), tinta, 0, 0.02, -0.03);
      cap.scale.set(1.08, 0.92, 1.04);
      testa.add(cap);
      for (const s of [-1, 1]) {
        const c = mesh(geo.cono(0.06, 0.18, 4), tinta, s * 0.07, 0.02, -0.5);
        c.rotation.set(-1.1, 0, s * 0.6);
        testa.add(c);
      }
      break;
    }
    case 'fiocco': {
      const f = fiocco(k.colore);
      f.scale.setScalar(1.7);
      f.position.set(0.2, 0.38, 0.02);
      f.rotation.z = -0.3;
      testa.add(f);
      break;
    }
    case 'fascia-testa': {
      testa.add(anello(0.45, 0.05, tinta, 0.18, 1.08));
      const f = fiocco(k.colore);
      f.position.set(0.3, 0.25, 0.25);
      f.rotation.y = 0.6;
      testa.add(f);
      break;
    }
    case 'pescatora': case 'cerata-cappello': {
      const m = k.forma === 'cerata-cappello' ? mat(k.colore, { rim: 0.5 }) : tinta;
      testa.add(mesh(geo.cil(0.3, 0.38, 0.24, 16), m, 0, 0.42, -0.03));
      const tesa = mesh(geo.cil(0.4, k.forma === 'cerata-cappello' ? 0.62 : 0.55, 0.12, 20, ), m, 0, 0.3, k.forma === 'cerata-cappello' ? -0.08 : -0.03);
      testa.add(tesa);
      break;
    }
    case 'casco': {
      const c = mesh(calotta(0.56, 1.75), mat(k.colore, { rim: 0.6 }), 0, 0.02, -0.04);
      c.scale.set(1.04, 1, 1);
      testa.add(c);
      testa.add(mesh(new THREE.SphereGeometry(0.565, 20, 10, 0, Math.PI * 2, 0, 0.5), mat('#ffffff', { rim: 0.4 }), 0, 0.02, -0.04));
      // gli occhialoni da moto sulla fronte
      for (const x of [-0.15, 0.15]) {
        const o = mesh(geo.cil(0.09, 0.09, 0.06, 12), mat('#3a3a40'), x, 0.3, 0.45);
        o.rotation.x = Math.PI / 2 - 0.6;
        testa.add(o);
        const v = mesh(new THREE.CircleGeometry(0.07, 12), mat('#9fd8f0', { emissive: '#4a8aa0', emissiveIntensity: 0.3, rim: 0 }), x, 0.32, 0.48);
        v.rotation.x = -0.6;
        testa.add(piatto(v));
      }
      break;
    }
    case 'toque': {
      testa.add(mesh(geo.cil(0.2, 0.18, 0.14), mat('#ffffff'), 0, 0.44, -0.04));
      const sbuffo = mesh(geo.palla(0.26), mat('#ffffff'), 0, 0.6, -0.04);
      sbuffo.scale.set(1, 0.7, 1);
      testa.add(sbuffo);
      break;
    }
    case 'bustina': {
      const b = mesh(geo.palla(0.3, 14), mat(k.colore, { rim: 0.3 }), 0, 0.4, -0.03);
      b.scale.set(0.6, 0.45, 1.25);
      testa.add(b);
      break;
    }
    case 'elmo': {
      const c = mesh(calotta(0.52, 1.25), mat(k.colore, { rim: 0.6 }), 0, 0.04, -0.03);
      c.scale.set(1.06, 1, 1.04);
      testa.add(c);
      const falda = mesh(geo.cil(0.5, 0.58, 0.04, 20), mat(k.colore, { rim: 0.5 }), 0, 0.22, -0.12);
      falda.scale.set(1, 1, 1.15);
      testa.add(falda, mesh(geo.scatola(0.06, 0.12, 0.85), mat(varia(k.colore, 0, -0.1)), 0, 0.55, -0.04));
      testa.add(piatto(mesh(new THREE.CircleGeometry(0.1, 12), oro, 0, 0.44, 0.48)));
      break;
    }
    case 'coloniale': {
      const c = mesh(geo.palla(0.4, 16), mat(k.colore, { rim: 0.4 }), 0, 0.4, -0.03);
      c.scale.y = 0.7;
      testa.add(c, mesh(geo.cil(0.55, 0.55, 0.03, 20), mat(k.colore, { rim: 0.4 }), 0, 0.33, -0.03));
      testa.add(mesh(geo.cil(0.405, 0.405, 0.06, 16), mat('#8a5a36'), 0, 0.37, -0.03));
      break;
    }
    case 'occhialoni': {
      testa.add(anello(0.46, 0.035, mat('#5a3f2a'), 0.22, 1.08));
      for (const s of [-1, 1]) {
        const o = mesh(geo.cil(0.1, 0.1, 0.08, 14), mat('#b08040', { rim: 0.5 }), s * 0.14, 0.3, 0.38);
        o.rotation.x = Math.PI / 2 - 0.5;
        testa.add(o);
        const v = mesh(new THREE.CircleGeometry(0.075, 14), mat('#9fe0f0', { emissive: '#4a8aa0', emissiveIntensity: 0.3, rim: 0 }), s * 0.14, 0.33, 0.43);
        v.rotation.x = -0.5;
        testa.add(piatto(v));
      }
      break;
    }

    // ======== collo (attaccato alla testa, così segue anche la posa in piedi) ========
    case 'sciarpa': {
      const sc = mesh(new THREE.TorusGeometry(0.25, 0.07, 8, 18), tinta, 0, 0, 0.02);
      sc.rotation.x = Math.PI / 2;
      collo(sc);
      for (const [x, rz, l] of [[0.1, 0.2, 0.26], [0.17, 0.35, 0.2]] as const) {
        const lembo = mesh(geo.scatola(0.1, l, 0.05), tinta, x, -0.58, 0.25);
        lembo.rotation.z = rz;
        testaVera.add(lembo);
      }
      break;
    }
    case 'bandana': case 'fazzoletto-collo': {
      const b = mesh(new THREE.TorusGeometry(0.25, 0.05, 8, 18), tinta, 0, 0, 0.02);
      b.rotation.x = Math.PI / 2;
      collo(b);
      const tri = mesh(geo.cono(k.forma === 'bandana' ? 0.14 : 0.1, 0.22, 3), tinta, 0, -0.55, 0.23);
      tri.rotation.set(0.3, 0, Math.PI);
      testaVera.add(tri);
      break;
    }
    case 'papillon': {
      const f = fiocco(k.colore);
      f.scale.setScalar(0.8);
      f.position.set(0, -0.46, 0.3);
      testaVera.add(f);
      break;
    }
    case 'cravatta': {
      testaVera.add(mesh(geo.palla(0.045, 8), tinta, 0, -0.47, 0.31));
      const lama = mesh(geo.scatola(0.09, 0.3, 0.03), tinta, 0, -0.64, 0.33);
      lama.rotation.x = -0.25;
      testaVera.add(lama);
      const punta = mesh(geo.cono(0.065, 0.07, 4), tinta, 0, -0.82, 0.37);
      punta.rotation.set(-0.25, Math.PI / 4, Math.PI);
      testaVera.add(punta);
      break;
    }
    case 'collana': {
      for (let i = 0; i < 13; i++) {
        const a = -1.6 + (i / 12) * 3.2;
        testaVera.add(mesh(geo.palla(0.035, 6), mat(i % 2 ? k.colore : '#fbfbf6', { rim: 0.5 }), Math.sin(a) * 0.26, -0.46 - Math.cos(a) * 0.04, Math.cos(a) * 0.26 + 0.04));
      }
      break;
    }
    case 'colletto': {
      for (const s of [-1, 1]) {
        const c = mesh(new THREE.CircleGeometry(0.12, 14, 0, Math.PI), tinta, s * 0.09, -0.44, 0.31);
        c.rotation.set(-0.5, 0, Math.PI + s * 0.4);
        testaVera.add(piatto(c));
      }
      break;
    }
    case 'foulard': {
      const b = mesh(new THREE.TorusGeometry(0.25, 0.045, 8, 18), tinta, 0, 0, 0.02);
      b.rotation.x = Math.PI / 2;
      collo(b);
      testaVera.add(mesh(geo.palla(0.06, 8), tinta, 0.13, -0.47, 0.25));
      const l = mesh(geo.cono(0.06, 0.16, 5), tinta, 0.16, -0.58, 0.25);
      l.rotation.z = Math.PI + 0.3;
      testaVera.add(l);
      break;
    }
    case 'stetoscopio': {
      const t = mesh(new THREE.TorusGeometry(0.26, 0.018, 5, 20, Math.PI * 1.3), mat('#4a4a54'), 0, 0, 0.02);
      t.rotation.set(Math.PI / 2, 0, -0.65 + Math.PI);
      collo(t);
      testaVera.add(mesh(geo.cil(0.015, 0.015, 0.25, 5), mat('#4a4a54'), 0.14, -0.6, 0.3));
      testaVera.add(mesh(geo.cil(0.05, 0.05, 0.03, 10), mat('#c8c8d0', { rim: 0.6 }), 0.14, -0.74, 0.32));
      break;
    }
    case 'metro': {
      const nastro = texture(32, (c, l) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, l, l); c.fillStyle = '#3a2a1a'; for (let i = 0; i < l; i += 4) c.fillRect(0, i, i % 8 ? l / 4 : l / 2, 1); });
      const m = mat('#ffffff', { map: nastro, rim: 0.2 });
      const b = mesh(new THREE.TorusGeometry(0.25, 0.02, 4, 18), m, 0, 0, 0.02);
      b.rotation.x = Math.PI / 2;
      b.scale.set(1, 1, 0.3);
      collo(b);
      for (const s of [-1, 1]) testaVera.add(mesh(geo.scatola(0.05, 0.38, 0.015), m, s * 0.15, -0.65, 0.31));
      break;
    }
    case 'macchina-foto': {
      const t = mesh(new THREE.TorusGeometry(0.25, 0.015, 4, 18), mat('#3a2a1a'), 0, 0, 0.02);
      t.rotation.x = Math.PI / 2;
      collo(t);
      testaVera.add(mesh(geo.scatola(0.22, 0.14, 0.1), mat('#2e2a2e', { rim: 0.4 }), 0, -0.66, 0.36));
      const ob = mesh(geo.cil(0.05, 0.05, 0.08, 12), mat('#8a8a90', { rim: 0.6 }), 0, -0.66, 0.43);
      ob.rotation.x = Math.PI / 2;
      testaVera.add(ob, mesh(geo.scatola(0.05, 0.03, 0.05), mat('#d8443a'), 0.07, -0.58, 0.36));
      break;
    }
    case 'fascia': {
      // fascia da sindaco: verde, bianca e rossa, di traverso
      const tri = texture(32, (c, l) => { c.fillStyle = '#3f9a4a'; c.fillRect(0, 0, l, l / 3); c.fillStyle = '#ffffff'; c.fillRect(0, l / 3, l, l / 3); c.fillStyle = '#d8443a'; c.fillRect(0, (2 * l) / 3, l, l / 3); });
      const f = mesh(new THREE.TorusGeometry(0.37, 0.05, 4, 28), mat('#ffffff', { map: tri, rim: 0.2 }), 0, 0.0, 0);
      f.rotation.set(0, Math.PI / 2, 0.7);
      f.scale.set(1, 1, 0.5);
      busto.add(f);
      break;
    }
    case 'fischietto': {
      const t = mesh(new THREE.TorusGeometry(0.25, 0.012, 4, 18), mat('#d8443a'), 0, 0, 0.02);
      t.rotation.x = Math.PI / 2;
      collo(t);
      const f = mesh(geo.cil(0.03, 0.03, 0.1, 8), mat('#c8c8d0', { rim: 0.6 }), 0, -0.6, 0.31);
      f.rotation.z = Math.PI / 2;
      testaVera.add(f);
      break;
    }

    // ======== corpo: sopra il busto, così segue la posa ========
    case 'maglione': case 'camicia': case 'felpa': case 'giacca': case 'giubbotto': case 'cerata': case 'camice': case 'giaccone': case 'canottiera': case 'vestitino': case 'tuta': {
      const lucida = ['giubbotto', 'cerata'].includes(k.forma);
      const m = lucida ? mat(k.colore, { rim: 0.6 }) : tinta;
      const largo = ['giacca', 'giubbotto', 'cerata', 'camice', 'giaccone'].includes(k.forma) ? 0.385 : 0.375;
      busto.add(mesh(geo.palla(largo, 20), m, 0, -0.01, 0));
      pancia.visible = false;
      if (k.forma === 'canottiera') {
        const st = mesh(new THREE.CircleGeometry(0.09, 5), secondo, 0, 0.03, 0.378);
        busto.add(piatto(st));
      } else if (k.forma !== 'vestitino') {
        const colletto = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), k.forma === 'camice' ? mat('#ffffff') : scuro, 0, 0.28, 0.02);
        colletto.rotation.x = Math.PI / 2;
        busto.add(colletto);
      }
      if (['camicia', 'giacca', 'camice', 'cerata', 'tuta'].includes(k.forma)) {
        // bottoni (o la cerniera) giù per il davanti
        for (const y of [0.16, 0.04, -0.08, -0.2]) busto.add(piatto(mesh(geo.palla(0.024, 6), k.forma === 'camice' ? mat('#c8c8d0') : k.forma === 'tuta' ? mat('#8a8a90') : oro, 0, y, 0.38 - Math.abs(y) * 0.12)));
      }
      if (k.forma === 'camicia' || k.forma === 'giacca' || k.forma === 'camice') {
        for (const s of [-1, 1]) {
          const r = mesh(geo.cono(0.07, 0.16, 3), k.forma === 'camicia' ? tinta : k.forma === 'camice' ? mat('#ffffff') : scuro, s * 0.09, 0.22, 0.3);
          r.rotation.set(0.5, 0, Math.PI + s * 0.5);
          busto.add(r);
        }
      }
      if (k.forma === 'camice') busto.add(mesh(geo.scatola(0.1, 0.08, 0.02), mat('#eeeeee'), 0.15, 0.08, 0.34), mesh(geo.cil(0.01, 0.01, 0.1, 4), mat('#3a5aa8'), 0.13, 0.13, 0.35));
      if (k.forma === 'giubbotto') {
        busto.add(mesh(geo.scatola(0.02, 0.5, 0.02), mat('#c8c8d0', { rim: 0.6 }), 0.03, 0, 0.375));
        for (const y of [0.1, -0.05, -0.18]) busto.add(piatto(mesh(geo.palla(0.018, 5), mat('#c8c8d0', { rim: 0.6 }), -0.18, y, 0.32)));
      }
      if (k.forma === 'felpa') {
        const cappuccio = mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 16, Math.PI), tinta, 0, 0.27, -0.12);
        cappuccio.rotation.x = -Math.PI / 2 - 0.4;
        busto.add(cappuccio, mesh(geo.scatola(0.26, 0.11, 0.03), scuro, 0, -0.14, 0.355));
        for (const s of [-1, 1]) busto.add(mesh(geo.cil(0.01, 0.01, 0.14, 4), secondo, s * 0.05, 0.16, 0.36));
      }
      if (k.forma === 'tuta') {
        busto.add(mesh(geo.cil(0.36, 0.36, 0.05, 20), mat('#5a3f2a'), 0, -0.12, 0));
        busto.add(mesh(geo.scatola(0.1, 0.09, 0.02), scuro, -0.14, 0.1, 0.34));
      }
      if (k.forma === 'vestitino') {
        const gonna = mesh(new THREE.CylinderGeometry(0.3, 0.46, 0.32, 20, 1, true), stoffa(k.colore, k.motivo, k.colore2, 3, THREE.DoubleSide), 0, -0.25, 0.02);
        busto.add(gonna);
        busto.add(anello(0.33, 0.035, secondo, -0.08, 1));
      }
      break;
    }
    case 'gilet': {
      // aperto davanti: si vede la pancia
      const gl = mesh(new THREE.SphereGeometry(0.356, 20, 14, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1), doppia(k), 0, -0.01, 0);
      busto.add(gl);
      for (const y of [0.08, -0.04, -0.16]) busto.add(piatto(mesh(geo.palla(0.025, 6), oro, 0.17, y, 0.3)));
      busto.add(mesh(geo.scatola(0.08, 0.05, 0.02), scuro, -0.2, -0.08, 0.28));
      break;
    }
    case 'salopette': case 'grembiule': {
      pancia.visible = false;
      busto.add(mesh(geo.palla(0.352, 18), mat('#f4ecd8', { rim: 0.2 }), 0, -0.01, 0.0)); // la maglietta sotto
      if (k.forma === 'salopette') {
        // la parte di sotto copre la pancia, la pettorina sale davanti, le bretelle passano sulle spalle
        const sotto = mesh(new THREE.SphereGeometry(0.372, 20, 12, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), tinta, 0, -0.01, 0);
        busto.add(sotto);
      }
      const pett = mesh(new THREE.SphereGeometry(k.forma === 'grembiule' ? 0.378 : 0.374, 16, 12, Math.PI / 2 - 0.62, 1.24, k.forma === 'grembiule' ? 0.55 : 0.75, k.forma === 'grembiule' ? 1.95 : 1.1), doppia(k), 0, -0.01, 0);
      busto.add(pett);
      for (const s of [-1, 1]) {
        const b = mesh(new THREE.TorusGeometry(0.33, 0.02, 4, 20, Math.PI * 0.7), k.forma === 'grembiule' ? scuro : unita, s * 0.12, 0.04, 0);
        b.rotation.set(0, Math.PI / 2, Math.PI * 0.2);
        busto.add(b);
        if (k.forma === 'salopette') busto.add(piatto(mesh(geo.palla(0.025, 6), oro, s * 0.11, 0.16, 0.34)));
      }
      busto.add(mesh(geo.scatola(0.14, 0.1, 0.02), mat(varia(k.colore, 0, k.colore === '#fbfbf6' ? -0.08 : 0.1), { rim: 0.2 }), 0, -0.06, 0.375));
      if (k.forma === 'grembiule') busto.add(anello(0.37, 0.018, scuro, -0.08, 1));
      break;
    }

    // ======== schiena ========
    case 'mantella': {
      const m = mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.46, 18, 1, true, Math.PI / 2 - 0.3, Math.PI + 0.6), doppia(k), 0, -0.64, -0.05);
      testaVera.add(m, mesh(geo.palla(0.045, 8), oro, 0, -0.42, 0.27));
      break;
    }
    case 'tracolla': case 'sacca': {
      const cinghia = mesh(new THREE.TorusGeometry(0.36, 0.02, 4, 24), scuro, 0, 0.02, 0);
      cinghia.rotation.set(0, Math.PI / 2, 0.75);
      busto.add(cinghia);
      const grande = k.forma === 'sacca';
      const borsa = mesh(geo.scatola(grande ? 0.3 : 0.2, grande ? 0.26 : 0.18, grande ? 0.14 : 0.09), tinta, 0.33, -0.2, 0.08);
      borsa.rotation.y = 0.4;
      busto.add(borsa);
      if (grande) {
        const lettera = mesh(geo.scatola(0.14, 0.1, 0.01), mat('#fbfbf6'), 0.33, -0.04, 0.1);
        lettera.rotation.y = 0.4;
        busto.add(lettera);
      } else busto.add(mesh(geo.palla(0.03, 6), secondo, 0.37, -0.18, 0.16));
      break;
    }
    case 'cestino': {
      const c = mesh(geo.cil(0.17, 0.14, 0.26, 12), mat('#ffffff', { map: texture(32, (cx, l) => { cx.fillStyle = '#b8925a'; cx.fillRect(0, 0, l, l); cx.strokeStyle = '#8a6a3a'; cx.lineWidth = 3; for (let i = 0; i < l; i += 8) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, l); cx.stroke(); cx.beginPath(); cx.moveTo(0, i); cx.lineTo(l, i); cx.stroke(); } }) }), 0, -0.62, -0.4);
      testaVera.add(c);
      for (const x of [-0.15, 0.15]) {
        const b = mesh(geo.scatola(0.04, 0.2, 0.03), mat('#7a5232'), x, -0.58, 0.37);
        b.rotation.x = -0.35;
        testaVera.add(b);
      }
      for (const [x, z] of [[-0.06, 0], [0.06, 0.03], [0, -0.05]]) testaVera.add(mesh(geo.palla(0.05, 6), unita, x, -0.48, -0.4 + z));
      break;
    }
    case 'zainetto': {
      const z = mesh(geo.scatola(0.34, 0.36, 0.16), tinta, 0, 0.02, -0.38);
      busto.add(z, mesh(geo.scatola(0.24, 0.14, 0.06), scuro, 0, -0.06, -0.48));
      const cap = mesh(geo.palla(0.17, 12), tinta, 0, 0.2, -0.38);
      cap.scale.set(1, 0.4, 0.5);
      busto.add(cap);
      for (const s of [-1, 1]) {
        const b = mesh(new THREE.TorusGeometry(0.3, 0.018, 4, 18, Math.PI), scuro, s * 0.13, 0.04, 0);
        b.rotation.set(0, Math.PI / 2, Math.PI / 2);
        busto.add(b);
      }
      break;
    }
    case 'marsupio': {
      busto.add(anello(0.355, 0.02, scuro, -0.18, 1));
      busto.add(mesh(geo.scatola(0.24, 0.12, 0.08), tinta, 0, -0.18, 0.35), mesh(geo.palla(0.02, 5), secondo, 0.08, -0.15, 0.4));
      break;
    }
  }
}

// ---------- occhiali tondi (dottori, bibliotecari, sarte...) ----------

export function mettiOcchiali(testa: THREE.Group, zTasso: boolean) {
  const z = zTasso ? 0.5 : 0.45;
  const m = mat('#6a4a2a', { rim: 0.3 });
  for (const s of [-1, 1]) {
    const o = mesh(new THREE.TorusGeometry(0.115, 0.015, 6, 20), m, s * 0.19, -0.02, z);
    o.rotation.y = s * 0.25;
    testa.add(o);
    const v = mesh(new THREE.CircleGeometry(0.11, 18), mat('#e8f4ff', { transparent: true, opacity: 0.25, rim: 0 }), s * 0.19, -0.02, z);
    v.rotation.y = s * 0.25;
    testa.add(piatto(v));
  }
  testa.add(mesh(geo.cil(0.01, 0.01, 0.13, 4), m, 0, 0.0, z + 0.02).rotateZ(Math.PI / 2));
}

// ---------- attrezzi in mano (attaccati alla zampa davanti) ----------

const legno = () => mat('#8a5a36');
const ferro = () => mat('#8a8a96', { rim: 0.6 });

/** L'attrezzo del mestiere, da tenere in mano: il manico va lungo la zampa, la punta verso il basso/avanti. */
export function creaAttrezzoInMano(id: string): THREE.Group {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D) => { g.add(o); return o; };
  switch (id) {
    case 'martello':
      add(mesh(geo.cil(0.02, 0.02, 0.32, 5), legno(), 0, -0.1, 0.1)).rotation.x = Math.PI / 2;
      add(mesh(geo.scatola(0.08, 0.08, 0.16), ferro(), 0, -0.1, 0.27)).rotation.x = Math.PI / 2;
      break;
    case 'mestolo': case 'frusta':
      add(mesh(geo.cil(0.015, 0.015, 0.32, 5), id === 'frusta' ? ferro() : legno(), 0, -0.1, 0.12)).rotation.x = Math.PI / 2;
      if (id === 'mestolo') add(mesh(calotta(0.07, 1.6), legno(), 0, -0.1, 0.3)).rotation.x = Math.PI;
      else { const f = add(mesh(geo.palla(0.07, 8), mat('#c8c8d0', { rim: 0.6 }), 0, -0.1, 0.3)); f.scale.set(0.8, 0.8, 1.5); }
      break;
    case 'pala': {
      add(mesh(geo.cil(0.015, 0.015, 0.6, 5), legno(), 0, -0.1, 0.25)).rotation.x = Math.PI / 2;
      add(mesh(geo.scatola(0.18, 0.02, 0.2), mat('#c4935e'), 0, -0.1, 0.6));
      add(mesh(geo.scatola(0.12, 0.05, 0.08), mat('#d89a50'), 0, -0.07, 0.6));
      break;
    }
    case 'cono':
      add(mesh(geo.cono(0.06, 0.16, 8), mat('#d8a060'), 0, -0.12, 0.08)).rotation.x = Math.PI;
      add(mesh(geo.palla(0.065, 8), mat('#f28aa8', { rim: 0.4 }), 0, -0.02, 0.08));
      break;
    case 'valigetta':
      add(mesh(geo.scatola(0.24, 0.16, 0.08), mat('#5a3f2a', { rim: 0.4 }), 0, -0.2, 0));
      add(piatto(mesh(geo.scatola(0.06, 0.06, 0.01), mat('#d8443a'), 0, -0.2, 0.045)));
      break;
    case 'lettera':
      add(mesh(geo.scatola(0.18, 0.12, 0.01), mat('#fbfbf6'), 0, -0.14, 0.08)).rotation.x = -0.4;
      add(piatto(mesh(geo.scatola(0.04, 0.04, 0.012), mat('#d8443a'), 0.05, -0.12, 0.09)));
      break;
    case 'vassoio':
      add(mesh(geo.cil(0.16, 0.16, 0.02, 14), mat('#c8c8d0', { rim: 0.6 }), 0, -0.06, 0.12));
      add(mesh(geo.cil(0.04, 0.035, 0.07, 8), mat('#ffffff'), 0.04, -0.01, 0.12));
      break;
    case 'sega':
      add(mesh(geo.scatola(0.04, 0.08, 0.1), legno(), 0, -0.12, 0.05));
      add(mesh(geo.scatola(0.01, 0.1, 0.34), ferro(), 0, -0.14, 0.26));
      break;
    case 'libro':
      add(mesh(geo.scatola(0.18, 0.04, 0.22), mat('#8a2a3a', { rim: 0.4 }), 0, -0.14, 0.1));
      add(mesh(geo.scatola(0.17, 0.035, 0.2), mat('#fbf4e0'), 0.01, -0.14, 0.1));
      break;
    case 'lente':
      add(mesh(geo.cil(0.015, 0.015, 0.14, 5), legno(), 0, -0.1, 0.06)).rotation.x = Math.PI / 2;
      add(mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 14), mat('#f2c230', { rim: 0.5 }), 0, -0.1, 0.19));
      break;
    case 'cannocchiale': case 'binocolo':
      if (id === 'binocolo') for (const s of [-1, 1]) add(mesh(geo.cil(0.035, 0.04, 0.12, 8), mat('#2e2a2e'), s * 0.045, -0.12, 0.08)).rotation.x = Math.PI / 2;
      else add(mesh(geo.cil(0.025, 0.045, 0.34, 8), mat('#c8a030', { rim: 0.6 }), 0, -0.12, 0.14)).rotation.x = Math.PI / 2;
      break;
    case 'chiave': {
      add(mesh(geo.scatola(0.03, 0.02, 0.26), ferro(), 0, -0.12, 0.1));
      const t = add(mesh(new THREE.TorusGeometry(0.04, 0.015, 4, 10, Math.PI * 1.5), ferro(), 0, -0.12, 0.25));
      t.rotation.x = Math.PI / 2;
      break;
    }
    case 'ascia':
      add(mesh(geo.cil(0.02, 0.02, 0.4, 5), legno(), 0, -0.1, 0.14)).rotation.x = Math.PI / 2;
      add(mesh(geo.scatola(0.02, 0.14, 0.1), ferro(), 0, -0.04, 0.32));
      break;
    case 'cesto': case 'secchio': case 'vasetto': case 'annaffiatoio': {
      const colore = { cesto: '#b8925a', secchio: '#8a8a96', vasetto: '#f2b440', annaffiatoio: '#4f9a5a' }[id];
      add(mesh(geo.cil(0.09, 0.07, 0.14, 10), mat(colore, { rim: 0.4 }), 0, -0.28, 0.02));
      if (id === 'annaffiatoio') add(mesh(geo.cil(0.012, 0.02, 0.18, 5), mat(colore), 0, -0.24, 0.14)).rotation.x = 1.0;
      if (id === 'vasetto') add(mesh(geo.cil(0.07, 0.07, 0.03, 10), mat('#fbfbf6'), 0, -0.2, 0.02));
      if (id === 'cesto') for (const [x, z] of [[-0.03, 0], [0.03, 0.02]]) add(mesh(geo.palla(0.04, 6), mat('#d8443a'), x, -0.2, 0.02 + z));
      if (id !== 'vasetto') { const m = add(mesh(new THREE.TorusGeometry(0.08, 0.01, 4, 10, Math.PI), mat('#5a3f2a'), 0, -0.21, 0.02)); m.rotation.y = Math.PI / 2; }
      break;
    }
    case 'pennello':
      add(mesh(geo.cil(0.012, 0.012, 0.26, 5), mat('#d8443a'), 0, -0.1, 0.1)).rotation.x = Math.PI / 2;
      add(mesh(geo.cono(0.03, 0.08, 6), mat('#3a5aa8'), 0, -0.1, 0.26)).rotation.x = Math.PI / 2;
      break;
    case 'canna': {
      const a = add(mesh(geo.cil(0.012, 0.022, 1.2, 5), legno(), 0, -0.05, 0.55));
      a.rotation.x = Math.PI / 2 - 0.5;
      add(mesh(geo.cil(0.04, 0.04, 0.05, 8), ferro(), 0, -0.12, 0.08)).rotation.z = Math.PI / 2;
      break;
    }
    case 'mela':
      add(mesh(geo.palla(0.07, 10), mat('#d8443a', { rim: 0.5 }), 0, -0.18, 0.06));
      break;
    case 'zappa':
      add(mesh(geo.cil(0.015, 0.015, 0.7, 5), legno(), 0, -0.1, 0.2)).rotation.x = Math.PI / 2;
      add(mesh(geo.scatola(0.14, 0.12, 0.02), ferro(), 0, -0.16, 0.55));
      break;
    case 'sacco':
      add(mesh(geo.palla(0.13, 10), mat('#e8d4ac'), 0, -0.28, 0.04)).scale.y = 1.2;
      break;
    case 'violino': {
      const c = add(mesh(geo.palla(0.1, 10), mat('#a0522d', { rim: 0.5 }), 0, -0.04, 0.12));
      c.scale.set(0.9, 0.35, 1.4);
      add(mesh(geo.scatola(0.03, 0.02, 0.22), mat('#2e2a2e'), 0, -0.03, 0.3));
      break;
    }
    case 'pergamena':
      add(mesh(geo.cil(0.035, 0.035, 0.22, 8), mat('#f4e4c0'), 0, -0.14, 0.06)).rotation.z = Math.PI / 2;
      break;
    case 'ago':
      add(mesh(geo.cil(0.006, 0.006, 0.14, 4), mat('#c8c8d0', { rim: 0.8 }), 0, -0.12, 0.08)).rotation.x = Math.PI / 2;
      add(mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 12, Math.PI), mat('#d8443a'), 0, -0.12, 0.18));
      break;
  }
  g.userData.attrezzo = id;
  return g;
}
