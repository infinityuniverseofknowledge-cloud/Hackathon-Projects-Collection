import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-40 flex items-center gap-8 px-6 md:px-12 py-5 border-b border-[#1a3328]/60 backdrop-blur">
        <Link href="/" className="font-display font-black text-xl tracking-[6px] gradient-text">
          HELIX PRO
        </Link>
        <div className="ml-auto flex items-center gap-6 text-xs font-mono uppercase tracking-widest text-[#8a95b8]">
          <Link href="/pricing" className="hover:text-[#5cffbb] transition">Pricing</Link>
          <Link href="/login" className="hover:text-[#5cffbb] transition">Sign in</Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded bg-gradient-to-br from-[#00ff9d] to-[#00ccff] text-[#020806] font-bold hover:shadow-lg hover:shadow-[#00ff9d]/40 transition"
          >
            Launch →
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00ff9d]/40 bg-[#00ff9d]/10 text-[#5cffbb] font-mono text-[10px] tracking-[2.5px] uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffbb00] shadow-[0_0_12px_#ffbb00]" />
          Bioinformatics Workbench · v1.0
        </div>
        <h1 className="font-display font-black text-6xl md:text-8xl tracking-[6px] mb-6 gradient-text">
          HELIX PRO
        </h1>
        <p className="text-xl md:text-2xl text-[#8a95b8] max-w-3xl mb-12 italic">
          Production-grade bioinformatics. Real algorithms. Modern UI. Deploy in 5 minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded bg-gradient-to-br from-[#00ff9d] to-[#00ccff] text-[#020806] font-bold tracking-widest uppercase text-sm hover:-translate-y-0.5 transition"
          >
            🧬 Enter Workbench
          </Link>
          <Link
            href="/pricing"
            className="px-8 py-4 rounded border border-[#2a5240] text-[#8a95b8] font-mono tracking-widest uppercase text-sm hover:border-[#b366ff] hover:text-[#cc99ff] transition"
          >
            ↓ See Pricing
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl w-full">
          {[
            ['12', 'Algorithms'],
            ['30', 'Enzymes'],
            ['6', 'Genetic codes'],
            ['100%', 'TypeScript'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <div className="font-display font-black text-3xl text-[#00ff9d]">{v}</div>
              <div className="font-mono text-[10px] tracking-[2px] text-[#4a5478] uppercase mt-2">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 border-t border-[#1a3328]/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display font-black text-3xl tracking-[3px] gradient-text text-center mb-16">
            Real Algorithms
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              ['Alignment', 'Gotoh affine gap · BLOSUM62 · Smith-Waterman'],
              ['CRISPR', 'Doench 2014 on-target · CFD off-target · PAM NGG'],
              ['Primers', 'SantaLucia 1998 nearest-neighbor Tm'],
              ['Translation', '6 genetic codes · ORF finder · 6 frames'],
              ['Restriction', '30 real enzymes · cut sites'],
              ['Motif', 'Position weight matrix · information content'],
            ].map(([t, d]) => (
              <div
                key={t}
                className="p-6 rounded-lg border border-[#1a3328] bg-gradient-to-b from-[#0f2a20]/60 to-[#0a1a14]/40 hover:border-[#00ff9d]/60 hover:shadow-lg hover:shadow-[#00ff9d]/10 transition"
              >
                <div className="font-display font-bold text-[#00ff9d] mb-2">{t}</div>
                <div className="text-sm text-[#8a95b8] leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t border-[#1a3328]/60 text-center font-mono text-[10px] tracking-widest text-[#4a5478] uppercase">
        HELIX PRO · Built with Next.js 14 · Supabase · Stripe
      </footer>
    </main>
  );
}
