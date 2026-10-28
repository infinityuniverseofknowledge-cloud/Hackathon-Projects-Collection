/**
 * Swing equation for rotor angle stability.
 * Reference: Anderson & Fouad, "Power System Control and Stability" (2003).
 *
 *     M d²δ/dt² = P_m - P_e - D dδ/dt
 *
 * where:
 *     M = 2H / ω_s (inertia constant)
 *     H = stored energy / MVA base (seconds)
 *     P_m = mechanical power
 *     P_e = electrical power (function of δ)
 *     D = damping coefficient
 */

export interface SwingParams {
  H: number;              // inertia constant (s)
  Pm: number;             // mechanical power (pu)
  Pmax: number;           // max electrical power (pu), P_e = Pmax·sin(δ)
  D: number;              // damping (pu)
  freqHz?: number;        // nominal frequency (50 or 60)
  delta0?: number;        // initial angle (rad)
  omega0?: number;        // initial speed deviation (pu)
}

export interface SwingResult {
  delta: number;          // rad
  omega: number;          // pu speed deviation
  Pe: number;             // pu electrical power
  criticalAngle: number;  // rad (if Pm < Pmax)
  stable: boolean;
}

/**
 * Integrate swing equation via RK4 for one time step.
 */
export function swingStep(
  params: SwingParams,
  delta: number,
  omega: number,
  dt: number
): SwingResult {
  const omega_s = 2 * Math.PI * (params.freqHz ?? 50);
  const M = (2 * params.H) / omega_s;

  const f = (d: number, w: number): [number, number] => {
    const Pe = params.Pmax * Math.sin(d);
    const dd = w * omega_s;
    const dw = (params.Pm - Pe - params.D * w) / M;
    return [dd, dw];
  };

  const [k1d, k1w] = f(delta, omega);
  const [k2d, k2w] = f(delta + 0.5 * dt * k1d, omega + 0.5 * dt * k1w);
  const [k3d, k3w] = f(delta + 0.5 * dt * k2d, omega + 0.5 * dt * k2w);
  const [k4d, k4w] = f(delta + dt * k3d, omega + dt * k3w);

  const deltaNew = delta + (dt / 6) * (k1d + 2 * k2d + 2 * k3d + k4d);
  const omegaNew = omega + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
  const Pe = params.Pmax * Math.sin(deltaNew);

  // Critical clearing angle: cos δ_cr = (π - 2δ0) sin δ0 / π + cos δ0
  const delta0 = params.delta0 ?? Math.asin(Math.min(1, params.Pm / params.Pmax));
  let criticalAngle = Math.PI;
  let stable = true;
  if (params.Pm < params.Pmax) {
    criticalAngle = Math.acos(
      ((Math.PI - 2 * delta0) * Math.sin(delta0)) / Math.PI + Math.cos(delta0)
    );
  } else {
    stable = false;
  }

  return { delta: deltaNew, omega: omegaNew, Pe, criticalAngle, stable };
}

/**
 * Simulate the swing equation for a duration.
 */
export function simulateSwing(
  params: SwingParams,
  duration: number,
  dt = 0.001
): SwingResult[] {
  const omega_s = 2 * Math.PI * (params.freqHz ?? 50);
  const delta0 = params.delta0 ?? Math.asin(Math.min(1, params.Pm / params.Pmax));
  let delta = delta0;
  let omega = params.omega0 ?? 0;
  const out: SwingResult[] = [];
  const steps = Math.floor(duration / dt);
  for (let i = 0; i < steps; i++) {
    const r = swingStep(params, delta, omega, dt);
    delta = r.delta;
    omega = r.omega;
    out.push(r);
  }
  return out;
}
