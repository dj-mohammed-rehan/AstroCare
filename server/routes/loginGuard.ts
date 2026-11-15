import { Router } from 'express';

export const MAX_PASSWORD_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface AttemptRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const attemptStore = new Map<string, AttemptRecord>();

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
}

function getActiveState(email: string, now = Date.now()) {
  const existing = attemptStore.get(email);
  if (!existing) {
    return {
      failedAttempts: 0,
      remainingAttempts: MAX_PASSWORD_ATTEMPTS,
      lockedUntil: null as number | null,
      remainingMs: 0,
      isLocked: false,
    };
  }

  // If the 15-minute lockout has expired, reset attempts so user can sign in again
  if (existing.lockedUntil !== null && existing.lockedUntil <= now) {
    attemptStore.delete(email);
    return {
      failedAttempts: 0,
      remainingAttempts: MAX_PASSWORD_ATTEMPTS,
      lockedUntil: null as number | null,
      remainingMs: 0,
      isLocked: false,
    };
  }

  const isLocked = existing.lockedUntil !== null && existing.lockedUntil > now;
  const remainingMs = isLocked && existing.lockedUntil ? existing.lockedUntil - now : 0;

  return {
    failedAttempts: existing.failedAttempts,
    remainingAttempts: Math.max(0, MAX_PASSWORD_ATTEMPTS - existing.failedAttempts),
    lockedUntil: existing.lockedUntil,
    remainingMs,
    isLocked,
  };
}

export const loginGuardRouter = Router();

loginGuardRouter.get('/login-guard', (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email) {
    res.json({
      failedAttempts: 0,
      remainingAttempts: MAX_PASSWORD_ATTEMPTS,
      lockedUntil: null,
      remainingMs: 0,
      isLocked: false,
    });
    return;
  }

  res.json(getActiveState(email));
});

loginGuardRouter.post('/login-guard/record', (req, res) => {
  const body = (req.body ?? {}) as { email?: unknown; outcome?: unknown };
  const email = normalizeEmail(body.email);
  const outcome = body.outcome;

  if (!email || (outcome !== 'failure' && outcome !== 'success')) {
    res.status(400).json({ error: 'Valid email and outcome ("failure" | "success") are required.' });
    return;
  }

  const now = Date.now();

  if (outcome === 'success') {
    attemptStore.delete(email);
    res.json({
      failedAttempts: 0,
      remainingAttempts: MAX_PASSWORD_ATTEMPTS,
      lockedUntil: null,
      remainingMs: 0,
      isLocked: false,
      newlyLocked: false,
    });
    return;
  }

  const currentState = getActiveState(email, now);
  if (currentState.isLocked) {
    res.json({
      ...currentState,
      newlyLocked: false,
    });
    return;
  }

  const nextAttempts = Math.min(MAX_PASSWORD_ATTEMPTS, currentState.failedAttempts + 1);
  const newlyLocked = nextAttempts >= MAX_PASSWORD_ATTEMPTS;
  const lockedUntil = newlyLocked ? now + LOCKOUT_DURATION_MS : null;

  attemptStore.set(email, {
    failedAttempts: nextAttempts,
    lockedUntil,
    lastAttemptAt: now,
  });

  res.json({
    failedAttempts: nextAttempts,
    remainingAttempts: Math.max(0, MAX_PASSWORD_ATTEMPTS - nextAttempts),
    lockedUntil,
    remainingMs: lockedUntil ? lockedUntil - now : 0,
    isLocked: newlyLocked,
    newlyLocked,
  });
});
