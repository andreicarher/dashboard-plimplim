'use client';

import { useEffect, useMemo, useState } from 'react';
import type { NavItem } from './Sidebar';

interface AdsetRow {
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  businessLine: string;
  country: string;
  city: string | null;
  countryConfidence: 'high' | 'low';
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  appInstalls: number;
  landingPageViews: number;
}

interface Conflict {
  adsetName: string;
  entries: Array<{ countryCode: string; country: string; city: string }>;
}

function fmtArs(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtUsdVal(n: number, arsToUsd: number | null) {
  return arsToUsd
    ? (n * arsToUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '—';
}
function fmtInt(n: number) {
  return Math.round(n).toLocaleString('es-AR');
}
function fmtPct(n: number) {
  return `${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
}
function fmtDec(n: number) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

const STATUS_LABELS: Record<string, { label: string; icon: string; className: string }> = {
  ACTIVE: { label: 'Activo', icon: '🟢', className: 'text-teal' },
  PAUSED: { label: 'Pausado', icon: '⏸', className: 'text-muted' },
  ADSET_PAUSED: { label: 'Pausado (adset)', icon: '⏸', className: 'text-muted' },
  CAMPAIGN_PAUSED: { label: 'Pausado (campaña)', icon: '⏸', className: 'text-muted' },
  DELETED: { label: 'Eliminado', icon: '🗑', className: 'text-plimRed' },
  ARCHIVED: { label: 'Archivado', icon: '📦', className: 'text-muted' },
  PENDING_REVIEW: { label: 'En revisión', icon: '⏳', className: 'text-plimOrange' },
  DISAPPROVED: { label: 'Rechazado', icon: '⛔', className: 'text-plimRed' },
  WITH_ISSUES: { label: 'Con problemas', icon: '⚠️', className: 'text-plimOrange' },
};

function formatStatus(status: string) {
  return STATUS_LABELS[status] || { label: status, icon: '•', className: 'text-muted' };
}

interface ColumnDef {
  label: string;
  render: (r: AdsetRow, arsToUsd: number | null) => string;
}

/**
 * Columnas específicas por línea de negocio, calculadas por FILA (por ad set),
 * no agregadas — cada ratio (CTR, CPM, frecuencia, ROAS) se calcula desde los
 * valores crudos de ESE ad set puntual, así que no hay problema de promediar
 * promedios acá.
 */
function getColumns(businessLine: NavItem): ColumnDef[] {
  if (businessLine === 'App') {
    return [
      { label: 'Inversión', render: (r) => fmtArs(r.spend) },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
      { label: 'Descargas', render: (r) => fmtInt(r.appInstalls) },
      { label: 'Compras en la app', render: (r) => fmtInt(r.purchases) },
      { label: 'Valor de compras', render: (r) => fmtArs(r.purchaseValue) },
      {
        label: 'ROAS',
        render: (r) => `${fmtDec(r.spend > 0 ? r.purchaseValue / r.spend : 0)}x`,
      },
    ];
  }

  if (businessLine === 'Shows') {
    return [
      { label: 'Inversión ARS', render: (r) => fmtArs(r.spend) },
      { label: 'Inversión USD', render: (r, usd) => fmtUsdVal(r.spend, usd) },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
      { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
      {
        label: 'Frecuencia',
        render: (r) => fmtDec(r.reach > 0 ? r.impressions / r.reach : 0),
      },
      {
        label: 'CPM ARS',
        render: (r) => fmtArs(r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0),
      },
      {
        label: 'CPM USD',
        render: (r, usd) => fmtUsdVal(r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0, usd),
      },
      { label: 'Clics', render: (r) => fmtInt(r.clicks) },
      {
        label: 'CTR',
        render: (r) => fmtPct(r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0),
      },
      { label: 'Landing page views', render: (r) => fmtInt(r.landingPageViews) },
      { label: 'Compras', render: (r) => fmtInt(r.purchases) },
    ];
  }

  if (businessLine === 'Canal WA') {
    return [
      { label: 'Inversión', render: (r) => fmtArs(r.spend) },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
      { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
      {
        label: 'CPM',
        render: (r) => fmtArs(r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0),
      },
      {
        label: 'CTR',
        render: (r) => fmtPct(r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0),
      },
      {
        label: 'Frecuencia',
        render: (r) => fmtDec(r.reach > 0 ? r.impressions / r.reach : 0),
      },
      { label: 'Visitas a la página', render: (r) => fmtInt(r.landingPageViews) },
    ];
  }

  // Campañas Temporada
  return [
    { label: 'Inversión', render: (r) => fmtArs(r.spend) },
    { label: 'Alcance', render: (r) => fmtInt(r.reach) },
    { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
    {
      label: 'CPM',
      render: (r) => fmtArs(r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0),
    },
    {
      label: 'CTR',
      render: (r) => fmtPct(r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0),
    },
    {
      label: 'Frecuencia',
      render: (r) => fmtDec(r.reach > 0 ? r.impressions / r.reach : 0),
    },
  ];
}

interface CityBreakdownProps {
  activeNav: NavItem;
  since: string;
  until: string;
  arsToUsd: number | null;
}

export default function CityBreakdown({ activeNav, since, until, arsToUsd }: CityBreakdownProps) {
  const [rows, setRows] = useState<AdsetRow[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/adsets-by-country?since=${since}&until=${until}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al traer el desglose por ciudad');
        setRows(json.data);
        setConflicts(json.conflicts || []);
        setUnmatchedCount(json.unmatchedCount || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [since, until]);

  // Si estamos en "Todos" no filtramos por línea de negocio; si no, sí.
  const scopedRows = useMemo(
    () => (activeNav === 'Todos' ? rows : rows.filter((r) => r.businessLine === activeNav)),
    [rows, activeNav]
  );

  const countries = useMemo(() => {
    const set = new Set(scopedRows.map((r) => r.country));
    return Array.from(set).sort();
  }, [scopedRows]);

  // Al cambiar de vista, si el país seleccionado ya no existe en esta línea de negocio, se resetea.
  useEffect(() => {
    if (selectedCountry && !countries.includes(selectedCountry)) {
      setSelectedCountry('');
    }
  }, [countries, selectedCountry]);

  const countryRows = useMemo(
    () => scopedRows.filter((r) => r.country === selectedCountry).sort((a, b) => b.spend - a.spend),
    [scopedRows, selectedCountry]
  );

  const columns = useMemo(() => getColumns(activeNav), [activeNav]);

  if (loading) return null;
  if (error) {
    return (
      <div className="mt-8 rounded-xl border border-plimRed bg-plimRed/10 text-plimRed px-4 py-3 text-sm">
        No se pudo cargar el desglose por ciudad: {error}
        {error.includes('ADSET_LOCATIONS_CSV_URL') && (
          <p className="mt-2 text-ink">
            Falta configurar <code>ADSET_LOCATIONS_CSV_URL</code> en las variables de entorno.
          </p>
        )}
      </div>
    );
  }

  if (countries.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">Desglose por ciudad — Ad set</h2>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm"
        >
          <option value="">Elegir país…</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{conflicts.length}</strong> adset(s) tienen país/ciudad inconsistente en la
          planilla de mapeo — revísalos cuando puedas.
        </div>
      )}

      {unmatchedCount > 0 && (
        <div className="mb-4 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{unmatchedCount}</strong> ad set(s) sin match exacto en la planilla de ciudades
          en el rango de fechas actual (país inferido por nombre, sin ciudad).
        </div>
      )}

      {!selectedCountry ? (
        <p className="text-muted text-sm">Elegí un país arriba para ver el desglose por ciudad.</p>
      ) : countryRows.length === 0 ? (
        <p className="text-muted text-sm">No hay ad sets de {selectedCountry} en este rango.</p>
      ) : (
        <div className="bg-panel rounded-xl border border-line overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ciudad</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Ad set</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Estado</th>
                {columns.map((c) => (
                  <th key={c.label} className="px-4 py-3 font-medium text-right whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countryRows.map((r) => (
                <tr key={r.adsetId} className="border-t border-line">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {r.city || <span className="text-plimOrange">Sin match</span>}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap">
                    {r.adsetName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const s = formatStatus(r.status);
                      return (
                        <span className={`text-xs font-medium ${s.className}`}>
                          {s.icon} {s.label}
                        </span>
                      );
                    })()}
                  </td>
                  {columns.map((c) => (
                    <td key={c.label} className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {c.render(r, arsToUsd)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
