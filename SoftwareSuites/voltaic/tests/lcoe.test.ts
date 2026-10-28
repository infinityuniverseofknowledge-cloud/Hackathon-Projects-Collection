import { describe, it, expect } from 'vitest';
import { computeLCOE, computeIRR } from '@/lib/power';

describe('LCOE', () => {
  it('computes a reasonable LCOE for solar', () => {
    const r = computeLCOE({
      capitalCost: 1_000_000,
      annualOpex: 20_000,
      fuelCost: 0,
      annualEnergyMWh: 2000,
      lifetime: 25,
      discountRate: 0.07,
    });
    // LCOE should be in a plausible range for solar: 40-100 €/MWh
    expect(r.lcoe).toBeGreaterThan(20);
    expect(r.lcoe).toBeLessThan(200);
  });

  it('higher discount rate gives higher LCOE', () => {
    const base = {
      capitalCost: 1_000_000,
      annualOpex: 20_000,
      fuelCost: 0,
      annualEnergyMWh: 2000,
      lifetime: 25,
    };
    const r1 = computeLCOE({ ...base, discountRate: 0.05 });
    const r2 = computeLCOE({ ...base, discountRate: 0.10 });
    expect(r2.lcoe).toBeGreaterThan(r1.lcoe);
  });
});

describe('IRR', () => {
  it('computes IRR for a simple project', () => {
    // Invest 1000, get 200 for 10 years
    const cf = [-1000, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200];
    const irr = computeIRR(cf);
    // Expected ~15.1%
    expect(irr).toBeGreaterThan(0.13);
    expect(irr).toBeLessThan(0.17);
  });
});
