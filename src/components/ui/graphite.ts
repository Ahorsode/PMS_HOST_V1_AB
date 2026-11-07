/**
 * Graphite surface tokens shared by the dashboard shell and pages (flock-ui.tsx
 * builds on these too). Neutral surfaces, three text roles and one emerald accent, so
 * the content carries the color instead of the chrome.
 */
export const ink = {
  page: 'var(--page)',
  card: 'var(--card)',
  raised: 'var(--raised)',
  raisedHover: 'var(--raised-2)',
  text: 'var(--fg)',
  secondary: 'var(--fg-2)',
  muted: 'var(--fg-3)',
  bar: 'var(--bar)',
  accent: 'var(--accent)',
  yolk: 'var(--yolk)',
  positive: 'var(--pos)',
  warning: 'var(--yolk)',
  negative: 'var(--neg-solid)',
  /** Red for text and small marks on dark surfaces, where #e5484d reads too dim. */
  negativeText: 'var(--neg)',
  /** Straw, for feed. */
  straw: 'var(--straw)',
} as const

/**
 * One muted hue per navigation group. Used only on small marks: the group's
 * icons, the active-page bar and status dots, never on surfaces.
 */
export const groupHue: Record<string, string> = {
  farm: 'var(--accent)',
  business: 'var(--yolk)',
  governance: 'var(--steel)',
}

const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-accent/60'

export const g = {
  focus,
  card: 'rounded-2xl border border-fg/[0.08] bg-card',
  /** A surface sunk into a card, for inputs and segmented controls. */
  well: 'rounded-xl border border-fg/[0.08] bg-page',
  /** A row or tile raised inside a card. */
  tile: 'rounded-xl border border-fg/[0.06] bg-tile',
  hairline: 'border-fg/[0.08]',
  title: 'text-3xl font-medium leading-tight text-fg',
  sectionTitle: 'text-lg font-medium text-fg',
  text: 'text-fg',
  secondary: 'text-fg-2',
  muted: 'text-fg-3',
  ledger: 'font-mono text-xs text-fg-3',
  buttonPrimary: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-medium text-page transition-[background-color,transform] duration-150 hover:bg-fg/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  buttonSecondary: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-fg/[0.08] bg-raised px-4 text-sm font-medium text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,transform] duration-150 hover:bg-raised-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  buttonQuiet: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm text-fg-2 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  iconButton: `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-fg/[0.06] hover:text-fg ${focus}`,
  segmented: 'flex gap-1 rounded-[10px] border border-fg/[0.08] bg-page p-1',
  segment: `h-8 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150 ${focus}`,
  segmentOn: 'bg-raised-2 font-medium text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  segmentOff: 'text-fg-2 hover:text-fg',
  input:
    'h-10 min-h-0 rounded-lg border-fg/[0.08] bg-page text-fg placeholder:text-fg-3 focus:border-accent/50 focus:ring-accent/30 font-normal tabular-nums',
  label: 'mb-2 block text-sm text-fg-2',
} as const
