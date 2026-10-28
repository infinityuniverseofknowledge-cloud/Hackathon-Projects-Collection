import { describe, it, expect } from 'vitest';
import { calcDihedral, type Vec3 } from '@/lib/bio/structure/dihedral';

describe('calcDihedral', () => {
  it('returns ~0 for planar cis', () => {
    const p1: Vec3 = [0, 0, 0];
    const p2: Vec3 = [1, 0, 0];
    const p3: Vec3 = [1, 1, 0];
    const p4: Vec3 = [2, 1, 0];
    expect(Math.abs(calcDihedral(p1, p2, p3, p4))).toBeLessThan(1);
  });
  it('returns ~180 for planar trans', () => {
    const p1: Vec3 = [0, 0, 0];
    const p2: Vec3 = [1, 0, 0];
    const p3: Vec3 = [1, 1, 0];
    const p4: Vec3 = [0, 1, 0];
    const d = calcDihedral(p1, p2, p3, p4);
    expect(Math.abs(Math.abs(d) - 180)).toBeLessThan(1);
  });
});
