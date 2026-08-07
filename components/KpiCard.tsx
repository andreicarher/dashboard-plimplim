interface KpiCardProps {
  label: string;
  value: string;
  usdValue?: string;
  accent?: 'coral' | 'teal' | 'indigo' | 'amber';
}

const accentMap: Record<string, string> = {
  coral: 'border-l-plimRed',
  teal: 'border-l-teal',
  indigo: 'border-l-plimBlue',
  amber: 'border-l-plimOrange',
};

export default function KpiCard({ label, value, usdValue, accent = 'indigo' }: KpiCardProps) {
  return (
    <div
      className={`bg-panel rounded-xl border border-line border-l-4 ${accentMap[accent]} p-5 flex flex-col gap-1`}
    >
      <span className="text-xs uppercase tracking-wide text-muted font-medium">{label}</span>
      <span className="text-2xl font-mono font-semibold text-ink">{value}</span>
      {usdValue && <span className="text-xs font-mono text-muted">≈ USD {usdValue}</span>}
    </div>
  );
}
