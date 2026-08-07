import { NextRequest, NextResponse } from 'next/server';
import { fetchMetaInsights, getActionValue } from '@/lib/metaApi';
import { classifyCampaign } from '@/lib/classify';

// Fuerza ejecución dinámica: cada request pega en vivo a la API de Meta, sin caché.
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
    const rows = await fetchMetaInsights({ since, until });

    const enriched = rows.map((row) => {
      const classified = classifyCampaign(row.campaign_id, row.campaign_name);
      return {
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        dateStart: row.date_start,
        dateStop: row.date_stop,
        spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        purchases: getActionValue(row, 'omni_purchase'),
        appInstalls: getActionValue(row, 'omni_app_install'),
        country: classified.country.countryLabel,
        countryConfidence: classified.country.confidence,
        businessLine: classified.businessLine,
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
