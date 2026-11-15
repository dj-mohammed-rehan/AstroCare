import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Brain,
  Droplets,
  HeartPulse,
  Moon,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import { AlertCard } from '../components/AlertCard';
import { AstronautViewer } from '../components/AstronautViewer';
import { EmptyState } from '../components/EmptyState';
import { HealthChart } from '../components/HealthChart';
import { MetricCard } from '../components/MetricCard';
import { PoweredByNasa } from '../components/NasaLogo';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useTelemetry } from '../hooks/useTelemetry';
import {
  filterReadingsByRange,
  METRIC_META,
  SCENARIO_OPTIONS,
} from '../services/telemetryEngine';
import type { HotspotZone, NavPageId } from '../types';
import { computeMissionElapsedTime, formatDateTime, formatTimeShort } from '../utils/formatters';

interface MissionOverviewProps {
  onNavigate: (page: NavPageId) => void;
}

export function MissionOverview({ onNavigate }: MissionOverviewProps) {
  const { user } = useAuth();
  const {
    readings,
    latestReading,
    previousReading,
    metricStatuses,
    overallStatus,
    isMonitoring,
    scenario,
    alerts,
    journalEntries,
    settings,
    setScenario,
    markAlertRead,
    resolveAlert,
  } = useTelemetry();

  const [selectedHotspot, setSelectedHotspot] = useState<HotspotZone>('chest');

  const recentReadings = useMemo(() => filterReadingsByRange(readings, '1h'), [readings]);
  const recentAlerts = useMemo(() => alerts.slice(0, 4), [alerts]);
  const activeAlertsCount = useMemo(() => alerts.filter((a) => !a.resolved).length, [alerts]);
  const metDisplay = useMemo(
    () => computeMissionElapsedTime(settings.missionStartDate),
    [settings.missionStartDate, latestReading.timestamp]
  );

  if (!user) return null;

  const hotspotPanelData: Record<
    HotspotZone,
    {
      title: string;
      subsystem: string;
      description: string;
      metrics: { label: string; value: string; status: 'normal' | 'warning' | 'critical' }[];
    }
  > = {
    head: {
      title: 'Head · Neurological & Cognitive',
      subsystem: 'Cranial EEG & Circadian Load',
      description:
        'Tracks simulated autonomic stress load, cognitive readiness, and orbital sleep recovery cycles.',
      metrics: [
        {
          label: 'Stress Index',
          value: `${latestReading.stressIndex} /100`,
          status: metricStatuses.stressIndex,
        },
        {
          label: 'Sleep Duration',
          value: `${latestReading.sleepHours.toFixed(1)} hrs`,
          status: metricStatuses.sleepHours,
        },
      ],
    },
    chest: {
      title: 'Chest · Cardiac & Respiratory',
      subsystem: 'Cardiopulmonary Suit Module',
      description:
        'Primary chest harness sensing simulated heart rate, blood oxygen saturation, and respiratory cadence.',
      metrics: [
        {
          label: 'Heart Rate',
          value: `${latestReading.heartRate} BPM`,
          status: metricStatuses.heartRate,
        },
        {
          label: 'Blood Oxygen (SpO2)',
          value: `${latestReading.spo2.toFixed(1)} %`,
          status: metricStatuses.spo2,
        },
        {
          label: 'Respiratory Rate',
          value: `${latestReading.respiratoryRate} /min`,
          status: metricStatuses.respiratoryRate,
        },
      ],
    },
    arms: {
      title: 'Arms · Movement & Activity',
      subsystem: 'EVA Kinematic Accelerometry',
      description:
        'Monitors upper-limb exertion state and physical workload balance during orbital station tasks.',
      metrics: [
        {
          label: 'Activity State',
          value: latestReading.activityLevel,
          status:
            latestReading.activityLevel === 'High Exertion' && metricStatuses.heartRate !== 'normal'
              ? 'warning'
              : 'normal',
        },
        {
          label: 'Cardiovascular Load',
          value: `${latestReading.heartRate} BPM`,
          status: metricStatuses.heartRate,
        },
      ],
    },
    torso: {
      title: 'Torso · Thermal & Physiological',
      subsystem: 'LCVG Core Thermal Loop',
      description:
        'Evaluates core body temperature regulation and overall physiological homeostasis.',
      metrics: [
        {
          label: 'Body Temperature',
          value: `${latestReading.bodyTemperature.toFixed(1)} °C`,
          status: metricStatuses.bodyTemperature,
        },
        {
          label: 'Overall Suit Status',
          value: overallStatus === 'normal' ? 'Nominal' : overallStatus === 'warning' ? 'Caution' : 'Alert',
          status: overallStatus,
        },
      ],
    },
  };

  const activeHotspot = hotspotPanelData[selectedHotspot];

  return (
    <div className="space-y-8">
      {/* Hero Section: Asymmetric Astronaut-Centric Split */}
      <section className="astra-panel rounded-2xl p-6 sm:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center">
          {/* Left Hero Copy & Mission Metadata */}
          <div className="xl:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-xs font-semibold tracking-widest uppercase text-[#8AB9E8]">
                  AstroCare / Mission Control
                </div>
                <span aria-hidden="true" className="text-[var(--astra-text-secondary)]">
                  ·
                </span>
                <PoweredByNasa size="sm" />
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-[var(--astra-text-primary)] leading-[1.08] [text-wrap:balance]">
                Human health, monitored beyond Earth.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[var(--astra-text-secondary)]">
                An intelligent health monitoring environment designed for the next generation of
                space exploration.
              </p>
            </div>

            {/* Mission Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--astra-border)]">
              <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                <div className="text-[11px] text-[var(--astra-text-secondary)]">Mission</div>
                <div className="mt-0.5 text-xs font-semibold text-[var(--astra-text-primary)] truncate">
                  {user.missionName}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                <div className="text-[11px] text-[var(--astra-text-secondary)]">Astronaut</div>
                <div className="mt-0.5 text-xs font-semibold text-[var(--astra-text-primary)] truncate">
                  {user.fullName} · {user.bloodGroup}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                <div className="text-[11px] text-[var(--astra-text-secondary)]">Mission Duration</div>
                <div className="mt-0.5 font-mono-tabular text-xs font-semibold text-[#B9DDF5]">
                  {metDisplay}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-3">
                <div className="text-[11px] text-[var(--astra-text-secondary)]">Last Sim Update</div>
                <div className="mt-0.5 font-mono-tabular text-xs font-semibold text-[var(--astra-text-primary)]">
                  {formatTimeShort(latestReading.timestamp)}
                </div>
              </div>
            </div>

            {/* Selected 3D Hotspot Telemetry Inspector */}
            <div className="rounded-xl border border-[#8AB9E8]/30 bg-[var(--astra-bg-secondary)]/85 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-medium text-[#8AB9E8]">
                    {activeHotspot.subsystem}
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--astra-text-primary)]">
                    {activeHotspot.title}
                  </h3>
                </div>
                <StatusBadge status={overallStatus} compact />
              </div>
              <p className="text-xs leading-relaxed text-[var(--astra-text-secondary)]">
                {activeHotspot.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {activeHotspot.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/70 px-3 py-2"
                  >
                    <span className="text-xs text-[var(--astra-text-secondary)]">{m.label}</span>
                    <span className="font-mono-tabular text-xs font-semibold text-[var(--astra-text-primary)]">
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Demonstration Scenario Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--astra-text-secondary)]">
                  Simulated Telemetry Scenario
                </span>
                <span className="text-[11px] text-[var(--astra-text-secondary)]">
                  Simulated Data · Demo Only
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setScenario(opt.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      scenario === opt.id
                        ? 'border-[#8AB9E8] bg-[#8AB9E8]/20 text-[#B9DDF5]'
                        : 'border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right/Center Hero: 3D Interactive Astronaut Visualization */}
          <div className="xl:col-span-7">
            <AstronautViewer
              selectedHotspot={selectedHotspot}
              onSelectHotspot={setSelectedHotspot}
              reading={latestReading}
              overallStatus={overallStatus}
            />
          </div>
        </div>
      </section>

      {/* 6 Physiological Summary Cards */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-[var(--astra-text-primary)]">
              Simulated Vital Signs Summary
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Live simulated stream ({isMonitoring ? 'updating automatically' : 'paused'}) · Illustrative aerospace demonstration values
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('monitoring')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3.5 py-2 text-xs font-medium text-[#B9DDF5] hover:border-[#8AB9E8] transition-colors whitespace-nowrap"
          >
            <span>Open Live Monitoring</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label={METRIC_META.heartRate.label}
            value={String(latestReading.heartRate)}
            unit={METRIC_META.heartRate.unit}
            status={metricStatuses.heartRate}
            delta={latestReading.heartRate - previousReading.heartRate}
            precision={0}
            timestamp={latestReading.timestamp}
            icon={HeartPulse}
            subtitle={`Normal band: ${METRIC_META.heartRate.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
          <MetricCard
            label={METRIC_META.spo2.label}
            value={latestReading.spo2.toFixed(1)}
            unit={METRIC_META.spo2.unit}
            status={metricStatuses.spo2}
            delta={latestReading.spo2 - previousReading.spo2}
            precision={1}
            timestamp={latestReading.timestamp}
            icon={Droplets}
            subtitle={`Normal band: ${METRIC_META.spo2.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
          <MetricCard
            label={METRIC_META.bodyTemperature.label}
            value={latestReading.bodyTemperature.toFixed(1)}
            unit={METRIC_META.bodyTemperature.unit}
            status={metricStatuses.bodyTemperature}
            delta={latestReading.bodyTemperature - previousReading.bodyTemperature}
            precision={1}
            timestamp={latestReading.timestamp}
            icon={Thermometer}
            subtitle={`Normal band: ${METRIC_META.bodyTemperature.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
          <MetricCard
            label={METRIC_META.respiratoryRate.label}
            value={String(latestReading.respiratoryRate)}
            unit={METRIC_META.respiratoryRate.unit}
            status={metricStatuses.respiratoryRate}
            delta={latestReading.respiratoryRate - previousReading.respiratoryRate}
            precision={0}
            timestamp={latestReading.timestamp}
            icon={Wind}
            subtitle={`Normal band: ${METRIC_META.respiratoryRate.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
          <MetricCard
            label={METRIC_META.stressIndex.label}
            value={String(latestReading.stressIndex)}
            unit={METRIC_META.stressIndex.unit}
            status={metricStatuses.stressIndex}
            delta={latestReading.stressIndex - previousReading.stressIndex}
            precision={0}
            timestamp={latestReading.timestamp}
            icon={Brain}
            subtitle={`Normal band: ${METRIC_META.stressIndex.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
          <MetricCard
            label={METRIC_META.sleepHours.label}
            value={latestReading.sleepHours.toFixed(1)}
            unit={METRIC_META.sleepHours.unit}
            status={metricStatuses.sleepHours}
            delta={latestReading.sleepHours - previousReading.sleepHours}
            precision={1}
            timestamp={latestReading.timestamp}
            icon={Moon}
            subtitle={`Normal band: ${METRIC_META.sleepHours.illustrativeNormalRange}`}
            onClick={() => onNavigate('monitoring')}
          />
        </div>
      </section>

      {/* Secondary Grid: Health Trend Chart + Recent Alerts + Mission Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-7 astra-panel rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
                Heart Rate Trajectory (Last 1 Hour · Simulated)
              </h3>
              <p className="text-xs text-[var(--astra-text-secondary)]">
                Dashed lines indicate illustrative warning and critical thresholds
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('astra-pulse')}
              className="rounded-lg border border-[#8AB9E8]/35 bg-[#8AB9E8]/15 px-3 py-1.5 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors whitespace-nowrap"
            >
              Run ASTRA PULSE AI
            </button>
          </div>

          <HealthChart
            data={recentReadings}
            dataKey="heartRate"
            label="Heart Rate"
            unit="BPM"
            color="#8AB9E8"
            domain={[40, 155]}
            thresholds={settings.thresholds.heartRate}
            height={230}
          />

          {/* Mission Activity Summary Strip */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--astra-border)] text-xs">
            <div>
              <div className="text-[var(--astra-text-secondary)]">Activity Level</div>
              <div className="mt-0.5 font-semibold text-[var(--astra-text-primary)]">
                {latestReading.activityLevel}
              </div>
            </div>
            <div>
              <div className="text-[var(--astra-text-secondary)]">Active Alerts</div>
              <div className="mt-0.5 font-mono-tabular font-semibold text-[var(--astra-text-primary)]">
                {activeAlertsCount} unresolved
              </div>
            </div>
            <div>
              <div className="text-[var(--astra-text-secondary)]">Crew Journal</div>
              <div className="mt-0.5 font-mono-tabular font-semibold text-[var(--astra-text-primary)]">
                {journalEntries.length} logged entries
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts & Latest Health Events */}
        <div className="lg:col-span-5 space-y-4">
          <div className="astra-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#8AB9E8]" aria-hidden="true" />
                <h3 className="font-display text-base font-semibold text-[var(--astra-text-primary)]">
                  Recent Alerts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
                className="text-xs font-medium text-[#8AB9E8] hover:text-[#B9DDF5]"
              >
                View all ({alerts.length})
              </button>
            </div>

            {recentAlerts.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No alerts triggered"
                description="Simulated telemetry is currently within nominal ranges. Trigger an anomaly scenario above to test early-warning alerts."
              />
            ) : (
              <div className="space-y-2.5">
                {recentAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={markAlertRead}
                    onResolve={resolveAlert}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          <div className="astra-panel rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[var(--astra-text-primary)]">
                Latest Crew Journal Event
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="text-xs font-medium text-[#8AB9E8] hover:text-[#B9DDF5]"
              >
                Open Journal
              </button>
            </div>
            {journalEntries[0] ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[var(--astra-text-secondary)]">
                  <span>{journalEntries[0].entryDate}</span>
                  <span>
                    Mood: {journalEntries[0].moodStatus} · Sleep {journalEntries[0].sleepQuality}/5
                  </span>
                </div>
                <p className="text-[var(--astra-text-primary)] leading-relaxed">
                  {journalEntries[0].observations}
                </p>
                <div className="text-[11px] text-[var(--astra-text-secondary)]">
                  Logged {formatDateTime(journalEntries[0].createdAt)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--astra-text-secondary)]">
                No crew health journal entries recorded yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
