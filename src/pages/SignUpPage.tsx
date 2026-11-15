import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  User,
  X,
} from 'lucide-react';
import spaceBgUrl from '../assets/images/space_atmosphere_bg_1794655335899.jpg';
import { PoweredByNasa } from '../components/NasaLogo';
import { AstraCareMark } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import type { AstronautRole, BiologicalSex, BloodGroup } from '../types';
import { resizeImageToDataUrl } from '../utils/formatters';

interface SignUpPageProps {
  onSwitchToSignIn: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const ROLES: AstronautRole[] = [
  'Mission Commander',
  'Flight Engineer',
  'Payload Specialist',
  'Flight Surgeon',
  'Science Officer',
];
const SEX_OPTIONS: BiologicalSex[] = ['Female', 'Male', 'Other', 'Prefer not to say'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpPage({ onSwitchToSignIn }: SignUpPageProps) {
  const { signUp } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All inputs remain blank until filled by the user
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [callsign, setCallsign] = useState('');
  const [role, setRole] = useState<AstronautRole | ''>('');
  const [missionName, setMissionName] = useState('');
  const [spacecraft, setSpacecraft] = useState('');

  const [age, setAge] = useState('');
  const [sex, setSex] = useState<BiologicalSex | ''>('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [restingHeartRate, setRestingHeartRate] = useState('');

  const [medicalNotes, setMedicalNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    try {
      const resized = await resizeImageToDataUrl(file, 192);
      setAvatarUrl(resized);
      setError(null);
    } catch {
      setError('Could not process profile picture.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Please enter your full name and email address.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!callsign.trim() || !role || !missionName.trim() || !spacecraft.trim()) {
      setError('Please complete all mission assignment fields.');
      return;
    }

    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    const parsedRestingHr = Number(restingHeartRate);

    if (!age.trim() || Number.isNaN(parsedAge) || parsedAge < 21 || parsedAge > 75) {
      setError('Please enter a valid age between 21 and 75 years.');
      return;
    }
    if (!bloodGroup) {
      setError('Please select your blood group.');
      return;
    }
    if (!sex) {
      setError('Please select biological sex.');
      return;
    }
    if (
      !heightCm.trim() ||
      Number.isNaN(parsedHeight) ||
      parsedHeight < 140 ||
      parsedHeight > 215
    ) {
      setError('Please enter a valid height between 140 and 215 cm.');
      return;
    }
    if (
      !weightKg.trim() ||
      Number.isNaN(parsedWeight) ||
      parsedWeight < 40 ||
      parsedWeight > 130
    ) {
      setError('Please enter a valid weight between 40 and 130 kg.');
      return;
    }
    if (
      !restingHeartRate.trim() ||
      Number.isNaN(parsedRestingHr) ||
      parsedRestingHr < 40 ||
      parsedRestingHr > 110
    ) {
      setError('Please enter a resting baseline heart rate between 40 and 110 BPM.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp({
        email,
        password,
        fullName,
        callsign,
        role,
        missionName,
        spacecraft,
        age: parsedAge,
        sex,
        bloodGroup,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        restingHeartRate: parsedRestingHr,
        medicalNotes,
        avatarUrl,
      });

      if (!res.ok) {
        setError(res.error ?? 'Failed to create astronaut account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05070B] text-[#F4F7FA] py-8 px-4 sm:px-8 overflow-y-auto">
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
            'radial-gradient(circle at 30% 20%, rgba(10,17,27,0.72) 0%, rgba(5,7,11,0.95) 80%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
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
              <div className="text-xs text-[#A5B3C3]">New Crew Onboarding & Biomedical Profile</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(190,215,240,0.22)] bg-[#0A111B]/80 px-3.5 py-2 text-xs font-medium text-[#B9DDF5] hover:border-[#8AB9E8] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Already have an account? Sign In</span>
          </button>
        </div>

        {/* Sign Up Card — Deliberately has NO Forgot Password section */}
        <div className="astra-panel rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-semibold text-[#F4F7FA]">
              Create Astronaut Profile
            </h1>
            <p className="text-sm text-[#A5B3C3]">
              Complete your credentials and biomedical baseline. A verification link will be sent to
              your email via Firebase Authentication before Mission Overview access is unlocked.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[#E77C82]/40 bg-[#E77C82]/10 px-4 py-3 text-xs text-[#E77C82]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[rgba(190,215,240,0.16)] bg-[#05070B]/60 p-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Crew profile preview"
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 rounded-full object-cover border border-[#8AB9E8]/50 shrink-0"
                />
              ) : (
                <div
                  aria-label="No profile photo selected"
                  className="h-16 w-16 rounded-full border border-dashed border-[rgba(190,215,240,0.3)] bg-[#0A111B] flex items-center justify-center text-[#A5B3C3]/60 shrink-0"
                >
                  <User className="h-7 w-7" aria-hidden="true" />
                </div>
              )}
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <div className="text-xs font-semibold text-[#F4F7FA]">
                  Crew Profile Picture (Optional)
                </div>
                <p className="text-xs text-[#A5B3C3]">
                  Upload a portrait photo for your mission badge, or leave blank until later.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 px-3 py-1.5 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[rgba(190,215,240,0.18)] px-2.5 py-1.5 text-xs font-medium text-[#A5B3C3] hover:text-[#F4F7FA] transition-colors"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Account Credentials */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8AB9E8]">
                Account Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Full Name *</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Email Address *</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Password *</span>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 pl-3.5 pr-10 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5B3C3] hover:text-[#F4F7FA]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Confirm Password *</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Mission & Crew Assignment */}
            <div className="space-y-3 pt-2 border-t border-[rgba(190,215,240,0.14)]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8AB9E8]">
                Mission Assignment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Callsign / Crew ID *</span>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="Enter callsign"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Crew Role *</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AstronautRole)}
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] focus:border-[#8AB9E8] focus:outline-none"
                  >
                    <option value="" disabled>
                      Select crew role
                    </option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Mission Name *</span>
                  <input
                    type="text"
                    value={missionName}
                    onChange={(e) => setMissionName(e.target.value)}
                    placeholder="Enter mission name"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Spacecraft / Habitat *</span>
                  <input
                    type="text"
                    value={spacecraft}
                    onChange={(e) => setSpacecraft(e.target.value)}
                    placeholder="Enter spacecraft or habitat"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            {/* Section 3: Biomedical Profile */}
            <div className="space-y-3 pt-2 border-t border-[rgba(190,215,240,0.14)]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8AB9E8]">
                Biomedical Baseline
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Age *</span>
                  <input
                    type="number"
                    min={21}
                    max={75}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="21–75"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm tabular-nums text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Blood Group *</span>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] focus:border-[#8AB9E8] focus:outline-none"
                  >
                    <option value="" disabled>
                      Select blood group
                    </option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 col-span-2 sm:col-span-1">
                  <span className="text-xs font-medium text-[#A5B3C3]">Biological Sex *</span>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as BiologicalSex)}
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] focus:border-[#8AB9E8] focus:outline-none"
                  >
                    <option value="" disabled>
                      Select sex
                    </option>
                    {SEX_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Height (cm) *</span>
                  <input
                    type="number"
                    min={140}
                    max={215}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="140–215"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm tabular-nums text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-[#A5B3C3]">Weight (kg) *</span>
                  <input
                    type="number"
                    min={40}
                    max={130}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="40–130"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm tabular-nums text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5 col-span-2 sm:col-span-1">
                  <span className="text-xs font-medium text-[#A5B3C3]">Resting HR (BPM) *</span>
                  <input
                    type="number"
                    min={40}
                    max={110}
                    value={restingHeartRate}
                    onChange={(e) => setRestingHeartRate(e.target.value)}
                    placeholder="40–110"
                    required
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm tabular-nums text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5 col-span-2 sm:col-span-3">
                  <span className="text-xs font-medium text-[#A5B3C3]">
                    Medical Notes / Allergies (Optional)
                  </span>
                  <textarea
                    rows={2}
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Enter any medical notes or known allergies"
                    className="w-full rounded-lg border border-[rgba(190,215,240,0.18)] bg-[#05070B]/80 px-3.5 py-2 text-sm text-[#F4F7FA] placeholder:text-[#A5B3C3]/45 focus:border-[#8AB9E8] focus:outline-none"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-[#A5B3C3]">
                Firebase Authentication will send a free built-in verification link to your email.
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8AB9E8] px-5 py-2.5 text-sm font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <MailCheck className="h-4 w-4" aria-hidden="true" />
                    <span>Create Account & Send Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
