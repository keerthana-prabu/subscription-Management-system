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
  Layers,
  PauseCircle,
  PlayCircle,
  UserCheck,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type {
  SubscriptionPlan,
  SubscriptionPlanCreatePayload,
  Subscription,
  SubscriptionCreatePayload,
  Product,
} from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { PlanFormModal } from '../components/subscriptions/PlanFormModal';
import { PlanDetailModal } from '../components/subscriptions/PlanDetailModal';
import { SubscriptionFormModal } from '../components/subscriptions/SubscriptionFormModal';
import { SubscriptionDetailModal } from '../components/subscriptions/SubscriptionDetailModal';
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

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 1,
    subscription_number: 'SUB-2026-0042',
    customer_id: 1,
    customer_name: 'Acme Corporation',
    customer_email: 'billing@acme.com',
    plan_id: 1,
    plan_name: 'Growth SaaS Plan',
    plan_code: 'PLAN-GROWTH-M',
    billing_interval: 'monthly',
    status: 'active',
    start_date: '2026-01-15T00:00:00Z',
    current_period_start: '2026-10-15T00:00:00Z',
    current_period_end: '2026-11-15T00:00:00Z',
    next_billing_date: '2026-11-15',
    auto_renew: true,
    payment_terms: 'Net 30 Invoicing',
    currency: 'USD',
    subtotal: 199,
    tax_total: 19.9,
    total_amount: 218.9,
    items: [
      {
        id: 1,
        subscription_id: 1,
        variant_id: 101,
        product_name: 'Brightloop Analytics Suite',
        variant_name: 'Analytics - Standard Edition',
        sku: 'BL-ANALYTICS-STD',
        quantity: 1,
        unit_price: 199,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    subscription_number: 'SUB-2026-0043',
    customer_id: 2,
    customer_name: 'Wayne Enterprises',
    customer_email: 'finance@wayne.com',
    plan_id: 2,
    plan_name: 'Enterprise Annual Tier',
    plan_code: 'PLAN-ENTERPRISE-Y',
    billing_interval: 'yearly',
    status: 'active',
    start_date: '2026-01-01T00:00:00Z',
    current_period_start: '2026-01-01T00:00:00Z',
    current_period_end: '2027-01-01T00:00:00Z',
    next_billing_date: '2027-01-01',
    auto_renew: true,
    payment_terms: 'Immediate Auto-Charge',
    currency: 'USD',
    subtotal: 1899,
    tax_total: 189.9,
    total_amount: 2088.9,
    items: [
      {
        id: 2,
        subscription_id: 2,
        variant_id: 102,
        product_name: 'Brightloop Analytics Suite',
        variant_name: 'Analytics - Odoo Brand Edition',
        sku: 'BL-ANALYTICS-ODOO',
        quantity: 5,
        unit_price: 680,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    subscription_number: 'SUB-2026-0044',
    customer_id: 3,
    customer_name: 'Cyberdyne Systems',
    customer_email: 'accounts@cyberdyne.io',
    plan_id: 3,
    plan_name: 'Micro Sprint Pilot',
    plan_code: 'PLAN-PILOT-W',
    billing_interval: 'weekly',
    status: 'paused',
    start_date: '2026-09-01T00:00:00Z',
    current_period_start: '2026-10-01T00:00:00Z',
    current_period_end: '2026-10-08T00:00:00Z',
    next_billing_date: 'Paused',
    auto_renew: true,
    payment_terms: 'Due Upon Receipt',
    currency: 'USD',
    subtotal: 49,
    tax_total: 4.9,
    total_amount: 53.9,
    items: [
      {
        id: 3,
        subscription_id: 3,
        variant_id: 201,
        product_name: 'Brightloop Cloud Storage Bucket',
        variant_name: 'Storage - 1TB Tier',
        sku: 'BL-STORAGE-TB',
        quantity: 1,
        unit_price: 49,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    subscription_number: 'SUB-2026-0045',
    customer_id: 4,
    customer_name: 'Brightloop Client Portal',
    customer_email: 'customer@brightloop.io',
    plan_id: 1,
    plan_name: 'Growth SaaS Plan',
    plan_code: 'PLAN-GROWTH-M',
    billing_interval: 'monthly',
    status: 'active',
    start_date: '2026-02-01T00:00:00Z',
    current_period_start: '2026-10-01T00:00:00Z',
    current_period_end: '2026-11-01T00:00:00Z',
    next_billing_date: '2026-11-01',
    auto_renew: true,
    payment_terms: 'Immediate Auto-Charge',
    currency: 'USD',
    subtotal: 199,
    tax_total: 19.9,
    total_amount: 218.9,
    items: [
      {
        id: 4,
        subscription_id: 4,
        variant_id: 101,
        product_name: 'Brightloop Analytics Suite',
        variant_name: 'Analytics - Standard Edition',
        sku: 'BL-ANALYTICS-STD',
        quantity: 1,
        unit_price: 199,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === 'admin';
  const isSales = user?.role === 'sales';
  const isCustomer = user?.role === 'customer';
  const isAdminOrSales = isAdmin || isSales;

  // Sub-view tab
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'plans'>(
    isCustomer ? 'subscriptions' : 'subscriptions'
  );

  // State
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(INITIAL_PLANS);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendIntegrationPending, setBackendIntegrationPending] = useState<boolean>(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [intervalFilter, setIntervalFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<SubscriptionPlan | null>(null);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<SubscriptionPlan | null>(null);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedSubscriptionForDetail, setSelectedSubscriptionForDetail] = useState<Subscription | null>(null);

  // Deletion modal state
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch plans
      const remotePlans = await api.subscriptions.getPlans().catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          setBackendIntegrationPending(true);
        }
        return [];
      });
      if (Array.isArray(remotePlans) && remotePlans.length > 0) {
        setPlans(remotePlans);
      }

      // 2. Fetch subscriptions
      const remoteSubs = await api.subscriptions.getSubscriptions().catch(() => []);
      if (Array.isArray(remoteSubs) && remoteSubs.length > 0) {
        setSubscriptions(remoteSubs);
      }

      // 3. Fetch products
      const remoteProducts = await api.catalog.getProducts().catch(() => []);
      if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
        setProducts(remoteProducts);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Subscriptions based on role and search
  const visibleSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // 1. Customer Role Isolation: Show only customer's own subscriptions
      if (isCustomer && user) {
        const matchesUser =
          sub.customer_id === user.id ||
          (user.email && sub.customer_email?.toLowerCase() === user.email.toLowerCase());
        if (!matchesUser) return false;
      }

      // 2. Search Query
      const matchesSearch =
        (sub.subscription_number && sub.subscription_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.customer_name && sub.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (sub.plan_name && sub.plan_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 3. Status Filter
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, isCustomer, user, searchQuery, statusFilter]);

  const totalSubPages = Math.max(1, Math.ceil(visibleSubscriptions.length / pageSize));
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleSubscriptions.slice(start, start + pageSize);
  }, [visibleSubscriptions, currentPage]);

  // Plans Filter
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());

      const planInterval = p.billing_interval || p.billing_cycle || 'monthly';
      const matchesInterval = intervalFilter === 'all' || planInterval === intervalFilter;

      return matchesSearch && matchesInterval;
    });
  }, [plans, searchQuery, intervalFilter]);

  // Lifecycle action handlers
  const handlePauseSubscription = async (sub: Subscription, reason: string) => {
    try {
      await api.subscriptions.pauseSubscription(sub.id, { reason }).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: 'paused',
                paused_at: new Date().toISOString(),
                next_billing_date: 'Suspended (Paused)',
                updated_at: new Date().toISOString(),
              }
            : s
        )
      );

      showToast(`Subscription ${sub.subscription_number || sub.id} paused.`, 'warning');
      setSelectedSubscriptionForDetail(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pause failed';
      showToast(msg, 'error');
    }
  };

  const handleResumeSubscription = async (sub: Subscription) => {
    try {
      await api.subscriptions.resumeSubscription(sub.id).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: 'active',
                paused_at: undefined,
                next_billing_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
              }
            : s
        )
      );

      showToast(`Subscription ${sub.subscription_number || sub.id} resumed.`, 'success');
      setSelectedSubscriptionForDetail(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resume failed';
      showToast(msg, 'error');
    }
  };

  const handleCancelSubscription = async (sub: Subscription, reason: string) => {
    try {
      await api.subscriptions.cancelSubscription(sub.id, { reason }).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : s
        )
      );

      showToast(`Subscription ${sub.subscription_number || sub.id} cancelled.`, 'info');
      setSelectedSubscriptionForDetail(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancel failed';
      showToast(msg, 'error');
    }
  };

  const handleRenewSubscription = async (sub: Subscription) => {
    const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === sub.id
          ? {
              ...s,
              current_period_end: nextYear,
              next_billing_date: nextYear,
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );
    showToast(`Subscription ${sub.subscription_number || sub.id} term renewed successfully.`, 'success');
    setSelectedSubscriptionForDetail(null);
  };

  const handleActivateSubscription = async (sub: Subscription) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === sub.id
          ? {
              ...s,
              status: 'active',
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );
    showToast(`Subscription ${sub.subscription_number || sub.id} activated!`, 'success');
    setSelectedSubscriptionForDetail(null);
  };

  const handleCreateSubscription = async (payload: SubscriptionCreatePayload) => {
    try {
      await api.subscriptions.createSubscription(payload).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      const plan = plans.find((p) => p.id === payload.plan_id);
      const nextNum = `SUB-2026-00${subscriptions.length + 46}`;

      const newSub: Subscription = {
        id: Date.now(),
        subscription_number: nextNum,
        customer_id: payload.customer_id,
        customer_name: payload.customer_name || 'Customer Account',
        customer_email: payload.customer_email || 'client@brightloop.io',
        plan_id: payload.plan_id,
        plan_name: plan?.name || 'Growth Plan',
        plan_code: plan?.code || 'PLAN-GROWTH',
        billing_interval: plan?.billing_interval || 'monthly',
        status: 'active',
        start_date: payload.start_date || new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        auto_renew: payload.auto_renew ?? true,
        payment_terms: payload.payment_terms || 'Net 30 Invoicing',
        currency: 'USD',
        subtotal: Number(plan?.base_price) || 199,
        tax_total: (Number(plan?.base_price) || 199) * 0.1,
        total_amount: (Number(plan?.base_price) || 199) * 1.1,
        items: payload.items?.map((it, idx) => ({
          id: Date.now() + idx,
          subscription_id: Date.now(),
          variant_id: it.variant_id,
          product_name: it.product_name || 'Analytics Seat',
          variant_name: it.variant_name,
          sku: it.sku || 'SKU-STD',
          quantity: it.quantity,
          unit_price: it.unit_price || 120,
        })) || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSubscriptions((prev) => [newSub, ...prev]);
      showToast(`Subscription ${nextNum} provisioned successfully!`, 'success');
      setIsSubscriptionModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create subscription';
      showToast(msg, 'error');
    }
  };

  // Plan creation from Phase 2
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
        showToast(`Plan "${payload.name}" created successfully.`, 'success');
      }
      setIsPlanModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save plan';
      showToast(msg, 'error');
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setIsDeletingPlan(true);
    try {
      await api.subscriptions.deletePlan(planToDelete.id).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      showToast(`Plan "${planToDelete.name}" archived.`, 'info');
      setPlanToDelete(null);
    } finally {
      setIsDeletingPlan(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {isCustomer ? 'My Subscriptions & Billing Portal' : 'Subscriptions & Customer Lifecycle'}
              </h2>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                {visibleSubscriptions.length} Contracts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCustomer
                ? 'Manage active subscriptions, view next billing schedules, and access self-service lifecycle actions.'
                : 'Manage customer subscription agreements, automated recurring schedules, pause/renew lifecycles, and catalog plans.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {isAdminOrSales && (
            <>
              {activeTab === 'plans' ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setPlanToEdit(null);
                    setIsPlanModalOpen(true);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Configure Plan
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Provision Subscription
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Customer Portal Banner if logged in as customer */}
      {isCustomer && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <UserCheck className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Customer Portal Active:</strong> Displaying only subscriptions associated with{' '}
              <code className="bg-white px-2 py-0.5 rounded font-mono text-indigo-700">{user?.email}</code>.
            </span>
          </div>
          <span className="text-[10px] font-bold text-indigo-700 uppercase bg-white px-2 py-0.5 rounded-full border border-indigo-200">
            Personal Account
          </span>
        </div>
      )}

      {/* KPI Metric Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            {isCustomer ? 'My Subscriptions' : 'Total Contracts'}
          </span>
          <div className="text-lg font-black text-slate-900 mt-0.5">{visibleSubscriptions.length}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Active Status
          </span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">
            {visibleSubscriptions.filter((s) => s.status === 'active').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Paused / On Hold
          </span>
          <div className="text-lg font-black text-amber-600 mt-0.5">
            {visibleSubscriptions.filter((s) => s.status === 'paused').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Catalog Plans
          </span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">{plans.length} Tiers</div>
        </div>
      </div>

      {/* Backend 501 Notice */}
      {backendIntegrationPending && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-2xs">
          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Subscription Endpoints Contract Notice (HTTP 501)</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Subscription lifecycle endpoints (/api/v1/subscriptions) are defined in FastAPI schemas and awaiting Member 3 database persistence. All state machine transitions (Draft &rarr; Active &rarr; Paused &rarr; Cancelled) operate with client-side reactivity.
            </p>
          </div>
        </div>
      )}

      {/* Sub-view Navigation Tabs */}
      {!isCustomer && (
        <div className="flex border-b border-slate-200/80 text-xs font-bold gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'subscriptions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>Active Contracts ({visibleSubscriptions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'plans'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subscription Plans ({plans.length})</span>
          </button>
        </div>
      )}

      {/* VIEW: SUBSCRIPTIONS CONTRACTS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by sub #, customer, plan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <select
                value={intervalFilter}
                onChange={(e) => {
                  setIntervalFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs rounded-xl border border-slate-300 py-1.5 px-3 text-slate-700 bg-white focus:outline-none"
              >
                <option value="all">All Cadences</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {(['all', 'active', 'paused', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                      statusFilter === s
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex p-1 bg-slate-100 rounded-xl">
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
              </div>
            </div>
          </div>

          {/* Table / Cards List */}
          {isLoading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : paginatedSubscriptions.length === 0 ? (
            <EmptyState
              icon={<Repeat className="w-6 h-6" />}
              title="No subscriptions found"
              description={
                isCustomer
                  ? 'You currently do not have any active subscriptions registered to your account.'
                  : 'Provision a new customer subscription or convert a quotation proposal to activate a contract.'
              }
              action={
                isAdminOrSales ? (
                  <Button
                    size="sm"
                    onClick={() => setIsSubscriptionModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Provision Subscription
                  </Button>
                ) : undefined
              }
            />
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50/80 font-bold text-slate-600">
                    <tr>
                      <th className="px-5 py-3.5">Subscription #</th>
                      <th className="px-4 py-3.5">Customer Account</th>
                      <th className="px-4 py-3.5">Plan & Cadence</th>
                      <th className="px-4 py-3.5">Next Billing</th>
                      <th className="px-4 py-3.5">Recurring Total</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {sub.subscription_number || `SUB-2026-00${sub.id}`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {sub.payment_terms || 'Net 30'}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800">{sub.customer_name || 'Customer'}</div>
                          <div className="text-[11px] text-slate-500">{sub.customer_email || 'client@brightloop.io'}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800">{sub.plan_name || 'Standard Tier'}</div>
                          <span className="capitalize text-slate-500 text-[11px]">
                            {sub.billing_interval || 'monthly'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-700">
                            {sub.next_billing_date || sub.current_period_end.split('T')[0]}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                          ${Number(sub.total_amount || 199).toFixed(2)} {sub.currency || 'USD'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                              sub.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : sub.status === 'paused'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sub.status === 'active'
                                  ? 'bg-emerald-500'
                                  : sub.status === 'paused'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSubscriptionForDetail(sub)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                              title="Inspect Subscription Details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            {sub.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handlePauseSubscription(sub, 'Temporary pause')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Pause Subscription"
                              >
                                <PauseCircle className="w-4 h-4" />
                              </button>
                            )}
                            {sub.status === 'paused' && (
                              <button
                                type="button"
                                onClick={() => handleResumeSubscription(sub)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Resume Subscription"
                              >
                                <PlayCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {sub.subscription_number || `SUB-2026-00${sub.id}`}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          sub.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.status === 'paused'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sub.status === 'active'
                              ? 'bg-emerald-500'
                              : sub.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        {sub.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {sub.plan_name || 'Standard Plan'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer: <strong className="text-slate-800">{sub.customer_name || 'Client'}</strong>
                    </p>

                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Recurring Total</span>
                        <div className="text-base font-black text-slate-900 font-mono">
                          ${Number(sub.total_amount || 199).toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Next Invoicing</span>
                        <div className="text-xs font-semibold text-slate-700">
                          {sub.next_billing_date || sub.current_period_end.split('T')[0]}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubscriptionForDetail(sub)}
                    >
                      Lifecycle Details
                    </Button>

                    <div className="flex items-center space-x-1.5">
                      {sub.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handlePauseSubscription(sub, 'Customer requested pause')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                          title="Pause Subscription"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}
                      {sub.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleResumeSubscription(sub)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Resume Subscription"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {visibleSubscriptions.length > pageSize && (
            <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold">{paginatedSubscriptions.length}</span> of{' '}
                <span className="font-semibold">{visibleSubscriptions.length}</span> subscriptions
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
                  Page {currentPage} of {totalSubPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalSubPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalSubPages, p + 1))}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: SUBSCRIPTION PLANS (Phase 2 feature preserved) */}
      {activeTab === 'plans' && !isCustomer && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPlans.map((plan) => {
              const priceNum = Number(plan.base_price) || 0;
              const interval = plan.billing_interval || plan.billing_cycle || 'monthly';
              const intervalCount = plan.billing_interval_count || 1;

              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-6 flex flex-col justify-between"
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
                        {plan.is_active ? 'Active' : 'Archived'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {plan.description || 'Standard plan terms.'}
                    </p>

                    <div className="mt-5 p-4 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-100/80">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-indigo-900 font-mono">
                          ${priceNum.toFixed(2)}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          / {intervalCount > 1 ? `${intervalCount} ` : ''}{interval}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Commitment: {plan.min_quantity || 1} seat(s) • Trial: {plan.trial_period_days || 0} days
                      </div>
                    </div>
                  </div>

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
                          onClick={() => {
                            setPlanToEdit(plan);
                            setIsPlanModalOpen(true);
                          }}
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => setPlanToDelete(plan)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
        </div>
      )}

      {/* Modals */}
      {isSubscriptionModalOpen && (
        <SubscriptionFormModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          onSubmit={handleCreateSubscription}
          plans={plans}
          products={products}
        />
      )}

      {selectedSubscriptionForDetail && (
        <SubscriptionDetailModal
          isOpen={Boolean(selectedSubscriptionForDetail)}
          onClose={() => setSelectedSubscriptionForDetail(null)}
          subscription={selectedSubscriptionForDetail}
          userRole={user?.role}
          onPause={handlePauseSubscription}
          onResume={handleResumeSubscription}
          onCancel={handleCancelSubscription}
          onRenew={handleRenewSubscription}
          onActivate={handleActivateSubscription}
        />
      )}

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
            setPlanToEdit(p);
            setIsPlanModalOpen(true);
          }}
        />
      )}

      {planToDelete && (
        <ConfirmDialog
          isOpen={Boolean(planToDelete)}
          title={`Archive Plan ${planToDelete.name}?`}
          message={`Deactivate subscription plan ${planToDelete.code}? Existing active customer contracts will continue according to their terms.`}
          confirmLabel="Archive Plan"
          isDestructive={true}
          isLoading={isDeletingPlan}
          onConfirm={handleDeletePlan}
          onCancel={() => setPlanToDelete(null)}
        />
      )}
    </div>
  );
};
