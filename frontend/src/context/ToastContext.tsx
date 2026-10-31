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
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeConfig = {
            success: {
              border: 'border-l-4 border-l-emerald-500 border-slate-200/90',
              iconBg: 'bg-emerald-50 text-emerald-600',
              icon: <CheckCircle2 className="w-4.5 h-4.5" />,
            },
            error: {
              border: 'border-l-4 border-l-rose-500 border-slate-200/90',
              iconBg: 'bg-rose-50 text-rose-600',
              icon: <AlertCircle className="w-4.5 h-4.5" />,
            },
            warning: {
              border: 'border-l-4 border-l-amber-500 border-slate-200/90',
              iconBg: 'bg-amber-50 text-amber-600',
              icon: <AlertTriangle className="w-4.5 h-4.5" />,
            },
            info: {
              border: 'border-l-4 border-l-indigo-600 border-slate-200/90',
              iconBg: 'bg-indigo-50 text-indigo-600',
              icon: <Info className="w-4.5 h-4.5" />,
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto p-4 rounded-xl bg-white border shadow-xl flex items-start space-x-3 transition-all animate-in slide-in-from-bottom-3 duration-200 text-left ${typeConfig.border}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${typeConfig.iconBg}`}>
                {typeConfig.icon}
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && <div className="text-xs font-bold text-slate-900 leading-tight mb-0.5">{toast.title}</div>}
                <div className="text-xs text-slate-600 leading-relaxed break-words">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
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
