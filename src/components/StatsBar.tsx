'use client';

interface StatsBarProps {
  total: number;
  green: number;
  orange: number;
  red: number;
  manual: number;
  pending: number;
}

export default function StatsBar({ total, green, orange, red, manual, pending }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div className="card p-4 flex flex-col items-center">
        <div className="text-sm text-muted mb-1">Total</div>
        <div className="text-2xl font-bold">{total}</div>
      </div>
      <div className="card p-4 flex flex-col items-center" style={{ borderBottom: '3px solid var(--color-safe)' }}>
        <div className="text-sm text-muted mb-1">Safe</div>
        <div className="text-2xl font-bold text-safe">{green}</div>
      </div>
      <div className="card p-4 flex flex-col items-center" style={{ borderBottom: '3px solid var(--color-warn)' }}>
        <div className="text-sm text-muted mb-1">Warning</div>
        <div className="text-2xl font-bold text-warn">{orange}</div>
      </div>
      <div className="card p-4 flex flex-col items-center" style={{ borderBottom: '3px solid var(--color-danger)' }}>
        <div className="text-sm text-muted mb-1">Danger</div>
        <div className="text-2xl font-bold text-danger">{red}</div>
      </div>
      <div className="card p-4 flex flex-col items-center">
        <div className="text-sm text-muted mb-1">Manual</div>
        <div className="text-2xl font-bold">{manual}</div>
      </div>
      <div className="card p-4 flex flex-col items-center">
        <div className="text-sm text-muted mb-1">Pending</div>
        <div className="text-2xl font-bold">{pending}</div>
      </div>
    </div>
  );
}
