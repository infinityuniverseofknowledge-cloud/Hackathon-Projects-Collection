import { describe, it, expect } from 'vitest';
import { dispatchBattery } from '@/lib/power';

describe('Battery dispatch', () => {
  it('charges when price is low', () => {
    const battery = {
      capacity_MWh: 10,
      powerMax_MW: 2,
      efficiency: 0.9,
      socMin: 0.1,
      socMax: 0.9,
      socInit: 0.5,
    };
    const prices = [10, 10, 10, 100, 100, 100, 10, 10];
    const r = dispatchBattery(battery, {
      priceBuy: prices,
      priceSell: prices,
      loadMW: [0, 0, 0, 0, 0, 0, 0, 0],
    });
    // Should charge when price = 10
    const charged = r.schedule.filter((h) => h.charge > 0.1).length;
    const discharged = r.schedule.filter((h) => h.discharge > 0.1).length;
    expect(charged).toBeGreaterThan(0);
    expect(discharged).toBeGreaterThan(0);
  });

  it('SOC stays within limits', () => {
    const battery = {
      capacity_MWh: 10,
      powerMax_MW: 2,
      efficiency: 0.9,
      socMin: 0.1,
      socMax: 0.9,
      socInit: 0.5,
    };
    const r = dispatchBattery(battery, {
      priceBuy: Array.from({ length: 24 }, (_, i) => 20 + 40 * Math.sin(i / 3)),
      priceSell: Array.from({ length: 24 }, (_, i) => 20 + 40 * Math.sin(i / 3)),
      loadMW: Array(24).fill(0),
    });
    for (const h of r.schedule) {
      expect(h.soc).toBeGreaterThanOrEqual(0.1 - 0.001);
      expect(h.soc).toBeLessThanOrEqual(0.9 + 0.001);
    }
  });
});
