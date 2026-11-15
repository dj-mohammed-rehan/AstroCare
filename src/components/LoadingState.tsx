import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
  detail?: string;
}

export function LoadingState({
  label = 'Synchronizing telemetry',
  detail = 'Processing simulated physiological data...',
}: LoadingStateProps) {
  return (
    <div
      className="astra-panel rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-[#8AB9E8]" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--astra-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--astra-text-secondary)]">{detail}</p>
      </div>
    </div>
  );
}
