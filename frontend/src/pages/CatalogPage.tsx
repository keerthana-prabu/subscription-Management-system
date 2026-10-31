import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Grid,
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
      const remoteProducts = await api.catalog.getProducts();
      setProducts(remoteProducts);
      setBackendIntegrationPending(false);
      setBackendMessage(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 501) {
          setBackendIntegrationPending(true);
          setBackendMessage(err.message || 'GET /api/v1/catalog/products contract defined; implementation pending Member 2.');
        } else {
          setBackendMessage(`API Status: ${err.message}`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered & Paginated Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);

      const matchesType = typeFilter === 'all' || p.product_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [products, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  // Product Create/Edit Handlers
  const handleOpenCreateProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (payload: ProductCreatePayload) => {
    try {
      if (productToEdit) {
        await api.catalog.updateProduct(productToEdit.id, payload).catch((err) => {
          if (err instanceof ApiClientError && err.status === 501) {
            // Backend pending; proceed with client-side state update
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

      // Refresh selected product if currently open in detail modal
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
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog & Variants</h2>
          </div>
          <p className="text-xs text-slate-500">
            Manage SaaS products, SKUs, brand pricing adjustments (Odoo +560 surcharge), and variant hierarchies.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateProduct}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Product
            </Button>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Read-only mode (Admin required to add products)
            </div>
          )}
        </div>
      </div>

      {/* Backend Integration Pending Banner (Transparent State) */}
      {backendIntegrationPending && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start space-x-3">
          <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Backend Integration Contract Pending (Member 2):</span>
            <p className="mt-0.5 text-purple-700">
              {backendMessage || 'The API endpoint /api/v1/catalog/products returned HTTP 501. Local interactive mode is active so you can test product creation, Odoo brand surcharge calculations, and variants in real-time.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={fetchProducts} isLoading={isLoading} className="bg-white">
            Retry Sync
          </Button>
        </div>
      )}

      {/* Search, Filter & View Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search by name or code..."
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

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by product type"
            className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Types</option>
            <option value="service">Service (SaaS)</option>
            <option value="subscription">Subscription</option>
            <option value="storable">Storable</option>
            <option value="consumable">Consumable</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
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
          </div>
        </div>
      </div>

      {/* Product Content: Table or Grid */}
      {paginatedProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="No Products Found"
          description={
            searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No catalog items match your search and filter criteria.'
              : 'Your product catalog is empty. Click "New Product" to register your first SaaS offering.'
          }
          action={
            isAdmin && (
              <Button size="sm" onClick={handleOpenCreateProduct} leftIcon={<Plus className="w-4 h-4" />}>
                Create Product
              </Button>
            )
          }
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Code / SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Sales Price</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-center">Variants</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedProducts.map((p) => {
                  const sPrice = Number(p.sales_price) || 0;
                  const cPrice = Number(p.cost_price) || 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                        {p.code}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedProductForDetail(p)}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        >
                          {p.name}
                        </button>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {p.product_type || 'Service'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        ${sPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        ${cPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-100">
                          {p.variants?.length || 0} SKU(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedProductForDetail(p)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            title="View details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setSelectedProductForVariant(p)}
                                className="p-1 rounded text-purple-600 hover:bg-purple-50"
                                title="Add variant"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                                title="Edit product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setProductToDelete(p)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete product"
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
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProducts.map((p) => {
            const sPrice = Number(p.sales_price) || 0;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                      {p.code}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      title={p.is_active ? 'Active' : 'Inactive'}
                    />
                  </div>

                  <h3
                    onClick={() => setSelectedProductForDetail(p)}
                    className="font-bold text-sm text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-1 mb-1"
                  >
                    {p.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {p.description || 'No detailed specifications configured.'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Base Price</span>
                      <span className="font-mono font-bold text-slate-900">${sPrice.toFixed(2)} USD</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Variants</span>
                      <span className="font-semibold text-purple-700">{p.variants?.length || 0} SKU(s)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedProductForDetail(p)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View Details &rarr;
                    </button>
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setSelectedProductForVariant(p)}
                          className="p-1 rounded text-purple-600 hover:bg-purple-50 text-xs flex items-center space-x-1"
                          title="Add variant"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Variant</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500">
            Showing Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong> ({filteredProducts.length} total products)
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
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleSaveProduct}
        productToEdit={productToEdit}
      />

      {selectedProductForVariant && (
        <VariantFormModal
          isOpen={!!selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          product={selectedProductForVariant}
          onSubmit={handleSaveVariant}
        />
      )}

      <ProductDetailModal
        isOpen={!!selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        product={selectedProductForDetail}
        isAdmin={isAdmin}
        onEdit={(p) => {
          setSelectedProductForDetail(null);
          handleOpenEditProduct(p);
        }}
        onAddVariant={(p) => {
          setSelectedProductForVariant(p);
        }}
      />

      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Delete Product?"
        message={`Are you sure you want to remove "${productToDelete?.name}" (${productToDelete?.code})? This will deactivate associated quotation templates.`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
