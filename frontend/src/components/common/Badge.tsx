import React from 'react';
import type { UserRole } from '../../api/types';

interface BadgeProps {
  role?: UserRole;
  label?: string;
  variant?: 'purple' | 'blue' | 'emerald' | 'amber' | 'slate' | 'rose';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ role, label, variant, size = 'sm' }) => {
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
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeStyles[size]} ${variantStyles[resolvedVariant]}`}
    >
      {resolvedLabel}
    </span>
  );
};

