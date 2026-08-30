import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'declared' | 'validated' | 'review' | 'brand' | 'indigo';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-muted-foreground',
  declared: 'bg-status-declared/10 text-status-declared',
  validated: 'bg-status-validated/10 text-status-validated',
  review: 'bg-status-review/10 text-status-review',
  brand: 'bg-brand-blue-light text-brand-blue-dark',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
