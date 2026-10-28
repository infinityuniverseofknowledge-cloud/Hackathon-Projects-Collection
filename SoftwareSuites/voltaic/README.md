# VOLTAIC

> Production-grade power grid workbench — Newton-Raphson load flow,
> economic dispatch, IEC 60909 short circuit, battery storage optimization.

## Why VOLTAIC

Utilities pay €50k+/year per seat for PSS/E, PowerFactory, or PowerWorld.
Small renewable developers, microgrid operators, and universities cannot
afford this. VOLTAIC brings **research-grade power systems algorithms**
to a modern browser-based SaaS that any engineer can use.

## Features

- Real algorithms — Newton-Raphson load flow, Y-bus builder, economic dispatch
- Standards-compliant — IEC 60909 short circuit, IEEE test cases
- Modern UI — Tailwind design system, real-time grid visualization
- Auth + Billing — Supabase auth, Stripe checkout + webhooks
- Modular — every algorithm is a tested TypeScript function in `lib/power/`

## Quick Start

    git clone <repo>
    cd voltaic
    npm install
    cp .env.example .env.local
    npx supabase db push
    npm run dev

Visit http://localhost:3000

## Real Algorithms

| Module         | Algorithm                     | Reference                  |
|----------------|-------------------------------|----------------------------|
| Load flow      | Newton-Raphson                | Tinney & Hart 1967         |
| Y-bus          | Admittance matrix             | Standard                   |
| Dispatch       | Lambda iteration              | Wood & Wollenberg 1996     |
| Unit commit    | Priority list                 | Standard                   |
| Short circuit  | IEC 60909                     | IEC Standard               |
| Battery        | Linear dispatch               | Standard                   |
| Forecast       | Holt-Winters                  | Winters 1960               |
| Wind           | Power curve                   | Betz limit, IEC 61400      |
| Solar          | PVWatts model                 | NREL                       |
| LCOE           | Levelized cost of energy      | IEA / NREL                 |
| Line model     | π (pi) model                  | Standard                   |
| Stability      | Swing equation                | Anderson & Fouad           |

## Pricing

| Plan       | Price     | Features                                      |
|------------|-----------|-----------------------------------------------|
| Free       | €0        | 3-bus systems, browser tools                  |
| Pro        | €49/mo    | Unlimited buses, save projects, PDF export    |
| Team       | €199/mo   | 5 seats, shared projects, SSO, audit log      |
| Enterprise | Custom    | On-prem, SOC2, HIPAA BAA, SLA                 |

## Testing

    npm test
    npm run test:coverage
    npm run typecheck

## License

Dual: MIT for academic/open-source, Commercial for SaaS. See LICENSE.
