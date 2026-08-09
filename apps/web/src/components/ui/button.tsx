import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'default' | 'sm' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-blue text-white hover:bg-brand-blue-dark shadow-sm shadow-brand-blue/20 disabled:hover:bg-brand-blue',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-surface-muted',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  danger: 'bg-status-review text-white hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
