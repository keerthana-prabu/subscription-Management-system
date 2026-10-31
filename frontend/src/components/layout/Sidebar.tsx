import React from 'react';
import {
  LayoutDashboard,
  Package,
  Repeat,
  Receipt,
  BarChart4,
  ShieldCheck,
  X,
  Lock,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import type { User, UserRole } from '../../api/types';
import { Badge } from '../common/Badge';

export type TabId = 'dashboard' | 'auth' | 'quotations' | 'catalog' | 'subscriptions' | 'billing' | 'reports';

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
    icon: <LayoutDashboard className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales', 'finance', 'customer'],
  },
  {
    id: 'quotations',
    label: 'Quotations & Proposals',
    description: 'Templates, proposals & pricing',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales'],
  },
  {
    id: 'catalog',
    label: 'Catalog & Variants',
    description: 'Products, variants & quotes',
    icon: <Package className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales'],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions & Lifecycle',
    description: 'Contracts, plans & lifecycle',
    icon: <Repeat className="w-4 h-4" />,
    allowedRoles: ['admin', 'sales', 'customer'],
  },
  {
    id: 'billing',
    label: 'Invoices & Taxes',
    description: 'Billing ledger & discounts',
    icon: <Receipt className="w-4 h-4" />,
    allowedRoles: ['admin', 'finance', 'customer'],
  },
  {
    id: 'reports',
    label: 'Payments & MRR',
    description: 'Transactions, MRR & ledger',
    icon: <BarChart4 className="w-4 h-4" />,
    allowedRoles: ['admin', 'finance'],
  },
  {
    id: 'auth',
    label: 'Account & Access',
    description: 'Session & access control',
    icon: <ShieldCheck className="w-4 h-4" />,
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
      return item.id === 'dashboard' || item.id === 'auth';
    }
    return item.allowedRoles.includes(user.role);
  };

  const handleNavClick = (tabId: TabId) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4.5">
      <div className="space-y-6">
        {/* Workspace Card */}
        <div className="p-3 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/40 border border-indigo-100/90 rounded-2xl shadow-2xs text-left">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Workspace
            </span>
            {user ? (
              <Badge role={user.role} size="sm" />
            ) : (
              <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                Guest
              </span>
            )}
          </div>
          <div className="font-bold text-xs text-slate-900 truncate">
            {user ? user.full_name : 'Brightloop Demo'}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {user ? user.email : 'Explore modules with guest preview'}
          </div>
        </div>

        {/* Navigation list */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2.5 text-left">
            Core Modules
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                      : allowed
                      ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      : 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span
                      className={`transition-colors ${
                        isActive
                          ? 'text-white'
                          : allowed
                          ? 'text-slate-400 group-hover:text-indigo-600'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                    </div>
                  </div>

                  {isActive ? (
                    <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
                  ) : !allowed ? (
                    <span title={`Requires ${item.allowedRoles.join(' or ')} role`}>
                      <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Role Guide Footer Card */}
      <div className="pt-4 border-t border-slate-100 text-left">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500">
          <div className="font-semibold text-slate-700 mb-0.5">RBAC Matrix</div>
          <p className="leading-snug text-slate-500 text-[10px]">
            Admin: Full access • Sales: Catalog & Plans • Finance: Invoices & MRR • Customer: My Subscriptions
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 border-r border-slate-200/80 bg-white/70 shrink-0 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl z-50">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
