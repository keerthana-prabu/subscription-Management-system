import React, { useState, useEffect, useMemo } from 'react';
import {
  Repeat,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type { SubscriptionPlan, SubscriptionPlanCreatePayload } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton, CardSkeleton } from '../components/common/Skeleton';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
    setIsLoading(true);
    try {
      const remotePlans = await api.subscriptions.getPlans();
      if (Array.isArray(remotePlans) && remotePlans.length > 0) {
        setPlans(remotePlans);
      }
      setBackendIntegrationPending(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 501) {
          setBackendIntegrationPending(true);
        }
      }
    } finally {
      setIsLoading(false);
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
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Subscription Plans & Recurring Billing
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {plans.length} Tiers
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Author recurring billing intervals, commitments, trial durations, and automated renewal policies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreatePlan}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Configure Plan
            </Button>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              Read-only mode (Admin role required to configure plans)
            </div>
          )}
        </div>
      </div>

      {/* Metric summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Tiers</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {plans.filter((p) => p.is_active).length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Monthly Cadence</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">
            {plans.filter((p) => (p.billing_interval || p.billing_cycle) === 'monthly').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Annual Cadence</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">
            {plans.filter((p) => (p.billing_interval || p.billing_cycle) === 'yearly' || p.billing_cycle === 'annual').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Trial Enabled</span>
          <div className="text-lg font-black text-violet-600 mt-0.5">
            {plans.filter((p) => p.trial_period_days && p.trial_period_days > 0).length}
          </div>
        </div>
      </div>

      {/* Backend 501 Integration Notice Banner */}
      {backendIntegrationPending && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-2xs">
          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Backend Integration Pending (HTTP 501)</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Subscription endpoints (/api/v1/subscriptions/plans) are defined in FastAPI schemas and awaiting Member 3 implementation. Client-side state is active for testing.
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search plan name or code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Filters & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Interval Filter */}
          <select
            value={intervalFilter}
            onChange={(e) => {
              setIntervalFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 py-2 px-3 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="all">All Cadences</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly / Annual</option>
          </select>

          {/* Status Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Table / Grid view switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Plans List / Grid */}
      {isLoading ? (
        viewMode === 'grid' ? <CardSkeleton count={3} /> : <TableSkeleton rows={4} cols={5} />
      ) : paginatedPlans.length === 0 ? (
        <EmptyState
          icon={<Repeat className="w-6 h-6" />}
          title="No subscription plans found"
          description="Adjust your search term or cadence filter, or configure a new subscription plan."
          action={
            isAdmin ? (
              <Button size="sm" onClick={handleOpenCreatePlan} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Configure First Plan
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPlans.map((plan) => {
            const priceNum = Number(plan.base_price) || 0;
            const interval = plan.billing_interval || plan.billing_cycle || 'monthly';
            const intervalCount = plan.billing_interval_count || 1;

            return (
              <div
                key={plan.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {plan.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        plan.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${plan.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {plan.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {plan.description || 'No description specified for this subscription tier.'}
                  </p>

                  {/* Pricing Hero Box */}
                  <div className="mt-5 p-4 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-100/80">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-indigo-900 font-mono">
                        ${priceNum.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        / {intervalCount > 1 ? `${intervalCount} ` : ''}{interval}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {plan.trial_period_days && plan.trial_period_days > 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" />
                          {plan.trial_period_days}-Day Trial
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Instant Activation</span>
                      )}
                      <span className="text-slate-400">• Min: {plan.min_quantity || 1} seat(s)</span>
                    </div>
                  </div>

                  {/* Policy Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {plan.auto_renew && (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Auto-Renew
                      </span>
                    )}
                    {plan.pause_allowed && (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Pause Allowed
                      </span>
                    )}
                    {plan.early_close_allowed && (
                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        Early Exit
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPlanForDetail(plan)}
                  >
                    View Terms
                  </Button>
                  {isAdmin && (
                    <div className="flex items-center space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditPlan(plan)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPlanToDelete(plan)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/80 font-bold text-slate-600">
                <tr>
                  <th className="px-5 py-3.5">Subscription Plan</th>
                  <th className="px-4 py-3.5">Billing Cadence</th>
                  <th className="px-4 py-3.5">Recurring Price</th>
                  <th className="px-4 py-3.5">Trial & Commit</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedPlans.map((plan) => {
                  const priceNum = Number(plan.base_price) || 0;
                  const interval = plan.billing_interval || plan.billing_cycle || 'monthly';
                  const intervalCount = plan.billing_interval_count || 1;

                  return (
                    <tr key={plan.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{plan.name}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">{plan.code}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          {intervalCount > 1 ? `${intervalCount} ` : ''}{interval}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        ${priceNum.toFixed(2)} {plan.currency || 'USD'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-semibold">
                          {plan.trial_period_days ? `${plan.trial_period_days} Days Free` : 'No Free Trial'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Min: {plan.min_quantity || 1} seat(s)</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            plan.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              plan.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {plan.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPlanForDetail(plan)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="View Plan Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPlan(plan)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Plan"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlanToDelete(plan)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Plan"
                              >
                                <Trash2 className="w-4 h-4" />
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
      {filteredPlans.length > pageSize && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold">{paginatedPlans.length}</span> of{' '}
            <span className="font-semibold">{filteredPlans.length}</span> plans
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <span className="text-xs font-semibold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      {isPlanModalOpen && (
        <PlanFormModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSubmit={handleSavePlan}
          planToEdit={planToEdit}
        />
      )}

      {selectedPlanForDetail && (
        <PlanDetailModal
          isOpen={Boolean(selectedPlanForDetail)}
          onClose={() => setSelectedPlanForDetail(null)}
          plan={selectedPlanForDetail}
          isAdmin={isAdmin}
          onEdit={(p) => {
            setSelectedPlanForDetail(null);
            handleOpenEditPlan(p);
          }}
        />
      )}

      {planToDelete && (
        <ConfirmDialog
          isOpen={Boolean(planToDelete)}
          title={`Deactivate ${planToDelete.name}?`}
          message={`Are you sure you want to archive plan ${planToDelete.code}? Subscriptions currently enrolled will remain valid until their expiration date.`}
          confirmLabel="Archive Plan"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={handleDeletePlan}
          onCancel={() => setPlanToDelete(null)}
        />
      )}
    </div>
  );
};
