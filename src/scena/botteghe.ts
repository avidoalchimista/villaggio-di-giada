// Le botteghe dei mestieri: l'insegna con la scritta sopra la porta, il bancone col tendone a strisce
// (per chi vende qualcosa) e gli attrezzi del mestiere fuori dalla porta. Si aggiungono alla casa
// dell'animale (creaCasaAnimale in modelli.ts), che ha la forma della sua specie.
import * as THREE from 'three';
import { defMestiere, type DefMestiere } from '../lib/mestieri';
import { creaFiore, creaLanterna, creaPino, geo, mat, mesh, varia } from './modelli';
import { contorno, ombra, strisce, texture } from './ps1';

const legno = () => mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#c4935e'; c.fillRect(0, 0, l, l); c.fillStyle = '#a87a48'; for (let y = 0; y < l; y += 16) c.fillRect(0, y, l, 3); }) });
const scuro = () => mat('#7a5232');
const ferro = () => mat('#6a6a76', { rim: 0.6 });
const add = (g: THREE.Object3D, o: THREE.Object3D, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); g.add(o); return o; };

// ---------- insegna ----------

/** Tavola di legno con il nome della bottega scritto bello grande, e il simbolo del mestiere. */
export function creaInsegnaMestiere(mestiere: string): THREE.Group {
  const d = defMestiere(mestiere);
  const scritta = d?.insegna ?? mestiere.toUpperCase();
  const simbolo = d?.simbolo ?? '★';
  const colore = d?.colore ?? '#8a5a36';
  const g = new THREE.Group();
  const larga = Math.min(2.2, 1.0 + scritta.length * 0.075);
  const tex = texture(512, (c, l) => {
    const h = l / 4;
    c.fillStyle = '#fff6e0';
    c.fillRect(0, 0, l, l);
    c.fillStyle = colore;
    c.fillRect(0, 0, l, l * 0.06); c.fillRect(0, h - l * 0.06, l, l * 0.06);
    c.fillRect(0, 0, l * 0.03, h); c.fillRect(l - l * 0.03, 0, l * 0.03, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // il simbolo a sinistra, la scritta il più grande possibile
    c.font = `${h * 0.55}px sans-serif`;
    c.fillText(simbolo, l * 0.1, h * 0.54);
    let size = h * 0.56;
    c.font = `900 ${size}px 'Nunito Variable', 'Nunito', sans-serif`;
    while (c.measureText(scritta).width > l * 0.78 && size > 12) { size -= 2; c.font = `900 ${size}px 'Nunito Variable', 'Nunito', sans-serif`; }
    c.fillStyle = '#3b2616';
    c.fillText(scritta, l * 0.56, h * 0.54);
  });
  tex.repeat.set(1, 0.25);
  tex.offset.set(0, 0.75);
  const tavola = mesh(geo.scatola(larga, 0.5, 0.05), mat('#ffffff', { map: tex, rim: 0 }));
  g.add(tavola);
  // cornice e due catenelle
  g.add(mesh(geo.scatola(larga + 0.08, 0.05, 0.07), scuro(), 0, 0.275, 0), mesh(geo.scatola(larga + 0.08, 0.05, 0.07), scuro(), 0, -0.275, 0));
  for (const s of [-1, 1]) g.add(mesh(geo.cil(0.012, 0.012, 0.18, 4), mat('#3a3a40'), s * larga * 0.38, 0.37, 0));
  g.userData.insegna = scritta;
  g.userData.larghezza = larga;
  return g;
}

// ---------- bancone con tendone ----------

/** La bancarella davanti a casa per chi vende: bancone, tendone a strisce e un po' di merce. */
function creaBancone(d: DefMestiere): THREE.Group {
  const g = new THREE.Group();
  g.add(ombra(0.8));
  const l = legno();
  add(g, mesh(geo.scatola(1.2, 0.7, 0.5), l), 0, 0.35, 0);
  add(g, mesh(geo.scatola(1.3, 0.06, 0.6), mat(varia(d.colore, 0, 0.25))), 0, 0.73, 0);
  for (const x of [-0.6, 0.6]) add(g, mesh(geo.cil(0.035, 0.035, 1.5, 6), scuro()), x, 0.75, -0.25);
  const [a, b] = d.tenda!;
  const tenda = add(g, mesh(geo.scatola(1.45, 0.05, 0.85), mat('#ffffff', { map: texture(64, strisce(a, b, 8)) })), 0, 1.5, 0.05);
  tenda.rotation.x = 0.3;
  // la frangia a punte
  for (let i = 0; i < 8; i++) {
    const p = add(g, mesh(geo.cono(0.09, 0.14, 3), mat(i % 2 ? b : a)), -0.63 + i * 0.18, 1.32, 0.45);
    p.rotation.x = Math.PI;
  }
  // la merce sul bancone, nei colori del mestiere
  merce(d.id, g);
  return g;
}

function merce(id: string, g: THREE.Group) {
  const sopra = 0.8;
  const palline = (colori: string[], r = 0.07) => {
    for (let i = 0; i < 7; i++) add(g, mesh(geo.palla(r, 8), mat(colori[i % colori.length], { rim: 0.4 })), -0.45 + i * 0.15, sopra + r, (i % 2) * 0.1 - 0.05);
  };
  const vasetti = (colori: string[]) => {
    for (let i = 0; i < 6; i++) {
      add(g, mesh(geo.cil(0.06, 0.06, 0.13, 8), mat(colori[i % colori.length], { rim: 0.4 })), -0.45 + i * 0.18, sopra + 0.065, 0);
      add(g, mesh(geo.cil(0.065, 0.065, 0.03, 8), mat('#fbfbf6')), -0.45 + i * 0.18, sopra + 0.14, 0);
    }
  };
  switch (id) {
    case 'fornaio': for (let i = 0; i < 4; i++) { const p = add(g, mesh(geo.capsula(0.07, 0.2), mat('#d89a50', { rim: 0.4 })), -0.4 + i * 0.27, sopra + 0.07, 0); p.rotation.z = Math.PI / 2; } break;
    case 'pasticcere': for (const x of [-0.35, 0.05, 0.4]) { add(g, mesh(geo.cil(0.13, 0.13, 0.12, 14), mat('#f6d8e0')), x, sopra + 0.06, 0); add(g, mesh(geo.palla(0.03, 6), mat('#d8344a')), x, sopra + 0.15, 0); } break;
    case 'gelataio': palline(['#f28aa8', '#fff4d0', '#8a5a36', '#7ad0b0'], 0.08); break;
    case 'fruttivendolo': palline(['#d8443a', '#9ac83a', '#f08a30', '#f2c230']); break;
    case 'mercante': palline(['#c8893e', '#d8443a', '#e8d4ac']); break;
    case 'mesticheria': vasetti(['#d8443a', '#3a5aa8', '#f2c230', '#4f9a5a', '#8a5ac8', '#fbfbf6']); break;
    case 'apicoltore': vasetti(['#f2b440']); break;
    case 'lattaio': for (const x of [-0.35, 0.05, 0.4]) { const f = add(g, mesh(geo.cil(0.14, 0.14, 0.1, 14), mat('#f2d46a', { rim: 0.4 })), x, sopra + 0.05, 0); f.scale.z = 0.8; } break;
    case 'pescatore': for (let i = 0; i < 4; i++) { const p = add(g, mesh(geo.palla(0.08, 8), mat('#8ab8d8', { rim: 0.6 })), -0.4 + i * 0.27, sopra + 0.04, 0); p.scale.set(2, 0.6, 0.8); } break;
    case 'cuoco': case 'locandiere': for (const x of [-0.3, 0.3]) { add(g, mesh(geo.cil(0.12, 0.09, 0.08, 12), mat('#fbfbf6')), x, sopra + 0.04, 0); add(g, mesh(geo.cil(0.1, 0.1, 0.02, 12), mat('#e08a3a')), x, sopra + 0.08, 0); } break;
    case 'giardiniere': for (let i = 0; i < 4; i++) { add(g, mesh(geo.cil(0.07, 0.05, 0.1, 8), mat('#c8603a')), -0.4 + i * 0.27, sopra + 0.05, 0); const f = creaFiore(['#ff6f91', '#ffd166', '#b39ddb', '#ffffff'][i]); f.scale.setScalar(1.6); add(g, f, -0.4 + i * 0.27, sopra + 0.1, 0); } break;
    case 'sarto': for (let i = 0; i < 4; i++) { const r = add(g, mesh(geo.cil(0.08, 0.08, 0.35, 10), mat(['#d8443a', '#3a5aa8', '#f2c230', '#c05a90'][i])), -0.4 + i * 0.27, sopra + 0.08, 0); r.rotation.x = Math.PI / 2; } break;
    case 'calzolaio': for (const x of [-0.3, 0.2]) { add(g, mesh(geo.scatola(0.12, 0.2, 0.12), mat('#7a4a2a')), x, sopra + 0.1, 0); add(g, mesh(geo.scatola(0.12, 0.08, 0.24), mat('#7a4a2a')), x, sopra + 0.04, 0.06); } break;
    case 'orologiaio': for (const x of [-0.35, 0, 0.35]) { const o = add(g, mesh(geo.cil(0.1, 0.1, 0.04, 16), mat('#f2c230', { rim: 0.6 })), x, sopra + 0.12, 0); o.rotation.x = Math.PI / 2; } break;
    default: palline(['#e8d4ac', '#c8893e']);
  }
}

// ---------- gli attrezzi fuori ----------

function barile(g: THREE.Group, x: number, z: number, colore = '#a06a40') {
  add(g, mesh(geo.cil(0.26, 0.26, 0.6, 12), mat(colore)), x, 0.3, z);
  for (const y of [0.12, 0.48]) add(g, mesh(geo.cil(0.27, 0.27, 0.04, 12), ferro()), x, y, z);
}

export function creaMoto(colore = '#d8443a', conContorno = true): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-0.42, 0.42]) {
    const r = add(g, mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16), mat('#2e2a2e')), 0, 0.27, z);
    r.rotation.y = Math.PI / 2;
    add(g, mesh(geo.cil(0.06, 0.06, 0.1, 8), ferro()), 0, 0.27, z).rotation.z = Math.PI / 2;
  }
  add(g, mesh(geo.palla(0.24, 12), mat(colore, { rim: 0.6 })), 0, 0.55, 0.12).scale.set(0.8, 0.6, 1.3);
  add(g, mesh(geo.scatola(0.24, 0.08, 0.4), mat('#3a2a1a')), 0, 0.6, -0.2);
  add(g, mesh(geo.scatola(0.2, 0.18, 0.3), ferro()), 0, 0.38, 0);
  const manubrio = add(g, mesh(geo.cil(0.025, 0.025, 0.6, 6), ferro()), 0, 0.82, 0.38);
  manubrio.rotation.z = Math.PI / 2;
  add(g, mesh(geo.cil(0.025, 0.025, 0.5, 6), ferro()), 0, 0.58, 0.4).rotation.x = -0.3;
  add(g, mesh(geo.palla(0.07, 8), mat('#fff4c0', { emissive: '#ffe080', emissiveIntensity: 0.6 })), 0, 0.7, 0.5);
  g.userData.veicolo = 'moto';
  return conContorno ? contorno(g) : g;
}

