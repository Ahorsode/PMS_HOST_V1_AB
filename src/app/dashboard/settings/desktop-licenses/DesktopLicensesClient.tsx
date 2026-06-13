"use client";

import React, { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, MonitorCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { type DesktopLicenseRow } from "@/lib/actions/licenses";
import { upgradeFarmSubscription } from "@/lib/actions/subscription-actions";

interface DesktopLicensesClientProps {
  licenses: DesktopLicenseRow[];
  isPaid: boolean;
}

function statusBadge(status: string) {
  switch (status) {
    case "CLOUD_TRIAL":
      return "border-amber-300/30 bg-amber-500/15 text-amber-100";
    case "ACTIVE":
      return "border-emerald-300/30 bg-emerald-500/15 text-emerald-100";
    case "EXPIRED":
      return "border-red-300/30 bg-red-500/15 text-red-100";
    default:
      return "border-white/20 bg-white/10 text-white/70";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "CLOUD_TRIAL":
      return "Trial";
    case "ACTIVE":
      return "Active";
    case "EXPIRED":
      return "Expired";
    default:
      return "Unknown";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "full" }).format(date);
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Never synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never synced";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const divisions = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.345, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ] as const;

  let duration = diffSeconds;
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round(duration),
        division.unit,
      );
    }
    duration /= division.amount;
  }

  return "Never synced";
}

export default function DesktopLicensesClient({ licenses, isPaid }: DesktopLicensesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showUpgrade = useMemo(
    () => !isPaid || licenses.some((license) => license.status === "EXPIRED"),
    [isPaid, licenses],
  );

  function handleUpgrade() {
    startTransition(async () => {
      const result = await upgradeFarmSubscription("STANDARD");
      if (result.success) {
        router.refresh();
      } else {
        console.error("[upgradeFarmSubscription]", result.error);
      }
    });
  }

  if (licenses.length === 0) {
    return (
      <Card className="border border-white/15 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <MonitorCheck className="h-5 w-5 text-emerald-300" />
            No Desktop Devices Registered
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="max-w-2xl text-sm leading-6 text-white/70">
            Install the desktop app and sign in with your account. A 30-day trial
            starts automatically when the first device registers.
          </p>
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-100">
            No key is needed for desktop access.
          </div>
          {!isPaid ? (
            <Button
              onClick={handleUpgrade}
              isLoading={isPending}
              loadingText="Upgrading..."
              className="min-w-56"
            >
              <CreditCard className="h-4 w-4" />
              Upgrade Subscription
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-white/15 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <MonitorCheck className="h-5 w-5 text-emerald-300" />
            Registered Desktop Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-white/10">
            <div className="grid grid-cols-[minmax(0,1fr)_150px_220px_160px] gap-4 border-b border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/50 max-lg:hidden">
              <span>Device</span>
              <span>Status</span>
              <span>Access Until</span>
              <span>Last Sync</span>
            </div>
            <div className="divide-y divide-white/10">
              {licenses.map((license) => (
                <div
                  key={license.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 text-sm text-white/80 lg:grid-cols-[minmax(0,1fr)_150px_220px_160px] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {license.hardwareId || "Pending device fingerprint"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">Desktop registration</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(license.status)}`}>
                      {statusLabel(license.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Clock3 className="h-4 w-4 text-white/40" />
                    {formatDate(license.licenseExpiresAt)}
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <RefreshCw className="h-4 w-4 text-white/40" />
                    {formatRelativeTime(license.lastSync)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {showUpgrade ? (
        <Card className="border border-amber-300/20 bg-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
              <div>
                <p className="font-bold text-white">Subscription upgrade available</p>
                <p className="mt-1 text-sm text-white/70">
                  Upgrade to Standard to activate every registered desktop device for the next billing period.
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              isLoading={isPending}
              loadingText="Upgrading..."
              className="min-w-56"
            >
              <CreditCard className="h-4 w-4" />
              Upgrade Subscription
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          Desktop access is active for this farm.
        </div>
      )}
    </div>
  );
}
