import { NextResponse, type NextRequest } from 'next/server';
import { findGuides, findOffTargets } from '@/lib/bio';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sequence, pam = 'NGG', offTargetFor } = body;

    if (!sequence) return NextResponse.json({ error: 'sequence required' }, { status: 400 });
    if (sequence.length > 50000) {
      return NextResponse.json({ error: 'Sequence too long (max 50,000)' }, { status: 413 });
    }

    const guides = findGuides(sequence, pam).slice(0, 500);

    let offTargets: unknown[] = [];
    if (offTargetFor) {
      offTargets = findOffTargets(offTargetFor, sequence, 3).slice(0, 200);
    }

    return NextResponse.json({ guides, offTargets, count: guides.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
