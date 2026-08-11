import { NextRequest, NextResponse } from 'next/server';
import { fetchMetaInsights, getActionValue, getActionMonetaryValue } from '@/lib/metaApi';
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

    // IMPORTANTE: devolvemos valores CRUDOS (sumas), no promedios (CTR, CPM, frecuencia).
    // Promediar promedios de distintas semanas/campañas da un número incorrecto.
    // El cliente suma spend/impressions/clicks/reach y RECIÉN AHÍ deriva CTR, CPM y frecuencia.
    const appActionTypesSeen = new Set<string>();

    const enriched = rows.map((row) => {
      const classified = classifyCampaign(row.campaign_id, row.campaign_name);

      // Diagnóstico temporal: guardamos qué action_type reales trae Meta para
      // campañas de App, porque "Descargas"/"Compras"/"Valor" dan 0 y puede ser
      // que Meta use un nombre de evento distinto a 'omni_app_install'/'omni_purchase'
      // para este ad account en particular (varía según cómo esté configurado el
      // App Events / SDK de la app en Meta).
      if (classified.businessLine === 'App') {
        for (const a of row.actions || []) appActionTypesSeen.add(`actions: ${a.action_type}`);
        for (const a of row.action_values || []) appActionTypesSeen.add(`action_values: ${a.action_type}`);
      }

      return {
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        dateStart: row.date_start,
        dateStop: row.date_stop,
        spend: parseFloat(row.spend || '0'),
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        reach: parseInt(row.reach || '0', 10),
        purchases: getActionValue(row, 'omni_purchase'),
        purchaseValue: getActionMonetaryValue(row, 'omni_purchase'),
        appInstalls: getActionValue(row, 'omni_app_install'),
        landingPageViews: getActionValue(row, 'landing_page_view'),
        country: classified.country.countryLabel,
        countryConfidence: classified.country.confidence,
        businessLine: classified.businessLine,
      };
    });

    return NextResponse.json({
      data: enriched,
      appActionTypesDebug: Array.from(appActionTypesSeen).sort(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
