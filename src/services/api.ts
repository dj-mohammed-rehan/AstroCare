import type { AstraPulseRequestPayload, AstraPulseResponse } from '../types';

export interface SystemStatusResponse {
  ok: boolean;
  geminiConfigured: boolean;
  model: string;
  timestamp: string;
}

export async function fetchAstraPulseStatus(): Promise<SystemStatusResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/api/astra-pulse/status', {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Status check failed (${res.status})`);
    }
    return (await res.json()) as SystemStatusResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestAstraPulseAnalysis(
  payload: AstraPulseRequestPayload
): Promise<AstraPulseResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch('/api/astra-pulse/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        Array.isArray(data?.details) && data.details.length > 0
          ? data.details.join(' ')
          : data?.error || `Analysis failed (${res.status})`;
      throw new Error(msg);
    }
    return data as AstraPulseResponse;
  } finally {
    window.clearTimeout(timeout);
  }
}

export interface LoginGuardState {
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil: number | null;
  remainingMs: number;
  isLocked: boolean;
  newlyLocked?: boolean;
}

export async function fetchLoginGuardState(email: string): Promise<LoginGuardState> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `/api/auth/login-guard?email=${encodeURIComponent(email.trim().toLowerCase())}`,
      { signal: controller.signal }
    );
    if (!res.ok) {
      throw new Error(`Login guard check failed (${res.status})`);
    }
    return (await res.json()) as LoginGuardState;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function recordLoginAttemptOutcome(
  email: string,
  outcome: 'failure' | 'success'
): Promise<LoginGuardState> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('/api/auth/login-guard/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        outcome,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Login guard update failed (${res.status})`);
    }
    return (await res.json()) as LoginGuardState;
  } finally {
    window.clearTimeout(timeout);
  }
}
