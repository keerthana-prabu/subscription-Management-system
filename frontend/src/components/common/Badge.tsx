import React from 'react';
import type { UserRole } from '../../api/types';

export interface BadgeProps {
  role?: UserRole;
  label?: string;
  variant?: 'purple' | 'blue' | 'emerald' | 'amber' | 'slate' | 'rose' | 'indigo';
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  role,
  label,
  variant,
  size = 'sm',
  showDot = true,
}) => {
  let resolvedVariant = variant || 'slate';
  let resolvedLabel = label || (role ? role.toUpperCase() : '');

  if (role) {
    switch (role) {
      case 'admin':
        resolvedVariant = 'purple';
        resolvedLabel = 'Admin';
        break;
      case 'sales':
        resolvedVariant = 'blue';
        resolvedLabel = 'Sales';
        break;
      case 'finance':
        resolvedVariant = 'emerald';
        resolvedLabel = 'Finance';
        break;
      case 'customer':
        resolvedVariant = 'amber';
        resolvedLabel = 'Customer';
        break;
    }
  }

  const variantStyles = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/80',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    slate: 'bg-slate-100/80 text-slate-700 border-slate-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  };

  const dotStyles = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs tracking-tight ${sizeStyles[size]} ${variantStyles[resolvedVariant]}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[resolvedVariant]}`}
          aria-hidden="true"
        />
      )}
      <span>{resolvedLabel}</span>
    </span>
  );
};
