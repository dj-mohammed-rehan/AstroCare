import React, { useMemo, useState } from 'react';
import { BookText, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { useTelemetry } from '../hooks/useTelemetry';
import type { JournalEntry } from '../types';
import { formatDateTime } from '../utils/formatters';

const COMMON_SYMPTOMS = [
  'Mild headache',
  'Cephalic fluid shift',
  'Dry cabin air',
  'Post-EVA shoulder fatigue',
  'Sleep fragmentation',
  'Motion sensitivity',
  'Eye strain',
  'None reported',
];

export function HealthJournal() {
  const { journalEntries, addJournalEntry, updateJournalEntry, deleteJournalEntry } =
    useTelemetry();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [stressLevel, setStressLevel] = useState(3);
  const [moodStatus, setMoodStatus] = useState<JournalEntry['moodStatus']>('Steady');
  const [observations, setObservations] = useState('');
  const [notes, setNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setEntryDate(new Date().toISOString().slice(0, 10));
    setSelectedSymptoms([]);
    setCustomSymptom('');
    setSleepQuality(4);
    setStressLevel(3);
    setMoodStatus('Steady');
    setObservations('');
    setNotes('');
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleAddCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (!trimmed) return;
    if (!selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms((prev) => [...prev, trimmed]);
    }
    setCustomSymptom('');
  };

  const handleStartEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEntryDate(entry.entryDate);
    setSelectedSymptoms(entry.symptoms);
    setSleepQuality(entry.sleepQuality);
    setStressLevel(entry.stressLevel);
    setMoodStatus(entry.moodStatus);
    setObservations(entry.observations);
    setNotes(entry.notes);
    setFeedback(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!entryDate) {
      setFeedback({ type: 'error', text: 'Please select an entry date.' });
      return;
    }
    if (observations.trim().length < 5) {
      setFeedback({
        type: 'error',
        text: 'Please provide at least 5 characters in physiological observations.',
      });
      return;
    }

    const payload = {
      entryDate,
      symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : ['None reported'],
      sleepQuality,
      stressLevel,
      moodStatus,
      observations: observations.trim(),
      notes: notes.trim(),
    };

    if (editingId) {
      updateJournalEntry(editingId, payload);
      setFeedback({ type: 'success', text: 'Journal entry updated and persisted.' });
    } else {
      addJournalEntry(payload);
      setFeedback({ type: 'success', text: 'New astronaut health journal entry saved.' });
    }
    resetForm();
  };

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journalEntries.filter((entry) => {
      if (dateFilter && entry.entryDate !== dateFilter) return false;
      if (
        q &&
        !entry.observations.toLowerCase().includes(q) &&
        !entry.notes.toLowerCase().includes(q) &&
        !entry.symptoms.some((s) => s.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [journalEntries, searchQuery, dateFilter]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      {/* Left: Create / Edit Journal Form */}
      <section className="xl:col-span-5 astra-panel rounded-xl p-5 space-y-5 h-fit">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--astra-text-primary)]">
              {editingId ? 'Edit Health Entry' : 'Log Astronaut Health Entry'}
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Record subjective symptoms, sleep quality, and operational observations
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--astra-border)] px-2.5 py-1 text-xs text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        {feedback && (
          <div
            className={`rounded-lg border px-3.5 py-2.5 text-xs ${
              feedback.type === 'success'
                ? 'border-[#70C99B]/40 bg-[#70C99B]/10 text-[#70C99B]'
                : 'border-[#E77C82]/40 bg-[#E77C82]/10 text-[#E77C82]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Date *</span>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Readiness / Mood
              </span>
              <select
                value={moodStatus}
                onChange={(e) => setMoodStatus(e.target.value as JournalEntry['moodStatus'])}
                className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              >
                <option value="Optimal">Optimal</option>
                <option value="Steady">Steady</option>
                <option value="Fatigued">Fatigued</option>
                <option value="Strained">Strained</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Sleep Quality ({sleepQuality}/5)
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={sleepQuality}
                onChange={(e) => setSleepQuality(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                className="w-full accent-[#8AB9E8]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
                Perceived Stress ({stressLevel}/10)
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={stressLevel}
                onChange={(e) => setStressLevel(Number(e.target.value))}
                className="w-full accent-[#8AB9E8]"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--astra-text-secondary)]">Symptoms</span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SYMPTOMS.map((sym) => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? 'border-[#8AB9E8] bg-[#8AB9E8]/20 text-[#B9DDF5]'
                        : 'border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                placeholder="Add custom symptom..."
                className="flex-1 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-1.5 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomSymptom}
                className="rounded-lg border border-[var(--astra-border)] px-3 py-1.5 text-xs font-medium text-[#B9DDF5] hover:border-[#8AB9E8]"
              >
                Add
              </button>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
              Observations *
            </span>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Physical recovery, exercise tolerance, cabin comfort..."
              required
              className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--astra-text-secondary)]">
              Additional Crew Notes
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional flight surgeon notes or follow-up items..."
              className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8AB9E8] px-4 py-2.5 text-xs font-semibold text-[#05070B] hover:bg-[#B9DDF5] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{editingId ? 'Save Changes' : 'Save Journal Entry'}</span>
          </button>
        </form>
      </section>

      {/* Right: Search & Journal Timeline */}
      <section className="xl:col-span-7 space-y-4">
        <div className="astra-panel rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--astra-text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symptoms, observations, notes..."
              className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] pl-9 pr-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter journal entries by date"
            className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs text-[#8AB9E8] hover:text-[#B9DDF5]"
            >
              Clear date
            </button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={BookText}
            title="No journal entries found"
            description="No entries match your filters yet. Use the form to record astronaut observations, sleep quality, and symptoms."
          />
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="astra-panel rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono-tabular font-semibold text-[#B9DDF5]">
                        {entry.entryDate}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[var(--astra-text-primary)] font-medium">
                        Readiness: {entry.moodStatus}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[var(--astra-text-secondary)]">
                        Sleep {entry.sleepQuality}/5 · Stress {entry.stressLevel}/10
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--astra-text-secondary)]">
                      Updated {formatDateTime(entry.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(entry)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--astra-border)] px-2.5 py-1 text-xs text-[var(--astra-text-secondary)] hover:text-[#B9DDF5] hover:border-[#8AB9E8] transition-colors"
                    >
                      <Edit3 className="h-3 w-3" aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(entry.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E77C82]/30 px-2.5 py-1 text-xs text-[#E77C82] hover:bg-[#E77C82]/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-[#8AB9E8]">
                  Symptoms: {entry.symptoms.join(' · ')}
                </div>

                <p className="text-sm leading-relaxed text-[var(--astra-text-primary)]">
                  {entry.observations}
                </p>

                {entry.notes && (
                  <p className="text-xs leading-relaxed text-[var(--astra-text-secondary)] border-t border-[var(--astra-border)] pt-2.5">
                    {entry.notes}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title="Delete Health Journal Entry?"
        message="This journal record will be permanently removed from your local mission log."
        confirmLabel="Delete Entry"
        destructive
        onConfirm={() => {
          if (deleteTargetId) {
            deleteJournalEntry(deleteTargetId);
            if (editingId === deleteTargetId) resetForm();
            setFeedback({ type: 'success', text: 'Journal entry deleted.' });
          }
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
