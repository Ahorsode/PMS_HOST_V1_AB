# Mobile redesign progress (Quiet Ledger)

Phone layout only (below `md`, 768 px). Tablet and desktop stay on the graphite
look. Each board lands on its own `redesign/<screen>` branch, one commit per PDF.

## Finished screens

| Screen | Board | Branch | Notes |
| --- | --- | --- | --- |
| Owner dashboard (premium, "Farm summary") | Poultry-Ledger-Dashboard-Redesign.pdf (2 pages) | `redesign/owner-dashboard` | Also restyled the shared mobile header, the content gutter and the tab bar |
| Landing page + sign-up step rail | Landing-Page-Redesign.pdf (7 pages) | `redesign/landing-page` | Phone tree per section beside the unchanged desktop markup; plan chips and term prices worked out from the billing config |
| Egg production (overview, stock & history, log form) | Egg-Production-Redesign.pdf (2 pages) | `redesign/egg-production` | Shared counts moved to `eggs/egg-math.ts`; log form switches to steppers on phones |
| Health schedule (overview, week strip, new-schedule sheet) | Health-Schedule-Redesign.pdf (2 pages) | `redesign/health-schedule` | States in `health/schedule-state.ts`; the form opens as a sheet on phones |
| Feed (overview, feeding history, log form) | Feed-Redesign.pdf (2 pages) | `redesign/feed` | Counts and day grouping in `feed/feed-math.ts`; batch cards, stepper and stock-after on phones |
| Quarantine & isolation (overview, isolate sheet, record-loss sheet) | Quarantine-Redesign.pdf (2 pages) | `redesign/quarantine` | Phone sheets call the same `logHealthEvent` / `logMortalityInIsolation` / `returnFromIsolation` actions |
| Mortality (overview, 1% check, day detail, log-deaths sheet) | Mortality-Redesign.pdf (2 pages) | `redesign/mortality` | Figures in `mortality/mortality-math.ts`; shared `CausePicker` and `LineGauge` |
| Analytics batch comparison | Analytics-Batch-Comparison-Redesign.pdf (2 pages) | `redesign/analytics-comparison` | `components/analytics/MobileBatchComparison.tsx` shares the batch selection with the desktop view |
| Livestock list | Livestock-Redesign.pdf (2 pages) | `redesign/livestock` | `flocks/MobileLivestock.tsx`; the Manage screen is the batch details board |
| Batch details | Batch-Details-Redesign.pdf (2 pages) | `redesign/batch-details` | `flocks/[id]/MobileFlockDetail.tsx`; desktop tree and its charts are not mounted on phones |
| Batch details, layer edition | Womane-Batch-Redesign.pdf (2 pages) | `redesign/womane-batch` | Same component: reconciled dead count, eggs card, priced revenue entries, egg days chart |
| Sales | Sales-Redesign.pdf (2 pages) | `redesign/sales` | `sales/MobileSales.tsx`; the one Record a sale control becomes a sticky bar below md |
| Customers | Customers-Redesign.pdf (2 pages) | `redesign/customers` | `customers/MobileCustomers.tsx` and `customers/[id]/statement/MobileStatement.tsx`; one sticky Add customer |
| Finance | Finance-Redesign.pdf (2 pages) | `redesign/finance` | `finance/MobileFinance.tsx` inside FinanceHubClient; the add, settle and delete dialogs stay shared |
| Inventory | Inventory-Redesign.pdf (2 pages) | `redesign/inventory` | `inventory/MobileInventory.tsx` and `inventory/[id]/MobileItemHistory.tsx`; add/edit form shared |
| Reports | Reports-Redesign.pdf (2 pages) | `redesign/reports` | `reports/MobileReports.tsx` inside ReportsClient; one Make a report (the existing launcher) as the sticky bar |
| Profile (account) | Profile-Redesign.pdf (2 pages) | `redesign/profile` | `profile/MobileProfile.tsx`; Edit profile reuses EditProfileModal |
| Inbox and team chat | Inbox-Redesign.pdf (2 pages) | `redesign/inbox` | Phone tree in `inbox/page.tsx` plus `InboxMenu.tsx`; tabs, team list and composer restyled with `max-md:` only |
| Settings | Settings-Redesign.pdf (2 pages) | `redesign/settings` | `settings/SettingsPhone.tsx` (home list, Save bar); sections reuse the existing forms; PlanTypeCard gains a `row` variant |

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
| `--ql-shell` | `#EAD9AE` | egg objects (crate dots) |
| `--ql-deep` | `#2A6E58` | sold / history series |

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
| `EggCrate.tsx` | The crate in three states: empty, open (n of 30), full with a mint rim |
| `Stepper.tsx` | `QlStepper`: − / number / + with 44 px buttons; whole numbers, or `decimals` for fractions like 2.5 bags |
| `OverflowMenu.tsx` | `QlOverflowMenu`: the ⋯ menu (any icon, above or below); destructive items coral and last |
| `useIsPhone.ts` | Below-md check for client-only places (dialogs) that need a different control, not just styles |
| `ConfirmSheet.tsx` | `QlConfirmSheet`: the end of a delete; type the name (and, with `reason`, say why), coral button dim with a reason until both are done |

