'use client';

import { useEffect, useMemo, useState } from 'react';

interface AdsetRow {
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  businessLine: string;
  country: string;
  city: string | null;
  countryConfidence: 'high' | 'low';
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
}

interface Conflict {
  adsetName: string;
  entries: Array<{ countryCode: string; country: string; city: string }>;
}

function fmtArs(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export default function CountryView({ since, until }: { since: string; until: string }) {
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
        if (!res.ok) throw new Error(json.error || 'Error al traer datos por país');
        setRows(json.data);
        setConflicts(json.conflicts || []);
        setUnmatchedCount(json.unmatchedCount || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [since, until]);

  const countries = useMemo(() => {
    const set = new Set(rows.map((r) => r.country));
    return Array.from(set).sort();
  }, [rows]);

  useEffect(() => {
    if (!selectedCountry && countries.length > 0) setSelectedCountry(countries[0]);
  }, [countries, selectedCountry]);

  const countryRows = useMemo(
    () => rows.filter((r) => r.country === selectedCountry),
    [rows, selectedCountry]
  );

  const campaigns = useMemo(() => {
    const map = new Map<string, { campaignName: string; businessLine: string; spend: number }>();
    for (const r of countryRows) {
      const existing = map.get(r.campaignId) || {
        campaignName: r.campaignName,
        businessLine: r.businessLine,
        spend: 0,
      };
      existing.spend += r.spend;
      map.set(r.campaignId, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [countryRows]);

  if (loading) return <p className="text-muted text-sm">Cargando datos por país…</p>;
  if (error)
    return (
      <div className="rounded-xl border border-plimRed bg-plimRed/10 text-plimRed px-4 py-3 text-sm">
        {error}
        {error.includes('ADSET_LOCATIONS_CSV_URL') && (
          <p className="mt-2 text-ink">
            Falta publicar la pestaña &quot;CONCATENADO ETIQUETAS&quot; a la web como CSV y configurar
            esa URL en la variable de entorno <code>ADSET_LOCATIONS_CSV_URL</code>.
          </p>
        )}
      </div>
    );

  return (
    <div>
      {conflicts.length > 0 && (
        <div className="mb-6 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{conflicts.length}</strong> adset(s) tienen país/ciudad inconsistente en la
          planilla (el mismo nombre aparece con datos distintos). Se usó la última entrada como
          mejor esfuerzo, pero conviene revisarlos:
          <ul className="mt-2 list-disc list-inside">
            {conflicts.slice(0, 5).map((c) => (
              <li key={c.adsetName}>
                <span className="font-mono text-xs">{c.adsetName}</span>:{' '}
                {c.entries.map((e) => `${e.country}/${e.city}`).join(' vs ')}
              </li>
            ))}
          </ul>
          {conflicts.length > 5 && <p className="mt-1">…y {conflicts.length - 5} más.</p>}
        </div>
      )}

      {unmatchedCount > 0 && (
        <div className="mb-6 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
          ⚠ <strong>{unmatchedCount}</strong> ad set(s) no tienen match exacto en la planilla de
          ciudades — su país se infirió por nombre de campaña y no muestran ciudad.
        </div>
      )}

      <div className="mb-6">
        <label className="text-xs text-muted uppercase tracking-wide">País</label>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="mt-1 block w-full md:w-64 px-3 py-2 rounded-lg border border-line bg-panel text-ink"
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <section className="bg-panel rounded-xl border border-line overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Campañas de {selectedCountry}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium">Campaña</th>
              <th className="px-4 py-3 font-medium">Línea de negocio</th>
              <th className="px-4 py-3 font-medium text-right">Gasto</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.campaignName} className="border-t border-line">
                <td className="px-4 py-3">{c.campaignName}</td>
                <td className="px-4 py-3 text-muted">{c.businessLine}</td>
                <td className="px-4 py-3 text-right font-mono">{fmtArs(c.spend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-panel rounded-xl border border-line overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Ad sets por ciudad — {selectedCountry}</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Ad set</th>
              <th className="px-4 py-3 font-medium text-right">Gasto</th>
              <th className="px-4 py-3 font-medium text-right">Alcance</th>
              <th className="px-4 py-3 font-medium text-right">Clicks</th>
              <th className="px-4 py-3 font-medium text-right">Compras</th>
            </tr>
          </thead>
          <tbody>
            {countryRows
              .sort((a, b) => b.spend - a.spend)
              .map((r) => (
                <tr key={r.adsetId} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">
                    {r.city || <span className="text-plimOrange">Sin match</span>}
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{r.adsetName}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtArs(r.spend)}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.reach.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.clicks.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.purchases.toLocaleString('es-AR')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
