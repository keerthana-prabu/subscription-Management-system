import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type {
  SubscriptionPlan,
  Product,
  SubscriptionCreatePayload,
} from '../../api/types';
import { Calendar } from 'lucide-react';

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubscriptionCreatePayload) => Promise<void>;
  plans: SubscriptionPlan[];
  products: Product[];
  isLoading?: boolean;
}

const DEMO_CUSTOMERS = [
  { id: 1, name: 'Acme Corporation', email: 'billing@acme.com' },
  { id: 2, name: 'Wayne Enterprises', email: 'finance@wayne.com' },
  { id: 3, name: 'Cyberdyne Systems', email: 'accounts@cyberdyne.io' },
  { id: 4, name: 'Brightloop Client Portal', email: 'customer@brightloop.io' },
];

export const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  plans,
  products,
  isLoading = false,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const [customerName, setCustomerName] = useState(DEMO_CUSTOMERS[0].name);
  const [customerEmail, setCustomerEmail] = useState(DEMO_CUSTOMERS[0].email);

  const [selectedPlanId, setSelectedPlanId] = useState<number>(plans[0]?.id || 1);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Invoicing');
  const [autoRenew, setAutoRenew] = useState(true);

  // Line items
  const [items, setItems] = useState<
    Array<{
      variant_id: number;
      quantity: number;
      unit_price: number;
      product_name: string;
      variant_name: string;
      sku: string;
    }>
  >([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId(DEMO_CUSTOMERS[0].id);
      setCustomerName(DEMO_CUSTOMERS[0].name);
      setCustomerEmail(DEMO_CUSTOMERS[0].email);
      setSelectedPlanId(plans[0]?.id || 1);
      setStartDate(new Date().toISOString().split('T')[0]);
      setPaymentTerms('Net 30 Invoicing');
      setAutoRenew(true);

      // Default line item from products
      if (products.length > 0 && products[0].variants?.length > 0) {
        const p = products[0];
        const v = p.variants[0];
        setItems([
          {
            variant_id: v.id,
            quantity: 1,
            unit_price: Number(v.base_price) || 120,
            product_name: p.name,
            variant_name: v.name,
            sku: v.sku,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, plans, products]);

  const handleCustomerChange = (customerId: number) => {
    setSelectedCustomerId(customerId);
    const found = DEMO_CUSTOMERS.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerEmail(found.email);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      customer_id: selectedCustomerId,
      customer_name: customerName,
      customer_email: customerEmail,
      plan_id: selectedPlanId,
      start_date: startDate,
      auto_renew: autoRenew,
      payment_terms: paymentTerms,
      items: items.map((i) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        product_name: i.product_name,
        variant_name: i.variant_name,
        sku: i.sku,
      })),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision Customer Subscription Contract"
      description="Create a recurring subscription lifecycle with billing cadence, commitments, and attached SKUs."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4.5 text-left">
        {/* Customer & Plan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Customer Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(Number(e.target.value))}
              className="block w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              {DEMO_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Subscription Plan <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(Number(e.target.value))}
              className="block w-full rounded-xl border border-slate-300 py-2.5 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${Number(p.base_price).toFixed(2)} / {p.billing_interval || p.billing_cycle})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Start Date & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contract Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4" />}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Terms
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="Net 30 Invoicing">Net 30 Invoicing</option>
              <option value="Net 15 Invoicing">Net 15 Invoicing</option>
              <option value="Immediate Auto-Charge">Immediate Auto-Charge (Credit Card)</option>
              <option value="Due Upon Receipt">Due Upon Receipt</option>
            </select>
          </div>
        </div>

        {/* Plan Summary Preview Card */}
        {selectedPlan && (
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 to-slate-50 rounded-2xl border border-indigo-100/90 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">{selectedPlan.name}</span>
              <span className="text-slate-500 text-[11px]">
                Cadence: Billed every {selectedPlan.billing_interval_count > 1 ? `${selectedPlan.billing_interval_count} ` : ''}
                {selectedPlan.billing_interval || selectedPlan.billing_cycle}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-indigo-700 font-mono">
                ${Number(selectedPlan.base_price).toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block">USD recurring</span>
            </div>
          </div>
        )}

        {/* Auto Renew Toggle */}
        <div className="pt-1">
          <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-700 select-none">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(e) => setAutoRenew(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-semibold">Auto-renew contract at period conclusion</span>
          </label>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Create Subscription
          </Button>
        </div>
      </form>
    </Modal>
  );
};
