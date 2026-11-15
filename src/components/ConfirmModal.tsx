import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="astra-panel-solid w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                destructive
                  ? 'border-[#E77C82]/40 bg-[#E77C82]/10 text-[#E77C82]'
                  : 'border-[#8AB9E8]/40 bg-[#8AB9E8]/10 text-[#8AB9E8]'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3
              id="confirm-modal-title"
              className="font-display text-lg font-semibold text-[var(--astra-text-primary)]"
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[var(--astra-text-secondary)]">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[var(--astra-border)] bg-transparent px-4 py-2 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              destructive
                ? 'bg-[#E77C82] text-[#05070B] hover:bg-[#ee9297]'
                : 'bg-[#8AB9E8] text-[#05070B] hover:bg-[#B9DDF5]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
