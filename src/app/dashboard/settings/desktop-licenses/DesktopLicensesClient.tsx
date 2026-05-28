"use client";

import Link from "next/link";
import React from "react";
import { Clock3, Download, Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { DesktopLicenseRow } from "@/lib/actions/licenses";

interface DesktopLicensesClientProps {
  initialLicenses: DesktopLicenseRow[];
}

const WINDOWS_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_HATCHLOG_WINDOWS_DOWNLOAD_URL || "/downloads/hatchlog-windows.exe";

function truncateHardwareId(value: string | null) {
  if (!value) return "Awaiting sync";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function statusBadge(status: string) {
  if (status === "CLOUD_TRIAL" || status === "ACTIVE") {
    return {
      label: "ACTIVE",
      icon: <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.95)]" />,
      className: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
    };
  }

  if (status === "GRACE_PERIOD") {
    return {
      label: "GRACE PERIOD",
      icon: <Clock3 className="h-3.5 w-3.5" />,
      className: "border-amber-300/30 bg-amber-400/10 text-amber-200",
    };
  }

  return {
    label: "EXPIRED",
    icon: <span className="h-2 w-2 rounded-full bg-red-300" />,
    className: "border-red-300/30 bg-red-400/10 text-red-200",
  };
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not synced yet";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced yet";

  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function DesktopLicensesClient({ initialLicenses }: DesktopLicensesClientProps) {
  if (initialLicenses.length === 0) {
    return (
      <Card className="border border-emerald-500/20 bg-black/40 backdrop-blur-xl">
        <CardContent className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <Monitor className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">Connect Your Farm Computer</h2>
            <div className="mt-6 grid gap-4">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-sm font-black text-black">
                  1
                </span>
                <p className="pt-1 text-sm font-semibold leading-6 text-white/75">
                  Download and run the installer on your farm computer.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-sm font-black text-black">
                  2
                </span>
                <p className="pt-1 text-sm font-semibold leading-6 text-white/75">
                  Log in with your web credentials. The app will automatically connect this terminal to your account securely.
                </p>
              </div>
            </div>
          </div>

          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={WINDOWS_DOWNLOAD_URL}>
              <Download className="h-5 w-5" />
              📥 DOWNLOAD HATCHLOG FOR WINDOWS
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/10 bg-black/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          Connected Terminal Status
        </CardTitle>
        <p className="mt-2 text-sm text-white/60">
          HatchLog Desktop reports its hardware fingerprint automatically after login.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs font-black uppercase tracking-widest text-white/45">
                <th className="p-4 pl-0">Terminal ID</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4 pr-0">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {initialLicenses.map((license) => {
                const badge = statusBadge(license.status);

                return (
                  <tr key={license.id} className="transition hover:bg-white/5">
                    <td className="p-4 pl-0 align-top">
                      <p className="font-mono text-sm font-black text-white" title={license.hardwareId || undefined}>
                        {truncateHardwareId(license.hardwareId)}
                      </p>
                    </td>
                    <td className="p-4 align-top">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${badge.className}`}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-4 align-top">
                      <span className="text-sm font-bold text-white/80">{formatDate(license.licenseExpiresAt)}</span>
                    </td>
                    <td className="p-4 pr-0 align-top">
                      <span className="text-sm font-semibold text-white/65">{formatDateTime(license.lastSync)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
