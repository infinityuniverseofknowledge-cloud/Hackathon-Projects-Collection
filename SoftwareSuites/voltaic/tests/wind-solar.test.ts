import { describe, it, expect } from 'vitest';
import { windPower } from '@/lib/power';
import { solarPower, solarPosition } from '@/lib/power';

describe('Wind power', () => {
  const turbine = {
    ratedPower_MW: 3,
    cutInSpeed: 3,
    ratedSpeed: 12,
    cutOutSpeed: 25,
    rotorDiameter: 120,
  };

  it('produces 0 below cut-in', () => {
    expect(windPower(turbine, 2).power_MW).toBe(0);
  });

  it('produces 0 above cut-out', () => {
    expect(windPower(turbine, 30).power_MW).toBe(0);
  });

  it('produces rated at rated speed', () => {
    expect(windPower(turbine, 12).power_MW).toBeCloseTo(3, 4);
  });

  it('produces rated above rated speed', () => {
    expect(windPower(turbine, 20).power_MW).toBeCloseTo(3, 4);
  });
});

describe('Solar power', () => {
  const panel = {
    ratedPower_kW: 10,
    systemLosses: 0.14,
    tempCoeff: -0.004,
    noct: 45,
  };

  it('produces 0 with no irradiance', () => {
    expect(solarPower(panel, { ghi: 0, ambientTemp: 25, windSpeed: 1, hour: 6 })).toBe(0);
  });

  it('produces near rated under STC', () => {
    const p = solarPower(panel, { ghi: 1000, ambientTemp: 25, windSpeed: 1, hour: 12 });
    // Some temp loss expected
    expect(p).toBeGreaterThan(7);
    expect(p).toBeLessThan(10);
  });
});

describe('Solar position', () => {
  it('returns elevation near 0 at night', () => {
    const pos = solarPosition(172, 2, 40);
    expect(pos.elevation).toBeLessThan(0);
  });
  it('returns high elevation at noon in summer', () => {
    const pos = solarPosition(172, 12, 40);
    expect(pos.elevation).toBeGreaterThan(50);
  });
});
