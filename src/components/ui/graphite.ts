/**
 * Graphite surface tokens shared by the dashboard shell and pages (flock-ui.tsx
 * builds on these too). Neutral surfaces, three text roles and one emerald accent, so
 * the content carries the color instead of the chrome.
 */
export const ink = {
  page: '#141415',
  card: '#19191b',
  raised: '#232325',
  raisedHover: '#2c2c2f',
  text: '#ededed',
  secondary: '#a1a1a6',
  muted: '#85858b',
  bar: '#4a4a4f',
  accent: '#34d399',
  yolk: '#d9a441',
  positive: '#4cc38a',
  warning: '#d9a441',
  negative: '#e5484d',
  /** Red for text and small marks on dark surfaces, where #e5484d reads too dim. */
  negativeText: '#f2777b',
} as const

const focus = 'outline-none focus-visible:ring-2 focus-visible:ring-[#34d399]/60'

export const g = {
  focus,
  card: 'rounded-2xl border border-white/[0.08] bg-[#19191b]',
  /** A surface sunk into a card, for inputs and segmented controls. */
  well: 'rounded-xl border border-white/[0.08] bg-[#141415]',
  /** A row or tile raised inside a card. */
  tile: 'rounded-xl border border-white/[0.06] bg-[#1e1e20]',
  hairline: 'border-white/[0.08]',
  title: 'text-3xl font-medium leading-tight text-[#ededed]',
  sectionTitle: 'text-lg font-medium text-[#ededed]',
  text: 'text-[#ededed]',
  secondary: 'text-[#a1a1a6]',
  muted: 'text-[#85858b]',
  ledger: 'font-mono text-xs text-[#85858b]',
  buttonPrimary: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#ededed] px-4 text-sm font-medium text-[#141415] transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  buttonSecondary: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#232325] px-4 text-sm font-medium text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-[background-color,transform] duration-150 hover:bg-[#2c2c2f] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  buttonQuiet: `inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm text-[#a1a1a6] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed] disabled:pointer-events-none disabled:opacity-50 ${focus}`,
  iconButton: `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#85858b] transition-colors duration-150 hover:bg-white/[0.06] hover:text-[#ededed] ${focus}`,
  segmented: 'flex gap-1 rounded-[10px] border border-white/[0.08] bg-[#141415] p-1',
  segment: `h-8 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150 ${focus}`,
  segmentOn: 'bg-[#2c2c2f] font-medium text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
  segmentOff: 'text-[#a1a1a6] hover:text-[#ededed]',
  input:
    'h-10 min-h-0 rounded-lg border-white/[0.08] bg-[#141415] text-[#ededed] placeholder:text-[#85858b] focus:border-[#34d399]/50 focus:ring-[#34d399]/30 font-normal tabular-nums',
  label: 'mb-2 block text-sm text-[#a1a1a6]',
} as const
