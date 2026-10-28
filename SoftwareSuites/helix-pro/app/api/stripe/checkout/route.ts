import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';
import { PLANS, type PlanId } from '@/lib/stripe/plans';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const plan = (url.searchParams.get('plan') ?? 'pro') as PlanId;

  if (!PLANS[plan] || plan === 'free') {
    return NextResponse.redirect(new URL('/pricing', req.url));
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const planDef = PLANS[plan] as { priceId?: string; name: string };
  if (!planDef.priceId) {
    return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: planDef.priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    success_url: url.origin + '/dashboard?upgraded=1',
    cancel_url: url.origin + '/pricing',
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.redirect(session.url!, 303);
}
