import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type {
  SubscriptionPlan,
  SubscriptionPlanCreatePayload,
  PlanBillingInterval,
  BillingCycle,
} from '../../api/types';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionPlanCreatePayload) => Promise<void>;
  planToEdit?: SubscriptionPlan | null;
  isLoading?: boolean;
}

export const PlanFormModal: React.FC<PlanFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  planToEdit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [price, setPrice] = useState<number>(199);
  const [minQuantity, setMinQuantity] = useState<number>(1);
  const [billingInterval, setBillingInterval] = useState<PlanBillingInterval>('monthly');
  const [billingIntervalCount, setBillingIntervalCount] = useState<number>(1);
  const [trialPeriodDays, setTrialPeriodDays] = useState<number>(14);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  // Policy toggles
  const [autoClose, setAutoClose] = useState(true);
  const [earlyCloseAllowed, setEarlyCloseAllowed] = useState(true);
  const [pauseAllowed, setPauseAllowed] = useState(true);
  const [autoRenew, setAutoRenew] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setCode(planToEdit.code);
      setPrice(Number(planToEdit.base_price) || 0);
      setMinQuantity(planToEdit.min_quantity || 1);
      setBillingInterval(planToEdit.billing_interval || 'monthly');
      setBillingIntervalCount(planToEdit.billing_interval_count || 1);
      setTrialPeriodDays(planToEdit.trial_period_days || 0);
      setStartDate(planToEdit.start_date || '');
      setEndDate(planToEdit.end_date || '');
      setDescription(planToEdit.description || '');
      setAutoClose(planToEdit.auto_close ?? true);
      setEarlyCloseAllowed(planToEdit.early_close_allowed ?? true);
      setPauseAllowed(planToEdit.pause_allowed ?? true);
      setAutoRenew(planToEdit.auto_renew ?? true);
      setIsActive(planToEdit.is_active);
    } else {
      setName('');
      setCode(`PLAN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
      setPrice(199);
      setMinQuantity(1);
      setBillingInterval('monthly');
      setBillingIntervalCount(1);
      setTrialPeriodDays(14);
      setStartDate('');
      setEndDate('');
      setDescription('');
      setAutoClose(true);
      setEarlyCloseAllowed(true);
      setPauseAllowed(true);
      setAutoRenew(true);
      setIsActive(true);
    }
    setErrors({});
  }, [planToEdit, isOpen]);

  const mapBillingCycle = (interval: PlanBillingInterval): BillingCycle => {
    switch (interval) {
      case 'yearly':
        return 'annual';
      case 'daily':
      case 'weekly':
      case 'monthly':
      default:
        return 'monthly';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Plan name is required';
    if (!code.trim()) newErrors.code = 'Plan code is required';
    if (price < 0) newErrors.price = 'Price must be positive';
    if (minQuantity < 1) newErrors.minQuantity = 'Minimum quantity must be at least 1';
    if (billingIntervalCount < 1) newErrors.intervalCount = 'Interval count must be at least 1';

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'End date cannot precede availability start date';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      base_price: Number(price),
      min_quantity: Number(minQuantity),
      billing_interval: billingInterval,
      billing_cycle: mapBillingCycle(billingInterval),
      billing_interval_count: Number(billingIntervalCount),
      trial_period_days: Number(trialPeriodDays),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      description: description.trim(),
      auto_close: autoClose,
      early_close_allowed: earlyCloseAllowed,
      pause_allowed: pauseAllowed,
      auto_renew: autoRenew,
      is_active: isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={planToEdit ? `Edit Subscription Plan: ${planToEdit.name}` : 'Create Subscription Plan'}
      description="Configure recurring cadence, pricing policies, and lifecycle management rules."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Plan Name"
            placeholder="e.g. Growth Enterprise Plan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="Plan Code"
            placeholder="e.g. PLAN-GROWTH-M"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Recurring Base Price ($ USD)"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            error={errors.price}
            required
          />

          <Input
            label="Minimum Quantity"
            type="number"
            min="1"
            value={minQuantity}
            onChange={(e) => setMinQuantity(parseInt(e.target.value, 10) || 1)}
            error={errors.minQuantity}
            required
          />

          <Input
            label="Trial Period (Days)"
            type="number"
            min="0"
            value={trialPeriodDays}
            onChange={(e) => setTrialPeriodDays(parseInt(e.target.value, 10) || 0)}
          />
        </div>

        {/* Billing Cadence Configuration */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Billing Interval & Recurrence
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Billing Frequency
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as PlanBillingInterval)}
                className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <Input
              label="Every N Intervals (Interval Count)"
              type="number"
              min="1"
              value={billingIntervalCount}
              onChange={(e) => setBillingIntervalCount(parseInt(e.target.value, 10) || 1)}
              error={errors.intervalCount}
              helperText={`e.g. Every ${billingIntervalCount} ${billingInterval}(s)`}
              required
            />
          </div>
        </div>

        {/* Plan Availability Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Availability Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            helperText="Optional release date"
          />

          <Input
            label="Availability End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
            helperText="Optional sunset / promo end date"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Plan Description & Terms
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plan terms, included features, and subscription entitlements..."
            className="block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        {/* Lifecycle Policies Checkboxes */}
        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-slate-800 block">Subscription Lifecycle Rules:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Auto-close upon unpaid invoice grace period</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={earlyCloseAllowed}
                onChange={(e) => setEarlyCloseAllowed(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow customer early contract termination</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pauseAllowed}
                onChange={(e) => setPauseAllowed(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow pausing active subscription cycle</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Automatic renewal at period end</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <input
            type="checkbox"
            id="plan_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <label htmlFor="plan_active" className="text-xs font-medium text-slate-700 select-none cursor-pointer">
            Plan published and available for subscription orders
          </label>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isLoading}>
            {planToEdit ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

