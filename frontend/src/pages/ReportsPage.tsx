import React from 'react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payments & Financial Reporting</h2>
            <p className="text-xs text-slate-500">Contract designated for Member 4</p>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-medium">
            Owner: Member 4
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Capabilities & Testing</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Invoice payment capture (credit card, bank transfer)</li>
              <li>Settlement reconciliation & transaction audit log</li>
              <li>Refund lifecycle management with audit justification</li>
              <li>MRR, ARR, churn rate, and time-series revenue metrics</li>
              <li>End-to-end integration and API unit test suites</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">API Contracts</h3>
            <ul className="text-xs font-mono text-slate-600 space-y-1.5">
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/payments/payments</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/payments/payments/&#123;id&#125;</li>
              <li><span className="text-amber-600 font-bold">POST</span> /api/v1/payments/payments/&#123;id&#125;/refund</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/reports/mrr</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/reports/revenue</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/reports/subscriptions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