Landing-only pieces live in `src/components/site/landing/` (sample card,
section heads, module rows with plan chips, steps rail, role switcher, phone
pricing, contact rows, footer, sticky call to action, `landing-plans.ts`).
`src/components/auth/SignupSteps.tsx` is the four-step set-up rail.

Not built yet (no board has needed them): plan card for in-app plans.

## Shell changes (apply to every phone screen)

- `SidebarWrapper`: Quiet Ledger ground behind phone screens, header restyled
  (no border, display-face farm name), content gutter 12 → 16.
- `BottomNav`: flat bar, one lit tab, 54×30 mint-tint pill inside the bar.
  Dashboard is no longer a raised always-mint button. Group icons are muted
  instead of per-group hues; the group sheets above the bar are unchanged.
- `ProfileMenu` trigger: 44 px, Quiet Ledger outline.
- Detail pages (analytics, flock / sale / feed details): the phone back bar is
  Quiet Ledger, with the page title and the farm name under it.
- Pages with Recharts charts must not mount the desktop chart tree on phones
  (`useIsPhone()`); a hidden zero-size ResponsiveContainer re-renders in a loop.
- `quickButtonClass` row actions are 44 px below md (40 px from md up, as before).

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

Settings:
- Phones open on a list (Farm, Rules for workers, Account and data) where each
  row shows today's value; `?tab=` opens one section, as before. Desktop keeps
  its side tabs and opens on Farm info.
- One Save per phone screen, fixed above the tab bar, dim with "No changes
  yet" until a value differs from the last saved one. On Farm info the bar
  saves farm details; the growth target keeps its own outlined Save, dim
  with "Choose a standard first" when none is picked. Desktop buttons
  unchanged. Saved values are tracked client-side only.
- Fixed (bug, small and safe): the low-feed "Alert below" field said "kg",
  but the alert compares the raw number with the item's stock in its own unit
  (`isLowStock`). The field now shows the item's unit (e.g. bags), on desktop
  too. The board's bags/kg unit switch is not needed.
- Not built: "Batches hold more than this" capacity check (needs a batch
  query on this page) and "Country and amounts disagree" (the farm currency
  now always follows the country, so it can't disagree; a missing country
  shows as "Country not set").
- Mismatch: the settings page loads `prisma.farm.findFirst` over all farms
  the user owns or belongs to, not the active farm, while saves go to the
  active farm. A multi-farm user can see one farm's values and save another.
- Deviation: segmented controls (Crates / Single eggs) keep the shared
  Segmented look with a mint selection; restyling that shared component
  would touch every form.
- Connected devices and Deleted records pages are unchanged.

Inbox and team chat:
- Tabs fit four across from 360 px; a zero count is hidden on phones (desktop
  still shows "Messages 0"). All counts the team-unread row too, as before.
- Reminder settings moves to the ⋯ menu (owners and managers, as before).
- The first action on screen is the one filled mint button; later cards'
  actions are outlined. The colour legend is dropped on phones (each card
  has its kind chip).
