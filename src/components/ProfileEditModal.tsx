import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Save, User, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { AstronautRole, BiologicalSex, BloodGroup } from '../types';
import { resizeImageToDataUrl } from '../utils/formatters';

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
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

export function ProfileEditModal({ open, onClose, onSaved }: ProfileEditModalProps) {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [role, setRole] = useState<AstronautRole>('Mission Commander');
  const [missionName, setMissionName] = useState('');
  const [spacecraft, setSpacecraft] = useState('');
  const [age, setAge] = useState(35);
  const [sex, setSex] = useState<BiologicalSex>('Female');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [heightCm, setHeightCm] = useState(172);
  const [weightKg, setWeightKg] = useState(68);
  const [restingHeartRate, setRestingHeartRate] = useState(62);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName);
      setCallsign(user.callsign);
      setRole(user.role);
      setMissionName(user.missionName);
      setSpacecraft(user.spacecraft);
      setAge(user.age);
      setSex(user.sex);
      setBloodGroup(user.bloodGroup);
      setHeightCm(user.heightCm);
      setWeightKg(user.weightKg);
      setRestingHeartRate(user.restingHeartRate);
      setMedicalNotes(user.medicalNotes);
      setAvatarUrl(user.avatarUrl || '');
      setError(null);
    }
  }, [open, user]);

  if (!open || !user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    setUploadingPhoto(true);
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 192);
      setAvatarUrl(dataUrl);
    } catch {
      setError('Could not process selected image. Try another photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !callsign.trim() || !missionName.trim()) {
      setError('Full name, callsign, and mission name are required.');
      return;
    }
    if (age < 21 || age > 75) {
      setError('Astronaut age must be between 21 and 75.');
      return;
    }
    if (heightCm < 140 || heightCm > 215 || weightKg < 40 || weightKg > 130) {
      setError('Please enter valid height (140–215 cm) and weight (40–130 kg).');
      return;
    }
    if (restingHeartRate < 40 || restingHeartRate > 110) {
      setError('Resting baseline heart rate must be between 40 and 110 BPM.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await updateProfile({
        fullName,
        callsign,
        role,
        missionName,
        spacecraft,
        age,
        sex,
        bloodGroup,
        heightCm,
        weightKg,
        restingHeartRate,
        medicalNotes,
        avatarUrl,
      });

      if (!res.ok) {
        setError(res.error ?? 'Failed to update astronaut profile.');
        return;
      }

      onSaved?.('Astronaut profile and photo updated.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div className="astra-panel-solid w-full max-w-2xl rounded-xl p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--astra-border)]">
          <div>
            <h2
              id="edit-profile-title"
              className="font-display text-xl font-semibold text-[var(--astra-text-primary)]"
            >
              Edit Astronaut Profile
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Update crew identification, biomedical baseline, and profile photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile editor"
            className="rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Profile Pic Editor */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#8AB9E8]/40 bg-[#0A111B] flex items-center justify-center text-[#A5B3C3]/65">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || 'Astronaut portrait'}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-8 w-8" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <div className="text-sm font-medium text-[var(--astra-text-primary)]">
                Crew Profile Photograph
              </div>
              <p className="text-xs text-[var(--astra-text-secondary)]">
                Upload a custom portrait (JPG, PNG, or WEBP) or remove your current photograph.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#8AB9E8]/40 bg-[#8AB9E8]/15 px-3 py-1.5 text-xs font-medium text-[#B9DDF5] hover:bg-[#8AB9E8]/25 transition-colors whitespace-nowrap"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{uploadingPhoto ? 'Processing...' : avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] px-3 py-1.5 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Clear Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#E77C82]/40 bg-[#E77C82]/10 px-3.5 py-2.5 text-xs text-[#E77C82]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Callsign / Crew ID</span>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Crew Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AstronautRole)}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Mission Name</span>
              <input
                type="text"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Spacecraft / Habitat</span>
              <input
                type="text"
                value={spacecraft}
                onChange={(e) => setSpacecraft(e.target.value)}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Blood Group</span>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Age</span>
                <input
                  type="number"
                  min={21}
                  max={75}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] tabular-nums focus:border-[#8AB9E8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Height (cm)</span>
                <input
                  type="number"
                  min={140}
                  max={215}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] tabular-nums focus:border-[#8AB9E8] focus:outline-none"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Weight (kg)</span>
                <input
                  type="number"
                  min={40}
                  max={130}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] tabular-nums focus:border-[#8AB9E8] focus:outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Sex</span>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as BiologicalSex)}
                  className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
                >
                  {SEX_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Resting HR (BPM)</span>
                <input
                  type="number"
                  min={40}
                  max={110}
                  value={restingHeartRate}
                  onChange={(e) => setRestingHeartRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] tabular-nums focus:border-[#8AB9E8] focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Biomedical Notes & Allergies</span>
              <textarea
                rows={2}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-sm text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--astra-border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--astra-border)] px-4 py-2 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#8AB9E8] px-4 py-2 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] disabled:opacity-60 transition-colors"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
