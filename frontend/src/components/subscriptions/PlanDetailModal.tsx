import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { SubscriptionPlan } from '../../api/types';
import { Edit2, Calendar, Check, X } from 'lucide-react';

interface PlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  isAdmin: boolean;
  onEdit: (plan: SubscriptionPlan) => void;
}

export const PlanDetailModal: React.FC<PlanDetailModalProps> = ({
  isOpen,
  onClose,
  plan,
  isAdmin,
  onEdit,
}) => {
  if (!plan) return null;

  const priceNum = Number(plan.base_price) || 0;
  const interval = plan.billing_interval || plan.billing_cycle || 'monthly';
  const intervalCount = plan.billing_interval_count || 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan.name}
      description={`Plan details for code ${plan.code}`}
      maxWidth="md"
    >
      <div className="space-y-5 text-left">
        {/* Header price banner */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              Recurring Price
            </span>
            <div className="text-xl font-extrabold text-indigo-700 font-mono">
              ${priceNum.toFixed(2)} <span className="text-xs font-normal text-slate-500">{plan.currency || 'USD'}</span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Billed every {intervalCount > 1 ? `${intervalCount} ` : ''}{interval}
            </div>
          </div>
          <div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                plan.is_active
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {plan.is_active ? 'Active' : 'Archived'}
            </span>
          </div>
        </div>

        {/* Specifications grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Minimum Units</span>
            <span className="font-semibold text-slate-800">{plan.min_quantity || 1} seat(s)</span>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Free Trial</span>
            <span className="font-semibold text-slate-800">
              {plan.trial_period_days ? `${plan.trial_period_days} Days` : 'No Trial'}
            </span>
          </div>
        </div>

        {/* Availability window */}
        {(plan.start_date || plan.end_date) && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="font-bold text-slate-700 block flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Availability Schedule</span>
            </span>
            <div className="flex justify-between text-slate-600">
              <span>Start: {plan.start_date || 'Immediate'}</span>
              <span>End: {plan.end_date || 'No expiration'}</span>
            </div>
          </div>
        )}

        {/* Description */}
        {plan.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Plan Terms & Entitlements
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
              {plan.description}
            </p>
          </div>
        )}

        {/* Lifecycle rules checklist */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-slate-800 block">Lifecycle Policies:</span>
          <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
            <div className="flex items-center space-x-1.5">
              {plan.auto_close ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>Auto-close on default</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {plan.early_close_allowed ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>Early closure allowed</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {plan.pause_allowed ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>Pause subscriptions</span>
            </div>
            <div className="flex items-center space-x-1.5">
              {plan.auto_renew ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <X className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span>Auto-renew cycle</span>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(plan)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Plan
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
