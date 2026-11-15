export type NavPageId =
  | 'overview'
  | 'monitoring'
  | 'astra-pulse'
  | 'alerts'
  | 'journal'
  | 'reports'
  | 'settings';

export type BloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';

export type BiologicalSex = 'Female' | 'Male' | 'Other' | 'Prefer not to say';

export type AstronautRole =
  | 'Mission Commander'
  | 'Flight Engineer'
  | 'Payload Specialist'
  | 'Flight Surgeon'
  | 'Science Officer';

export interface AstronautProfile {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  callsign: string;
  role: AstronautRole;
  missionName: string;
  spacecraft: string;
  age: number;
  sex: BiologicalSex;
  bloodGroup: BloodGroup;
  heightCm: number;
  weightKg: number;
  restingHeartRate: number;
  medicalNotes: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeAstronautProfile = Omit<AstronautProfile, 'passwordHash'>;

export type MetricStatus = 'normal' | 'warning' | 'critical';

export type TelemetryMetricKey =
  | 'heartRate'
  | 'spo2'
  | 'bodyTemperature'
  | 'respiratoryRate'
  | 'stressIndex'
  | 'sleepHours';

export type ActivityLevel = 'Resting' | 'Nominal' | 'Moderate EVA' | 'High Exertion';

export interface TelemetryReading {
  timestamp: string;
  heartRate: number;
  spo2: number;
  bodyTemperature: number;
  respiratoryRate: number;
  stressIndex: number;
  sleepHours: number;
  activityLevel: ActivityLevel;
}

export type TelemetryScenario =
  | 'normal'
  | 'elevated_hr'
  | 'reduced_spo2'
  | 'elevated_temp'
  | 'multi_abnormal';

export type TimeRangeFilter = '1h' | '6h' | '24h' | '7d';

export interface ThresholdRange {
  warningHigh?: number;
  criticalHigh?: number;
  warningLow?: number;
  criticalLow?: number;
}

export interface MonitoringThresholds {
  heartRate: ThresholdRange;
  spo2: ThresholdRange;
  bodyTemperature: ThresholdRange;
  respiratoryRate: ThresholdRange;
  stressIndex: ThresholdRange;
  sleepHours: ThresholdRange;
}

export type AlertSeverity = 'normal' | 'warning' | 'critical' | 'system';

export interface HealthAlert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  metric: TelemetryMetricKey | 'system';
  metricLabel: string;
  valueDisplay: string;
  title: string;
  explanation: string;
  scenario?: TelemetryScenario;
  read: boolean;
  resolved: boolean;
  resolvedAt?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  entryDate: string;
  symptoms: string[];
  sleepQuality: 1 | 2 | 3 | 4 | 5;
  stressLevel: number; // 1-10
  moodStatus: 'Optimal' | 'Steady' | 'Fatigued' | 'Strained';
  observations: string;
  notes: string;
}

export type ThemePreference = 'deep-space' | 'orbital-slate' | 'clinical-light';

export interface AppSettings {
  missionStartDate: string;
  commandAuthority: string;
  simulationSpeed: 0.5 | 1 | 2 | 5;
  autoStartMonitoring: boolean;
  autoGenerateAlerts: boolean;
  alertCooldownSeconds: number;
  theme: ThemePreference;
  thresholds: MonitoringThresholds;
}

export type AstraPulseMode = 'current' | 'historical' | 'manual';

export interface AstraPulseRequestPayload {
  mode: AstraPulseMode;
  astronaut?: {
    fullName: string;
    callsign: string;
    age: number;
    bloodGroup: BloodGroup;
    missionName: string;
  };
  currentReading: {
    heartRate: number;
    spo2: number;
    bodyTemperature: number;
    respiratoryRate: number;
    stressIndex: number;
    sleepHours: number;
    activityLevel?: string;
  };
  historicalSummary?: {
    windowLabel: string;
    sampleCount: number;
    avgHeartRate: number;
    avgSpo2: number;
    avgBodyTemperature: number;
    avgRespiratoryRate: number;
    avgStressIndex: number;
    avgSleepHours: number;
    recentAlertsCount: number;
  };
  notes?: string;
}

export interface AstraPulseAnalysisResult {
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  summary: string;
  observations: string[];
  contributingFactors: string[];
  recommendedActions: string[];
  dataQuality: 'SUFFICIENT' | 'LIMITED';
  disclaimer: string;
}

export interface AstraPulseResponse {
  engine: 'gemini-4-hydrogen' | 'rule-based-fallback';
  fallbackReason?: string;
  timestamp: string;
  analysis: AstraPulseAnalysisResult;
}

export interface AstraPulseHistoryItem {
  id: string;
  mode: AstraPulseMode;
  timestamp: string;
  inputSnapshot: AstraPulseRequestPayload['currentReading'];
  response: AstraPulseResponse;
}

export type HotspotZone = 'head' | 'chest' | 'arms' | 'torso';
