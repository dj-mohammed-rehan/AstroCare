import { useMemo, useState } from 'react';
import {
  Download,
  Info,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { HealthChart } from '../components/HealthChart';
import { StatusBadge } from '../components/StatusBadge';
import { useTelemetry } from '../hooks/useTelemetry';
import {
  filterReadingsByRange,
  METRIC_META,
  SCENARIO_OPTIONS,
} from '../services/telemetryEngine';
import type { TelemetryMetricKey, TimeRangeFilter } from '../types';
import { exportTelemetryCsv, formatTimeShort } from '../utils/formatters';

const TIME_RANGES: { id: TimeRangeFilter; label: string }[] = [
  { id: '1h', label: '1 Hour' },
  { id: '6h', label: '6 Hours' },
  { id: '24h', label: '24 Hours' },
  { id: '7d', label: '7 Days' },
];

const CHART_CONFIGS: {
  key: TelemetryMetricKey;
  color: string;
  domain: [number, number];
}[] = [
  { key: 'heartRate', color: '#8AB9E8', domain: [35, 165] },
  { key: 'spo2', color: '#70C99B', domain: [82, 100] },
  { key: 'bodyTemperature', color: '#E8B86D', domain: [35, 40] },
  { key: 'respiratoryRate', color: '#B9DDF5', domain: [6, 36] },
  { key: 'stressIndex', color: '#C8D1DB', domain: [0, 100] },
  { key: 'sleepHours', color: '#8AB9E8', domain: [2, 10] },
];

export function HealthMonitoring() {
  const {
    readings,
    latestReading,
    metricStatuses,
    isMonitoring,
    hasStarted,
    scenario,
    settings,
    startMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    resetSimulation,
    setScenario,
    updateSettings,
  } = useTelemetry();

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('1h');

  const filteredReadings = useMemo(
    () => filterReadingsByRange(readings, timeRange),
    [readings, timeRange]
  );

  const computeStats = (key: TelemetryMetricKey) => {
    if (filteredReadings.length === 0) {
      return { min: 0, avg: 0, max: 0 };
    }
    const vals = filteredReadings.map((r) => r[key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
    return { min, avg, max };
  };

  const recentRows = useMemo(
    () => [...filteredReadings].reverse().slice(0, 15),
    [filteredReadings]
  );

  return (
    <div className="space-y-6">
      {/* Control Deck */}
      <section className="astra-panel rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--astra-text-primary)]">
              Live Telemetry Stream Controls
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Controlled simulation engine · {filteredReadings.length} points in selected window
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasStarted ? (
              <button
                type="button"
                onClick={startMonitoring}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#70C99B] px-3.5 py-2 text-xs font-semibold text-[#05070B] hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Start Monitoring</span>
              </button>
            ) : isMonitoring ? (
              <button
                type="button"
                onClick={pauseMonitoring}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8B86D]/45 bg-[#E8B86D]/15 px-3.5 py-2 text-xs font-semibold text-[#E8B86D] hover:bg-[#E8B86D]/25 transition-colors whitespace-nowrap"
              >
                <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pause Monitoring</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeMonitoring}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#70C99B] px-3.5 py-2 text-xs font-semibold text-[#05070B] hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Resume Monitoring</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetSimulation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3.5 py-2 text-xs font-medium text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Simulation</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportTelemetryCsv(
                  filteredReadings,
                  `astrocare-telemetry-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 px-3.5 py-2 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Time Range, Speed & Scenario Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[var(--astra-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Range:</span>
            <div className="inline-flex rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/70 p-0.5">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => setTimeRange(tr.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    timeRange === tr.id
                      ? 'bg-[#8AB9E8]/20 text-[#B9DDF5]'
                      : 'text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--astra-text-secondary)]">
              <span>Speed:</span>
              <select
                value={settings.simulationSpeed}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    simulationSpeed: Number(e.target.value) as 0.5 | 1 | 2 | 5,
                  })
                }
                className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-2.5 py-1 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--astra-text-secondary)]">
              <span>Scenario:</span>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as typeof scenario)}
                className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-2.5 py-1 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                {SCENARIO_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Illustrative Threshold Notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#8AB9E8]/25 bg-[#8AB9E8]/8 px-3.5 py-2.5 text-xs text-[var(--astra-text-secondary)]">
          <Info className="h-4 w-4 shrink-0 text-[#8AB9E8] mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-[var(--astra-text-primary)]">Simulated Telemetry Notice:</strong>{' '}
            All curves and Normal / Warning / Critical threshold lines are illustrative hackathon
            demonstration parameters configured in Settings and are not validated medical limits.
          </span>
        </div>
      </section>

      {/* 6 Separate Physiological Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {CHART_CONFIGS.map(({ key, color, domain }) => {
          const meta = METRIC_META[key];
          const status = metricStatuses[key];
          const currentVal = latestReading[key];
          const stats = computeStats(key);

          return (
            <div key={key} className="astra-panel rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
                    {meta.label}
                  </h3>
                  <p className="text-xs text-[var(--astra-text-secondary)]">
                    Illustrative normal: {meta.illustrativeNormalRange}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <span className="font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
                      {currentVal.toFixed(meta.precision)}
                    </span>
                    <span className="ml-1 text-xs text-[var(--astra-text-secondary)]">
                      {meta.unit}
                    </span>
                  </div>
                  <StatusBadge status={status} compact />
                </div>
              </div>

              <HealthChart
                data={filteredReadings}
                dataKey={key}
                label={meta.label}
                unit={meta.unit}
                color={color}
                domain={domain}
                thresholds={settings.thresholds[key]}
                height={195}
              />

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--astra-border)] text-xs font-mono-tabular">
                <div>
                  <span className="text-[var(--astra-text-secondary)]">Min: </span>
                  <span className="text-[var(--astra-text-primary)]">
                    {stats.min.toFixed(meta.precision)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--astra-text-secondary)]">Avg: </span>
                  <span className="text-[var(--astra-text-primary)]">
                    {stats.avg.toFixed(meta.precision)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--astra-text-secondary)]">Max: </span>
                  <span className="text-[var(--astra-text-primary)]">
                    {stats.max.toFixed(meta.precision)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Latest Telemetry Readings Table */}
      <section className="astra-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
              Recent Simulated Telemetry Samples
            </h3>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Latest {recentRows.length} readings from the active window
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--astra-border)] text-[var(--astra-text-secondary)]">
                <th className="py-2.5 pr-4 font-medium">Time</th>
                <th className="py-2.5 px-3 font-medium text-right">HR (BPM)</th>
                <th className="py-2.5 px-3 font-medium text-right">SpO2 (%)</th>
                <th className="py-2.5 px-3 font-medium text-right">Temp (°C)</th>
                <th className="py-2.5 px-3 font-medium text-right">Resp (/min)</th>
                <th className="py-2.5 px-3 font-medium text-right">Stress</th>
                <th className="py-2.5 px-3 font-medium text-right">Sleep (h)</th>
                <th className="py-2.5 pl-3 font-medium">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--astra-border)] font-mono-tabular">
              {recentRows.map((row) => (
                <tr key={row.timestamp} className="hover:bg-white/3">
                  <td className="py-2 pr-4 text-[var(--astra-text-secondary)] whitespace-nowrap">
                    {formatTimeShort(row.timestamp)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.heartRate}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.spo2.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.bodyTemperature.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.respiratoryRate}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.stressIndex}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--astra-text-primary)]">
                    {row.sleepHours.toFixed(1)}
                  </td>
                  <td className="py-2 pl-3 font-sans text-[var(--astra-text-secondary)] whitespace-nowrap">
                    {row.activityLevel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
