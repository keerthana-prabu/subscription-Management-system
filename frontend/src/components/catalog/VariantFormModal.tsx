import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { Product, ProductVariantCreatePayload } from '../../api/types';
import { Sparkles, Check, Plus } from 'lucide-react';

interface VariantFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSubmit: (data: ProductVariantCreatePayload) => Promise<void>;
  isLoading?: boolean;
}

const BRAND_PRESETS: { id: string; label: string; adjustment: number; badge?: string }[] = [
  { id: 'standard', label: 'Standard Edition', adjustment: 0, badge: 'Base Tier' },
  { id: 'odoo', label: 'Odoo Edition (+560)', adjustment: 560, badge: 'Recommended • Hackathon' },
  { id: 'enterprise', label: 'Enterprise Cloud (+1200)', adjustment: 1200, badge: 'High SLA' },
  { id: 'custom', label: 'Custom Brand Adjustment', adjustment: 0 },
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
  const [customBrandName, setCustomBrandName] = useState('Odoo');
  const [priceAdjustment, setPriceAdjustment] = useState<number>(560);
  const [billingMetric, setBillingMetric] = useState('seat');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setName(`${product.name} - Odoo Edition`);
      setSku(`${product.code}-ODOO`);
      setBrandPreset('Odoo Edition (+560)');
      setPriceAdjustment(560);
      setCustomBrandName('Odoo');
      setBillingMetric('seat');
      setIsActive(true);
      setErrors({});
    }
  }, [isOpen, product]);

  const handleBrandChange = (preset: (typeof BRAND_PRESETS)[0]) => {
    setBrandPreset(preset.label);
    if (preset.id !== 'custom') {
      setPriceAdjustment(preset.adjustment);
      if (preset.id === 'odoo') {
        setCustomBrandName('Odoo');
        setName(`${product.name} - Odoo Edition`);
        setSku(`${product.code}-ODOO`);
      } else if (preset.id === 'enterprise') {
        setCustomBrandName('Enterprise');
        setName(`${product.name} - Enterprise Cloud`);
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
      description="Configure brand surcharge tiers, metric adjustments, and calculate final selling price."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4.5 text-left">
        {/* Parent Summary Card */}
        <div className="p-3.5 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 rounded-2xl text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Parent Product:</span>
            <span className="font-bold text-slate-900">{product.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Parent Base Price:</span>
            <span className="font-mono font-bold text-slate-800">${basePriceNum.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Brand Presets Selection Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 tracking-tight">
            Brand Preset & Price Adjustment Surcharge
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BRAND_PRESETS.map((preset) => {
              const isSelected = brandPreset === preset.label;
              const isOdoo = preset.id === 'odoo';

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleBrandChange(preset)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? isOdoo
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{preset.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </div>
                  {preset.badge && (
                    <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                      {preset.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Price Adjustment & Custom Brand Name if needed */}
        {brandPreset === 'Custom Brand Adjustment' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <Input
              label="Brand Name"
              placeholder="e.g. Partner Brand"
              value={customBrandName}
              onChange={(e) => setCustomBrandName(e.target.value)}
              required
            />
            <Input
              label="Price Adjustment ($)"
              type="number"
              value={priceAdjustment}
              onChange={(e) => setPriceAdjustment(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        )}

        {/* Dynamic Selling Price Formula Card */}
        <div className="p-4 bg-gradient-to-br from-indigo-900 to-violet-950 text-white rounded-2xl shadow-md border border-indigo-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-200">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Dynamic Final Price Calculation
            </span>
            <span className="font-mono text-[11px]">USD</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-center">
              <span className="text-[10px] text-indigo-300 block">Base Price</span>
              <span className="font-mono text-sm font-bold">${basePriceNum.toFixed(2)}</span>
            </div>
            <span className="text-indigo-300 font-bold">+</span>
            <div className="text-center">
              <span className="text-[10px] text-indigo-300 block">Surcharge</span>
              <span className="font-mono text-sm font-bold text-amber-300">
                +${priceAdjustment.toFixed(2)}
              </span>
            </div>
            <span className="text-indigo-300 font-bold">=</span>
            <div className="text-right">
              <span className="text-[10px] text-indigo-300 block">Final Selling Price</span>
              <span className="font-mono text-xl font-black text-emerald-300">
                ${finalSellingPrice.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Variant Name & SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Variant Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="SKU Identifier"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            error={errors.sku}
            required
          />
        </div>

        {/* Billing Metric & Active Toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Billing Metric
            </label>
            <select
              value={billingMetric}
              onChange={(e) => setBillingMetric(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="seat">Per User Seat</option>
              <option value="usage_gb">Storage Usage (GB)</option>
              <option value="api_calls">API Calls (10k batches)</option>
              <option value="flat">Flat Tier License</option>
            </select>
          </div>

          <div className="flex flex-col justify-end pb-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-xs font-semibold text-slate-800">
                Variant Active
              </span>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} rightIcon={<Plus className="w-3.5 h-3.5" />}>
            Attach Variant
          </Button>
        </div>
      </form>
    </Modal>
  );
};
