import { describe, it, expect } from 'vitest';
import { newtonRaphson, textbook3Bus, ieee9 } from '@/lib/power';

describe('Newton-Raphson load flow', () => {
  it('converges on a 3-bus textbook case', () => {
    const cs = textbook3Bus();
    const result = newtonRaphson(cs, { tol: 1e-8, maxIter: 30 });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThan(10);
    expect(result.maxMismatch).toBeLessThan(1e-7);
  });

  it('slack bus voltage matches setpoint', () => {
    const cs = textbook3Bus();
    const result = newtonRaphson(cs);
    expect(result.buses[0].V).toBeCloseTo(1.0, 6);
    expect(result.buses[0].theta_deg).toBeCloseTo(0, 6);
  });

  it('PV bus voltage magnitude matches setpoint', () => {
    const cs = textbook3Bus();
    const result = newtonRaphson(cs);
    expect(result.buses[1].V).toBeCloseTo(1.0, 6);
  });

  it('converges on IEEE 9-bus', () => {
    const cs = ieee9();
    const result = newtonRaphson(cs, { tol: 1e-8, maxIter: 30 });
    expect(result.converged).toBe(true);
    expect(result.iterations).toBeLessThan(20);
  });

  it('losses are positive', () => {
    const cs = textbook3Bus();
    const result = newtonRaphson(cs);
    expect(result.losses.P).toBeGreaterThan(0);
  });
});
