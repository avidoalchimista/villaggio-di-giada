import { describe, expect, it } from 'vitest';
import { trovaStrada } from './spazio';

describe('trovaStrada', () => {
  // un muro lungo (una casa) tra chi parte e la meta, con un passaggio solo in fondo
  const muro = (x: number, z: number) => !(Math.abs(x) < 0.6 && z > -6 && z < 3);

  it('gira intorno a un muro invece di andarci contro', () => {
    const tappe = trovaStrada([-4, 0], [4, 0], muro, 10)!;
    expect(tappe).not.toBeNull();
    expect(tappe.at(-1)).toEqual([4, 0]);
    // passa dal lato corto (z > 3), e nessuna tappa sta dentro il muro
    expect(Math.max(...tappe.map((p) => p[1]))).toBeGreaterThanOrEqual(3);
    for (const [x, z] of tappe.slice(0, -1)) expect(muro(x, z)).toBe(true);
  });

  it('se la strada è libera va dritto', () => {
    expect(trovaStrada([-4, 0], [4, 0], () => true, 10)).toEqual([[4, 0]]);
  });

  it('se la meta è chiusa da tutte le parti non trova strada', () => {
    expect(trovaStrada([-4, 0], [4, 0], (x, z) => Math.hypot(x - 4, z) > 3, 10)).toBeNull();
  });

  it('arriva accanto a una meta attaccata a un mobile', () => {
    const tappe = trovaStrada([-4, 0], [4, 0], (x, z) => Math.hypot(x - 4, z) > 0.4, 10)!;
    expect(tappe.at(-1)).toEqual([4, 0]);
  });
});
