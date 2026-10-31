import { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, type TabId } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { AuthPage } from './pages/AuthPage';
import { CatalogPage } from './pages/CatalogPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { BillingPage } from './pages/BillingPage';
import { ReportsPage } from './pages/ReportsPage';
import { api } from './api/client';
import type { HealthResponse } from './api/types';

export function App() {
  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Navbar healthStatus={healthStatus} backendVersion={health?.version} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 p-6 lg:p-8">
          {currentTab === 'dashboard' && <Dashboard health={health} error={errorMessage} />}
          {currentTab === 'auth' && <AuthPage />}
          {currentTab === 'catalog' && <CatalogPage />}
          {currentTab === 'subscriptions' && <SubscriptionsPage />}
          {currentTab === 'billing' && <BillingPage />}
          {currentTab === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
