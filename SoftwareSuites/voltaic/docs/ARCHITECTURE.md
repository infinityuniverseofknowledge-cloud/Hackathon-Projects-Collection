# VOLTAIC — Architecture

## Why pure TS algorithms in lib/power/

- Testable — no React, no DOM, just pure functions
- Reusable — importable by API routes, client, CLI, workers
- Portable — could be extracted as npm package `@voltaic/power`
- Auditable — a power engineer can read `nr.ts` and verify it

## Load flow (Newton-Raphson)

State variables:
- θ_i for all buses except slack (voltage angle)
- V_i for all PQ buses (voltage magnitude)

Mismatch:
- ΔP_i = P_spec_i - P_calc_i for PQ and PV buses
- ΔQ_i = Q_spec_i - Q_calc_i for PQ buses

Jacobian:
    [ H  N ] [ Δθ ]   [ ΔP/V ]
    [ M  L ] [ ΔV ] = [ ΔQ/V ]

Iterate until |ΔP|, |ΔQ| < tolerance.

## Y-bus construction

For each line (i, j) with series admittance y = 1/Z:
    Y_ii += y
    Y_jj += y
    Y_ij -= y
    Y_ji -= y

Plus shunts and transformer taps.

## Economic dispatch

Minimize total cost: Σ C_i(P_i) = Σ (a_i + b_i P_i + c_i P_i²)

Subject to: Σ P_i = P_load  and  P_min ≤ P_i ≤ P_max.

Solved by λ-iteration: dC_i/dP_i = λ for all i.
