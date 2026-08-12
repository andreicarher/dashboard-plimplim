interface Ga4CountryRow {
  country: string;
  firstOpen: number;
  inAppPurchases: number;
  purchaseRevenueUsd: number;
}

function fmtInt(n: number) {
  return Math.round(n).toLocaleString('es-AR');
}
function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function fmtArs(usd: number, arsToUsd: number | null) {
  if (!arsToUsd) return null;
  return (usd / arsToUsd).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

export default function Ga4CountryTable({
  rows,
  arsToUsd,
  loading,
  error,
}: {
  rows: Ga4CountryRow[];
  arsToUsd: number | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return null;

  if (error) {
    return (
      <div className="mb-8 rounded-xl border border-plimOrange bg-plimOrange/10 text-ink px-4 py-3 text-sm">
        No se pudo cargar el desglose por país de GA4: {error}
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">Desglose por país (GA4)</h2>
        <span className="text-xs text-muted">Dimensión nativa de país de GA4, no la de Meta</span>
      </div>
      <div className="bg-panel rounded-xl border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium whitespace-nowrap">País</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Descargas (first_open)</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Compras en la app</th>
              <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Valor de compras</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ars = fmtArs(r.purchaseRevenueUsd, arsToUsd);
              return (
                <tr key={r.country} className="border-t border-line">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{r.country}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.firstOpen)}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtInt(r.inAppPurchases)}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <div className="flex flex-col items-end">
                      <span>{ars || fmtUsd(r.purchaseRevenueUsd)}</span>
                      {ars && <span className="text-[10px] text-muted font-normal">{fmtUsd(r.purchaseRevenueUsd)}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
