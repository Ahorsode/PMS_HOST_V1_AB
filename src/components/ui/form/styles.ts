import { cn } from '@/lib/utils';

/**
 * The one look every form control shares. Inputs are 16px so phones don't zoom
 * on focus, at least 48px tall on touch screens, and sit in a sunk well with a
 * green focus ring. Use these strings for any control that can't go through
 * Input / Select / Textarea.
 */
export const fieldStyles = {
  label: 'block text-sm font-medium leading-5 text-fg',
  hint: 'text-[13px] leading-5 text-fg-3',
  error: 'text-[13px] font-medium leading-5 text-neg',
  control:
    'block min-h-12 w-full rounded-lg border border-fg/[0.14] bg-page px-3.5 py-2.5 text-base leading-6 text-fg ' +
    'placeholder:text-fg-3 transition-[border-color,box-shadow] duration-150 ' +
    'hover:border-fg/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ' +
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-fg/[0.14] md:min-h-11',
  controlInvalid: 'border-neg-solid hover:border-neg-solid focus:border-neg-solid focus:ring-neg-solid/25',
} as const;

export function controlClass(invalid?: boolean, className?: string) {
  return cn(fieldStyles.control, invalid && fieldStyles.controlInvalid, className);
}
