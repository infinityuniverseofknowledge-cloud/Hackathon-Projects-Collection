/**
 * Battery energy storage dispatch optimizer.
 * Greedy algorithm: charge during cheap hours, discharge during peak.
 */

export interface Battery {
  capacity_MWh: number;
  powerMax_MW: number;      // charge/discharge limit
  efficiency: number;        // round-trip, e.g. 0.90
  socMin: number;            // 0..1
  socMax: number;            // 0..1
  socInit: number;
}

export interface DispatchOptions {
  priceBuy: number[];       // €/MWh for each hour
  priceSell: number[];      // €/MWh for each hour
  loadMW: number[];         // net load profile
  pvMW?: number[];
  windMW?: number[];
}

export interface DispatchResult {
  schedule: {
    hour: number;
    soc: number;
    charge: number;       // MW (positive = charging)
    discharge: number;    // MW (positive = discharging)
    gridImport: number;
    gridExport: number;
    revenue: number;
  }[];
  totalRevenue: number;
  finalSoc: number;
}

export function dispatchBattery(
  battery: Battery,
  opts: DispatchOptions
): DispatchResult {
  const T = opts.priceBuy.length;
  let soc = battery.socInit * battery.capacity_MWh;
  const schedule: DispatchResult['schedule'] = [];
  let totalRevenue = 0;

  const sqrtEff = Math.sqrt(battery.efficiency);

  for (let t = 0; t < T; t++) {
    const netLoad = opts.loadMW[t] - (opts.pvMW?.[t] ?? 0) - (opts.windMW?.[t] ?? 0);
    const buyPrice = opts.priceBuy[t];
    const sellPrice = opts.priceSell[t];

    let charge = 0, discharge = 0;

    // Price arbitrage: buy when cheap, sell when expensive
    const avgBuy = opts.priceBuy.reduce((a, b) => a + b, 0) / T;
    if (buyPrice < avgBuy * 0.8 && soc < battery.socMax * battery.capacity_MWh) {
      // Cheap: charge
      const pMax = battery.powerMax_MW;
      const capacityRemaining = battery.socMax * battery.capacity_MWh - soc;
      const timeLimited = capacityRemaining / (sqrtEff * 1);  // 1 hour steps
      charge = Math.min(pMax, timeLimited);
      soc += charge * sqrtEff * 1;
    } else if (buyPrice > avgBuy * 1.2 && soc > battery.socMin * battery.capacity_MWh) {
      // Expensive: discharge
      const pMax = battery.powerMax_MW;
      const energyAvailable = soc - battery.socMin * battery.capacity_MWh;
      const timeLimited = energyAvailable * sqrtEff / 1;
      discharge = Math.min(pMax, timeLimited);
      soc -= discharge / sqrtEff * 1;
    }

    const gridImport = Math.max(0, netLoad + charge);
    const gridExport = Math.max(0, -netLoad + discharge - charge);

    const revenue = gridExport * sellPrice - gridImport * buyPrice;
    totalRevenue += revenue;

    schedule.push({
      hour: t,
      soc: soc / battery.capacity_MWh,
      charge,
      discharge,
      gridImport,
      gridExport,
      revenue,
    });
  }

  return { schedule, totalRevenue, finalSoc: soc / battery.capacity_MWh };
}
