import React from 'react';
import { CreditCard, BarChart3, TrendingUp, CheckCircle2 } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Payments & Financial Analytics (MRR)
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Designated for Member 4
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Payment transaction gateway, automated settlement reconciliation, refund audits, and MRR/ARR cohorts.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 font-mono">
          Owner: Member 4 (Payments & Reports)
        </div>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Financial Reporting & Audit Capabilities</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-3">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Payment Capture & Webhooks:</strong> Process transactions via card tokens and ACH bank debits with idempotent retry mechanisms.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>MRR / ARR Analytics:</strong> Real-time cohort calculation measuring new recurring revenue, expansion MRR, churn rate, and net retention.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Settlement Reconciliation:</strong> Double-entry ledger matching invoices to bank payouts.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Refund Management:</strong> Granular refund audit logs with required executive justification metadata.
              </span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>FastAPI Contract Endpoints</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">POST /api/v1/payments/payments</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                CHARGE
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">POST /api/v1/payments/payments/&#123;id&#125;/refund</span>
              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                REFUND
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">GET /api/v1/reports/mrr</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                METRICS
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">GET /api/v1/reports/revenue</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                SERIES
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
