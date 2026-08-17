interface RowData {
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

export default function CountryTable({ rows, arsToUsd }: { rows: RowData[]; arsToUsd: number | null }) {
  const hasAnyPurchases = rows.some((r) => r.purchases > 0);

  return (
    <div>
      {hasAnyPurchases && (
        <p className="text-xs text-muted italic mb-2">
          Compras y Valor de compras solo reflejan campañas con conversión de compra activa en Meta
          (no todos los países la tienen configurada).
        </p>
      )}
      <div className="bg-panel rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium whitespace-nowrap">País</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Gasto</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Alcance</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Impresiones</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Clicks</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">CTR</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Landing page views</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Compras</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Valor de compras</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const usd = fmtUsdVal(r.spend, arsToUsd);
              const purchaseUsd = fmtUsdVal(r.purchaseValue, arsToUsd);
              const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
              return (
                <tr key={i} className="border-t border-line hover:bg-paper/60">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.country}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span>{fmtArs(r.spend)}</span>
                      {usd && <span className="text-[10px] text-muted font-normal">≈ USD {usd}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.reach)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.impressions)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.clicks)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtPct(ctr)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.landingPageViews)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.purchases)}</td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <span>{fmtArs(r.purchaseValue)}</span>
                      {purchaseUsd && (
                        <span className="text-[10px] text-muted font-normal">≈ USD {purchaseUsd}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.lowConfidenceCount > 0 ? (
                      <span className="text-plimOrange text-xs font-medium whitespace-nowrap">
                        ⚠ {r.lowConfidenceCount} por código
                      </span>
                    ) : (
                      <span className="text-teal text-xs font-medium whitespace-nowrap">✓ completo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
