import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMetaAdInsights,
  fetchAdStatuses,
  fetchAdsetStatuses,
  fetchCampaignStatuses,
  getActionValue,
  getActionMonetaryValue,
} from '@/lib/metaApi';
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
    const [rows, locations, adStatuses, adsetStatuses, campaignStatuses] = await Promise.all([
      fetchMetaAdInsights({ since, until }),
      fetchAdsetLocations(),
      fetchAdStatuses().catch(() => new Map<string, string>()),
      fetchAdsetStatuses().catch(() => new Map<string, string>()),
      fetchCampaignStatuses().catch(() => new Map<string, string>()),
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

      const adStatus = adStatuses.get(row.ad_id) || 'DESCONOCIDO';
      const adsetStatus = adsetStatuses.get(row.adset_id) || 'DESCONOCIDO';
      const campaignStatus = campaignStatuses.get(row.campaign_id) || 'DESCONOCIDO';

      // "Activo" en el sentido de "realmente sirviendo" requiere que las TRES
      // capas (anuncio, ad set y campaña) estén activas — si cualquiera de
      // las tres está pausada, el anuncio no se está entregando en la
      // práctica, aunque las otras dos digan "ACTIVE".
      const isFullyActive = adStatus === 'ACTIVE' && adsetStatus === 'ACTIVE' && campaignStatus === 'ACTIVE';

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
        adStatus,
        adsetStatus,
        campaignStatus,
        isFullyActive,
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
