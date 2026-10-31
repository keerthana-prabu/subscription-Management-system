import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type {
  Product,
  QuotationTemplate,
  QuotationCreatePayload,
} from '../../api/types';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuotationCreatePayload) => Promise<void>;
  templates: QuotationTemplate[];
  products: Product[];
  isLoading?: boolean;
}

interface FormLineItem {
  id: string;
  product_id: number;
  product_name: string;
  variant_id?: number;
  variant_name?: string;
  sku: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  discount_percentage?: number;
}

const DEMO_CUSTOMERS = [
  { id: 1, name: 'Acme Corporation', email: 'billing@acme.com' },
  { id: 2, name: 'Wayne Enterprises', email: 'finance@wayne.com' },
  { id: 3, name: 'Cyberdyne Systems', email: 'accounts@cyberdyne.io' },
  { id: 4, name: 'Brightloop Client Portal', email: 'customer@brightloop.io' },
];

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  templates,
  products,
  isLoading = false,
}) => {
  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1);
  const [customerName, setCustomerName] = useState(DEMO_CUSTOMERS[0].name);
  const [customerEmail, setCustomerEmail] = useState(DEMO_CUSTOMERS[0].email);

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Line items
  const [lineItems, setLineItems] = useState<FormLineItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to compute expiration date
  const computeExpiryDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomerId(DEMO_CUSTOMERS[0].id);
      setCustomerName(DEMO_CUSTOMERS[0].name);
      setCustomerEmail(DEMO_CUSTOMERS[0].email);
      setSelectedTemplateId('');
      setValidUntil(computeExpiryDate(30));
      setNotes('Thank you for choosing Brightloop. This quotation is subject to terms outlined.');
      setTerms(
        '1. Quotation prices are firm for the specified validity period.\n2. Invoicing schedules follow selected plan intervals.\n3. Taxes calculated upon invoice issuance.'
      );

      // Prepopulate with first available product variant if available
      if (products.length > 0) {
        const firstProd = products[0];
        const firstVariant = firstProd.variants?.[0];
        const unitPrice = firstVariant
          ? Number(firstVariant.base_price) || 120
          : Number(firstProd.sales_price) || 120;

        setLineItems([
          {
            id: 'item-1',
            product_id: firstProd.id,
            product_name: firstProd.name,
            variant_id: firstVariant?.id,
            variant_name: firstVariant?.name,
            sku: firstVariant?.sku || firstProd.code,
            quantity: 1,
            unit_price: unitPrice,
            tax_percentage: 10,
          },
        ]);
      } else {
        setLineItems([]);
      }
      setErrors({});
    }
  }, [isOpen, products]);

  // When customer changes
  const handleCustomerChange = (customerId: number) => {
    setSelectedCustomerId(customerId);
    const found = DEMO_CUSTOMERS.find((c) => c.id === customerId);
    if (found) {
      setCustomerName(found.name);
      setCustomerEmail(found.email);
    }
  };

  // When template changes
  const handleTemplateChange = (templateId: number | '') => {
    setSelectedTemplateId(templateId);
    if (templateId !== '') {
      const found = templates.find((t) => t.id === templateId);
      if (found) {
        setValidUntil(computeExpiryDate(found.default_validity_days || 30));
        if (found.terms_and_conditions) {
          setTerms(found.terms_and_conditions);
        }
        if (found.description) {
          setNotes(found.description);
        }
      }
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const prod = products[0];
    const variant = prod.variants?.[0];
    const price = variant
      ? Number(variant.base_price) || 100
      : Number(prod.sales_price) || 100;

    const newItem: FormLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      product_id: prod.id,
      product_name: prod.name,
      variant_id: variant?.id,
      variant_name: variant?.name,
      sku: variant?.sku || prod.code,
      quantity: 1,
      unit_price: price,
      tax_percentage: 10,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  // Remove line item
  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update line item
  const handleUpdateLineItem = (id: string, updates: Partial<FormLineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };

          // If product changed, update default pricing and variants
          if (updates.product_id && updates.product_id !== item.product_id) {
            const foundProd = products.find((p) => p.id === updates.product_id);
            if (foundProd) {
              const firstVariant = foundProd.variants?.[0];
              updated.product_name = foundProd.name;
              updated.variant_id = firstVariant?.id;
              updated.variant_name = firstVariant?.name;
              updated.sku = firstVariant?.sku || foundProd.code;
              updated.unit_price = firstVariant
                ? Number(firstVariant.base_price) || 100
                : Number(foundProd.sales_price) || 100;
            }
          }

          // If variant changed
          if (updates.variant_id && updates.variant_id !== item.variant_id) {
            const prod = products.find((p) => p.id === updated.product_id);
            const foundVariant = prod?.variants?.find((v) => v.id === updates.variant_id);
            if (foundVariant) {
              updated.variant_name = foundVariant.name;
              updated.sku = foundVariant.sku;
              updated.unit_price = Number(foundVariant.base_price) || updated.unit_price;
            }
          }

          return updated;
        }
        return item;
      })
    );
  };

  // Live calculations
  const { subtotal, taxTotal, grandTotal } = useMemo(() => {
    let sub = 0;
    let tax = 0;

    lineItems.forEach((item) => {
      const lineSub = item.quantity * item.unit_price;
      const lineTax = (lineSub * item.tax_percentage) / 100;
      sub += lineSub;
      tax += lineTax;
    });

    return {
      subtotal: sub,
      taxTotal: tax,
      grandTotal: sub + tax,
    };
  }, [lineItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) newErrors.customerName = 'Customer name is required';
    if (!validUntil) newErrors.validUntil = 'Validity expiration date is required';
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: QuotationCreatePayload = {
      customer_id: selectedCustomerId,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      template_id: selectedTemplateId !== '' ? Number(selectedTemplateId) : undefined,
      template_name:
        selectedTemplateId !== ''
          ? templates.find((t) => t.id === selectedTemplateId)?.name
          : undefined,
      valid_until: validUntil,
      notes: notes.trim() || undefined,
      terms_and_conditions: terms.trim() || undefined,
      currency: 'USD',
      items: lineItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        variant_id: item.variant_id,
        variant_name: item.variant_name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage,
      })),
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Commercial Quotation"
      description="Author multi-item subscription proposals from reusable templates with live tax & total calculations."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Template & Customer row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Select Quotation Template</span>
              <span className="text-[10px] text-indigo-600 font-semibold">Optional</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) =>
                handleTemplateChange(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="block w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="">Custom Blank Proposal</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.default_validity_days}d validity)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Customer Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(Number(e.target.value))}
              className="block w-full rounded-xl border border-slate-300 py-2.5 px-3.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            >
              {DEMO_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer details & Expiry date row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Input
            label="Customer Contact Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={errors.customerName}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Customer Billing Email"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            required
          />

          <Input
            label="Quotation Valid Until"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            error={errors.validUntil}
            leftIcon={<Calendar className="w-4 h-4" />}
            required
          />
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              Quotation Line Items & Pricing Surcharge
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Product Line
            </Button>
          </div>

          {errors.lineItems && (
            <p className="text-xs text-rose-600 font-semibold">{errors.lineItems}</p>
          )}

          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50/80 font-bold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5">Catalog Product & Variant</th>
                    <th className="px-2 py-2.5 w-20">Qty</th>
                    <th className="px-3 py-2.5 w-28">Unit Price ($)</th>
                    <th className="px-3 py-2.5 w-24">Tax Rate</th>
                    <th className="px-3 py-2.5 text-right w-28">Line Total</th>
                    <th className="px-2 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lineItems.map((item) => {
                    const currentProd = products.find((p) => p.id === item.product_id);
                    const variants = currentProd?.variants || [];
                    const lineSub = item.quantity * item.unit_price;
                    const lineTax = (lineSub * item.tax_percentage) / 100;
                    const lineTotal = lineSub + lineTax;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        {/* Product & Variant dropdowns */}
                        <td className="px-3.5 py-2.5 space-y-1">
                          <select
                            value={item.product_id}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                product_id: Number(e.target.value),
                              })
                            }
                            className="block w-full rounded-lg border border-slate-300 py-1 px-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.code})
                              </option>
                            ))}
                          </select>

                          {variants.length > 0 && (
                            <select
                              value={item.variant_id || ''}
                              onChange={(e) =>
                                handleUpdateLineItem(item.id, {
                                  variant_id: Number(e.target.value),
                                })
                              }
                              className="block w-full rounded-lg border border-slate-200 py-1 px-2 text-[11px] text-slate-700 bg-slate-50 focus:outline-none"
                            >
                              {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name} (SKU: {v.sku} - ${Number(v.base_price).toFixed(2)})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-2 py-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 py-1 px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <span className="absolute left-2 top-1 text-[11px] text-slate-400 font-mono">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleUpdateLineItem(item.id, {
                                  unit_price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 py-1 pl-5 pr-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        </td>

                        {/* Tax Rate */}
                        <td className="px-3 py-2.5">
                          <select
                            value={item.tax_percentage}
                            onChange={(e) =>
                              handleUpdateLineItem(item.id, {
                                tax_percentage: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-slate-300 py-1 px-1.5 text-xs text-slate-800 bg-white focus:outline-none"
                          >
                            <option value={0}>0% (Tax Exempt)</option>
                            <option value={5}>5% (GST Lower)</option>
                            <option value={10}>10% (Standard)</option>
                            <option value={18}>18% (Odoo / VAT)</option>
                          </select>
                        </td>

                        {/* Line Total */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-xs">
                          ${lineTotal.toFixed(2)}
                        </td>

                        {/* Remove */}
                        <td className="px-2 py-2.5 text-center">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-Time Financial Summary Calculation Card */}
        <div className="p-4 bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 text-white rounded-2xl shadow-md border border-indigo-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-200 pb-2 border-b border-white/10">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Real-Time Quotation Pricing Ledger
            </span>
            <span className="font-mono text-[11px]">All figures in USD ($)</span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div>
              <span className="text-[10px] text-indigo-300 block uppercase font-bold tracking-wider">
                Net Subtotal
              </span>
              <div className="text-base font-bold font-mono text-white mt-0.5">
                ${subtotal.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-indigo-300 block uppercase font-bold tracking-wider">
                Applicable Tax
              </span>
              <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
                +${taxTotal.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-indigo-300 block uppercase font-bold tracking-wider">
                Grand Total Amount
              </span>
              <div className="text-xl font-black font-mono text-emerald-300 mt-0.5">
                ${grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Proposal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Terms & Conditions</label>
            <textarea
              rows={2}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Generate Quotation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
