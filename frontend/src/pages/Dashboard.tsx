import React from 'react';
import {
  Shield,
  Package,
  RefreshCw,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
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
  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {user ? `Welcome back, ${user.full_name}` : 'Brightloop Subscription Management System'}
              </h2>
              {user && <Badge role={user.role} />}
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              {user ? (
                <>
                  Logged in as <strong className="text-indigo-700 capitalize">{user.role}</strong>. Your navigation permissions and domain capabilities are tailored to this role.
                </>
              ) : (
                'Enterprise SaaS billing lifecycle platform with role-based governance for Administrators, Sales, Finance, and Customers.'
              )}
            </p>
          </div>

          {!user && (
            <div className="shrink-0 flex items-center space-x-2">
              <Button size="sm" onClick={() => onNavigate('auth')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Sign In to Platform
              </Button>
            </div>
          )}
        </div>

        {/* Backend Connectivity Status Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Backend Connection Offline:</span> {error}
              <p className="text-[11px] text-rose-600 mt-0.5">
                Ensure backend is running at <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">http://localhost:8000</code>.
              </p>
            </div>
          </div>
        )}

        {health && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>API Operational:</strong> {health.service} (v{health.version}) in {health.environment} mode.
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono hidden sm:inline">
              Checked: {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Role-Specific Capabilities Widget */}
      {user && (
        <div className="bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 rounded-2xl border border-indigo-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Role Permissions ({user.role.toUpperCase()})</span>
            </h3>
            <span className="text-[11px] text-indigo-600 font-medium">Session Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {user.role === 'admin' && (
              <>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Catalog & SKUs</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Full Management</div>
                  <button onClick={() => onNavigate('catalog')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Manage Products &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Subscriptions</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Global Governance</div>
                  <button onClick={() => onNavigate('subscriptions')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Plans &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Billing & Invoices</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Tax & Ledger</div>
                  <button onClick={() => onNavigate('billing')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Ledger &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Reports & MRR</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Executive Analytics</div>
                  <button onClick={() => onNavigate('reports')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Financials &rarr;
                  </button>
                </div>
              </>
            )}

            {user.role === 'sales' && (
              <>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Product Catalog</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Browse SKUs & Tiers</div>
                  <button onClick={() => onNavigate('catalog')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Open Catalog &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Quotation Templates</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Author Proposals</div>
                  <button onClick={() => onNavigate('catalog')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Manage Quotes &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Subscriptions</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Create Customer Deals</div>
                  <button onClick={() => onNavigate('subscriptions')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    New Subscription &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Account Details</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{user.email}</div>
                  <button onClick={() => onNavigate('auth')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Profile &rarr;
                  </button>
                </div>
              </>
            )}

            {user.role === 'finance' && (
              <>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Invoicing Engine</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Post & Audit Invoices</div>
                  <button onClick={() => onNavigate('billing')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Invoices List &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Taxes & Discounts</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">VAT/GST & Coupons</div>
                  <button onClick={() => onNavigate('billing')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Tax Rates &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Payments & Refunds</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Transactions Ledger</div>
                  <button onClick={() => onNavigate('reports')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Process Payments &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Financial Reports</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">MRR / ARR Breakdown</div>
                  <button onClick={() => onNavigate('reports')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Open Reports &rarr;
                  </button>
                </div>
              </>
            )}

            {user.role === 'customer' && (
              <>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">My Subscription</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Active Recurring Plan</div>
                  <button onClick={() => onNavigate('subscriptions')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Details &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">My Invoices</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Billing History</div>
                  <button onClick={() => onNavigate('billing')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    View Invoices &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Payment Methods</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Card / Bank Details</div>
                  <button onClick={() => onNavigate('auth')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Account Portal &rarr;
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Security & Profile</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">Password Management</div>
                  <button onClick={() => onNavigate('auth')} className="text-[11px] text-indigo-600 font-medium hover:underline mt-2 block">
                    Manage Profile &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Developer Domain Structure Cards */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Hackathon Architecture & Developer Slices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Member 1: Frontend Architect (Active)</span>
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                Phase 1 Delivered
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              React 18, TypeScript, Tailwind UI, JWT session persistence, show/hide password, live validation, and RBAC routing.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 p-2 rounded text-slate-600">
              frontend/src/context/AuthContext.tsx, components/*, pages/AuthPage.tsx
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-purple-600" />
                <span>Member 2: Auth & Catalog Backend</span>
              </span>
              <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">
                Simultaneous
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              User/Role authentication, JWT access tokens, product catalog, variants, and quotation templates.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 p-2 rounded text-slate-600">
              backend/app/api/v1/endpoints/auth.py, catalog.py
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                <span>Member 3: Subscriptions & Billing Backend</span>
              </span>
              <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded">
                Simultaneous
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Subscription lifecycle engine, recurring billing invoices, tax calculation, and discounts.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 p-2 rounded text-slate-600">
              backend/app/api/v1/endpoints/subscriptions.py, billing.py
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>Member 4: Payments & Reports Backend</span>
              </span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                Simultaneous
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Payment execution, refunds, financial aggregations (MRR/ARR), and comprehensive test suites.
            </p>
            <div className="text-[11px] font-mono bg-slate-50 p-2 rounded text-slate-600">
              backend/app/api/v1/endpoints/payments.py, reports.py, app/tests/*
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
