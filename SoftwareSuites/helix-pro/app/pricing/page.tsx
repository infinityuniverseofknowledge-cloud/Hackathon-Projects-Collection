import Link from 'next/link';
import { PLANS } from '@/lib/stripe/plans';

export default function PricingPage() {
  return (
    <main className="min-h-screen px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display font-black text-4xl tracking-[3px] gradient-text text-center mb-4">
          Pricing
        </h1>
        <p className="text-center text-[#8a95b8] mb-16 italic">Start free. Upgrade when you need more.</p>

        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([id, plan]) => (
            <div
              key={id}
              className={
                'p-8 rounded-lg border ' +
                (id === 'pro'
                  ? 'border-[#00ff9d] shadow-lg shadow-[#00ff9d]/20 bg-gradient-to-b from-[#0f2a20]/80 to-[#0a1a14]/60'
                  : 'border-[#1a3328] bg-[#0a1a14]/40')
              }
            >
              {id === 'pro' && (
                <div className="text-[10px] font-mono tracking-[2px] text-[#ffbb00] uppercase mb-2">
                  ★ Most popular
                </div>
              )}
              <div className="font-display font-bold text-2xl mb-2">{plan.name}</div>
              <div className="mb-6">
                <span className="font-display font-black text-4xl text-[#00ff9d]">
                  €{plan.price}
                </span>
                <span className="text-[#4a5478] ml-2">/ month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm text-[#8a95b8]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[#00ff9d]">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href={id === 'free' ? '/dashboard' : '/api/stripe/checkout?plan=' + id}
                className={
                  'block text-center py-3 rounded font-bold tracking-widest uppercase text-xs transition ' +
                  (id === 'pro'
                    ? 'bg-gradient-to-br from-[#00ff9d] to-[#00ccff] text-[#020806] hover:-translate-y-0.5'
                    : 'border border-[#2a5240] text-[#8a95b8] hover:border-[#00ff9d]')
                }
              >
                {id === 'free' ? 'Start free' : 'Upgrade →'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
