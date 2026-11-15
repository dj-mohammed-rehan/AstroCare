import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Edit3,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  User,
} from 'lucide-react';
import type { HealthAlert, NavPageId, SafeAstronautProfile } from '../types';
import { formatDateTime } from '../utils/formatters';
import { PoweredByNasa } from './NasaLogo';
import { StatusBadge } from './StatusBadge';

interface HeaderProps {
  pageTitle: string;
  user: SafeAstronautProfile;
  isMonitoring: boolean;
  alerts: HealthAlert[];
  unreadAlertCount: number;
  onOpenMobileNav: () => void;
  onNavigate: (page: NavPageId) => void;
  onMarkAlertRead: (id: string) => void;
  onEditProfile: () => void;
  onRequestLogout: () => void;
}

export function Header({
  pageTitle,
  user,
  isMonitoring,
  alerts,
  unreadAlertCount,
  onOpenMobileNav,
  onNavigate,
  onMarkAlertRead,
  onEditProfile,
  onRequestLogout,
}: HeaderProps) {
  const [clock, setClock] = useState(() => new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const recentAlerts = alerts.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
      {/* Left: Mobile Trigger + Page Title + Mission Identifier */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation drawer"
          className="lg:hidden rounded-lg border border-[var(--astra-border)] p-2 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold text-[var(--astra-text-primary)] truncate">
            {pageTitle}
          </h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--astra-text-secondary)]">
            <span className="truncate">{user.missionName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{user.callsign}</span>
            <span aria-hidden="true">·</span>
            <span className={isMonitoring ? 'text-[#70C99B]' : 'text-[#E8B86D]'}>
              {isMonitoring ? 'Simulated Telemetry Active' : 'Simulation Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: AstroCare · Powered by NASA + Date/Time + Notifications + User Profile Menu */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div className="hidden xl:flex items-center gap-2.5 pr-3 border-r border-[var(--astra-border)]">
          <span className="font-display text-xs font-semibold tracking-wider text-[var(--astra-text-primary)] whitespace-nowrap">
            AstroCare
          </span>
          <span aria-hidden="true" className="text-[var(--astra-text-secondary)]">
            ·
          </span>
          <PoweredByNasa size="sm" />
        </div>

        <div className="hidden md:block text-right">
          <div className="text-[11px] text-[var(--astra-text-secondary)]">
            {clock.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
          </div>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Toggle alerts notification panel"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:border-[var(--astra-border-hover)] transition-colors"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E77C82] px-1 text-[10px] font-semibold text-[#05070B] tabular-nums">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="astra-panel-solid absolute right-0 mt-2 w-80 sm:w-96 rounded-xl p-3 shadow-2xl z-40">
              <div className="flex items-center justify-between px-1 pb-2.5 border-b border-[var(--astra-border)]">
                <span className="text-xs font-semibold text-[var(--astra-text-primary)]">
                  Telemetry Alerts ({unreadAlertCount} unread)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(false);
                    onNavigate('alerts');
                  }}
                  className="text-xs font-medium text-[#8AB9E8] hover:text-[#B9DDF5]"
                >
                  Open Alert Centre
                </button>
              </div>

              <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                {recentAlerts.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--astra-text-secondary)]">
                    No active or recent simulated alerts.
                  </p>
                ) : (
                  recentAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => {
                        onMarkAlertRead(alert.id);
                        setNotifOpen(false);
                        onNavigate('alerts');
                      }}
                      className="w-full text-left rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-primary)]/60 p-2.5 hover:border-[var(--astra-border-hover)] transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={alert.severity} compact />
                        <span className="text-[11px] font-mono-tabular text-[var(--astra-text-secondary)]">
                          {formatDateTime(alert.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[var(--astra-text-primary)]">
                        {alert.title}
                      </div>
                      <div className="text-[11px] text-[var(--astra-text-secondary)] truncate">
                        {alert.metricLabel}: {alert.valueDisplay}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2.5 rounded-lg border border-[var(--astra-border)] bg-[var(--astra-bg-secondary)] px-2.5 py-1.5 hover:border-[var(--astra-border-hover)] transition-colors"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full object-cover border border-[#8AB9E8]/40"
              />
            ) : (
              <div
                aria-label={user.fullName}
                className="h-7 w-7 rounded-full border border-[#8AB9E8]/35 bg-[#0A111B] flex items-center justify-center text-[#A5B3C3]"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
            )}
            <span className="hidden sm:block text-xs font-medium text-[var(--astra-text-primary)] max-w-[130px] truncate">
              {user.fullName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--astra-text-secondary)]" aria-hidden="true" />
          </button>

          {profileOpen && (
            <div className="astra-panel-solid absolute right-0 mt-2 w-64 rounded-xl p-2 shadow-2xl z-40">
              <div className="px-3 py-2.5 border-b border-[var(--astra-border)] flex items-center gap-2.5">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover border border-[#8AB9E8]/40 shrink-0"
                  />
                ) : (
                  <div
                    aria-label={user.fullName}
                    className="h-10 w-10 rounded-full border border-[#8AB9E8]/35 bg-[#0A111B] flex items-center justify-center text-[#A5B3C3] shrink-0"
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--astra-text-primary)] truncate">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-[var(--astra-text-secondary)] truncate">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-[#8AB9E8] truncate">
                    {user.role} · Blood {user.bloodGroup}
                  </div>
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onEditProfile();
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#8AB9E8]" aria-hidden="true" />
                  <span>Edit Profile & Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
                >
                  <SettingsIcon className="h-3.5 w-3.5 text-[#A5B3C3]" aria-hidden="true" />
                  <span>Mission Settings</span>
                </button>
              </div>

              {/* Log Out icon at the end of the profile section */}
              <div className="pt-1 mt-1 border-t border-[var(--astra-border)]">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onRequestLogout();
                  }}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#E77C82] hover:bg-[#E77C82]/10 transition-colors"
                >
                  <span>Log Out</span>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
