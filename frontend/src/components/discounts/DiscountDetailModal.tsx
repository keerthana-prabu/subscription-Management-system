import React, { useState } from 'react';
import {
  Tag,
  Calendar,
  Layers,
  AlertCircle,
  Edit,
  PowerOff,
  Power,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Discount } from '../../api/types';

interface DiscountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  discount: Discount | null;
  onEdit: (discount: Discount) => void;
  onToggleActive: (discount: Discount) => void;
}

export const DiscountDetailModal: React.FC<DiscountDetailModalProps> = ({
  isOpen,
  onClose,
  discount,
  onEdit,
  onToggleActive,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);

  if (!discount) return null;

  const isAdmin = user?.role === 'admin';

  const num = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    return parseFloat(v || '0') || 0;
  };

  const discountVal = num(discount.amount);
  const isExpired =
    discount.valid_until && new Date(discount.valid_until).getTime() < Date.now();
  const isExhausted =
    discount.max_uses !== undefined &&
    discount.usage_count !== undefined &&
    discount.usage_count >= discount.max_uses;

  const usagePercent =
    discount.max_uses && discount.max_uses > 0
      ? Math.min(100, Math.round(((discount.usage_count || 0) / discount.max_uses) * 100))
      : 0;

  const handleDeactivate = () => {
    onToggleActive({
      ...discount,
      is_active: !discount.is_active,
      updated_at: new Date().toISOString(),
    });
    setIsConfirmingDeactivate(false);
    showToast(
      `Discount rule ${discount.code} is now ${discount.is_active ? 'deactivated' : 'activated'}.`,
      'info'
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Discount Rule: ${discount.code}`}
        description="Voucher rule configuration, eligibility constraints, and redemption usage tracking."
        maxWidth="lg"
      >
        <div className="space-y-6 text-left">
          {/* Header Card */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  {discount.code}
                </span>
                {isExpired ? (
                  <Badge variant="rose" label="EXPIRED" />
                ) : isExhausted ? (
                  <Badge variant="amber" label="EXHAUSTED" />
                ) : discount.is_active ? (
                  <Badge variant="emerald" label="ACTIVE" />
                ) : (
                  <Badge variant="slate" label="INACTIVE" />
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900 pt-1">
                {discount.name || 'Promotional Campaign Voucher'}
              </h4>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Discount Benefit
              </span>
              <span className="text-xl font-black text-slate-900 font-mono">
                {discount.discount_type === 'percentage'
                  ? `${discountVal.toFixed(0)}% OFF`
                  : `$${discountVal.toFixed(2)} OFF`}
              </span>
            </div>
          </div>

          {/* Usage Progress Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Redemption Usage Limit</span>
              <span className="font-mono text-slate-600 font-medium">
                {discount.usage_count || 0} / {discount.max_uses ? `${discount.max_uses} redemptions` : 'Unlimited'}
              </span>
            </div>
            {discount.max_uses ? (
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExhausted ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                No maximum redemption cap assigned. Available for all valid customer transactions.
              </p>
            )}
          </div>

          {/* Eligibility Conditions Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-slate-400" />
                Minimum Spend Requirement
              </span>
              <p className="font-mono font-bold text-slate-900">
                {discount.min_purchase_amount
                  ? `$${num(discount.min_purchase_amount).toFixed(2)} minimum subtotal`
                  : 'No minimum spend'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-slate-400" />
                Minimum Line Quantity
              </span>
              <p className="font-mono font-bold text-slate-900">
                {discount.min_quantity
                  ? `${discount.min_quantity} item(s) minimum`
                  : '1 item minimum'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                Validity Window
              </span>
              <p className="text-slate-700">
                {discount.valid_from
                  ? new Date(discount.valid_from).toLocaleDateString()
                  : 'Immediate'}{' '}
                &rarr;{' '}
                {discount.valid_until
                  ? new Date(discount.valid_until).toLocaleDateString()
                  : 'No expiry'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-1">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-slate-400" />
                Applicability Scope
              </span>
              <p className="font-medium text-slate-800 capitalize">
                {discount.applies_to === 'subscriptions'
                  ? 'Subscriptions Only'
                  : discount.applies_to === 'products'
                  ? 'Products Catalog Only'
                  : 'All Line Items & Plans'}
              </p>
            </div>
          </div>

          {/* Inactive or Warning Notice */}
          {!discount.is_active && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                This discount rule is currently deactivated and will not be accepted on new quotations or invoices.
              </span>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingDeactivate(true)}
                  className={
                    discount.is_active
                      ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                      : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                  }
                >
                  {discount.is_active ? (
                    <>
                      <PowerOff className="w-3.5 h-3.5 mr-1.5" /> Deactivate Rule
                    </>
                  ) : (
                    <>
                      <Power className="w-3.5 h-3.5 mr-1.5" /> Activate Rule
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(discount);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Parameters
                </Button>
              </div>
            )}

            <Button type="button" variant="secondary" size="sm" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        isOpen={isConfirmingDeactivate}
        title={discount.is_active ? 'Deactivate Discount Rule' : 'Activate Discount Rule'}
        message={`Are you sure you want to ${
          discount.is_active ? 'deactivate' : 'activate'
        } discount voucher ${discount.code}? ${
          discount.is_active
            ? 'Clients will no longer be able to apply this discount.'
            : 'Clients will be able to redeem this discount code on eligible orders.'
        }`}
        confirmLabel={discount.is_active ? 'Deactivate' : 'Activate'}
        isDestructive={discount.is_active}
        onConfirm={handleDeactivate}
        onCancel={() => setIsConfirmingDeactivate(false)}
      />
    </>
  );
};

