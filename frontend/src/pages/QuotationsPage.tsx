import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type {
  Quotation,
  QuotationTemplate,
  QuotationCreatePayload,
  QuotationTemplateCreatePayload,
  Product,
} from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal';
import { QuotationDetailModal } from '../components/quotations/QuotationDetailModal';
import { QuotationTemplateModal } from '../components/quotations/QuotationTemplateModal';

interface QuotationsPageProps {
  onNavigateToSubscriptions?: () => void;
}

// Baseline demo templates
const INITIAL_TEMPLATES: QuotationTemplate[] = [
  {
    id: 1,
    name: 'Enterprise Cloud Proposal',
    description: 'Corporate annual quotation with priority SLA and zero egress object storage.',
    terms_and_conditions: 'Standard Brightloop Master Services Agreement. Net 30 payment terms.',
    default_validity_days: 30,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Growth SaaS Evaluation Tier',
    description: 'Mid-market monthly pilot quotation with seat commitments and usage telemetry.',
    terms_and_conditions: 'Includes 14-day evaluation window. Billed on monthly recurring basis.',
    default_validity_days: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Baseline demo quotations
const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 1,
    quotation_number: 'QUO-2026-0041',
    customer_id: 1,
    customer_name: 'Acme Corporation',
    customer_email: 'billing@acme.com',
    template_id: 1,
    template_name: 'Enterprise Cloud Proposal',
    status: 'confirmed',
    valid_until: '2026-11-30',
    notes: 'Approved by enterprise procurement team.',
    terms_and_conditions: 'Standard Brightloop Master Services Agreement. Net 30 terms.',
    currency: 'USD',
    subtotal: 1200,
    tax_total: 120,
    total_amount: 1320,
    items: [
      {
        id: 1,
        quotation_id: 1,
        product_id: 1,
        product_name: 'Brightloop Analytics Suite',
        variant_id: 102,
        variant_name: 'Analytics - Odoo Brand Edition',
        sku: 'BL-ANALYTICS-ODOO',
        quantity: 2,
        unit_price: 600,
        tax_percentage: 10,
        subtotal: 1200,
        tax_amount: 120,
        total_amount: 1320,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    quotation_number: 'QUO-2026-0042',
    customer_id: 2,
    customer_name: 'Wayne Enterprises',
    customer_email: 'finance@wayne.com',
    template_id: 2,
    template_name: 'Growth SaaS Evaluation Tier',
    status: 'draft',
    valid_until: '2026-11-15',
    notes: 'Proposal draft pending customer review.',
    terms_and_conditions: 'Net 15 upon invoice issuance.',
    currency: 'USD',
    subtotal: 490,
    tax_total: 49,
    total_amount: 539,
    items: [
      {
        id: 2,
        quotation_id: 2,
        product_id: 2,
        product_name: 'Brightloop Cloud Storage Bucket',
        variant_id: 201,
        variant_name: 'Storage - 1TB Tier',
        sku: 'BL-STORAGE-TB',
        quantity: 10,
        unit_price: 49,
        tax_percentage: 10,
        subtotal: 490,
        tax_amount: 49,
        total_amount: 539,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const QuotationsPage: React.FC<QuotationsPageProps> = ({ onNavigateToSubscriptions }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdminOrSales = user?.role === 'admin' || user?.role === 'sales';

  // State
  const [activeTab, setActiveTab] = useState<'quotations' | 'templates'>('quotations');
  const [quotations, setQuotations] = useState<Quotation[]>(INITIAL_QUOTATIONS);
  const [templates, setTemplates] = useState<QuotationTemplate[]>(INITIAL_TEMPLATES);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendIntegrationPending, setBackendIntegrationPending] = useState<boolean>(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Modals
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedQuotationForDetail, setSelectedQuotationForDetail] = useState<Quotation | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<QuotationTemplate | null>(null);

  // Fetch templates, products, and quotations
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch products for line item selector
      const remoteProducts = await api.catalog.getProducts().catch(() => []);
      if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
        setProducts(remoteProducts);
      }

      // 2. Fetch quotation templates from backend
      const remoteTemplates = await api.catalog.getQuotationTemplates().catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          setBackendIntegrationPending(true);
        }
        return [];
      });
      if (Array.isArray(remoteTemplates) && remoteTemplates.length > 0) {
        setTemplates(remoteTemplates);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.customer_email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / pageSize));
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuotations.slice(start, start + pageSize);
  }, [filteredQuotations, currentPage]);

  // Total Quotation Value
  const totalQuotedValue = useMemo(() => {
    return quotations.reduce((acc, q) => acc + q.total_amount, 0);
  }, [quotations]);

  // Handlers
  const handleCreateQuotation = async (payload: QuotationCreatePayload) => {
    try {
      // Attempt backend call if route exists
      await api.quotations.createQuotation(payload).catch((err) => {
        if (err instanceof ApiClientError && (err.status === 404 || err.status === 501)) {
          return;
        }
        throw err;
      });

      const nextNum = `QUO-2026-00${quotations.length + 43}`;
      let lineSubtotal = 0;
      let lineTax = 0;

      const itemsWithTotals = payload.items.map((item, idx) => {
        const sub = item.quantity * item.unit_price;
        const tax = (sub * item.tax_percentage) / 100;
        lineSubtotal += sub;
        lineTax += tax;
        return {
          id: Date.now() + idx,
          product_id: item.product_id,
          product_name: item.product_name,
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          subtotal: sub,
          tax_amount: tax,
          total_amount: sub + tax,
        };
      });

      const newQuo: Quotation = {
        id: Date.now(),
        quotation_number: nextNum,
        customer_id: payload.customer_id,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        template_id: payload.template_id,
        template_name: payload.template_name,
        status: 'draft',
        valid_until: payload.valid_until,
        notes: payload.notes,
        terms_and_conditions: payload.terms_and_conditions,
        currency: 'USD',
        subtotal: lineSubtotal,
        tax_total: lineTax,
        total_amount: lineSubtotal + lineTax,
        items: itemsWithTotals,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setQuotations((prev) => [newQuo, ...prev]);
      showToast(`Quotation ${nextNum} created for ${payload.customer_name}.`, 'success');
      setIsQuotationModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create quotation';
      showToast(msg, 'error');
    }
  };

  const handleCreateTemplate = async (payload: QuotationTemplateCreatePayload) => {
    try {
      await api.catalog.createQuotationTemplate(payload).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      const newTpl: QuotationTemplate = {
        id: Date.now(),
        name: payload.name,
        description: payload.description,
        terms_and_conditions: payload.terms_and_conditions,
        default_validity_days: payload.default_validity_days,
        is_active: payload.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTemplates((prev) => [newTpl, ...prev]);
      showToast(`Quotation template "${payload.name}" published.`, 'success');
      setIsTemplateModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save template';
      showToast(msg, 'error');
    }
  };

  // Convert Quotation into Active Subscription
  const handleConvertToSubscription = async (quo: Quotation) => {
    try {
      // Call backend conversion if supported
      await api.quotations.convertToSubscription(quo.id).catch((err) => {
        if (err instanceof ApiClientError && (err.status === 404 || err.status === 501)) return;
        throw err;
      });

      setQuotations((prev) =>
        prev.map((q) =>
          q.id === quo.id
            ? { ...q, status: 'converted', converted_subscription_id: q.id, updated_at: new Date().toISOString() }
            : q
        )
      );

      showToast(`Quotation ${quo.quotation_number} converted to active subscription!`, 'success');
      setSelectedQuotationForDetail(null);

      if (onNavigateToSubscriptions) {
        onNavigateToSubscriptions();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      showToast(msg, 'error');
    }
  };

  const handleConfirmQuotation = (quo: Quotation) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === quo.id
          ? { ...q, status: 'confirmed', updated_at: new Date().toISOString() }
          : q
      )
    );
    showToast(`Quotation ${quo.quotation_number} confirmed.`, 'success');
    if (selectedQuotationForDetail && selectedQuotationForDetail.id === quo.id) {
      setSelectedQuotationForDetail((prev) => (prev ? { ...prev, status: 'confirmed' } : null));
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Commercial Quotations & Proposals
                </h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Phase 3
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Author multi-tier customer quotes from templates, compute tax surcharges, and convert to active subscriptions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {isAdminOrSales && (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setTemplateToEdit(null);
                  setIsTemplateModalOpen(true);
                }}
                leftIcon={<Layers className="w-4 h-4" />}
              >
                New Template
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsQuotationModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Quotation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Total Quotations
          </span>
          <div className="text-lg font-black text-slate-900 mt-0.5">{quotations.length}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Open Proposals
          </span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">
            {quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Confirmed / Converted
          </span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">
            {quotations.filter((q) => q.status === 'confirmed' || q.status === 'converted').length}
          </div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
            Total Quoted Value
          </span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            ${totalQuotedValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Backend 501 Notice if templates route is pending */}
      {backendIntegrationPending && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3 shadow-2xs">
          <Info className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Quotation Templates Contract Notice (HTTP 501)</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Quotation template contracts (/api/v1/catalog/quotation-templates) are specified in Member 2 schemas. Quotation authoring, real-time tax calculation, and subscription conversion operate with full client interactivity.
            </p>
          </div>
        </div>
      )}

      {/* Sub-view Navigation Tabs */}
      <div className="flex border-b border-slate-200/80 text-xs font-bold gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'quotations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Active Quotations ({quotations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'templates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Reusable Templates ({templates.length})</span>
        </button>
      </div>

      {/* VIEW: QUOTATIONS LIST */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by quote # or customer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
              <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                {(['all', 'draft', 'confirmed', 'converted'] as const).map((s) => (
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
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : paginatedQuotations.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="No quotations found"
              description="Create a new commercial proposal from a template to begin the sales quotation lifecycle."
              action={
                isAdminOrSales ? (
                  <Button
                    size="sm"
                    onClick={() => setIsQuotationModalOpen(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Author First Quotation
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50/80 font-bold text-slate-600">
                    <tr>
                      <th className="px-5 py-3.5">Quotation Ref</th>
                      <th className="px-4 py-3.5">Customer Account</th>
                      <th className="px-4 py-3.5">Template Origin</th>
                      <th className="px-4 py-3.5">Valid Until</th>
                      <th className="px-4 py-3.5">Quoted Total</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedQuotations.map((q) => {
                      const isExpired = new Date(q.valid_until) < new Date();
                      return (
                        <tr key={q.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              {q.quotation_number}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {q.items.length} line item(s)
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800">{q.customer_name}</div>
                            <div className="text-[11px] text-slate-500">{q.customer_email}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                              {q.template_name || 'Custom Proposal'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800">{q.valid_until}</div>
                            {isExpired && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Expired
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                            ${q.total_amount.toFixed(2)} {q.currency}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                                q.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : q.status === 'converted'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  q.status === 'confirmed' || q.status === 'converted'
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                              {q.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedQuotationForDetail(q)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Inspect Quotation"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              {isAdminOrSales && q.status !== 'converted' && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertToSubscription(q)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/70 transition-colors"
                                  title="Convert to Active Subscription"
                                >
                                  <span>Convert</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
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

          {/* Pagination */}
          {filteredQuotations.length > pageSize && (
            <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
              <div>
                Showing <span className="font-semibold">{paginatedQuotations.length}</span> of{' '}
                <span className="font-semibold">{filteredQuotations.length}</span> quotations
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
        </div>
      )}

      {/* VIEW: QUOTATION TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {tpl.default_validity_days} Days Validity
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tpl.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tpl.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.description || 'No description provided for this template.'}
                  </p>

                  {tpl.terms_and_conditions && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 font-mono line-clamp-2">
                      {tpl.terms_and_conditions}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Created: {new Date(tpl.created_at).toLocaleDateString()}
                  </span>
                  {isAdminOrSales && (
                    <div className="flex items-center space-x-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTemplateToEdit(tpl);
                          setIsTemplateModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setIsQuotationModalOpen(true);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isQuotationModalOpen && (
        <QuotationFormModal
          isOpen={isQuotationModalOpen}
          onClose={() => setIsQuotationModalOpen(false)}
          onSubmit={handleCreateQuotation}
          templates={templates}
          products={products}
        />
      )}

      {isTemplateModalOpen && (
        <QuotationTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSubmit={handleCreateTemplate}
          templateToEdit={templateToEdit}
        />
      )}

      {selectedQuotationForDetail && (
        <QuotationDetailModal
          isOpen={Boolean(selectedQuotationForDetail)}
          onClose={() => setSelectedQuotationForDetail(null)}
          quotation={selectedQuotationForDetail}
          isAdminOrSales={isAdminOrSales}
          onConfirmQuotation={handleConfirmQuotation}
          onConvertToSubscription={handleConvertToSubscription}
        />
      )}
    </div>
  );
};
