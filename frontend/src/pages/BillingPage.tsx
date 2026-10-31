import React from 'react';

export const BillingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Invoicing, Taxes & Discounts</h2>
            <p className="text-xs text-slate-500">Contract designated for Member 3</p>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
            Owner: Member 3
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Automated Billing Rules</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Recurring invoice calculation from subscription line items</li>
              <li>Regional tax rate application (VAT / GST)</li>
              <li>Discount code deduction (percentage / fixed amount)</li>
              <li>Status transitions: DRAFT &rarr; POSTED &rarr; PAID &rarr; VOID</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">API Contracts</h3>
            <ul className="text-xs font-mono text-slate-600 space-y-1.5">
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/billing/invoices</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/billing/invoices</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/billing/taxes</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/billing/taxes</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/billing/discounts</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/billing/discounts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

