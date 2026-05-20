import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30',
        secondary:   'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        destructive: 'bg-[var(--color-destructive)]/20 text-[var(--color-destructive)] border border-[var(--color-destructive)]/30',
        outline:     'border border-[var(--color-border)] text-[var(--color-foreground)]',
        win:         'bg-[var(--color-win)]/20 text-[var(--color-win)] border border-[var(--color-win)]/30',
        loss:        'bg-[var(--color-loss)]/20 text-[var(--color-loss)] border border-[var(--color-loss)]/30',
        provisional: 'bg-[var(--color-provisional)]/20 text-[var(--color-provisional)] border border-[var(--color-provisional)]/30',
        pending:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
