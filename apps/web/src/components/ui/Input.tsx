import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label-modern">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'input-glass',
            error && 'border-danger/50 focus:ring-danger/50 focus:border-danger/50 bg-danger/5',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-danger-light">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
