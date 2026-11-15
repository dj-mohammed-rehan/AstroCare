import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="astra-panel rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] text-[#8AB9E8]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">{title}</h3>
        <p className="text-xs leading-relaxed text-[var(--astra-text-secondary)]">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 px-4 py-2 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
