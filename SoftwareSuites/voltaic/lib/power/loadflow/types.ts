/**
 * Load flow data types.
 */

export type BusType = 'SLACK' | 'PV' | 'PQ';

export interface Bus {
  id: number;
  name: string;
  type: BusType;
  V: number;           // pu voltage magnitude (initial guess or setpoint)
  theta: number;       // rad (initial guess or setpoint for slack)
  Pgen: number;        // pu generation
  Qgen: number;        // pu generation
  Pload: number;       // pu load
  Qload: number;       // pu load
  Qmin?: number;       // pu
  Qmax?: number;       // pu
  Vset?: number;       // pu (for PV buses)
  baseKV: number;
}

export interface LFLine {
  from: number;
  to: number;
  r: number;           // pu
  x: number;           // pu
  b_shunt?: number;    // pu total line charging
  tap?: number;        // transformer tap
}

export interface LoadFlowCase {
  name: string;
  baseMVA: number;
  buses: Bus[];
  lines: LFLine[];
}

export interface LoadFlowResult {
  converged: boolean;
  iterations: number;
  maxMismatch: number;
  buses: {
    id: number;
    name: string;
    V: number;
    theta_rad: number;
    theta_deg: number;
    Pcalc: number;     // pu
    Qcalc: number;     // pu
    Pgen: number;      // pu (slack updated)
    Qgen: number;      // pu (slack/PV updated)
    Pload: number;
    Qload: number;
  }[];
  losses: { P: number; Q: number };  // pu
  slackPower: { P: number; Q: number };
}
