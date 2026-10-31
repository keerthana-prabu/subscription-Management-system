import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center space-x-4 p-4">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-200/70 rounded flex-1"
              style={{ maxWidth: cIdx === 0 ? '30%' : cIdx === cols - 1 ? '15%' : '20%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-slate-200 rounded" />
            <div className="h-5 w-16 bg-slate-200 rounded-full" />
          </div>
          <div className="h-8 w-32 bg-slate-200 rounded" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-4/5 bg-slate-100 rounded" />
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-20 bg-slate-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

