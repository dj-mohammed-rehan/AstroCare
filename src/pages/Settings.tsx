import React, { useEffect, useState } from 'react';
import {
  Edit3,
  Save,
  Sliders,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTelemetry } from '../hooks/useTelemetry';
import { DEFAULT_THRESHOLDS } from '../services/storage';
import type { AppSettings, ThemePreference } from '../types';

interface SettingsProps {
  onOpenEditProfile: () => void;
}

export function Settings({ onOpenEditProfile }: SettingsProps) {
  const { user } = useAuth();
  const {
    settings,
    updateSettings,
  } = useTelemetry();

  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(draft);
    setSavedNotice('Mission preferences and illustrative thresholds saved.');
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {savedNotice && (
        <div className="rounded-xl border border-[#70C99B]/40 bg-[#70C99B]/10 px-4 py-3 text-xs font-medium text-[#70C99B]">
          {savedNotice}
        </div>
      )}

      {/* Astronaut Profile Summary Card */}
      <section className="astra-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full object-cover border border-[#8AB9E8]/50"
            />
          ) : (
            <div
              aria-label={user.fullName}
              className="h-14 w-14 rounded-full border border-[#8AB9E8]/40 bg-[#0A111B] flex items-center justify-center text-[#A5B3C3] shrink-0"
            >
              <User className="h-6 w-6" aria-hidden="true" />
            </div>
          )}
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--astra-text-primary)]">
              {user.fullName}
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              {user.role} · {user.callsign} · Age {user.age} · Blood Group {user.bloodGroup}
            </p>
            <p className="text-xs text-[#8AB9E8] mt-0.5">
              {user.missionName} · {user.spacecraft}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenEditProfile}
          className="inline-flex items-center gap-2 rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 px-4 py-2 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Edit Profile & Photo</span>
        </button>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Mission & Simulation Preferences */}
        <section className="astra-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#8AB9E8]" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
              Mission, Simulation & Theme Preferences
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Command Authority
              </span>
              <input
                type="text"
                value={draft.commandAuthority}
                onChange={(e) => setDraft({ ...draft, commandAuthority: e.target.value })}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Data Simulation Speed
              </span>
              <select
                value={draft.simulationSpeed}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    simulationSpeed: Number(e.target.value) as 0.5 | 1 | 2 | 5,
                  })
                }
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                <option value={0.5}>0.5x (Slow · 6s interval)</option>
                <option value={1}>1x (Standard · 3s interval)</option>
                <option value={2}>2x (Fast · 1.5s interval)</option>
                <option value={5}>5x (Rapid Demo · 0.8s interval)</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Interface Theme
              </span>
              <select
                value={draft.theme}
                onChange={(e) =>
                  setDraft({ ...draft, theme: e.target.value as ThemePreference })
                }
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                <option value="deep-space">Deep Space Obsidian (#05070B)</option>
                <option value="orbital-slate">Orbital Slate (#070C14)</option>
                <option value="clinical-light">Clinical Daylight (High Contrast)</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Alert Deduplication Cooldown (Seconds)
              </span>
              <input
                type="number"
                min={5}
                max={300}
                value={draft.alertCooldownSeconds}
                onChange={(e) =>
                  setDraft({ ...draft, alertCooldownSeconds: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--astra-text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoStartMonitoring}
                onChange={(e) =>
                  setDraft({ ...draft, autoStartMonitoring: e.target.checked })
                }
                className="rounded accent-[#8AB9E8]"
              />
              <span>Auto-start simulated telemetry on sign-in</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-[var(--astra-text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoGenerateAlerts}
                onChange={(e) =>
                  setDraft({ ...draft, autoGenerateAlerts: e.target.checked })
                }
                className="rounded accent-[#8AB9E8]"
              />
              <span>Automatically generate early-warning alerts</span>
            </label>
          </div>
        </section>

        {/* Configurable Demonstration Thresholds */}
        <section className="astra-panel rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
                Illustrative Demonstration Thresholds
              </h3>
              <p className="text-xs text-[var(--astra-text-secondary)]">
                Configurable parameters for hackathon evaluation only — not validated medical limits
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, thresholds: DEFAULT_THRESHOLDS })}
              className="text-xs font-medium text-[#8AB9E8] hover:text-[#B9DDF5]"
            >
              Restore Default Thresholds
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3.5 space-y-2">
              <div className="font-semibold text-[var(--astra-text-primary)]">Heart Rate (BPM)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E8B86D]">Warning High</span>
                  <input
                    type="number"
                    value={draft.thresholds.heartRate.warningHigh ?? 100}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          heartRate: { ...draft.thresholds.heartRate, warningHigh: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E77C82]">Critical High</span>
                  <input
                    type="number"
                    value={draft.thresholds.heartRate.criticalHigh ?? 120}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          heartRate: { ...draft.thresholds.heartRate, criticalHigh: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3.5 space-y-2">
              <div className="font-semibold text-[var(--astra-text-primary)]">Blood Oxygen SpO2 (%)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E8B86D]">Warning Low</span>
                  <input
                    type="number"
                    value={draft.thresholds.spo2.warningLow ?? 94}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          spo2: { ...draft.thresholds.spo2, warningLow: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E77C82]">Critical Low</span>
                  <input
                    type="number"
                    value={draft.thresholds.spo2.criticalLow ?? 90}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          spo2: { ...draft.thresholds.spo2, criticalLow: Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3.5 space-y-2">
              <div className="font-semibold text-[var(--astra-text-primary)]">Body Temp (°C)</div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E8B86D]">Warning High</span>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.thresholds.bodyTemperature.warningHigh ?? 37.6}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          bodyTemperature: {
                            ...draft.thresholds.bodyTemperature,
                            warningHigh: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-[#E77C82]">Critical High</span>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.thresholds.bodyTemperature.criticalHigh ?? 38.2}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        thresholds: {
                          ...draft.thresholds,
                          bodyTemperature: {
                            ...draft.thresholds.bodyTemperature,
                            criticalHigh: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full rounded border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2 py-1 font-mono-tabular text-[var(--astra-text-primary)]"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-2 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] transition-colors"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save Preferences</span>
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
