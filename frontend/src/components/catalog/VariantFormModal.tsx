import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Product, ProductVariantCreatePayload } from '../../api/types';

interface VariantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSubmit: (data: ProductVariantCreatePayload) => Promise<void>;
  isLoading?: boolean;
}

const BRAND_PRESETS: { label: string; adjustment: number }[] = [
  { label: 'Standard Edition', adjustment: 0 },
  { label: 'Odoo Edition (+560)', adjustment: 560 },
  { label: 'Enterprise Cloud (+1200)', adjustment: 1200 },
  { label: 'Custom Brand Adjustment', adjustment: 0 },
];

export const VariantFormModal: React.FC<VariantFormModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
  isLoading = false,
}) => {
  const basePriceNum = Number(product.sales_price) || 100;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brandPreset, setBrandPreset] = useState<string>('Odoo Edition (+560)');
  const [customBrandName, setCustomBrandName] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState<number>(560);
  const [billingMetric, setBillingMetric] = useState('seat');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(`${product.name} - Odoo Brand`);
      setSku(`${product.code}-ODOO`);
      setBrandPreset('Odoo Edition (+560)');
      setPriceAdjustment(560);
      setCustomBrandName('Odoo');
      setBillingMetric('seat');
      setIsActive(true);
      setErrors({});
    }
  }, [isOpen, product]);

  const handleBrandChange = (preset: string) => {
    setBrandPreset(preset);
    const found = BRAND_PRESETS.find((p) => p.label === preset);
    if (found && preset !== 'Custom Brand Adjustment') {
      setPriceAdjustment(found.adjustment);
      if (preset.includes('Odoo')) {
        setCustomBrandName('Odoo');
        setName(`${product.name} - Odoo Edition`);
        setSku(`${product.code}-ODOO`);
      } else if (preset.includes('Enterprise')) {
        setCustomBrandName('Enterprise');
        setName(`${product.name} - Enterprise`);
        setSku(`${product.code}-ENT`);
      } else {
        setCustomBrandName('Standard');
        setName(`${product.name} - Standard`);
        setSku(`${product.code}-STD`);
      }
    }
  };

  // Final selling price calculation: Base Price + Price Adjustment
  const finalSellingPrice = Math.max(0, basePriceNum + priceAdjustment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Variant name is required';
    if (!sku.trim()) newErrors.sku = 'SKU is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      brand: customBrandName.trim() || brandPreset,
      billing_metric: billingMetric,
      base_price: finalSellingPrice,
      price_adjustment: priceAdjustment,
      currency: 'USD',
      is_active: isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Variant to ${product.name}`}
      description="Configure variant attributes, brand surcharge, and metric-based billing adjustment."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Parent Product:</span>
            <span className="font-semibold text-slate-800">{product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Base Sales Price:</span>
            <span className="font-mono font-semibold text-slate-800">${basePriceNum.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Brand / Edition Preset Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Brand / Edition Preset
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {BRAND_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleBrandChange(p.label)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  brandPreset === p.label
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div>{p.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {p.adjustment > 0 ? `+ $${p.adjustment} surcharge` : 'Standard rate'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Variant Name"
            placeholder="e.g. Analytics - Odoo Brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="Variant SKU"
            placeholder="e.g. PROD-BL-ODOO"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            error={errors.sku}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Price Adjustment ($ USD)"
            type="number"
            step="1"
            value={priceAdjustment}
            onChange={(e) => setPriceAdjustment(parseFloat(e.target.value) || 0)}
            helperText="e.g. 560 for Odoo brand surcharge"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Billing Metric
            </label>
            <select
              value={billingMetric}
              onChange={(e) => setBillingMetric(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            >
              <option value="seat">Per User / Seat</option>
              <option value="tenant">Per Tenant Instance</option>
              <option value="license">Per Software License</option>
              <option value="usage_gb">Per GB Telemetry</option>
              <option value="flat">Flat Periodic Fee</option>
            </select>
          </div>
        </div>

        {/* Real-time Calculated Selling Price Calculation Card */}
        <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs">
          <div className="flex items-center justify-between font-medium text-slate-600 mb-1">
            <span>Base Product Price:</span>
            <span>${basePriceNum.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between font-medium text-slate-600 mb-2">
            <span>Brand Surcharge ({customBrandName || 'Adjustment'}):</span>
            <span className="text-indigo-700 font-semibold">+ ${priceAdjustment.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-sm">
            <span className="font-bold text-slate-900">Final Selling Price:</span>
            <span className="text-base font-extrabold text-indigo-700 font-mono">
              ${finalSellingPrice.toFixed(2)} USD / {billingMetric}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="variant_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <label htmlFor="variant_active" className="text-xs font-medium text-slate-700 select-none cursor-pointer">
            Variant active for immediate sales quotes
          </label>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            Add Variant
          </Button>
        </div>
      </form>
    </Modal>
  );
};

