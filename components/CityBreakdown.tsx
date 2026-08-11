'use client';

import { useEffect, useMemo, useState } from 'react';
import type { NavItem } from './Sidebar';

export interface AdsetRow {
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

function fmtArs(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtUsdVal(n: number, arsToUsd: number | null) {
  return arsToUsd
    ? (n * arsToUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : null;
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

/** Celda combinada: monto en ARS arriba, equivalente en USD debajo en gris chico. */
function CostCell({ ars, arsToUsd }: { ars: number; arsToUsd: number | null }) {
  const usd = fmtUsdVal(ars, arsToUsd);
  return (
    <div className="flex flex-col items-end">
      <span>{fmtArs(ars)}</span>
      {usd && <span className="text-[10px] text-muted font-normal">≈ USD {usd}</span>}
    </div>
  );
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
  render: (r: AdsetRow, arsToUsd: number | null) => React.ReactNode;
}

/**
 * Columnas específicas por línea de negocio, calculadas por FILA (por ad set).
 * Las métricas de COSTO (Inversión, CPM) muestran ARS arriba y USD debajo en
 * una sola columna combinada — nunca en columnas separadas.
 */
function getColumns(businessLine: NavItem): ColumnDef[] {
  if (businessLine === 'App') {
    return [
      { label: 'Inversión', render: (r, usd) => <CostCell ars={r.spend} arsToUsd={usd} /> },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
    ];
  }

  if (businessLine === 'Shows') {
    return [
      { label: 'Inversión', render: (r, usd) => <CostCell ars={r.spend} arsToUsd={usd} /> },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
      { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
      {
        label: 'Frecuencia',
        render: (r) => fmtDec(r.reach > 0 ? r.impressions / r.reach : 0),
      },
      {
        label: 'CPM',
        render: (r, usd) => (
          <CostCell ars={r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0} arsToUsd={usd} />
        ),
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
      { label: 'Inversión', render: (r, usd) => <CostCell ars={r.spend} arsToUsd={usd} /> },
      { label: 'Alcance', render: (r) => fmtInt(r.reach) },
      { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
      {
        label: 'CPM',
        render: (r, usd) => (
          <CostCell ars={r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0} arsToUsd={usd} />
        ),
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
    { label: 'Inversión', render: (r, usd) => <CostCell ars={r.spend} arsToUsd={usd} /> },
    { label: 'Alcance', render: (r) => fmtInt(r.reach) },
    { label: 'Impresiones', render: (r) => fmtInt(r.impressions) },
    {
      label: 'CPM',
      render: (r, usd) => (
        <CostCell ars={r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0} arsToUsd={usd} />
      ),
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

interface Conflict {
  adsetName: string;
  entries: Array<{ countryCode: string; country: string; city: string }>;
}

interface CityBreakdownProps {
  activeNav: NavItem;
  arsToUsd: number | null;
  rows: AdsetRow[];
  conflicts: Conflict[];
  locationsLoaded: number | null;
  locationsDebug?: { rawRowCount: number; headerPreview: string; sampleDataRow: string } | null;
  loading: boolean;
  error: string | null;
}

export default function CityBreakdown({
  activeNav,
  arsToUsd,
  rows,
  conflicts,
  locationsLoaded,
  locationsDebug,
  loading,
  error,
}: CityBreakdownProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  const scopedRows = useMemo(
    () => (activeNav === 'Todos' ? rows : rows.filter((r) => r.businessLine === activeNav)),
    [rows, activeNav]
  );

  const countries = useMemo(() => {
    const set = new Set(scopedRows.map((r) => r.country));
    return Array.from(set).sort();
  }, [scopedRows]);

  const unmatchedRows = useMemo(() => scopedRows.filter((r) => !r.city), [scopedRows]);

  useEffect(() => {
    if (selectedCountry && !countries.includes(selectedCountry)) {
      setSelectedCountry('');
    }
  }, [countries, selectedCountry]);

  const countryRows = useMemo(
    () => scopedRows.filter((r) => r.country === selectedCountry),
    [scopedRows, selectedCountry]
  );

  const cities = useMemo(() => {
    const set = new Set(countryRows.map((r) => r.city || 'Sin match'));
    return Array.from(set).sort();
  }, [countryRows]);

  useEffect(() => {
    setSelectedCity('');
  }, [selectedCountry]);

  const displayRows = useMemo(() => {
    const filtered = selectedCity
      ? countryRows.filter((r) => (r.city || 'Sin match') === selectedCity)
      : countryRows;
    return filtered.sort((a, b) => b.spend - a.spend);
  }, [countryRows, selectedCity]);

  const columns = useMemo(() => getColumns(activeNav), [activeNav]);

  if (loading) return null;
  if (error) {
    return (
      <div className="mb-8 rounded-xl border border-plimRed bg-plimRed/10 text-plimRed px-4 py-3 text-sm">
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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-ink">Desglose por país y ciudad — Ad set</h2>
        <div className="flex gap-2">
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
          {selectedCountry && (
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-3 py-2 rounded-lg border border-line bg-panel text-ink text-sm"
            >
              <option value="">Todas las ciudades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Diagnóstico: cuántas entradas de la planilla de ciudades se cargaron realmente. */}
      <div className="mb-4 text-xs text-muted">
        📋 Planilla de ciudades:{' '}
        {locationsLoaded === null
          ? 'no se pudo leer'
          : locationsLoaded === 0
          ? '0 entradas cargadas — revisar ADSET_LOCATIONS_CSV_URL'
          : `${locationsLoaded} ad sets mapeados`}
      </div>

      {locationsLoaded === 0 && locationsDebug && (
        <div className="mb-4 rounded-xl border border-plimRed bg-plimRed/10 text-ink px-4 py-3 text-xs font-mono whitespace-pre-wrap break-all">
          <p className="font-sans font-semibold mb-2 text-plimRed">
            Diagnóstico (temporal): esto es lo que realmente llegó del CSV publicado
          </p>
          <p>Filas de datos totales recibidas: {locationsDebug.rawRowCount}</p>
          <p className="mt-1">Fila 1 (headers): {locationsDebug.headerPreview || '(vacío)'}</p>
          <p className="mt-1">Fila 2 (primer dato): {locationsDebug.sampleDataRow || '(vacío)'}</p>
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-4 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{conflicts.length}</strong> adset(s) tienen país/ciudad inconsistente en la
          planilla de mapeo:
          <ul className="mt-2 list-disc list-inside space-y-1">
            {conflicts.map((c) => (
              <li key={c.adsetName}>
                <span className="font-mono text-xs">{c.adsetName}</span> —{' '}
                {c.entries.map((e) => `${e.country}/${e.city}`).join(' vs ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {unmatchedRows.length > 0 && (
        <div className="mb-4 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{unmatchedRows.length}</strong> ad set(s) sin match exacto en la planilla de
          ciudades (país inferido por nombre, sin ciudad):
          <ul className="mt-2 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
            {unmatchedRows.map((r) => (
              <li key={r.adsetId} className="font-mono text-xs">
                {r.adsetName}{' '}
                <span className="font-sans text-muted">
                  (campaña: {r.campaignName}, país inferido: {r.country})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!selectedCountry ? (
        <p className="text-muted text-sm">Elegí un país arriba para ver el desglose por ciudad.</p>
      ) : displayRows.length === 0 ? (
        <p className="text-muted text-sm">No hay ad sets en este rango con ese filtro.</p>
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
              {displayRows.map((r) => (
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
