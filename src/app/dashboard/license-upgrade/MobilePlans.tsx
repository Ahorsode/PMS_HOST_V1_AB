"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Clock3, Info, Minus, Smartphone, Tag } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { qlButton } from "@/components/ui/ql/Button";
import { QL_PRIMARY_ATTR } from "@/components/ui/ql/primary";
import { QlDerived } from "@/components/ui/ql/Derived";

type PlanTypeValue = "SOLO" | "TEAM";
type Tier = "STANDARD" | "PREMIUM";

export type PhonePlanCard = {
  tier: Tier;
  name: string;
  monthlyLabel: string;
  staffLabel: string;
  isCurrent: boolean;
  allFeatures: boolean;
  /** Term total for the selected term, with every discount applied. */
  total: number;
  subtotal: number;
  savings: number;
};

export type PhoneTerm = { months: number; discount: number; totalForSelectedTier: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

/** Plans on a phone: current plan calmly, one type switch, terms with prices, two plan cards, one Pay bar. */
export function MobilePlans({
  currentLabel,
  currentNote,
  state,
  isTrial,
  endsAt,
  graceEndsAt,
  planType,
  selectedType,
  onSelectType,
  terms,
  selectedMonths,
  onSelectMonths,
  plans,
  selectedTier,
  onSelectTier,
  inBoth,
  onlyIn,
  promoInput,
  onPromoInput,
  onApplyPromo,
  checkingPromo,
  appliedPromo,
  farmDiscountPercent,
  fineprint,
  format,
  paystackAvailable,
  manualPaymentEnabled,
  busy,
  onPaystack,
  onManual,
  manualRequest,
}: {
  currentLabel: string;
  currentNote: string | null;
  state: "TRIAL" | "PAID" | "GRACE" | "LOCKED";
  isTrial: boolean;
  endsAt: string | null;
  graceEndsAt: string | null;
  planType: PlanTypeValue;
  selectedType: PlanTypeValue;
  onSelectType: (type: PlanTypeValue) => void;
  terms: PhoneTerm[];
  selectedMonths: number;
  onSelectMonths: (months: number) => void;
  plans: PhonePlanCard[];
  selectedTier: Tier;
  onSelectTier: (tier: Tier) => void;
  inBoth: string[];
  onlyIn: Array<{ label: string; standard: boolean; premium: boolean }>;
  promoInput: string;
  onPromoInput: (value: string) => void;
  onApplyPromo: () => void;
  checkingPromo: boolean;
  appliedPromo: { code: string; percentOff: number } | null;
  farmDiscountPercent: number;
  fineprint: string;
  format: (value: number) => string;
  paystackAvailable: boolean;
  manualPaymentEnabled: boolean;
  busy: boolean;
  onPaystack: () => void;
  onManual: () => void;
  manualRequest: React.ReactNode;
}) {
  const [promoOpen, setPromoOpen] = useState(!!appliedPromo);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const plan = plans.find((p) => p.tier === selectedTier) ?? plans[plans.length - 1];
  // Term tiles are narrow: the currency is named once above them, the tiles show the number.
  const currencyMark = format(0).replace(/[\d.,\s]/g, '') || '';
  const plain = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
  const switching = selectedType !== planType;
  const typeName = (t: PlanTypeValue) => (t === "SOLO" ? "Solo" : "Team");
  const termLabel = `${selectedMonths} ${selectedMonths === 1 ? "month" : "months"}`;
  const end = state === "GRACE" ? graceEndsAt : endsAt;
  const endDate = end ? new Date(end) : null;
  const daysLeft = endDate && now ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS)) : null;
  const endLabel = endDate ? `${endDate.getDate()} ${MONTHS[endDate.getMonth()]} ${endDate.getFullYear()}` : null;
  const lead = state === "GRACE" ? "Locks about" : isTrial ? "Trial ends about" : "Renews about";

  const action = paystackAvailable
    ? `${plan.isCurrent ? "Renew" : switching ? `Switch to ${typeName(selectedType)} and pay` : "Pay"} with Paystack`
    : manualPaymentEnabled
      ? `Pay ${format(plan.total)} by Mobile Money`
      : null;
  const pay = () => {
    if (switching) {
      setConfirmOpen(true);
      return;
    }
    if (paystackAvailable) onPaystack();
    else onManual();
  };

  return (
    <div className="space-y-3 pb-44 font-ql-sans">
      <div>
        <h1 className="font-ql-display text-[26px] font-semibold leading-tight text-ql-text">Plans</h1>
        <p className="text-[13px] text-ql-muted">Settings</p>
      </div>

      <section aria-labelledby="ql-current-plan" className="rounded-[24px] rounded-tl-[8px] border border-ql-line bg-ql-surface p-4">
        <p className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Your current plan</p>
        <p id="ql-current-plan" className="mt-2 flex flex-wrap items-center gap-2 font-ql-display text-[22px] font-semibold leading-tight text-ql-text">
          {currentLabel}
          {state === "PAID" && !isTrial ? (
            <span className="inline-flex h-6 items-center rounded-full bg-ql-mint/12 px-2.5 font-ql-sans text-[11px] font-semibold text-ql-mint">Current</span>
          ) : state === "GRACE" ? (
            <span className="inline-flex h-6 items-center rounded-full bg-ql-amber/14 px-2.5 font-ql-sans text-[11px] font-semibold text-ql-amber">Ended</span>
          ) : state === "LOCKED" ? (
            <span className="inline-flex h-6 items-center rounded-full bg-ql-coral/14 px-2.5 font-ql-sans text-[11px] font-semibold text-ql-coral">Locked</span>
          ) : null}
        </p>
        {endLabel && state !== "LOCKED" ? (
          <p className="mt-2 flex items-center gap-2 text-[13px] text-ql-muted">
            <Clock3 className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span>
              {lead} {endLabel}
              {daysLeft !== null ? (
                <>
                  {" · "}
                  <QlDerived formula="days from today to that date">
                    {daysLeft} {daysLeft === 1 ? "day" : "days"}
                  </QlDerived>
                </>
              ) : null}
            </span>
          </p>
        ) : null}
        {currentNote ? <p className="mt-2 text-[13px] leading-snug text-ql-muted">{currentNote}</p> : null}
      </section>

      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <p className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Plan type</p>
        <div role="radiogroup" aria-label="Plan type" className="flex rounded-full border border-ql-line bg-ql-ground p-0.5">
          {(["SOLO", "TEAM"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selectedType === type}
              onClick={() => onSelectType(type)}
              className={cn(
                "relative h-9 min-w-16 rounded-full px-4 text-[14px] font-semibold after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                selectedType === type ? "bg-ql-surface text-ql-text" : "text-ql-muted",
              )}
            >
              {typeName(type)}
            </button>
          ))}
        </div>
      </div>
      {switching ? (
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">You are on {typeName(planType)}</span>
            <span className="text-ql-muted">
              Buying a {typeName(selectedType)} plan switches your farm to {selectedType === "SOLO" ? "Solo, owner only" : "Team, with staff"}.
            </span>
          </p>
        </div>
      ) : null}

      <p className="px-1 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">Term · totals in {currencyMark}</p>
      <div role="radiogroup" aria-label="Term" className={cn("grid gap-2", terms.length >= 4 ? "grid-cols-4" : terms.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {terms.map((term) => {
          const selected = term.months === selectedMonths;
          return (
            <button
              key={term.months}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectMonths(term.months)}
              className={cn(
                "flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center rounded-2xl border px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                selected ? "border-ql-mint/60 bg-ql-mint/[0.08]" : "border-ql-line bg-ql-surface",
              )}
            >
              <span className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">{term.months} mo</span>
              <span className="mt-1 max-w-full font-ql-display text-[13px] font-semibold leading-tight text-ql-text">
                {term.months === 1 ? plain(term.totalForSelectedTier) : <QlDerived formula="monthly price × months, less the term discount">{plain(term.totalForSelectedTier)}</QlDerived>}
              </span>
              {term.discount > 0 ? <span className="font-ql-mono text-[10px] text-ql-amber">−{Math.round(term.discount * 100)}%</span> : null}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Plan" className="grid grid-cols-2 gap-2">
        {plans.map((p) => {
          const selected = p.tier === selectedTier;
          return (
            <button
              key={p.tier}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectTier(p.tier)}
              className={cn(
                "flex min-w-0 flex-col items-start rounded-2xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60",
                selected ? "border-ql-mint/60 bg-ql-mint/[0.06]" : "border-ql-line bg-ql-surface",
              )}
            >
              <span className="text-[15px] font-semibold leading-snug text-ql-text">{p.name}</span>
              <span className="mt-1 flex min-h-6 flex-wrap gap-1">
                {p.isCurrent ? <span className="inline-flex h-5 items-center rounded-full bg-ql-mint/12 px-2 text-[10px] font-semibold text-ql-mint">Current</span> : null}
                {p.allFeatures ? <span className="inline-flex h-5 items-center rounded-full bg-ql-amber/14 px-2 text-[10px] font-semibold text-ql-amber">All features</span> : null}
              </span>
              <span className="mt-2 font-ql-display text-[20px] font-semibold leading-tight text-ql-text">
                <span className="whitespace-nowrap">{p.monthlyLabel}</span>
                <span className="font-ql-sans text-[12px] font-normal text-ql-muted">/month</span>
              </span>
              <span className="mt-1 text-[12px] text-ql-muted">{p.staffLabel}</span>
            </button>
          );
        })}
      </div>

      <section aria-label="What each plan includes" className="rounded-2xl border border-ql-line bg-ql-surface p-4">
        <p className="text-[13px] leading-snug text-ql-muted">
          <span className="font-semibold text-ql-text">In both:</span> {inBoth.join(", ").toLowerCase()}.
        </p>
        {onlyIn.length > 0 ? (
          <table className="mt-3 w-full text-left text-[14px]">
            <thead>
              <tr className="font-ql-mono text-[10px] uppercase tracking-[0.08em] text-ql-muted">
                <th className="py-1 font-normal">Differs by plan</th>
                {plans.map((p) => (
                  <th key={p.tier} className="w-16 py-1 text-center font-normal">
                    {p.tier === "PREMIUM" ? "Plus" : "Base"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {onlyIn.map((row) => (
                <tr key={row.label} className="border-t border-ql-line">
                  <td className="py-2.5 text-ql-text">{row.label}</td>
                  {plans.map((p) => {
                    const has = p.tier === "PREMIUM" ? row.premium : row.standard;
                    return (
                      <td key={p.tier} className="text-center">
                        {has ? <Check className="mx-auto h-4 w-4 text-ql-mint" strokeWidth={2} aria-label="Included" /> : <Minus className="mx-auto h-4 w-4 text-ql-muted" strokeWidth={1.5} aria-label="Not included" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <div className="rounded-2xl border border-ql-line bg-ql-surface">
        <button
          type="button"
          onClick={() => setPromoOpen((v) => !v)}
          aria-expanded={promoOpen}
          className="flex min-h-12 w-full items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ql-mint/60"
        >
          <Tag className="h-4 w-4 shrink-0 text-ql-muted" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-[14px] text-ql-text">{appliedPromo ? `${appliedPromo.code}: ${appliedPromo.percentOff}% off` : "Have a promo code?"}</span>
          <span className="flex items-center gap-1 text-[13px] font-semibold text-ql-mint">
            {promoOpen ? "Hide" : appliedPromo ? "Change" : "Add"}
            <ChevronDown className={cn("h-4 w-4 transition-transform motion-reduce:transition-none", promoOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
          </span>
        </button>
        {promoOpen ? (
          <div className="flex gap-2 border-t border-ql-line p-3">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Promo code</span>
              <input
                value={promoInput}
                onChange={(e) => onPromoInput(e.target.value)}
                autoCapitalize="characters"
                placeholder="Promo code"
                className="h-11 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] uppercase text-ql-text placeholder:normal-case placeholder:text-ql-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
              />
            </label>
            <button type="button" onClick={onApplyPromo} disabled={!promoInput.trim() || checkingPromo} className={qlButton("ghost")}>
              {checkingPromo ? "Checking" : "Apply"}
            </button>
          </div>
        ) : null}
      </div>
      {farmDiscountPercent > 0 ? <p className="px-1 text-[13px] text-ql-muted">Your farm has a {farmDiscountPercent}% discount.</p> : null}

      {manualRequest}

      <p className="px-1 text-[12px] leading-relaxed text-ql-muted">
        {fineprint}{" "}
        <Link href="/refunds" className="relative font-semibold text-ql-text underline underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']">
          Refund policy
        </Link>
      </p>

      <div className="fixed inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),6px))] z-40 border-t border-ql-line bg-ql-ground/95 px-4 pb-3 pt-2 backdrop-blur md:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-[13px] text-ql-muted">
            {plan.name} · {termLabel}
            {plan.savings > 0 ? ` · save ${format(plan.savings)}` : ""}
          </span>
          <span className="shrink-0 font-ql-display text-[20px] font-semibold text-ql-text">{format(plan.total)}</span>
        </div>
        {action ? (
          <>
            <button type="button" onClick={pay} disabled={busy} className={qlButton("filled", "min-h-12 w-full rounded-2xl")} {...QL_PRIMARY_ATTR}>
              {busy ? "Opening…" : action}
            </button>
            {paystackAvailable && manualPaymentEnabled && !switching ? (
              <button type="button" onClick={onManual} disabled={busy} className={qlButton("text", "mt-1 w-full text-[13px] text-ql-muted")}>
                Pay manually instead
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button type="button" disabled aria-describedby="ql-pay-paused" className={qlButton("filled", "min-h-12 w-full rounded-2xl")}>
              Pay
            </button>
            <p id="ql-pay-paused" className="mt-2 text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
              Payments are paused. Contact us to subscribe.
            </p>
          </>
        )}
      </div>

      <SwitchTypeSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        from={currentLabel}
        toName={plan.name}
        toType={typeName(selectedType)}
        termLabel={termLabel}
        total={format(plan.total)}
        busy={busy}
        payLabel={paystackAvailable ? `Pay ${format(plan.total)} with Paystack` : `Pay ${format(plan.total)} by Mobile Money`}
        onConfirm={() => {
          setConfirmOpen(false);
          if (paystackAvailable) onPaystack();
          else onManual();
        }}
        ownerOnly={selectedType === "SOLO"}
      />
    </div>
  );
}

function SwitchTypeSheet({
  open,
  onOpenChange,
  from,
  toName,
  toType,
  termLabel,
  total,
  busy,
  payLabel,
  onConfirm,
  ownerOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  from: string;
  toName: string;
  toType: string;
  termLabel: string;
  total: string;
  busy: boolean;
  payLabel: string;
  onConfirm: () => void;
  ownerOnly: boolean;
}) {
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const reasonId = useId();
  const matches = typed.trim().toLowerCase() === toType.toLowerCase();
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Dialog isOpen={open} onOpenChange={(next) => !busy && onOpenChange(next)} title={`Switch to ${toType}`} description="Plans">
      <div className="space-y-4 pb-2 font-ql-sans">
        <div role="note" className="flex gap-3 rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ql-amber" strokeWidth={1.75} aria-hidden />
          <p className="text-[13px] leading-snug">
            <span className="block font-semibold text-ql-text">{ownerOnly ? "Your farm becomes owner only" : "Your farm can have staff"}</span>
            <span className="text-ql-muted">
              {ownerOnly
                ? "Buying a Solo plan switches the farm to Solo, so staff can no longer sign in. Their accounts are kept."
                : "Buying a Team plan switches the farm to Team, so you can invite staff."}
            </span>
          </p>
        </div>
        <dl className="overflow-hidden rounded-2xl border border-ql-line bg-ql-surface text-[14px]">
          {[
            ["From", from],
            ["To", toName],
            ["Term", termLabel],
            ["Total", total],
          ].map(([k, v]) => (
            <div key={k} className="flex min-h-11 items-center justify-between gap-3 border-b border-ql-line px-4 last:border-b-0">
              <dt className="text-ql-muted">{k}</dt>
              <dd className="font-ql-mono font-semibold text-ql-text">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <label htmlFor={inputId} className="font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-muted">
            Type <span className="normal-case text-ql-text">{toType}</span> to confirm
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={toType}
            aria-describedby={matches ? undefined : reasonId}
            className="mt-2 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text placeholder:text-ql-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ql-mint/60"
          />
        </div>
        {!matches ? (
          <p id={reasonId} className="text-center font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
            Turns on when you type {toType}
          </p>
        ) : null}
        <button type="button" onClick={onConfirm} disabled={!matches || busy} className={qlButton("filled", "min-h-12 w-full rounded-2xl")}>
          {payLabel}
        </button>
      </div>
    </Dialog>
  );
}

/** Mobile Money details after a manual request, in the phone style. */
export function PhoneManualRequest({ amount, planName, rows, instructions }: { amount: string; planName: string; rows: Array<[string, string]>; instructions?: string | null }) {
  return (
    <section className="rounded-2xl border border-ql-amber/40 bg-ql-amber/[0.06] p-4 text-[13px]">
      <p className="flex items-center gap-2 font-ql-mono text-[11px] uppercase tracking-[0.08em] text-ql-amber">
        <Smartphone className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Pay by Mobile Money
      </p>
      <p className="mt-2 text-[15px] font-semibold text-ql-text">
        Send {amount} for {planName}
      </p>
      <dl className="mt-2 space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ql-muted">{k}</dt>
            <dd className="font-semibold text-ql-text">{v}</dd>
          </div>
        ))}
      </dl>
      {instructions ? <p className="mt-2 leading-snug text-ql-muted">{instructions}</p> : null}
    </section>
  );
}
