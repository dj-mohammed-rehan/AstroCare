import {
  fetchLoginGuardState,
  recordLoginAttemptOutcome,
  type LoginGuardState,
} from './api';

export const MAX_PASSWORD_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const GUARD_KEY_PREFIX = 'astrocare_login_guard_';
const ACTIVE_LOCKOUT_BANNER_KEY = 'astrocare_active_lockout_banner';

export interface ActiveLockoutBanner {
  email: string;
  lockedUntil: number;
  securityEmailSent: boolean;
  securityEmailNote: string;
}

interface StoredLocalGuard {
  failedAttempts: number;
  lockedUntil: number | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function makeDefaultState(): LoginGuardState {
  return {
    failedAttempts: 0,
    remainingAttempts: MAX_PASSWORD_ATTEMPTS,
    lockedUntil: null,
    remainingMs: 0,
    isLocked: false,
    newlyLocked: false,
  };
}

export function readLocalLoginGuard(email: string, now = Date.now()): LoginGuardState {
  const normalized = normalizeEmail(email);
  if (!normalized) return makeDefaultState();

  try {
    const raw = window.localStorage.getItem(`${GUARD_KEY_PREFIX}${normalized}`);
    if (!raw) return makeDefaultState();
    const parsed = JSON.parse(raw) as StoredLocalGuard;

    if (parsed.lockedUntil !== null && parsed.lockedUntil <= now) {
      window.localStorage.removeItem(`${GUARD_KEY_PREFIX}${normalized}`);
      clearActiveLockoutBannerIfEmail(normalized);
      return makeDefaultState();
    }

    const failedAttempts = Math.min(
      MAX_PASSWORD_ATTEMPTS,
      Math.max(0, Number(parsed.failedAttempts) || 0)
    );
    const lockedUntil =
      typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > now
        ? parsed.lockedUntil
        : null;
    const isLocked = lockedUntil !== null && lockedUntil > now;

    return {
      failedAttempts,
      remainingAttempts: isLocked ? 0 : Math.max(0, MAX_PASSWORD_ATTEMPTS - failedAttempts),
      lockedUntil,
      remainingMs: isLocked && lockedUntil ? lockedUntil - now : 0,
      isLocked,
    };
  } catch {
    return makeDefaultState();
  }
}

export function writeLocalLoginGuard(email: string, state: LoginGuardState): void {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  try {
    if (state.failedAttempts === 0 && !state.lockedUntil) {
      window.localStorage.removeItem(`${GUARD_KEY_PREFIX}${normalized}`);
      return;
    }
    const payload: StoredLocalGuard = {
      failedAttempts: state.failedAttempts,
      lockedUntil: state.lockedUntil,
    };
    window.localStorage.setItem(`${GUARD_KEY_PREFIX}${normalized}`, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors safely
  }
}

export function saveActiveLockoutBanner(banner: ActiveLockoutBanner): void {
  try {
    window.localStorage.setItem(
      ACTIVE_LOCKOUT_BANNER_KEY,
      JSON.stringify({ ...banner, email: normalizeEmail(banner.email) })
    );
  } catch {
    // Ignore storage errors
  }
}

export function readActiveLockoutBanner(now = Date.now()): ActiveLockoutBanner | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_LOCKOUT_BANNER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveLockoutBanner;
    if (!parsed?.lockedUntil || parsed.lockedUntil <= now) {
      window.localStorage.removeItem(ACTIVE_LOCKOUT_BANNER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveLockoutBannerIfEmail(email: string): void {
  const normalized = normalizeEmail(email);
  try {
    const current = readActiveLockoutBanner();
    if (!current || current.email === normalized) {
      window.localStorage.removeItem(ACTIVE_LOCKOUT_BANNER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function getMergedLoginGuardState(email: string): Promise<LoginGuardState> {
  const normalized = normalizeEmail(email);
  if (!normalized) return makeDefaultState();

  const localState = readLocalLoginGuard(normalized);

  try {
    const serverState = await fetchLoginGuardState(normalized);
    const now = Date.now();
    const localLocked = localState.lockedUntil && localState.lockedUntil > now ? localState.lockedUntil : null;
    const serverLocked =
      serverState.lockedUntil && serverState.lockedUntil > now ? serverState.lockedUntil : null;
    const lockedUntil =
      localLocked && serverLocked
        ? Math.max(localLocked, serverLocked)
        : localLocked || serverLocked || null;
    const isLocked = lockedUntil !== null && lockedUntil > now;
    const failedAttempts = isLocked
      ? MAX_PASSWORD_ATTEMPTS
      : Math.max(localState.failedAttempts, serverState.failedAttempts);

    const merged: LoginGuardState = {
      failedAttempts,
      remainingAttempts: isLocked ? 0 : Math.max(0, MAX_PASSWORD_ATTEMPTS - failedAttempts),
      lockedUntil,
      remainingMs: isLocked && lockedUntil ? lockedUntil - now : 0,
      isLocked,
    };

    writeLocalLoginGuard(normalized, merged);
    return merged;
  } catch {
    return localState;
  }
}

export async function recordFailedPasswordAttempt(email: string): Promise<LoginGuardState> {
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const localBefore = readLocalLoginGuard(normalized, now);

  if (localBefore.isLocked) {
    return { ...localBefore, newlyLocked: false };
  }

  let serverState: LoginGuardState | null = null;
  try {
    serverState = await recordLoginAttemptOutcome(normalized, 'failure');
  } catch {
    serverState = null;
  }

  const nextLocalAttempts = Math.min(MAX_PASSWORD_ATTEMPTS, localBefore.failedAttempts + 1);
  const failedAttempts = serverState
    ? Math.max(nextLocalAttempts, serverState.failedAttempts)
    : nextLocalAttempts;

  const isLocked = failedAttempts >= MAX_PASSWORD_ATTEMPTS || Boolean(serverState?.isLocked);
  const lockedUntil = isLocked
    ? serverState?.lockedUntil && serverState.lockedUntil > now
      ? serverState.lockedUntil
      : now + LOCKOUT_DURATION_MS
    : null;
  const newlyLocked = isLocked && !localBefore.isLocked;

  const nextState: LoginGuardState = {
    failedAttempts: isLocked ? MAX_PASSWORD_ATTEMPTS : failedAttempts,
    remainingAttempts: isLocked ? 0 : Math.max(0, MAX_PASSWORD_ATTEMPTS - failedAttempts),
    lockedUntil,
    remainingMs: lockedUntil ? Math.max(0, lockedUntil - now) : 0,
    isLocked,
    newlyLocked,
  };

  writeLocalLoginGuard(normalized, nextState);
  return nextState;
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  try {
    window.localStorage.removeItem(`${GUARD_KEY_PREFIX}${normalized}`);
  } catch {
    // Ignore storage errors
  }
  clearActiveLockoutBannerIfEmail(normalized);

  try {
    await recordLoginAttemptOutcome(normalized, 'success');
  } catch {
    // Non-blocking
  }
}

export function formatLockoutCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
