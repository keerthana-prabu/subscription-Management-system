import React from 'react';

export type TabId = 'dashboard' | 'auth' | 'catalog' | 'subscriptions' | 'billing' | 'reports';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems: { id: TabId; label: string; owner: string }[] = [
    { id: 'dashboard', label: 'Architecture Overview', owner: 'Team' },
    { id: 'auth', label: 'Authentication & RBAC', owner: 'Member 2' },
    { id: 'catalog', label: 'Product Catalog & Quotes', owner: 'Member 2' },
    { id: 'subscriptions', label: 'Subscriptions & Plans', owner: 'Member 3' },
    { id: 'billing', label: 'Invoices & Taxes', owner: 'Member 3' },
    { id: 'reports', label: 'Payments & Financials', owner: 'Member 4' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          System Modules
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex flex-col ${
                currentTab === item.id
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[11px] text-slate-400 font-normal">Owner: {item.owner}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <p className="font-medium text-slate-700 mb-1">Hackathon Architecture</p>
        <p>Contracts verified. Feature logic decoupled for simultaneous development.</p>
      </div>
    </aside>
  );
};

