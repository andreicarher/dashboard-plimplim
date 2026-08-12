import { NextRequest, NextResponse } from 'next/server';
import { fetchGa4CountryBreakdown } from '@/lib/ga4Api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const until = searchParams.get('until');

  if (!since || !until) {
    return NextResponse.json(
      { error: 'Parámetros "since" y "until" son requeridos (formato YYYY-MM-DD).' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchGa4CountryBreakdown(since, until);
    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
