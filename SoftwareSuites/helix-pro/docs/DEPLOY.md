# Deployment Guide

## 1. Supabase

1. Create project at https://app.supabase.com
2. Copy Project URL, anon key, service_role key from Settings > API
3. Link and push schema:

    npx supabase link --project-ref <your-ref>
    npx supabase db push

## 2. Stripe

1. Create products at https://dashboard.stripe.com/products
   - Pro Monthly (29 EUR) — copy price_... ID
   - Pro Yearly (290 EUR) — copy price_... ID
   - Team Monthly (99 EUR) — copy price_... ID
   - Team Yearly (990 EUR) — copy price_... ID

2. Setup webhook:
   - URL: https://your-domain.vercel.app/api/stripe/webhook
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
   - Copy whsec_... secret into .env.local

## 3. Vercel

1. Push to GitHub
2. Import at https://vercel.com/new
3. Add env vars from .env.example
4. Deploy

## 4. Custom domain

Vercel > Settings > Domains > add your domain.

## 5. HIPAA (enterprise only)

- Supabase Enterprise (SOC2 + HIPAA BAA)
- Stripe BAA if storing PHI
- Enable Supabase audit logging
- Set AUDIT_LOG_ENABLED=true

## Local dev

    npm run dev
    npm run stripe:listen
    npm test
