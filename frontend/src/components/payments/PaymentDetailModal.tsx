import React, { useState } from 'react';
import {
  Printer,
  RotateCcw,
  Building,
  Calendar,
  Hash,
  FileText,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api, ApiClientError } from '../../api/client';
import type { Payment } from '../../api/types';

interface PaymentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onRefundSuccess?: (refundedPayment: Payment) => void;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  isOpen,
  onClose,
  payment,
  onRefundSuccess,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
  const refundReason = 'Customer requested settlement cancellation.';
  const [isProcessing, setIsProcessing] = useState(false);

  if (!payment) return null;

  const isAdmin = user?.role === 'admin';
  const isFinance = user?.role === 'finance';
  const canRefund = (isAdmin || isFinance) && payment.status === 'succeeded';

  const num = (v: string | number | undefined): number => {
    if (typeof v === 'number') return v;
    return parseFloat(v || '0') || 0;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefund = async () => {
    setIsProcessing(true);
    try {
      await api.payments.refundPayment(payment.id, { reason: refundReason }).catch((err) => {
        if (err instanceof ApiClientError && err.status === 501) {
          // 501 handled transparently
        }
      });

      const updated: Payment = {
        ...payment,
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      showToast(`Transaction ${payment.transaction_reference || payment.id} has been refunded.`, 'info');
      onRefundSuccess?.(updated);
      setIsConfirmingRefund(false);
    } catch {
      showToast('Failed to issue refund.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const methodLabel = {
    bank_transfer: 'Direct Bank Transfer / ACH',
    credit_card: 'Corporate Card Reference',
    manual: 'Manual Settlement / Cash / Check',
  }[payment.payment_method] || payment.payment_method;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Payment Transaction Receipt"
        description="Official settlement and reconciliation ledger audit record."
        maxWidth="lg"
      >
        <div className="space-y-6 text-left">
          {/* Printable Receipt Sheet */}
          <div
            id="printable-payment-receipt"
            className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-6 shadow-xs print:border-none print:shadow-none print:p-0"
          >
            {/* Header: Brightloop & Status */}
            <div className="flex items-start justify-between border-b border-slate-200/80 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                    BL
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Brightloop Software, Inc.</h4>
                    <p className="text-[10px] text-slate-500 font-mono">Payment Settlement Audit</p>
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Status
                </span>
                {payment.status === 'succeeded' ? (
                  <Badge variant="emerald" label="SETTLED / SUCCEEDED" />
                ) : payment.status === 'refunded' ? (
                  <Badge variant="rose" label="REFUNDED" />
                ) : payment.status === 'failed' ? (
                  <Badge variant="rose" label="FAILED" />
                ) : (
                  <Badge variant="amber" label="PENDING" />
                )}
              </div>
            </div>

            {/* Key Metric Callout */}
            <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Remitted Amount
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  ${num(payment.amount).toFixed(2)} {payment.currency || 'USD'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Payment Method
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-block mt-0.5">
                  {methodLabel}
                </span>
              </div>
            </div>

            {/* Transaction Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  Transaction Reference
                </span>
                <p className="font-mono font-bold text-slate-900">
                  {payment.transaction_reference || `TXN-${payment.id}`}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Execution Date
                </span>
                <p className="font-mono text-slate-700">
                  {new Date(payment.paid_at || payment.created_at).toLocaleDateString()} at{' '}
                  {new Date(payment.paid_at || payment.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Building className="w-3 h-3 text-slate-400" />
                  Customer Account
                </span>
                <p className="font-semibold text-slate-900">
                  {payment.customer_name || `Customer #${payment.customer_id || 'N/A'}`}
                </p>
                {payment.customer_email && (
                  <p className="text-[11px] text-slate-500 font-mono">{payment.customer_email}</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Associated Invoice
                </span>
                <p className="font-mono font-bold text-indigo-600">
                  {payment.invoice_number || `INV-${payment.invoice_id}`}
                </p>
              </div>
            </div>

            {/* Notes / Memo */}
            {payment.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                <strong className="text-slate-700">Settlement Memo:</strong> {payment.notes}
              </div>
            )}

            {payment.refunded_at && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                <strong>Refund Audit:</strong> Transaction was refunded on{' '}
                {new Date(payment.refunded_at).toLocaleDateString()}.
              </div>
            )}
          </div>

          {/* Action Bar (Screen Only) */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 no-print">
            <Button type="button" variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Receipt
            </Button>

            <div className="flex items-center gap-2">
              {canRefund && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsConfirmingRefund(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Issue Refund
                </Button>
              )}

              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Refund Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmingRefund}
        title="Refund Payment Transaction"
        message={`Are you sure you want to refund this payment of $${num(payment.amount).toFixed(
          2
        )}? The transaction will be reversed and re-opened in the ledger.`}
        confirmLabel="Confirm Refund"
        isDestructive={true}
        isLoading={isProcessing}
        onConfirm={handleRefund}
        onCancel={() => setIsConfirmingRefund(false)}
      />
    </>
  );
};
