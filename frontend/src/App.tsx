import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NAV_ITEMS, type TabId } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AuthPage } from './pages/AuthPage';
import { CatalogPage } from './pages/CatalogPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { BillingPage } from './pages/BillingPage';
import { ReportsPage } from './pages/ReportsPage';
import { api } from './api/client';
import type { HealthResponse } from './api/types';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from './components/common/Button';

function MainLayout() {
  const { user, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'loading' | 'healthy' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.health
      .check()
      .then((data) => {
        if (isMounted) {
          setHealth(data);
          setHealthStatus('healthy');
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setHealthStatus('error');
          setErrorMessage(err.message || 'Unable to connect to backend server');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Check if current tab is allowed for current user's role
  const currentNavConfig = NAV_ITEMS.find((n) => n.id === currentTab);
  const isAllowed = (() => {
    if (currentTab === 'dashboard' || currentTab === 'auth') return true;
    if (!user) return false;
    if (!currentNavConfig) return false;
    return currentNavConfig.allowedRoles.includes(user.role);
  })();

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500/10 selection:text-indigo-900">
      <Navbar
        healthStatus={healthStatus}
        backendVersion={health?.version}
        user={user}
        onLogout={logout}
        onNavigateAuth={() => setCurrentTab('auth')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          user={user}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {!isAllowed ? (
            <div className="max-w-lg mx-auto my-14 bg-white p-8 sm:p-9 rounded-3xl border border-slate-200/80 shadow-md text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Access Privilege Required</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {user ? (
                    <>
                      The <span className="font-bold text-slate-800">{currentNavConfig?.label}</span> module requires{' '}
                      <span className="font-bold text-indigo-700">
                        {currentNavConfig?.allowedRoles.join(' or ').toUpperCase()}
                      </span>{' '}
                      privileges. Your account is currently authenticated as <span className="font-bold capitalize">{user.role}</span>.
                    </>
                  ) : (
                    'You must sign in with an authenticated account having sufficient privileges to access this subscription module.'
                  )}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentTab('dashboard')}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Return to Overview
                </Button>
                {!user && (
                  <Button size="sm" variant="primary" onClick={() => setCurrentTab('auth')}>
                    Sign In to Continue
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <Dashboard health={health} error={errorMessage} user={user} onNavigate={setCurrentTab} />
              )}
              {currentTab === 'auth' && <AuthPage onAuthSuccess={() => setCurrentTab('dashboard')} />}
              {currentTab === 'catalog' && <CatalogPage />}
              {currentTab === 'subscriptions' && <SubscriptionsPage />}
              {currentTab === 'billing' && <BillingPage />}
              {currentTab === 'reports' && <ReportsPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
