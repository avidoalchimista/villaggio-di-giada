import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { improntaDi, piuViciniCapsule, sovrapposte, spintaFuori, type Impronta } from '../scena/spazio';

describe('spazio del villaggio', () => {
  it('un cerchio dentro un rettangolo girato viene spinto fuori dal lato più vicino', () => {
    const box: Impronta = { tipo: 'scatola', x: 0, z: 0, hx: 2, hz: 1, rot: Math.PI / 2 };
    // girato di 90°: il lato lungo sta lungo z
    const f = spintaFuori(0, 1.8, 0.3, box)!;
    expect(f).not.toBeNull();
    expect(Math.abs(f.z)).toBeGreaterThan(0.99);
    expect(spintaFuori(1.5, 0, 0.3, box)).toBeNull();
  });

  it('due rettangoli si toccano solo se si sovrappongono davvero', () => {
    const a: Impronta = { tipo: 'scatola', x: 0, z: 0, hx: 1, hz: 1, rot: 0 };
    expect(sovrapposte(a, { tipo: 'scatola', x: 1.9, z: 0, hx: 1, hz: 1, rot: 0 })).toBe(true);
    expect(sovrapposte(a, { tipo: 'scatola', x: 2.1, z: 0, hx: 1, hz: 1, rot: 0 })).toBe(false);
    // girato di 45°: l'angolo arriva a 1,41
    expect(sovrapposte(a, { tipo: 'scatola', x: 2.3, z: 0, hx: 1, hz: 1, rot: Math.PI / 4 })).toBe(true);
    expect(sovrapposte(a, { tipo: 'scatola', x: 2.5, z: 0, hx: 1, hz: 1, rot: Math.PI / 4 })).toBe(false);
  });

  it("l'impronta guarda solo le parti a terra (la chioma non conta)", () => {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2), new THREE.MeshBasicMaterial());
    tronco.position.y = 0.6;
    const chioma = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
    chioma.position.y = 2;
    g.add(tronco, chioma);
    g.position.set(3, 0, -1);
    const i = improntaDi(g, { tonda: true })!;
    expect(i.tipo).toBe('cerchio');
    if (i.tipo === 'cerchio') {
      expect(i.r).toBeCloseTo(0.2, 2);
      expect(i.x).toBeCloseTo(3);
      expect(i.z).toBeCloseTo(-1);
    }
  });

  it('due animali uno accanto all altro: i punti più vicini sono sui loro corpi', () => {
    const [ax, , bx] = piuViciniCapsule({ x: 0, z: 0, dx: 0, dz: 1, mezza: 0.5, r: 0.2 }, { x: 1, z: 0, dx: 0, dz: 1, mezza: 0.5, r: 0.2 });
    expect(bx - ax).toBeCloseTo(1);
  });
});
