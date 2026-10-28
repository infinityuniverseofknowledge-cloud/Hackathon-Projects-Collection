import Link from 'next/link';
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 flex items-center gap-8 px-6 md:px-12 py-5 border-b border-[#242c4a]/60 backdrop-blur">
        <Link href="/" className="font-display font-black text-xl tracking-[6px] gradient-text">
          VOLTAIC
        </Link>
        <div className="ml-auto flex items-center gap-6 text-xs font-mono uppercase tracking-widest text-[#8a95b8]">
          <Link href="/pricing" className="hover:text-[#ffd180] transition">Pricing</Link>
          <Link href="/login" className="hover:text-[#ffd180] transition">Sign in</Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded bg-gradient-to-br from-[#ffb84d] to-[#3ad6ff] text-[#070810] font-bold hover:shadow-lg hover:shadow-[#ffb84d]/40 transition"
          >
            Launch →
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#ffb84d]/40 bg-[#ffb84d]/10 text-[#ffd180] font-mono text-[10px] tracking-[2.5px] uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10e8a0] shadow-[0_0_12px_#10e8a0]" />
          Power Grid Workbench · v1.0
        </div>
        <h1 className="font-display font-black text-6xl md:text-8xl tracking-[6px] mb-6 gradient-text">
          VOLTAIC
        </h1>
        <p className="text-xl md:text-2xl text-[#8a95b8] max-w-3xl mb-12 italic">
          Production-grade power systems. Newton-Raphson load flow.
          IEC 60909 short circuit. Deploy in 5 minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded bg-gradient-to-br from-[#ffb84d] to-[#3ad6ff] text-[#070810] font-bold tracking-widest uppercase text-sm hover:-translate-y-0.5 transition"
          >
            ⚡ Enter Workbench
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 rounded border border-[#242c4a] text-[#8a95b8] font-mono tracking-widest uppercase text-sm hover:border-[#a855f7] hover:text-[#c89aff] transition"
          >
            ↓ See Pricing
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl w-full">
          {[
            ['13', 'Algorithms'],
            ['IEEE 9', 'Test case'],
            ['IEC 60909', 'Short circuit'],
            ['100%', 'TypeScript'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="font-display font-black text-3xl text-[#ffb84d]">{v}</div>
              <div className="font-mono text-[10px] tracking-[2px] text-[#4a5478] uppercase mt-2">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 border-t border-[#242c4a]/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-3xl tracking-[3px] gradient-text text-center mb-16">
            Real Algorithms
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['Load flow', 'Newton-Raphson · Y-bus · IEEE test cases'],
              ['Dispatch', 'Economic · λ-iteration · unit commitment'],
              ['Short circuit', 'IEC 60909 · peak current · kappa factor'],
              ['Renewables', 'Wind power curve · solar PVWatts · Weibull'],
              ['Storage', 'Battery dispatch · SOC · arbitrage'],
              ['Stability', 'Swing equation · RK4 · critical angle'],
            ].map(([t, d]) => (
              <div
                key={t}
                className="p-6 rounded-lg border border-[#242c4a] bg-gradient-to-b from-[#1a2038]/60 to-[#101426]/40 hover:border-[#ffb84d]/60 hover:shadow-lg hover:shadow-[#ffb84d]/10 transition"
              >
                <div className="font-display font-bold text-[#ffb84d] mb-2">{t}</div>
                <div className="text-sm text-[#8a95b8] leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t border-[#242c4a]/60 text-center font-mono text-[10px] tracking-widest text-[#4a5478] uppercase">
        VOLTAIC · Built with Next.js 14 · Supabase · Stripe
      </footer>
    </main>
  );
}
