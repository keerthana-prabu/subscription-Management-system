import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-slate-300/80 bg-white/70 shadow-xs">
      {icon && (
        <div className="w-13 h-13 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 mb-3.5 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div className="inline-flex justify-center">{action}</div>}
    </div>
  );
};
