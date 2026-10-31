import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import type { QuotationTemplate, QuotationTemplateCreatePayload } from '../../api/types';
import { FileSpreadsheet, Calendar } from 'lucide-react';

interface QuotationTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuotationTemplateCreatePayload) => Promise<void>;
  templateToEdit?: QuotationTemplate | null;
  isLoading?: boolean;
}

export const QuotationTemplateModal: React.FC<QuotationTemplateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  templateToEdit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [terms, setTerms] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setDescription(templateToEdit.description || '');
      setValidityDays(templateToEdit.default_validity_days || 30);
      setTerms(templateToEdit.terms_and_conditions || '');
      setIsActive(templateToEdit.is_active);
    } else {
      setName('');
      setDescription('');
      setValidityDays(30);
      setTerms(
        '1. Quotation prices are firm for the specified validity period.\n2. Invoicing schedules follow selected plan intervals.\n3. Taxes and regional levies calculated upon invoice issuance.'
      );
      setIsActive(true);
    }
    setErrors({});
  }, [templateToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Template name is required';
    if (validityDays < 1 || validityDays > 365) {
      newErrors.validityDays = 'Validity period must be between 1 and 365 days';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      terms_and_conditions: terms.trim() || undefined,
      default_validity_days: Number(validityDays),
      is_active: isActive,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={templateToEdit ? `Edit Template: ${templateToEdit.name}` : 'Create Quotation Template'}
      description="Standardize proposal pricing, terms & conditions, and default validity windows."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <Input
          label="Template Title"
          placeholder="e.g. Enterprise Annual Tier Quotation"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Default Validity Period (Days)"
            type="number"
            min="1"
            max="365"
            value={validityDays}
            onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
            error={errors.validityDays}
            leftIcon={<Calendar className="w-4 h-4" />}
            helperText="Auto-computes quotation expiration"
            required
          />

          <div className="flex flex-col justify-end pb-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              <span className="ml-3 text-xs font-semibold text-slate-800">
                Template Active
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Description & Target Offerings
          </label>
          <textarea
            rows={2}
            placeholder="Overview of proposals generated from this template..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Standard Terms & Conditions</span>
            <span className="text-[10px] text-slate-400">Included in proposal preview</span>
          </label>
          <textarea
            rows={3}
            placeholder="Contractual terms, SLA clauses, or payment obligations..."
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all shadow-2xs font-mono"
          />
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            {templateToEdit ? 'Save Template Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
