import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-surface-highlight text-content-muted border border-white/5',
      success: 'bg-success/10 text-success-light border border-success/20',
      warning: 'bg-warning/10 text-warning-light border border-warning/20',
      danger: 'bg-danger/10 text-danger-light border border-danger/20',
      info: 'bg-primary/10 text-primary-light border border-primary/20',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase backdrop-blur-sm',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';
