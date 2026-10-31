import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Layers,
  ExternalLink,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { api, ApiClientError } from '../api/client';
import type {
  Product,
  ProductCreatePayload,
  ProductVariantCreatePayload,
  ProductVariant,
} from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton, CardSkeleton } from '../components/common/Skeleton';
import { ProductFormModal } from '../components/catalog/ProductFormModal';
import { VariantFormModal } from '../components/catalog/VariantFormModal';
import { ProductDetailModal } from '../components/catalog/ProductDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

// Initial baseline mock/demo products if backend is in 501 state, allowing full interactivity
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Brightloop Analytics Suite',
    code: 'PROD-BL-ANALYTICS',
    product_type: 'service',
    sales_price: 120,
    cost_price: 40,
    description: 'Enterprise data telemetry pipeline with real-time alerting and usage tracking.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 101,
        product_id: 1,
        sku: 'BL-ANALYTICS-STD',
        name: 'Analytics - Standard Edition',
        brand: 'Standard',
        billing_metric: 'seat',
        base_price: 120,
        price_adjustment: 0,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 102,
        product_id: 1,
        sku: 'BL-ANALYTICS-ODOO',
        name: 'Analytics - Odoo Brand Edition',
        brand: 'Odoo',
        billing_metric: 'seat',
        base_price: 680,
        price_adjustment: 560,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 2,
    name: 'Brightloop Cloud Storage Bucket',
    code: 'PROD-BL-STORAGE',
    product_type: 'subscription',
    sales_price: 49,
    cost_price: 12,
    description: 'Scalable multi-tenant object storage bucket with zero egress fees.',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      {
        id: 201,
        product_id: 2,
        sku: 'BL-STORAGE-TB',
        name: 'Storage - 1TB Tier',
        brand: 'Standard',
        billing_metric: 'usage_gb',
        base_price: 49,
        price_adjustment: 0,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  },
];

