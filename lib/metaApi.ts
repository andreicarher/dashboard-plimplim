const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';

export interface MetaInsightRow {
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

/**
 * Trae insights a nivel campaña para un rango de fechas, con desagregado semanal (time_increment=7).
 * Requiere META_ACCESS_TOKEN y META_AD_ACCOUNT_ID en variables de entorno del servidor.
 * Esta función SOLO debe llamarse desde código server-side (API routes), nunca desde el cliente.
 */
export async function fetchMetaInsights(params: {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}): Promise<MetaInsightRow[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    throw new Error(
      'Faltan META_ACCESS_TOKEN o META_AD_ACCOUNT_ID en las variables de entorno del servidor.'
    );
  }

  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'reach',
    'actions',
    'action_values',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('level', 'campaign');
  url.searchParams.set('time_increment', '7');
  url.searchParams.set('time_range', JSON.stringify({ since: params.since, until: params.until }));
  url.searchParams.set('limit', '500');
  url.searchParams.set('access_token', token);

  const allRows: MetaInsightRow[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res = await fetch(nextUrl, { cache: 'no-store' });
    const json: MetaInsightsResponse = await res.json();

    if (json.error) {
      throw new Error(`Meta API error (${json.error.code}): ${json.error.message}`);
    }

    allRows.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
  }

  return allRows;
}

export interface MetaAdsetInsightRow {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

interface MetaAdsetInsightsResponse {
  data: MetaAdsetInsightRow[];
  paging?: { next?: string };
  error?: { message: string; type: string; code: number };
}

/**
 * Trae insights a nivel AD SET (no campaña) para el cruce con la tabla de ciudades,
 * ya que la ciudad real de cada anuncio vive a nivel ad set, no de campaña.
 */
export async function fetchMetaAdsetInsights(params: {
  since: string;
  until: string;
}): Promise<MetaAdsetInsightRow[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    throw new Error(
      'Faltan META_ACCESS_TOKEN o META_AD_ACCOUNT_ID en las variables de entorno del servidor.'
    );
  }

  const fields = [
    'adset_id',
    'adset_name',
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'reach',
    'actions',
    'action_values',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('level', 'adset');
  url.searchParams.set('time_range', JSON.stringify({ since: params.since, until: params.until }));
  url.searchParams.set('limit', '500');
  url.searchParams.set('access_token', token);

  const allRows: MetaAdsetInsightRow[] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res = await fetch(nextUrl, { cache: 'no-store' });
    const json: MetaAdsetInsightsResponse = await res.json();

    if (json.error) {
      throw new Error(`Meta API error (${json.error.code}): ${json.error.message}`);
    }

    allRows.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
  }

  return allRows;
}
interface ActionsShape {
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

/** Extrae el valor de un action_type específico (ej. purchase, app installs) de la lista de actions. */
export function getActionValue(row: ActionsShape, actionType: string): number {
  const match = row.actions?.find((a) => a.action_type === actionType);
  return match ? parseFloat(match.value) : 0;
}

/** Extrae el monto monetario (no el conteo) de un action_type desde action_values. Útil para ROAS. */
export function getActionMonetaryValue(row: ActionsShape, actionType: string): number {
  const match = row.action_values?.find((a) => a.action_type === actionType);
  return match ? parseFloat(match.value) : 0;
}
