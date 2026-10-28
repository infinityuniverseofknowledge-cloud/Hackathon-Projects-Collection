export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    features: ['100 API calls / month', 'Browser tools', 'No project save'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    features: ['Unlimited API', 'Save projects', 'CSV / SVG / PDF export', 'Priority support'],
  },
  team: {
    name: 'Team',
    price: 99,
    priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    priceIdYearly: process.env.STRIPE_PRICE_TEAM_YEARLY,
    features: ['Everything in Pro', '5 seats', 'Shared projects', 'SSO', 'Audit log'],
  },
} as const;

export type PlanId = keyof typeof PLANS;
