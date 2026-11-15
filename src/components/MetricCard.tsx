import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MetricStatus } from '../types';
import { formatTimeShort } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  status: MetricStatus;
  delta: number;
  precision?: number;
  timestamp: string;
  icon: LucideIcon;
  subtitle?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  status,
  delta,
  precision = 0,
  timestamp,
  icon: Icon,
  subtitle,
  onClick,
}: MetricCardProps) {
  const absDelta = Math.abs(delta);
  const threshold = precision > 0 ? 0.05 : 0.4;
  const TrendIcon =
    absDelta < threshold ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;

  const deltaText =
    absDelta < threshold
      ? 'Steady'
      : `${delta > 0 ? '+' : ''}${delta.toFixed(precision)} ${unit}`;

  const Container = onClick ? 'button' : 'div';

  return (
    <Container
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`astra-panel astra-panel-hover rounded-xl p-5 text-left w-full flex flex-col justify-between gap-4 ${
        onClick ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-[#8AB9E8]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] text-[#8AB9E8]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[var(--astra-text-primary)] truncate">
              {label}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--astra-text-secondary)] truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} compact />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold tracking-tight text-[var(--astra-text-primary)] tabular-nums">
          {value}
        </span>
        <span className="text-xs font-medium text-[var(--astra-text-secondary)]">{unit}</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--astra-border)] text-xs text-[var(--astra-text-secondary)]">
        <span className="inline-flex items-center gap-1 font-mono-tabular">
          <TrendIcon className="h-3.5 w-3.5 text-[#8AB9E8]" aria-hidden="true" />
          <span>{deltaText}</span>
        </span>
        <span className="font-mono-tabular">Sim · {formatTimeShort(timestamp)}</span>
      </div>
    </Container>
  );
}
