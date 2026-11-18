import { cn } from '@/lib/utils';

const base =
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full font-ql-sans text-sm font-semibold transition-[background-color,color,transform] duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60 disabled:cursor-not-allowed';

/**
 * Quiet Ledger buttons. Only one `filled` button per screen; every other
 * action is `ghost` (mint outline) or `text`.
 */
export function qlButton(variant: 'filled' | 'ghost' | 'text', className?: string) {
  return cn(
    base,
    variant === 'filled' && 'bg-ql-mint px-5 text-ql-on-mint disabled:bg-ql-text/[0.08] disabled:text-ql-muted',
    variant === 'ghost' &&
      'border border-ql-mint/45 px-4 text-ql-mint hover:bg-ql-mint/10 disabled:border-ql-line disabled:text-ql-muted',
    variant === 'text' && 'px-2 text-ql-mint hover:underline disabled:text-ql-muted',
    className,
  );
}