export function creaBici(colore = '#3a5aa8', conContorno = true): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-0.38, 0.38]) {
    const r = add(g, mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 18), mat('#2e2a2e')), 0, 0.26, z);
    r.rotation.y = Math.PI / 2;
  }
  const telaio = mat(colore, { rim: 0.5 });
  add(g, mesh(geo.cil(0.02, 0.02, 0.6, 5), telaio), 0, 0.42, 0).rotation.x = Math.PI / 2;
  add(g, mesh(geo.cil(0.02, 0.02, 0.4, 5), telaio), 0, 0.42, -0.2).rotation.x = 0.4;
  add(g, mesh(geo.cil(0.02, 0.02, 0.45, 5), telaio), 0, 0.45, 0.32).rotation.x = -0.2;
  add(g, mesh(geo.scatola(0.12, 0.04, 0.18), mat('#3a2a1a')), 0, 0.6, -0.22);
  add(g, mesh(geo.cil(0.02, 0.02, 0.4, 5), ferro()), 0, 0.68, 0.36).rotation.z = Math.PI / 2;
  add(g, mesh(geo.scatola(0.26, 0.14, 0.2), mat('#b8925a')), 0, 0.55, 0.48);
  g.userData.veicolo = 'bici';
  return conContorno ? contorno(g) : g;
}

