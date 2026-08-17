'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import KpiCard from './KpiCard';
import CountryTable from './CountryTable';
import Sidebar, { NavItem } from './Sidebar';
import Ga4Panel from './Ga4Panel';
import Ga4CountryTable from './Ga4CountryTable';
import CityBreakdown, { AdsetRow } from './CityBreakdown';
import TopAdsets, { AdRow } from './TopAdsets';

interface InsightRow {
  campaignId: string;
  campaignName: string;
  dateStart: string;
  dateStop: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  appInstalls: number;
  landingPageViews: number;
  country: string;
  countryConfidence: 'high' | 'low';
  businessLine: NavItem;
}

interface Ga4Metrics {
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

type RangePreset =
  | 'today'
  | 'yesterday'
  | '7'
  | '14'
  | '30'
  | 'lastMonth'
  | 'thisMonth'
  | 'allTime'
  | 'custom';

const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  '7': 'Últimos 7 días',
  '14': 'Últimos 14 días',
  '30': 'Últimos 30 días',
  lastMonth: 'Mes pasado',
  thisMonth: 'Mes actual',
  allTime: 'Todo el histórico',
  custom: 'Personalizado…',
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return fmtDate(new Date());
}

function presetToDates(preset: RangePreset): { since: string; until: string } {
  const today = new Date();

  switch (preset) {
    case 'today':
      return { since: fmtDate(today), until: fmtDate(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { since: fmtDate(y), until: fmtDate(y) };
    }
    case '7':
    case '14':
    case '30': {
      const since = new Date(today);
      since.setDate(since.getDate() - parseInt(preset, 10));
      return { since: fmtDate(since), until: fmtDate(today) };
    }
    case 'lastMonth': {
      // Mes calendario completo anterior: día 1 al último día del mes pasado.
      const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfLastMonth = new Date(firstOfThisMonth);
      lastOfLastMonth.setDate(lastOfLastMonth.getDate() - 1);
      const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
      return { since: fmtDate(firstOfLastMonth), until: fmtDate(lastOfLastMonth) };
    }
    case 'thisMonth': {
      const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { since: fmtDate(firstOfThisMonth), until: fmtDate(today) };
    }
    case 'allTime':
      // Sin fecha de inicio real de la cuenta a mano, se usa 2015-01-01 como
      // "bien antes de que existiera cualquier campaña" (confirmado con Andrei).
      return { since: '2015-01-01', until: fmtDate(today) };
    default:
      return { since: fmtDate(today), until: fmtDate(today) };
  }
}

const COLORS = ['#2E86DE', '#F7941D', '#ED1C24', '#1F9E8E', '#1B4F91', '#FDC500'];

interface Totals {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  appInstalls: number;
  landingPageViews: number;
  ctr: number; // %
  cpm: number; // ARS
  frequency: number;
  roas: number;
}

function computeTotals(rows: InsightRow[]): Totals {
  const sums = rows.reduce(
    (acc, r) => ({
      spend: acc.spend + r.spend,
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      reach: acc.reach + r.reach,
      purchases: acc.purchases + r.purchases,
      purchaseValue: acc.purchaseValue + r.purchaseValue,
      appInstalls: acc.appInstalls + r.appInstalls,
      landingPageViews: acc.landingPageViews + r.landingPageViews,
    }),
    {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      purchases: 0,
      purchaseValue: 0,
      appInstalls: 0,
      landingPageViews: 0,
    }
  );

  // Derivadas SIEMPRE a partir de las sumas crudas, nunca promediando promedios.
  const ctr = sums.impressions > 0 ? (sums.clicks / sums.impressions) * 100 : 0;
  const cpm = sums.impressions > 0 ? (sums.spend / sums.impressions) * 1000 : 0;
  const frequency = sums.reach > 0 ? sums.impressions / sums.reach : 0;
  const roas = sums.spend > 0 ? sums.purchaseValue / sums.spend : 0;

  return { ...sums, ctr, cpm, frequency, roas };
}

function fmtArs(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

/** Tooltip del gráfico de barras, formateado como moneda ARS en vez del número crudo. */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-panel border border-line rounded-lg px-3 py-2 text-sm shadow">
      <p className="font-medium text-ink">{label}</p>
      <p className="font-mono text-plimBlue">{fmtArs(payload[0].value)}</p>
    </div>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [customSince, setCustomSince] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customUntil, setCustomUntil] = useState(todayStr());
  const [activeNav, setActiveNav] = useState<NavItem>('Shows');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [ga4, setGa4] = useState<Ga4Metrics | null>(null);
  const [ga4Error, setGa4Error] = useState<string | null>(null);
  const [arsToUsd, setArsToUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos a nivel AD SET (con país/ciudad cruzados desde la planilla) — se
  // comparten entre el gráfico "Gasto por país", el desglose por ciudad y el
  // ranking de mejores ad sets, para no repetir el fetch tres veces.
  const [adsetRows, setAdsetRows] = useState<AdsetRow[]>([]);
  const [adsetsConflicts, setAdsetsConflicts] = useState<
    Array<{ adsetName: string; entries: Array<{ countryCode: string; country: string; city: string }> }>
  >([]);
  const [adsetsUnmatched, setAdsetsUnmatched] = useState(0);
  const [locationsLoaded, setLocationsLoaded] = useState<number | null>(null);
  const [locationsDebug, setLocationsDebug] = useState<{
    rawRowCount: number;
    headerPreview: string;
    sampleDataRow: string;
  } | null>(null);
  const [adsetsLoading, setAdsetsLoading] = useState(true);
  const [adsetsError, setAdsetsError] = useState<string | null>(null);

  const [adRows, setAdRows] = useState<AdRow[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);

  const [ga4CountryRows, setGa4CountryRows] = useState<
    Array<{ country: string; firstOpen: number; inAppPurchases: number; purchaseRevenueUsd: number }>
  >([]);
  const [ga4CountryLoading, setGa4CountryLoading] = useState(true);
  const [ga4CountryError, setGa4CountryError] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    return preset === 'custom' ? { since: customSince, until: customUntil } : presetToDates(preset);
  }, [preset, customSince, customUntil]);

  useEffect(() => {
    const { since, until } = dateRange;
    if (preset === 'custom' && (!since || !until || since > until)) return;

    setLoading(true);
    setError(null);
    setAdsetsLoading(true);
    setAdsetsError(null);

    Promise.all([
      fetch(`/api/meta-insights?since=${since}&until=${until}`).then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer datos de Meta');
        return json.data as InsightRow[];
      }),
      fetch('/api/exchange-rate')
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Error al traer el tipo de cambio');
          return json.arsToUsd as number;
        })
        .catch(() => null),
    ])
      .then(([insightRows, rate]) => {
        setRows(insightRows);
        setArsToUsd(rate);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch(`/api/adsets-by-country?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer el desglose por ad set');
        setAdsetRows(json.data);
        setAdsetsConflicts(json.conflicts || []);
        setAdsetsUnmatched(json.unmatchedCount || 0);
        setLocationsLoaded(typeof json.locationsLoaded === 'number' ? json.locationsLoaded : null);
        setLocationsDebug(json.locationsDebug || null);
      })
      .catch((err) => setAdsetsError(err.message))
      .finally(() => setAdsetsLoading(false));

  }, [preset, customSince, customUntil]);

  // Panel general de GA4: activo SOLO en la vista App — GA4 mide uso de la
  // app en sí, no tiene sentido mostrarlo en Shows/Canal WA/Campañas Temporada.
  useEffect(() => {
    if (activeNav !== 'App') {
      setGa4(null);
      setGa4Error(null);
      return;
    }

    const { since, until } = dateRange;
    if (preset === 'custom' && (!since || !until || since > until)) return;

    setGa4Error(null);
    fetch(`/api/ga4-insights?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer datos de GA4');
        setGa4(json.data as Ga4Metrics);
      })
      .catch((err) => setGa4Error(err.message));
  }, [activeNav, dateRange, preset]);

  // Fetch de anuncios individuales SOLO en Shows y Canal WA — es la llamada
  // más pesada a Meta (nivel "ad", el más granular), y pedirla en cada carga
  // sin importar la vista contribuía a agotar el límite de peticiones de la
  // app. Solo se necesita para "Mejores anuncios", exclusivo de esas dos vistas.
  useEffect(() => {
    if (activeNav !== 'Canal WA' && activeNav !== 'Shows') {
      setAdRows([]);
      return;
    }

    const { since, until } = dateRange;
    if (preset === 'custom' && (!since || !until || since > until)) return;

    setAdsLoading(true);
    setAdsError(null);
    fetch(`/api/ads-by-country?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer anuncios');
        setAdRows(json.data);
      })
      .catch((err) => setAdsError(err.message))
      .finally(() => setAdsLoading(false));
  }, [activeNav, dateRange, preset]);

  // Desglose por país de GA4 (dimensión nativa de GA4, no la de Meta) —
  // solo se necesita en la vista App, así que solo se pide ahí.
  useEffect(() => {
    if (activeNav !== 'App') {
      setGa4CountryRows([]);
      return;
    }

    const { since, until } = dateRange;
    if (preset === 'custom' && (!since || !until || since > until)) return;

    setGa4CountryLoading(true);
    setGa4CountryError(null);
    fetch(`/api/ga4-country-breakdown?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer el desglose por país de GA4');
        setGa4CountryRows(json.data);
      })
      .catch((err) => setGa4CountryError(err.message))
      .finally(() => setGa4CountryLoading(false));
  }, [activeNav, dateRange, preset]);

  const filteredRows = useMemo(
    () => rows.filter((r) => r.businessLine === activeNav),
    [rows, activeNav]
  );

  const totals = useMemo(() => computeTotals(filteredRows), [filteredRows]);

  const byCountry = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        spend: number;
        reach: number;
        impressions: number;
        clicks: number;
        landingPageViews: number;
        purchases: number;
        purchaseValue: number;
        lowConfidenceCount: number;
      }
    >();

    for (const r of filteredRows) {
      const existing = map.get(r.country) || {
        country: r.country,
        spend: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
        landingPageViews: 0,
        purchases: 0,
        purchaseValue: 0,
        lowConfidenceCount: 0,
      };
      existing.spend += r.spend;
      existing.reach += r.reach;
      existing.impressions += r.impressions;
      existing.clicks += r.clicks;
      existing.landingPageViews += r.landingPageViews;
      existing.purchases += r.purchases;
      existing.purchaseValue += r.purchaseValue;
      if (r.countryConfidence === 'low') existing.lowConfidenceCount += 1;
      map.set(r.country, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [filteredRows]);

  const filteredAdsetRows = useMemo(
    () => adsetRows.filter((r) => r.businessLine === activeNav),
    [adsetRows, activeNav]
  );

  const filteredAdRows = useMemo(
    () => adRows.filter((r) => r.businessLine === activeNav),
    [adRows, activeNav]
  );

  // Gasto por país usando el país REAL por ad set (vía planilla), no el nombre
  // de campaña. Esto es lo que permite desglosar campañas "RO_LATAM_..." en
  // sus países reales en vez de agruparlas como "LATAM (consolidado)".
  const spendByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredAdsetRows) {
      map.set(r.country, (map.get(r.country) || 0) + r.spend);
    }
    return Array.from(map.entries())
      .map(([country, spend]) => ({ country, spend: Math.round(spend) }))
      .sort((a, b) => b.spend - a.spend);
  }, [filteredAdsetRows]);

  const unclassifiedCount = useMemo(
    () => filteredRows.filter((r) => r.country === 'Sin clasificar').length,
    [filteredRows]
  );

  const fmtUsd = (arsAmount: number) =>
    arsToUsd
      ? (arsAmount * arsToUsd).toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        })
      : undefined;

  const fmtInt = (n: number) => Math.round(n).toLocaleString('es-AR');
  const fmtPct = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
  const fmtDec = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });

  // Tarjetas de KPI específicas por línea de negocio, según lo pedido:
  // App: Inversión, Alcance, Descargas, Compras en la app, Valor de las compras, ROAS
  // Shows: Inversión (ARS + USD debajo), Alcance, Impresiones, Frecuencia, CPM (ARS + USD debajo),
  //        Clics, CTR, Landing page views, Compras
  // Canal WA: Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia, Visitas a la página
  // Campañas Temporada: Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia
  interface KpiCardSpec {
    label: string;
    value: string;
    usdValue?: string;
    note?: string;
    accent: 'coral' | 'teal' | 'indigo' | 'amber';
  }

  const kpiCards: KpiCardSpec[] = useMemo(() => {
    const t = totals;

    if (activeNav === 'App') {
      // Inversión y Alcance vienen de Meta (son métricas de entrega de la
      // pauta). Descargas, compradores y valor de compras vienen de GA4 —
      // porque son eventos de USO de la app en sí, y GA4/Firebase sí los está
      // registrando correctamente (a diferencia de Meta, que para esta cuenta
      // no trae action_type de instalación/compra en absoluto).
      //
      // IMPORTANTE sobre moneda: purchaseRevenue de GA4 viene nativamente en
      // USD (no en ARS como el resto del dashboard). Por eso NO se le aplica
      // fmtUsd (que espera un monto en ARS y lo convierte a USD) — ya está en
      // USD. Para mostrar el equivalente en ARS (y para que el ROAS compare
      // manzanas con manzanas) se hace la conversión inversa: ARS = USD / tasa.
      const ga4Installs = ga4?.keyEventsFirstOpen ?? 0;
      const ga4InAppPurchases = ga4?.keyEventsInAppPurchase ?? 0;
      const ga4RevenueUsd = ga4?.purchaseRevenue ?? 0;
      const ga4FirstTimePurchasers = ga4?.firstTimePurchasers ?? 0;
      const ga4TotalPurchasers = ga4?.totalPurchasers ?? 0;

      const ga4RevenueArs = arsToUsd ? ga4RevenueUsd / arsToUsd : null;
      const fmtUsdDirect = (usd: number) =>
        usd.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

      // Gasto de Meta convertido a USD para poder dividir USD/USD, no USD/ARS.
      const spendUsd = arsToUsd ? t.spend * arsToUsd : null;
      const roasGa4 = spendUsd && spendUsd > 0 ? ga4RevenueUsd / spendUsd : 0;

      return [
        { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Descargas (first_open, GA4)', value: fmtInt(ga4Installs), accent: 'amber' },
        { label: 'Compradores 1ra vez (GA4)', value: fmtInt(ga4FirstTimePurchasers), accent: 'teal' },
        { label: 'Total de compradores (GA4)', value: fmtInt(ga4TotalPurchasers), accent: 'teal' },
        { label: 'Compras en la app (GA4)', value: fmtInt(ga4InAppPurchases), accent: 'teal' },
        {
          label: 'Valor de las compras (GA4)',
          value: ga4RevenueArs !== null ? fmtArs(ga4RevenueArs) : fmtUsdDirect(ga4RevenueUsd),
          usdValue: ga4RevenueArs !== null ? fmtUsdDirect(ga4RevenueUsd) : undefined,
          accent: 'teal',
        },
        { label: 'ROAS (GA4 revenue / Meta spend)', value: `${fmtDec(roasGa4)}x`, accent: 'amber' },
      ];
    }

    if (activeNav === 'Shows') {
      return [
        { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
        { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
        { label: 'CPM', value: fmtArs(t.cpm), usdValue: fmtUsd(t.cpm), accent: 'amber' },
        { label: 'Clics', value: fmtInt(t.clicks), accent: 'indigo' },
        { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
        { label: 'Landing page views', value: fmtInt(t.landingPageViews), accent: 'teal' },
        { label: 'Compras', value: fmtInt(t.purchases), note: 'Solo campañas con conversión de compra activa en Meta (ej. Chile)', accent: 'teal' },
        { label: 'Valor de las compras', value: fmtArs(t.purchaseValue), usdValue: fmtUsd(t.purchaseValue), note: 'Solo campañas con conversión de compra activa en Meta (ej. Chile)', accent: 'teal' },
      ];
    }

    if (activeNav === 'Canal WA') {
      return [
        { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
        { label: 'CPM', value: fmtArs(t.cpm), usdValue: fmtUsd(t.cpm), accent: 'amber' },
        { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
        { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
        { label: 'Visitas a la página', value: fmtInt(t.landingPageViews), accent: 'teal' },
      ];
    }

    // Campañas Temporada
    return [
      { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
      { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
      { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
      { label: 'CPM', value: fmtArs(t.cpm), usdValue: fmtUsd(t.cpm), accent: 'amber' },
      { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
      { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
    ];
  }, [totals, activeNav, arsToUsd, ga4]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-paper">
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      <main className="flex-1 px-6 md:px-10 py-8 max-w-5xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl text-ink">{activeNav}</h1>
            <p className="text-muted text-sm">
              Plim Plim · LATAM · datos en vivo desde Meta Ads · montos en ARS
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as RangePreset)}
              className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm font-medium min-w-[180px]"
            >
              {(Object.keys(RANGE_PRESET_LABELS) as RangePreset[]).map((p) => (
                <option key={p} value={p}>
                  {RANGE_PRESET_LABELS[p]}
                </option>
              ))}
            </select>
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customSince}
                  max={customUntil}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-line bg-panel text-sm text-ink"
                />
                <span className="text-muted text-sm">a</span>
                <input
                  type="date"
                  value={customUntil}
                  min={customSince}
                  max={todayStr()}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-line bg-panel text-sm text-ink"
                />
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-plimRed bg-plimRed/10 text-plimRed px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {unclassifiedCount > 0 && (
          <div className="mb-6 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
            ⚠ Hay <strong>{unclassifiedCount}</strong> fila(s) de campaña sin clasificar por país. No
            se les asignó un país al azar — revisa el nombre de esas campañas en Meta Ads Manager.
          </div>
        )}

        {loading ? (
          <p className="text-muted text-sm">Cargando datos en vivo desde Meta y GA4…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-muted text-sm">
            No hay campañas de &quot;{activeNav}&quot; en este rango de fechas.
          </p>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {kpiCards.map((c) => (
                <KpiCard key={c.label} label={c.label} value={c.value} usdValue={c.usdValue} note={c.note} accent={c.accent} />
              ))}
            </section>

            <CityBreakdown
              activeNav={activeNav}
              arsToUsd={arsToUsd}
              rows={adsetRows}
              conflicts={adsetsConflicts}
              locationsLoaded={locationsLoaded}
              locationsDebug={locationsDebug}
              loading={adsetsLoading}
              error={adsetsError}
            />

            {(activeNav === 'Canal WA' || activeNav === 'Shows') && !adsLoading && !adsError && (
              <TopAdsets
                rows={filteredAdRows}
                title={`Mejores anuncios — ${activeNav}`}
              />
            )}

            {activeNav === 'App' && ga4Error ? (
              <div className="mb-8 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
                GA4 no respondió: {ga4Error}. Revisa GA4_PROPERTY_ID, GA4_CLIENT_EMAIL y GA4_PRIVATE_KEY,
                y que la cuenta de servicio tenga acceso de Viewer a la propiedad.
              </div>
            ) : activeNav === 'App' && ga4 ? (
              <Ga4Panel metrics={ga4} />
            ) : null}

            {activeNav === 'App' && (
              <Ga4CountryTable
                rows={ga4CountryRows}
                arsToUsd={arsToUsd}
                loading={ga4CountryLoading}
                error={ga4CountryError}
              />
            )}

            <section className="bg-panel rounded-xl border border-line p-5 mb-8">
              <h2 className="text-sm font-semibold text-ink mb-4">Gasto por país (ARS)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={spendByCountry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5D061" vertical={false} />
                  <XAxis dataKey="country" tick={{ fontSize: 12, fill: '#8A6D1F' }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#8A6D1F' }}
                    tickFormatter={(v) => `$${(v / 1000).toLocaleString('es-AR')}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                    {spendByCountry.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-ink mb-4">Detalle por país</h2>
              <CountryTable rows={byCountry} arsToUsd={arsToUsd} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
