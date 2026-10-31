import React from 'react';

export const AuthPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Authentication & Access Control</h2>
            <p className="text-xs text-slate-500">Contract designated for Member 2</p>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
            Owner: Member 2
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Supported Roles</h3>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
              <li><strong className="text-slate-800">Admin:</strong> Full system governance and catalog management</li>
              <li><strong className="text-slate-800">Sales:</strong> Quotations and customer subscription authoring</li>
              <li><strong className="text-slate-800">Finance:</strong> Invoices, tax rates, payment settlements & reports</li>
              <li><strong className="text-slate-800">Customer:</strong> Self-serve portal, invoices & payment history</li>
            </ul>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">API Contracts</h3>
            <ul className="text-xs font-mono text-slate-600 space-y-1.5">
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/auth/register</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/auth/login</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/auth/me</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

