import { useState } from 'react';
import {
  Activity,
  Bell,
  BookText,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  FileText,
  LayoutDashboard,
  Settings as SettingsIcon,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { NavPageId, SafeAstronautProfile } from '../types';
import { LegalModal, type LegalDocType } from './LegalModal';
import { NasaLogo, PoweredByNasa } from './NasaLogo';

interface SidebarProps {
  activePage: NavPageId;
  onNavigate: (page: NavPageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: SafeAstronautProfile;
  unreadAlertCount: number;
  isMonitoring: boolean;
  onEditProfile: () => void;
  onRequestLogout: () => void;
}

const NAV_ITEMS: { id: NavPageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Mission Overview', icon: LayoutDashboard },
  { id: 'monitoring', label: 'Health Monitoring', icon: Activity },
  { id: 'astra-pulse', label: 'ASTRA PULSE AI', icon: BrainCircuit },
  { id: 'alerts', label: 'Alert Centre', icon: Bell },
  { id: 'journal', label: 'Health Journal', icon: BookText },
  { id: 'reports', label: 'Mission Reports', icon: FileBarChart2 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AstraCareMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="13.5" stroke="#8AB9E8" strokeWidth="1.4" strokeOpacity="0.65" />
      <path
        d="M16 5.5L22.5 23.5L16 19.5L9.5 23.5L16 5.5Z"
        stroke="#F4F7FA"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 16.5H12.2L14 13.5L16.5 19L18.6 15.2L20 16.5H24" stroke="#B9DDF5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  unreadAlertCount,
}: SidebarProps) {
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  const handleNavClick = (id: NavPageId) => {
    onNavigate(id);
    onCloseMobile();
  };

  const sidebarContent = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed;

    return (
      <div className="flex h-full flex-col justify-between bg-[var(--astra-bg-secondary)] border-r border-[var(--astra-border)]">
        {/* Top Brand & Collapse Toggle */}
        <div>
          <div
            className={`flex items-center justify-between px-4 border-b border-[var(--astra-border)] ${
              isCompact ? 'h-16 justify-center px-2' : 'min-h-[76px] py-3'
            }`}
          >
            <button
              type="button"
              onClick={() => handleNavClick('overview')}
              className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[#8AB9E8] rounded-md min-w-0"
            >
              <AstraCareMark />
              {!isCompact && (
                <div className="min-w-0 space-y-0.5">
                  <div className="font-display text-base font-semibold tracking-wider text-[var(--astra-text-primary)] whitespace-nowrap">
                    AstroCare
                  </div>
                  <PoweredByNasa size="sm" />
                </div>
              )}
            </button>

            {isMobileDrawer ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation menu"
                className="rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden lg:inline-flex rounded-lg p-1.5 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {isCompact && (
            <div className="flex justify-center py-2.5 border-b border-[var(--astra-border)]" title="AstroCare · Powered by NASA">
              <NasaLogo size={20} />
            </div>
          )}

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={isCompact ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isCompact ? 'justify-center px-2' : 'justify-between'
                  } ${
                    active
                      ? 'bg-[#8AB9E8]/15 text-[var(--astra-text-primary)] border border-[#8AB9E8]/35'
                      : 'text-[var(--astra-text-secondary)] border border-transparent hover:text-[var(--astra-text-primary)] hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-[#8AB9E8]' : ''}`}
                      aria-hidden="true"
                    />
                    {!isCompact && <span className="truncate">{item.label}</span>}
                  </span>

                  {!isCompact && item.id === 'alerts' && unreadAlertCount > 0 && (
                    <span className="font-mono-tabular text-xs font-semibold text-[#E8B86D]">
                      {unreadAlertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Terms and Conditions & Privacy Policy Section */}
        <div className="p-3 border-t border-[var(--astra-border)]">
          {!isCompact ? (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--astra-text-secondary)]">
                Legal & Compliance
              </div>
              <button
                type="button"
                onClick={() => setLegalDoc('terms')}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors text-left"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#8AB9E8]" aria-hidden="true" />
                <span className="truncate">Terms and Conditions</span>
              </button>
              <button
                type="button"
                onClick={() => setLegalDoc('privacy')}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors text-left"
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#8AB9E8]" aria-hidden="true" />
                <span className="truncate">Privacy Policy</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLegalDoc('terms')}
                title="Terms and Conditions"
                aria-label="Terms and Conditions"
                className="rounded-lg p-2 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setLegalDoc('privacy')}
                title="Privacy Policy"
                aria-label="Privacy Policy"
                className="rounded-lg p-2 text-[var(--astra-text-secondary)] hover:text-[var(--astra-text-primary)] hover:bg-white/5 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 no-print ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent(false)}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/70"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[275px] max-w-[85vw] h-full">
            {sidebarContent(true)}
          </div>
        </div>
      )}

      <LegalModal
        docType={legalDoc}
        onClose={() => setLegalDoc(null)}
        onSwitchDoc={setLegalDoc}
      />
    </>
  );
}
