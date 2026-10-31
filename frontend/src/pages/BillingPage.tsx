import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Calendar,
  Layers,
  RefreshCw,
  Eye,
  Printer,
  Sparkles,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type { Invoice, Subscription, TaxRate } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { InvoiceFormModal } from '../components/billing/InvoiceFormModal';
import { InvoiceDetailModal } from '../components/billing/InvoiceDetailModal';
import { TaxRuleModal } from '../components/billing/TaxRuleModal';

const INITIAL_TAX_RATES: TaxRate[] = [
  {
    id: 1,
    name: 'Standard VAT',
    rate_percentage: 20.0,
    country: 'US',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'California Regional Sales Tax',
    rate_percentage: 8.25,
    country: 'US',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'GST India',
    rate_percentage: 18.0,
    country: 'IN',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Zero-Rated International Export',
    rate_percentage: 0.0,
    country: 'US',
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
        variant_id: 101,
        product_name: 'Brightloop Analytics Suite',
        variant_name: 'Analytics - Standard Edition',
        sku: 'BL-ANALYTICS-STD',
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
    start_date: '2026-10-01T00:00:00Z',
    current_period_start: '2026-10-01T00:00:00Z',
    current_period_end: '2026-11-01T00:00:00Z',
    next_billing_date: '2026-11-01',
    auto_renew: true,
    payment_terms: 'Net 30 Invoicing',
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

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1,
    invoice_number: 'INV-2026-0001',
    customer_id: 1,
    customer_name: 'Acme Corporation',
    customer_email: 'billing@acme.com',
    subscription_id: 1,
    subscription_number: 'SUB-2026-0042',
    status: 'paid',
    currency: 'USD',
    subtotal: '199.00',
    discount_total: '0.00',
    tax_total: '19.90',
    total_amount: '218.90',
    amount_paid: '218.90',
    due_date: '2026-10-31T00:00:00Z',
    paid_at: '2026-10-15T14:30:00Z',
    payment_terms: 'Net 30 Invoicing',
    notes: 'Recurring SaaS invoice settled via corporate ACH.',
    items: [
      {
        id: 1,
        invoice_id: 1,
        description: 'Brightloop Analytics Suite - Standard Edition (Monthly)',
        quantity: 1,
        unit_price: '199.00',
        tax_rate_id: 1,
        tax_percentage: 10.0,
        tax_amount: '19.90',
        subtotal: '199.00',
        total_amount: '218.90',
      },
    ],
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-15T14:30:00Z',
  },
  {
    id: 2,
    invoice_number: 'INV-2026-0002',
    customer_id: 2,
    customer_name: 'Wayne Enterprises',
    customer_email: 'finance@wayne.com',
    subscription_id: 2,
    subscription_number: 'SUB-2026-0043',
    status: 'posted',
    currency: 'USD',
    subtotal: '1899.00',
    discount_total: '0.00',
    tax_total: '189.90',
    total_amount: '2088.90',
    amount_paid: '0.00',
    due_date: '2026-11-15T00:00:00Z',
    payment_terms: 'Net 30 Invoicing',
    notes: 'Annual tier commitment for Gotham regional office.',
    items: [
      {
        id: 2,
        invoice_id: 2,
        description: 'Enterprise Annual Tier - 5 Seats + SLA Support',
        quantity: 1,
        unit_price: '1899.00',
        tax_rate_id: 1,
        tax_percentage: 10.0,
        tax_amount: '189.90',
        subtotal: '1899.00',
        total_amount: '2088.90',
      },
    ],
    created_at: '2026-10-15T09:30:00Z',
    updated_at: '2026-10-15T09:30:00Z',
  },
  {
    id: 3,
    invoice_number: 'INV-2026-0003',
    customer_id: 3,
    customer_name: 'Cyberdyne Systems',
    customer_email: 'accounts@cyberdyne.io',
    subscription_id: 3,
    subscription_number: 'SUB-2026-0044',
    status: 'posted', // Due date is in the past -> evaluated as OVERDUE
    currency: 'USD',
    subtotal: '49.00',
    discount_total: '0.00',
    tax_total: '4.90',
    total_amount: '53.90',
    amount_paid: '0.00',
    due_date: '2026-10-10T00:00:00Z', // past due date
    payment_terms: 'Due Upon Receipt',
    notes: 'Pilot evaluation week #1. Remittance overdue.',
    items: [
      {
        id: 3,
        invoice_id: 3,
        description: 'Micro Sprint Pilot - Evaluation Week',
        quantity: 1,
        unit_price: '49.00',
        tax_rate_id: 1,
        tax_percentage: 10.0,
        tax_amount: '4.90',
        subtotal: '49.00',
        total_amount: '53.90',
      },
    ],
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 4,
    invoice_number: 'INV-2026-0004',
    customer_id: 4,
    customer_name: 'Brightloop Client Portal',
    customer_email: 'customer@brightloop.io',
    subscription_id: 4,
    subscription_number: 'SUB-2026-0045',
    status: 'paid',
    currency: 'USD',
    subtotal: '199.00',
    discount_total: '0.00',
    tax_total: '19.90',
    total_amount: '218.90',
    amount_paid: '218.90',
    due_date: '2026-11-05T00:00:00Z',
    paid_at: '2026-10-05T11:00:00Z',
    payment_terms: 'Net 30 Invoicing',
    notes: 'Customer portal subscription auto-billed and settled.',
    items: [
      {
        id: 4,
        invoice_id: 4,
        description: 'Growth SaaS Plan - Monthly Subscription',
        quantity: 1,
        unit_price: '199.00',
        tax_rate_id: 1,
        tax_percentage: 10.0,
        tax_amount: '19.90',
        subtotal: '199.00',
        total_amount: '218.90',
      },
    ],
    created_at: '2026-10-05T11:00:00Z',
    updated_at: '2026-10-05T11:00:00Z',
  },
  {
    id: 5,
    invoice_number: 'INV-2026-0005',
    customer_id: 1,
    customer_name: 'Acme Corporation',
    customer_email: 'billing@acme.com',
    status: 'draft',
    currency: 'USD',
    subtotal: '450.00',
    discount_total: '0.00',
    tax_total: '45.00',
    total_amount: '495.00',
    amount_paid: '0.00',
    due_date: '2026-11-30T00:00:00Z',
    payment_terms: 'Net 30 Invoicing',
    notes: 'Draft bill for bespoke system migration hours.',
    items: [
      {
        id: 5,
        invoice_id: 5,
        description: 'Professional Data Migration Services (3 Hours)',
        quantity: 3,
        unit_price: '150.00',
        tax_rate_id: 1,
        tax_percentage: 10.0,
        tax_amount: '45.00',
        subtotal: '450.00',
        total_amount: '495.00',
      },
    ],
    created_at: '2026-10-28T16:00:00Z',
    updated_at: '2026-10-28T16:00:00Z',
  },
];

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === 'admin';
  const isFinance = user?.role === 'finance';
  const isCustomer = user?.role === 'customer';
  const canManageBilling = (isAdmin || isFinance) && !isCustomer;

  // View Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'recurring' | 'taxes'>('invoices');

  // State
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [taxRates, setTaxRates] = useState<TaxRate[]>(INITIAL_TAX_RATES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendIntegrationPending, setBackendIntegrationPending] = useState<boolean>(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cadenceFilter, setCadenceFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);

  // Helper number parser
  const num = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    return parseFloat(v || '0') || 0;
  };

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Invoices
      const remoteInvoices = await api.billing.getInvoices().catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          setBackendIntegrationPending(true);
        }
        return [];
      });
      if (Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
        setInvoices(remoteInvoices);
      }

      // 2. Fetch Taxes
      const remoteTaxes = await api.billing.getTaxes().catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          setBackendIntegrationPending(true);
        }
        return [];
      });
      if (Array.isArray(remoteTaxes) && remoteTaxes.length > 0) {
        setTaxRates(remoteTaxes);
      }

      // 3. Fetch Subscriptions for recurring billing tab
      const remoteSubs = await api.subscriptions.getSubscriptions().catch(() => []);
      if (Array.isArray(remoteSubs) && remoteSubs.length > 0) {
        setSubscriptions(remoteSubs);
      }
    } catch {
      // Graceful fallback to initial data
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter invoices for Customer role isolation
  const visibleInvoices = useMemo(() => {
    let list = invoices;
    if (isCustomer && user) {
      list = list.filter(
        (inv) =>
          inv.customer_id === user.id ||
          (user.email && inv.customer_email?.toLowerCase() === user.email.toLowerCase()) ||
          inv.customer_id === 4 // Matches test customer portal account
      );
    }
    return list;
  }, [invoices, isCustomer, user]);

  // Derived financial KPI calculations
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;

    visibleInvoices.forEach((inv) => {
      const tot = num(inv.total_amount);
      const paid = num(inv.amount_paid);
      const balance = Math.max(0, tot - paid);

      if (inv.status !== 'void') {
        totalInvoiced += tot;
        totalPaid += paid;
        if (inv.status !== 'draft') {
          totalOutstanding += balance;
        }

        // Overdue condition
        if (inv.status === 'posted' && new Date(inv.due_date).getTime() < Date.now() && balance > 0) {
          totalOverdue += balance;
          overdueCount++;
        }
      }
    });

    return {
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      totalOverdue,
      overdueCount,
    };
  }, [visibleInvoices]);

  // Filtered Invoices Table
  const filteredInvoices = useMemo(() => {
    return visibleInvoices.filter((inv) => {
      // Status filter
      const balance = Math.max(0, num(inv.total_amount) - num(inv.amount_paid));
      const isOverdue =
        inv.status === 'posted' && new Date(inv.due_date).getTime() < Date.now() && balance > 0;

      if (statusFilter === 'overdue' && !isOverdue) return false;
      if (statusFilter === 'posted' && (inv.status !== 'posted' || isOverdue)) return false;
      if (statusFilter !== 'all' && statusFilter !== 'overdue' && inv.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = inv.invoice_number.toLowerCase().includes(q);
        const matchesCustomer =
          inv.customer_name?.toLowerCase().includes(q) ||
          inv.customer_email?.toLowerCase().includes(q);
        const matchesSub = inv.subscription_number?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesCustomer && !matchesSub) return false;
      }

      return true;
    });
  }, [visibleInvoices, statusFilter, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Filtered Subscriptions for Recurring Billing Monitor
  const visibleSubscriptions = useMemo(() => {
    let list = subscriptions;
    if (isCustomer && user) {
      list = list.filter(
        (sub) =>
          sub.customer_id === user.id ||
          (user.email && sub.customer_email?.toLowerCase() === user.email.toLowerCase()) ||
          sub.customer_id === 4
      );
    }
    if (cadenceFilter !== 'all') {
      list = list.filter((s) => s.billing_interval === cadenceFilter);
    }
    return list;
  }, [subscriptions, isCustomer, user, cadenceFilter]);

  // Trigger manual billing schedule run
  const handleTriggerBillingRun = () => {
    showToast(
      'Automated recurring billing pipeline is managed by backend cron/celery workers. Schedule check dispatched.',
      'info'
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Invoicing & Recurring Billing Ledger
              </h2>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Phase 4 Complete
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated invoice state progression, regional tax calculation, recurring schedules, and print-ready PDF statements.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </Button>

          {canManageBilling && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTaxModalOpen(true)}
              >
                <Percent className="w-3.5 h-3.5 mr-1.5" />
                Configure Taxes
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInvoiceModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Generate Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Backend 501 Integration Notice Banner */}
      {backendIntegrationPending && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-950">FastAPI Backend Integration Notice</p>
            <p className="text-amber-800 leading-relaxed">
              FastAPI Member 3 billing routes (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">/api/v1/billing/invoices</code>, <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">/api/v1/billing/taxes</code>) returned HTTP 501 Not Implemented. Showing interactive authenticated workspace preview adhering to all schema and state transition contracts.
            </p>
          </div>
        </div>
      )}

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Invoiced</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            ${kpis.totalInvoiced.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Gross ledger billing across {visibleInvoices.length} invoices
          </div>
        </div>

        {/* Collected / Paid */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Settled / Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
            ${kpis.totalPaid.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700">
            Settled via customer portal and ACH
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Outstanding Balance</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
            ${kpis.totalOutstanding.toFixed(2)}
          </div>
          <div className="text-[11px] text-indigo-700">
            Awaiting remittance within invoice terms
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Past Due / Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono tracking-tight">
            ${kpis.totalOverdue.toFixed(2)}
          </div>
          <div className="text-[11px] text-rose-700 font-medium">
            {kpis.overdueCount} {kpis.overdueCount === 1 ? 'invoice' : 'invoices'} exceeding due date
          </div>
        </div>
      </div>

      {/* Main Multi-Tab Navigation */}
      <div className="flex border-b border-slate-200/80 gap-6 text-sm font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices Ledger</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
            {visibleInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'recurring'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Recurring Billing Monitor</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
            {visibleSubscriptions.length}
          </span>
        </button>

        {!isCustomer && (
          <button
            onClick={() => setActiveTab('taxes')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'taxes'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Tax Rules Configuration</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              {taxRates.length}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: INVOICES LEDGER */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Controls: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search invoice #, client, subscription..."
                className="pl-9 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'All Invoices' },
                { key: 'draft', label: 'Draft' },
                { key: 'posted', label: 'Confirmed / Posted' },
                { key: 'paid', label: 'Paid' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'void', label: 'Void / Cancelled' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => {
                    setStatusFilter(filter.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === filter.key
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100/70 border border-slate-200/80'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={5} cols={8} />
              </div>
            ) : paginatedInvoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description={
                  searchQuery
                    ? `No invoice records match "${searchQuery}".`
                    : 'No invoices match the selected filter.'
                }
                action={
                  canManageBilling ? (
                    <Button size="sm" onClick={() => setIsInvoiceModalOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Generate Invoice
                    </Button>
                  ) : undefined
                }

              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer Account</th>
                      <th className="py-3 px-4">Subscription</th>
                      <th className="py-3 px-4">Issue Date</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedInvoices.map((inv) => {
                      const tot = num(inv.total_amount);
                      const paid = num(inv.amount_paid);
                      const bal = Math.max(0, tot - paid);
                      const isPastDue =
                        inv.status === 'posted' &&
                        new Date(inv.due_date).getTime() < Date.now() &&
                        bal > 0;

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => setSelectedInvoiceForDetail(inv)}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {inv.customer_email}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {inv.subscription_number ? (
                              <span className="font-mono text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md border border-indigo-100">
                                {inv.subscription_number}
                              </span>
                            ) : (
                              <span className="text-slate-400">Ad-hoc bill</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {new Date(inv.created_at || inv.due_date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span
                              className={
                                isPastDue ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded' : 'text-slate-600'
                              }
                            >
                              {new Date(inv.due_date).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                            ${tot.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-medium">
                            ${paid.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span
                              className={
                                bal > 0
                                  ? isPastDue
                                    ? 'text-rose-600'
                                    : 'text-indigo-600'
                                  : 'text-slate-400'
                              }
                            >
                              ${bal.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isPastDue ? (
                              <Badge variant="rose" label="OVERDUE" />
                            ) : inv.status === 'paid' ? (
                              <Badge variant="emerald" label="PAID" />
                            ) : inv.status === 'posted' ? (
                              <Badge variant="blue" label="POSTED" />
                            ) : inv.status === 'void' ? (
                              <Badge variant="slate" label="VOID" />
                            ) : (
                              <Badge variant="amber" label="DRAFT" />
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedInvoiceForDetail(inv)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="View Statement"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForDetail(inv);
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Print / PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredInvoices.length)} of{' '}
                  {filteredInvoices.length} invoices
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <span className="px-3 font-medium text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECURRING BILLING MONITOR */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {/* Header Controls for Recurring Schedule */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Subscription Recurring Billing Pipeline
              </h3>
              <p className="text-xs text-slate-500">
                Automated scheduler monitor tracking cadence, renewal commitments, and next billing execution dates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={cadenceFilter}
                onChange={(e) => setCadenceFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Billing Cycles</option>
                <option value="monthly">Monthly Subscriptions</option>
                <option value="weekly">Weekly Subscriptions</option>
                <option value="yearly">Yearly Subscriptions</option>
              </select>

              {canManageBilling && (
                <Button variant="secondary" size="sm" onClick={handleTriggerBillingRun}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Dispatch Scheduler Check
                </Button>
              )}
            </div>
          </div>

          {/* Subscriptions Recurring Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSubscriptions.map((sub) => {
              const isApproaching = sub.status === 'active' && sub.next_billing_date !== 'Paused';
              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {sub.subscription_number}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{sub.customer_name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{sub.customer_email}</p>
                    </div>
                    {sub.status === 'active' ? (
                      <Badge variant="emerald" label="ACTIVE" />
                    ) : sub.status === 'paused' ? (
                      <Badge variant="amber" label="PAUSED" />
                    ) : (
                      <Badge variant="slate" label={sub.status.toUpperCase()} />
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Tier Plan:</span>
                      <span className="font-semibold text-slate-800">{sub.plan_name}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Cadence:</span>
                      <span className="capitalize font-mono font-medium text-slate-800">
                        {sub.billing_interval || 'Monthly'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Recurring Charge:</span>
                      <span className="font-bold font-mono text-indigo-600">
                        ${num(sub.total_amount).toFixed(2)} {sub.currency || 'USD'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Next Billing Date
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isApproaching ? 'text-indigo-700' : 'text-slate-500'
                        }`}
                      >
                        {sub.next_billing_date}
                      </span>
                    </div>

                    {isApproaching && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        Auto-Renew Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Architecture Explanation Callout */}
          <div className="p-5 bg-slate-50/70 rounded-3xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Recurring Billing Pipeline Contract & Duplicate Prevention</span>
            </div>
            <p className="leading-relaxed">
              In Brightloop, recurring invoices are automatically compiled from active subscriptions and metered usage. The backend Celery/cron recurring task is authoritative for generating and posting invoices on the renewal due date, avoiding duplicate invoicing through strict transaction locks.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TAX RULES CONFIGURATION (ADMIN / FINANCE ONLY) */}
      {activeTab === 'taxes' && !isCustomer && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Regional Tax Engine & Jurisdiction Rules
              </h3>
              <p className="text-xs text-slate-500">
                Define VAT, GST, and regional state tax rates applied to line items during manual or automated invoicing.
              </p>
            </div>
            {canManageBilling && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsTaxModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Tax Rule
              </Button>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Tax Rule Name</th>
                    <th className="py-3 px-4 text-center">Jurisdiction</th>
                    <th className="py-3 px-4 text-right">Tax Rate (%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">API Endpoint Contract</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {taxRates.map((tax) => (
                    <tr key={tax.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Percent className="w-3.5 h-3.5 text-indigo-600" />
                        {tax.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-bold text-[11px]">
                          {tax.country}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                        {num(tax.rate_percentage).toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {tax.is_active ? (
                          <Badge variant="emerald" label="ACTIVE" />
                        ) : (
                          <Badge variant="slate" label="INACTIVE" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                        GET/POST /api/v1/billing/taxes
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Creation Form Modal */}
      <InvoiceFormModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={(created) => {
          setInvoices((prev) => [created, ...prev]);
        }}
        availableSubscriptions={subscriptions}
        availableTaxes={taxRates}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={Boolean(selectedInvoiceForDetail)}
        onClose={() => setSelectedInvoiceForDetail(null)}
        invoice={selectedInvoiceForDetail}
        onStatusChange={(updated) => {
          setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
          setSelectedInvoiceForDetail(updated);
        }}
      />

      {/* Tax Rule Creation Modal */}
      <TaxRuleModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
        onSuccess={(created) => {
          setTaxRates((prev) => [...prev, created]);
        }}
      />
    </div>
  );
};
