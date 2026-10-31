import React from 'react';
import {
  Package,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Activity,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import type { HealthResponse, User } from '../api/types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import type { TabId } from '../components/layout/Sidebar';

interface DashboardProps {
  health: HealthResponse | null;
  error: string | null;
  user: User | null;
  onNavigate: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ health, error, user, onNavigate }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 text-left">
      {/* Top Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/50">
        {/* Subtle background glow circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-indigo-100 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentDate} • Enterprise SaaS Edition</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {user ? `Welcome back, ${user.full_name}` : 'Brightloop Subscription Management'}
            </h1>

            <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
              {user ? (
                <>
                  Logged in with <strong className="text-white capitalize">{user.role}</strong> privileges.
                  Manage multi-tier product variants, automated recurring plans, and billing lifecycle contracts.
                </>
              ) : (
                'Enterprise billing engine with automated recurring invoices, Odoo brand surcharge configurations, and role-based access control.'
              )}
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={() => onNavigate('catalog')}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Product Catalog
                </Button>
                {user.role === 'admin' && (
                  <Button
                    size="sm"
                    className="bg-white text-indigo-900 hover:bg-indigo-50 font-semibold"
                    onClick={() => onNavigate('subscriptions')}
                  >
                    Manage Plans
                  </Button>
                )}
              </div>
            ) : (
              <Button
                size="md"
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold shadow-md"
                onClick={() => onNavigate('auth')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Platform
              </Button>
            )}
          </div>
        </div>

        {/* Backend connectivity status banner inside hero */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {error ? (
            <div className="flex items-center space-x-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Backend Offline: {error} (Check port 8000)</span>
            </div>
          ) : health ? (
            <div className="flex items-center space-x-2 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>API Operational:</strong> {health.service} (v{health.version}) in {health.environment} mode
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-indigo-200">
              <Activity className="w-4 h-4 text-indigo-300 animate-spin" />
              <span>Checking backend connection...</span>
            </div>
          )}

          <div className="text-indigo-200/70 text-[11px] font-mono">
            FastAPI + PostgreSQL + SQLAlchemy + React 18
          </div>
        </div>
      </div>

      {/* 4 High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Active Subscriptions</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <RefreshCw className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">1,428</div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs">
            <span className="inline-flex items-center text-emerald-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +14.2%
            </span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Monthly Recurring (MRR)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">$84,250</div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs">
            <span className="inline-flex items-center text-emerald-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +9.4%
            </span>
            <span className="text-slate-400">new recurring deals</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Catalog Offerings</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">24 Products</div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs">
            <span className="text-indigo-600 font-semibold">12 Variants</span>
            <span className="text-slate-400">• Includes Odoo tier</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">System & Invoicing SLA</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">99.98%</div>
          <div className="mt-2 flex items-center space-x-1.5 text-xs">
            <span className="text-emerald-600 font-bold">Operational</span>
            <span className="text-slate-400">• 0 invoice failures</span>
          </div>
        </div>
      </div>

      {/* Role-Specific Capabilities Widget */}
      {user ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Role Privileges ({user.role.toUpperCase()})
                </h3>
                <p className="text-xs text-slate-500">
                  Tailored workflow capabilities granted to your account
                </p>
              </div>
            </div>
            <Badge role={user.role} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {user.role === 'admin' && (
              <>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Catalog & Variants</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Full Management</div>
                  <p className="text-[11px] text-slate-500 mt-1">Create SKUs, configure Odoo surcharges, edit prices.</p>
                  <button
                    onClick={() => onNavigate('catalog')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Open Catalog <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Subscription Plans</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Global Governance</div>
                  <p className="text-[11px] text-slate-500 mt-1">Configure intervals, trial periods, and auto-renew rules.</p>
                  <button
                    onClick={() => onNavigate('subscriptions')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Manage Plans <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Invoices & Taxes</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Tax & Billing Ledger</div>
                  <p className="text-[11px] text-slate-500 mt-1">Invoice posting, regional tax rules, discount codes.</p>
                  <button
                    onClick={() => onNavigate('billing')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View Invoices <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Payments & MRR</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Executive Analytics</div>
                  <p className="text-[11px] text-slate-500 mt-1">Revenue cohorts, refund controls, transaction audit.</p>
                  <button
                    onClick={() => onNavigate('reports')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View MRR <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {user.role === 'sales' && (
              <>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Product Catalog</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Browse SKUs & Tiers</div>
                  <button
                    onClick={() => onNavigate('catalog')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Open Catalog <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Subscriptions</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Deals & Plans</div>
                  <button
                    onClick={() => onNavigate('subscriptions')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View Plans <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Quotations & Proposals</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Author Proposals</div>
                  <button
                    onClick={() => onNavigate('quotations')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Manage Quotes <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-500">Account</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{user.email}</div>
                  <button
                    onClick={() => onNavigate('auth')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Security Settings <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {user.role === 'finance' && (
              <>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Invoices & Taxes</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Ledger Operations</div>
                  <button
                    onClick={() => onNavigate('billing')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Open Ledger <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Payments & MRR</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Financial Reconciliation</div>
                  <button
                    onClick={() => onNavigate('reports')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View Reports <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-500">Tax Rates</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">VAT & GST Rules</div>
                  <div className="text-[11px] text-slate-400 mt-1">Configured for Member 3</div>
                </div>
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-500">Account</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{user.email}</div>
                  <button
                    onClick={() => onNavigate('auth')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Security Settings <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {user.role === 'customer' && (
              <>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">My Subscriptions</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Plan & Billing Cycle</div>
                  <button
                    onClick={() => onNavigate('subscriptions')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View My Plans <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl border border-slate-200/70 transition-colors">
                  <div className="text-xs font-semibold text-slate-500">Invoices</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Payment Receipts</div>
                  <button
                    onClick={() => onNavigate('billing')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    View Receipts <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-500">Self-Service</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Pause or Upgrade</div>
                  <div className="text-[11px] text-slate-400 mt-1">Governed by plan policy</div>
                </div>
                <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
                  <div className="text-xs font-semibold text-slate-500">Security</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Password & Session</div>
                  <button
                    onClick={() => onNavigate('auth')}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    Account Settings <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-indigo-600" />
              Role-Based Access Control Active
            </h3>
            <p className="text-xs text-slate-500 max-w-xl">
              Sign in with an Administrator, Sales, Finance, or Customer profile to test dedicated subscription capabilities and endpoints.
            </p>
          </div>
          <Button size="sm" onClick={() => onNavigate('auth')}>
            Sign In with Demo Role
          </Button>
        </div>
      )}

      {/* Hackathon Architecture Team Ownership Card */}
      <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Hackathon Development Matrix & Team Ownership
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Odoo Make-A-Ton Hackathon</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-800">Member 1</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active
              </span>
            </div>
            <div className="text-xs font-bold text-indigo-700">Frontend Application</div>
            <p className="text-[11px] text-slate-500 mt-1">UI/UX, Auth, Catalog, Plans, Toasts, Skeletons</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-800">Member 2</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Contracts
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700">Auth & Catalog Backend</div>
            <p className="text-[11px] text-slate-500 mt-1">JWT Tokens, Products, Variants, Odoo surcharge logic</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-800">Member 3</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Contracts
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700">Subscriptions & Billing</div>
            <p className="text-[11px] text-slate-500 mt-1">Recurring Invoices, Taxes, Discounts, Plan lifecycle</p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-800">Member 4</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Contracts
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700">Payments & Reports</div>
            <p className="text-[11px] text-slate-500 mt-1">Payment capture, MRR analytics, test suites</p>
          </div>
        </div>
      </div>
    </div>
  );
};
