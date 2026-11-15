import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, storage } from '../services/storage';
import {
  evaluateReadingStatuses,
  generateAlertsForReading,
  generateInitialHistory,
  getOverallHealthStatus,
  stepTelemetryReading,
} from '../services/telemetryEngine';
import type {
  AppSettings,
  AstraPulseHistoryItem,
  HealthAlert,
  JournalEntry,
  MetricStatus,
  TelemetryMetricKey,
  TelemetryReading,
  TelemetryScenario,
} from '../types';
import { useAuth } from './useAuth';

interface TelemetryContextValue {
  readings: TelemetryReading[];
  latestReading: TelemetryReading;
  previousReading: TelemetryReading;
  metricStatuses: Record<TelemetryMetricKey, MetricStatus>;
  overallStatus: MetricStatus;
  isMonitoring: boolean;
  hasStarted: boolean;
  scenario: TelemetryScenario;
  alerts: HealthAlert[];
  unreadAlertCount: number;
  journalEntries: JournalEntry[];
  settings: AppSettings;
  pulseHistory: AstraPulseHistoryItem[];
  startMonitoring: () => void;
  pauseMonitoring: () => void;
  resumeMonitoring: () => void;
  resetSimulation: () => void;
  setScenario: (scenario: TelemetryScenario) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  resolveAlert: (id: string) => void;
  clearResolvedAlerts: () => void;
  resetDemoAlerts: () => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => JournalEntry;
  updateJournalEntry: (id: string, patch: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>>) => void;
  deleteJournalEntry: (id: string) => void;
  updateSettings: (next: AppSettings) => void;
  addPulseHistoryItem: (item: AstraPulseHistoryItem) => void;
  resetAllDemoData: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const restingHr = user?.restingHeartRate ?? 64;

  const [settings, setSettings] = useState<AppSettings>(() =>
    user ? storage.getSettings(user.id) : DEFAULT_SETTINGS
  );
  const [readings, setReadings] = useState<TelemetryReading[]>(() =>
    generateInitialHistory(restingHr)
  );
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [pulseHistory, setPulseHistory] = useState<AstraPulseHistoryItem[]>([]);
  const [scenario, setScenarioState] = useState<TelemetryScenario>('normal');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [hasStarted, setHasStarted] = useState<boolean>(true);

  const tickCountRef = useRef(0);
  const alertsRef = useRef<HealthAlert[]>(alerts);
  alertsRef.current = alerts;
  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;

