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

interface InsightRow {
  campaignId: string;
  campaignName: string;
  dateStart: string;
  dateStop: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
  appInstalls: number;
  country: string;
  countryConfidence: 'high' | 'low';
  businessLine: NavItem;
}

type RangePreset = '7' | '30' | '90';

function presetToDates(preset: RangePreset) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - parseInt(preset, 10));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(until) };
}

const COLORS = ['#2E86DE', '#F7941D', '#ED1C24', '#1F9E8E', '#1B4F91', '#FDC500'];

export default function Dashboard() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [activeNav, setActiveNav] = useState<NavItem>('Todos');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [arsToUsd, setArsToUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { since, until } = presetToDates(preset);
    setLoading(true);
    setError(null);

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
        .catch(() => null), // el dólar es un extra: si falla, seguimos sin bloquear el dashboard
    ])
      .then(([insightRows, rate]) => {
        setRows(insightRows);
        setArsToUsd(rate);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [preset]);

  const filteredRows = useMemo(() => {
    if (activeNav === 'Todos') return rows;
    return rows.filter((r) => r.businessLine === activeNav);
  }, [rows, activeNav]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => ({
        spend: acc.spend + r.spend,
        clicks: acc.clicks + r.clicks,
        purchases: acc.purchases + r.purchases,
        appInstalls: acc.appInstalls + r.appInstalls,
      }),
      { spend: 0, clicks: 0, purchases: 0, appInstalls: 0 }
    );
  }, [filteredRows]);

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

  const fmtUsd = (arsAmount: number) =>
    arsToUsd ? (arsAmount * arsToUsd).toLocaleString('en-US', { maximumFractionDigits: 0 }) : undefined;

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
          <p className="text-muted text-sm">Cargando datos en vivo desde Meta…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-muted text-sm">
            No hay campañas de &quot;{activeNav}&quot; en este rango de fechas.
          </p>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <KpiCard
                label="Gasto total"
                value={totals.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                usdValue={fmtUsd(totals.spend)}
                accent="coral"
              />
              <KpiCard label="Clicks" value={totals.clicks.toLocaleString('es-AR')} accent="indigo" />
              <KpiCard label="Compras" value={totals.purchases.toLocaleString('es-AR')} accent="teal" />
              <KpiCard
                label="Installs de app"
                value={totals.appInstalls.toLocaleString('es-AR')}
                accent="amber"
              />
            </section>

            <section className="bg-panel rounded-xl border border-line p-5 mb-8">
              <h2 className="text-sm font-semibold text-ink mb-4">Gasto por país (ARS)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={spendByCountry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5D061" vertical={false} />
                  <XAxis dataKey="country" tick={{ fontSize: 12, fill: '#8A6D1F' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#8A6D1F' }} />
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
          </>
        )}
      </main>
    </div>
  );
}
