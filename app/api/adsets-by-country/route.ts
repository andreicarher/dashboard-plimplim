import { NextRequest, NextResponse } from 'next/server';
import { fetchMetaAdsetInsights, fetchAdsetStatuses, getActionValue, getActionMonetaryValue } from '@/lib/metaApi';
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
    const [rows, locations, statuses] = await Promise.all([
      fetchMetaAdsetInsights({ since, until }),
      fetchAdsetLocations(),
      fetchAdsetStatuses().catch(() => new Map<string, string>()),
    ]);

    let unmatchedCount = 0;

    const enriched = rows.map((row) => {
      const location = locations.map.get(normalizeAdsetName(row.adset_name));

      let country: string;
      let city: string | null;
      let countryConfidence: 'high' | 'low';

      if (location) {
        // La planilla es la fuente autoritativa de ciudad — y de país cuando hay match exacto.
        country = location.country;
        city = location.city;
        countryConfidence = 'high';
      } else {
        // Sin match en la planilla: no hay ciudad posible, y el país cae al clasificador
        // por nombre de campaña (misma lógica que el resto del dashboard), como respaldo.
        const fallback = classifyCountry(row.campaign_name);
        country = fallback.countryLabel;
        city = null;
        countryConfidence = fallback.confidence;
        unmatchedCount++;
      }

      return {
        adsetId: row.adset_id,
        adsetName: row.adset_name,
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        businessLine: classifyBusinessLine(row.campaign_name),
        country,
        city,
        countryConfidence,
        spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        purchases: getActionValue(row, 'omni_purchase'),
        purchaseValue: getActionMonetaryValue(row, 'omni_purchase'),
        appInstalls: getActionValue(row, 'omni_app_install'),
        landingPageViews: getActionValue(row, 'landing_page_view'),
        status: statuses.get(row.adset_id) || 'DESCONOCIDO',
      };
    });

    return NextResponse.json({
      data: enriched,
      unmatchedCount,
      conflicts: locations.conflicts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