  // Hydrate workspace state when active astronaut changes
  useEffect(() => {
    if (!user) return;
    const loadedSettings = storage.getSettings(user.id);
    setSettings(loadedSettings);
    setIsMonitoring(loadedSettings.autoStartMonitoring);
    setHasStarted(loadedSettings.autoStartMonitoring);

    const storedReadings = storage.getTelemetry(user.id);
    if (storedReadings.length >= 20) {
      setReadings(storedReadings);
    } else {
      const fresh = generateInitialHistory(user.restingHeartRate);
      setReadings(fresh);
      storage.saveTelemetry(user.id, fresh);
    }

    setAlerts(storage.getAlerts(user.id));
    setJournalEntries(storage.getJournal(user.id));
    setPulseHistory(storage.getPulseHistory(user.id));
    setScenarioState('normal');
  }, [user?.id]);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-orbital', 'theme-light', 'dark');
    if (settings.theme === 'clinical-light') {
      root.classList.add('theme-light');
    } else if (settings.theme === 'orbital-slate') {
      root.classList.add('dark', 'theme-orbital');
    } else {
      root.classList.add('dark');
    }
  }, [settings.theme]);

  // Simulation tick interval
  useEffect(() => {
    if (!user || !isMonitoring) return;

    const intervalMs = Math.max(800, Math.round(3000 / settings.simulationSpeed));
    const timer = window.setInterval(() => {
      tickCountRef.current += 1;
      setReadings((prev) => {
        const last = prev[prev.length - 1] ?? generateInitialHistory(restingHr).slice(-1)[0];
        const nextSample = stepTelemetryReading(last, scenario, restingHr, tickCountRef.current);
        const updated = [...prev.slice(-399), nextSample];
        storage.saveTelemetry(userId, updated);

        if (settingsRef.current.autoGenerateAlerts) {
          const newAlerts = generateAlertsForReading(
            nextSample,
            settingsRef.current.thresholds,
            alertsRef.current,
            settingsRef.current.alertCooldownSeconds,
            scenario
          );
          if (newAlerts.length > 0) {
            setAlerts((currAlerts) => {
              const merged = [...newAlerts, ...currAlerts].slice(0, 150);
              storage.saveAlerts(userId, merged);
              return merged;
            });
          }
        }

        return updated;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [user, userId, isMonitoring, scenario, settings.simulationSpeed, restingHr]);

  const startMonitoring = useCallback(() => {
    setHasStarted(true);
    setIsMonitoring(true);
  }, []);

  const pauseMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const resumeMonitoring = useCallback(() => {
    setHasStarted(true);
    setIsMonitoring(true);
  }, []);

  const resetSimulation = useCallback(() => {
    tickCountRef.current = 0;
    setScenarioState('normal');
    const fresh = generateInitialHistory(restingHr);
    setReadings(fresh);
    if (user) {
      storage.saveTelemetry(user.id, fresh);
    }
  }, [restingHr, user]);

  const setScenario = useCallback(
    (nextScenario: TelemetryScenario) => {
      setScenarioState(nextScenario);
      // Immediately step 2 samples into the new scenario so the UI reflects the change promptly
      setReadings((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        const step1 = stepTelemetryReading(last, nextScenario, restingHr, tickCountRef.current + 1);
        const step2 = stepTelemetryReading(step1, nextScenario, restingHr, tickCountRef.current + 2);
        tickCountRef.current += 2;
        const updated = [...prev.slice(-398), step1, step2];
        if (user) storage.saveTelemetry(user.id, updated);

        if (user && settingsRef.current.autoGenerateAlerts) {
          const generated = generateAlertsForReading(
            step2,
            settingsRef.current.thresholds,
            alertsRef.current,
            5,
            nextScenario
          );
          if (generated.length > 0) {
            setAlerts((curr) => {
              const merged = [...generated, ...curr].slice(0, 150);
              storage.saveAlerts(user.id, merged);
              return merged;
            });
          }
        }
        return updated;
      });
    },
    [restingHr, user]
  );

  const markAlertRead = useCallback(
    (id: string) => {
      setAlerts((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
        if (user) storage.saveAlerts(user.id, next);
        return next;
      });
    },
    [user]
  );

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      if (user) storage.saveAlerts(user.id, next);
      return next;
    });
  }, [user]);

  const resolveAlert = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setAlerts((prev) => {
        const next = prev.map((a) =>
          a.id === id ? { ...a, resolved: true, read: true, resolvedAt: now } : a
        );
        if (user) storage.saveAlerts(user.id, next);
        return next;
      });
    },
    [user]
  );

  const clearResolvedAlerts = useCallback(() => {
    setAlerts((prev) => {
      const next = prev.filter((a) => !a.resolved);
      if (user) storage.saveAlerts(user.id, next);
      return next;
    });
  }, [user]);

  const resetDemoAlerts = useCallback(() => {
    setAlerts([]);
    if (user) storage.saveAlerts(user.id, []);
  }, [user]);

  const addJournalEntry = useCallback(
    (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const created: JournalEntry = {
        ...entry,
        id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      setJournalEntries((prev) => {
        const next = [created, ...prev];
        if (user) storage.saveJournal(user.id, next);
        return next;
      });
      return created;
    },
    [user, userId]
  );

  const updateJournalEntry = useCallback(
    (id: string, patch: Partial<Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>>) => {
      const now = new Date().toISOString();
      setJournalEntries((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e));
        if (user) storage.saveJournal(user.id, next);
        return next;
      });
    },
    [user]
  );

  const deleteJournalEntry = useCallback(
    (id: string) => {
      setJournalEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        if (user) storage.saveJournal(user.id, next);
        return next;
      });
    },
    [user]
  );

  const updateSettings = useCallback(
    (next: AppSettings) => {
      setSettings(next);
      if (user) storage.saveSettings(user.id, next);
    },
    [user]
  );

  const addPulseHistoryItem = useCallback(
    (item: AstraPulseHistoryItem) => {
      setPulseHistory((prev) => {
        const next = [item, ...prev].slice(0, 30);
        if (user) storage.savePulseHistory(user.id, next);
        return next;
      });
    },
    [user]
  );

  const resetAllDemoData = useCallback(() => {
    if (!user) return;
    storage.resetUserWorkspace(user.id);
    const freshSettings = storage.getSettings(user.id);
    const freshTelemetry = generateInitialHistory(user.restingHeartRate);
    const freshJournal = storage.getJournal(user.id);
    setSettings(freshSettings);
    setReadings(freshTelemetry);
    storage.saveTelemetry(user.id, freshTelemetry);
    setAlerts([]);
    setJournalEntries(freshJournal);
    setPulseHistory([]);
    setScenarioState('normal');
    setIsMonitoring(freshSettings.autoStartMonitoring);
  }, [user]);

  const latestReading = readings[readings.length - 1] ?? generateInitialHistory(restingHr)[0];
  const previousReading = readings[readings.length - 2] ?? latestReading;

  const metricStatuses = useMemo(
    () => evaluateReadingStatuses(latestReading, settings.thresholds),
    [latestReading, settings.thresholds]
  );

  const overallStatus = useMemo(
    () => getOverallHealthStatus(latestReading, settings.thresholds),
    [latestReading, settings.thresholds]
  );

  const unreadAlertCount = useMemo(
    () => alerts.filter((a) => !a.read && !a.resolved).length,
    [alerts]
  );

  return (
    <TelemetryContext.Provider
      value={{
        readings,
        latestReading,
        previousReading,
        metricStatuses,
        overallStatus,
        isMonitoring,
        hasStarted,
        scenario,
        alerts,
        unreadAlertCount,
        journalEntries,
        settings,
        pulseHistory,
        startMonitoring,
        pauseMonitoring,
        resumeMonitoring,
        resetSimulation,
        setScenario,
        markAlertRead,
        markAllAlertsRead,
        resolveAlert,
        clearResolvedAlerts,
        resetDemoAlerts,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        updateSettings,
        addPulseHistoryItem,
        resetAllDemoData,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used inside TelemetryProvider');
  return ctx;
}
