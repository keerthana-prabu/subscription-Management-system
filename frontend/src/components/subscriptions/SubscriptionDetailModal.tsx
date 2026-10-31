import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Subscription, UserRole } from '../../api/types';
import {
  Repeat,
  Calendar,
  PauseCircle,
  PlayCircle,
  XCircle,
  FileSpreadsheet,
  Receipt,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SubscriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  userRole?: UserRole;
  onPause: (subscription: Subscription, reason: string) => Promise<void>;
  onResume: (subscription: Subscription) => Promise<void>;
  onCancel: (subscription: Subscription, reason: string) => Promise<void>;
  onRenew: (subscription: Subscription) => Promise<void>;
  onActivate: (subscription: Subscription) => Promise<void>;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  isOpen,
  onClose,
  subscription,
  userRole = 'admin',
  onPause,
  onResume,
  onCancel,
  onRenew,
  onActivate,
}) => {
  const [confirmAction, setConfirmAction] = useState<
    'pause' | 'resume' | 'cancel' | 'renew' | 'activate' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!subscription) return null;

  const isAdminOrSales = userRole === 'admin' || userRole === 'sales';

  // Lifecycle steps for the visual stepper
  const LIFECYCLE_STEPS = [
    { key: 'draft', label: 'Draft' },
    { key: 'quotation', label: 'Quotation' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'active', label: 'Active' },
    { key: 'closed', label: 'Closed' },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'draft':
        return 0;
      case 'paused':
      case 'active':
        return 3;
      case 'cancelled':
      case 'expired':
        return 4;
      default:
        return 3;
    }
  };

  const currentStepIdx = getStepIndex(subscription.status);

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    setIsActionLoading(true);
    try {
      if (confirmAction === 'pause') {
        await onPause(subscription, actionReason || 'Customer requested pause');
      } else if (confirmAction === 'resume') {
        await onResume(subscription);
      } else if (confirmAction === 'cancel') {
        await onCancel(subscription, actionReason || 'Terminated contract');
      } else if (confirmAction === 'renew') {
        await onRenew(subscription);
      } else if (confirmAction === 'activate') {
        await onActivate(subscription);
      }
      setConfirmAction(null);
      setActionReason('');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Subscription ${subscription.subscription_number || `#SUB-2026-00${subscription.id}`}`}
      description="Active contract specifications, billing cadence, and lifecycle governance."
      maxWidth="xl"
    >
      <div className="space-y-6 text-left">
        {/* Visual Lifecycle Stepper */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
            <span>Lifecycle Progress</span>
            <span className="font-mono text-indigo-700 capitalize">
              Current: {subscription.status}
            </span>
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs ${
                      isCurrent
                        ? subscription.status === 'paused'
                          ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                          : subscription.status === 'cancelled'
                          ? 'bg-rose-500 text-white ring-4 ring-rose-100'
                          : 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold ${
                      isCurrent ? 'text-indigo-900 font-bold' : isPast ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Header Price Banner */}
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-violet-950 text-white rounded-2xl shadow-md border border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
              Contract Value & Billing Cadence
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              ${Number(subscription.total_amount || 199).toFixed(2)}{' '}
              <span className="text-xs font-semibold text-indigo-200">
                {subscription.currency || 'USD'} / {subscription.billing_interval || 'month'}
              </span>
            </div>
            <div className="text-xs text-indigo-200/80 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              <span>Next Invoicing Date: <strong>{subscription.next_billing_date || subscription.current_period_end}</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                subscription.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : subscription.status === 'paused'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  subscription.status === 'active'
                    ? 'bg-emerald-400 animate-pulse'
                    : subscription.status === 'paused'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              {subscription.status}
            </span>

            <span className="text-[11px] text-indigo-200">
              Plan: <strong className="text-white">{subscription.plan_name || 'Standard Tier'}</strong>
            </span>
          </div>
        </div>

        {/* Specifications Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Customer Account
            </span>
            <div className="font-bold text-slate-900">{subscription.customer_name || 'Customer Account'}</div>
            <div className="text-slate-500 text-[11px] truncate">{subscription.customer_email || 'client@brightloop.io'}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Period Validity
            </span>
            <div className="font-semibold text-slate-800">
              Start: {subscription.start_date ? subscription.start_date.split('T')[0] : 'Immediate'}
            </div>
            <div className="text-slate-500 text-[11px]">
              End: {subscription.current_period_end ? subscription.current_period_end.split('T')[0] : 'Ongoing'}
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Terms & Renewal
            </span>
            <div className="font-semibold text-slate-800">{subscription.payment_terms || 'Net 30 Invoicing'}</div>
            <div className="text-emerald-700 font-semibold text-[11px]">
              {subscription.auto_renew ? '✓ Auto-Renew Active' : 'Manual Renewal'}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        {subscription.items && subscription.items.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Provisioned Line Items & Surcharges</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Item Specification</th>
                    <th className="px-3.5 py-2.5">SKU</th>
                    <th className="px-2 py-2.5 text-center">Commitment Qty</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {subscription.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        {item.product_name || item.variant_name || `Line Item #${item.variant_id}`}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500">
                        {item.sku || 'SKU-PROD-BASE'}
                      </td>
                      <td className="px-2 py-2.5 text-center font-semibold">{item.quantity}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                        ${Number(item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Related Documents links */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-600">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Associated Billing Reference:</span>
            <span className="font-mono font-bold text-slate-900">
              INV-2026-00{subscription.id + 10}
            </span>
          </div>

          {subscription.related_quotation_id && (
            <div className="text-indigo-700 font-semibold flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Origin Quotation: #QUO-2026-00{subscription.related_quotation_id}</span>
            </div>
          )}
        </div>

        {/* Modal Action Controls (Lifecycle Transitions) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Draft status actions */}
            {subscription.status === 'draft' && isAdminOrSales && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmAction('activate')}
                leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
              >
                Activate Subscription
              </Button>
            )}

            {/* Active status actions */}
            {subscription.status === 'active' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmAction('pause')}
                  leftIcon={<PauseCircle className="w-3.5 h-3.5 text-amber-600" />}
                >
                  Pause
                </Button>

                {isAdminOrSales && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmAction('renew')}
                    leftIcon={<Repeat className="w-3.5 h-3.5 text-indigo-600" />}
                  >
                    Renew Term
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmAction('cancel')}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Cancel Contract
                </Button>
              </>
            )}

            {/* Paused status actions */}
            {subscription.status === 'paused' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setConfirmAction('resume')}
                  leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                >
                  Resume Subscription
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmAction('cancel')}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Terminate
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Lifecycle Transitions */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={Boolean(confirmAction)}
          title={`Confirm ${confirmAction.toUpperCase()} Subscription`}
          message={
            confirmAction === 'pause'
              ? `Are you sure you want to pause subscription ${subscription.subscription_number || subscription.id}? Billing will be temporarily suspended.`
              : confirmAction === 'resume'
              ? `Resume subscription ${subscription.subscription_number || subscription.id} and restart automated recurring invoicing?`
              : confirmAction === 'cancel'
              ? `Terminate subscription contract ${subscription.subscription_number || subscription.id}? This will close the billing lifecycle according to plan rules.`
              : confirmAction === 'renew'
              ? `Renew subscription ${subscription.subscription_number || subscription.id} for another standard billing interval?`
              : `Activate subscription ${subscription.subscription_number || subscription.id}?`
          }
          confirmLabel={`Confirm ${confirmAction}`}
          isDestructive={confirmAction === 'cancel' || confirmAction === 'pause'}
          isLoading={isActionLoading}
          onConfirm={handleExecuteAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </Modal>
  );
};
