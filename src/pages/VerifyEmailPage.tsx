import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import spaceBgUrl from '../assets/images/space_atmosphere_bg_1794655335899.jpg';
import { PoweredByNasa } from '../components/NasaLogo';
import { AstraCareMark } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';

const RESEND_COOLDOWN_SECONDS = 60;

function computeRemainingCooldown(lastSentAt: number | null): number {
  if (!lastSentAt) return 0;
  const elapsed = Math.floor((Date.now() - lastSentAt) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
}

export function VerifyEmailPage() {
  const {
    pendingEmail,
    lastVerificationSentAt,
    verificationNotice,
    verificationError,
    resendVerificationEmail,
    refreshVerificationStatus,
    signOut,
  } = useAuth();

  const [cooldown, setCooldown] = useState(() =>
    computeRemainingCooldown(lastVerificationSentAt)
  );
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(verificationNotice);
  const [errorMessage, setErrorMessage] = useState<string | null>(verificationError);
  const lastFocusCheckRef = useRef<number>(0);

  useEffect(() => {
    setCooldown(computeRemainingCooldown(lastVerificationSentAt));
  }, [lastVerificationSentAt]);

  useEffect(() => {
    if (verificationNotice) setStatusMessage(verificationNotice);
  }, [verificationNotice]);

  useEffect(() => {
    if (verificationError) setErrorMessage(verificationError);
  }, [verificationError]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Automatically check Firebase emailVerified when the astronaut returns to this tab after clicking the link
  useEffect(() => {
    const checkOnFocus = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusCheckRef.current < 3000) return;
      lastFocusCheckRef.current = now;
      void refreshVerificationStatus();
    };
    window.addEventListener('focus', checkOnFocus);
    document.addEventListener('visibilitychange', checkOnFocus);
    return () => {
      window.removeEventListener('focus', checkOnFocus);
      document.removeEventListener('visibilitychange', checkOnFocus);
    };
  }, [refreshVerificationStatus]);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const res = await refreshVerificationStatus();
    setRefreshing(false);

    if (!res.ok) {
      setErrorMessage(res.error ?? 'Could not verify status with Firebase Authentication.');
      return;
    }

    if (!res.verified) {
      setErrorMessage(
        'Your email is not verified yet. Open the Firebase verification link sent to your inbox or spam folder, then click Refresh Verification Status.'
      );
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const res = await resendVerificationEmail();
    setResending(false);

    if (!res.ok) {
      setErrorMessage(res.error ?? 'Failed to resend verification email.');
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStatusMessage(
      `A fresh Firebase verification link has been mailed to ${pendingEmail ?? 'your email'}. Please check both your inbox and spam folder.`
    );
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05070B] text-[#F4F7FA] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
      <img
        src={spaceBgUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-45"
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 35% 25%, rgba(10,17,27,0.72) 0%, rgba(5,7,11,0.96) 82%)',
        }}
      />

      <div className="relative z-10 w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AstraCareMark />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-display text-lg font-semibold tracking-wider text-[#F4F7FA]">
                  AstroCare
                </span>
                <span aria-hidden="true" className="text-[#A5B3C3]">
                  ·
                </span>
                <PoweredByNasa size="sm" tone="dark" />
              </div>
              <div className="text-xs text-[#A5B3C3]">Human Health. Beyond Earth.</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(190,215,240,0.2)] bg-[#0A111B]/85 px-3.5 py-2 text-xs font-medium text-[#A5B3C3] hover:text-[#F4F7FA] hover:border-[#8AB9E8] transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{loggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>

        <div className="astra-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-[#8AB9E8]/35 bg-[#8AB9E8]/10 p-3 text-[#8AB9E8] shrink-0">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8AB9E8]">
                Security Clearance Gate · Email Verification Required
              </div>
              <h1 className="font-display text-2xl font-semibold text-[#F4F7FA]">
                Verify Your Astronaut Email
              </h1>
              <p className="text-sm text-[#A5B3C3] leading-relaxed">
                Access to <strong className="text-[#F4F7FA]">Mission Overview</strong> and telemetry
                systems is locked until your email address is confirmed via Firebase Authentication.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(190,215,240,0.16)] bg-[#05070B]/70 p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-[#A5B3C3]">
              Verification Link Sent To
            </div>
            <div className="font-mono-tabular text-sm font-semibold text-[#B9DDF5] break-all">
              {pendingEmail ?? 'Your registered email address'}
            </div>
            <p className="text-xs text-[#A5B3C3] leading-relaxed pt-1">
              Open your <strong className="text-[#F4F7FA]">Inbox</strong> and also check your{' '}
              <strong className="text-[#F4F7FA]">Spam / Junk folder</strong> for the verification
              email from Firebase Authentication, then click the verification link inside.
            </p>
          </div>

          {statusMessage && (
            <div className="rounded-lg border border-[#70C99B]/40 bg-[#70C99B]/10 px-4 py-3 text-xs text-[#70C99B] flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-[#E8B86D]/45 bg-[#E8B86D]/10 px-4 py-3 text-xs text-[#E8B86D] flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-3 text-sm font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 transition-colors"
            >
              {refreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Checking Firebase Verification Status...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  <span>Refresh Verification Status</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(190,215,240,0.22)] bg-[#05070B]/75 px-4 py-2.5 text-xs font-semibold text-[#B9DDF5] hover:border-[#8AB9E8] disabled:opacity-55 transition-colors"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  <span>Sending Verification Email...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {cooldown > 0
                      ? `Resend Verification Email (${cooldown}s)`
                      : 'Resend Verification Email'}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-[rgba(190,215,240,0.14)] flex items-start gap-2.5 text-xs text-[#A5B3C3]">
            <ShieldAlert className="h-4 w-4 text-[#8AB9E8] shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">
              Once you click the link in the email, return here and press{' '}
              <strong className="text-[#F4F7FA]">Refresh Verification Status</strong> to unlock your
              AstroCare Mission Overview dashboard.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
