interface Ga4Metrics {
  activeUsers: number;
  bounceRate: number;
  engagedSessions: number;
  engagementRate: number;
  newUsers: number;
  views: number;
  viewsPerSession: number;
  sessions: number;
  sessionsPerUser: number;
  totalUsers: number;
  firstTimePurchasers: number;
  totalPurchasers: number;
  purchaseRevenue: number;
  keyEventsFirstOpen: number;
  keyEventsInAppPurchase: number;
  keyEventsPurchase: number;
  sessionKeyEventRateFirstOpen: number;
}

function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString('es-AR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function fmtPct(n: number) {
  return `${(n * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`;
}

const FIELDS: Array<{ label: string; get: (m: Ga4Metrics) => string }> = [
  { label: 'Usuarios activos', get: (m) => fmtNum(m.activeUsers) },
  { label: 'Total de usuarios', get: (m) => fmtNum(m.totalUsers) },
  { label: 'Usuarios nuevos', get: (m) => fmtNum(m.newUsers) },
  { label: 'Sesiones', get: (m) => fmtNum(m.sessions) },
  { label: 'Sesiones por usuario', get: (m) => fmtNum(m.sessionsPerUser, 2) },
  { label: 'Sesiones con interacción', get: (m) => fmtNum(m.engagedSessions) },
  { label: 'Tasa de interacción', get: (m) => fmtPct(m.engagementRate) },
  { label: 'Tasa de rebote', get: (m) => fmtPct(m.bounceRate) },
  { label: 'Vistas', get: (m) => fmtNum(m.views) },
  { label: 'Vistas por sesión', get: (m) => fmtNum(m.viewsPerSession, 2) },
  { label: 'Compradores (1ra vez)', get: (m) => fmtNum(m.firstTimePurchasers) },
  { label: 'Total de compradores', get: (m) => fmtNum(m.totalPurchasers) },
  { label: 'Ingresos por compra', get: (m) => fmtNum(m.purchaseRevenue, 2) },
  { label: 'Eventos clave: first_open', get: (m) => fmtNum(m.keyEventsFirstOpen) },
  { label: 'Eventos clave: in_app_purchase', get: (m) => fmtNum(m.keyEventsInAppPurchase) },
  { label: 'Eventos clave: purchase', get: (m) => fmtNum(m.keyEventsPurchase) },
  { label: 'Tasa de sesión con evento clave (first_open)', get: (m) => fmtPct(m.sessionKeyEventRateFirstOpen) },
];

export default function Ga4Panel({ metrics }: { metrics: Ga4Metrics }) {
  return (
    <section className="bg-panel rounded-xl border border-line p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink">Google Analytics 4</h2>
        <span className="text-xs text-muted">datos intradía, no instantáneos</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FIELDS.map((f) => (
          <div key={f.label} className="flex flex-col gap-1">
            <span className="text-xs text-muted">{f.label}</span>
            <span className="text-base font-mono font-semibold text-ink">{f.get(metrics)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
