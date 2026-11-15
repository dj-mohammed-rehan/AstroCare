import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ShieldCheck, X } from 'lucide-react';
import { PoweredByNasa } from './NasaLogo';

export type LegalDocType = 'terms' | 'privacy';

interface LegalModalProps {
  docType: LegalDocType | null;
  onClose: () => void;
  onSwitchDoc: (doc: LegalDocType) => void;
}

export function LegalModal({ docType, onClose, onSwitchDoc }: LegalModalProps) {
  useEffect(() => {
    if (!docType) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [docType, onClose]);

  if (!docType) return null;

  const isTerms = docType === 'terms';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={onClose}
    >
      <div
        className="astra-panel-solid w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[var(--astra-border)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-display text-xs font-semibold tracking-wider text-[#8AB9E8] uppercase">
                AstroCare Legal
              </span>
              <span aria-hidden="true" className="text-[var(--astra-text-secondary)]">
                ·
              </span>
              <PoweredByNasa size="sm" />
            </div>
            <h2
              id="legal-modal-title"
              className="font-display text-xl font-semibold text-[var(--astra-text-primary)] flex items-center gap-2.5"
            >
              {isTerms ? (
                <FileText className="h-5 w-5 text-[#8AB9E8]" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-[#8AB9E8]" aria-hidden="true" />
              )}
              <span>{isTerms ? 'Terms and Conditions' : 'Privacy Policy'}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal dialog"
            className="rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Switcher */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/70 p-1">
            <button
              type="button"
              onClick={() => onSwitchDoc('terms')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isTerms
                  ? 'bg-[#8AB9E8] text-[#05070B] font-semibold'
                  : 'text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
              }`}
            >
              Terms and Conditions
            </button>
            <button
              type="button"
              onClick={() => onSwitchDoc('privacy')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                !isTerms
                  ? 'bg-[#8AB9E8] text-[#05070B] font-semibold'
                  : 'text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
              }`}
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm leading-relaxed text-[var(--astra-text-secondary)]">
          {isTerms ? (
            <>
              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  1. Platform Scope & Simulated Telemetry
                </h3>
                <p>
                  AstroCare is an astronaut health monitoring, visualization, and early-warning
                  demonstration platform. Physiological metrics, suit telemetry, alerts, and mission
                  timelines displayed inside the workspace are simulated for demonstration and
                  mission-control prototyping and do not represent live medical device telemetry or
                  clinical flight certification.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  2. Account Registration & Verification
                </h3>
                <p>
                  Access to the AstroCare Mission Overview and connected modules requires a verified
                  account via Firebase Authentication. You are responsible for maintaining the
                  confidentiality of your login credentials and providing accurate crew profile
                  information for simulation baselines.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  3. ASTRA PULSE AI Insights
                </h3>
                <p>
                  ASTRA PULSE AI generates automated telemetry summaries and illustrative risk
                  assessments from simulated or manually entered readings. Outputs are intended
                  strictly for mission-simulation review and must not be relied upon for clinical
                  diagnosis, treatment, or emergency medical decisions.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  4. Exported Reports & Acceptable Use
                </h3>
                <p>
                  PDF, CSV, and text summary exports generated from Mission Reports reflect your
                  workstation&apos;s simulated telemetry window and user-entered crew logs. Use of
                  this platform is limited to authorized demonstration, research, and evaluation
                  activities.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  1. Account & Profile Information Collected
                </h3>
                <p>
                  When you register for AstroCare, we store your verified email address, crew name,
                  callsign, mission assignment, baseline physiological parameters (age, blood
                  group, height, weight, resting heart rate), optional medical notes, and optional
                  profile photo in Firebase Authentication and your private Firestore user document.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  2. Local Workstation Telemetry & Logs
                </h3>
                <p>
                  Simulated vital-sign streams, alert history, crew health journal entries, ASTRA
                  PULSE analysis history, and alert thresholds are stored locally in your
                  browser&apos;s storage scoped to your verified user ID so your session persists
                  between refreshes.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  3. Data Protection & Access Controls
                </h3>
                <p>
                  Firestore security rules enforce strict owner-only access and require verified
                  email authentication before reading or writing your crew profile. AstroCare does
                  not sell personal data or embed third-party advertising trackers.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                  4. Your Controls & Data Removal
                </h3>
                <p>
                  You can update or clear your profile photo and crew details at any time from the
                  User Profile menu, reset local simulated telemetry and journal logs in Settings, or
                  sign out cleanly from the workspace header.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--astra-border)] bg-[var(--astra-bg-secondary)]">
          <span className="text-xs text-[var(--astra-text-secondary)]">
            AstroCare · Human Health. Beyond Earth.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#8AB9E8] px-4 py-2 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
