import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const TOOLS = [
  { href: '/align',     name: 'Alignment', icon: '⚡', desc: 'Gotoh · BLOSUM62' },
  { href: '/crispr',    name: 'CRISPR',    icon: '✂', desc: 'Doench 2014 · CFD' },
  { href: '/translate', name: 'Translate', icon: '🔤', desc: '6 codes · ORF finder' },
  { href: '/primers',   name: 'Primers',   icon: '🧪', desc: 'SantaLucia Tm' },
  { href: '/parse',     name: 'File I/O',  icon: '📁', desc: 'FASTA · FASTQ · PDB' },
  { href: '/projects',  name: 'Projects',  icon: '💾', desc: 'Saved work' },
];

export default async function Dashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display font-black text-3xl tracking-[3px] gradient-text mb-2">
          Workbench
        </h1>
        <p className="text-sm text-[#4a5478] font-mono uppercase tracking-widest mb-12">
          {user?.email ?? 'Not signed in'}
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="p-6 rounded-lg border border-[#1a3328] bg-[#0a1a14]/60 hover:border-[#00ff9d]/60 hover:shadow-lg hover:shadow-[#00ff9d]/10 transition group"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition">{t.icon}</div>
              <div className="font-display font-bold text-[#00ff9d] mb-1">{t.name}</div>
              <div className="text-xs text-[#8a95b8] font-mono">{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
