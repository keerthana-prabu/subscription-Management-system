import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Product } from '../../api/types';
import { Plus, Edit2, Layers, DollarSign } from 'lucide-react';

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
      description={`Catalog item details for code ${product.code}`}
      maxWidth="lg"
    >
      <div className="space-y-6 text-left">
        {/* Top Status & Meta info */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Catalog Code</span>
            <span className="font-mono font-semibold text-slate-800">{product.code}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Product Type</span>
            <span className="capitalize font-medium text-slate-700">{product.product_type || 'Service'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Catalog Status</span>
            <span
              className={`px-2 py-0.5 rounded-full font-semibold ${
                product.is_active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {product.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Variants</span>
            <span className="font-semibold text-slate-800">{product.variants?.length || 0} Registered</span>
          </div>
        </div>

        {/* Pricing & Margin Breakdown */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pricing & Profit Ledger</span>
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">Base Sales Price</span>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                ${salesPrice.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500">Cost Price</span>
              <div className="text-base font-bold text-slate-600 mt-0.5 font-mono">
                ${costPrice.toFixed(2)}
              </div>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-700 font-medium">Profit Margin</span>
              <div className="text-base font-extrabold text-emerald-800 mt-0.5 font-mono">
                ${margin.toFixed(2)} <span className="text-xs font-normal">({marginPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Specifications
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* Variants Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
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
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
              No variants defined for this product yet.
              {isAdmin && (
                <span className="block mt-1 text-indigo-600 font-medium">
                  Click &ldquo;Add Variant&rdquo; to attach brand or metric pricing adjustments.
                </span>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">SKU</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Variant Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Brand</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Metric</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">Selling Price</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {product.variants.map((v) => (
                    <tr key={v.id || v.sku} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-semibold text-slate-800">{v.sku}</td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{v.name}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {v.brand ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                            {v.brand}
                          </span>
                        ) : (
                          'Standard'
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 uppercase text-[10px]">{v.billing_metric}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                        ${Number(v.base_price).toFixed(2)} {v.currency}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`w-2 h-2 inline-block rounded-full ${
                            v.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(product)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Product
              </Button>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
