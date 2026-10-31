import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Product, ProductCreatePayload, ProductType } from '../../api/types';
import { DollarSign, Layers, Tag, Percent } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductCreatePayload) => Promise<void>;
  productToEdit?: Product | null;
  isLoading?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [productType, setProductType] = useState<ProductType>('service');
  const [salesPrice, setSalesPrice] = useState<number>(99);
  const [costPrice, setCostPrice] = useState<number>(35);
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCode(productToEdit.code);
      setProductType(productToEdit.product_type || 'service');
      setSalesPrice(Number(productToEdit.sales_price) || 0);
      setCostPrice(Number(productToEdit.cost_price) || 0);
      setDescription(productToEdit.description || '');
      setIsActive(productToEdit.is_active);
    } else {
      setName('');
      setCode(`PROD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
      setProductType('service');
      setSalesPrice(99);
      setCostPrice(35);
      setDescription('');
      setIsActive(true);
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  const margin = Math.max(0, salesPrice - costPrice);
  const marginPercentage = salesPrice > 0 ? ((margin / salesPrice) * 100).toFixed(1) : '0';
  const markupPercentage = costPrice > 0 ? (((salesPrice - costPrice) / costPrice) * 100).toFixed(1) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!code.trim()) newErrors.code = 'Product code is required';
    if (salesPrice < 0) newErrors.salesPrice = 'Sales price must be positive';
    if (costPrice < 0) newErrors.costPrice = 'Cost price must be positive';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      product_type: productType,
      sales_price: Number(salesPrice),
      cost_price: Number(costPrice),
      description: description.trim(),
      is_active: isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? `Edit Product: ${productToEdit.name}` : 'Create New Product'}
      description="Define catalog specifications, base pricing structure, and inventory classifications."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Basic Identification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            placeholder="e.g. Brightloop Analytics Suite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            leftIcon={<Tag className="w-4 h-4" />}
            required
          />

          <Input
            label="Product Code / SKU Prefix"
            placeholder="e.g. PROD-BL-ANALYTICS"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            leftIcon={<Layers className="w-4 h-4" />}
            required
          />
        </div>

        {/* Product Type & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Product Classification <span className="text-rose-500">*</span>
            </label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="block w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="service">Service (SaaS Subscription)</option>
              <option value="subscription">Subscription License</option>
              <option value="physical_goods">Physical Appliance / Hardware</option>
              <option value="digital_license">Digital Download License</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catalog Availability
            </label>
            <div className="flex items-center space-x-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-xs font-semibold text-slate-800">
                  {isActive ? 'Active (Published to Catalog)' : 'Draft / Archived'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Financial & Margin Calculator Card */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              Base Pricing & Profit Margin Calculator
            </span>
            <span className="text-[10px] text-slate-400 font-mono">USD ($)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Base Sales Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={salesPrice}
              onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
              error={errors.salesPrice}
              leftIcon={<span className="text-xs font-bold">$</span>}
              required
            />

            <Input
              label="Standard Cost Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              error={errors.costPrice}
              leftIcon={<span className="text-xs font-bold">$</span>}
              required
            />
          </div>

          {/* Live Margin Metrics Box */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Gross Profit Margin</span>
              <div className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                ${margin.toFixed(2)} <span className="text-xs font-medium">({marginPercentage}%)</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                <Percent className="w-3 h-3 text-indigo-500" /> Cost Markup
              </span>
              <div className="text-base font-bold text-indigo-700 font-mono mt-0.5">
                {markupPercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Description & Specifications <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe product deliverables, SLA guarantees, or licensing specifications..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {productToEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
