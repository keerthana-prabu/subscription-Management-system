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
import { DollarSign, Calendar, Shield } from 'lucide-react';

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
      billing_interval_count: Number(billingIntervalCount),
      billing_cycle: mapBillingCycle(billingInterval),
      trial_period_days: Number(trialPeriodDays),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      description: description.trim(),
      auto_close: autoClose,
      early_close_allowed: earlyCloseAllowed,
      pause_allowed: pauseAllowed,
      auto_renew: autoRenew,
      is_active: isActive,
      currency: 'USD',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={planToEdit ? `Edit Plan: ${planToEdit.name}` : 'Configure New Subscription Plan'}
      description="Define recurring billing cadences, trial periods, and automated lifecycle governance."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Basic Identification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Subscription Plan Name"
            placeholder="e.g. Enterprise Growth Tier"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            required
          />

          <Input
            label="Plan Identifier Code"
            placeholder="e.g. PLAN-GROWTH-M"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            required
          />
        </div>

        {/* Cadence & Pricing Section */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              Recurring Pricing & Billing Cadence
            </span>
            <span className="text-[10px] text-slate-400 font-mono">USD ($)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Input
              label="Recurring Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              error={errors.price}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Billing Interval <span className="text-rose-500">*</span>
              </label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value as PlanBillingInterval)}
                className="block w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly / Annual</option>
              </select>
            </div>

            <Input
              label="Interval Multiplier"
              type="number"
              min="1"
              value={billingIntervalCount}
              onChange={(e) => setBillingIntervalCount(parseInt(e.target.value, 10) || 1)}
              error={errors.intervalCount}
              helperText="e.g. 1 = every month, 3 = quarterly"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <Input
              label="Minimum Required Quantity"
              type="number"
              min="1"
              value={minQuantity}
              onChange={(e) => setMinQuantity(parseInt(e.target.value, 10) || 1)}
              error={errors.minQuantity}
              helperText="Minimum seat or license commitment"
              required
            />

            <Input
              label="Free Trial Window (Days)"
              type="number"
              min="0"
              value={trialPeriodDays}
              onChange={(e) => setTrialPeriodDays(parseInt(e.target.value, 10) || 0)}
              helperText="Set 0 for immediate payment upon activation"
            />
          </div>
        </div>

        {/* Schedule Windows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Availability Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
          />

          <Input
            label="Availability End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Lifecycle Policies Toggles */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Automated Lifecycle Governance Policies
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Contract Rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Toggle 1 */}
            <label className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Auto-Renew Subscription</span>
                <span className="text-slate-500 text-[11px]">Generate recurring invoice at end of term</span>
              </div>
            </label>

            {/* Toggle 2 */}
            <label className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Auto-Close on Default</span>
                <span className="text-slate-500 text-[11px]">Terminate subscription after failed payment retries</span>
              </div>
            </label>

            {/* Toggle 3 */}
            <label className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={pauseAllowed}
                onChange={(e) => setPauseAllowed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Allow Pause & Resume</span>
                <span className="text-slate-500 text-[11px]">Customers can suspend billing temporarily</span>
              </div>
            </label>

            {/* Toggle 4 */}
            <label className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={earlyCloseAllowed}
                onChange={(e) => setEarlyCloseAllowed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Early Termination Allowed</span>
                <span className="text-slate-500 text-[11px]">Permit cancellation before term expiration</span>
              </div>
            </label>
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Plan Description & Terms <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Detail entitlements, SLA tiers, or overage billing clauses..."
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
            {planToEdit ? 'Save Plan Changes' : 'Create Subscription Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
