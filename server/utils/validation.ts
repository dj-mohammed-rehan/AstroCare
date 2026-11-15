import type { AstraPulseRequestPayload } from '../../src/types/index.ts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: AstraPulseRequestPayload;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateAstraPulsePayload(body: unknown): ValidationResult {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request payload must be a JSON object.'] };
  }

  const raw = body as Record<string, unknown>;
  const mode = raw.mode;
  if (mode !== 'current' && mode !== 'historical' && mode !== 'manual') {
    errors.push('Invalid analysis mode. Expected current, historical, or manual.');
  }

  const reading = raw.currentReading as Record<string, unknown> | undefined;
  if (!reading || typeof reading !== 'object') {
    errors.push('currentReading object is required.');
    return { valid: false, errors };
  }

  const hr = Number(reading.heartRate);
  const spo2 = Number(reading.spo2);
  const temp = Number(reading.bodyTemperature);
  const resp = Number(reading.respiratoryRate);
  const stress = Number(reading.stressIndex);
  const sleep = Number(reading.sleepHours);

  if (!isFiniteNumber(hr) || hr < 25 || hr > 240) {
    errors.push('Heart rate must be between 25 and 240 BPM.');
  }
  if (!isFiniteNumber(spo2) || spo2 < 50 || spo2 > 100) {
    errors.push('Blood oxygen (SpO2) must be between 50% and 100%.');
  }
  if (!isFiniteNumber(temp) || temp < 32 || temp > 43) {
    errors.push('Body temperature must be between 32.0°C and 43.0°C.');
  }
  if (!isFiniteNumber(resp) || resp < 4 || resp > 60) {
    errors.push('Respiratory rate must be between 4 and 60 breaths/min.');
  }
  if (!isFiniteNumber(stress) || stress < 0 || stress > 100) {
    errors.push('Stress index must be between 0 and 100.');
  }
  if (!isFiniteNumber(sleep) || sleep < 0 || sleep > 24) {
    errors.push('Sleep duration must be between 0 and 24 hours.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const notes =
    typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 600) : undefined;

  const sanitized: AstraPulseRequestPayload = {
    mode: mode as AstraPulseRequestPayload['mode'],
    astronaut:
      raw.astronaut && typeof raw.astronaut === 'object'
        ? {
            fullName: String((raw.astronaut as Record<string, unknown>).fullName ?? 'Crew Member').slice(0, 80),
            callsign: String((raw.astronaut as Record<string, unknown>).callsign ?? 'CREW-01').slice(0, 24),
            age: Number((raw.astronaut as Record<string, unknown>).age ?? 36),
            bloodGroup: String((raw.astronaut as Record<string, unknown>).bloodGroup ?? 'O+') as AstraPulseRequestPayload['astronaut'] extends undefined ? never : NonNullable<AstraPulseRequestPayload['astronaut']>['bloodGroup'],
            missionName: String((raw.astronaut as Record<string, unknown>).missionName ?? 'ARTEMIS-IV').slice(0, 60),
          }
        : undefined,
    currentReading: {
      heartRate: Math.round(hr * 10) / 10,
      spo2: Math.round(spo2 * 10) / 10,
      bodyTemperature: Math.round(temp * 100) / 100,
      respiratoryRate: Math.round(resp * 10) / 10,
      stressIndex: Math.round(stress * 10) / 10,
      sleepHours: Math.round(sleep * 10) / 10,
      activityLevel:
        typeof reading.activityLevel === 'string'
          ? reading.activityLevel.slice(0, 40)
          : 'Nominal',
    },
    historicalSummary:
      raw.historicalSummary && typeof raw.historicalSummary === 'object'
        ? {
            windowLabel: String((raw.historicalSummary as Record<string, unknown>).windowLabel ?? '24h').slice(0, 20),
            sampleCount: Number((raw.historicalSummary as Record<string, unknown>).sampleCount ?? 0),
            avgHeartRate: Number((raw.historicalSummary as Record<string, unknown>).avgHeartRate ?? hr),
            avgSpo2: Number((raw.historicalSummary as Record<string, unknown>).avgSpo2 ?? spo2),
            avgBodyTemperature: Number((raw.historicalSummary as Record<string, unknown>).avgBodyTemperature ?? temp),
            avgRespiratoryRate: Number((raw.historicalSummary as Record<string, unknown>).avgRespiratoryRate ?? resp),
            avgStressIndex: Number((raw.historicalSummary as Record<string, unknown>).avgStressIndex ?? stress),
            avgSleepHours: Number((raw.historicalSummary as Record<string, unknown>).avgSleepHours ?? sleep),
            recentAlertsCount: Number((raw.historicalSummary as Record<string, unknown>).recentAlertsCount ?? 0),
          }
        : undefined,
    notes,
  };

  return { valid: true, errors: [], sanitized };
}
