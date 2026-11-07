"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock3, Crown, Monitor, Shield, Smartphone, Tag, User, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { previewPromoCode, requestSubscriptionUpgrade, startPaystackCheckout } from "@/lib/actions/subscription-actions";
import { type DesktopLicenseRow } from "@/lib/actions/licenses";
import {
  PLAN_FEATURE_DETAILS,
  PLAN_FEATURE_KEYS,
  staffLimitLabel,
  termDiscount,
  type BillingConfig,
  type PaidTier,
} from "@/lib/billing/pricing";
import { cn } from "@/lib/utils";

type PlanTypeValue = "SOLO" | "TEAM";

export type PlanAccessView = {
  state: "TRIAL" | "PAID" | "GRACE" | "LOCKED";
  tier: "BASIC" | PaidTier;
  isTrial: boolean;
  endsAt: string | null;
  graceEndsAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Included in every paid plan; the admin-configurable features are listed after these. */
const CORE_FEATURES = [
  "Egg, feed and mortality logging for every batch",
  "Houses and livestock batches",
  "Sales and orders",
  "Inventory and feed formulation",
  "Reports and analytics",
];

function formatCurrency(value: number) {
  return `GHS ${new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getDeviceAccessLabel(device: DesktopLicenseRow) {
  const normalizedStatus = device.status.toUpperCase();
  const expiresAt = device.licenseExpiresAt ? new Date(device.licenseExpiresAt) : null;
  const expiryTime = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.getTime() : null;
  const now = Date.now();

  if (normalizedStatus === "EXPIRED" || (expiryTime !== null && expiryTime < now)) {
    const daysAgo = expiryTime === null ? null : Math.max(0, Math.ceil((now - expiryTime) / DAY_MS));
    return daysAgo === null ? "Expired" : daysAgo === 0 ? "Expired today" : `Expired ${daysAgo} days ago`;
  }

  if (normalizedStatus === "CLOUD_TRIAL" && expiryTime !== null) {
    const daysLeft = Math.max(0, Math.ceil((expiryTime - now) / DAY_MS));
    return `Trial ends in ${daysLeft} days`;
  }

  if (normalizedStatus === "ACTIVE" && expiryTime !== null) {
    return `Active · ends ${formatDate(device.licenseExpiresAt)}`;
  }

  return device.status || "Pending";
}

function getTimerTone(expiry: Date | null, now: Date) {
  if (!expiry) return "border-white/15 bg-white/10 text-white/75";
  const remainingDays = (expiry.getTime() - now.getTime()) / DAY_MS;
  if (remainingDays < 3) return "border-white/[0.08] bg-white/[0.04] text-red-100";
  if (remainingDays < 7) return "border-white/[0.08] bg-white/[0.04] text-amber-100";
  return "border-white/[0.08] bg-white/[0.04] text-[#ededed]";
}

function formatRemaining(expiry: Date | null, now: Date) {
  if (!expiry) return "No end date";

  const remainingMs = expiry.getTime() - now.getTime();
  if (remainingMs <= 0) return "Ended";

  const days = Math.floor(remainingMs / DAY_MS);
  const hours = Math.floor((remainingMs % DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);

  return `${days} days · ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} remaining`;
}

/** Same order as the server's calculateUpgradeTotal: term discount, then the extra percents. */
function getTermPricing(months: number, monthlyPrice: number, discount: number, extraPercents: number[] = []) {
  const subtotal = months * monthlyPrice;
  const total = Math.round(extraPercents.reduce((value, percent) => value * (1 - percent / 100), subtotal * (1 - discount)) * 100) / 100;

  return {
    total,
    discount,
    savings: subtotal - total,
  };
}

function describeCurrentPlan(access: PlanAccessView, planType: PlanTypeValue, billing: BillingConfig) {
  if (access.state === "LOCKED") {
    return {
      label: "No active plan",
      note: access.isTrial
        ? "Your free trial has ended. Choose a plan to unlock your farm."
        : "Your plan has ended. Choose a plan to unlock your farm.",
      timerLabel: null,
      timerEnd: null,
    };
  }

  const name = access.isTrial
    ? "FREE TRIAL · ALL FEATURES"
    : access.tier === "BASIC"
      ? "NO ACTIVE PLAN"
      : billing.plans[planType][access.tier].name.toUpperCase();

  if (access.state === "GRACE") {
    return {
      label: name,
      note: `Your ${access.isTrial ? "free trial" : "plan"} has ended. Choose a plan before ${formatDate(access.graceEndsAt)} to keep access.`,
      timerLabel: "Your farm locks in",
      timerEnd: access.graceEndsAt,
    };
  }

  return {
    label: name,
    note: access.isTrial
      ? `Every feature is free until ${formatDate(access.endsAt)}. Choose a plan before then to keep working.`
      : null,
    timerLabel: access.isTrial ? "Your free trial ends in" : "Your plan renews in",
    timerEnd: access.endsAt,
  };
}

export default function LicenseUpgradeClient({
  planType,
  initialType,
  access,
  devices,
  billing,
  paystackAvailable,
  farmDiscountPercent,
}: {
  /** The farm's current plan type. */
  planType: PlanTypeValue;
  /** Plan type to show first (from Settings, or the farm's own). */
  initialType: PlanTypeValue;
  access: PlanAccessView;
  devices: DesktopLicenseRow[];
  /** Admin-set plan names, prices, features and discounts. */
  billing: BillingConfig;
  /** Paystack keys are configured and an admin has online checkout switched on. */
  paystackAvailable: boolean;
  /** Admin-set custom discount for this farm (0 when none). */
  farmDiscountPercent: number;
}) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<PlanTypeValue>(initialType);
  const [selectedMonths, setSelectedMonths] = useState<number>(billing.offeredTerms[0] ?? 1);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percentOff: number } | null>(null);
  const [isCheckingPromo, startPromoCheck] = useTransition();
  const [manualRequest, setManualRequest] = useState<{ amount: number; planName: string } | null>(null);
  const extraDiscounts = [farmDiscountPercent, appliedPromo?.percentOff ?? 0].filter((value) => value > 0);
  const [now, setNow] = useState(() => new Date());
  const [isUpgrading, startTransition] = useTransition();
  const current = describeCurrentPlan(access, planType, billing);
  const monthOptions = billing.offeredTerms.map((months) => ({ months, discount: billing.termDiscounts[`${months}`] }));
  const timerEnd = current.timerEnd ? new Date(current.timerEnd) : null;

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Result of a Paystack checkout, set by /api/payments/paystack/callback.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    if (payment === "success") {
      toast.success("Payment received. Your plan is now active.");
    } else if (payment === "pending") {
      toast.info("We're confirming your payment. Your plan will update shortly.");
    } else {
      toast.error("Payment was not completed. You have not been charged for a new plan.");
    }
    router.replace("/dashboard/license-upgrade");
  }, [router]);

  function handlePaystackCheckout(tier: PaidTier) {
    startTransition(async () => {
      const result = await startPaystackCheckout(selectedType, tier, selectedMonths, appliedPromo?.code);

      if (!result.success || !("authorizationUrl" in result) || !result.authorizationUrl) {
        toast.error(result.error || "Could not start the payment");
        return;
      }

      window.location.assign(result.authorizationUrl);
    });
  }

  function handleUpgrade(tier: PaidTier) {
    startTransition(async () => {
      const result = await requestSubscriptionUpgrade(selectedType, tier, selectedMonths, appliedPromo?.code);

      if (!result.success) {
        toast.error(result.error || "Failed to submit upgrade request");
        return;
      }

      toast.success(
        result.message ||
          "Upgrade request submitted. Complete payment to activate your plan.",
      );
      if ("totalAmount" in result && typeof result.totalAmount === "number") {
        setManualRequest({ amount: result.totalAmount, planName: billing.plans[selectedType][tier].name });
      }
      router.refresh();
    });
  }

  function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    startPromoCheck(async () => {
      try {
        const result = await previewPromoCode(code, selectedType);
        if (!result.success) {
          setAppliedPromo(null);
          toast.error(result.error);
          return;
        }
        setAppliedPromo({ code: result.code, percentOff: result.percentOff });
        toast.success(`${result.code}: ${result.percentOff}% off applied`);
      } catch {
        toast.error("Could not check the promo code. Try again.");
      }
    });
  }

  const tiers: { tier: PaidTier; icon: React.ElementType; color: string; shadow: string; popular?: boolean }[] = [
    { tier: "STANDARD", icon: Shield, color: "", shadow: "" },
    { tier: "PREMIUM", icon: Crown, color: "", shadow: "", popular: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-0 md:px-3 pt-2 pb-7 md:py-10">
      <section className="rounded-lg border border-white/10 bg-[#19191b]/80 p-6 shadow-black/25">
        <p className="text-xs font-medium text-[#ededed]">Your current plan</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-[#ededed]">
              {current.label}
            </span>
            {current.timerLabel ? (
              <div className={cn("mt-4 flex w-fit items-center gap-3 rounded-lg border px-4 py-3 font-medium", getTimerTone(timerEnd, now))}>
                <Clock3 className="h-5 w-5" />
                <div>
                  <p className="text-xs opacity-75">{current.timerLabel}</p>
                  <p className="mt-1 text-lg">{formatRemaining(timerEnd, now)}</p>
                </div>
              </div>
            ) : null}
            {current.note ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{current.note}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="text-xs font-medium text-white/40">Connected desktop devices</p>
          {devices.length === 0 ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              No desktop connected yet.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {devices.map((device) => (
                <div key={device.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Monitor className="h-5 w-5 shrink-0 text-[#85858b]" />
                    <span className="truncate font-medium text-white">
                      {device.deviceName || device.hardwareId || "Unnamed desktop"}
                    </span>
                  </div>
                  <span className="font-medium text-white/65">{getDeviceAccessLabel(device)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-white/10 bg-[#19191b]/70 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/25 p-1 sm:w-fit">
          {(["SOLO", "TEAM"] as const).map((type) => {
            const Icon = type === "SOLO" ? User : Users;
            const selected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium transition",
                  selected ? "bg-white/[0.04] text-[#ededed]" : "text-white/60 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {type === "SOLO" ? "Solo" : "Team"}
              </button>
            );
          })}
        </div>
        {selectedType !== planType ? (
          <p className="text-sm text-[#ededed]">
            You are on {planType === "SOLO" ? "Solo" : "Team"}. Buying a {selectedType === "SOLO" ? "Solo" : "Team"} plan switches your farm to {selectedType === "SOLO" ? "Solo (owner only)" : "Team"}.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {monthOptions.map((option) => {
            const selected = selectedMonths === option.months;
            return (
              <button
                key={option.months}
                type="button"
                onClick={() => setSelectedMonths(option.months)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition",
                  selected
                    ? "border-emerald-300 bg-white/[0.04] text-[#ededed]"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white",
                )}
              >
                {option.months} {option.months === 1 ? "Month" : "Months"}
                {option.discount > 0 ? ` · ${Math.round(option.discount * 100)}% off` : ""}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
          <label className="relative flex-1 sm:max-w-xs">
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <span className="sr-only">Promo code</span>
            <input
              value={promoInput}
              onChange={(event) => {
                setPromoInput(event.target.value);
                if (appliedPromo) setAppliedPromo(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyPromo();
                }
              }}
              placeholder="Promo code"
              className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-4 text-sm font-medium text-white outline-none placeholder:normal-case placeholder:text-white/40 focus:border-white/[0.08]"
            />
          </label>
          <button
            type="button"
            onClick={applyPromo}
            disabled={!promoInput.trim() || isCheckingPromo}
            className="h-10 rounded-full border border-white/15 px-5 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            {isCheckingPromo ? "Checking..." : "Apply"}
          </button>
          <div className="text-sm text-[#ededed]">
            {appliedPromo ? <p>{appliedPromo.code}: {appliedPromo.percentOff}% off</p> : null}
            {farmDiscountPercent > 0 ? <p>Your farm has a {farmDiscountPercent}% discount.</p> : null}
          </div>
        </div>
      </section>

      {manualRequest ? (
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5 text-sm text-amber-50">
          <p className="flex items-center gap-2 text-xs font-medium text-[#ededed]">
            <Smartphone className="h-4 w-4" /> Pay by Mobile Money
          </p>
          <p className="mt-3 text-base font-medium text-white">
            Send {formatCurrency(manualRequest.amount)} for {manualRequest.planName}
          </p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            {billing.manualPayment.network ? (
              <div><dt className="text-xs text-[#ededed]">Network</dt><dd className="font-medium">{billing.manualPayment.network}</dd></div>
            ) : null}
            {billing.manualPayment.momoNumber ? (
              <div><dt className="text-xs text-[#ededed]">Number</dt><dd className="font-medium">{billing.manualPayment.momoNumber}</dd></div>
            ) : null}
            {billing.manualPayment.accountName ? (
              <div><dt className="text-xs text-[#ededed]">Account name</dt><dd className="font-medium">{billing.manualPayment.accountName}</dd></div>
            ) : null}
          </dl>
          {billing.manualPayment.instructions ? <p className="mt-3 leading-6 text-amber-50/90">{billing.manualPayment.instructions}</p> : null}
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {tiers.map((plan) => {
          const planConfig = billing.plans[selectedType][plan.tier];
          const monthly = planConfig.monthlyPrice;
          const pricing = getTermPricing(selectedMonths, monthly, termDiscount(billing, selectedMonths), extraDiscounts);
          const Icon = plan.icon;
          const isCurrent =
            !access.isTrial &&
            (access.state === "PAID" || access.state === "GRACE") &&
            planType === selectedType &&
            access.tier === plan.tier;

          return (
            <div key={plan.tier} className="relative h-full">
              {plan.popular ? (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-amber-500 px-5 py-1.5 text-xs font-medium text-black">
                  All features
                </div>
              ) : null}

              <Card className="relative h-full overflow-hidden rounded-lg border-white/10 bg-[#19191b]/75 p-7">
                <CardContent className="flex h-full flex-col gap-7 p-0">
                  <div className="space-y-3">
                    <div className={cn("h-16 w-16 rounded-md bg-[#1e1e20] p-0.5", plan.color, plan.shadow)}>
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-[#19191b]">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-medium text-white">
                        {planConfig.name}
                        {isCurrent ? (
                          <span className="ml-3 align-middle rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-[#ededed]">
                            Current
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-white/70">
                        {staffLimitLabel(selectedType, planConfig.staffLimit)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-medium text-white">GHS {monthly}</span>
                    <span className="text-sm font-medium text-white/60">/ month</span>
                  </div>

                  <ul className="flex-1 space-y-2">
                    {CORE_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm font-medium text-white/75">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04]">
                          <Check className="h-3 w-3 text-[#85858b]" />
                        </span>
                        {feature}
                      </li>
                    ))}
                    {PLAN_FEATURE_KEYS.map((key) => {
                      const feature = PLAN_FEATURE_DETAILS[key].label;
                      const included = planConfig.features.includes(key);
                      return (
                        <li
                          key={key}
                          className={cn("flex items-center gap-2 text-sm font-medium", included ? "text-white/75" : "text-white/35 line-through")}
                        >
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", included ? "bg-white/[0.04]" : "bg-white/5")}>
                            {included ? <Check className="h-3 w-3 text-[#85858b]" /> : <X className="h-3 w-3 text-white/40" />}
                          </span>
                          {feature}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-medium text-white/40">Selected term total</p>
                    <p className="mt-2 text-xl font-medium text-white">
                      {selectedMonths} {selectedMonths === 1 ? "Month" : "Months"} - {formatCurrency(pricing.total)}
                    </p>
                    {pricing.savings > 0 ? (
                      <p className="mt-1 text-sm font-medium text-[#ededed]">
                        {[
                          pricing.discount > 0 ? `${Math.round(pricing.discount * 100)}% term discount` : null,
                          farmDiscountPercent > 0 ? `${farmDiscountPercent}% farm discount` : null,
                          appliedPromo ? `${appliedPromo.percentOff}% promo` : null,
                        ]
                          .filter(Boolean)
                          .join(" + ")}{" "}
                        · save {formatCurrency(pricing.savings)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {paystackAvailable ? (
                    <>
                    <Button
                      onClick={() => handlePaystackCheckout(plan.tier)}
                      isLoading={isUpgrading}
                      loadingText="Opening Paystack..."
                      disabled={isUpgrading}
                      className={cn(
                        "h-14 w-full rounded-lg font-medium",
                        plan.tier === "STANDARD"
                          ? "bg-[#ededed] text-[#141415] hover:bg-white"
                          : "bg-amber-500 text-[#451a03] hover:bg-amber-400",
                      )}
                    >
                      {isCurrent ? "Renew" : "Pay"} {formatCurrency(pricing.total)} with Paystack
                    </Button>
                    <p className="text-center text-xs text-white/50">
                      Mobile Money (MTN, Telecel, AirtelTigo), card or bank transfer.{" "}
                      {billing.manualPayment.enabled ? (
                        <button
                          type="button"
                          onClick={() => handleUpgrade(plan.tier)}
                          disabled={isUpgrading}
                          className="font-medium text-white/70 underline underline-offset-2 hover:text-white disabled:opacity-50"
                        >
                          Pay manually instead
                        </button>
                      ) : null}
                    </p>
                    </>
                    ) : billing.manualPayment.enabled ? (
                      <Button
                        onClick={() => handleUpgrade(plan.tier)}
                        isLoading={isUpgrading}
                        loadingText="Submitting..."
                        disabled={isUpgrading}
                        className={cn(
                          "h-14 w-full rounded-lg font-medium",
                          plan.tier === "STANDARD"
                            ? "bg-[#ededed] text-[#141415] hover:bg-white"
                            : "bg-amber-500 text-[#451a03] hover:bg-amber-400",
                        )}
                      >
                        Pay {formatCurrency(pricing.total)} by Mobile Money
                      </Button>
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-center text-sm text-white/70">
                        Payments are paused right now. Please contact us to subscribe.
                      </p>
                    )}
                    <p className="text-center text-xs leading-5 text-white/60">
                      One-time payment of {formatCurrency(pricing.total)} for {selectedMonths}{" "}
                      {selectedMonths === 1 ? "month" : "months"}. It does not renew automatically. When the term ends you have{" "}
                      {billing.trial.graceDays} {billing.trial.graceDays === 1 ? "day" : "days"} to renew before paid features lock, and your records are kept.{" "}
                      <Link href="/refunds" className="font-medium text-white/80 underline underline-offset-2 hover:text-white">
                        Refund policy
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </section>
    </div>
  );
}
