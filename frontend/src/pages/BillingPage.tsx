import React from 'react';
import { Receipt, FileText, Percent, CheckCircle2 } from 'lucide-react';

export const BillingPage: React.FC = () => {
  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Invoicing, Taxes & Discounts Ledger
              </h2>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Designated for Member 3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated recurring billing pipeline, invoice generation, regional tax engines, and coupon discounts.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 font-mono">
          Owner: Member 3 (Subscriptions & Billing)
        </div>
      </div>

      {/* Feature Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Automated Billing Ledger Rules</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-3">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Recurring Line-Item Aggregation:</strong> Automatically compute invoice amounts from active subscription commitments and metered consumption.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Tax Engine:</strong> Dynamic calculation for VAT, GST, and regional sales tax rules based on customer jurisdiction.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Discount Codes:</strong> Support for percentage-based and fixed-dollar discount vouchers with expiry validation.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Invoice State Machine:</strong> Strict status progression: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-700">DRAFT &rarr; POSTED &rarr; PAID &rarr; VOID</code>.
              </span>
            </li>
          </ul>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-2.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Percent className="w-4 h-4 text-indigo-600" />
            <span>FastAPI Contract Endpoints</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">GET /api/v1/billing/invoices</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                PAGINATED
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">POST /api/v1/billing/invoices</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                MUTATION
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">GET /api/v1/billing/taxes</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                LIST
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
              <span className="text-slate-800">GET /api/v1/billing/discounts</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                LIST
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
