import { NextRequest, NextResponse } from 'next/server';
import { fetchMetaAdInsights, getActionValue, getActionMonetaryValue } from '@/lib/metaApi';
import { fetchAdsetLocations, normalizeAdsetName } from '@/lib/adsetLocations';
import { classifyCountry, classifyBusinessLine } from '@/lib/classify';

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
    const [rows, locations] = await Promise.all([
      fetchMetaAdInsights({ since, until }),
      fetchAdsetLocations(),
    ]);

    const enriched = rows.map((row) => {
      // La ciudad/país se busca por el ADSET al que pertenece el anuncio,
      // no por el nombre del anuncio en sí — la planilla mapea a nivel adset.
      const location = locations.map.get(normalizeAdsetName(row.adset_name));

      let country: string;
      let city: string | null;

      if (location) {
        country = location.country;
        city = location.city;
      } else {
        const fallback = classifyCountry(row.campaign_name);
        country = fallback.countryLabel;
        city = null;
      }

      return {
        adId: row.ad_id,
        adName: row.ad_name,
        adsetId: row.adset_id,
        adsetName: row.adset_name,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        businessLine: classifyBusinessLine(row.campaign_name),
        country,
        city,
        spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        purchases: getActionValue(row, 'omni_purchase'),
        purchaseValue: getActionMonetaryValue(row, 'omni_purchase'),
        landingPageViews: getActionValue(row, 'landing_page_view'),
      };
    });

    return NextResponse.json({ data: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
