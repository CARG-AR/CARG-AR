import { useEffect, useState } from 'react';
import { badgeFor, STATUS_COLOR, STATUS_LABEL, type ShipmentStatus } from '../lib/types';

export function Stars({ value, size = 'text-sm' }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} text-amber-500`} title={value.toFixed(2)}>
      {'★'.repeat(full)}
      <span className="text-gray-300">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function UserChip({ name, reputation, extra }: { name: string; reputation?: { rating_avg: number; rating_count: number } | null; extra?: string }) {
  const badge = badgeFor(reputation as any);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium">{name || 'Usuario'}</span>
      {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>}
      {reputation && reputation.rating_count > 0 && (
        <span className="inline-flex items-center gap-1">
          <Stars value={reputation.rating_avg} />
          <span className="text-xs text-gray-500">({reputation.rating_count})</span>
        </span>
      )}
      {extra && <span className="text-xs text-gray-500">{extra}</span>}
    </span>
  );
}

export function StatusChip({ status }: { status: ShipmentStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Countdown({ to, onExpire }: { to: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(new Date(to).getTime() - Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const l = new Date(to).getTime() - Date.now();
      setLeft(l);
      if (l <= 0) { clearInterval(t); onExpire?.(); }
    }, 1000);
    return () => clearInterval(t);
  }, [to]);
  if (left <= 0) return <span className="text-xs font-semibold text-red-600">Finalizada</span>;
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  return (
    <span className="text-xs font-semibold text-gray-700 tabular-nums">
      {h > 0 ? `${h}h ` : ''}{m}m {s.toString().padStart(2, '0')}s
    </span>
  );
}

export function Field({ label, children, hint }: { label: string; children: any; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white';

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'error' | 'ok'; children: any }) {
  const cls = kind === 'error' ? 'bg-red-50 text-red-700 border-red-200'
    : kind === 'ok' ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';
  return <div className={`border rounded-lg px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
