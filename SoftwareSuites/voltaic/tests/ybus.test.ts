import { describe, it, expect } from 'vitest';
import { buildYbus } from '@/lib/power/ybus';

describe('Y-bus construction', () => {
  it('builds a 3-bus Y-bus correctly', () => {
    const Y = buildYbus(3, [
      { from: 0, to: 1, r: 0, x: 0.2 },
      { from: 1, to: 2, r: 0, x: 0.25 },
      { from: 0, to: 2, r: 0, x: 0.1 },
    ]);
    // y12 = 1/j0.2 = -j5, y23 = -j4, y13 = -j10
    // Y11 = y12 + y13 = -j15
    expect(Y.Y[0][0].re).toBeCloseTo(0, 6);
    expect(Y.Y[0][0].im).toBeCloseTo(-15, 6);
    // Y22 = y12 + y23 = -j9
    expect(Y.Y[1][1].im).toBeCloseTo(-9, 6);
    // Y33 = y23 + y13 = -j14
    expect(Y.Y[2][2].im).toBeCloseTo(-14, 6);
    // Y12 = -y12 = j5
    expect(Y.Y[0][1].im).toBeCloseTo(5, 6);
  });

  it('produces a symmetric matrix for passive networks', () => {
    const Y = buildYbus(3, [
      { from: 0, to: 1, r: 0.01, x: 0.1 },
      { from: 1, to: 2, r: 0.02, x: 0.15 },
    ]);
    expect(Y.Y[0][1].re).toBeCloseTo(Y.Y[1][0].re, 6);
    expect(Y.Y[0][1].im).toBeCloseTo(Y.Y[1][0].im, 6);
  });
});
