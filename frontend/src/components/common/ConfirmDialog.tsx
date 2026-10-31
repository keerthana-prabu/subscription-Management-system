import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} maxWidth="sm">
      <div className="space-y-5 text-left">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDestructive
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}
          >
            {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div className="text-xs text-slate-600 leading-relaxed pt-1">
            <p>{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
