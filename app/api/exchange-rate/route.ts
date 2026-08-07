import { NextResponse } from 'next/server';
import { fetchArsToUsdRate } from '@/lib/exchangeRate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rate = await fetchArsToUsdRate();
    return NextResponse.json({ arsToUsd: rate });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
