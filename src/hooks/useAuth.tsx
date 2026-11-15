import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  applyActionCode,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  mapFirebaseAuthError,
  OperationType,
  sendFirebaseVerificationEmail,
} from '../services/firebase';
import {
  clearLoginAttempts,
  getMergedLoginGuardState,
  MAX_PASSWORD_ATTEMPTS,
  recordFailedPasswordAttempt,
  saveActiveLockoutBanner,
} from '../services/loginGuard';
import type {
  AstronautRole,
  BiologicalSex,
  BloodGroup,
  SafeAstronautProfile,
} from '../types';

export interface SignUpInput {
  email: string;
  password: string;
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
  avatarUrl?: string;
}

export interface UpdateProfileInput {
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
}

interface PendingProfileDraft {
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
}

export interface SignInResult {
  ok: boolean;
  unverified?: boolean;
  error?: string;
  failedAttempts?: number;
  remainingAttempts?: number;
  lockedUntil?: number | null;
  isLocked?: boolean;
  securityEmailSent?: boolean;
  securityEmailNote?: string;
}

interface AuthContextValue {
  user: SafeAstronautProfile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isPendingVerification: boolean;
  pendingEmail: string | null;
  lastVerificationSentAt: number | null;
  verificationNotice: string | null;
  verificationError: string | null;
  clearVerificationFeedback: () => void;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<SignInResult>;
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
  resendVerificationEmail: () => Promise<{ ok: boolean; error?: string }>;
  refreshVerificationStatus: () => Promise<{ ok: boolean; verified: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (input: UpdateProfileInput) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PENDING_DRAFT_PREFIX = 'astracare_pending_profile_';

function savePendingDraft(uid: string, draft: PendingProfileDraft): void {
  try {
    window.localStorage.setItem(`${PENDING_DRAFT_PREFIX}${uid}`, JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors safely
  }
}

function readPendingDraft(uid: string): PendingProfileDraft | null {
  try {
    const raw = window.localStorage.getItem(`${PENDING_DRAFT_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingProfileDraft;
  } catch {
    return null;
  }
}

function clearPendingDraft(uid: string): void {
  try {
    window.localStorage.removeItem(`${PENDING_DRAFT_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeAvatarUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 118000) return '';
  return trimmed;
}

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

function buildSanitizedFirestorePayload(
  fbUser: User,
  draft?: PendingProfileDraft | null
) {
  const email = (fbUser.email || '').trim();
  const fallbackName = fbUser.displayName?.trim() || email.split('@')[0] || 'Astronaut Crew';
  return {
    uid: fbUser.uid,
    email,
    fullName: (draft?.fullName || fallbackName).trim().slice(0, 120) || 'Astronaut Crew',
    callsign: (draft?.callsign || 'ASTRA-01').trim().toUpperCase().slice(0, 32) || 'ASTRA-01',
    role: draft?.role || 'Payload Specialist',
    missionName:
      (draft?.missionName || 'ARTEMIS-ORBITAL').trim().toUpperCase().slice(0, 100) ||
      'ARTEMIS-ORBITAL',
    spacecraft: (draft?.spacecraft || 'Orion-MPCV').trim().slice(0, 120) || 'Orion-MPCV',
    age: clampNumber(Number(draft?.age ?? 32), 21, 75, 32),
    sex: draft?.sex || 'Prefer not to say',
    bloodGroup: draft?.bloodGroup || 'O+',
    heightCm: clampNumber(Number(draft?.heightCm ?? 170), 140, 215, 170),
    weightKg: clampNumber(Number(draft?.weightKg ?? 68), 40, 130, 68),
    restingHeartRate: clampNumber(Number(draft?.restingHeartRate ?? 64), 40, 110, 64),
    medicalNotes: (draft?.medicalNotes || '').trim().slice(0, 1000),
    avatarUrl: sanitizeAvatarUrl(draft?.avatarUrl || fbUser.photoURL || ''),
  };
}

async function ensureVerifiedFirestoreProfile(fbUser: User): Promise<SafeAstronautProfile> {
  const userDocPath = `users/${fbUser.uid}`;
  const userDocRef = doc(db, 'users', fbUser.uid);

  let snap;
  try {
    snap = await getDoc(userDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userDocPath);
  }

  if (snap.exists()) {
    const data = snap.data();
    return {
      id: fbUser.uid,
      email: String(data.email || fbUser.email || ''),
      fullName: String(data.fullName || fbUser.displayName || 'Astronaut Crew'),
      callsign: String(data.callsign || 'ASTRA-01'),
      role: (data.role as AstronautRole) || 'Payload Specialist',
      missionName: String(data.missionName || 'ARTEMIS-ORBITAL'),
      spacecraft: String(data.spacecraft || 'Orion-MPCV'),
      age: Number(data.age || 32),
      sex: (data.sex as BiologicalSex) || 'Prefer not to say',
      bloodGroup: (data.bloodGroup as BloodGroup) || 'O+',
      heightCm: Number(data.heightCm || 170),
      weightKg: Number(data.weightKg || 68),
      restingHeartRate: Number(data.restingHeartRate || 64),
      medicalNotes: String(data.medicalNotes || ''),
      avatarUrl: String(data.avatarUrl ?? ''),
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
    };
  }

  const pendingDraft = readPendingDraft(fbUser.uid);
  const payload = buildSanitizedFirestorePayload(fbUser, pendingDraft);

  try {
    await setDoc(userDocRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, userDocPath);
  }

  clearPendingDraft(fbUser.uid);
  const nowIso = new Date().toISOString();

  return {
    id: fbUser.uid,
    email: payload.email,
    fullName: payload.fullName,
    callsign: payload.callsign,
    role: payload.role,
    missionName: payload.missionName,
    spacecraft: payload.spacecraft,
    age: payload.age,
    sex: payload.sex,
    bloodGroup: payload.bloodGroup,
    heightCm: payload.heightCm,
    weightKg: payload.weightKg,
    restingHeartRate: payload.restingHeartRate,
    medicalNotes: payload.medicalNotes,
    avatarUrl: payload.avatarUrl,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<SafeAstronautProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastVerificationSentAt, setLastVerificationSentAt] = useState<number | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const clearVerificationFeedback = useCallback(() => {
    setVerificationNotice(null);
    setVerificationError(null);
  }, []);

  const hydrateVerifiedUser = useCallback(async (fbUser: User): Promise<SafeAstronautProfile> => {
    await fbUser.getIdToken(true);
    const profile = await ensureVerifiedFirestoreProfile(fbUser);
    setFirebaseUser(fbUser);
    setUser(profile);
    return profile;
  }, []);

  // Process Firebase email verification action link if user returned with ?mode=verifyEmail&oobCode=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'verifyEmail' || !oobCode) return;

    let cancelled = false;
    (async () => {
      try {
        await applyActionCode(auth, oobCode);
        await auth.authStateReady();
        if (cancelled) return;
        window.history.replaceState({}, '', window.location.pathname);

        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            await hydrateVerifiedUser(auth.currentUser);
            setVerificationError(null);
            setVerificationNotice(
              'Email address verified successfully. Welcome to AstroCare Mission Overview.'
            );
            return;
          }
        }

        setVerificationError(null);
        setVerificationNotice(
          'Your email has been verified. Please sign in below to enter AstroCare Mission Control.'
        );
      } catch (err) {
        if (cancelled) return;
        window.history.replaceState({}, '', window.location.pathname);
        setVerificationError(mapFirebaseAuthError(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrateVerifiedUser]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Reload user status once on boot in case email was verified in another tab
        await fbUser.reload();
      } catch {
        // Proceed with cached user state if offline
      }

      const current = auth.currentUser ?? fbUser;
      setFirebaseUser(current);

      if (!current.emailVerified) {
        // Strictly block unverified users from accessing protected workspace pages
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        await hydrateVerifiedUser(current);
      } catch (err) {
        setUser(null);
        setVerificationError(
          err instanceof Error
            ? 'Verified session authenticated, but loading Firestore profile failed.'
            : 'Unable to load astronaut profile.'
        );
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [hydrateVerifiedUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: 'Please enter both email address and password.' };
      }

      const preCheck = await getMergedLoginGuardState(normalizedEmail);
      if (preCheck.isLocked && preCheck.lockedUntil) {
        return {
          ok: false,
          isLocked: true,
          lockedUntil: preCheck.lockedUntil,
          failedAttempts: MAX_PASSWORD_ATTEMPTS,
          remainingAttempts: 0,
          error: `Too many incorrect password attempts for ${normalizedEmail}. Sign-in is locked for 15 minutes.`,
        };
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        await clearLoginAttempts(normalizedEmail);
        await cred.user.reload();
        const refreshed = auth.currentUser ?? cred.user;
        setFirebaseUser(refreshed);

        if (!refreshed.emailVerified) {
          setUser(null);
          return { ok: true, unverified: true };
        }

        await hydrateVerifiedUser(refreshed);
        setVerificationError(null);
        return { ok: true, unverified: false };
      } catch (err) {
        const code = (err as { code?: string })?.code ?? '';
        const isCredentialFailure =
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found' ||
          code === 'auth/too-many-requests';

        if (!isCredentialFailure) {
          return { ok: false, error: mapFirebaseAuthError(err) };
        }

        const nextGuard = await recordFailedPasswordAttempt(normalizedEmail);
        if (nextGuard.isLocked && nextGuard.lockedUntil) {
          let securityEmailSent = false;
          let securityEmailNote = '';

          if (nextGuard.newlyLocked) {
            try {
              await sendPasswordResetEmail(auth, normalizedEmail);
              securityEmailSent = true;
              securityEmailNote = `A security alert & password recovery email has been mailed to ${normalizedEmail}. Please check your inbox and spam folder.`;
            } catch (mailErr) {
              const mailCode = (mailErr as { code?: string })?.code ?? '';
              if (mailCode === 'auth/too-many-requests') {
                securityEmailNote = `Sign-in locked for 15 minutes. Firebase throttled duplicate emails—please check your inbox for an earlier security message.`;
              } else if (mailCode === 'auth/user-not-found') {
                securityEmailNote = `Sign-in locked for 15 minutes. No registered account was found for ${normalizedEmail}, so no email could be delivered.`;
              } else {
                securityEmailNote = `Sign-in locked for 15 minutes. Automated email dispatch encountered a network issue; use Forgot Password after the cooldown if needed.`;
              }
            }

            saveActiveLockoutBanner({
              email: normalizedEmail,
              lockedUntil: nextGuard.lockedUntil,
              securityEmailSent,
              securityEmailNote,
            });
          }

          return {
            ok: false,
            isLocked: true,
            lockedUntil: nextGuard.lockedUntil,
            failedAttempts: MAX_PASSWORD_ATTEMPTS,
            remainingAttempts: 0,
            securityEmailSent,
            securityEmailNote,
            error: `5 consecutive incorrect password attempts detected. Sign-in is locked for 15 minutes.`,
          };
        }

        const remaining = nextGuard.remainingAttempts;
        return {
          ok: false,
          isLocked: false,
          lockedUntil: null,
          failedAttempts: nextGuard.failedAttempts,
          remainingAttempts: remaining,
          error: `Incorrect email address or password. ${remaining} ${
            remaining === 1 ? 'attempt' : 'attempts'
          } remaining before a 15-minute lockout and email alert.`,
        };
      }
    },
    [hydrateVerifiedUser]
  );

  const signInWithGoogle = useCallback(async (): Promise<SignInResult> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      await cred.user.reload().catch(() => undefined);
      const refreshed = auth.currentUser ?? cred.user;
      setFirebaseUser(refreshed);

      if (!refreshed.emailVerified) {
        setUser(null);
        return { ok: true, unverified: true };
      }

      await hydrateVerifiedUser(refreshed);
      setVerificationError(null);
      return { ok: true, unverified: false };
    } catch (err) {
      return { ok: false, error: mapFirebaseAuthError(err) };
    }
  }, [hydrateVerifiedUser]);

  const signUp = useCallback(async (input: SignUpInput) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, input.password);
      await updateFirebaseAuthProfile(cred.user, {
        displayName: input.fullName.trim().slice(0, 120),
      });

      savePendingDraft(cred.user.uid, {
        fullName: input.fullName.trim(),
        callsign: input.callsign.trim().toUpperCase(),
        role: input.role,
        missionName: input.missionName.trim().toUpperCase(),
        spacecraft: input.spacecraft.trim(),
        age: input.age,
        sex: input.sex,
        bloodGroup: input.bloodGroup,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        restingHeartRate: input.restingHeartRate,
        medicalNotes: input.medicalNotes.trim(),
        avatarUrl: sanitizeAvatarUrl(input.avatarUrl),
      });

      await sendFirebaseVerificationEmail(cred.user);
      setLastVerificationSentAt(Date.now());
      setFirebaseUser(cred.user);
      setUser(null);
      setVerificationError(null);
      setVerificationNotice(
        `Verification email sent to ${normalizedEmail}. Check your inbox and spam folder, then click the link to verify.`
      );
      return { ok: true };
    } catch (err) {
      const msg = mapFirebaseAuthError(err);
      if (auth.currentUser && !auth.currentUser.emailVerified) {
        setVerificationError(msg);
      }
      return { ok: false, error: msg };
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      return { ok: false, error: 'No active pending account found. Please sign in again.' };
    }
    try {
      await sendFirebaseVerificationEmail(current);
      setLastVerificationSentAt(Date.now());
      setVerificationError(null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFirebaseAuthError(err) };
    }
  }, []);

  const refreshVerificationStatus = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      return {
        ok: false,
        verified: false,
        error: 'Session expired. Please sign in again to check verification status.',
      };
    }

    try {
      await current.reload();
      const reloaded = auth.currentUser ?? current;
      setFirebaseUser(reloaded);

      if (!reloaded.emailVerified) {
        setUser(null);
        return { ok: true, verified: false };
      }

      await hydrateVerifiedUser(reloaded);
      setVerificationError(null);
      setVerificationNotice('Email verified successfully. Accessing Mission Overview.');
      return { ok: true, verified: true };
    } catch (err) {
      return { ok: false, verified: false, error: mapFirebaseAuthError(err) };
    }
  }, [hydrateVerifiedUser]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, error: 'Please enter your registered email address.' };
    }
    try {
      await sendPasswordResetEmail(auth, normalized);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFirebaseAuthError(err) };
    }
  }, []);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      const current = auth.currentUser;
      if (!current || !current.emailVerified || !user) {
        return { ok: false, error: 'Verified astronaut session is required to update profile.' };
      }

      const userDocPath = `users/${current.uid}`;
      const userDocRef = doc(db, 'users', current.uid);

      const cleanPayload = {
        fullName: input.fullName.trim().slice(0, 120) || user.fullName,
        callsign: input.callsign.trim().toUpperCase().slice(0, 32) || user.callsign,
        role: input.role,
        missionName: input.missionName.trim().toUpperCase().slice(0, 100) || user.missionName,
        spacecraft: input.spacecraft.trim().slice(0, 120) || 'Orion-MPCV',
        age: clampNumber(input.age, 21, 75, user.age),
        sex: input.sex,
        bloodGroup: input.bloodGroup,
        heightCm: clampNumber(input.heightCm, 140, 215, user.heightCm),
        weightKg: clampNumber(input.weightKg, 40, 130, user.weightKg),
        restingHeartRate: clampNumber(input.restingHeartRate, 40, 110, user.restingHeartRate),
        medicalNotes: input.medicalNotes.trim().slice(0, 1000),
        avatarUrl: sanitizeAvatarUrl(input.avatarUrl),
      };

      try {
        await updateDoc(userDocRef, {
          ...cleanPayload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, userDocPath);
      }

      if (current.displayName !== cleanPayload.fullName) {
        await updateFirebaseAuthProfile(current, { displayName: cleanPayload.fullName }).catch(
          () => undefined
        );
      }

      setUser({
        ...user,
        ...cleanPayload,
        updatedAt: new Date().toISOString(),
      });
      return { ok: true };
    },
    [user]
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUser(null);
    setLastVerificationSentAt(null);
    setVerificationError(null);
    setVerificationNotice(null);
  }, []);

  const isPendingVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);
  const pendingEmail = isPendingVerification ? firebaseUser?.email ?? null : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isPendingVerification,
        pendingEmail,
        lastVerificationSentAt,
        verificationNotice,
        verificationError,
        clearVerificationFeedback,
        signIn,
        signInWithGoogle,
        signUp,
        resendVerificationEmail,
        refreshVerificationStatus,
        sendPasswordReset,
        updateProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
