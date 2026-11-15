import { Check, CheckCheck } from 'lucide-react';
import type { HealthAlert } from '../types';
import { formatDateTime } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface AlertCardProps {
  alert: HealthAlert;
  onMarkRead: (id: string) => void;
  onResolve: (id: string) => void;
  compact?: boolean;
}

export function AlertCard({ alert, onMarkRead, onResolve, compact = false }: AlertCardProps) {
  return (
    <div
      className={`astra-panel rounded-xl p-4 transition-colors ${
        !alert.read && !alert.resolved ? 'border-[#8AB9E8]/35' : ''
      } ${alert.resolved ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={alert.severity} compact />
            <span className="text-xs text-[var(--astra-text-secondary)]">
              {alert.metricLabel} · <span className="font-mono-tabular text-[var(--astra-text-primary)]">{alert.valueDisplay}</span>
            </span>
            {!alert.read && !alert.resolved && (
              <span className="text-[11px] font-medium text-[#B9DDF5]">Unread</span>
            )}
            {alert.resolved && (
              <span className="text-[11px] font-medium text-[#70C99B]">Resolved</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-[var(--astra-text-primary)]">
            {alert.title}
          </h4>
          {!compact && (
            <p className="text-xs leading-relaxed text-[var(--astra-text-secondary)]">
              {alert.explanation}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-xs font-mono-tabular text-[var(--astra-text-secondary)]">
            {formatDateTime(alert.timestamp)}
          </span>
          {!alert.resolved && (
            <div className="flex items-center gap-1.5">
              {!alert.read && (
                <button
                  type="button"
                  onClick={() => onMarkRead(alert.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors whitespace-nowrap"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onResolve(alert.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#70C99B]/35 bg-[#70C99B]/10 px-2.5 py-1 text-xs font-medium text-[#70C99B] hover:bg-[#70C99B]/20 transition-colors whitespace-nowrap"
              >
                <CheckCheck className="h-3 w-3" aria-hidden="true" />
                <span>Resolve</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
