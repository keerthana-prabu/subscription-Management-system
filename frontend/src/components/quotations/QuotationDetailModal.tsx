import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { Quotation } from '../../api/types';
import {
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  ArrowRight,
  User,
  Layers,
} from 'lucide-react';

interface QuotationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  isAdminOrSales: boolean;
  onConfirmQuotation?: (quotation: Quotation) => void;
  onConvertToSubscription?: (quotation: Quotation) => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  isOpen,
  onClose,
  quotation,
  isAdminOrSales,
  onConfirmQuotation,
  onConvertToSubscription,
}) => {
  if (!quotation) return null;

  const isExpired = new Date(quotation.valid_until) < new Date();
  const isConverted = quotation.status === 'converted' || Boolean(quotation.converted_subscription_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Quotation ${quotation.quotation_number}`}
      description={`Commercial proposal issued for ${quotation.customer_name}`}
      maxWidth="xl"
    >
      <div className="space-y-6 text-left">
        {/* Top Summary Banner */}
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-violet-950 text-white rounded-2xl shadow-md border border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
              Quotation Total Value
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              ${quotation.total_amount.toFixed(2)}{' '}
              <span className="text-xs font-semibold text-indigo-200">{quotation.currency}</span>
            </div>
            <div className="text-xs text-indigo-200/80 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              <span>Valid until: <strong>{quotation.valid_until}</strong></span>
              {isExpired && (
                <span className="text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Expired
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                quotation.status === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : quotation.status === 'converted'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30'
                  : 'bg-white/10 text-slate-200 border border-white/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  quotation.status === 'confirmed' || quotation.status === 'converted'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-slate-300'
                }`}
              />
              {quotation.status}
            </span>

            {quotation.template_name && (
              <span className="text-[11px] text-indigo-200">
                Template: <strong className="text-white">{quotation.template_name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Customer & Quote Specifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-indigo-500" /> Customer Account
            </span>
            <div className="font-bold text-slate-900 text-sm">{quotation.customer_name}</div>
            <div className="text-slate-500 font-medium">{quotation.customer_email}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-500" /> Quotation Reference
            </span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {quotation.quotation_number}
            </div>
            <div className="text-slate-400 text-[11px]">
              Created: {new Date(quotation.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quoted Line Items & Surcharges</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50/80 font-bold text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5">Item & Variant</th>
                  <th className="px-3.5 py-2.5">SKU</th>
                  <th className="px-2 py-2.5 text-center">Qty</th>
                  <th className="px-3.5 py-2.5">Unit Price</th>
                  <th className="px-3.5 py-2.5">Tax Rate</th>
                  <th className="px-3.5 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {quotation.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      {item.variant_name && (
                        <div className="text-[11px] text-slate-500">{item.variant_name}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500">
                      {item.sku}
                    </td>
                    <td className="px-2 py-2.5 text-center font-semibold">{item.quantity}</td>
                    <td className="px-3.5 py-2.5 font-mono">${item.unit_price.toFixed(2)}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{item.tax_percentage}%</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                      ${item.total_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Breakdown ledger */}
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Quotation Net Subtotal:</span>
            <span className="font-mono font-semibold text-slate-800">
              ${quotation.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Applicable Taxes & Regional Levies:</span>
            <span className="font-mono font-semibold text-slate-800">
              +${quotation.tax_total.toFixed(2)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 flex justify-between text-sm font-bold text-slate-900">
            <span>Grand Total:</span>
            <span className="font-mono text-base text-indigo-700">
              ${quotation.total_amount.toFixed(2)} {quotation.currency}
            </span>
          </div>
        </div>

        {/* Terms & Conditions */}
        {quotation.terms_and_conditions && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Terms & Conditions
            </h4>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed font-mono whitespace-pre-wrap">
              {quotation.terms_and_conditions}
            </p>
          </div>
        )}

        {/* Modal footer with action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          {isAdminOrSales && !isConverted && (
            <div className="flex items-center space-x-2">
              {quotation.status === 'draft' && onConfirmQuotation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfirmQuotation(quotation)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Confirm Quotation
                </Button>
              )}

              {onConvertToSubscription && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onConvertToSubscription(quotation)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Convert to Active Subscription
                </Button>
              )}
            </div>
          )}

          {isConverted && (
            <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Converted to Subscription #SUB-2026-00{quotation.converted_subscription_id || quotation.id}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
