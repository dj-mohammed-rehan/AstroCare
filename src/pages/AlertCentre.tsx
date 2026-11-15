import { useMemo, useState } from 'react';
import { Bell, CheckCheck, RotateCcw, Search, Trash2 } from 'lucide-react';
import { AlertCard } from '../components/AlertCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { EmptyState } from '../components/EmptyState';
import { useTelemetry } from '../hooks/useTelemetry';
import { SCENARIO_OPTIONS } from '../services/telemetryEngine';
import type { AlertSeverity } from '../types';

export function AlertCentre() {
  const {
    alerts,
    unreadAlertCount,
    scenario,
    setScenario,
    markAlertRead,
    markAllAlertsRead,
    resolveAlert,
    clearResolvedAlerts,
    resetDemoAlerts,
  } = useTelemetry();

  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unread' | 'resolved'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const counts = useMemo(() => {
    return {
      total: alerts.length,
      active: alerts.filter((a) => !a.resolved).length,
      critical: alerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
      warning: alerts.filter((a) => a.severity === 'warning' && !a.resolved).length,
      resolved: alerts.filter((a) => a.resolved).length,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
      if (statusFilter === 'active' && alert.resolved) return false;
      if (statusFilter === 'unread' && (alert.read || alert.resolved)) return false;
      if (statusFilter === 'resolved' && !alert.resolved) return false;
      if (dateFilter && !alert.timestamp.startsWith(dateFilter)) return false;
      if (
        q &&
        !alert.title.toLowerCase().includes(q) &&
        !alert.explanation.toLowerCase().includes(q) &&
        !alert.metricLabel.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [alerts, severityFilter, statusFilter, dateFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Active Unresolved</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[var(--astra-text-primary)] tabular-nums">
            {counts.active}
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Active Critical</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#E77C82] tabular-nums">
            {counts.critical}
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Active Warnings</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#E8B86D] tabular-nums">
            {counts.warning}
          </div>
        </div>
        <div className="astra-panel rounded-xl p-4">
          <div className="text-xs text-[var(--astra-text-secondary)]">Unread Notifications</div>
          <div className="mt-1 font-display text-2xl font-semibold text-[#B9DDF5] tabular-nums">
            {unreadAlertCount}
          </div>
        </div>
      </section>

      {/* Filter & Action Toolbar */}
      <section className="astra-panel rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--astra-text-primary)]">
              Early-Warning Alert Management
            </h2>
            <p className="text-xs text-[var(--astra-text-secondary)]">
              Alerts are generated dynamically from simulated physiological threshold crossings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={markAllAlertsRead}
              disabled={unreadAlertCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[#8AB9E8]" aria-hidden="true" />
              <span>Mark All Read</span>
            </button>
            <button
              type="button"
              onClick={clearResolvedAlerts}
              disabled={counts.resolved === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5 text-[#A5B3C3]" aria-hidden="true" />
              <span>Clear Resolved ({counts.resolved})</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              disabled={alerts.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E77C82]/35 bg-[#E77C82]/10 px-3 py-1.5 text-xs font-medium text-[#E77C82] hover:bg-[#E77C82]/20 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Demo Alerts</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[var(--astra-border)]">
          {/* Search */}
          <div className="md:col-span-4 relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--astra-text-secondary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts or metric..."
              className="w-full rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] pl-9 pr-3 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            />
          </div>

          {/* Severity Filter */}
          <div className="md:col-span-4 flex flex-wrap items-center gap-1">
            {(['all', 'critical', 'warning', 'system', 'normal'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-[#8AB9E8]/20 text-[#B9DDF5] border border-[#8AB9E8]/40'
                    : 'border border-[var(--astra-border)] text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Status & Date */}
          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="Filter by alert status"
              className="flex-1 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-2.5 py-2 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="unread">Unread Only</option>
              <option value="resolved">Resolved Only</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter alerts by date"
              className="rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)] px-2.5 py-1.5 text-xs text-[var(--astra-text-primary)] focus:border-[#8AB9E8] focus:outline-none"
            />
          </div>
        </div>

        {/* Scenario Trigger Strip for Demonstration */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--astra-border)] text-xs">
          <span className="text-[var(--astra-text-secondary)]">Trigger Demo Anomaly:</span>
          {SCENARIO_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScenario(opt.id)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors whitespace-nowrap ${
                scenario === opt.id
                  ? 'border-[#8AB9E8] bg-[#8AB9E8]/15 text-[#B9DDF5]'
                  : 'border-[var(--astra-border)] text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Alerts Feed */}
      <section className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No matching alerts"
            description="No telemetry alerts match your current filters, or simulated telemetry is nominal. Use the anomaly triggers above to simulate threshold breaches."
            actionLabel={
              severityFilter !== 'all' || statusFilter !== 'all' || dateFilter || searchQuery
                ? 'Clear Filters'
                : 'Simulate Multi-Indicator Anomaly'
            }
            onAction={() => {
              if (severityFilter !== 'all' || statusFilter !== 'all' || dateFilter || searchQuery) {
                setSeverityFilter('all');
                setStatusFilter('all');
                setDateFilter('');
                setSearchQuery('');
              } else {
                setScenario('multi_abnormal');
              }
            }}
          />
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={markAlertRead}
              onResolve={resolveAlert}
            />
          ))
        )}
      </section>

      <ConfirmModal
        open={confirmResetOpen}
        title="Reset Demonstration Alerts?"
        message="This will clear all recorded alerts from the current mission demonstration workspace. New alerts will continue to generate automatically when simulated telemetry crosses configured thresholds."
        confirmLabel="Reset Alerts"
        destructive
        onConfirm={() => {
          resetDemoAlerts();
          setConfirmResetOpen(false);
        }}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
