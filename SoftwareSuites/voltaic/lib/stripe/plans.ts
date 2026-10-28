export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['3-bus systems', 'Browser tools', 'No project save'],
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: ['Unlimited buses', 'Save projects', 'CSV / PDF export', 'Priority support'],
  },
  team: {
    name: 'Team',
    price: 199,
    priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_TEAM_YEARLY,
    features: ['Everything in Pro', '5 seats', 'Shared projects', 'SSO', 'Audit log'],
  },
} as const;
export type PlanId = keyof typeof PLANS;
