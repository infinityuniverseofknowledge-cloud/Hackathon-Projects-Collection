# HELIX PRO

> Production-grade bioinformatics workbench — real algorithms, modern UI, ready to deploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## Why HELIX PRO

Existing tools are either **academic** (Biopython, ugly UI) or **enterprise-only**
(Benchling at $100+/mo/seat). HELIX PRO is the missing middle: research-grade
algorithms with a cinematic UI that students, professors, and small biotech
teams can actually afford.

## Features

- Real algorithms — Gotoh affine gap + BLOSUM62, Doench 2014 + CFD, SantaLucia 1998
- Modern UI — Tailwind design system built for scientists
- Auth + Billing — Supabase auth, Stripe checkout + webhooks
- Modular — every algorithm is a tested TypeScript function in `lib/bio/`
- 5-minute deploy — Vercel + Supabase + Stripe

## Quick Start

    git clone <repo>
    cd helix-pro
    npm install
    cp .env.example .env.local
    npx supabase db push
    npm run dev

Visit http://localhost:3000

## Architecture

    app/         Next.js 14 App Router (pages + API)
    components/  UI primitives + workbench + visualizers
    lib/bio/     Algorithms (the value)
    lib/supabase Auth + DB clients
    lib/stripe   Payments
    supabase/    Migrations + RLS policies
    tests/       Vitest unit tests

## Real Algorithms

| Module      | Algorithm               | Reference                  |
|-------------|-------------------------|----------------------------|
| Alignment   | Gotoh affine gap        | Gotoh 1982                 |
| Alignment   | Smith-Waterman          | Smith & Waterman 1981      |
| Scoring     | BLOSUM62 (24x24)        | Henikoff & Henikoff 1992   |
| CRISPR      | Doench 2014 on-target   | Doench et al.              |
| CRISPR      | CFD off-target          | Doench et al. 2016         |
| Primers     | SantaLucia 1998 Tm      | SantaLucia 1998            |
| Translation | 6 genetic codes + ORF   | NCBI                       |
| Structure   | Dihedral angles (IUPAC) | IUPAC convention           |
| Restriction | 30 real enzymes         | REBASE                     |

## Pricing

| Plan       | Price     | Features                                      |
|------------|-----------|-----------------------------------------------|
| Free       | 0         | 100 API calls/mo, browser tools               |
| Pro        | 29/mo     | Unlimited API, save projects, PDF/SVG export  |
| Team       | 99/mo     | 5 seats, shared projects, SSO, audit log      |
| Enterprise | Custom    | On-prem, SOC2, HIPAA BAA, SLA                 |

## Testing

    npm test
    npm run test:coverage
    npm run typecheck

## License

Dual: MIT for academic/open-source, Commercial for SaaS. See LICENSE.
