import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Alert } from '../common/Alert';
import { api, ApiClientError } from '../../api/client';
import type { Invoice, Payment, PaymentCreatePayload, PaymentMethod } from '../../api/types';
import { useToast } from '../../context/ToastContext';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPayment: Payment, updatedInvoice?: Invoice) => void;
  preselectedInvoice?: Invoice | null;
  availableInvoices: Invoice[];
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedInvoice,
  availableInvoices,
}) => {
  const { showToast } = useToast();

  const num = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    return parseFloat(v || '0') || 0;
  };

  // Filter only payable invoices (posted or draft with open balance, excluding void)
  const payableInvoices = useMemo(() => {
    return availableInvoices.filter((inv) => {
      if (inv.status === 'void' || inv.status === 'paid') return false;
      const tot = num(inv.total_amount);
      const paid = num(inv.amount_paid);
      return tot - paid > 0;
    });
  }, [availableInvoices]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(0);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Identify active target invoice
  const targetInvoice = useMemo(() => {
    if (preselectedInvoice) return preselectedInvoice;
    return availableInvoices.find((inv) => inv.id === selectedInvoiceId) || payableInvoices[0] || null;
  }, [preselectedInvoice, selectedInvoiceId, availableInvoices, payableInvoices]);

  // Derived balance
  const invoiceTotal = num(targetInvoice?.total_amount);
  const invoicePaid = num(targetInvoice?.amount_paid);
  const remainingBalance = Math.max(0, invoiceTotal - invoicePaid);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const inv = preselectedInvoice || payableInvoices[0] || null;
      if (inv) {
        setSelectedInvoiceId(inv.id);
        const rem = Math.max(0, num(inv.total_amount) - num(inv.amount_paid));
        setAmount(rem > 0 ? rem : num(inv.total_amount));
      }
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
      setNotes('Reconciliation payment recorded for invoice settlement.');
    }
  }, [isOpen, preselectedInvoice, payableInvoices]);

  const handleInvoiceChange = (id: number) => {
    setSelectedInvoiceId(id);
    const chosen = availableInvoices.find((i) => i.id === id);
    if (chosen) {
      const rem = Math.max(0, num(chosen.total_amount) - num(chosen.amount_paid));
      setAmount(rem);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetInvoice) {
      setError('Please select an invoice to apply this payment to.');
      return;
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      setError('Payment amount must be greater than $0.00.');
      return;
    }

    if (payAmount > remainingBalance + 0.001) {
      setError(
        `Payment amount ($${payAmount.toFixed(2)}) exceeds remaining invoice balance ($${remainingBalance.toFixed(2)}). Overpayments are not supported.`
      );
      return;
    }

    if (!transactionRef.trim()) {
      setError('A transaction reference is required for audit reconciliation.');
      return;
    }

    setIsSubmitting(true);

    const payload: PaymentCreatePayload = {
      invoice_id: targetInvoice.id,
      amount: payAmount,
      currency: targetInvoice.currency || 'USD',
      payment_method: paymentMethod,
      transaction_reference: transactionRef.trim(),
      notes: notes.trim(),
      payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
    };

    try {
      const created = await api.payments.createPayment(payload);
      showToast('Payment transaction recorded successfully on backend!', 'success');

      // Update invoice locally
      const updatedTotalPaid = invoicePaid + payAmount;
      const isFullSettlement = updatedTotalPaid >= invoiceTotal - 0.01;
      const updatedInvoice: Invoice = {
        ...targetInvoice,
        amount_paid: updatedTotalPaid.toFixed(2),
        status: isFullSettlement ? 'paid' : 'posted',
        paid_at: isFullSettlement ? new Date().toISOString() : targetInvoice.paid_at,
        updated_at: new Date().toISOString(),
      };

      onSuccess(created, updatedInvoice);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 501) {
        // Honest 501 fallback
        const localPayment: Payment = {
          id: Date.now(),
          invoice_id: targetInvoice.id,
          invoice_number: targetInvoice.invoice_number,
          customer_id: targetInvoice.customer_id,
          customer_name: targetInvoice.customer_name,
          customer_email: targetInvoice.customer_email,
          amount: payAmount.toFixed(2),
          currency: targetInvoice.currency || 'USD',
          status: 'succeeded',
          payment_method: paymentMethod,
          transaction_reference: transactionRef.trim(),
          notes: notes.trim(),
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedTotalPaid = invoicePaid + payAmount;
        const isFullSettlement = updatedTotalPaid >= invoiceTotal - 0.01;
        const updatedInvoice: Invoice = {
          ...targetInvoice,
          amount_paid: updatedTotalPaid.toFixed(2),
          status: isFullSettlement ? 'paid' : 'posted',
          paid_at: isFullSettlement ? new Date().toISOString() : targetInvoice.paid_at,
          updated_at: new Date().toISOString(),
        };

        showToast(
          `Payment of $${payAmount.toFixed(2)} recorded in workspace (FastAPI POST /payments/payments returned 501 - Member 4 pending).`,
          'info'
        );
        onSuccess(localPayment, updatedInvoice);
        onClose();
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to record payment transaction.';
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
      title="Record Payment Settlement"
      description="Record and reconcile incoming client remittance against outstanding invoice balances."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Invoice Selector */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Target Invoice <span className="text-rose-500">*</span>
          </label>
          <select
            value={targetInvoice?.id || ''}
            onChange={(e) => handleInvoiceChange(parseInt(e.target.value, 10))}
            disabled={isSubmitting || Boolean(preselectedInvoice)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          >
            {preselectedInvoice ? (
              <option value={preselectedInvoice.id}>
                {preselectedInvoice.invoice_number} — {preselectedInvoice.customer_name} (Balance: $
                {remainingBalance.toFixed(2)})
              </option>
            ) : payableInvoices.length > 0 ? (
              payableInvoices.map((inv) => {
                const bal = Math.max(0, num(inv.total_amount) - num(inv.amount_paid));
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.customer_name} (Balance: ${bal.toFixed(2)} / Total: $
                    {num(inv.total_amount).toFixed(2)})
                  </option>
                );
              })
            ) : (
              <option value="">No outstanding invoices available</option>
            )}
          </select>
        </div>

        {/* Invoice Balance Preview Card */}
        {targetInvoice && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Invoice Total
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                ${invoiceTotal.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Already Settled
              </span>
              <span className="font-mono font-semibold text-emerald-600 text-sm">
                ${invoicePaid.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Remaining Balance
              </span>
              <span className="font-mono font-black text-indigo-600 text-sm">
                ${remainingBalance.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Amount & Method Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Payment Amount ($) <span className="text-rose-500">*</span></span>
              <button
                type="button"
                onClick={() => setAmount(remainingBalance)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Pay Full Balance
              </button>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                placeholder="0.00"
                disabled={isSubmitting}
                className="pl-7 font-mono font-bold"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Partial settlements are accepted up to ${remainingBalance.toFixed(2)}.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={isSubmitting}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="bank_transfer">Direct Bank Transfer / ACH / Wire</option>
              <option value="credit_card">Corporate Credit Card Reference</option>
              <option value="manual">Cash / Physical Check / Manual Settlement</option>
            </select>
          </div>
        </div>

        {/* Reference & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              Transaction Reference <span className="text-rose-500">*</span>
            </label>
            <Input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TXN-ACH-89420, ch_3M4o..."
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Settlement Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Reconciliation Memo & Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={isSubmitting}
            placeholder="Audit notes, wire transfer trace #, or payer account details..."
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
        </div>

        {/* Gateway Audit Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Reconciliation Notice:</strong> This action records a financial settlement against the double-entry invoice ledger. Transaction references are logged for audit compliance and do not execute external credit card token debits.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || !targetInvoice}>
            {isSubmitting ? 'Recording Settlement...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
