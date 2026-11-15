import { useMemo, useState } from 'react';
import { Download, FileDown, FileText } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HealthChart } from '../components/HealthChart';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useTelemetry } from '../hooks/useTelemetry';
import {
  filterReadingsByRange,
  getOverallHealthStatus,
} from '../services/telemetryEngine';
import type { TimeRangeFilter } from '../types';
import {
  downloadTextFile,
  exportTelemetryCsv,
  formatDateTime,
} from '../utils/formatters';
import { generateMissionReportPdf } from '../utils/pdfReport';

export function MissionReports() {
  const { user } = useAuth();
  const { readings, alerts, journalEntries, settings } = useTelemetry();
  const [range, setRange] = useState<TimeRangeFilter>('24h');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const windowReadings = useMemo(
    () => filterReadingsByRange(readings, range),
    [readings, range]
  );

  const analytics = useMemo(() => {
    const n = Math.max(1, windowReadings.length);
    const totals = windowReadings.reduce(
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

    let normalCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const r of windowReadings) {
      const s = getOverallHealthStatus(r, settings.thresholds);
      if (s === 'critical') criticalCount += 1;
      else if (s === 'warning') warningCount += 1;
      else normalCount += 1;
    }

    const startMs = windowReadings[0]
      ? new Date(windowReadings[0].timestamp).getTime()
      : Date.now();
    const endMs = windowReadings[windowReadings.length - 1]
      ? new Date(windowReadings[windowReadings.length - 1].timestamp).getTime()
      : Date.now();
    const windowAlerts = alerts.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return t >= startMs && t <= endMs + 1000;
    });

    const coveragePct = Math.min(100, Math.round((windowReadings.length / 40) * 100));

    return {
      sampleCount: windowReadings.length,
      avgHr: totals.hr / n,
      avgSpo2: totals.spo2 / n,
      avgTemp: totals.temp / n,
      avgResp: totals.resp / n,
      avgStress: totals.stress / n,
      avgSleep: totals.sleep / n,
      statusDistribution: [
        { name: 'Normal', count: normalCount, color: '#70C99B' },
        { name: 'Warning', count: warningCount, color: '#E8B86D' },
        { name: 'Critical', count: criticalCount, color: '#E77C82' },
      ],
      windowAlerts,
      coveragePct,
    };
  }, [windowReadings, settings.thresholds, alerts]);

  const timelineItems = useMemo(() => {
    const alertEvents = alerts.slice(0, 10).map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      kind: 'Alert' as const,
      title: a.title,
      detail: `${a.metricLabel} (${a.valueDisplay})`,
      severity: a.severity,
    }));

    const journalEvents = journalEntries.slice(0, 8).map((j) => ({
      id: j.id,
      timestamp: j.createdAt,
      kind: 'Journal' as const,
      title: `Crew Log · ${j.moodStatus}`,
      detail: j.observations,
      severity: 'normal' as const,
    }));

    return [...alertEvents, ...journalEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);
  }, [alerts, journalEntries]);

  const handleExportSummary = () => {
    const lines = [
      'ASTROCARE MISSION HEALTH REPORT (SIMULATED TELEMETRY)',
      `Generated: ${new Date().toISOString()}`,
      `Astronaut: ${user?.fullName ?? 'Crew Member'} (${user?.callsign ?? 'CREW'}) | Blood Group: ${user?.bloodGroup ?? 'N/A'} | Age: ${user?.age ?? 'N/A'}`,
      `Mission: ${user?.missionName ?? 'ARTEMIS-IV'} | Spacecraft: ${user?.spacecraft ?? 'Orion-MPCV'}`,
      `Evaluation Window: ${range.toUpperCase()} (${analytics.sampleCount} simulated samples)`,
      '',
      'CALCULATED PHYSIOLOGICAL AVERAGES:',
      `- Average Heart Rate: ${analytics.avgHr.toFixed(1)} BPM`,
      `- Average Blood Oxygen (SpO2): ${analytics.avgSpo2.toFixed(1)} %`,
      `- Average Body Temperature: ${analytics.avgTemp.toFixed(2)} °C`,
      `- Average Respiratory Rate: ${analytics.avgResp.toFixed(1)} breaths/min`,
      `- Average Stress Index: ${analytics.avgStress.toFixed(1)} /100`,
      `- Average Sleep Duration: ${analytics.avgSleep.toFixed(1)} hrs`,
      `- Monitoring Coverage: ${analytics.coveragePct}%`,
      '',
      'HEALTH STATUS DISTRIBUTION:',
      ...analytics.statusDistribution.map((d) => `- ${d.name}: ${d.count} samples`),
      '',
      `ALERTS IN WINDOW: ${analytics.windowAlerts.length}`,
      `TOTAL JOURNAL ENTRIES: ${journalEntries.length}`,
      '',
      'DISCLAIMER: All telemetry and analytics in this report are generated from simulated demonstration data.',
    ];
    downloadTextFile(
      `astrocare-mission-report-${range}-${new Date().toISOString().slice(0, 10)}.txt`,
      lines.join('\n'),
      'text/plain;charset=utf-8;'
    );
  };

  const handleDownloadPdfReport = () => {
    const report = generateMissionReportPdf({
      user,
      range,
      analytics,
      windowReadings,
      journalEntries,
    });

    const anchor = document.createElement('a');
    anchor.href = report.url;
    anchor.download = report.filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => {
      URL.revokeObjectURL(report.url);
    }, 1500);

    setPdfNotice(`Downloaded ${report.filename} (${report.sizeKb} KB).`);
    window.setTimeout(() => setPdfNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {pdfNotice && (
        <div className="rounded-xl border border-[#70C99B]/40 bg-[#70C99B]/10 px-4 py-2.5 text-xs font-medium text-[#70C99B]">
          {pdfNotice}
        </div>
      )}

      {/* Header & Export Actions */}
      <section className="astra-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-[var(--astra-text-primary)]">
            Mission Health Analytics & Reports
          </h2>
          <p className="text-xs text-[var(--astra-text-secondary)]">
            Calculated directly from stored simulated telemetry ({analytics.sampleCount} samples),{' '}
            {alerts.length} alerts, and {journalEntries.length} journal entries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRangeFilter)}
            aria-label="Report date range"
            className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            type="button"
            onClick={() =>
              exportTelemetryCsv(
                windowReadings,
                `astrocare-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#8AB9E8]" aria-hidden="true" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3 py-2 text-xs font-medium text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-[#8AB9E8]" aria-hidden="true" />
            <span>Export Summary</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdfReport}
            aria-label="Download Report PDF"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8AB9E8] px-3.5 py-2 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] transition-colors whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download Report PDF</span>
          </button>
        </div>
      </section>

      {/* Calculated Summary KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Avg Heart Rate</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {analytics.avgHr.toFixed(1)} <span className="text-xs font-normal">BPM</span>
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Avg SpO2</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {analytics.avgSpo2.toFixed(1)} <span className="text-xs font-normal">%</span>
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Avg Body Temp</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {analytics.avgTemp.toFixed(2)} <span className="text-xs font-normal">°C</span>
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Avg Respiratory</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {analytics.avgResp.toFixed(1)} <span className="text-xs font-normal">/min</span>
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Window Alerts</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {analytics.windowAlerts.length}
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Monitoring Coverage</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#70C99B] tabular-nums">
            {analytics.coveragePct}%
          </div>
        </div>
      </section>

      {/* Trend Charts: Temperature & Respiratory */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="astra-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
            Body Temperature Trend ({range.toUpperCase()})
          </h3>
          <HealthChart
            data={windowReadings}
            dataKey="bodyTemperature"
            label="Body Temp"
            unit="°C"
            color="#E8B86D"
            domain={[35, 40]}
            thresholds={settings.thresholds.bodyTemperature}
            height={210}
          />
        </div>

        <div className="astra-panel rounded-xl p-5 space-y-3">
          <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
            Respiratory Rate Trend ({range.toUpperCase()})
          </h3>
          <HealthChart
            data={windowReadings}
            dataKey="respiratoryRate"
            label="Respiratory Rate"
            unit="breaths/min"
            color="#B9DDF5"
            domain={[6, 36]}
            thresholds={settings.thresholds.respiratoryRate}
            height={210}
          />
        </div>
      </section>

      {/* Status Distribution & Mission Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 astra-panel rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
              Health Status Distribution
            </h3>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Sample counts classified against configured illustrative thresholds
            </p>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.statusDistribution} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(190,215,240,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#A5B3C3', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A5B3C3', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A111B',
                    border: '1px solid rgba(190,215,240,0.2)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {analytics.statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-7 astra-panel rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
              Mission Timeline & Alert History
            </h3>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Chronological events derived from recorded alerts and crew health logs
            </p>
          </div>

          {timelineItems.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--astra-text-secondary)]">
              No mission timeline events recorded yet.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {timelineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/50 p-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.severity} compact />
                      <span className="font-medium text-[var(--astra-text-primary)]">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[var(--astra-text-secondary)] truncate">{item.detail}</p>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-[var(--astra-text-secondary)] shrink-0">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
