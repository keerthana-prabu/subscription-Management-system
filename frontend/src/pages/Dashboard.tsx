import React from 'react';
import type { HealthResponse } from '../api/types';

interface DashboardProps {
  health: HealthResponse | null;
  error: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ health, error }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Brightloop Subscription Management System
        </h2>
        <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
          Initial project scaffolding, modular developer structure, shared API contracts, and database entity relationships are configured. The four team members can develop simultaneously without code collisions.
        </p>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            <span className="font-semibold">Backend Connection Note:</span> {error}
            <p className="text-xs text-rose-600 mt-1">
              Ensure the FastAPI backend is running via <code className="bg-rose-100 px-1 py-0.5 rounded">uvicorn app.main:app --reload</code> on port 8000.
            </p>
          </div>
        )}

        {health && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span className="font-semibold">Live Backend Connection Verified</span>
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div><span className="text-emerald-600">Service:</span> {health.service}</div>
              <div><span className="text-emerald-600">Version:</span> {health.version}</div>
              <div><span className="text-emerald-600">Environment:</span> {health.environment}</div>
              <div><span className="text-emerald-600">Time:</span> {new Date(health.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Developer Domain Ownership Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Member 1: Frontend Development</h3>
            <span className="px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 font-medium">UI / Client</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Owns React/Vite/Tailwind UI components, navigation, form validations, state management, and API consumption.
          </p>
          <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
            frontend/src/pages/*, frontend/src/components/*
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Member 2: Auth & Catalog</h3>
            <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700 font-medium">Core Catalog</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Owns User/Role auth, JWT issue/validation, products, variants, SKUs, and quotation templates.
          </p>
          <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
            backend/app/models/catalog.py, app/api/v1/endpoints/auth.py, catalog.py
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Member 3: Subscriptions & Billing</h3>
            <span className="px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700 font-medium">Recurring Engine</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Owns subscription plans, subscription lifecycle (pause/cancel/resume), recurring invoices, tax rates, and discounts.
          </p>
          <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
            backend/app/models/subscription.py, billing.py, app/api/v1/endpoints/subscriptions.py
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Member 4: Payments & Reports</h3>
            <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 font-medium">Settlement & Tests</span>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Owns payment execution, refunds, financial aggregations (MRR/ARR), revenue reports, and backend test suites.
          </p>
          <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-slate-700">
            backend/app/models/payment.py, endpoints/payments.py, reports.py, app/tests/*
          </div>
        </div>
      </div>
    </div>
  );
};
