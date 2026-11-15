import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import spaceBgUrl from '../assets/images/space_atmosphere_bg_1794655335899.jpg';
import { PoweredByNasa } from '../components/NasaLogo';
import { AstraCareMark } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import {
  clearActiveLockoutBannerIfEmail,
  formatLockoutCountdown,
  getMergedLoginGuardState,
  MAX_PASSWORD_ATTEMPTS,
  readActiveLockoutBanner,
  readLocalLoginGuard,
  type ActiveLockoutBanner,
} from '../services/loginGuard';

interface SignInPageProps {
  onSwitchToSignUp: () => void;
}

export function SignInPage({ onSwitchToSignUp }: SignInPageProps) {
  const {
    signIn,
    signInWithGoogle,
    sendPasswordReset,
    verificationNotice,
    verificationError,
    clearVerificationFeedback,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [activeLockout, setActiveLockout] = useState<ActiveLockoutBanner | null>(() =>
    readActiveLockoutBanner()
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [cooldownExpiredNotice, setCooldownExpiredNotice] = useState<string | null>(null);

  // Forgot password state (Firebase built-in sendPasswordResetEmail)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const normalizedInputEmail = email.trim().toLowerCase();

  // Sync attempt/lockout status whenever email changes
  useEffect(() => {
    if (!normalizedInputEmail) {
      const storedBanner = readActiveLockoutBanner();
      setActiveLockout(storedBanner);
      setFailedAttempts(storedBanner ? MAX_PASSWORD_ATTEMPTS : 0);
      return;
    }

    const local = readLocalLoginGuard(normalizedInputEmail);
    setFailedAttempts(local.failedAttempts);
    if (local.isLocked && local.lockedUntil) {
      const existingBanner = readActiveLockoutBanner();
      setActiveLockout({
        email: normalizedInputEmail,
        lockedUntil: local.lockedUntil,
        securityEmailSent:
          existingBanner?.email === normalizedInputEmail ? existingBanner.securityEmailSent : true,
        securityEmailNote:
          existingBanner?.email === normalizedInputEmail && existingBanner.securityEmailNote
            ? existingBanner.securityEmailNote
            : `Security alert & recovery email dispatched to ${normalizedInputEmail}.`,
      });
    } else {
      const existingBanner = readActiveLockoutBanner();
      if (!existingBanner || existingBanner.email === normalizedInputEmail) {
        setActiveLockout(null);
      }
    }

    if (!normalizedInputEmail.includes('@')) return;

    let cancelled = false;
    void getMergedLoginGuardState(normalizedInputEmail).then((merged) => {
      if (cancelled) return;
      setFailedAttempts(merged.failedAttempts);
      if (merged.isLocked && merged.lockedUntil) {
        const existingBanner = readActiveLockoutBanner();
        setActiveLockout({
          email: normalizedInputEmail,
          lockedUntil: merged.lockedUntil,
          securityEmailSent:
            existingBanner?.email === normalizedInputEmail ? existingBanner.securityEmailSent : true,
          securityEmailNote:
            existingBanner?.email === normalizedInputEmail && existingBanner.securityEmailNote
              ? existingBanner.securityEmailNote
              : `Security alert & recovery email dispatched to ${normalizedInputEmail}.`,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedInputEmail]);

  const isLockedForCurrentInput = Boolean(
    activeLockout &&
      activeLockout.lockedUntil > nowMs &&
      (!normalizedInputEmail || normalizedInputEmail === activeLockout.email)
  );
  const remainingLockoutMs =
    isLockedForCurrentInput && activeLockout
      ? Math.max(0, activeLockout.lockedUntil - nowMs)
      : 0;

  // Live 1-second countdown during the 15-minute lockout and automatic unlock on expiry
  useEffect(() => {
    if (!activeLockout) return;

    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      if (now >= activeLockout.lockedUntil) {
        clearActiveLockoutBannerIfEmail(activeLockout.email);
        setActiveLockout(null);
        setFailedAttempts(0);
        setError(null);
        setCooldownExpiredNotice(
          '15-minute security cooldown has elapsed. You may now attempt to sign in again.'
        );
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeLockout]);

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedForCurrentInput) return;

    setError(null);
    setCooldownExpiredNotice(null);
    clearVerificationFeedback();
    setSigningIn(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) {
        if (typeof res.failedAttempts === 'number') {
          setFailedAttempts(res.failedAttempts);
        }
        if (res.isLocked && res.lockedUntil) {
          const lockedBanner: ActiveLockoutBanner = {
            email: normalizedInputEmail,
            lockedUntil: res.lockedUntil,
            securityEmailSent: Boolean(res.securityEmailSent),
            securityEmailNote:
              res.securityEmailNote ||
              `A security alert email has been sent to ${normalizedInputEmail}.`,
          };
          setActiveLockout(lockedBanner);
          setNowMs(Date.now());
          setPassword('');
          setError(null);
          return;
        }
        setError(res.error ?? 'Unable to sign in.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setCooldownExpiredNotice(null);
    clearVerificationFeedback();
    setGoogleSigningIn(true);
    try {
      const res = await signInWithGoogle();
      if (!res.ok) {
        setError(res.error ?? 'Unable to sign in with Google.');
      }
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    setSendingReset(true);
    try {
      const res = await sendPasswordReset(resetEmail);
      if (!res.ok) {
        setResetError(res.error ?? 'Could not send password reset email.');
        return;
      }
      setResetMessage(
        `Password reset link sent to ${resetEmail.trim().toLowerCase()}. Check your inbox and spam folder.`
      );
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05070B] text-[#F4F7FA] flex flex-col lg:flex-row overflow-hidden">
      {/* Space atmosphere backdrop */}
      <img
        src={spaceBgUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(120deg, rgba(5,7,11,0.92) 0%, rgba(5,7,11,0.68) 50%, rgba(5,7,11,0.94) 100%)',
        }}
      />

      {/* Left Brand & Mission Context Panel */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AstraCareMark />
            <div>
              <div className="font-display text-lg font-semibold tracking-wider text-[#F4F7FA]">
                AstroCare
              </div>
              <div className="text-xs text-[#A5B3C3]">Human Health. Beyond Earth.</div>
            </div>
          </div>
          <PoweredByNasa size="md" tone="dark" />
        </div>

        <div className="my-12 max-w-xl space-y-5">
          <div className="text-xs font-medium tracking-wider uppercase text-[#8AB9E8]">
            Mission Biomedical Operations · Demo Platform
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#F4F7FA] leading-[1.1] [text-wrap:balance]">
            Human health, monitored beyond Earth.
          </h1>
          <p className="text-base leading-relaxed text-[#A5B3C3]">
            Sign in to access continuous simulated physiological telemetry, early-warning anomaly
            detection, ASTRA PULSE AI health analysis, and crew mission reporting.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[rgba(190,215,240,0.16)]">
            <div className="pt-3">
              <div className="font-display text-xl font-semibold text-[#B9DDF5]">6 Metrics</div>
              <div className="text-xs text-[#A5B3C3]">Live simulated vital streams</div>
            </div>
            <div className="pt-3">
              <div className="font-display text-xl font-semibold text-[#B9DDF5]">ASTRA PULSE</div>
              <div className="text-xs text-[#A5B3C3]">AI-assisted risk review</div>
            </div>
            <div className="pt-3">
              <div className="font-display text-xl font-semibold text-[#B9DDF5]">5 Scenarios</div>
              <div className="text-xs text-[#A5B3C3]">Interactive anomaly demos</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#A5B3C3]">
          Demonstration environment using simulated astronaut telemetry. Not a clinical diagnostic system.
        </div>
      </div>

      {/* Right Sign-In Card */}
      <div className="relative z-10 w-full lg:w-[500px] shrink-0 flex items-center justify-center p-6 sm:p-10">
        <div className="astra-panel w-full max-w-md rounded-2xl p-6 sm:p-8 space-y-6">
          {!forgotOpen ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-[#F4F7FA]">
                    Crew Sign In
                  </h2>
                  <PoweredByNasa size="sm" tone="dark" />
                </div>
                <p className="text-sm text-[#A5B3C3]">
                  Sign in to AstroCare with your verified email address and password.
                </p>
              </div>

              {(verificationNotice || resetMessage || cooldownExpiredNotice) && (
                <div className="rounded-lg border border-[#70C99B]/40 bg-[#70C99B]/10 px-3.5 py-2.5 text-xs text-[#70C99B] flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{verificationNotice || resetMessage || cooldownExpiredNotice}</span>
                </div>
              )}

              {isLockedForCurrentInput && activeLockout && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#E77C82]/55 bg-[#E77C82]/12 p-4 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 text-[#E77C82]">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Sign-In Locked (5 Failed Attempts)</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{formatLockoutCountdown(remainingLockoutMs)}</span>
                    </span>
                  </div>
                  <p className="text-[#F4F7FA]/90 leading-relaxed">
                    5 consecutive incorrect password attempts were made for{' '}
                    <span className="font-mono-tabular font-semibold text-[#B9DDF5]">
                      {activeLockout.email}
                    </span>
                    . Further sign-in attempts are blocked for 15 minutes.
                  </p>
                  <div className="pt-1 border-t border-[#E77C82]/25 text-[#E8B86D] flex items-start gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{activeLockout.securityEmailNote}</span>
                  </div>
                </div>
              )}

              {!isLockedForCurrentInput && (error || verificationError) && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#E77C82]/40 bg-[#E77C82]/10 px-3.5 py-2.5 text-xs text-[#E77C82] space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{error || verificationError}</span>
                  </div>
                  {failedAttempts > 0 && failedAttempts < MAX_PASSWORD_ATTEMPTS && (
                    <div className="pl-6 font-mono-tabular text-[11px] text-[#E8B86D]">
                      Failed attempts: {failedAttempts} / {MAX_PASSWORD_ATTEMPTS}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Email Address</span>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A5B3C3]"
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="astronaut@gmail.com"
                      required
                      autoComplete="email"
                      className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 pl-10 pr-3.5 py-2.5 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/50 focus:border-[#8AB9E8] focus:outline-none"
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A5B3C3]">Password</span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotOpen(true);
                        setResetEmail(email);
                        setResetError(null);
                        setResetMessage(null);
                      }}
                      className="text-xs font-medium text-[#8AB9E8] hover:text-[#B9DDF5] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A5B3C3]"
                      aria-hidden="true"
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        isLockedForCurrentInput
                          ? 'Locked for 15 minutes'
                          : 'Enter your password'
                      }
                      disabled={isLockedForCurrentInput}
                      required
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 pl-10 pr-10 py-2.5 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/50 focus:border-[#8AB9E8] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isLockedForCurrentInput}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5B3C3] hover:text-[#F4F7FA] disabled:opacity-40"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={signingIn || googleSigningIn || isLockedForCurrentInput}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-2.5 text-sm font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isLockedForCurrentInput ? (
                    <>
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      <span className="font-mono-tabular">
                        Sign-In Locked ({formatLockoutCountdown(remainingLockoutMs)})
                      </span>
                    </>
                  ) : signingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Mission Control</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-[rgba(190,215,240,0.14)]" />
                <span className="mx-3 shrink-0 text-[11px] uppercase tracking-wider text-[#A5B3C3]">
                  or
                </span>
                <div className="flex-grow border-t border-[rgba(190,215,240,0.14)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn || googleSigningIn}
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg border border-[rgba(190,215,240,0.22)] bg-[#05070B]/85 px-4 py-2.5 text-sm font-medium text-[#F4F7FA] hover:border-[#8AB9E8] hover:bg-[#0A111B] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {googleSigningIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#8AB9E8]" aria-hidden="true" />
                    <span>Connecting Google Account...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.04v3.14C3.05 21.14 7.21 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.03 14.02c-.25-.73-.39-1.52-.39-2.32s.14-1.59.39-2.32V6.24H1.04C.38 7.55 0 9.03 0 11.7s.38 4.15 1.04 5.46l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.86 1.04 7.06l3.99 3.14c.98-2.94 3.73-5.45 6.97-5.45Z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[rgba(190,215,240,0.14)]">
                <div className="flex items-center justify-between text-xs text-[#A5B3C3]">
                  <span>New to AstroCare?</span>
                  <button
                    type="button"
                    onClick={onSwitchToSignUp}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#8AB9E8] hover:text-[#B9DDF5] transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Create Astronaut Account</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password? Section via Firebase sendPasswordResetEmail */
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#8AB9E8]">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  <span>Password Recovery</span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#F4F7FA]">
                  Reset Password
                </h2>
                <p className="text-xs leading-relaxed text-[#A5B3C3]">
                  Enter your registered email address and Firebase Authentication will send a
                  password reset link directly to your inbox.
                </p>
              </div>

              {resetError && (
                <div className="rounded-lg border border-[#E77C82]/40 bg-[#E77C82]/10 px-3.5 py-2.5 text-xs text-[#E77C82]">
                  {resetError}
                </div>
              )}

              {resetMessage && (
                <div className="rounded-lg border border-[#70C99B]/40 bg-[#70C99B]/10 px-3.5 py-2.5 text-xs text-[#70C99B]">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Registered Email</span>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="astronaut@gmail.com"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2.5 text-sm text-[#F4F7FA] focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sendingReset}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-2.5 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 transition-colors"
                >
                  {sendingReset ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Sending Reset Email...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Email</span>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false);
                  setResetError(null);
                }}
                className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] px-4 py-2 text-xs font-medium text-[#A5B3C3] hover:text-[#F4F7FA] transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
