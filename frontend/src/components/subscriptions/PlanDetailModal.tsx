import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { SubscriptionPlan } from '../../api/types';
import { Edit2, Calendar, Check, X, Shield, Repeat } from 'lucide-react';

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
      description={`Subscription contract specifications for code ${plan.code}`}
      maxWidth="md"
    >
      <div className="space-y-5 text-left">
        {/* Header price banner */}
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-violet-950 text-white rounded-2xl shadow-md border border-indigo-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
              Recurring Price
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              ${priceNum.toFixed(2)}{' '}
              <span className="text-xs font-semibold text-indigo-200">
                {plan.currency || 'USD'} / {intervalCount > 1 ? `${intervalCount} ` : ''}{interval}
              </span>
            </div>
            <div className="text-xs text-indigo-200/80 mt-1 flex items-center gap-1">
              <Repeat className="w-3.5 h-3.5 text-indigo-300" />
              <span>Automated recurring invoicing cadence</span>
            </div>
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                plan.is_active
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${plan.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}
              />
              {plan.is_active ? 'Active' : 'Archived'}
            </span>
          </div>
        </div>

        {/* Specifications grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Minimum Commitment
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {plan.min_quantity || 1} seat(s)
            </span>
          </div>
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Free Trial Window
            </span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {plan.trial_period_days ? `${plan.trial_period_days} Days Free` : 'No Free Trial'}
            </span>
          </div>
        </div>

        {/* Availability window */}
        {(plan.start_date || plan.end_date) && (
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1">
            <span className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Catalog Availability Schedule</span>
            </span>
            <div className="flex justify-between text-slate-600 pt-1">
              <span>Start: <strong className="text-slate-800">{plan.start_date || 'Immediate'}</strong></span>
              <span>End: <strong className="text-slate-800">{plan.end_date || 'Indefinite'}</strong></span>
            </div>
          </div>
        )}

        {/* Description */}
        {plan.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Plan Terms & Entitlements
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed whitespace-pre-wrap">
              {plan.description}
            </p>
          </div>
        )}

        {/* Lifecycle rules checklist */}
        <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Automated Lifecycle Policy Flags
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px] pt-1">
            <div className="flex items-center space-x-2">
              {plan.auto_renew ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span className={plan.auto_renew ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                Auto-Renew
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {plan.auto_close ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span className={plan.auto_close ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                Auto-Close on Default
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {plan.pause_allowed ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span className={plan.pause_allowed ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                Pause & Resume Allowed
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {plan.early_close_allowed ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-slate-300 shrink-0" />
              )}
              <span className={plan.early_close_allowed ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                Early Termination
              </span>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            Registered: {new Date(plan.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEdit(plan)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Plan
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
