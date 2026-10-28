import { NextResponse, type NextRequest } from 'next/server';
import { holtWinters } from '@/lib/power';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, seasonLength = 24, horizon = 24 } = body;
    if (!Array.isArray(data) || data.length < 2) {
      return NextResponse.json({ error: 'data array required (min 2 points)' }, { status: 400 });
    }
    const result = holtWinters(data, seasonLength, horizon);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
