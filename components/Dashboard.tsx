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
import CityBreakdown from './CityBreakdown';

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

type RangePreset = '7' | '30' | '90' | 'custom';

function presetToDates(preset: RangePreset) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - parseInt(preset, 10));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(until) };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

export default function Dashboard() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [customSince, setCustomSince] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customUntil, setCustomUntil] = useState(todayStr());
  const [activeNav, setActiveNav] = useState<NavItem>('Todos');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [ga4, setGa4] = useState<Ga4Metrics | null>(null);
  const [ga4Error, setGa4Error] = useState<string | null>(null);
  const [arsToUsd, setArsToUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateRange = useMemo(() => {
    return preset === 'custom' ? { since: customSince, until: customUntil } : presetToDates(preset);
  }, [preset, customSince, customUntil]);

  useEffect(() => {
    const { since, until } = dateRange;
    if (preset === 'custom' && (!since || !until || since > until)) return;

    setLoading(true);
    setError(null);
    setGa4Error(null);

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
      fetch(`/api/ga4-insights?since=${since}&until=${until}`)
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Error al traer datos de GA4');
          return json.data as Ga4Metrics;
        })
        .catch((err) => {
          setGa4Error(err.message);
          return null;
        }),
    ])
      .then(([insightRows, rate, ga4Data]) => {
        setRows(insightRows);
        setArsToUsd(rate);
        setGa4(ga4Data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [preset, customSince, customUntil]);

  const filteredRows = useMemo(() => {
    if (activeNav === 'Todos') return rows;
    return rows.filter((r) => r.businessLine === activeNav);
  }, [rows, activeNav]);

  const totals = useMemo(() => computeTotals(filteredRows), [filteredRows]);

  const byCountryBusinessLine = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        businessLine: string;
        spend: number;
        clicks: number;
        purchases: number;
        appInstalls: number;
        lowConfidenceCount: number;
      }
    >();

    for (const r of filteredRows) {
      const key = `${r.country}__${r.businessLine}`;
      const existing = map.get(key) || {
        country: r.country,
        businessLine: r.businessLine,
        spend: 0,
        clicks: 0,
        purchases: 0,
        appInstalls: 0,
        lowConfidenceCount: 0,
      };
      existing.spend += r.spend;
      existing.clicks += r.clicks;
      existing.purchases += r.purchases;
      existing.appInstalls += r.appInstalls;
      if (r.countryConfidence === 'low') existing.lowConfidenceCount += 1;
      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [filteredRows]);

  const spendByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      map.set(r.country, (map.get(r.country) || 0) + r.spend);
    }
    return Array.from(map.entries())
      .map(([country, spend]) => ({ country, spend: Math.round(spend) }))
      .sort((a, b) => b.spend - a.spend);
  }, [filteredRows]);

  const unclassifiedCount = useMemo(
    () => filteredRows.filter((r) => r.country === 'Sin clasificar').length,
    [filteredRows]
  );

  const fmtArs = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

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
  // Shows: Inversión ARS, Inversión USD, Alcance, Impresiones, Frecuencia, CPM ARS, CPM USD,
  //        Clics, CTR, Landing page views, Compras
  // Canal WA ("Whats"): Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia, Visitas a la página
  // Campañas Temporada ("Otras") y Todos: Inversión, Alcance, Impresiones, CPM, CTR, Frecuencia
  interface KpiCardSpec {
    label: string;
    value: string;
    usdValue?: string;
    accent: 'coral' | 'teal' | 'indigo' | 'amber';
  }

  const kpiCards: KpiCardSpec[] = useMemo(() => {
    const t = totals;

    if (activeNav === 'App') {
      return [
        { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Descargas', value: fmtInt(t.appInstalls), accent: 'amber' },
        { label: 'Compras en la app', value: fmtInt(t.purchases), accent: 'teal' },
        { label: 'Valor de las compras', value: fmtArs(t.purchaseValue), usdValue: fmtUsd(t.purchaseValue), accent: 'teal' },
        { label: 'ROAS', value: `${fmtDec(t.roas)}x`, accent: 'amber' },
      ];
    }

    if (activeNav === 'Shows') {
      return [
        { label: 'Inversión ARS', value: fmtArs(t.spend), accent: 'coral' },
        { label: 'Inversión USD', value: fmtUsd(t.spend) || '—', accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
        { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
        { label: 'CPM ARS', value: fmtArs(t.cpm), accent: 'amber' },
        { label: 'CPM USD', value: fmtUsd(t.cpm) || '—', accent: 'amber' },
        { label: 'Clics', value: fmtInt(t.clicks), accent: 'indigo' },
        { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
        { label: 'Landing page views', value: fmtInt(t.landingPageViews), accent: 'teal' },
        { label: 'Compras', value: fmtInt(t.purchases), accent: 'teal' },
      ];
    }

    if (activeNav === 'Canal WA') {
      return [
        { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
        { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
        { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
        { label: 'CPM', value: fmtArs(t.cpm), accent: 'amber' },
        { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
        { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
        { label: 'Visitas a la página', value: fmtInt(t.landingPageViews), accent: 'teal' },
      ];
    }

    // Campañas Temporada y Todos
    return [
      { label: 'Inversión', value: fmtArs(t.spend), usdValue: fmtUsd(t.spend), accent: 'coral' },
      { label: 'Alcance', value: fmtInt(t.reach), accent: 'indigo' },
      { label: 'Impresiones', value: fmtInt(t.impressions), accent: 'indigo' },
      { label: 'CPM', value: fmtArs(t.cpm), accent: 'amber' },
      { label: 'CTR', value: fmtPct(t.ctr), accent: 'amber' },
      { label: 'Frecuencia', value: fmtDec(t.frequency), accent: 'indigo' },
    ];
  }, [totals, activeNav, arsToUsd]);

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
            <div className="flex gap-2">
              {(['7', '30', '90'] as RangePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    preset === p
                      ? 'bg-plimBlue text-white border-plimBlue'
                      : 'bg-panel text-muted border-line hover:border-plimBlue'
                  }`}
                >
                  {p} días
                </button>
              ))}
              <button
                onClick={() => setPreset('custom')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  preset === 'custom'
                    ? 'bg-plimBlue text-white border-plimBlue'
                    : 'bg-panel text-muted border-line hover:border-plimBlue'
                }`}
              >
                Personalizado
              </button>
            </div>
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
                <KpiCard key={c.label} label={c.label} value={c.value} usdValue={c.usdValue} accent={c.accent} />
              ))}
            </section>

            {ga4Error ? (
              <div className="mb-8 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
                GA4 no respondió: {ga4Error}. Revisa GA4_PROPERTY_ID, GA4_CLIENT_EMAIL y GA4_PRIVATE_KEY,
                y que la cuenta de servicio tenga acceso de Viewer a la propiedad.
              </div>
            ) : ga4 ? (
              <Ga4Panel metrics={ga4} />
            ) : null}

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
                  <Tooltip />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
                    {spendByCountry.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-ink mb-4">Detalle por país y línea de negocio</h2>
              <CountryTable rows={byCountryBusinessLine} />
            </section>

            <CityBreakdown
              activeNav={activeNav}
              since={dateRange.since}
              until={dateRange.until}
              arsToUsd={arsToUsd}
            />
          </>
        )}
      </main>
    </div>
  );
}
