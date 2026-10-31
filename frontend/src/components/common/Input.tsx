import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 tracking-tight">
            {label}
            {props.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
          </label>
        )}

        <div className="relative rounded-xl shadow-2xs">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`block w-full rounded-xl border py-2 text-sm transition-all text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightElement ? 'pr-11' : 'pr-3.5'} ${
              error
                ? 'border-rose-300 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/15'
                : 'border-slate-300 bg-white hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-600/10'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
            <span>{error}</span>
          </p>
        )}
        {!error && helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