- Team chat: "Message everyone" becomes a composer fixed above the tab bar;
  the Ctrl + Enter hint is replaced by "Sends to N people · Send turns on when
  you type". The send logic and the 1:1 thread are unchanged.

Profile (account):
- Names are shown title-cased on phones ("Delali", not "delali"); the stored
  name is unchanged and desktop shows it as stored.
- The farm comes from `user.memberships` for the active farm. An owner with
  no membership row sees no farm name (desktop shows a blank; phones say "Not
  linked to your account"). Local fixture owner hits this.
- Location "Check": flagged when it has fewer than 4 letters or is empty.
  "Add location" goes to Settings → Farm (owners); others are told only the
  owner can change it.
- Request deletion moved into the ⋯ menu and ends in a type-the-farm-name
  sheet; when it matches, it opens the same `accountDeletionMailto` link.
- Concept: the board's edit screen adds email, entity name and location; the
  existing EditProfileModal edits names only. Not built (no endpoint).

Reports:
- Expenses: `generateComprehensiveFarmReport` reads `financialTransaction`
  only. Finance also lists the Expense table (auto-logged feed, stock and
  health costs), so the report's expenses and net income leave those out. Not
  fixed (it changes the report's business logic and adds a query). Phones
  show an amber Check when expenses are 0 but there was revenue or feed use.
- Mortality rate is (start − now) ÷ start over active batches for their whole
  life (sales and moves count), while the death count is for the chosen dates.
  Phones flag it when deaths ÷ rate is more than 10% off the batches' start.
- Feed conversion is not real: it assumes 1.8 kg a bird (no weights are read)
  and falls back to 1.65 with no data (local desktop shows 0.01). Phones show
  "—, Needs weights". Desktop unchanged.
- The audit trail is capped at 30 (`take: 30`); phones say "(latest 30)".
- Kept, not on the board: the custom From/To range (behind the date row), the
  category split, money by day (board page 2 state), per-batch Make a report
  stays desktop only; phone batch rows open the batch.
- Board page 2 "Make a report" screen: the existing launcher and wizard
  already ask for batch, format and dates; unchanged.

Inventory:
- Desktop's "Total SKUs" counts inventory rows in the EGGS category, which are
  never listed (eggs come from the egg-stock card). Local data: 3 SKUs, 2 rows.
  The phone "In stock" tab counts listed items only.
- The board's "N% left of N bought", "Bought +N" and "N used, not linked to a
  batch" need how much was bought per item; the item doesn't keep that. Phones
  show stock, value (stock × cost per unit), logged use by batch and logged
  use with no batch. "Link N bags to a batch" has no action. Both are TODOs.
- Edit and Delete move to the card's ⋯ menu; Delete ends in the type-the-name
  sheet with the 5-letter reason `deleteInventoryItem` records.
- Empty categories offer Add feed / Add medicine (opens the shared form with
  that category). Used up says why it is empty and links back.
- Low stock stays desktop's "5 or fewer" (the item's reorderLevel, default
  500, is not used anywhere on this screen).

Finance:
- Profit hero, "N entries carry the ledger" when one entry is at least half of
  revenue or of expenses (3+ entries on that side), month groups with in, out
  and net, and an entry sheet. Those entries get an amber Check.
- Auto-logged rows (source EXPENSE: feed, stock, health, batch costs) show an
  AUTO chip; in the entry sheet Delete is disabled with "Delete is off". Desktop
  keeps its trash buttons on ledger rows.
- Delete on phones ends in the type-the-name sheet, with the same 5-letter
  reason the server records (`deleteFinancialTransaction`).
- The add form shows an amber, non-blocking "Larger than every other expense"
  note below md when an amount beats every earlier one of its kind.
- Concept: "Edit entry" (no update action for ledger entries) and the
  Outstanding vs Customers cross-check (customer balances aren't loaded on
  this page and the brief rules out new queries) are TODOs.
- Customer debt from sales lives on Customers (`customer.balanceOwed`); the
  ledger's Outstanding list only holds entries saved as Not paid or Part paid,
  so the two screens can disagree, as the board found.
- The missing-cost prompt still opens over the page on load (unchanged).

Customers:
- The customers pages sit under /dashboard/sales, so the shell already treats
  them as detail pages (back bar, no tab bar). The back bar said "Sale
  details"; it now says "Customers" or "Customer account". No routing change.
- VIP is still "spent more than 1000" in the farm currency (desktop's rule,
  now a named constant); the VIP filter says so.
- The statement flags a balance with no orders behind it, and a balance that
  differs from what pending orders leave unpaid (total − cash received).
- `getCustomerStatement` does not filter deleted orders; phones mark them
  "Deleted" and leave them out of the spent and unpaid figures. Desktop
  unchanged.
- Sales shows Record payment to CASHIER but `recordPayment` only allows
  OWNER, ACCOUNTANT, FINANCE_OFFICER and MANAGER (MANAGER never sees the
  button). Role gating left as is.
- Concept: account-level Record payment (recordPayment without an orderId
  only lowers the balance, with no ledger entry), Add email / Add address (no
  customer edit flow) and the statement PDF are stubbed with TODOs.
- The statement numbers orders newest first ("Order 1" is the latest), as
  desktop does; Sales numbers them oldest first.

Sales:
- Desktop's "Avg daily revenue" is total ÷ days between the first and last
  order, but its note says "Across N orders", which reads as per order. Phones
  label it "Total ÷ N days, not per order". Desktop copy unchanged.
- The page keeps one SalesActionsHeader (so `?quick=sell` and `sellBatchId`
  open one form); below md its container is a fixed bar above the tab bar.
- Order rows expand to named actions (Receipt, WhatsApp, Record payment) with
  Mark completed / Cancel order in the ⋯ menu, and an Open order link.
- The record-a-sale price check and the order-detail screen on page 2 are
  concept: the 1,074-line SalesForm and the order detail page are unchanged.
- An order more than 10× the median unit price gets an amber Check, and the
  "one order is N% of revenue" card shows when one order is at least half.

Batch details, layer edition:
- Revenue entries show a price per unit; an entry more than 10× the median
  unit price (with at least 3 priced entries) gets an amber Check chip and the
  "one entry carries the revenue" card. It never blocks anything. In the
  board's data, 900 units for R 1 800 000 (R 2 000 an egg) looks like a typo.
- The dead count is reconciled as "N dead = logged + not logged". The cause of
  the gap is not recorded; the note lists the isolation numbers and only says
  "may have died there" when the isolation leavers match the gap exactly.
- Batch logs (mortality records) are not filtered by `isDeleted`.
- The egg chart draws only days with a collection (last 8), with total, shown
  and not shown worked out.

Batch details:
- The head count's "dead" (start − alive − isolated) can disagree with logged
  deaths: in the local test data one batch showed 103 "dead" against 5 logged.
  The hero shows the head-count split, the Mortality tile the logged figure.
- The daily mortality series only has days with deaths and carries display
  labels, not dates, so the phone chart shows logged days only (the board also
  drew the empty days).
- Logs history, Make a report and the embedded health schedule reuse their
  existing components (graphite inside the Quiet Ledger page) on phones.
- Dropped on phones as repeats, per the board: current stock, the revenue grid,
  the batch details card, monthly finance chart. Egg days stay for layers.

Livestock:
- "Dead" is the starting count minus alive minus isolated (the existing
  head-count rule), so birds that leave any other way (sold, moved) also show
  as dead on the list and in the farm total.
- Delete asks for the unit's name and the reason the server requires (at
  least 5 letters); it moves the unit to the trash (soft delete), so the sheet
  says that rather than "can't be undone".
