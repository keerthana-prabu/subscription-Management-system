import React from 'react';

interface NavbarProps {
  healthStatus: 'loading' | 'healthy' | 'error';
  backendVersion?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ healthStatus, backendVersion }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            B
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">Brightloop</h1>
            <p className="text-xs text-slate-500">Subscription Management System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy'
                  ? 'bg-emerald-500 animate-pulse'
                  : healthStatus === 'loading'
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-600 font-medium">
              API Status: {healthStatus === 'healthy' ? `Online (v${backendVersion || '0.1.0'})` : healthStatus}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

