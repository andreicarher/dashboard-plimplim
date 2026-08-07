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

const MAIN_METRICS = [
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
  'firstTimePurchasers',
  'totalPurchasers',
  'purchaseRevenue',
];

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
    metrics: MAIN_METRICS.map((name) => ({ name })),
  });

  const mainRow = mainReport.rows?.[0];
  const getMainValue = (metricName: string): number => {
    const idx = MAIN_METRICS.indexOf(metricName);
    const raw = mainRow?.metricValues?.[idx]?.value;
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
