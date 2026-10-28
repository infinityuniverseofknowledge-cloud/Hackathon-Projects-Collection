import { NextResponse, type NextRequest } from 'next/server';
import { economicDispatch, type GenUnit } from '@/lib/power';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { units, loadMW } = body as { units: GenUnit[]; loadMW: number };

    if (!units || !Array.isArray(units) || units.length === 0) {
      return NextResponse.json({ error: 'units required' }, { status: 400 });
    }
    if (typeof loadMW !== 'number' || loadMW < 0) {
      return NextResponse.json({ error: 'loadMW required (positive)' }, { status: 400 });
    }

    const result = economicDispatch(units, loadMW);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
