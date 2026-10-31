import React, { useState } from 'react';
import { Percent, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { api, ApiClientError } from '../../api/client';
import type { TaxRate, TaxRateCreatePayload } from '../../api/types';
import { useToast } from '../../context/ToastContext';

interface TaxRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTax: TaxRate) => void;
}

export const TaxRuleModal: React.FC<TaxRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [ratePercentage, setRatePercentage] = useState<number | ''>(10.0);
  const [country, setCountry] = useState('US');
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setRatePercentage(10.0);
    setCountry('US');
    setIsActive(true);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Tax rule name is required.');
      return;
    }

    if (ratePercentage === '' || isNaN(Number(ratePercentage)) || Number(ratePercentage) < 0 || Number(ratePercentage) > 100) {
      setError('Rate percentage must be between 0% and 100%.');
      return;
    }

    if (!country.trim() || country.trim().length !== 2) {
      setError('Country must be a 2-letter ISO code (e.g. US, GB, DE, IN).');
      return;
    }

    setIsSubmitting(true);

    const payload: TaxRateCreatePayload = {
      name: name.trim(),
      rate_percentage: Number(ratePercentage),
      country: country.trim().toUpperCase(),
      is_active: isActive,
    };

    try {
      const created = await api.billing.createTax(payload);
      showToast('Tax rule created successfully on backend!', 'success');
      onSuccess(created);
      handleClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 501) {
        // Transparent 501 fallback
        const localCreated: TaxRate = {
          id: Date.now(),
          name: payload.name,
          rate_percentage: payload.rate_percentage,
          country: payload.country,
          is_active: payload.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        showToast('Tax rule recorded (FastAPI POST /billing/taxes returned 501 - Member 3 pending).', 'info');
        onSuccess(localCreated);
        handleClose();
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to create tax rule';
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Tax Rate Rule"
      description="Configure regional VAT, GST, or local sales tax percentages applied to invoices."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Tax Rule Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard VAT, California Sales Tax, GST India"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Rate Percentage (%) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={ratePercentage}
                onChange={(e) => setRatePercentage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="20.00"
                disabled={isSubmitting}
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Percent className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Values between 0.00% and 100.00%</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Jurisdiction / Country Code <span className="text-rose-500">*</span>
            </label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="US"
              maxLength={2}
              disabled={isSubmitting}
              required
            />
            <p className="text-[11px] text-slate-400">2-letter ISO (US, GB, DE, IN, FR)</p>
          </div>
        </div>

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
                Active Tax Rate
              </span>
              <p className="text-slate-500 text-[11px]">
                Active tax rules are selectable when compiling line items on invoices.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Rule...' : 'Save Tax Rule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
