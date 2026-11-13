// Row quick actions (edit, delete, sell...): 40px tinted tiles, each colored by
// what it does. Shared so every list's row buttons look the same.
const QUICK_TONES = {
  mortality: 'text-clay bg-clay/10 border-clay/30 hover:bg-clay/20',
  sell: 'text-accent bg-accent/10 border-accent/30 hover:bg-accent/20',
  edit: 'text-steel bg-steel/10 border-steel/30 hover:bg-steel/20',
  delete: 'text-neg bg-neg/10 border-neg/30 hover:bg-neg/20',
} as const;

export type QuickActionTone = keyof typeof QUICK_TONES;

export function quickButtonClass(tone: QuickActionTone) {
  return `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 ${QUICK_TONES[tone]}`;
}

/** Icon props sized for a quick-action tile. */
export const QUICK_ICON = { className: 'h-5 w-5', strokeWidth: 1.75 } as const;
