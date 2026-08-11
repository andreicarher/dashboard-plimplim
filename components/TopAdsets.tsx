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
 * Ranking de mejores anuncios por CTR (proxy de relevancia/calidad del anuncio).
 * Solo entran anuncios con impresiones suficientes (>= 1000) para que el CTR
 * sea representativo — un anuncio con 3 impresiones y 1 click da 33% de CTR,
 * que no es un dato confiable para "el mejor anuncio".
 */
export default function TopAdsets({ rows, title = 'Mejores anuncios', limit = 10 }: TopAdsetsProps) {
  const MIN_IMPRESSIONS = 1000;

  const ranked = rows
    .filter((r) => r.impressions >= MIN_IMPRESSIONS)
    .map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, limit);

  if (ranked.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink mb-4">{title}</h2>
        <p className="text-muted text-sm">
          No hay anuncios con al menos {fmtInt(MIN_IMPRESSIONS)} impresiones en este rango para
          armar un ranking confiable.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="text-xs text-muted">Ranking por CTR · mín. {fmtInt(MIN_IMPRESSIONS)} impresiones</span>
      </div>
      <div className="bg-panel rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Ad name</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Ad set</th>
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
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap max-w-[220px] truncate" title={r.adName}>
                  {r.adName}
                </td>
                <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap max-w-[220px] truncate" title={r.adsetName}>
                  {r.adsetName}
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
    </section>
  );
}
