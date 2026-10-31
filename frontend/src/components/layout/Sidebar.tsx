import React from 'react';
import {
  BarChart3,
  Package,
  RefreshCw,
  FileText,
  CreditCard,
  Shield,
  X,
  Lock,
} from 'lucide-react';
import type { User, UserRole } from '../../api/types';
import { Badge } from '../common/Badge';

export type TabId = 'dashboard' | 'auth' | 'catalog' | 'subscriptions' | 'billing' | 'reports';

export interface NavItemConfig {
  id: TabId;
  label: string;
  description: string;
  icon: React.ReactNode;
  allowedRoles: UserRole[];
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    description: 'System metrics & domain status',
    icon: <BarChart3 className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales', 'finance', 'customer'],
  },
  {
    id: 'catalog',
    label: 'Catalog & Quotes',
    description: 'Products, variants & quotes',
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales'],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    description: 'Plans & customer lifecycle',
    icon: <RefreshCw className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales', 'customer'],
  },
  {
    id: 'billing',
    label: 'Invoices & Taxes',
    description: 'Billing ledger & discounts',
    icon: <FileText className="w-4 h-4" />,
    allowedRoles: ['admin', 'finance', 'customer'],
  },
  {
    id: 'reports',
    label: 'Payments & Reports',
    description: 'Transactions, MRR & ledger',
    icon: <CreditCard className="w-4 h-4" />,
    allowedRoles: ['admin', 'finance'],
  },
  {
    id: 'auth',
    label: 'Account & Security',
    description: 'Session & access control',
    icon: <Shield className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales', 'finance', 'customer'],
  },
];

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  user: User | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isTabAllowed = (item: NavItemConfig): boolean => {
    if (!user) {
      // Unauthenticated users can view Dashboard and Auth
      return item.id === 'dashboard' || item.id === 'auth';
    }
    return item.allowedRoles.includes(user.role);
  };

  const handleNavClick = (tabId: TabId) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* User Role Card */}
        {user ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Role
              </span>
              <Badge role={user.role} />
            </div>
            <div className="font-semibold text-xs text-slate-800 truncate">{user.full_name}</div>
            <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
          </div>
        ) : (
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-indigo-900">Guest Session</span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <p className="text-[11px] text-indigo-700 leading-snug">
              Sign in to unlock role-specific subscription modules.
            </p>
          </div>
        )}

        {/* Navigation list */}
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 text-left">
            Modules
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const allowed = isTabAllowed(item);
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => allowed && handleNavClick(item.id)}
                  disabled={!allowed}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : allowed
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <span className={isActive ? 'text-white' : allowed ? 'text-slate-500' : 'text-slate-300'}>
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                    </div>
                  </div>

                  {!allowed && (
                    <span title={`Requires ${item.allowedRoles.join(' or ')} role`}>
                      <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="pt-4 border-t border-slate-100 text-left">
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">RBAC Enforcement</span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.2 rounded">
              Active
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Backend remains the source of truth for authorization.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">Navigation</span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
