import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Product, ProductCreatePayload, ProductType } from '../../api/types';

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
      description="Define general catalog attributes, pricing metrics, and inventory classification."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            placeholder="e.g. Brightloop Analytics Suite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="Product Code / SKU Prefix"
            placeholder="e.g. PROD-BL-ANALYTICS"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Product Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value as ProductType)}
              className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="service">Service (SaaS)</option>
              <option value="subscription">Subscription License</option>
              <option value="storable">Storable Product</option>
              <option value="consumable">Consumable</option>
            </select>
          </div>

          <Input
            label="Sales Price ($ USD)"
            type="number"
            step="0.01"
            min="0"
            value={salesPrice}
            onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
            error={errors.salesPrice}
            required
          />

          <Input
            label="Cost Price ($ USD)"
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
            error={errors.costPrice}
            required
          />
        </div>

        {/* Real-time Margin Calculator Badge */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600">
            Calculated Profit Margin: <strong className="text-slate-900">${margin.toFixed(2)}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            {marginPercentage}% Margin
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Description & Specifications
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key functional features, SLA guarantees, or billing notes..."
            className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        {/* Status Checkbox */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <label htmlFor="is_active" className="text-xs font-medium text-slate-700 select-none cursor-pointer">
            Publish this product to active catalog
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            {productToEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

