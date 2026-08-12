import { BetaAnalyticsDataClient } from '@google-analytics/data';

/**
 * IMPORTANTE sobre "tiempo real":
 * El API de Realtime de GA4 (runRealtimeReport) SOLO soporta un puñado de métricas
 * (activeUsers, eventCount, screenPageViews, keyEvents) sobre los últimos ~30 minutos.
 * La mayoría de las métricas pedidas (bounceRate, sessions, purchaseRevenue,
 * firstTimePurchasers, etc.) NO existen en Realtime — solo están en el Reporting API
 * estándar (runReport), que refleja datos procesados con datos intradía (normalmente
 * disponibles en un plazo de horas, no al instante). Este dashboard usa runReport
 * para poder traer el set completo de métricas pedidas, con el rango de fechas
 * seleccionado — no es "en vivo al segundo" para todas las métricas, es "casi en
 * tiempo real" (intradía) como el resto de reportes de GA4.
 */

function getClient(): BetaAnalyticsDataClient {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan GA4_CLIENT_EMAIL o GA4_PRIVATE_KEY en las variables de entorno.');
  }

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

// GA4 permite máximo 10 métricas por consulta (nested request). Con 13 métricas
// pedidas, hay que dividirlas en dos lotes y hacer dos llamadas a runReport.
const MAIN_METRICS_BATCH_1 = [
  'activeUsers',
  'bounceRate',
  'engagedSessions',
  'engagementRate',
  'newUsers',
  'screenPageViews',
  'screenPageViewsPerSession',
  'sessions',
  'sessionsPerUser',
  'totalUsers',
];

const MAIN_METRICS_BATCH_2 = ['firstTimePurchasers', 'totalPurchasers', 'purchaseRevenue'];

const KEY_EVENTS = ['first_open', 'in_app_purchase', 'purchase'];

export interface Ga4Metrics {
  activeUsers: number;
  bounceRate: number;
  engagedSessions: number;
  engagementRate: number;
  newUsers: number;
  views: number;
  viewsPerSession: number;
  sessions: number;
  sessionsPerUser: number;
  totalUsers: number;
  firstTimePurchasers: number;
  totalPurchasers: number;
  purchaseRevenue: number;
  keyEventsFirstOpen: number;
  keyEventsInAppPurchase: number;
  keyEventsPurchase: number;
  sessionKeyEventRateFirstOpen: number;
}

export async function fetchGa4Metrics(since: string, until: string): Promise<Ga4Metrics> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('Falta GA4_PROPERTY_ID en las variables de entorno.');
  }

  const client = getClient();

  const [mainReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    metrics: MAIN_METRICS_BATCH_1.map((name) => ({ name })),
  });

  const [batch2Report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    metrics: MAIN_METRICS_BATCH_2.map((name) => ({ name })),
  });

  const batch1Row = mainReport.rows?.[0];
  const batch2Row = batch2Report.rows?.[0];

  const getMainValue = (metricName: string): number => {
    const idx1 = MAIN_METRICS_BATCH_1.indexOf(metricName);
    if (idx1 !== -1) {
      const raw = batch1Row?.metricValues?.[idx1]?.value;
      return raw ? parseFloat(raw) : 0;
    }
    const idx2 = MAIN_METRICS_BATCH_2.indexOf(metricName);
    const raw = batch2Row?.metricValues?.[idx2]?.value;
    return raw ? parseFloat(raw) : 0;
  };

  const [eventsReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'keyEvents' }, { name: 'sessionKeyEventRate' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: KEY_EVENTS },
      },
    },
  });

  const eventValues = new Map<string, { keyEvents: number; sessionKeyEventRate: number }>();
  for (const row of eventsReport.rows || []) {
    const eventName = row.dimensionValues?.[0]?.value || '';
    const keyEvents = parseFloat(row.metricValues?.[0]?.value || '0');
    const sessionKeyEventRate = parseFloat(row.metricValues?.[1]?.value || '0');
    eventValues.set(eventName, { keyEvents, sessionKeyEventRate });
  }

  return {
    activeUsers: getMainValue('activeUsers'),
    bounceRate: getMainValue('bounceRate'),
    engagedSessions: getMainValue('engagedSessions'),
    engagementRate: getMainValue('engagementRate'),
    newUsers: getMainValue('newUsers'),
    views: getMainValue('screenPageViews'),
    viewsPerSession: getMainValue('screenPageViewsPerSession'),
    sessions: getMainValue('sessions'),
    sessionsPerUser: getMainValue('sessionsPerUser'),
    totalUsers: getMainValue('totalUsers'),
    firstTimePurchasers: getMainValue('firstTimePurchasers'),
    totalPurchasers: getMainValue('totalPurchasers'),
    purchaseRevenue: getMainValue('purchaseRevenue'),
    keyEventsFirstOpen: eventValues.get('first_open')?.keyEvents || 0,
    keyEventsInAppPurchase: eventValues.get('in_app_purchase')?.keyEvents || 0,
    keyEventsPurchase: eventValues.get('purchase')?.keyEvents || 0,
    sessionKeyEventRateFirstOpen: eventValues.get('first_open')?.sessionKeyEventRate || 0,
  };
}

/**
 * Desglose por país, usando la dimensión nativa "country" de GA4 (no la
 * segmentación por nombre de ad set de Meta) — exactamente la misma lógica
 * que un reporte de Looker Studio con esa dimensión.
 */
export interface Ga4CountryRow {
  country: string;
  firstOpen: number;
  inAppPurchases: number;
  purchaseRevenueUsd: number;
}

export async function fetchGa4CountryBreakdown(since: string, until: string): Promise<Ga4CountryRow[]> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('Falta GA4_PROPERTY_ID en las variables de entorno.');
  }

  const client = getClient();

  // Query A: conteo de first_open e in_app_purchase, desglosados por país.
  const [eventsReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: [{ name: 'country' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['first_open', 'in_app_purchase'] },
      },
    },
    limit: 250,
  });

  // Query B: ingresos por compra, desglosados por país (no necesita filtro de
  // evento — purchaseRevenue ya está scoped a eventos de compra).
  const [revenueReport] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'purchaseRevenue' }],
    limit: 250,
  });

  const byCountry = new Map<string, Ga4CountryRow>();

  for (const row of eventsReport.rows || []) {
    const country = row.dimensionValues?.[0]?.value || '(sin país)';
    const eventName = row.dimensionValues?.[1]?.value || '';
    const count = parseFloat(row.metricValues?.[0]?.value || '0');

    const existing = byCountry.get(country) || {
      country,
      firstOpen: 0,
      inAppPurchases: 0,
      purchaseRevenueUsd: 0,
    };
    if (eventName === 'first_open') existing.firstOpen = count;
    if (eventName === 'in_app_purchase') existing.inAppPurchases = count;
    byCountry.set(country, existing);
  }

  for (const row of revenueReport.rows || []) {
    const country = row.dimensionValues?.[0]?.value || '(sin país)';
    const revenue = parseFloat(row.metricValues?.[0]?.value || '0');

    const existing = byCountry.get(country) || {
      country,
      firstOpen: 0,
      inAppPurchases: 0,
      purchaseRevenueUsd: 0,
    };
    existing.purchaseRevenueUsd = revenue;
    byCountry.set(country, existing);
  }

  return Array.from(byCountry.values()).sort((a, b) => b.firstOpen - a.firstOpen);
}
