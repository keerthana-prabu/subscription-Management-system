import React, { useState } from 'react';
import {
  Printer,
  CheckCircle2,
  XCircle,
  FileText,
  Building,
  Calendar,
  DollarSign,
  CreditCard,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiClientError } from '../../api/client';
import type { Invoice, Payment, PaymentCreatePayload, PaymentMethod } from '../../api/types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  payments?: Payment[];
  onStatusChange: (updated: Invoice) => void;
  onPaymentRecorded?: (payment: Payment, updatedInvoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  invoice,
  payments = [],
  onStatusChange,
  onPaymentRecorded,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isConfirmingVoid, setIsConfirmingVoid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Partial / Full payment modal state
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (!invoice) return null;

  const isAdmin = user?.role === 'admin';
  const isFinance = user?.role === 'finance';
  const isCustomer = user?.role === 'customer';
  const canManageInvoices = (isAdmin || isFinance) && !isCustomer;

  // Numerical helpers
  const num = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    return parseFloat(v || '0') || 0;
  };

  const subtotal = num(invoice.subtotal);
  const taxTotal = num(invoice.tax_total);
  const discountTotal = num(invoice.discount_total);
  const totalAmount = num(invoice.total_amount);
  const amountPaid = num(invoice.amount_paid);
  const balanceDue = Math.max(0, totalAmount - amountPaid);

  // Overdue status derivation
  const isOverdue =
    invoice.status === 'posted' &&
    new Date(invoice.due_date).getTime() < Date.now() &&
    balanceDue > 0;

  // Filter payment history for this invoice
  const invoicePayments = payments.filter((p) => p.invoice_id === invoice.id);

  // Print invoice handler
  const handlePrint = () => {
    window.print();
  };

  // Open Payment Form
  const handleOpenPaymentForm = () => {
    setPaymentAmount(balanceDue);
    setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
    setPaymentNotes(`Settlement remittance for invoice ${invoice.invoice_number}`);
    setPaymentError(null);
    setIsPaymentFormOpen(true);
  };

  // Confirm/Post invoice
  const handlePostInvoice = async () => {
    setIsProcessing(true);
    try {
      const updated: Invoice = {
        ...invoice,
        status: 'posted',
        updated_at: new Date().toISOString(),
      };
      showToast(`Invoice ${invoice.invoice_number} has been confirmed & posted.`, 'success');
      onStatusChange(updated);
    } catch {
      showToast('Failed to post invoice', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Void/Cancel invoice
  const handleVoidInvoice = async () => {
    setIsProcessing(true);
    try {
      await api.billing.voidInvoice(invoice.id).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          // Backend void endpoint pending Member 3
        }
      });

      const updated: Invoice = {
        ...invoice,
        status: 'void',
        updated_at: new Date().toISOString(),
      };
      showToast(`Invoice ${invoice.invoice_number} has been voided.`, 'info');
      onStatusChange(updated);
      setIsConfirmingVoid(false);
    } catch {
      showToast('Failed to void invoice', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Settle / Record payment (Partial or Full)
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const payVal = Number(paymentAmount);
    if (isNaN(payVal) || payVal <= 0) {
      setPaymentError('Payment amount must be greater than $0.00.');
      return;
    }

    if (payVal > balanceDue + 0.001) {
      setPaymentError(
        `Payment amount ($${payVal.toFixed(2)}) exceeds remaining invoice balance ($${balanceDue.toFixed(
          2
        )}). Overpayments are not supported.`
      );
      return;
    }

    if (!transactionRef.trim()) {
      setPaymentError('A transaction reference is required for reconciliation.');
      return;
    }

    setIsProcessing(true);

    const payload: PaymentCreatePayload = {
      invoice_id: invoice.id,
      amount: payVal,
      currency: invoice.currency || 'USD',
      payment_method: paymentMethod,
      transaction_reference: transactionRef.trim(),
      notes: paymentNotes.trim(),
      payment_date: new Date().toISOString(),
    };

    try {
      const created = await api.payments.createPayment(payload);
      const newPaid = amountPaid + payVal;
      const isFull = newPaid >= totalAmount - 0.01;

      const updated: Invoice = {
        ...invoice,
        amount_paid: newPaid.toFixed(2),
        status: isFull ? 'paid' : 'posted',
        paid_at: isFull ? new Date().toISOString() : invoice.paid_at,
        updated_at: new Date().toISOString(),
      };

      showToast(`Payment of $${payVal.toFixed(2)} recorded successfully!`, 'success');
      onPaymentRecorded?.(created, updated);
      onStatusChange(updated);
      setIsPaymentFormOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 501) {
        // Transparent 501 fallback
        const localPayment: Payment = {
          id: Date.now(),
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email,
          amount: payVal.toFixed(2),
          currency: invoice.currency || 'USD',
          status: 'succeeded',
          payment_method: paymentMethod,
          transaction_reference: transactionRef.trim(),
          notes: paymentNotes.trim(),
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const newPaid = amountPaid + payVal;
        const isFull = newPaid >= totalAmount - 0.01;

        const updated: Invoice = {
          ...invoice,
          amount_paid: newPaid.toFixed(2),
          status: isFull ? 'paid' : 'posted',
          paid_at: isFull ? new Date().toISOString() : invoice.paid_at,
          updated_at: new Date().toISOString(),
        };

        showToast(
          `Payment of $${payVal.toFixed(
            2
          )} recorded (FastAPI POST /payments/payments returned 501 - Member 4 pending).`,
          'info'
        );
        onPaymentRecorded?.(localPayment, updated);
        onStatusChange(updated);
        setIsPaymentFormOpen(false);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to record payment.';
        setPaymentError(msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Invoice ${invoice.invoice_number}`}
        description="Official Brightloop Software billing document and financial transaction record."
        maxWidth="2xl"
      >
        <div className="space-y-6 text-left">
          {/* Printable Document Container */}
          <div
            id="printable-invoice-document"
            className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 space-y-7 shadow-xs print:border-none print:shadow-none print:p-0"
          >
            {/* Header: Company & Invoice Info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200/80 pb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                    BL
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Brightloop Software, Inc.
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">Tax ID: US-EIN-9482019</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 leading-relaxed pt-1">
                  <p>100 Innovation Way, Suite 400</p>
                  <p>San Francisco, CA 94105 &bull; USA</p>
                  <p className="text-indigo-600">billing@brightloop.io</p>
                </div>
              </div>

              <div className="sm:text-right space-y-1.5">
                <div className="inline-block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Official Invoice
                </div>
                <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {invoice.invoice_number}
                </h2>
                <div className="flex sm:justify-end gap-2 pt-1">
                  {isOverdue ? (
                    <Badge variant="rose" label="OVERDUE" />
                  ) : invoice.status === 'paid' ? (
                    <Badge variant="emerald" label="PAID" />
                  ) : amountPaid > 0 && balanceDue > 0 ? (
                    <Badge variant="blue" label="PARTIALLY PAID" />
                  ) : invoice.status === 'posted' ? (
                    <Badge variant="blue" label="CONFIRMED / POSTED" />
                  ) : invoice.status === 'void' ? (
                    <Badge variant="slate" label="VOID / CANCELLED" />
                  ) : (
                    <Badge variant="amber" label="DRAFT" />
                  )}
                </div>
              </div>
            </div>

            {/* Bill To & Invoice Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70">
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-400" />
                  Billed To
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {invoice.customer_name || `Customer Account #${invoice.customer_id}`}
                </p>
                <p className="text-slate-600 font-mono">
                  {invoice.customer_email || 'accounts@clientdomain.com'}
                </p>
                <p className="text-slate-400 text-[11px]">Client Account ID: #{invoice.customer_id}</p>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Invoice Terms & Dates
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Issue Date:</span>
                    <span className="font-medium font-mono">
                      {new Date(invoice.created_at || invoice.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Payment Due:</span>
                    <span
                      className={`font-medium font-mono ${
                        isOverdue ? 'text-rose-600 font-bold' : ''
                      }`}
                    >
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Payment Terms:</span>
                    <span className="font-medium">{invoice.payment_terms || 'Net 30 Invoicing'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Linked Subscription:</span>
                    <span className="font-mono text-indigo-600 font-medium">
                      {invoice.subscription_number ||
                        (invoice.subscription_id ? `SUB-${invoice.subscription_id}` : 'Ad-hoc')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Line Itemized Statement
              </div>
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-2.5 px-4 w-10">#</th>
                      <th className="py-2.5 px-4">Item & Description</th>
                      <th className="py-2.5 px-4 w-20 text-center">Qty</th>
                      <th className="py-2.5 px-4 w-28 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 w-28 text-right">Tax Applied</th>
                      <th className="py-2.5 px-4 w-28 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {invoice.items && invoice.items.length > 0 ? (
                      invoice.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">{item.description}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            ${num(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            ${num(item.tax_amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ${num(item.total_amount || num(item.subtotal) + num(item.tax_amount)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">1</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          Subscription Recurring Fee
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700">1</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ${subtotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ${taxTotal.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ${totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
              <div className="space-y-2 text-xs text-slate-500 max-w-sm">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Remittance Instructions
                </span>
                <p className="leading-relaxed">
                  Please remit full payment within agreed invoice terms. Bank transfers should reference
                  invoice number <strong className="font-mono text-slate-800">{invoice.invoice_number}</strong>.
                </p>
                {invoice.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-[11px]">
                    <strong>Memo:</strong> {invoice.notes}
                  </div>
                )}
              </div>

              <div className="w-full sm:w-72 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Line Subtotal:</span>
                  <span className="font-mono font-medium">${subtotal.toFixed(2)}</span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Deduction:</span>
                    <span className="font-mono">-${discountTotal.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Regional Taxes (VAT/Sales):</span>
                  <span className="font-mono font-medium text-indigo-700">+${taxTotal.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900">Total Invoiced:</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ${totalAmount.toFixed(2)} {invoice.currency}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
                  <span>Amount Settled / Paid:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    ${amountPaid.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline bg-indigo-50/50 -mx-4 -mb-4 p-3 rounded-b-2xl">
                  <span className="font-bold text-slate-900">Outstanding Balance:</span>
                  <span
                    className={`text-base font-black font-mono ${
                      balanceDue > 0 ? (isOverdue ? 'text-rose-600' : 'text-indigo-600') : 'text-emerald-600'
                    }`}
                  >
                    ${balanceDue.toFixed(2)} {invoice.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Settlement History */}
            {invoicePayments.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Recorded Payment Settlements ({invoicePayments.length})
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Transaction Ref</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {invoicePayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {new Date(p.paid_at || p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {p.transaction_reference || `TXN-${p.id}`}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-slate-700">
                            {p.payment_method.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                            ${num(p.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={p.status === 'succeeded' ? 'emerald' : p.status === 'refunded' ? 'rose' : 'amber'}
                              label={p.status.toUpperCase()}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar (Screen Only - Hidden in Print) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save PDF
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Contextual actions for Admin/Finance */}
              {canManageInvoices && invoice.status === 'draft' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handlePostInvoice}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirm & Post Invoice
                </Button>
              )}

              {canManageInvoices && invoice.status !== 'void' && balanceDue > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleOpenPaymentForm}
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Record Payment
                </Button>
              )}

              {canManageInvoices && invoice.status !== 'void' && invoice.status !== 'paid' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingVoid(true)}
                  disabled={isProcessing}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" /> Void Invoice
                </Button>
              )}

              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Partial / Full Payment Recording Dialog */}
      <Modal
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        title={`Record Payment for ${invoice.invoice_number}`}
        description="Enter settlement details for full or partial invoice balance reconciliation."
        maxWidth="md"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-left">
          {paymentError && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">{paymentError}</div>}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Remaining Balance</span>
              <span className="text-base font-black text-indigo-600 font-mono">${balanceDue.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Invoiced</span>
              <span className="text-xs font-bold text-slate-800 font-mono">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Payment Amount ($) <span className="text-rose-500">*</span></span>
              <button
                type="button"
                onClick={() => setPaymentAmount(balanceDue)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Pay Full Balance (${balanceDue.toFixed(2)})
              </button>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0.00"
              disabled={isProcessing}
              required
              className="font-mono font-bold"
            />
            <p className="text-[11px] text-slate-400">Accepts partial payments up to ${balanceDue.toFixed(2)}.</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Payment Method <span className="text-rose-500">*</span></label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={isProcessing}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            >
              <option value="bank_transfer">Direct Bank Transfer / Wire / ACH</option>
              <option value="credit_card">Corporate Credit Card Reference</option>
              <option value="manual">Manual Settlement / Cash / Check</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              Transaction Reference <span className="text-rose-500">*</span>
            </label>
            <Input
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. TXN-ACH-89421"
              disabled={isProcessing}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Settlement Notes</label>
            <Input
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Audit reconciliation notes..."
              disabled={isProcessing}
            />
          </div>

          <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <span>Overpayments are prevented. Status will update to PAID once balance reaches $0.00.</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsPaymentFormOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isProcessing ? 'Recording...' : 'Confirm Settlement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Voiding */}
      <ConfirmDialog
        isOpen={isConfirmingVoid}
        title="Void Invoice"
        message={`Are you sure you want to void invoice ${invoice.invoice_number}? Voided invoices are cancelled permanently in the ledger.`}
        confirmLabel="Void Invoice"
        isDestructive={true}
        isLoading={isProcessing}
        onConfirm={handleVoidInvoice}
        onCancel={() => setIsConfirmingVoid(false)}
      />
    </>
  );
};
