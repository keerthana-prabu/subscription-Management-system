import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Grid,
  List as ListIcon,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type { SubscriptionPlan, SubscriptionPlanCreatePayload } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { PlanFormModal } from '../components/subscriptions/PlanFormModal';
import { PlanDetailModal } from '../components/subscriptions/PlanDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Growth SaaS Plan',
    code: 'PLAN-GROWTH-M',
    description: 'Designed for scaling operations with automated recurring invoicing and usage tracking.',
    billing_cycle: 'monthly',
    billing_interval: 'monthly',
    billing_interval_count: 1,
    base_price: 199,
    min_quantity: 1,
    currency: 'USD',
    trial_period_days: 14,
    start_date: '2026-01-01',
    auto_close: true,
    early_close_allowed: true,
    pause_allowed: true,
    auto_renew: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Enterprise Annual Tier',
    code: 'PLAN-ENTERPRISE-Y',
    description: 'Annual corporate subscription with dedicated account manager and 99.99% uptime SLA.',
    billing_cycle: 'annual',
    billing_interval: 'yearly',
    billing_interval_count: 1,
    base_price: 1899,
    min_quantity: 5,
    currency: 'USD',
    trial_period_days: 30,
    start_date: '2026-01-01',
    auto_close: true,
    early_close_allowed: false,
    pause_allowed: true,
    auto_renew: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Micro Sprint Pilot',
    code: 'PLAN-PILOT-W',
    description: 'Weekly sprint pilot plan for temporary evaluation workloads.',
    billing_cycle: 'monthly',
    billing_interval: 'weekly',
    billing_interval_count: 1,
    base_price: 49,
    min_quantity: 1,
    currency: 'USD',
    trial_period_days: 3,
    auto_close: true,
    early_close_allowed: true,
    pause_allowed: false,
    auto_renew: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Plans State
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [backendIntegrationPending, setBackendIntegrationPending] = useState<boolean>(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [intervalFilter, setIntervalFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<SubscriptionPlan | null>(null);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<SubscriptionPlan | null>(null);

  // Destructive action state
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch plans from backend
  const fetchPlans = async () => {
    try {
      const remotePlans = await api.subscriptions.getPlans();
      setPlans(remotePlans);
      setBackendIntegrationPending(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 501) {
          setBackendIntegrationPending(true);
        }
      }
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Filtered & Paginated Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);

      const planInterval = p.billing_interval || p.billing_cycle || 'monthly';
      const matchesInterval = intervalFilter === 'all' || planInterval === intervalFilter;

      return matchesSearch && matchesStatus && matchesInterval;
    });
  }, [plans, searchQuery, statusFilter, intervalFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / pageSize));
  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, currentPage]);

  // Plan Create/Edit Handlers
  const handleOpenCreatePlan = () => {
    setPlanToEdit(null);
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlan = (plan: SubscriptionPlan) => {
    setPlanToEdit(plan);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (payload: SubscriptionPlanCreatePayload) => {
    try {
      if (planToEdit) {
        await api.subscriptions.updatePlan(planToEdit.id, payload).catch((err) => {
          if (err instanceof ApiClientError && err.status === 501) return;
          throw err;
        });

        setPlans((prev) =>
          prev.map((p) =>
            p.id === planToEdit.id
              ? { ...p, ...payload, currency: payload.currency || p.currency, updated_at: new Date().toISOString() }
              : p
          )
        );
        showToast(`Plan "${payload.name}" updated successfully.`, 'success');
      } else {
        const createdId = Date.now();
        await api.subscriptions.createPlan(payload).catch((err) => {
          if (err instanceof ApiClientError && err.status === 501) return;
          throw err;
        });

        const newPlan: SubscriptionPlan = {
          id: createdId,
          ...payload,
          currency: payload.currency || 'USD',
          billing_cycle: payload.billing_cycle || 'monthly',
          trial_period_days: payload.trial_period_days ?? 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPlans((prev) => [newPlan, ...prev]);
        showToast(`Plan "${payload.name}" registered successfully.`, 'success');
      }
      setIsPlanModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save plan';
      showToast(msg, 'error');
    }
  };

  // Delete Plan
  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      await api.subscriptions.deletePlan(planToDelete.id).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      showToast(`Plan "${planToDelete.name}" removed from catalog.`, 'info');
      setPlanToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Subscription Plans & Cadence</h2>
          </div>
          <p className="text-xs text-slate-500">
            Define recurring billing intervals (daily, weekly, monthly, yearly), trial days, pause policies, and auto-close rules.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreatePlan}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Plan
            </Button>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Read-only view
            </div>
          )}
        </div>
      </div>

      {/* Backend Integration Pending Banner */}
      {backendIntegrationPending && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Backend Integration Contract Pending (Member 3):</span>
            <p className="mt-0.5 text-amber-700">
              The API endpoint <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">/api/v1/subscriptions/plans</code> returned HTTP 501. Local interactive mode is active so you can test plan creation, billing intervals, and lifecycle rules in real-time.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchPlans} className="bg-white">
            Retry Sync
          </Button>
        </div>
      )}

      {/* Search, Filter & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search plan by name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setStatusFilter('active');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => {
                setStatusFilter('inactive');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'inactive' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Interval filter */}
          <select
            value={intervalFilter}
            onChange={(e) => {
              setIntervalFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by billing cadence"
            className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Cadences</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card grid view"
              aria-label="Card grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Plan Listing Content */}
      {paginatedPlans.length === 0 ? (
        <EmptyState
          icon={<RefreshCw className="w-6 h-6" />}
          title="No Subscription Plans Found"
          description={
            searchQuery || statusFilter !== 'all' || intervalFilter !== 'all'
              ? 'No subscription plans match your search or cadence filters.'
              : 'No plans exist yet. Click "New Plan" to author your first recurring billing template.'
          }
          action={
            isAdmin && (
              <Button size="sm" onClick={handleOpenCreatePlan} leftIcon={<Plus className="w-4 h-4" />}>
                Create Plan
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPlans.map((plan) => {
            const priceNum = Number(plan.base_price) || 0;
            const cadence = plan.billing_interval || plan.billing_cycle || 'monthly';
            const count = plan.billing_interval_count || 1;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      {plan.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        plan.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <h3
                    onClick={() => setSelectedPlanForDetail(plan)}
                    className="font-bold text-base text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors mb-1"
                  >
                    {plan.name}
                  </h3>

                  <div className="my-3">
                    <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      ${priceNum.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5 font-medium">
                      / {count > 1 ? `${count} ` : ''}{cadence}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {plan.description || 'No promotional description configured.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{plan.trial_period_days ? `${plan.trial_period_days}d Trial` : 'No Trial'}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Min: {plan.min_quantity || 1} units</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedPlanForDetail(plan)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Inspect Rules &rarr;
                    </button>
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditPlan(plan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                          title="Edit plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPlanToDelete(plan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Plan Name</th>
                  <th className="px-4 py-3">Billing Interval</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Min Qty</th>
                  <th className="px-4 py-3 text-center">Trial</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedPlans.map((plan) => {
                  const priceNum = Number(plan.base_price) || 0;
                  const cadence = plan.billing_interval || plan.billing_cycle || 'monthly';
                  const count = plan.billing_interval_count || 1;

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                        {plan.code}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedPlanForDetail(plan)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {plan.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        Every {count > 1 ? `${count} ` : ''}{cadence}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ${priceNum.toFixed(2)} USD
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {plan.min_quantity || 1}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {plan.trial_period_days ? `${plan.trial_period_days} Days` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            plan.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {plan.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedPlanForDetail(plan)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            title="Inspect plan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEditPlan(plan)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                title="Edit plan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setPlanToDelete(plan)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete plan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500">
            Showing Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong> ({filteredPlans.length} total plans)
          </span>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PlanFormModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSubmit={handleSavePlan}
        planToEdit={planToEdit}
      />

      <PlanDetailModal
        isOpen={!!selectedPlanForDetail}
        onClose={() => setSelectedPlanForDetail(null)}
        plan={selectedPlanForDetail}
        isAdmin={isAdmin}
        onEdit={(p) => {
          setSelectedPlanForDetail(null);
          handleOpenEditPlan(p);
        }}
      />

      <ConfirmDialog
        isOpen={!!planToDelete}
        title="Archive Subscription Plan?"
        message={`Are you sure you want to deactivate "${planToDelete?.name}" (${planToDelete?.code})? Active customer subscriptions will remain intact.`}
        confirmLabel="Archive"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeletePlan}
        onCancel={() => setPlanToDelete(null)}
      />
    </div>
  );
};
