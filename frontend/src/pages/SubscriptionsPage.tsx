import React from 'react';

export const SubscriptionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Subscription Plans & Lifecycle Management</h2>
            <p className="text-xs text-slate-500">Contract designated for Member 3</p>
          </div>
          <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
            Owner: Member 3
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Lifecycle State Machine</h3>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 font-mono">DRAFT</span>
                <span>&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">ACTIVE</span>
                <span>&harr;</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">PAUSED</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">CANCELLED</span>
                <span>or</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-mono">EXPIRED</span>
              </div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">API Contracts</h3>
            <ul className="text-xs font-mono text-slate-600 space-y-1.5">
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/subscriptions/plans</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/subscriptions/plans</li>
              <li><span className="text-blue-600 font-bold">GET</span> /api/v1/subscriptions/subscriptions</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/subscriptions/subscriptions</li>
              <li><span className="text-amber-600 font-bold">POST</span> /api/v1/subscriptions/&#123;id&#125;/pause</li>
              <li><span className="text-emerald-600 font-bold">POST</span> /api/v1/subscriptions/&#123;id&#125;/resume</li>
              <li><span className="text-rose-600 font-bold">POST</span> /api/v1/subscriptions/&#123;id&#125;/cancel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

