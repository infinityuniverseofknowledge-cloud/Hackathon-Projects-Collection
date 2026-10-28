import { NextResponse, type NextRequest } from 'next/server';
import { newtonRaphson, ieee9, textbook3Bus } from '@/lib/power';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let cs;
    if (body.preset === 'ieee9') cs = ieee9();
    else if (body.preset === 'textbook3') cs = textbook3Bus();
    else cs = body.case;

    if (!cs) return NextResponse.json({ error: 'No case provided' }, { status: 400 });
    if (cs.buses && cs.buses.length > 500) {
      return NextResponse.json({ error: 'Too many buses (max 500)' }, { status: 413 });
    }

    const t0 = Date.now();
    const result = newtonRaphson(cs, { tol: 1e-8, maxIter: 30 });
    const duration = Date.now() - t0;

    return NextResponse.json({ ...result, duration_ms: duration });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
