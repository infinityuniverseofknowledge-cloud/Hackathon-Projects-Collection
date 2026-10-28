import Stripe from 'stripe';
let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY missing');
    stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return stripe;
}