- The farm-wide count adds up active units only.

Analytics batch comparison:
- The last selected batch chip is locked with "Keep one batch to compare";
  desktop still lets you clear every batch (its empty state is unchanged).
- Mortality is flagged above 5% (the rule the desktop cards already use for
  red); the dashed line is the existing 3.5% benchmark. Both are shown in text.
- FCR here comes from the analytics report; with no weights it shows "—" and
  the Add weights step. In the local data a broiler showed FCR 0.01, which
  points at the same bags-versus-kilograms mix noted under Feed.
- With more than two batches the side-by-side table scrolls inside its card.
- The egg ranking and per-batch cards from desktop are covered on phones by
  the Eggs tab and the side-by-side table.

Mortality:
- `getAllMortalityLogs` loads the latest 50 DEAD logs, so the total (labelled
  "across all active & archived batches" on desktop) can undercount.
- It does not include `isolationRoom`, so every log reads "No room" on
  desktop and phone.
- It does not filter `isDeleted`, so deleted logs still count.
- The 1% check uses each flock's current head count (the board makes the same
  assumption) and looks at the worst flock-day in the last 7 days.
- Cause is picked with the flock form's cause / what-exactly lists, not two
  chips; adding a cause to an old log has no endpoint, so the nudge links to
  the batch.
