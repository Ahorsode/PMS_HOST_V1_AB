# Mobile redesign progress (Quiet Ledger)

Phone layout only (below `md`, 768 px). Tablet and desktop stay on the graphite
look. Each board lands on its own `redesign/<screen>` branch, one commit per PDF.

## Finished screens

| Screen | Board | Branch | Notes |
| --- | --- | --- | --- |
| Owner dashboard (premium, "Farm summary") | Poultry-Ledger-Dashboard-Redesign.pdf (2 pages) | `redesign/owner-dashboard` | Also restyled the shared mobile header, the content gutter and the tab bar |
| Landing page + sign-up step rail | Landing-Page-Redesign.pdf (7 pages) | `redesign/landing-page` | Phone tree per section beside the unchanged desktop markup; plan chips and term prices worked out from the billing config |

## Shared tokens (`src/app/globals.css`)

CSS variables on `:root`, light-theme versions under `:root[data-theme="light"]`
(same hues, darkened to keep AA on white), exposed as Tailwind colours:

| Token | Dark | Utility |
| --- | --- | --- |
| `--ql-ground` | `#0B0F0E` | `bg-ql-ground` |
| `--ql-surface` | `#121816` | `bg-ql-surface` |
| `--ql-raised` | `#18201D` | `bg-ql-raised` |
| `--ql-line` | `#1F2B26` | `border-ql-line` |
| `--ql-mint` | `#34E0A1` | `text-ql-mint`, `bg-ql-mint` |
| `--ql-on-mint` | `#0B0F0E` | text on a filled mint button |
| `--ql-mint-dim` | `#1F7A58` | secondary data series (supplier debt) |
| `--ql-amber` | `#F5B94A` | attention |
| `--ql-coral` | `#F0716B` | urgent / loss |
| `--ql-text` | `#E8F0EC` | primary text |
| `--ql-muted` | `#7C8E86` | secondary text, labels |

Fonts (`src/components/ui/ql/fonts.ts`, next/font; the variables are set on
the dashboard shell in `SidebarWrapper`, on the landing root, and next to the
sign-up step rail): `font-ql-display` Bricolage Grotesque,
`font-ql-sans` Instrument Sans, `font-ql-mono` Geist Mono.

Spacing: screen gutter 16 (`px-4` on the mobile shell), tile gap 12 (`gap-3`,
`space-y-3`).

## Shared components (`src/components/ui/ql/`)

| File | What |
| --- | --- |
| `Surface.tsx` | `QlHero` (radius 24, top-left corner 8), `QlTile` (radius 16), `QlLabel` (mono label) |
| `Chip.tsx` | `QlChip` pill, tones `mint` / `amber` / `coral` / `neutral` |
| `Figure.tsx` | `QlMoney`: headline amount with the decimals stepped back |
| `Segmented.tsx` | `QlSegmented`: pill switch, 44 px hit areas, disabled options explain why on tap |
| `Button.ts` | `qlButton('filled' \| 'ghost' \| 'text')`. One `filled` per screen |
| `EmptyNote.tsx` | `QlEmptyNote`: reason plus next-step link |
| `format.ts` | `splitMoney`, `compactNumber` ("1.5M", "500k"), `compactMoney`, `percentMagnitude` |
| `Derived.tsx` | `QlDerived`: dotted underline for a worked-out figure, formula as tooltip and screen-reader text |
| `StickyBar.tsx` | `QlStickyBar` (dim state with a mono reason) and `useNoPrimaryInView()`: shows only while no `data-ql-primary` button is on screen |
| `primary.ts` | `QL_PRIMARY_ATTR`: spread on the screen's one filled mint button (server-safe import) |

Landing-only pieces live in `src/components/site/landing/` (sample card,
section heads, module rows with plan chips, steps rail, role switcher, phone
pricing, contact rows, footer, sticky call to action, `landing-plans.ts`).
`src/components/auth/SignupSteps.tsx` is the four-step set-up rail.

Not built yet (no board has needed them): plan card for in-app plans, confirm
sheet (type-the-name delete).

## Shell changes (apply to every phone screen)

- `SidebarWrapper`: Quiet Ledger ground behind phone screens, header restyled
  (no border, display-face farm name), content gutter 12 → 16.
- `BottomNav`: flat bar, one lit tab, 54×30 mint-tint pill inside the bar.
  Dashboard is no longer a raised always-mint button. Group icons are muted
  instead of per-group hues; the group sheets above the bar are unchanged.
- `ProfileMenu` trigger: 44 px, Quiet Ledger outline.

## Open items

Landing page:
- Sign-up by one-time code ("Send code", +233 prefix) is a concept: there is no
  SMS/OTP endpoint, and sign-up is phone + password today. Phones get the
  four-step rail and a dim submit with its reason; the form itself is unchanged.
- The board's "Cashier, check this" note does not hold: the Team invite form
  offers Worker, Cashier, Manager, Accountant and Finance officer.
- Term prices use the admin per-term discounts, so the board's "assumes the
  full 15%" caveat is not needed; terms with no discount show the monthly price.
- Plan prices are close together (Solo Plus GHS 330 vs Business GHS 350, which
  adds staff but drops five modules); a pricing decision, not changed here.
- The sample card's figures are the page's own illustration (labelled Sample
  data); only the egg count is worked out (crates × 30).

Owner dashboard:

- Fixed: `previousPeriodRevenue` in `getDashboardStats` was always 0 (sales and
  orders were loaded from 6 days back, then filtered to dates before that day),
  so the trend chip read "+100%" whenever there was revenue. Sales and orders
  now load for 14 days; `recentSales`/`recentOrders` are trimmed back to 7.
- The trend chip compares revenue, not profit, under a "Net profit" heading
  (kept as on the board and as before).
- "Cycle avg" is the mean of the days with revenue in the last 7 days, not a
  production-cycle average.
- 30d period: disabled with a reason; needs 30-day revenue and expense totals
  from the dashboard stats.
- Quick log routes to each log's page; logging straight from the dashboard
  needs a flock picker in front of the per-flock `FlockQuickLog` forms.
- The Quick log sheet uses the shared `Dialog`, which is still graphite;
  restyle it when a board covers sheets.
