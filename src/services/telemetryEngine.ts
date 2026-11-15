import type {
  ActivityLevel,
  AlertSeverity,
  HealthAlert,
  MetricStatus,
  MonitoringThresholds,
  TelemetryMetricKey,
  TelemetryReading,
  TelemetryScenario,
  ThresholdRange,
  TimeRangeFilter,
} from '../types';

export interface MetricMetadata {
  key: TelemetryMetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  precision: number;
  illustrativeNormalRange: string;
}

export const METRIC_META: Record<TelemetryMetricKey, MetricMetadata> = {
  heartRate: {
    key: 'heartRate',
    label: 'Heart Rate',
    shortLabel: 'HR',
    unit: 'BPM',
    precision: 0,
    illustrativeNormalRange: '48 – 100 BPM',
  },
  spo2: {
    key: 'spo2',
    label: 'Blood Oxygen (SpO2)',
    shortLabel: 'SpO2',
    unit: '%',
    precision: 1,
    illustrativeNormalRange: '95 – 100 %',
  },
  bodyTemperature: {
    key: 'bodyTemperature',
    label: 'Body Temperature',
    shortLabel: 'Temp',
    unit: '°C',
    precision: 1,
    illustrativeNormalRange: '36.1 – 37.5 °C',
  },
  respiratoryRate: {
    key: 'respiratoryRate',
    label: 'Respiratory Rate',
    shortLabel: 'Resp',
    unit: 'breaths/min',
    precision: 0,
    illustrativeNormalRange: '11 – 20 /min',
  },
  stressIndex: {
    key: 'stressIndex',
    label: 'Stress Index',
    shortLabel: 'Stress',
    unit: '/100',
    precision: 0,
    illustrativeNormalRange: '10 – 64 /100',
  },
  sleepHours: {
    key: 'sleepHours',
    label: 'Sleep Duration',
    shortLabel: 'Sleep',
    unit: 'hrs',
    precision: 1,
    illustrativeNormalRange: '6.0 – 9.0 hrs',
  },
};

export const SCENARIO_OPTIONS: {
  id: TelemetryScenario;
  label: string;
  description: string;
}[] = [
  {
    id: 'normal',
    label: 'Normal Baseline',
    description: 'Balanced orbital resting and nominal EVA physiology',
  },
  {
    id: 'elevated_hr',
    label: 'Elevated Heart Rate',
    description: 'Simulates sustained cardiovascular strain / tachycardia (124–142 BPM)',
  },
  {
    id: 'reduced_spo2',
    label: 'Reduced Blood Oxygen',
    description: 'Simulates suit O2 loop drop / mild-to-critical hypoxia (87–92%)',
  },
  {
    id: 'elevated_temp',
    label: 'Elevated Temperature',
    description: 'Simulates LCVG thermal load / febrile excursion (38.3–39.1°C)',
  },
  {
    id: 'multi_abnormal',
    label: 'Multi-Indicator Anomaly',
    description: 'Combined high HR, reduced SpO2, elevated temp, and high autonomic stress',
  },
];

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// Smooth bounded mean-reverting step so readings evolve realistically rather than jumping randomly
function evolveValue(
  current: number,
  target: number,
  noiseAmplitude: number,
  reversionRate = 0.28
): number {
  const drift = (target - current) * reversionRate;
  const noise = (Math.random() - 0.5) * 2 * noiseAmplitude;
  return current + drift + noise;
}

export function getScenarioTargets(
  scenario: TelemetryScenario,
  restingHeartRate = 64,
  phaseRadians = 0
): {
  heartRate: number;
  spo2: number;
  bodyTemperature: number;
  respiratoryRate: number;
  stressIndex: number;
  sleepHours: number;
  activityLevel: ActivityLevel;
} {
  const circadianWave = Math.sin(phaseRadians);

  switch (scenario) {
    case 'elevated_hr':
      return {
        heartRate: 128 + circadianWave * 6,
        spo2: 96.4,
        bodyTemperature: 37.3,
        respiratoryRate: 23,
        stressIndex: 72,
        sleepHours: 6.4,
        activityLevel: 'High Exertion',
      };
    case 'reduced_spo2':
      return {
        heartRate: 98 + circadianWave * 4,
        spo2: 88.6 + circadianWave * 0.8,
        bodyTemperature: 36.9,
        respiratoryRate: 24,
        stressIndex: 76,
        sleepHours: 6.2,
        activityLevel: 'Moderate EVA',
      };
    case 'elevated_temp':
      return {
        heartRate: 104 + circadianWave * 3,
        spo2: 96.8,
        bodyTemperature: 38.5 + circadianWave * 0.15,
        respiratoryRate: 21,
        stressIndex: 68,
        sleepHours: 5.8,
        activityLevel: 'Moderate EVA',
      };
    case 'multi_abnormal':
      return {
        heartRate: 136 + circadianWave * 5,
        spo2: 87.8 + circadianWave * 0.7,
        bodyTemperature: 38.7 + circadianWave * 0.15,
        respiratoryRate: 28,
        stressIndex: 89,
        sleepHours: 4.3,
        activityLevel: 'High Exertion',
      };
    case 'normal':
    default:
      return {
        heartRate: restingHeartRate + 6 + circadianWave * 5,
        spo2: 98.3 + circadianWave * 0.4,
        bodyTemperature: 36.7 + circadianWave * 0.2,
        respiratoryRate: 15 + circadianWave * 1.5,
        stressIndex: 28 + circadianWave * 6,
        sleepHours: 7.4,
        activityLevel: circadianWave > 0.35 ? 'Moderate EVA' : circadianWave < -0.5 ? 'Resting' : 'Nominal',
      };
  }
}

