import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-200 bg-emerald-50 text-emerald-800',
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
            },
            error: {
              border: 'border-rose-200 bg-rose-50 text-rose-800',
              icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
            },
            warning: {
              border: 'border-amber-200 bg-amber-50 text-amber-800',
              icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
            },
            info: {
              border: 'border-indigo-200 bg-indigo-50 text-indigo-800',
              icon: <Info className="w-4 h-4 text-indigo-600 shrink-0" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg flex items-start space-x-2.5 transition-all animate-in slide-in-from-bottom-2 duration-200 text-left ${typeConfig.border}`}
            >
              <div className="mt-0.5">{typeConfig.icon}</div>
              <div className="flex-1">
                {toast.title && <div className="text-xs font-bold leading-tight mb-0.5">{toast.title}</div>}
                <div className="text-xs leading-relaxed">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

