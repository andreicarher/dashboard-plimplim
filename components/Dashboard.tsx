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
  objective: string;
}

type RangePreset = '7' | '30' | '90';

function presetToDates(preset: RangePreset) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - parseInt(preset, 10));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { since: fmt(since), until: fmt(until) };
}

const COLORS = ['#FF6B4A', '#1F9E8E', '#4A5CFF', '#F5A623', '#8A7FFF', '#43B0A6'];

export default function Dashboard() {
  const [preset, setPreset] = useState<RangePreset>('30');
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { since, until } = presetToDates(preset);
    setLoading(true);
    setError(null);

    fetch(`/api/meta-insights?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer datos');
        setRows(json.data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [preset]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        spend: acc.spend + r.spend,
        clicks: acc.clicks + r.clicks,
        purchases: acc.purchases + r.purchases,
        appInstalls: acc.appInstalls + r.appInstalls,
      }),
      { spend: 0, clicks: 0, purchases: 0, appInstalls: 0 }
    );
  }, [rows]);

  const byCountryObjective = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        objective: string;
        spend: number;
        clicks: number;
        purchases: number;
        appInstalls: number;
        lowConfidenceCount: number;
      }
    >();

    for (const r of rows) {
      const key = `${r.country}__${r.objective}`;
      const existing = map.get(key) || {
        country: r.country,
        objective: r.objective,
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
  }, [rows]);

  const spendByCountry = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.country, (map.get(r.country) || 0) + r.spend);
    }
    return Array.from(map.entries())
      .map(([country, spend]) => ({ country, spend: Math.round(spend) }))
      .sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const unclassifiedCount = useMemo(
    () => rows.filter((r) => r.country === 'Sin clasificar').length,
    [rows]
  );

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-ink">Plim Plim</h1>
          <p className="text-muted text-sm">Paid Media — LATAM · datos en vivo desde Meta Ads</p>
        </div>
        <div className="flex gap-2">
          {(['7', '30', '90'] as RangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                preset === p
                  ? 'bg-indigo text-white border-indigo'
                  : 'bg-panel text-muted border-line hover:border-indigo'
              }`}
            >
              {p} días
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-coral bg-coral/10 text-coral px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {unclassifiedCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber bg-amber/10 text-ink px-4 py-3 text-sm">
          ⚠ Hay <strong>{unclassifiedCount}</strong> fila(s) de campaña sin clasificar por país. No
          se les asignó un país al azar — revisa el nombre de esas campañas en Meta Ads Manager.
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Cargando datos en vivo desde Meta…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Gasto total" value={totals.spend.toLocaleString('es-AR', { maximumFractionDigits: 0 })} accent="coral" />
            <KpiCard label="Clicks" value={totals.clicks.toLocaleString('es-AR')} accent="indigo" />
            <KpiCard label="Compras" value={totals.purchases.toLocaleString('es-AR')} accent="teal" />
            <KpiCard label="Installs de app" value={totals.appInstalls.toLocaleString('es-AR')} accent="amber" />
          </section>

          <section className="bg-panel rounded-xl border border-line p-5 mb-8">
            <h2 className="text-sm font-semibold text-ink mb-4">Gasto por país</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={spendByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7ED" vertical={false} />
                <XAxis dataKey="country" tick={{ fontSize: 12, fill: '#6B7686' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7686' }} />
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
            <h2 className="text-sm font-semibold text-ink mb-4">Detalle por país y objetivo</h2>
            <CountryTable rows={byCountryObjective} />
          </section>
        </>
      )}
    </main>
  );
}