export function generateInitialHistory(restingHeartRate = 64): TelemetryReading[] {
  // Build 180 points spanning the last 7 days with denser recent points (last 2 hours every 2 mins, prior 24h every 20 mins, prior 6d every 2 hours)
  const now = Date.now();
  const timestamps: number[] = [];

  // Days -7 to -1 (every 2 hours -> 72 points)
  for (let h = 168; h > 24; h -= 2) {
    timestamps.push(now - h * 3600 * 1000);
  }
  // Hours -24 to -2 (every 20 mins -> 66 points)
  for (let m = 24 * 60; m > 120; m -= 20) {
    timestamps.push(now - m * 60 * 1000);
  }
  // Last 2 hours (every 2 mins -> 60 points)
  for (let m = 120; m >= 0; m -= 2) {
    timestamps.push(now - m * 60 * 1000);
  }

  let hr = restingHeartRate + 5;
  let spo2 = 98.4;
  let temp = 36.7;
  let resp = 15;
  let stress = 26;
  let sleep = 7.4;

  return timestamps.map((ts, index) => {
    const phase = (index / 24) * Math.PI * 2;
    const target = getScenarioTargets('normal', restingHeartRate, phase);
    hr = clamp(evolveValue(hr, target.heartRate, 2.2, 0.32), 45, 110);
    spo2 = clamp(evolveValue(spo2, target.spo2, 0.25, 0.35), 95, 100);
    temp = clamp(evolveValue(temp, target.bodyTemperature, 0.06, 0.3), 36.0, 37.5);
    resp = clamp(evolveValue(resp, target.respiratoryRate, 0.7, 0.32), 11, 20);
    stress = clamp(evolveValue(stress, target.stressIndex, 2.5, 0.3), 12, 60);
    sleep = clamp(evolveValue(sleep, target.sleepHours, 0.12, 0.2), 5.5, 8.8);

    return {
      timestamp: new Date(ts).toISOString(),
      heartRate: roundTo(hr, 0),
      spo2: roundTo(spo2, 1),
      bodyTemperature: roundTo(temp, 1),
      respiratoryRate: roundTo(resp, 0),
      stressIndex: roundTo(stress, 0),
      sleepHours: roundTo(sleep, 1),
      activityLevel: target.activityLevel,
    };
  });
}

export function stepTelemetryReading(
  previous: TelemetryReading,
  scenario: TelemetryScenario,
  restingHeartRate = 64,
  tickCount = 1
): TelemetryReading {
  const phase = tickCount * 0.25;
  const target = getScenarioTargets(scenario, restingHeartRate, phase);

  const heartRate = roundTo(
    clamp(evolveValue(previous.heartRate, target.heartRate, 2.6, 0.36), 34, 185),
    0
  );
  const spo2 = roundTo(
    clamp(evolveValue(previous.spo2, target.spo2, 0.35, 0.38), 78, 100),
    1
  );
  const bodyTemperature = roundTo(
    clamp(evolveValue(previous.bodyTemperature, target.bodyTemperature, 0.08, 0.34), 34.5, 40.5),
    1
  );
  const respiratoryRate = roundTo(
    clamp(evolveValue(previous.respiratoryRate, target.respiratoryRate, 0.9, 0.35), 6, 40),
    0
  );
  const stressIndex = roundTo(
    clamp(evolveValue(previous.stressIndex, target.stressIndex, 2.8, 0.34), 5, 99),
    0
  );
  const sleepHours = roundTo(
    clamp(evolveValue(previous.sleepHours, target.sleepHours, 0.06, 0.22), 2.5, 10.5),
    1
  );

  return {
    timestamp: new Date().toISOString(),
    heartRate,
    spo2,
    bodyTemperature,
    respiratoryRate,
    stressIndex,
    sleepHours,
    activityLevel: target.activityLevel,
  };
}

