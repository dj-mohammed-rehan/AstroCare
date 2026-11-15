import type {
  AppSettings,
  AstraPulseHistoryItem,
  HealthAlert,
  JournalEntry,
  MonitoringThresholds,
  TelemetryReading,
} from '../types';
import defaultAvatarUrl from '../assets/images/astronaut_default_avatar_1794655335105.jpg';

export const DEFAULT_AVATAR_PATH = defaultAvatarUrl;

export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  heartRate: { warningHigh: 100, criticalHigh: 120, warningLow: 48, criticalLow: 40 },
  spo2: { warningLow: 94, criticalLow: 90 },
  bodyTemperature: { warningHigh: 37.6, criticalHigh: 38.2, warningLow: 35.8, criticalLow: 35.2 },
  respiratoryRate: { warningHigh: 21, criticalHigh: 25, warningLow: 10, criticalLow: 8 },
  stressIndex: { warningHigh: 65, criticalHigh: 82 },
  sleepHours: { warningLow: 5.5, criticalLow: 4.0 },
};

export const DEFAULT_SETTINGS: AppSettings = {
  missionStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  commandAuthority: 'AstroCare Flight Biomedical Operations (Simulated)',
  simulationSpeed: 1,
  autoStartMonitoring: true,
  autoGenerateAlerts: true,
  alertCooldownSeconds: 20,
  theme: 'deep-space',
  thresholds: DEFAULT_THRESHOLDS,
};

export function createSeedJournalEntries(userId: string): JournalEntry[] {
  const now = Date.now();
  return [
    {
      id: 'journal-seed-1',
      userId,
      createdAt: new Date(now - 36 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 36 * 3600 * 1000).toISOString(),
      entryDate: new Date(now - 36 * 3600 * 1000).toISOString().slice(0, 10),
      symptoms: ['Mild cephalic fluid shift', 'Dry cabin air'],
      sleepQuality: 4,
      stressLevel: 3,
      moodStatus: 'Steady',
      observations: 'Routine post-orbit adaptation check. Hydration target 2.5L met.',
      notes: 'Sleep cycle aligned with ZULU schedule. No vestibular disorientation during docking prep.',
    },
    {
      id: 'journal-seed-2',
      userId,
      createdAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      updatedAt: new Date(now - 12 * 3600 * 1000).toISOString(),
      entryDate: new Date(now - 12 * 3600 * 1000).toISOString().slice(0, 10),
      symptoms: ['Post-EVA shoulder fatigue'],
      sleepQuality: 5,
      stressLevel: 2,
      moodStatus: 'Optimal',
      observations: 'Completed 45-minute resistive exercise protocol on ARED unit.',
      notes: 'Recovery heart rate normalized within 4 minutes. Suit cooling loop performed cleanly.',
    },
  ];
}

export interface StorageProvider {
  getSettings(userId: string): AppSettings;
  saveSettings(userId: string, settings: AppSettings): void;
  getJournal(userId: string): JournalEntry[];
  saveJournal(userId: string, entries: JournalEntry[]): void;
  getAlerts(userId: string): HealthAlert[];
  saveAlerts(userId: string, alerts: HealthAlert[]): void;
  getTelemetry(userId: string): TelemetryReading[];
  saveTelemetry(userId: string, readings: TelemetryReading[]): void;
  getPulseHistory(userId: string): AstraPulseHistoryItem[];
  savePulseHistory(userId: string, history: AstraPulseHistoryItem[]): void;
  resetUserWorkspace(userId: string): void;
}

const KEYS = {
  settings: (uid: string) => `astracare_v1_settings_${uid}`,
  journal: (uid: string) => `astracare_v1_journal_${uid}`,
  alerts: (uid: string) => `astracare_v1_alerts_${uid}`,
  telemetry: (uid: string) => `astracare_v1_telemetry_${uid}`,
  pulse: (uid: string) => `astracare_v1_pulse_${uid}`,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors safely in browser preview
  }
}

class LocalStorageProvider implements StorageProvider {

  getSettings(userId: string): AppSettings {
    const stored = readJson<Partial<AppSettings> | null>(KEYS.settings(userId), null);
    if (!stored) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...(stored.thresholds ?? {}),
      },
    };
  }

  saveSettings(userId: string, settings: AppSettings): void {
    writeJson(KEYS.settings(userId), settings);
  }

  getJournal(userId: string): JournalEntry[] {
    const stored = readJson<JournalEntry[] | null>(KEYS.journal(userId), null);
    if (!stored) {
      const seeded: JournalEntry[] = [];
      writeJson(KEYS.journal(userId), seeded);
      return seeded;
    }
    return stored;
  }

  saveJournal(userId: string, entries: JournalEntry[]): void {
    writeJson(KEYS.journal(userId), entries);
  }

  getAlerts(userId: string): HealthAlert[] {
    return readJson<HealthAlert[]>(KEYS.alerts(userId), []);
  }

  saveAlerts(userId: string, alerts: HealthAlert[]): void {
    writeJson(KEYS.alerts(userId), alerts.slice(0, 150));
  }

  getTelemetry(userId: string): TelemetryReading[] {
    return readJson<TelemetryReading[]>(KEYS.telemetry(userId), []);
  }

  saveTelemetry(userId: string, readings: TelemetryReading[]): void {
    // Keep last 400 samples persisted to avoid localStorage bloat while retaining full 7D resolution
    writeJson(KEYS.telemetry(userId), readings.slice(-400));
  }

  getPulseHistory(userId: string): AstraPulseHistoryItem[] {
    return readJson<AstraPulseHistoryItem[]>(KEYS.pulse(userId), []);
  }

  savePulseHistory(userId: string, history: AstraPulseHistoryItem[]): void {
    writeJson(KEYS.pulse(userId), history.slice(0, 30));
  }

  resetUserWorkspace(userId: string): void {
    window.localStorage.removeItem(KEYS.settings(userId));
    window.localStorage.removeItem(KEYS.journal(userId));
    window.localStorage.removeItem(KEYS.alerts(userId));
    window.localStorage.removeItem(KEYS.telemetry(userId));
    window.localStorage.removeItem(KEYS.pulse(userId));
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
