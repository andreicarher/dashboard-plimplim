'use client';

import { useMemo, useState } from 'react';

export interface AdRow {
  adId: string;
  adName: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  businessLine: string;
  country: string;
  city: string | null;
  adStatus: string;
  adsetStatus: string;
  campaignStatus: string;
  isFullyActive: boolean;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  landingPageViews: number;
}

function fmtArs(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtInt(n: number) {
  return Math.round(n).toLocaleString('es-AR');
}
function fmtPct(n: number) {
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
}

interface TopAdsetsProps {
  rows: AdRow[];
  title?: string;
  limit?: number;
}

/**
 * Ranking de mejores anuncios por CTR (proxy de relevancia/calidad del anuncio),
 * con filtros por campaña, ad set y estado. El filtro de estado es UNO SOLO
 * (no independiente por nivel): "Activos" exige que anuncio + ad set + campaña
 * estén los tres en ACTIVE — si cualquiera está pausado, el anuncio no se está
 * entregando en la práctica, así que cuenta como "pausado" a efectos de este filtro.
 */
export default function TopAdsets({ rows, title = 'Mejores anuncios', limit = 10 }: TopAdsetsProps) {
  const MIN_IMPRESSIONS = 1000;

  const [campaignFilter, setCampaignFilter] = useState('');
  const [adsetFilter, setAdsetFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const campaigns = useMemo(() => {
    const set = new Set(rows.map((r) => r.campaignName));
    return Array.from(set).sort();
  }, [rows]);

  const adsetsForCampaign = useMemo(() => {
    const scoped = campaignFilter ? rows.filter((r) => r.campaignName === campaignFilter) : rows;
    const set = new Set(scoped.map((r) => r.adsetName));
    return Array.from(set).sort();
  }, [rows, campaignFilter]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (campaignFilter && r.campaignName !== campaignFilter) return false;
      if (adsetFilter && r.adsetName !== adsetFilter) return false;
      if (statusFilter === 'active' && !r.isFullyActive) return false;
      if (statusFilter === 'paused' && r.isFullyActive) return false;
      return true;
    });
  }, [rows, campaignFilter, adsetFilter, statusFilter]);

  const ranked = filteredRows
    .filter((r) => r.impressions >= MIN_IMPRESSIONS)
    .map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, limit);

  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="text-xs text-muted">Ranking por CTR · mín. {fmtInt(MIN_IMPRESSIONS)} impresiones</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setAdsetFilter('');
          }}
          className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm"
        >
          <option value="">Todas las campañas</option>
          {campaigns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={adsetFilter}
          onChange={(e) => setAdsetFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm"
        >
          <option value="">Todos los ad sets</option>
          {adsetsForCampaign.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
          className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm"
        >
          <option value="all">Cualquier estado</option>
          <option value="active">Solo activos (anuncio+adset+campaña)</option>
          <option value="paused">Pausados (algún nivel pausado)</option>
        </select>
      </div>

      {ranked.length === 0 ? (
        <p className="text-muted text-sm">
          No hay anuncios con al menos {fmtInt(MIN_IMPRESSIONS)} impresiones que cumplan estos filtros.
        </p>
      ) : (
        <div className="bg-panel rounded-xl border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ad name</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ad set</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">País / Ciudad</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">CTR</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Inversión</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Impresiones</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Visitas a la página</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.adId} className="border-t border-line">
                  <td className="px-4 py-3 font-mono text-muted">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" title={r.adName}>
                    {r.adName}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap max-w-[220px] truncate" title={r.adsetName}>
                    {r.adsetName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.isFullyActive ? (
                      <span className="text-xs font-medium text-teal">🟢 Activo</span>
                    ) : (
                      <span className="text-xs font-medium text-muted">⏸ Pausado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {r.country}
                    {r.city ? ` — ${r.city}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-teal">
                    {fmtPct(r.ctr)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmtArs(r.spend)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.impressions)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.landingPageViews)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
