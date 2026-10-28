import { describe, it, expect } from 'vitest';
import { economicDispatch } from '@/lib/power';

describe('Economic dispatch', () => {
  it('dispatches two units equally when identical', () => {
    const units = [
      { name: 'G1', Pmin: 10, Pmax: 100, a: 0, b: 20, c: 0.01 },
      { name: 'G2', Pmin: 10, Pmax: 100, a: 0, b: 20, c: 0.01 },
    ];
    const r = economicDispatch(units, 100);
    expect(r.units[0].P).toBeCloseTo(r.units[1].P, 4);
    expect(r.totalPower).toBeCloseTo(100, 2);
  });

  it('cheaper unit produces more', () => {
    const units = [
      { name: 'Cheap', Pmin: 0, Pmax: 200, a: 0, b: 10, c: 0.005 },
      { name: 'Expensive', Pmin: 0, Pmax: 200, a: 0, b: 30, c: 0.01 },
    ];
    const r = economicDispatch(units, 150);
    expect(r.units[0].P).toBeGreaterThan(r.units[1].P);
  });

  it('respects min/max limits', () => {
    const units = [
      { name: 'Small', Pmin: 5, Pmax: 20, a: 0, b: 10, c: 0.01 },
      { name: 'Big', Pmin: 50, Pmax: 500, a: 0, b: 25, c: 0.008 },
    ];
    const r = economicDispatch(units, 300);
    expect(r.units[0].P).toBeLessThanOrEqual(20);
    expect(r.units[0].P).toBeGreaterThanOrEqual(5);
    expect(r.units[1].P).toBeLessThanOrEqual(500);
    expect(r.units[1].P).toBeGreaterThanOrEqual(50);
  });
});