/** Un attrezzo (o una cosa del mestiere) da mettere fuori dalla porta. */
export function creaAttrezzo(id: string, d?: DefMestiere): THREE.Group {
  const g = new THREE.Group();
  const col = d?.colore ?? '#8a5a36';
  switch (id) {
    case 'forgia': {
      add(g, mesh(geo.scatola(0.8, 0.6, 0.6), mat('#8a7a6a')), 0, 0.3, 0);
      add(g, mesh(geo.cil(0.22, 0.22, 0.05, 12), mat('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: 1.0, rim: 0 })), 0, 0.62, 0);
      add(g, mesh(geo.cil(0.12, 0.14, 0.9, 8), mat('#6a5a4a')), 0.25, 1.05, -0.15);
      break;
    }
    case 'incudine':
      add(g, mesh(geo.cil(0.16, 0.2, 0.35, 8), scuro()), 0, 0.17, 0);
      add(g, mesh(geo.scatola(0.5, 0.14, 0.2), ferro()), 0, 0.42, 0);
      add(g, mesh(geo.cono(0.1, 0.2, 6), ferro()), 0.33, 0.42, 0).rotation.z = -Math.PI / 2;
      break;
    case 'ferri': for (let i = 0; i < 4; i++) { const f = add(g, mesh(geo.cil(0.02, 0.02, 0.9, 5), ferro()), -0.15 + i * 0.1, 0.45, 0); f.rotation.z = (i - 1.5) * 0.08; } add(g, mesh(geo.cil(0.2, 0.18, 0.3, 10), scuro()), 0, 0.15, 0); break;
    case 'moto': g.add(creaMoto(col, false)); g.rotation.y = 0.5; break;
    case 'bici': g.add(creaBici(col, false)); g.rotation.y = 0.5; break;
    case 'gomme': for (let i = 0; i < 3; i++) { const r = add(g, mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 16), mat('#2e2a2e')), 0, 0.08 + i * 0.16, 0); r.rotation.x = Math.PI / 2; } break;
    case 'tanica': add(g, mesh(geo.scatola(0.3, 0.4, 0.15), mat('#d8443a', { rim: 0.4 })), 0, 0.2, 0); add(g, mesh(geo.cil(0.04, 0.04, 0.1, 6), mat('#2e2a2e')), 0.08, 0.45, 0); break;
    case 'idrante':
      add(g, mesh(geo.cil(0.13, 0.15, 0.6, 10), mat('#d8443a', { rim: 0.5 })), 0, 0.3, 0);
      add(g, mesh(geo.palla(0.14, 10), mat('#d8443a', { rim: 0.5 })), 0, 0.62, 0);
      for (const s of [-1, 1]) add(g, mesh(geo.cil(0.06, 0.06, 0.12, 8), mat('#f2c230')), s * 0.17, 0.42, 0).rotation.z = Math.PI / 2;
      break;
    case 'scala': {
      for (const x of [-0.22, 0.22]) add(g, mesh(geo.scatola(0.06, 1.8, 0.06), legno()), x, 0.9, 0);
      for (let i = 0; i < 6; i++) add(g, mesh(geo.scatola(0.44, 0.05, 0.05), legno()), 0, 0.2 + i * 0.28, 0);
      g.rotation.x = -0.25;
      g.position.z = -0.2;
      break;
    }
    case 'secchio': add(g, mesh(geo.cil(0.16, 0.12, 0.3, 10), mat('#8a8a96', { rim: 0.6 })), 0, 0.15, 0); add(g, mesh(geo.cil(0.14, 0.14, 0.02, 10), mat('#7fc8f8')), 0, 0.27, 0); break;
    case 'legna':
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) {
        const t = add(g, mesh(geo.cil(0.11, 0.11, 0.7, 8), mat('#a06a40')), -0.33 + i * 0.22 + r * 0.11, 0.11 + r * 0.19, 0);
        t.rotation.x = Math.PI / 2;
        add(g, mesh(geo.cil(0.09, 0.09, 0.02, 8), mat('#e8c890')), t.position.x, t.position.y, 0.36).rotation.x = Math.PI / 2;
      }
      break;
    case 'ceppo': {
      add(g, mesh(geo.cil(0.28, 0.3, 0.4, 10), mat('#8a5a36')), 0, 0.2, 0);
      add(g, mesh(geo.cil(0.25, 0.25, 0.02, 10), mat('#e8c890')), 0, 0.41, 0);
      const ascia = new THREE.Group();
      add(ascia, mesh(geo.cil(0.025, 0.025, 0.6, 5), legno()), 0, 0.3, 0);
      add(ascia, mesh(geo.scatola(0.03, 0.16, 0.2), ferro()), 0, 0.05, 0.08);
      ascia.position.set(0.05, 0.4, 0);
      ascia.rotation.z = 0.3;
      g.add(ascia);
      break;
    }
    case 'carriola': {
      add(g, mesh(geo.scatola(0.5, 0.25, 0.7), mat(col)), 0, 0.4, 0);
      const r = add(g, mesh(new THREE.TorusGeometry(0.14, 0.05, 6, 12), mat('#2e2a2e')), 0, 0.17, 0.42);
      r.rotation.y = Math.PI / 2;
      for (const x of [-0.18, 0.18]) add(g, mesh(geo.cil(0.025, 0.025, 0.9, 5), legno()), x, 0.4, -0.3).rotation.x = Math.PI / 2 - 0.3;
      add(g, mesh(geo.palla(0.2, 8), mat('#a06a40')), 0, 0.52, 0).scale.y = 0.4;
      break;
    }
    case 'cartello-bosco': {
      add(g, mesh(geo.cil(0.05, 0.05, 1.1, 6), legno()), 0, 0.55, 0);
      const t = add(g, mesh(geo.scatola(0.6, 0.4, 0.04), mat('#3f7a4a')), 0, 1.05, 0.03);
      add(t, mesh(geo.cono(0.12, 0.25, 6), mat('#fbfbf6')), 0, 0, 0.03).scale.z = 0.1;
      break;
    }
    case 'lanterna': { const l = creaLanterna(); l.gruppo.traverse((o) => (o.userData.senzaContorno = true)); g.add(l.gruppo); break; }
    case 'pino': { const p = creaPino(0.55, false); g.add(p); break; }
    case 'tenda-campo': {
      const t = add(g, mesh(geo.cono(0.6, 0.8, 4), mat('#c8a030', { rim: 0.3 })), 0, 0.4, 0);
      t.rotation.y = Math.PI / 4;
      t.scale.z = 1.4;
      add(g, mesh(geo.scatola(0.25, 0.4, 0.02), mat('#5a3f20')), 0, 0.2, 0.5);
      break;
    }
    case 'mappa': {
      add(g, mesh(geo.cil(0.04, 0.04, 1.0, 5), legno()), 0, 0.5, 0);
      const m = add(g, mesh(geo.scatola(0.6, 0.45, 0.02), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#f4e4c0'; c.fillRect(0, 0, l, l); c.strokeStyle = '#8a5a36'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(8, 50); c.bezierCurveTo(20, 10, 40, 60, 56, 14); c.stroke(); c.fillStyle = '#d8443a'; c.font = '16px sans-serif'; c.fillText('✕', 48, 20); c.fillStyle = '#4f9a5a'; c.beginPath(); c.arc(16, 20, 6, 0, 7); c.fill(); }), rim: 0 })), 0, 0.95, 0.04);
      m.rotation.x = -0.2;
      break;
    }
    case 'zaino': add(g, mesh(geo.scatola(0.35, 0.45, 0.22), mat('#4f9a5a')), 0, 0.22, 0); add(g, mesh(geo.cil(0.08, 0.08, 0.4, 8), mat('#d8443a')), 0, 0.5, 0).rotation.z = Math.PI / 2; break;
    case 'pentolone':
      for (let i = 0; i < 3; i++) add(g, mesh(geo.cil(0.03, 0.03, 0.9, 5), scuro()), Math.cos(i * 2.1) * 0.3, 0.45, Math.sin(i * 2.1) * 0.3).rotation.set(Math.sin(i * 2.1) * 0.3, 0, -Math.cos(i * 2.1) * 0.3);
      add(g, mesh(geo.palla(0.3, 12), mat('#3a3a40', { rim: 0.5 })), 0, 0.45, 0).scale.y = 0.8;
      add(g, mesh(geo.cil(0.26, 0.26, 0.02, 12), mat('#e08a3a')), 0, 0.62, 0);
      add(g, mesh(geo.cil(0.18, 0.2, 0.15, 8), mat('#ff7a2a', { emissive: '#ff5a10', emissiveIntensity: 0.8 })), 0, 0.08, 0);
      break;
    case 'tavolino': {
      add(g, mesh(geo.cil(0.38, 0.38, 0.05, 14), mat('#ffffff', { map: texture(32, (c, l) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#fbfbf6' : col; c.fillRect(x * l / 4, y * l / 4, l / 4, l / 4); } }) })), 0, 0.55, 0);
      add(g, mesh(geo.cil(0.04, 0.06, 0.55, 6), scuro()), 0, 0.27, 0);
      for (const s of [-1, 1]) add(g, mesh(geo.cil(0.17, 0.17, 0.05, 10), legno()), s * 0.55, 0.32, 0).add(mesh(geo.cil(0.03, 0.03, 0.32, 5), scuro(), 0, -0.16, 0));
      break;
    }
    case 'botte': barile(g, 0, 0); break;
    case 'forno': {
      add(g, mesh(geo.scatola(0.9, 0.4, 0.8), mat('#c8b8a0')), 0, 0.2, 0);
      add(g, mesh(geo.palla(0.42, 14), mat('#d87a4a')), 0, 0.4, 0).scale.y = 0.85;
      add(g, mesh(geo.cil(0.14, 0.14, 0.05, 12), mat('#ff8a3a', { emissive: '#ff6010', emissiveIntensity: 0.9, rim: 0 })), 0, 0.5, 0.38).rotation.x = Math.PI / 2;
      add(g, mesh(geo.cil(0.07, 0.08, 0.4, 8), mat('#8a7a6a')), 0.15, 0.95, -0.1);
      break;
    }
    case 'sacchi': for (const [x, z] of [[-0.2, 0], [0.2, 0.05], [0, -0.2]]) { add(g, mesh(geo.palla(0.22, 10), mat('#e8d4ac')), x, 0.22, z).scale.y = 1.15; add(g, mesh(geo.cil(0.05, 0.07, 0.08, 6), mat('#c8b08a')), x, 0.48, z); } break;
    case 'pane': {
      add(g, mesh(geo.cil(0.3, 0.25, 0.25, 12), mat('#b8925a')), 0, 0.5, 0);
      add(g, mesh(geo.cil(0.04, 0.04, 0.4, 5), scuro()), 0, 0.2, 0);
      for (let i = 0; i < 3; i++) add(g, mesh(geo.capsula(0.06, 0.4), mat('#d89a50', { rim: 0.4 })), -0.08 + i * 0.08, 0.7, 0).rotation.z = (i - 1) * 0.25;
      break;
    }
    case 'torta': {
      add(g, mesh(geo.cil(0.04, 0.04, 0.7, 6), mat('#fbfbf6')), 0, 0.35, 0);
      add(g, mesh(geo.cil(0.3, 0.3, 0.03, 14), mat('#fbfbf6')), 0, 0.7, 0);
      for (let i = 0; i < 3; i++) add(g, mesh(geo.cil(0.24 - i * 0.06, 0.24 - i * 0.06, 0.14, 14), mat(['#f6d8e0', '#fff4d0', '#f28aa8'][i], { rim: 0.3 })), 0, 0.78 + i * 0.14, 0);
      add(g, mesh(geo.palla(0.05, 8), mat('#d8344a', { rim: 0.5 })), 0, 1.18, 0);
      break;
    }
    case 'ombrellone': {
      add(g, mesh(geo.cil(0.03, 0.03, 1.8, 5), mat('#fbfbf6')), 0, 0.9, 0);
      const [a, b] = d?.tenda ?? ['#d8443a', '#ffffff'];
      add(g, mesh(geo.cono(0.75, 0.35, 8), mat('#ffffff', { map: texture(64, strisce(a, b, 8)), rim: 0.3 })), 0, 1.75, 0);
      add(g, mesh(geo.cil(0.2, 0.25, 0.1, 10), mat('#8a8a96')), 0, 0.05, 0);
      break;
    }
    case 'carretto-gelati': {
      add(g, mesh(geo.scatola(0.9, 0.55, 0.5), mat('#fbfbf6', { rim: 0.4 })), 0, 0.55, 0);
      add(g, mesh(geo.scatola(0.92, 0.12, 0.52), mat('#7fb8e8')), 0, 0.42, 0);
      for (const x of [-0.25, 0, 0.25]) add(g, mesh(geo.palla(0.09, 8), mat(['#f28aa8', '#fff4d0', '#8a5a36'][Math.round(x * 4 + 1)])), x, 0.88, 0);
      for (const x of [-0.35, 0.35]) { const r = add(g, mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 12), mat('#2e2a2e')), x, 0.17, 0.27); r.rotation.y = 0; }
      add(g, mesh(geo.cil(0.02, 0.02, 0.6, 5), mat('#8a8a96')), 0.5, 0.75, 0).rotation.z = 0.6;
      break;
    }
    case 'croce': {
      add(g, mesh(geo.cil(0.04, 0.04, 1.0, 5), legno()), 0, 0.5, 0);
      add(g, mesh(geo.scatola(0.5, 0.5, 0.04), mat('#fbfbf6')), 0, 1.1, 0.03);
      add(g, mesh(geo.scatola(0.32, 0.1, 0.05), mat('#3f9a6a')), 0, 1.1, 0.05);
      add(g, mesh(geo.scatola(0.1, 0.32, 0.05), mat('#3f9a6a')), 0, 1.1, 0.05);
      break;
    }
    case 'erbe': {
      for (const x of [-0.4, 0.4]) add(g, mesh(geo.cil(0.03, 0.03, 1.0, 5), legno()), x, 0.5, 0);
      add(g, mesh(geo.cil(0.02, 0.02, 0.9, 5), legno()), 0, 0.95, 0).rotation.z = Math.PI / 2;
      for (let i = 0; i < 5; i++) add(g, mesh(geo.cono(0.06, 0.25, 5), mat(['#6aa84a', '#8ac06a', '#b39ddb'][i % 3])), -0.3 + i * 0.15, 0.8, 0).rotation.x = Math.PI;
      break;
    }
    case 'panca': case 'banchetti': {
      const n = id === 'banchetti' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        add(g, mesh(geo.scatola(0.9, 0.06, 0.28), legno()), 0, 0.35, k * 0.45);
        for (const x of [-0.35, 0.35]) add(g, mesh(geo.scatola(0.06, 0.35, 0.22), scuro()), x, 0.17, k * 0.45);
      }
      break;
    }
    case 'buca-lettere':
      add(g, mesh(geo.cil(0.04, 0.04, 0.8, 5), legno()), 0, 0.4, 0);
      add(g, mesh(geo.scatola(0.35, 0.3, 0.45), mat('#d8443a', { rim: 0.5 })), 0, 0.95, 0);
      add(g, mesh(geo.cil(0.175, 0.175, 0.45, 10, ), mat('#d8443a', { rim: 0.5 })), 0, 1.1, 0).rotation.x = Math.PI / 2;
      add(g, mesh(geo.scatola(0.03, 0.2, 0.05), mat('#f2c230')), 0.2, 1.2, 0.1);
      break;
    case 'pacchi': for (const [x, y, s] of [[0, 0.15, 0.3], [0.05, 0.4, 0.22], [-0.3, 0.1, 0.2]] as const) { add(g, mesh(geo.scatola(s, s, s), mat('#c8a06a')), x, y, 0); add(g, mesh(geo.scatola(s + 0.01, 0.03, s + 0.01), mat('#d8443a')), x, y, 0); } break;
    case 'assi': for (let i = 0; i < 5; i++) add(g, mesh(geo.scatola(1.1, 0.06, 0.22), legno()), 0, 0.04 + i * 0.07, (i % 2) * 0.04); break;
    case 'sedia': {
      add(g, mesh(geo.scatola(0.4, 0.05, 0.4), legno()), 0, 0.4, 0);
      for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) add(g, mesh(geo.scatola(0.05, 0.4, 0.05), scuro()), x, 0.2, z);
      add(g, mesh(geo.scatola(0.4, 0.45, 0.05), legno()), 0, 0.65, -0.18);
      break;
    }
    case 'cavalletto-sega': {
      for (const s of [-1, 1]) { const l = add(g, mesh(geo.scatola(0.05, 0.6, 0.05), scuro()), s * 0.3, 0.28, 0); l.rotation.z = s * 0.2; }
      add(g, mesh(geo.scatola(0.9, 0.08, 0.1), legno()), 0, 0.55, 0);
      add(g, mesh(geo.cil(0.1, 0.1, 0.8, 8), mat('#a06a40')), 0, 0.68, 0).rotation.z = Math.PI / 2;
      break;
    }
    case 'libri': {
      const colori = ['#8a2a3a', '#3a5aa8', '#4f9a5a', '#c8a030', '#8a5ac8'];
      for (let i = 0; i < 6; i++) add(g, mesh(geo.scatola(0.4 - (i % 3) * 0.04, 0.08, 0.3), mat(colori[i % colori.length])), (i % 2) * 0.04, 0.04 + i * 0.08, 0).rotation.y = (i % 3) * 0.15;
      break;
    }
    case 'orologio': {
      add(g, mesh(geo.cil(0.05, 0.05, 1.5, 6), mat('#3a3a40')), 0, 0.75, 0);
      const q = add(g, mesh(geo.cil(0.3, 0.3, 0.08, 18), mat('#3a3a40')), 0, 1.6, 0);
      q.rotation.x = Math.PI / 2;
      const f = add(g, mesh(new THREE.CircleGeometry(0.26, 18), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#fff8e7'; c.fillRect(0, 0, l, l); c.fillStyle = '#3b2616'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillRect(l / 2 + Math.cos(a) * l * 0.4 - 1, l / 2 + Math.sin(a) * l * 0.4 - 1, 3, 3); } c.lineWidth = 3; c.strokeStyle = '#3b2616'; c.beginPath(); c.moveTo(l / 2, l / 2); c.lineTo(l / 2, l * 0.2); c.moveTo(l / 2, l / 2); c.lineTo(l * 0.7, l / 2); c.stroke(); }), rim: 0 })), 0, 1.6, 0.045);
      f.userData.senzaContorno = true;
      break;
    }
    case 'ingranaggi': for (const [x, y, r] of [[0, 0.35, 0.3], [0.38, 0.22, 0.18], [-0.32, 0.18, 0.16]] as const) {
      const ing = add(g, mesh(geo.cil(r, r, 0.08, 10), mat('#b08040', { rim: 0.6 })), x, y, 0);
      ing.rotation.x = Math.PI / 2;
      for (let i = 0; i < 8; i++) add(ing, mesh(geo.scatola(0.07, 0.08, 0.07), mat('#b08040')), Math.cos(i * 0.785) * r, 0, Math.sin(i * 0.785) * r);
    } break;
    case 'telescopio': {
      for (let i = 0; i < 3; i++) { const l = add(g, mesh(geo.cil(0.025, 0.025, 1.0, 5), legno()), Math.cos(i * 2.1) * 0.2, 0.45, Math.sin(i * 2.1) * 0.2); l.rotation.set(Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25); }
      const t = add(g, mesh(geo.cil(0.07, 0.11, 1.0, 10), mat('#c8a030', { rim: 0.6 })), 0, 1.15, 0.1);
      t.rotation.x = -0.9;
      break;
    }
    case 'mappamondo': {
      add(g, mesh(geo.cil(0.15, 0.2, 0.08, 10), scuro()), 0, 0.04, 0);
      add(g, mesh(geo.cil(0.02, 0.02, 0.4, 5), scuro()), 0, 0.25, 0);
      add(g, mesh(geo.palla(0.25, 16), mat('#ffffff', { map: texture(64, macchieMondo), rim: 0.4 })), 0, 0.6, 0);
      break;
    }
    case 'girandola': {
      add(g, mesh(geo.cil(0.03, 0.03, 1.4, 5), legno()), 0, 0.7, 0);
      for (let i = 0; i < 4; i++) { const p = add(g, mesh(geo.cono(0.15, 0.3, 3), mat(['#d8443a', '#f2c230', '#3a5aa8', '#4f9a5a'][i])), Math.cos(i * 1.57) * 0.15, 1.4 + Math.sin(i * 1.57) * 0.15, 0.05); p.rotation.z = i * 1.57; p.scale.z = 0.1; }
      g.userData.gira = true;
      break;
    }
    case 'cassa': add(g, mesh(geo.scatola(0.55, 0.45, 0.45), legno()), 0, 0.22, 0); add(g, mesh(geo.scatola(0.4, 0.3, 0.02), mat('#3b2616')), 0, 0.25, 0.235).add(mesh(geo.palla(0.05, 6), mat('#f2c230'), 0, 0, 0.02)); break;
    case 'lavagna': {
      for (const s of [-1, 1]) { const l = add(g, mesh(geo.scatola(0.05, 1.2, 0.05), legno()), s * 0.45, 0.6, 0); l.rotation.x = -0.1; }
      const t = add(g, mesh(geo.scatola(0.85, 0.6, 0.03), mat('#ffffff', { map: texture(128, (c, l) => { c.fillStyle = '#2f4a3a'; c.fillRect(0, 0, l, l); c.fillStyle = '#ffffff'; c.font = `bold ${l * 0.3}px sans-serif`; c.textAlign = 'center'; c.fillText('A B C', l / 2, l * 0.45); c.font = `${l * 0.22}px sans-serif`; c.fillText('1+1=2', l / 2, l * 0.8); }), rim: 0 })), 0, 0.85, 0.03);
      t.rotation.x = -0.1;
      break;
    }
    case 'campanella': {
      for (const s of [-1, 1]) add(g, mesh(geo.cil(0.04, 0.04, 1.4, 5), legno()), s * 0.3, 0.7, 0);
      add(g, mesh(geo.scatola(0.7, 0.08, 0.08), legno()), 0, 1.4, 0);
      add(g, mesh(geo.cono(0.18, 0.28, 12), mat('#f2c230', { rim: 0.7 })), 0, 1.2, 0);
      break;
    }
    case 'mattoni': for (let r = 0; r < 4; r++) for (let i = 0; i < 3; i++) add(g, mesh(geo.scatola(0.26, 0.12, 0.13), mat('#c8603a')), -0.28 + i * 0.28 + (r % 2) * 0.13, 0.06 + r * 0.13, 0); break;
    case 'bancone': g.add(creaBancone(d ?? defMestiere('mercante')!)); break;
    case 'cassette-frutta': for (const [x, c] of [[-0.3, '#d8443a'], [0.3, '#9ac83a']] as const) {
      add(g, mesh(geo.scatola(0.5, 0.22, 0.35), legno()), x, 0.11, 0);
      for (let i = 0; i < 4; i++) add(g, mesh(geo.palla(0.08, 8), mat(c, { rim: 0.4 })), x - 0.12 + (i % 2) * 0.24, 0.25, (i < 2 ? -0.08 : 0.08));
    } break;
    case 'barattoli': {
      const colori = ['#d8443a', '#3a5aa8', '#f2c230', '#4f9a5a', '#8a5ac8'];
      for (let i = 0; i < 5; i++) {
        const x = -0.4 + (i % 3) * 0.3, y = i < 3 ? 0 : 0.3, z = 0;
        add(g, mesh(geo.cil(0.13, 0.13, 0.28, 10), mat('#c8c8d0', { rim: 0.5 })), x + (i >= 3 ? 0.15 : 0), 0.14 + y, z);
        add(g, mesh(geo.cil(0.132, 0.132, 0.12, 10), mat(colori[i])), x + (i >= 3 ? 0.15 : 0), 0.16 + y, z);
      }
      break;
    }
    case 'scope': for (let i = 0; i < 3; i++) { const s = new THREE.Group(); add(s, mesh(geo.cil(0.02, 0.02, 1.1, 5), legno()), 0, 0.75, 0); add(s, mesh(geo.cono(0.14, 0.32, 8), mat('#d8b860')), 0, 0.16, 0); s.position.set(-0.2 + i * 0.2, 0, 0); s.rotation.z = (i - 1) * 0.12; g.add(s); } break;
    case 'zucche': for (const [x, z, r] of [[0, 0, 0.25], [0.35, 0.1, 0.18], [-0.3, 0.12, 0.16]] as const) { add(g, mesh(geo.palla(r, 12), mat('#f08a30', { rim: 0.4 })), x, r * 0.75, z).scale.y = 0.75; add(g, mesh(geo.cil(0.02, 0.03, 0.08, 5), mat('#5e7a2e')), x, r * 1.5, z); } break;
    case 'bilancia': {
      add(g, mesh(geo.cil(0.15, 0.2, 0.08, 10), mat('#b08040', { rim: 0.6 })), 0, 0.04, 0);
      add(g, mesh(geo.cil(0.025, 0.025, 0.7, 5), mat('#b08040')), 0, 0.4, 0);
      add(g, mesh(geo.scatola(0.8, 0.03, 0.03), mat('#b08040')), 0, 0.75, 0);
      for (const s of [-1, 1]) add(g, mesh(geo.cil(0.14, 0.1, 0.05, 10), mat('#b08040', { rim: 0.6 })), s * 0.38, 0.55, 0);
      break;
    }
    case 'stivalone': {
      add(g, mesh(geo.cil(0.04, 0.04, 1.0, 5), legno()), 0, 0.5, 0);
      add(g, mesh(geo.scatola(0.26, 0.55, 0.24), mat('#7a4a2a', { rim: 0.5 })), 0, 1.3, 0);
      add(g, mesh(geo.scatola(0.26, 0.2, 0.45), mat('#7a4a2a', { rim: 0.5 })), 0, 1.0, 0.1);
      add(g, mesh(geo.scatola(0.28, 0.06, 0.47), mat('#3a2a1a')), 0, 0.88, 0.1);
      break;
    }
    case 'scarpe': for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { add(g, mesh(geo.palla(0.09, 8), mat(['#d8443a', '#3a5aa8', '#7a4a2a'][i], { rim: 0.4 })), s * 0.07 + (i - 1) * 0.3, 0.05, 0).scale.set(0.7, 0.6, 1.4); } break;
    case 'sgabello': add(g, mesh(geo.cil(0.2, 0.2, 0.06, 10), legno()), 0, 0.45, 0); for (let i = 0; i < 3; i++) add(g, mesh(geo.cil(0.025, 0.025, 0.45, 5), scuro()), Math.cos(i * 2.1) * 0.14, 0.22, Math.sin(i * 2.1) * 0.14); break;
    case 'bandiera': {
      add(g, mesh(geo.cil(0.03, 0.03, 2.2, 6), mat('#c8c8d0', { rim: 0.6 })), 0, 1.1, 0);
      const b = add(g, mesh(geo.scatola(0.7, 0.45, 0.02), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#3f9a4a'; c.fillRect(0, 0, l / 3, l); c.fillStyle = '#ffffff'; c.fillRect(l / 3, 0, l / 3, l); c.fillStyle = '#d8443a'; c.fillRect((2 * l) / 3, 0, l / 3, l); }), rim: 0 })), 0.36, 1.95, 0);
      b.userData.bandiera = true;
      break;
    }
    case 'vasi-fiori': for (let i = 0; i < 3; i++) { add(g, mesh(geo.cil(0.14, 0.1, 0.22, 10), mat('#c8603a')), -0.35 + i * 0.35, 0.11, (i % 2) * 0.15); const f = creaFiore(['#ff6f91', '#ffd166', '#b39ddb'][i]); f.scale.setScalar(2.6); add(g, f, -0.35 + i * 0.35, 0.22, (i % 2) * 0.15); } break;
    case 'annaffiatoio': add(g, mesh(geo.cil(0.14, 0.16, 0.28, 10), mat('#4f9a5a', { rim: 0.5 })), 0, 0.14, 0); add(g, mesh(geo.cil(0.02, 0.035, 0.35, 6), mat('#4f9a5a')), 0.18, 0.25, 0).rotation.z = -0.9; break;
    case 'rastrello': { const r = add(g, mesh(geo.cil(0.02, 0.02, 1.3, 5), legno()), 0, 0.65, 0); r.rotation.z = 0.15; add(g, mesh(geo.scatola(0.4, 0.05, 0.05), ferro()), -0.1, 1.28, 0); for (let i = 0; i < 6; i++) add(g, mesh(geo.scatola(0.02, 0.1, 0.02), ferro()), -0.28 + i * 0.07, 1.22, 0); break; }
    case 'rete': {
      for (const x of [-0.5, 0.5]) add(g, mesh(geo.cil(0.04, 0.04, 1.3, 5), legno()), x, 0.65, 0);
      const r = add(g, mesh(geo.scatola(0.95, 0.9, 0.01), mat('#ffffff', { map: texture(64, (c, l) => { c.clearRect(0, 0, l, l); c.strokeStyle = '#5a6a7a'; c.lineWidth = 2; for (let i = 0; i <= l; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, l); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(l, i); c.stroke(); } }), transparent: true, side: THREE.DoubleSide, rim: 0 })), 0, 0.75, 0);
      r.userData.senzaContorno = true;
      for (let i = 0; i < 4; i++) add(g, mesh(geo.palla(0.05, 6), mat('#f2c230')), -0.35 + i * 0.23, 1.2, 0.02);
      break;
    }
    case 'barchetta': {
      const scafo = add(g, mesh(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#3f86c8', { side: THREE.DoubleSide, rim: 0.4 })), 0, 0.35, 0);
      scafo.scale.set(0.6, 0.6, 1.4);
      add(g, mesh(geo.scatola(0.55, 0.04, 0.12), legno()), 0, 0.32, 0);
      add(g, mesh(geo.cil(0.31, 0.31, 0.04, 14), mat('#fbfbf6')), 0, 0.35, 0).scale.set(1, 1, 2.25);
      g.rotation.y = 0.4;
      break;
    }
    case 'remi': for (const s of [-1, 1]) { const r = new THREE.Group(); add(r, mesh(geo.cil(0.02, 0.02, 1.2, 5), legno()), 0, 0.6, 0); add(r, mesh(geo.scatola(0.14, 0.3, 0.02), legno()), 0, 1.2, 0); r.rotation.z = s * 0.2; r.position.x = s * 0.1; g.add(r); } break;
    case 'alveare': {
      add(g, mesh(geo.cil(0.04, 0.04, 0.4, 5), legno()), 0, 0.2, 0);
      for (let i = 0; i < 4; i++) add(g, mesh(geo.cil(0.26 - i * 0.04, 0.3 - i * 0.04, 0.16, 12), mat('#e8b440', { rim: 0.4 })), 0, 0.48 + i * 0.15, 0);
      add(g, mesh(geo.cil(0.05, 0.05, 0.05, 8), mat('#3a2a1a')), 0, 0.5, 0.27).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) add(g, mesh(geo.palla(0.03, 5), mat('#2e2a2e')), Math.cos(i * 2) * 0.4, 0.8 + i * 0.1, Math.sin(i * 2) * 0.4).userData.ape = true;
      break;
    }
    case 'vasetti': for (let i = 0; i < 5; i++) { add(g, mesh(geo.cil(0.08, 0.08, 0.16, 8), mat('#f2b440', { rim: 0.5 })), -0.3 + (i % 3) * 0.2 + (i >= 3 ? 0.1 : 0), 0.08 + (i >= 3 ? 0.17 : 0), 0); } add(g, mesh(geo.scatola(0.7, 0.04, 0.3), legno()), 0, 0.165, 0); break;
    case 'spaventapasseri': {
      add(g, mesh(geo.cil(0.04, 0.04, 1.6, 5), legno()), 0, 0.8, 0);
      add(g, mesh(geo.cil(0.03, 0.03, 1.0, 5), legno()), 0, 1.2, 0).rotation.z = Math.PI / 2;
      add(g, mesh(geo.palla(0.2, 10), mat('#e8d4ac')), 0, 1.6, 0);
      add(g, mesh(geo.cil(0.35, 0.35, 0.03, 14), mat('#e8c870')), 0, 1.75, 0);
      add(g, mesh(geo.cil(0.17, 0.2, 0.2, 10), mat('#e8c870')), 0, 1.85, 0);
      add(g, mesh(geo.scatola(0.5, 0.5, 0.22), mat('#ffffff', { map: texture(32, (c, l) => { c.fillStyle = '#d8443a'; c.fillRect(0, 0, l, l); c.fillStyle = '#2e2a2e'; for (let i = 0; i < l; i += 8) { c.fillRect(i, 0, 2, l); c.fillRect(0, i, l, 2); } }) })), 0, 1.15, 0);
      for (const s of [-1, 1]) add(g, mesh(geo.palla(0.025, 5), mat('#2e2a2e')), s * 0.07, 1.63, 0.18);
      break;
    }
    case 'macina': add(g, mesh(geo.cil(0.45, 0.45, 0.2, 16), mat('#a8a49c')), 0, 0.1, 0); add(g, mesh(geo.cil(0.4, 0.4, 0.18, 16), mat('#bab6ae')), 0, 0.3, 0); add(g, mesh(geo.cil(0.04, 0.04, 0.6, 5), legno()), 0.35, 0.5, 0).rotation.z = 1.2; break;
    case 'covone': for (let i = 0; i < 3; i++) { add(g, mesh(geo.cono(0.22, 0.8, 10), mat('#e8c060', { rim: 0.4 })), -0.3 + i * 0.3, 0.4, (i % 2) * 0.15).rotation.x = Math.PI; add(g, mesh(geo.cil(0.1, 0.1, 0.06, 8), mat('#c8a040')), -0.3 + i * 0.3, 0.4, (i % 2) * 0.15); } break;
    case 'bidoni': for (const x of [-0.2, 0.2]) { add(g, mesh(geo.cil(0.15, 0.17, 0.5, 12), mat('#c8c8d0', { rim: 0.6 })), x, 0.25, 0); add(g, mesh(geo.cil(0.09, 0.15, 0.12, 12), mat('#c8c8d0', { rim: 0.6 })), x, 0.56, 0); add(g, mesh(geo.cil(0.1, 0.1, 0.05, 12), mat('#7fb8e8')), x, 0.64, 0); } break;
    case 'formaggi': for (let i = 0; i < 3; i++) add(g, mesh(geo.cil(0.25 - i * 0.03, 0.25 - i * 0.03, 0.16, 16), mat('#f2d46a', { rim: 0.4 })), 0, 0.08 + i * 0.17, 0); break;
    case 'tamburo': add(g, mesh(geo.cil(0.3, 0.3, 0.35, 16), mat('#d8443a', { rim: 0.4 })), 0, 0.18, 0); add(g, mesh(geo.cil(0.31, 0.31, 0.03, 16), mat('#fbfbf6')), 0, 0.36, 0); for (let i = 0; i < 2; i++) add(g, mesh(geo.cil(0.015, 0.015, 0.35, 5), legno()), -0.1 + i * 0.2, 0.42, 0.1).rotation.x = 1.2; break;
    case 'leggio': add(g, mesh(geo.cil(0.025, 0.025, 1.0, 5), mat('#2e2a2e')), 0, 0.5, 0); { const p = add(g, mesh(geo.scatola(0.45, 0.32, 0.02), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#fbf4e0'; c.fillRect(0, 0, l, l); c.strokeStyle = '#3b2616'; for (let y = 12; y < l; y += 14) for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(4, y + k * 2); c.lineTo(l - 4, y + k * 2); c.stroke(); } c.fillStyle = '#3b2616'; c.font = '14px serif'; c.fillText('♪ ♫ ♪', 10, 26); }), rim: 0 })), 0, 1.05, 0.03); p.rotation.x = -0.5; } break;
    case 'note': for (let i = 0; i < 3; i++) { const n = add(g, mesh(geo.palla(0.07, 8), mat(['#8a5ac8', '#e0607a', '#3a5aa8'][i], { emissive: '#402060', emissiveIntensity: 0.3 })), -0.3 + i * 0.3, 1.0 + (i % 2) * 0.25, 0); n.scale.set(1.2, 0.85, 0.6); add(n, mesh(geo.cil(0.012, 0.012, 0.28, 4), mat('#2e2a2e')), 0.06, 0.14, 0); } add(g, mesh(geo.cil(0.025, 0.025, 0.9, 5), legno()), 0, 0.45, 0); break;
    case 'cavalletto': {
      for (const s of [-1, 1]) { const l = add(g, mesh(geo.cil(0.025, 0.03, 1.3, 5), legno()), s * 0.25, 0.62, 0); l.rotation.z = -s * 0.12; }
      add(g, mesh(geo.cil(0.025, 0.03, 1.2, 5), legno()), 0, 0.55, -0.22).rotation.x = -0.35;
      add(g, mesh(geo.scatola(0.6, 0.04, 0.08), legno()), 0, 0.55, 0.04);
      const t = add(g, mesh(geo.scatola(0.6, 0.5, 0.03), mat('#ffffff', { map: texture(64, (c, l) => { c.fillStyle = '#bfe4ff'; c.fillRect(0, 0, l, l * 0.6); c.fillStyle = '#7fc06a'; c.fillRect(0, l * 0.6, l, l * 0.4); c.fillStyle = '#f2c230'; c.beginPath(); c.arc(l * 0.75, l * 0.25, 8, 0, 7); c.fill(); c.fillStyle = '#e8803e'; c.beginPath(); c.arc(l * 0.35, l * 0.6, 10, 0, 7); c.fill(); }), rim: 0 })), 0, 0.85, 0.05);
      t.rotation.x = -0.12;
      break;
    }
    case 'tele': for (let i = 0; i < 3; i++) { const t = add(g, mesh(geo.scatola(0.45 - i * 0.06, 0.35 - i * 0.04, 0.03), mat(['#f2c230', '#7fb8e8', '#f28aa8'][i])), i * 0.05, 0.18 - i * 0.02, -i * 0.06); t.rotation.x = -0.25; } break;
    case 'teatrino': {
      add(g, mesh(geo.scatola(1.0, 1.2, 0.3), mat(col)), 0, 0.6, 0);
      add(g, mesh(geo.scatola(0.6, 0.45, 0.05), mat('#2e2a2e')), 0, 0.85, 0.14);
      for (const s of [-1, 1]) add(g, mesh(geo.scatola(0.12, 0.5, 0.06), mat('#d8443a')), s * 0.3, 0.86, 0.17);
      add(g, mesh(geo.cono(0.6, 0.35, 4), mat('#f2c230', { rim: 0.4 })), 0, 1.38, 0).rotation.y = Math.PI / 4;
      const burattino = add(g, mesh(geo.palla(0.1, 10), mat('#f2c8a0')), 0, 0.9, 0.18);
      add(burattino, mesh(geo.cono(0.09, 0.18, 8), mat('#d8443a')), 0, 0.13, 0);
      break;
    }
    case 'manichino': {
      add(g, mesh(geo.cil(0.03, 0.03, 0.8, 5), legno()), 0, 0.4, 0);
      add(g, mesh(geo.cil(0.2, 0.25, 0.08, 10), legno()), 0, 0.04, 0);
      add(g, mesh(geo.palla(0.28, 14), mat('#ffffff', { map: texture(32, strisce('#c05a90', '#f6d8e0', 6)) })), 0, 1.0, 0).scale.set(0.9, 1.3, 0.7);
      add(g, mesh(geo.palla(0.05, 6), mat('#f2c230')), 0, 1.43, 0);
      break;
    }
    case 'rocchetti': for (let i = 0; i < 4; i++) { const x = -0.3 + i * 0.2; add(g, mesh(geo.cil(0.07, 0.07, 0.22, 10), mat(['#d8443a', '#3a5aa8', '#f2c230', '#4f9a5a'][i], { rim: 0.4 })), x, 0.11, 0); for (const y of [0.01, 0.22]) add(g, mesh(geo.cil(0.09, 0.09, 0.03, 10), legno()), x, y, 0); } break;
    case 'stoffe': for (let i = 0; i < 3; i++) { const r = add(g, mesh(geo.cil(0.12, 0.12, 0.8, 10), stoffaRotolo(i)), 0, 0.12 + i * 0.22, 0); r.rotation.z = Math.PI / 2; } break;
    case 'tornio': add(g, mesh(geo.cil(0.3, 0.3, 0.45, 12), legno()), 0, 0.22, 0); add(g, mesh(geo.cil(0.25, 0.25, 0.05, 14), mat('#8a7a6a')), 0, 0.47, 0); add(g, mesh(geo.cil(0.1, 0.13, 0.22, 12), mat('#c8603a')), 0, 0.6, 0); break;
    case 'vasi': for (const [x, h, c] of [[-0.3, 0.45, '#c8603a'], [0.05, 0.6, '#3a8aa8'], [0.35, 0.35, '#e8b440']] as const) { const v = add(g, mesh(geo.palla(0.18, 12), mat(c, { rim: 0.4 })), x, h * 0.45, 0); v.scale.y = h / 0.36; add(g, mesh(geo.cil(0.07, 0.09, 0.1, 10), mat(c)), x, h * 0.9, 0); } break;
    case 'treppiede': {
      for (let i = 0; i < 3; i++) { const l = add(g, mesh(geo.cil(0.02, 0.02, 1.1, 5), mat('#2e2a2e')), Math.cos(i * 2.1) * 0.18, 0.5, Math.sin(i * 2.1) * 0.18); l.rotation.set(Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25); }
      add(g, mesh(geo.scatola(0.35, 0.28, 0.3), mat('#7a4a2a', { rim: 0.4 })), 0, 1.1, 0);
      add(g, mesh(geo.cil(0.08, 0.1, 0.18, 10), mat('#2e2a2e')), 0, 1.1, 0.22).rotation.x = Math.PI / 2;
      break;
    }
    case 'cornici': for (let i = 0; i < 3; i++) { const t = add(g, mesh(geo.scatola(0.35, 0.45, 0.04), mat(['#e0b23c', '#9a6a40', '#f4efe6'][i], { rim: 0.4 })), -0.3 + i * 0.3, 0.35, 0); t.rotation.x = -0.2; add(t, mesh(geo.scatola(0.25, 0.35, 0.01), mat(['#bfe4ff', '#f6d8e0', '#d8f0c8'][i])), 0, 0, 0.025); } add(g, mesh(geo.scatola(1.0, 0.1, 0.2), legno()), 0, 0.05, -0.05); break;
    default: break;
  }
  return g;
}

function stoffaRotolo(i: number) {
  return mat('#ffffff', { map: texture(32, (c, l) => {
    c.fillStyle = ['#c05a90', '#3a5aa8', '#f2c230'][i]; c.fillRect(0, 0, l, l);
    c.fillStyle = '#ffffff';
    if (i === 0) for (let y = 4; y < l; y += 10) for (let x = 4; x < l; x += 10) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    else if (i === 1) for (let y = 0; y < l; y += 8) c.fillRect(0, y, l, 3);
    else { c.globalAlpha = 0.5; for (let k = 0; k < l; k += 8) { c.fillRect(k, 0, 2, l); c.fillRect(0, k, l, 2); } }
  }) });
}

function macchieMondo(c: CanvasRenderingContext2D, l: number) {
  c.fillStyle = '#5aa0d8'; c.fillRect(0, 0, l, l);
  c.fillStyle = '#7ac06a';
  for (const [x, y, r] of [[12, 20, 10], [40, 14, 8], [30, 42, 12], [54, 40, 7]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
}

/**
 * Tutto quello che il mestiere aggiunge davanti alla casa: il bancone col tendone (se vende) a sinistra
 * e gli attrezzi a destra. Le coordinate sono quelle della casa: porta verso +z, facciata a z = fronte.
 */
export function creaAttrezziMestiere(mestiere: string, fronte: number): THREE.Group {
  const d = defMestiere(mestiere);
  const g = new THREE.Group();
  if (!d) return g;
  const z = Math.max(fronte, 1.1) + 0.45;
  const posti: [number, number, number][] = [[1.75, z - 0.15, -0.4], [2.25, z - 1.1, -0.9], [1.6, z + 0.75, -0.2]];
  const cose = [...d.attrezzi];
  if (d.tenda) {
    const b = creaBancone(d);
    b.position.set(-1.85, 0, z - 0.25);
    b.rotation.y = 0.35;
    g.add(b);
  } else {
    // senza bancone, il primo attrezzo va a sinistra (il più grande: forgia, moto, telescopio...)
    const primo = creaAttrezzo(cose.shift()!, d);
    primo.position.set(-1.85, 0, z - 0.25);
    primo.rotation.y += 0.35;
    g.add(primo);
  }
  cose.forEach((id, i) => {
    const o = creaAttrezzo(id, d);
    const [x, zz, r] = posti[i];
    o.position.set(x, 0, zz);
    o.rotation.y += r;
    g.add(o);
  });
  g.userData.mestiere = mestiere;
  return g; // il contorno lo mette la casa
}
