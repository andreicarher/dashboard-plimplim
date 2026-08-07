interface RowData {
  country: string;
  objective: string;
  spend: number;
  clicks: number;
  purchases: number;
  appInstalls: number;
  lowConfidenceCount: number;
}

function fmtMoney(n: number) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

export default function CountryTable({ rows }: { rows: RowData[] }) {
  return (
    <div className="bg-panel rounded-xl border border-line overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-paper text-left text-muted uppercase text-xs tracking-wide">
            <th className="px-4 py-3 font-medium">País</th>
            <th className="px-4 py-3 font-medium">Objetivo</th>
            <th className="px-4 py-3 font-medium text-right">Gasto (moneda cuenta)</th>
            <th className="px-4 py-3 font-medium text-right">Clicks</th>
            <th className="px-4 py-3 font-medium text-right">Compras</th>
            <th className="px-4 py-3 font-medium text-right">Installs</th>
            <th className="px-4 py-3 font-medium text-right">Confianza</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line hover:bg-paper/60">
              <td className="px-4 py-3 font-medium">{r.country}</td>
              <td className="px-4 py-3 text-muted">{r.objective}</td>
              <td className="px-4 py-3 text-right font-mono">{fmtMoney(r.spend)}</td>
              <td className="px-4 py-3 text-right font-mono">{r.clicks.toLocaleString('es-AR')}</td>
              <td className="px-4 py-3 text-right font-mono">{r.purchases.toLocaleString('es-AR')}</td>
              <td className="px-4 py-3 text-right font-mono">{r.appInstalls.toLocaleString('es-AR')}</td>
              <td className="px-4 py-3 text-right">
                {r.lowConfidenceCount > 0 ? (
                  <span className="text-amber text-xs font-medium">
                    ⚠ {r.lowConfidenceCount} campaña(s) por código
                  </span>
                ) : (
                  <span className="text-teal text-xs font-medium">✓ nombre completo</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