- The log-deaths sheet has no room picker: the existing death flow never sets
  a room (only sick birds go to a room).

Quarantine:
- Isolated birds are counted per flock (`isolationCount`), not per room. Room
  use is worked out as all isolated birds against the rooms' total places; it
  is exact with one room (the board's case) and an approximation with several,
  so the per-room "free" chip only shows when there is one room.
- Recovered still saves on one tap (as before); Died now opens the two-step
  record-loss sheet ("This will … This can't be undone").
- The isolate and loss sheets use the flock form's cause lists (exported as
  `MORTALITY_REASONS`); "Unknown cause yet" stays the default.
- "Add a new room" inside the old isolate form is now the + New room link,
  which opens the existing room form.

Feed:
- Fixed: the feed page keeps its logs in client state seeded once from the
  server, so editing or deleting a log from the history left the list stale
  until a reload (desktop too). Edits and deletes now call the page's existing
  refresh (`refreshFeedDynamicData`).
- FCR on this page is all-time bags fed ÷ (gain between the last two weights ×
  head count), mixing bags with kilograms and an all-time total with one
  interval. Phones show "—" with "Needs a weight" / "Needs a second weight"
  when it cannot be worked out, and no target chip, since the figure is not a
  true FCR. Not changed.
- The stock list only loads items with stock above zero, so the "Out" state
  can never show here.
- The board's Note field has no column on feeding logs; not added.
- "Load older logs": the page loads the latest 100 logs; phones reveal them
  ten days at a time ("Show older logs"), no new query.

Health schedule:
- Delete on phones now goes through the ⋯ menu and a type-the-name confirm.
  Desktop still deletes on one tap with no confirm (unchanged, but worth a look).
- "Reschedule" on the board has no endpoint (only status changes and delete
  exist), so it is not shown; the ⋯ menu offers Mark done, Back to pending,
  Cancel dose and Delete.
- The board locks the vaccine field until a flock is picked; the real form does
  not, and that is kept.
- The count tiles are pending doses (pending total, pending vaccines, pending
  medicines), as the sample figures imply; a mono note says so.
- Required "3" counts flock, item, and amount (or date for used-once items).

Egg production:
- `getAllEggProduction` loads only the latest 50 logs. The stock summary
  ("Usable logged", labelled "all collections" on desktop) and the page's
  today and 7-day totals are worked out from those 50, so a farm with more
  than 50 logs in a week undercounts. Not changed (needs a query change).
- The board's log screen treats crates + loose as everything laid, with
  unusable taken away (1,076 − 12). The real form treats crates + loose as
  good eggs and adds unusable on top. Kept the real behaviour; the phone
  summary says "good eggs" and "laid = good + unusable".
- Delete still uses the shared reason-required confirm (moves to trash), not a
  type-the-name screen; it now sits in the ⋯ menu on phones.
- The flock selector picks the flock the Log production button logs for; the
  overview figures stay farm-wide, as before.

Owner dashboard:
- Quick log now opens the eggs and feed log forms and the sell form straight
  away (`?quick=log` / `?quick=sell`, which those pages already support).

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
