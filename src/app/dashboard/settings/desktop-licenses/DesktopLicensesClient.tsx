"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  KeyRound,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  activateFreeDesktopTrial,
  type DesktopLicenseRow,
} from "@/lib/actions/licenses";

interface DesktopLicensesClientProps {
  initialPaid: boolean;
  initialLicenses: DesktopLicenseRow[];
}

function statusLabel(status: string) {
  switch (status) {
    case "CLOUD_TRIAL":
      return "Active";
    case "GRACE_PERIOD":
      return "Grace Period";
    case "ACTIVE":
      return "Active";
    case "EXPIRED":
      return "Expired";
    default:
      return status || "Pending";
  }
}

function statusClass(status: string) {
  if (status === "ACTIVE" || status === "CLOUD_TRIAL") {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "GRACE_PERIOD") {
    return "border-amber-400/30 bg-amber-500/10 text-amber-300";
  }

  return "border-red-400/30 bg-red-500/10 text-red-300";
}

function daysRemaining(expiresAt: string | null) {
  if (!expiresAt) return "Not set";

  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return "Not set";

  const diffDays = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Expired";
  if (diffDays === 1) return "1 day";
  return `${diffDays} days`;
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "No expiry saved";

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "No expiry saved";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(date);
}

export default function DesktopLicensesClient({
  initialPaid,
  initialLicenses,
}: DesktopLicensesClientProps) {
  const [licenses, setLicenses] = useState<DesktopLicenseRow[]>(initialLicenses);
  const [hardwareId, setHardwareId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasLinkedDevices = licenses.length > 0;
  const activeCount = useMemo(
    () =>
      licenses.filter((license) =>
        ["ACTIVE", "CLOUD_TRIAL", "GRACE_PERIOD"].includes(license.status),
      ).length,
    [licenses],
  );

  function handleActivateTrial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await activateFreeDesktopTrial({ hardwareId });

      if (!result.success) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setLicenses((current) => [result.license, ...current]);
      setHardwareId("");
      setMessage({
        type: "success",
        text: `30-day desktop trial activated. Valid until ${formatExpiry(result.expiresAt)}.`,
      });
    });
  }

  if (!hasLinkedDevices) {
    return (
      <div className="grid gap-5">
        <Card className="border border-emerald-500/20 bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <Fingerprint className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black text-white">
              Activate Your Free 30-Day Desktop Trial
            </CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-white/70">
              Link one Windows desktop installation to this web farm and start a 30-day evaluation license.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivateTrial} className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                  Enter Desktop Hardware ID
                </span>
                <input
                  value={hardwareId}
                  onChange={(event) => setHardwareId(event.target.value)}
                  disabled={isPending}
                  required
                  minLength={6}
                  className="h-12 rounded-md border border-white/10 bg-black/50 px-4 font-mono text-sm font-bold text-white outline-none transition focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10 disabled:opacity-60"
                  placeholder="Example: WINDOWS-GUID-OR-HARDWARE-CODE"
                />
                <span className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/65">
                  Open your HatchLog Desktop App, select &quot;Link to Cloud&quot;, and view your Hardware ID code.
                </span>
              </label>

              {message ? (
                <div
                  className={`flex items-start gap-3 rounded-md border p-3 text-sm font-semibold ${
                    message.type === "success"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : "border-red-400/30 bg-red-500/10 text-red-200"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              ) : null}

              <Button
                type="submit"
                isLoading={isPending}
                loadingText="Activating..."
                className="w-full sm:w-fit"
              >
                <KeyRound className="h-4 w-4" />
                Link & Activate 30-Day Pass
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {message ? (
        <div
          className={`flex items-start gap-3 rounded-md border p-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-400/30 bg-red-500/10 text-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-black/35">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-300">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Linked Terminals</p>
              <p className="text-2xl font-black text-white">{licenses.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-black/35">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Running Access</p>
              <p className="text-2xl font-black text-white">{activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/10 bg-black/35">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-md border border-amber-400/20 bg-amber-500/10 p-3 text-amber-300">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/50">Account Tier</p>
              <p className="text-2xl font-black text-white">{initialPaid ? "Paid" : "Trial"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <KeyRound className="h-5 w-5 text-emerald-400" />
              Active Terminal Status
            </CardTitle>
            <p className="mt-2 text-sm text-white/60">
              Review hardware bindings, trial state, grace state, and renewal timing.
            </p>
          </div>
          <Button asChild className="w-full md:w-fit">
            <Link href="/dashboard/license-upgrade">
              <ShieldCheck className="h-4 w-4" />
              Upgrade / Renew License Bundle
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-white/45">
                  <th className="p-4 pl-0">Hardware ID</th>
                  <th className="p-4">Farm ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Days Remaining</th>
                  <th className="p-4 pr-0">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {licenses.map((license) => (
                  <tr key={license.id} className="transition hover:bg-white/5">
                    <td className="p-4 pl-0 align-top">
                      <p className="max-w-[320px] break-all font-mono text-sm font-bold text-white">
                        {license.hardwareId || "Awaiting hardware link"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">{license.deviceName || "HatchLog Desktop"}</p>
                    </td>
                    <td className="p-4 align-top">
                      <p className="max-w-[220px] break-all font-mono text-xs font-bold text-white/70">
                        {license.farmId}
                      </p>
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${statusClass(
                          license.status,
                        )}`}
                      >
                        {statusLabel(license.status)}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <span className="font-bold text-white">{daysRemaining(license.licenseExpiresAt)}</span>
                    </td>
                    <td className="p-4 pr-0 align-top">
                      <span className="text-sm text-white/65">{formatExpiry(license.licenseExpiresAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
