import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
const TOOLS = [
  { href: '/loadflow',   name: 'Load Flow',     icon: '⚡', desc: 'Newton-Raphson · Y-bus' },
  { href: '/dispatch',   name: 'Dispatch',      icon: '🔋', desc: 'Economic · λ-iteration' },
  { href: '/shortcirc',  name: 'Short Circuit', icon: '⚠', desc: 'IEC 60909' },
  { href: '/forecast',   name: 'Forecast',      icon: '📈', desc: 'Holt-Winters' },
  { href: '/renewables', name: 'Renewables',    icon: '🌬', desc: 'Wind · solar' },
  { href: '/stability',  name: 'Stability',     icon: '〰', desc: 'Swing · critical angle' },
];
export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display font-black text-3xl tracking-[3px] gradient-text mb-2">
          Grid Workbench
        </h1>
        <p className="text-sm text-[#4a5478] font-mono uppercase tracking-widest mb-12">
          {user?.email ?? 'Not signed in'}
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="p-6 rounded-lg border border-[#242c4a] bg-[#101426]/60 hover:border-[#ffb84d]/60 hover:shadow-lg hover:shadow-[#ffb84d]/10 transition group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition">{t.icon}</div>
              <div className="font-display font-bold text-[#ffb84d] mb-1">{t.name}</div>
              <div className="text-xs text-[#8a95b8] font-mono">{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
