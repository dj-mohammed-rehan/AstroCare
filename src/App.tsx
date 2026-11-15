import { useState } from 'react';
import { ConfirmModal } from './components/ConfirmModal';
import { Header } from './components/Header';
import { LoadingState } from './components/LoadingState';
import { PoweredByNasa } from './components/NasaLogo';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { TelemetryProvider, useTelemetry } from './hooks/useTelemetry';
import { AlertCentre } from './pages/AlertCentre';
import { AstraPulse } from './pages/AstraPulse';
import { HealthJournal } from './pages/HealthJournal';
import { HealthMonitoring } from './pages/HealthMonitoring';
import { MissionOverview } from './pages/MissionOverview';
import { MissionReports } from './pages/MissionReports';
import { Settings } from './pages/Settings';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import type { NavPageId } from './types';

const PAGE_TITLES: Record<NavPageId, string> = {
  overview: 'Mission Overview',
  monitoring: 'Live Health Monitoring',
  'astra-pulse': 'ASTRA PULSE AI',
  alerts: 'Alert Centre',
  journal: 'Astronaut Health Journal',
  reports: 'Mission Reports',
  settings: 'Settings',
};

function AstroCareWorkspace() {
  const { user, isLoading, isPendingVerification, signOut } = useAuth();
  const {
    alerts,
    unreadAlertCount,
    isMonitoring,
    markAlertRead,
  } = useTelemetry();

  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');
  const [activePage, setActivePage] = useState<NavPageId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070B] p-6">
        <LoadingState label="Initializing AstroCare" detail="Loading mission control environment..." />
      </div>
    );
  }

  if (isPendingVerification) {
    return <VerifyEmailPage />;
  }

  if (!user) {
    if (authView === 'signup') {
      return <SignUpPage onSwitchToSignIn={() => setAuthView('signin')} />;
    }
    return <SignInPage onSwitchToSignUp={() => setAuthView('signup')} />;
  }

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <MissionOverview onNavigate={setActivePage} />;
      case 'monitoring':
        return <HealthMonitoring />;
      case 'astra-pulse':
        return <AstraPulse />;
      case 'alerts':
        return <AlertCentre />;
      case 'journal':
        return <HealthJournal />;
      case 'reports':
        return <MissionReports />;
      case 'settings':
        return <Settings onOpenEditProfile={() => setEditProfileOpen(true)} />;
      default:
        return <MissionOverview onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--astra-bg-primary)] text-[var(--astra-text-primary)]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        user={user}
        unreadAlertCount={unreadAlertCount}
        isMonitoring={isMonitoring}
        onEditProfile={() => setEditProfileOpen(true)}
        onRequestLogout={() => setLogoutConfirmOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          pageTitle={PAGE_TITLES[activePage]}
          user={user}
          isMonitoring={isMonitoring}
          alerts={alerts}
          unreadAlertCount={unreadAlertCount}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onNavigate={setActivePage}
          onMarkAlertRead={markAlertRead}
          onEditProfile={() => setEditProfileOpen(true)}
          onRequestLogout={() => setLogoutConfirmOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto">
          {toast && (
            <div className="mb-4 rounded-xl border border-[#70C99B]/40 bg-[#70C99B]/10 px-4 py-2.5 text-xs font-medium text-[#70C99B]">
              {toast}
            </div>
          )}
          {renderPage()}
        </main>

        <footer className="border-t border-[var(--astra-border)] px-6 py-3 text-xs text-[var(--astra-text-secondary)] flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-[var(--astra-text-primary)]">
              AstroCare · Human Health. Beyond Earth.
            </span>
            <span aria-hidden="true">·</span>
            <PoweredByNasa size="sm" />
          </div>
        </footer>
      </div>

      {/* Edit Profile & Profile Photo Modal */}
      <ProfileEditModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onSaved={(msg) => showToast(msg)}
      />

      {/* Explicit Confirmation Dialog before Logging Out */}
      <ConfirmModal
        open={logoutConfirmOpen}
        title="Confirm Log Out"
        message={`Are you sure you want to log out of AstroCare Mission Control as ${user.fullName} (${user.callsign})? Your profile and local mission logs will remain saved on this workstation.`}
        confirmLabel="Yes, Log Out"
        cancelLabel="Stay Signed In"
        destructive
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          setActivePage('overview');
          setAuthView('signin');
          void signOut();
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <AstroCareWorkspace />
      </TelemetryProvider>
    </AuthProvider>
  );
}
