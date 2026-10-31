import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Product } from '../../api/types';
import { Plus, Edit2, Layers, DollarSign, CheckCircle2, XCircle } from 'lucide-react';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  isAdmin: boolean;
  onEdit: (product: Product) => void;
  onAddVariant: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  isAdmin,
  onEdit,
  onAddVariant,
}) => {
  if (!product) return null;

  const salesPrice = Number(product.sales_price) || 0;
  const costPrice = Number(product.cost_price) || 0;
  const margin = Math.max(0, salesPrice - costPrice);
  const marginPct = salesPrice > 0 ? ((margin / salesPrice) * 100).toFixed(1) : '0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      description={`Catalog item specifications for SKU code ${product.code}`}
      maxWidth="xl"
    >
      <div className="space-y-6 text-left">
        {/* Top Status & Meta info bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Catalog Code</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{product.code}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Product Type</span>
            <span className="capitalize font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs inline-block mt-0.5">
              {product.product_type || 'Service'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Catalog Status</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-0.5 ${
                product.is_active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}
              />
              {product.is_active ? 'Published' : 'Archived'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Variants</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 inline-block mt-0.5">
              {product.variants?.length || 0} Registered
            </span>
          </div>
        </div>

        {/* Pricing & Margin Breakdown */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pricing & Profit Ledger</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Base Sales Price</span>
              <div className="text-lg font-black text-slate-900 mt-1 font-mono">
                ${salesPrice.toFixed(2)}
              </div>
            </div>
            <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium">Standard Cost Price</span>
              <div className="text-lg font-bold text-slate-600 mt-1 font-mono">
                ${costPrice.toFixed(2)}
              </div>
            </div>
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl shadow-2xs">
              <span className="text-[11px] text-emerald-800 font-semibold">Gross Profit Margin</span>
              <div className="text-lg font-black text-emerald-700 mt-1 font-mono">
                ${margin.toFixed(2)} <span className="text-xs font-semibold">({marginPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description & Specifications
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* Variants Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Configured Product Variants</span>
            </h4>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddVariant(product)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Variant
              </Button>
            )}
          </div>

          {(!product.variants || product.variants.length === 0) ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500">No variants attached yet to this product.</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onAddVariant(product)}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Configure first variant (e.g. Odoo Edition +560) &rarr;
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Variant / SKU</th>
                    <th className="px-3.5 py-2.5">Brand</th>
                    <th className="px-3.5 py-2.5">Metric</th>
                    <th className="px-3.5 py-2.5">Surcharge</th>
                    <th className="px-3.5 py-2.5">Final Selling Price</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {product.variants.map((v) => {
                    const adj = Number(v.price_adjustment) || 0;
                    const finalPrice = Number(v.base_price) || (salesPrice + adj);
                    const isOdoo = v.brand?.toLowerCase().includes('odoo') || v.sku?.includes('ODOO');

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="font-bold text-slate-900">{v.name}</div>
                          <div className="font-mono text-[11px] text-slate-400">{v.sku}</div>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isOdoo
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {v.brand || 'Standard'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 capitalize text-slate-600 font-medium">
                          {v.billing_metric || 'Seat'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-600">
                          {adj > 0 ? `+$${adj.toFixed(2)}` : '$0.00'}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 text-sm">
                          ${finalPrice.toFixed(2)} {v.currency || 'USD'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              v.is_active ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {v.is_active ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-300" />
                            )}
                            {v.is_active ? 'Active' : 'Archived'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            Created: {new Date(product.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEdit(product)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Product
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
