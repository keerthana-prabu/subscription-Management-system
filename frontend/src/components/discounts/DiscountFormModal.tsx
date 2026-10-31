import React, { useState, useEffect } from 'react';
import {
  Tag,
  Percent,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { api, ApiClientError } from '../../api/client';
import type { Discount, DiscountCreatePayload, DiscountType } from '../../api/types';
import { useToast } from '../../context/ToastContext';

interface DiscountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (discount: Discount) => void;
  discountToEdit?: Discount | null;
}

export const DiscountFormModal: React.FC<DiscountFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  discountToEdit,
}) => {
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [amount, setAmount] = useState<number | ''>(15);
  const [minPurchase, setMinPurchase] = useState<number | ''>('');
  const [minQuantity, setMinQuantity] = useState<number | ''>(1);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState<number | ''>(100);
  const [appliesTo, setAppliesTo] = useState<'all' | 'products' | 'subscriptions'>('all');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (discountToEdit) {
        setCode(discountToEdit.code);
        setName(discountToEdit.name || '');
        setDiscountType(discountToEdit.discount_type);
        setAmount(
          typeof discountToEdit.amount === 'number'
            ? discountToEdit.amount
            : parseFloat(discountToEdit.amount) || 0
        );
        setMinPurchase(discountToEdit.min_purchase_amount ?? '');
        setMinQuantity(discountToEdit.min_quantity ?? 1);
        setValidFrom(
          discountToEdit.valid_from ? discountToEdit.valid_from.split('T')[0] : ''
        );
        setValidUntil(
          discountToEdit.valid_until ? discountToEdit.valid_until.split('T')[0] : ''
        );
        setMaxUses(discountToEdit.max_uses ?? '');
        setAppliesTo(discountToEdit.applies_to || 'all');
        setIsActive(discountToEdit.is_active);
      } else {
        setCode('');
        setName('');
        setDiscountType('percentage');
        setAmount(15);
        setMinPurchase('');
        setMinQuantity(1);
        const today = new Date().toISOString().split('T')[0];
        setValidFrom(today);
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 60);
        setValidUntil(nextMonth.toISOString().split('T')[0]);
        setMaxUses(100);
        setAppliesTo('all');
        setIsActive(true);
      }
    }
  }, [isOpen, discountToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError('Discount voucher code is required.');
      return;
    }

    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      setError('Discount amount must be greater than zero.');
      return;
    }

    if (discountType === 'percentage' && (val <= 0 || val > 100)) {
      setError('Percentage discounts must be between 0% and 100%.');
      return;
    }

    if (validFrom && validUntil && new Date(validFrom) > new Date(validUntil)) {
      setError('Validity start date cannot be later than expiry date.');
      return;
    }

    setIsSubmitting(true);

    const payload: DiscountCreatePayload = {
      code: cleanCode,
      name: name.trim() || undefined,
      discount_type: discountType,
      amount: val,
      min_purchase_amount: minPurchase !== '' ? Number(minPurchase) : undefined,
      min_quantity: minQuantity !== '' ? Number(minQuantity) : undefined,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      max_uses: maxUses !== '' ? Number(maxUses) : null,
      applies_to: appliesTo,
      is_active: isActive,
    };

    try {
      let result: Discount;
      if (discountToEdit) {
        result = await api.billing.updateDiscount(discountToEdit.id, payload);
        showToast(`Discount ${cleanCode} updated successfully.`, 'success');
      } else {
        result = await api.billing.createDiscount(payload);
        showToast(`Discount ${cleanCode} created successfully.`, 'success');
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 501) {
        // Honest 501 fallback
        const localDiscount: Discount = {
          id: discountToEdit ? discountToEdit.id : Date.now(),
          code: cleanCode,
          name: payload.name,
          discount_type: payload.discount_type,
          amount: payload.amount,
          min_purchase_amount: payload.min_purchase_amount,
          min_quantity: payload.min_quantity,
          valid_from: payload.valid_from || undefined,
          valid_until: payload.valid_until || undefined,
          max_uses: payload.max_uses ?? undefined,
          usage_count: discountToEdit?.usage_count || 0,
          applies_to: payload.applies_to,
          is_active: payload.is_active ?? true,
          created_at: discountToEdit?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        showToast(
          `Discount ${cleanCode} saved in workspace (FastAPI billing discounts endpoint returned 501 - Member 3 pending).`,
          'info'
        );
        onSuccess(localDiscount);
        onClose();
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to save discount rule.';
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={discountToEdit ? `Edit Discount Rule: ${discountToEdit.code}` : 'Create Discount Voucher Rule'}
      description="Configure promotional percentage or fixed discounts with minimum spend and usage limits."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Code & Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              Voucher Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
              placeholder="e.g. SUMMER2026, WELCOME10"
              disabled={isSubmitting}
              className="font-mono font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Campaign / Rule Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer 2026 Growth Promo"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Type & Value */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Discount Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="percentage">Percentage Discount (%)</option>
              <option value="fixed_amount">Fixed Amount Deduction ($)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Discount Value <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={discountType === 'percentage' ? 100 : undefined}
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder={discountType === 'percentage' ? '15.00' : '50.00'}
                disabled={isSubmitting}
                className="font-mono font-bold"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {discountType === 'percentage' ? (
                  <Percent className="w-3.5 h-3.5" />
                ) : (
                  <span className="font-mono font-bold">$</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Minimum Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Min Purchase Spend ($)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={minPurchase}
              onChange={(e) =>
                setMinPurchase(e.target.value === '' ? '' : parseFloat(e.target.value))
              }
              placeholder="e.g. 100.00 (Optional)"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Min Line Quantity
            </label>
            <Input
              type="number"
              min="1"
              value={minQuantity}
              onChange={(e) =>
                setMinQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              placeholder="1"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Validity Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Valid From Date
            </label>
            <Input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Expiry / Valid Until
            </label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Usage Limit & Scope */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Max Redemption Uses
            </label>
            <Input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) =>
                setMaxUses(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              placeholder="e.g. 100 uses (Optional)"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Applicable Scope
            </label>
            <select
              value={appliesTo}
              onChange={(e) =>
                setAppliesTo(e.target.value as 'all' | 'products' | 'subscriptions')
              }
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="all">Entire Invoice (All Items)</option>
              <option value="subscriptions">Recurring Subscriptions Only</option>
              <option value="products">Product Catalog Items Only</option>
            </select>
          </div>
        </div>

        {/* Active Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Active Discount Voucher Rule
              </span>
              <p className="text-slate-500 text-[11px]">
                Active rules can be attached during quotation or invoice generation.
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Rule...' : discountToEdit ? 'Update Discount' : 'Create Discount'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

