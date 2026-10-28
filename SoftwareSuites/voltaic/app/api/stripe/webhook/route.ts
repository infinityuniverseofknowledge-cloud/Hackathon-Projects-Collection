import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as { metadata?: { user_id?: string; plan?: string }; customer?: string; subscription?: string };
      const userId = s.metadata?.user_id;
      const plan = s.metadata?.plan ?? 'pro';
      if (userId) {
        await admin.from('profiles').update({
          plan,
          stripe_customer_id: s.customer,
          subscription_id: s.subscription,
          subscription_status: 'active',
        }).eq('id', userId);
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as { id: string };
      await admin.from('profiles').update({
        plan: 'free',
        subscription_status: 'canceled',
      }).eq('subscription_id', sub.id);
    }
  } catch (err) {
    console.error('[webhook]', err);
  }
  return NextResponse.json({ received: true });
}
