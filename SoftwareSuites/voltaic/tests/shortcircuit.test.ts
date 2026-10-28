import { describe, it, expect } from 'vitest';
import { iec60909, combineSeries, combineParallel } from '@/lib/power';

describe('IEC 60909 short circuit', () => {
  it('computes Ik for a simple case', () => {
    const r = iec60909({
      voltage_kv: 10,
      z_source_ohm: 0.5,
      x_r_ratio: 10,
      c: 1.1,
    });
    // I = 1.1 * 10000 / (√3 * 0.5) ≈ 12700 A = 12.7 kA
    expect(r.Ik_ka).toBeGreaterThan(10);
    expect(r.Ik_ka).toBeLessThan(15);
    expect(r.ip_ka).toBeGreaterThan(r.Ik_ka);
  });

  it('lower impedance gives higher current', () => {
    const r1 = iec60909({ voltage_kv: 10, z_source_ohm: 0.5 });
    const r2 = iec60909({ voltage_kv: 10, z_source_ohm: 1.0 });
    expect(r1.Ik_ka).toBeGreaterThan(r2.Ik_ka);
  });
});

describe('Impedance combination', () => {
  it('series adds', () => {
    const z = combineSeries([{ r: 0.1, x: 0.2 }, { r: 0.3, x: 0.4 }]);
    expect(z.r).toBeCloseTo(0.4);
    expect(z.x).toBeCloseTo(0.6);
  });

  it('parallel combines correctly', () => {
    // Two equal impedances: 0.5 × each
    const z = combineParallel([{ r: 1, x: 0 }, { r: 1, x: 0 }]);
    expect(z.r).toBeCloseTo(0.5, 4);
  });
});
