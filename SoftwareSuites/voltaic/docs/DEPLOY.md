# Deployment Guide

## 1. Supabase

1. Create project at https://app.supabase.com
2. Copy Project URL, anon key, service_role key from Settings > API
3. Link and push schema:

    npx supabase link --project-ref <your-ref>
    npx supabase db push

## 2. Stripe

1. Create products at https://dashboard.stripe.com/products
   - Pro Monthly (49 EUR) — copy price_... ID
   - Pro Yearly (490 EUR) — copy price_... ID
   - Team Monthly (199 EUR) — copy price_... ID
   - Team Yearly (1990 EUR) — copy price_... ID

2. Setup webhook:
   - URL: https://your-domain.vercel.app/api/stripe/webhook
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

## 3. Vercel

1. Push to GitHub
2. Import at https://vercel.com/new
3. Add env vars from .env.example
4. Deploy

## Local dev

    npm run dev
    npm run stripe:listen
    npm test
