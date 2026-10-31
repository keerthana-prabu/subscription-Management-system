import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const variantStyles = {
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />,
      closeBtn: 'text-rose-500 hover:bg-rose-100',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      closeBtn: 'text-emerald-500 hover:bg-emerald-100',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
      closeBtn: 'text-amber-500 hover:bg-amber-100',
    },
    info: {
      container: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      icon: <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />,
      closeBtn: 'text-indigo-500 hover:bg-indigo-100',
    },
  };

  const current = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm transition-all ${current.container} ${className}`}
    >
      {current.icon}
      <div className="flex-1 text-left">
        {title && <h4 className="font-semibold text-xs tracking-tight mb-0.5">{title}</h4>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close notification"
          className={`p-1 rounded-md transition-colors ${current.closeBtn}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

