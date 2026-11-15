import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  History,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { useAuth } from '../hooks/useAuth';
import { useTelemetry } from '../hooks/useTelemetry';
import { requestAstraPulseAnalysis } from '../services/api';
import { filterReadingsByRange } from '../services/telemetryEngine';
import type {
  AstraPulseHistoryItem,
  AstraPulseMode,
  AstraPulseRequestPayload,
  TimeRangeFilter,
} from '../types';
import { formatDateTime } from '../utils/formatters';

export function AstraPulse() {
  const { user } = useAuth();
  const {
    readings,
    latestReading,
    alerts,
    pulseHistory,
    addPulseHistoryItem,
  } = useTelemetry();

  const [mode, setMode] = useState<AstraPulseMode>('current');
  const [historyRange, setHistoryRange] = useState<TimeRangeFilter>('24h');
  const [notes, setNotes] = useState('');

  // Manual form inputs
  const [manualHr, setManualHr] = useState('78');
  const [manualSpo2, setManualSpo2] = useState('97.8');
  const [manualTemp, setManualTemp] = useState('36.9');
  const [manualResp, setManualResp] = useState('16');
  const [manualStress, setManualStress] = useState('34');
  const [manualSleep, setManualSleep] = useState('7.0');
  const [manualActivity, setManualActivity] = useState('Nominal');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<AstraPulseHistoryItem | null>(
    pulseHistory[0] ?? null
  );

  const historicalStats = useMemo(() => {
    const subset = filterReadingsByRange(readings, historyRange);
    const n = Math.max(1, subset.length);
    const sum = subset.reduce(
      (acc, r) => ({
        hr: acc.hr + r.heartRate,
        spo2: acc.spo2 + r.spo2,
        temp: acc.temp + r.bodyTemperature,
        resp: acc.resp + r.respiratoryRate,
        stress: acc.stress + r.stressIndex,
        sleep: acc.sleep + r.sleepHours,
      }),
      { hr: 0, spo2: 0, temp: 0, resp: 0, stress: 0, sleep: 0 }
    );
    return {
      windowLabel: historyRange,
      sampleCount: subset.length,
      avgHeartRate: sum.hr / n,
      avgSpo2: sum.spo2 / n,
      avgBodyTemperature: sum.temp / n,
      avgRespiratoryRate: sum.resp / n,
      avgStressIndex: sum.stress / n,
      avgSleepHours: sum.sleep / n,
      recentAlertsCount: alerts.filter((a) => !a.resolved).length,
    };
  }, [readings, historyRange, alerts]);

  const handleRunAnalysis = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    let currentPayloadReading: AstraPulseRequestPayload['currentReading'];

    if (mode === 'manual') {
      const hr = Number(manualHr);
      const spo2 = Number(manualSpo2);
      const temp = Number(manualTemp);
      const resp = Number(manualResp);
      const stress = Number(manualStress);
      const sleep = Number(manualSleep);

      if (
        !Number.isFinite(hr) ||
        hr < 25 ||
        hr > 240 ||
        !Number.isFinite(spo2) ||
        spo2 < 50 ||
        spo2 > 100 ||
        !Number.isFinite(temp) ||
        temp < 32 ||
        temp > 43 ||
        !Number.isFinite(resp) ||
        resp < 4 ||
        resp > 60 ||
        !Number.isFinite(stress) ||
        stress < 0 ||
        stress > 100 ||
        !Number.isFinite(sleep) ||
        sleep < 0 ||
        sleep > 24
      ) {
        setError(
          'Please verify manual values: HR (25–240), SpO2 (50–100%), Temp (32–43°C), Resp (4–60), Stress (0–100), Sleep (0–24h).'
        );
        return;
      }

      currentPayloadReading = {
        heartRate: hr,
        spo2,
        bodyTemperature: temp,
        respiratoryRate: resp,
        stressIndex: stress,
        sleepHours: sleep,
        activityLevel: manualActivity,
      };
    } else {
      currentPayloadReading = {
        heartRate: latestReading.heartRate,
        spo2: latestReading.spo2,
        bodyTemperature: latestReading.bodyTemperature,
        respiratoryRate: latestReading.respiratoryRate,
        stressIndex: latestReading.stressIndex,
        sleepHours: latestReading.sleepHours,
        activityLevel: latestReading.activityLevel,
      };
    }

    const payload: AstraPulseRequestPayload = {
      mode,
      astronaut: user
        ? {
            fullName: user.fullName,
            callsign: user.callsign,
            age: user.age,
            bloodGroup: user.bloodGroup,
            missionName: user.missionName,
          }
        : undefined,
      currentReading: currentPayloadReading,
      historicalSummary: mode === 'historical' ? historicalStats : undefined,
      notes: notes.trim() || undefined,
    };

    setIsAnalyzing(true);
    try {
      const response = await requestAstraPulseAnalysis(payload);
      const record: AstraPulseHistoryItem = {
        id: `pulse-${Date.now()}`,
        mode,
        timestamp: response.timestamp,
        inputSnapshot: currentPayloadReading,
        response,
      };
      addPulseHistoryItem(record);
      setActiveResult(record);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach ASTRA PULSE analysis backend.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskStyles = {
    LOW: 'border-[#70C99B]/40 bg-[#70C99B]/10 text-[#70C99B]',
    MODERATE: 'border-[#E8B86D]/45 bg-[#E8B86D]/12 text-[#E8B86D]',
    HIGH: 'border-[#E77C82]/50 bg-[#E77C82]/12 text-[#E77C82]',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="astra-panel rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8AB9E8]">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            <span>AI-Assisted Health Risk Engine</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--astra-text-primary)]">
            ASTRA PULSE
          </h2>
          <p className="text-sm text-[var(--astra-text-secondary)]">
            Intelligent health analysis and early warning.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Input & Mode Selector */}
        <section className="xl:col-span-5 astra-panel rounded-xl p-5 space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/70 p-1">
            {(
              [
                { id: 'current', label: 'Current Live' },
                { id: 'historical', label: 'Historical' },
                { id: 'manual', label: 'Manual Entry' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={`rounded-md px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === tab.id
                    ? 'bg-[#8AB9E8]/20 text-[#B9DDF5]'
                    : 'text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleRunAnalysis} className="space-y-4">
            {mode === 'current' && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-[var(--astra-text-secondary)]">
                  Current Simulated Snapshot ({formatDateTime(latestReading.timestamp)})
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono-tabular">
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Heart Rate</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.heartRate} BPM
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Blood Oxygen</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.spo2.toFixed(1)} %
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Body Temp</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.bodyTemperature.toFixed(1)} °C
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Respiratory</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.respiratoryRate} /min
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Stress Index</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.stressIndex} /100
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                    <div className="text-[var(--astra-text-secondary)] font-sans">Sleep Duration</div>
                    <div className="mt-1 text-base font-semibold text-[var(--astra-text-primary)]">
                      {latestReading.sleepHours.toFixed(1)} hrs
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'historical' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                    Historical Window
                  </span>
                  <select
                    value={historyRange}
                    onChange={(e) => setHistoryRange(e.target.value as TimeRangeFilter)}
                    className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-2.5 py-1.5 text-xs text-[var(--astra-text-primary)]"
                  >
                    <option value="1h">Last 1 Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                  </select>
                </div>

                <div className="rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Samples Evaluated</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.sampleCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Mean Heart Rate</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.avgHeartRate.toFixed(1)} BPM
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Mean SpO2</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.avgSpo2.toFixed(1)} %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Mean Body Temp</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.avgBodyTemperature.toFixed(2)} °C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Mean Stress Index</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.avgStressIndex.toFixed(0)} /100
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--astra-text-secondary)]">Unresolved Alerts</span>
                    <span className="font-mono-tabular text-[var(--astra-text-primary)]">
                      {historicalStats.recentAlertsCount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Heart Rate (BPM)</span>
                  <input
                    type="number"
                    step="1"
                    value={manualHr}
                    onChange={(e) => setManualHr(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">SpO2 (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={manualSpo2}
                    onChange={(e) => setManualSpo2(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Body Temp (°C)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={manualTemp}
                    onChange={(e) => setManualTemp(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Resp Rate (/min)</span>
                  <input
                    type="number"
                    step="1"
                    value={manualResp}
                    onChange={(e) => setManualResp(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Stress (0–100)</span>
                  <input
                    type="number"
                    step="1"
                    value={manualStress}
                    onChange={(e) => setManualStress(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Sleep (hrs)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={manualSleep}
                    onChange={(e) => setManualSleep(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm font-mono-tabular text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 col-span-2">
                  <span className="text-xs text-[var(--astra-text-secondary)]">Activity Level</span>
                  <select
                    value={manualActivity}
                    onChange={(e) => setManualActivity(e.target.value)}
                    className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                  >
                    <option value="Resting">Resting</option>
                    <option value="Nominal">Nominal</option>
                    <option value="Moderate EVA">Moderate EVA</option>
                    <option value="High Exertion">High Exertion</option>
                  </select>
                </label>
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Mission Control / Symptom Context (Optional)
              </span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Post-EVA thermal load check, mild headache reported..."
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-[#E77C82]/40 bg-[#E77C82]/10 px-3.5 py-2.5 text-xs text-[#E77C82]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-2.5 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 transition-colors"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isAnalyzing ? 'Running ASTRA PULSE...' : 'Run ASTRA PULSE Analysis'}</span>
            </button>
          </form>
        </section>

        {/* Right: Structured AI Analysis Result */}
        <section className="xl:col-span-7 space-y-5">
          {isAnalyzing ? (
            <LoadingState
              label="ASTRA PULSE analysing telemetry"
              detail="Requesting structured physiological risk assessment from server runtime..."
            />
          ) : !activeResult ? (
            <EmptyState
              icon={BrainCircuit}
              title="Ready for ASTRA PULSE Analysis"
              description="Select current live telemetry, a historical mission window, or enter manual measurements on the left and run ASTRA PULSE to generate an AI-assisted risk assessment."
              actionLabel="Analyse Current Telemetry"
              onAction={() => handleRunAnalysis()}
            />
          ) : (
            <div className="astra-panel rounded-xl p-6 space-y-5">
              {/* Top Result Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--astra-border)]">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold ${
                        riskStyles[activeResult.response.analysis.riskLevel]
                      }`}
                    >
                      {activeResult.response.analysis.riskLevel === 'HIGH' ? (
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : activeResult.response.analysis.riskLevel === 'MODERATE' ? (
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>Risk Level: {activeResult.response.analysis.riskLevel}</span>
                    </span>

                    <span className="text-xs text-[var(--astra-text-secondary)]">
                      Data Quality: {activeResult.response.analysis.dataQuality}
                    </span>
                  </div>

                  <div className="text-xs text-[var(--astra-text-secondary)] flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-mono-tabular">
                      {formatDateTime(activeResult.timestamp)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Engine:{' '}
                      {activeResult.response.engine === 'gemini-4-hydrogen'
                        ? 'Gemini 4 Hydrogen (Server)'
                        : 'Rule-Based Demonstration Fallback'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Explicit Fallback Notice when Gemini is unavailable */}
              {activeResult.response.engine === 'rule-based-fallback' && (
                <div className="rounded-lg border border-[#E8B86D]/40 bg-[#E8B86D]/10 px-4 py-3 text-xs text-[#E8B86D]">
                  <strong>Rule-Based Fallback Used:</strong>{' '}
                  {activeResult.response.fallbackReason ??
                    'Gemini API was unavailable; deterministic threshold rules produced this demonstration assessment.'}
                </div>
              )}

              {/* Summary */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8AB9E8]">
                  Health Analysis Summary
                </h3>
                <p className="text-sm leading-relaxed text-[var(--astra-text-primary)]">
                  {activeResult.response.analysis.summary}
                </p>
              </div>

              {/* 3-Column Breakdown: Observations, Contributing Factors, Recommended Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[#B9DDF5]">Detected Observations</h4>
                  <ul className="space-y-1.5 text-xs text-[var(--astra-text-secondary)] list-disc pl-4">
                    {activeResult.response.analysis.observations.map((obs, idx) => (
                      <li key={idx}>{obs}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[#E8B86D]">Contributing Factors</h4>
                  <ul className="space-y-1.5 text-xs text-[var(--astra-text-secondary)] list-disc pl-4">
                    {activeResult.response.analysis.contributingFactors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-[#70C99B]">Recommended Actions</h4>
                  <ul className="space-y-1.5 text-xs text-[var(--astra-text-secondary)] list-disc pl-4">
                    {activeResult.response.analysis.recommendedActions.map((act, idx) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="pt-3 border-t border-[var(--astra-border)] text-xs text-[var(--astra-text-secondary)]">
                {activeResult.response.analysis.disclaimer}
              </div>
            </div>
          )}

          {/* Recent Analysis Runs */}
          {pulseHistory.length > 0 && (
            <div className="astra-panel rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--astra-text-primary)]">
                <History className="h-4 w-4 text-[#8AB9E8]" aria-hidden="true" />
                <span>Previous ASTRA PULSE Assessments ({pulseHistory.length})</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pulseHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveResult(item)}
                    className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-xs transition-colors flex flex-wrap items-center justify-between gap-2 ${
                      activeResult?.id === item.id
                        ? 'border-[#8AB9E8]/50 bg-[#8AB9E8]/10'
                        : 'border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/50 hover:border-[var(--astra-border-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          item.response.analysis.riskLevel === 'HIGH'
                            ? 'text-[#E77C82]'
                            : item.response.analysis.riskLevel === 'MODERATE'
                              ? 'text-[#E8B86D]'
                              : 'text-[#70C99B]'
                        }`}
                      >
                        {item.response.analysis.riskLevel}
                      </span>
                      <span className="text-[var(--astra-text-secondary)]">
                        {item.mode.toUpperCase()} · HR {item.inputSnapshot.heartRate} · SpO2{' '}
                        {item.inputSnapshot.spo2}%
                      </span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--astra-text-secondary)]">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
