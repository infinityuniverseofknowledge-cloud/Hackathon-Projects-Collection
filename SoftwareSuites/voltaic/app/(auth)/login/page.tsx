'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + '/callback' },
    });
    setLoading(false);
    setMsg(error ? error.message : 'Check your email for the magic link.');
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="font-display font-black text-3xl tracking-[3px] gradient-text mb-8 text-center">
          Sign in
        </h1>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="engineer@utility.com"
          className="w-full px-4 py-3 bg-black border border-[#242c4a] rounded font-mono text-[#ffb84d] mb-4 focus:border-[#ffb84d] outline-none"
        />
        <button
          disabled={loading}
          className="w-full py-3 rounded bg-gradient-to-br from-[#ffb84d] to-[#3ad6ff] text-[#070810] font-bold tracking-widest uppercase text-xs disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
        {msg && <p className="mt-4 text-sm text-[#8a95b8] text-center">{msg}</p>}
      </form>
    </main>
  );
}
