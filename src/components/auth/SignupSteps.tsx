import React from 'react';
import { cn } from '@/lib/utils';

/** From the button to the first record: the four set-up steps the landing page promises. */
export const SIGNUP_STEPS = ['Phone', 'Farm name', 'Houses', 'First batch'] as const;

/** Phone-only progress rail for account set-up. `current` is the 0-based step being filled in. */
export function SignupSteps({ current, className }: { current: number; className?: string }) {
  return (
    <ol aria-label={`Step ${current + 1} of ${SIGNUP_STEPS.length}`} className={cn('mb-5 grid grid-cols-4 gap-1.5', className)}>
      {SIGNUP_STEPS.map((step, index) => (
        <li key={step} aria-current={index === current ? 'step' : undefined} className="min-w-0">
          <span aria-hidden="true" className={cn('block h-1 rounded-full', index <= current ? 'bg-ql-mint' : 'bg-ql-line')} />
          <span
            className={cn(
              'mt-1.5 block truncate font-ql-mono text-[9px] uppercase tracking-[0.06em]',
              index === current ? 'text-ql-mint' : 'text-ql-muted',
            )}
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}