export const CatalogPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Product State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendIntegrationPending, setBackendIntegrationPending] = useState<boolean>(false);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  // Destructive action state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch products from backend
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await api.catalog.getProducts();
      if (Array.isArray(response) && response.length > 0) {
        setProducts(response);
        setBackendIntegrationPending(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 501) {
          setBackendIntegrationPending(true);
          setBackendMessage(
            'Backend GET /api/v1/catalog/products returned 501 (Not Implemented). Running in client-side interactive preview mode with standard mock entities.'
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search Query
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Status Filter
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? p.is_active
          : !p.is_active;

      // 3. Type Filter
      const matchesType =
        typeFilter === 'all' ? true : p.product_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [products, searchQuery, statusFilter, typeFilter]);

  // Paginated Products
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Total variants count
  const totalVariantsCount = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
  }, [products]);

  const odooVariantsCount = useMemo(() => {
    return products.reduce(
      (acc, p) =>
        acc +
        (p.variants?.filter(
          (v) => v.brand?.toLowerCase().includes('odoo') || v.sku?.includes('ODOO')
        ).length || 0),
      0
    );
  }, [products]);

  // Open Create Modal
  const handleOpenCreateProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  // Product Create/Edit Submit Handler
  const handleSaveProduct = async (payload: ProductCreatePayload) => {
    try {
      if (productToEdit) {
        await api.catalog.updateProduct(productToEdit.id, payload).catch((err) => {
          if (err instanceof ApiClientError && err.status === 501) {
            return;
          }
          throw err;
        });

        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToEdit.id
              ? {
                  ...p,
                  ...payload,
                  variants: p.variants,
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );
        showToast(`Product "${payload.name}" updated successfully.`, 'success');
      } else {
        const createdId = Date.now();
        await api.catalog.createProduct(payload).catch((err) => {
          if (err instanceof ApiClientError && err.status === 501) {
            return;
          }
          throw err;
        });

        const newProd: Product = {
          id: createdId,
          ...payload,
          variants: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setProducts((prev) => [newProd, ...prev]);
        showToast(`Product "${payload.name}" created successfully.`, 'success');
      }
      setIsProductModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product';
      showToast(msg, 'error');
    }
  };

  // Variant Create Handler
  const handleSaveVariant = async (payload: ProductVariantCreatePayload) => {
    if (!selectedProductForVariant) return;

    try {
      await api.catalog.createVariant(selectedProductForVariant.id, payload).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          return;
        }
        throw err;
      });

      const newVariant: ProductVariant = {
        id: Date.now(),
        product_id: selectedProductForVariant.id,
        sku: payload.sku,
        name: payload.name,
        brand: payload.brand,
        billing_metric: payload.billing_metric,
        base_price: payload.base_price,
        price_adjustment: payload.price_adjustment,
        currency: payload.currency || 'USD',
        is_active: payload.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProductForVariant.id
            ? { ...p, variants: [...(p.variants || []), newVariant] }
            : p
        )
      );

      if (selectedProductForDetail && selectedProductForDetail.id === selectedProductForVariant.id) {
        setSelectedProductForDetail((prev) =>
          prev ? { ...prev, variants: [...(prev.variants || []), newVariant] } : null
        );
      }

      showToast(`Variant "${payload.name}" added to ${selectedProductForVariant.name}.`, 'success');
      setSelectedProductForVariant(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add variant';
      showToast(msg, 'error');
    }
  };

  // Deletion / Archival Handler
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await api.catalog.deleteProduct(productToDelete.id).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) return;
        throw err;
      });

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      showToast(`Product "${productToDelete.name}" deleted.`, 'info');
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100/80">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Product Catalog & SKUs</h2>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {products.length} Products
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage SaaS offerings, SKU hierarchies, and brand surcharge pricing (+560 Odoo Edition).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateProduct}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Product
            </Button>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              Read-only mode (Admin role required to create products)
            </div>
          )}
        </div>
      </div>

      {/* Metric summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Catalog SKUs</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">{products.length}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Variants</span>
          <div className="text-lg font-black text-indigo-600 mt-0.5">{totalVariantsCount}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Odoo Brand SKUs</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">{odooVariantsCount}</div>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Published</span>
          <div className="text-lg font-black text-slate-900 mt-0.5">
            {products.filter((p) => p.is_active).length}
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
              {backendMessage ||
                'Catalog endpoints (/api/v1/catalog) are structured in FastAPI schemas and awaiting Member 2 logic. UI is completely interactive with client state.'}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by product name or code..."
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
          {/* Product Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 py-2 px-3 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          >
            <option value="all">All Classifications</option>
            <option value="service">Services (SaaS)</option>
            <option value="subscription">Subscriptions</option>
            <option value="physical_goods">Physical Goods</option>
            <option value="digital_license">Digital Licenses</option>
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
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Products List / Grid */}
      {isLoading ? (
        viewMode === 'table' ? <TableSkeleton rows={4} cols={6} /> : <CardSkeleton count={3} />
      ) : paginatedProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No products found"
          description="Try adjusting your search criteria, product classification, or status filter."
          action={
            isAdmin ? (
              <Button size="sm" onClick={handleOpenCreateProduct} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create First Product
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
                  <th className="px-5 py-3.5">Product Information</th>
                  <th className="px-4 py-3.5">Classification</th>
                  <th className="px-4 py-3.5">Base Price</th>
                  <th className="px-4 py-3.5">Cost & Margin</th>
                  <th className="px-4 py-3.5">Configured Variants</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedProducts.map((prod) => {
                  const salesPrice = Number(prod.sales_price) || 0;
                  const costPrice = Number(prod.cost_price) || 0;
                  const margin = Math.max(0, salesPrice - costPrice);
                  const marginPct = salesPrice > 0 ? ((margin / salesPrice) * 100).toFixed(0) : '0';

                  return (
                    <tr key={prod.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">{prod.code}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg font-medium inline-block">
                          {prod.product_type || 'Service'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-sm">
                        ${salesPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-slate-500">${costPrice.toFixed(2)}</div>
                        <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                          {marginPct}% margin
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForDetail(prod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/70 transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{prod.variants?.length || 0} Variants</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            prod.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              prod.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {prod.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProductForDetail(prod)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="View Full Specifications"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedProductForVariant(prod)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                                title="Add Variant"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(prod)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductToDelete(prod)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Product"
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
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedProducts.map((prod) => {
            const salesPrice = Number(prod.sales_price) || 0;
            const costPrice = Number(prod.cost_price) || 0;
            const margin = Math.max(0, salesPrice - costPrice);
            const marginPct = salesPrice > 0 ? ((margin / salesPrice) * 100).toFixed(0) : '0';

            return (
              <div
                key={prod.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {prod.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        prod.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${prod.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                      />
                      {prod.is_active ? 'Active' : 'Archived'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {prod.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Base Price</span>
                      <div className="text-lg font-black text-slate-900 font-mono">${salesPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Margin</span>
                      <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                        {marginPct}% (${margin.toFixed(0)})
                      </div>
                    </div>
                  </div>

                  {/* Attached Variants preview pill */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Attached Variants:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedProductForDetail(prod)}
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      {prod.variants?.length || 0} SKUs &rarr;
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProductForDetail(prod)}
                  >
                    Details
                  </Button>
                  {isAdmin && (
                    <div className="flex items-center space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProductForVariant(prod)}
                        leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        +Variant
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditProduct(prod)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {filteredProducts.length > pageSize && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold">{paginatedProducts.length}</span> of{' '}
            <span className="font-semibold">{filteredProducts.length}</span> products
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
      {isProductModalOpen && (
        <ProductFormModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSubmit={handleSaveProduct}
          productToEdit={productToEdit}
        />
      )}

      {selectedProductForVariant && (
        <VariantFormModal
          isOpen={Boolean(selectedProductForVariant)}
          onClose={() => setSelectedProductForVariant(null)}
          product={selectedProductForVariant}
          onSubmit={handleSaveVariant}
        />
      )}

      {selectedProductForDetail && (
        <ProductDetailModal
          isOpen={Boolean(selectedProductForDetail)}
          onClose={() => setSelectedProductForDetail(null)}
          product={selectedProductForDetail}
          isAdmin={isAdmin}
          onEdit={(p) => {
            setSelectedProductForDetail(null);
            handleOpenEditProduct(p);
          }}
          onAddVariant={(p) => {
            setSelectedProductForDetail(null);
            setSelectedProductForVariant(p);
          }}
        />
      )}

      {productToDelete && (
        <ConfirmDialog
          isOpen={Boolean(productToDelete)}
          title={`Archive ${productToDelete.name}?`}
          message={`Are you sure you want to archive product ${productToDelete.code}? Existing subscription contracts referencing this SKU will continue according to their terms.`}
          confirmLabel="Archive Product"
          isDestructive={true}
          isLoading={isDeleting}
          onConfirm={handleDeleteProduct}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
};
