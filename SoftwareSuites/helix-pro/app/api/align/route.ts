import { NextResponse, type NextRequest } from 'next/server';
import { gotoh, smithWaterman } from '@/lib/bio';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seqA, seqB, algorithm = 'gotoh', gapOpen = -11, gapExtend = -1 } = body;

    if (!seqA || !seqB) {
      return NextResponse.json({ error: 'seqA and seqB required' }, { status: 400 });
    }
    if (seqA.length > 10000 || seqB.length > 10000) {
      return NextResponse.json({ error: 'Sequences too long (max 10,000)' }, { status: 413 });
    }

    const t0 = Date.now();
    const result = algorithm === 'sw'
      ? smithWaterman(seqA, seqB, { gapOpen, gapExtend })
      : gotoh(seqA, seqB, { gapOpen, gapExtend });
    const duration = Date.now() - t0;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('alignments').insert({
          user_id: user.id,
          seq_a: seqA.slice(0, 500),
          seq_b: seqB.slice(0, 500),
          algorithm,
          score: result.score,
          identity: result.identity,
        });
      }
    } catch {}

    return NextResponse.json({ ...result, duration_ms: duration });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
