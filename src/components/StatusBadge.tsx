import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { AlertSeverity, MetricStatus } from '../types';

interface StatusBadgeProps {
  status: MetricStatus | AlertSeverity;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const config: Record<
    MetricStatus | AlertSeverity,
    { label: string; colorClass: string; Icon: typeof CheckCircle2 }
  > = {
    normal: {
      label: 'Normal',
      colorClass: 'text-[#70C99B] border-[#70C99B]/30 bg-[#70C99B]/10',
      Icon: CheckCircle2,
    },
    warning: {
      label: 'Warning',
      colorClass: 'text-[#E8B86D] border-[#E8B86D]/35 bg-[#E8B86D]/10',
      Icon: AlertTriangle,
    },
    critical: {
      label: 'Critical',
      colorClass: 'text-[#E77C82] border-[#E77C82]/40 bg-[#E77C82]/12',
      Icon: AlertCircle,
    },
    system: {
      label: 'System',
      colorClass: 'text-[#8AB9E8] border-[#8AB9E8]/35 bg-[#8AB9E8]/10',
      Icon: Info,
    },
  };

  const { label, colorClass, Icon } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${colorClass}`}
    >
      <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