export function evaluateThreshold(value: number, range: ThresholdRange): MetricStatus {
  if (
    (range.criticalHigh !== undefined && value >= range.criticalHigh) ||
    (range.criticalLow !== undefined && value <= range.criticalLow)
  ) {
    return 'critical';
  }
  if (
    (range.warningHigh !== undefined && value >= range.warningHigh) ||
    (range.warningLow !== undefined && value <= range.warningLow)
  ) {
    return 'warning';
  }
  return 'normal';
}

export function evaluateReadingStatuses(
  reading: TelemetryReading,
  thresholds: MonitoringThresholds
): Record<TelemetryMetricKey, MetricStatus> {
  return {
    heartRate: evaluateThreshold(reading.heartRate, thresholds.heartRate),
    spo2: evaluateThreshold(reading.spo2, thresholds.spo2),
    bodyTemperature: evaluateThreshold(reading.bodyTemperature, thresholds.bodyTemperature),
    respiratoryRate: evaluateThreshold(reading.respiratoryRate, thresholds.respiratoryRate),
    stressIndex: evaluateThreshold(reading.stressIndex, thresholds.stressIndex),
    sleepHours: evaluateThreshold(reading.sleepHours, thresholds.sleepHours),
  };
}

export function getOverallHealthStatus(
  reading: TelemetryReading,
  thresholds: MonitoringThresholds
): MetricStatus {
  const statuses = Object.values(evaluateReadingStatuses(reading, thresholds));
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  return 'normal';
}

export function filterReadingsByRange(
  readings: TelemetryReading[],
  range: TimeRangeFilter
): TelemetryReading[] {
  if (readings.length === 0) return [];
  const latestTs = new Date(readings[readings.length - 1].timestamp).getTime();
  const windowMs =
    range === '1h'
      ? 3600 * 1000
      : range === '6h'
        ? 6 * 3600 * 1000
        : range === '24h'
          ? 24 * 3600 * 1000
          : 7 * 24 * 3600 * 1000;
  const cutoff = latestTs - windowMs;
  const filtered = readings.filter((r) => new Date(r.timestamp).getTime() >= cutoff);
  return filtered.length >= 2 ? filtered : readings.slice(-Math.min(readings.length, 20));
}

export function generateAlertsForReading(
  reading: TelemetryReading,
  thresholds: MonitoringThresholds,
  existingAlerts: HealthAlert[],
  cooldownSeconds: number,
  scenario: TelemetryScenario
): HealthAlert[] {
  const statuses = evaluateReadingStatuses(reading, thresholds);
  const nowMs = new Date(reading.timestamp).getTime();
  const created: HealthAlert[] = [];

  const keys: TelemetryMetricKey[] = [
    'heartRate',
    'spo2',
    'bodyTemperature',
    'respiratoryRate',
    'stressIndex',
    'sleepHours',
  ];

  for (const key of keys) {
    const status = statuses[key];
    if (status === 'normal') continue;

    // Prevent duplicate alerts within cooldown window for same metric & severity
    const recentSame = existingAlerts.find((a) => {
      if (a.metric !== key || a.severity !== status || a.resolved) return false;
      const ageSec = (nowMs - new Date(a.timestamp).getTime()) / 1000;
      return ageSec < cooldownSeconds;
    });
    if (recentSame) continue;

    const meta = METRIC_META[key];
    const value = reading[key];
    const severity: AlertSeverity = status;
    const isHigh =
      (thresholds[key].warningHigh !== undefined && value >= thresholds[key].warningHigh!) ||
      (thresholds[key].criticalHigh !== undefined && value >= thresholds[key].criticalHigh!);

    const directionLabel = isHigh ? 'elevated above' : 'dropped below';
    const title = `${meta.label} ${status === 'critical' ? 'Critical Excursion' : 'Threshold Warning'}`;
    const explanation = `Simulated ${meta.label.toLowerCase()} (${value.toFixed(meta.precision)} ${meta.unit}) ${directionLabel} illustrative ${status} threshold (${meta.illustrativeNormalRange}).`;

    created.push({
      id: `alert-${key}-${status}-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: reading.timestamp,
      severity,
      metric: key,
      metricLabel: meta.label,
      valueDisplay: `${value.toFixed(meta.precision)} ${meta.unit}`,
      title,
      explanation,
      scenario,
      read: false,
      resolved: false,
    });
  }

  return created;
}
