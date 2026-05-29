"use client";

import React, { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clipboard, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  generateDesktopActivationKey,
  type DesktopActivationHubData,
} from "@/lib/actions/licenses";

interface DesktopLicensesClientProps {
  initialData: DesktopActivationHubData;
}

type CountdownParts = { days: number; hours: number; minutes: number };

function calculateCountdown(expiresAtIso: string | null): CountdownParts {
  if (!expiresAtIso) return { days: 0, hours: 0, minutes: 0 };
  const expiresAt = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, expiresAt - now);

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes };
}

export default function DesktopLicensesClient({ initialData }: DesktopLicensesClientProps) {
  const [generatedKey, setGeneratedKey] = useState(initialData.generatedKey);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, startGenerateTransition] = useTransition();
  const hasActiveTerminal = initialData.hasActiveTerminal;
  const expiresAt = initialData.activeLicense?.licenseExpiresAt ?? null;
  const [countdown, setCountdown] = useState<CountdownParts>(() => calculateCountdown(expiresAt));
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveTerminal) return;

    setCountdown(calculateCountdown(expiresAt));
    const timer = window.setInterval(() => {
      setCountdown(calculateCountdown(expiresAt));
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [expiresAt, hasActiveTerminal]);

  useEffect(() => {
    if (hasActiveTerminal || !generatedKey) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [generatedKey, hasActiveTerminal, router]);

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return "Not set";
    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-GH", { dateStyle: "full", timeStyle: "short" }).format(date);
  }, [expiresAt]);

  async function handleGenerateKey() {
    setGenerationError(null);
    startGenerateTransition(async () => {
      const result = await generateDesktopActivationKey();
      if (result.success) {
        setGeneratedKey(result.licenseKey);
        router.refresh();
      } else {
        setGenerationError(result.error);
      }
    });
  }

  async function handleCopy() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1500);
  }

  if (hasActiveTerminal) {
    return (
      <Card className="border border-emerald-400/25 bg-black/40 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.12)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            Desktop Terminal Status
          </CardTitle>
          <p className="mt-2 text-sm text-white/70">
            <span className="inline-flex items-center rounded-full border border-emerald-300/35 bg-emerald-500/15 px-3 py-1 text-xs font-black tracking-widest text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)]">
              🟢 TERMINAL ACTIVE
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Days Remaining</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">
              {countdown.days} Days, {countdown.hours} Hours, {countdown.minutes} Minutes
            </p>
            <p className="mt-3 text-sm text-white/65">
              Expiration Date: <span className="font-semibold text-white/90">{formattedExpiry}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-white/15 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <Clock3 className="h-5 w-5 text-emerald-300" />
            Evaluation License Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <span className="font-black text-emerald-200">30-Day Free Evaluation:</span> For all new desktop terminal setups.
            </li>
            <li className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-4">
              <span className="font-black text-amber-100">10-Day Emergency Extension:</span> Safety grace window for older offline deployments reconnecting to sync.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border border-emerald-500/20 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <KeyRound className="h-5 w-5 text-emerald-300" />
            Generate Activation Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/55">Farm ID</p>
            <div className="mt-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm font-bold text-white">
              {initialData.farmId}
            </div>
          </div>

          {!generatedKey ? (
            <div className="space-y-3">
              <Button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="w-full rounded-xl border border-emerald-300/30 bg-emerald-500/70 px-5 py-6 text-xs font-black tracking-[0.2em] text-black shadow-[0_12px_32px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
              >
                {isGenerating ? "GENERATING..." : "[ GENERATE DESKTOP ACTIVATION KEY ]"}
              </Button>
              {generationError ? (
                <p className="flex items-start gap-2 rounded-xl border border-red-300/25 bg-red-500/10 p-3 text-xs font-semibold text-red-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
                  {generationError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/80">Activation Key</p>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="font-mono text-lg font-black text-white">{generatedKey}</span>
                <Button onClick={handleCopy} variant="ghost" className="border border-white/20 bg-white/5 text-white hover:bg-white/10">
                  <Clipboard className="h-4 w-4" />
                  {isCopied ? "Copied" : "Copy to Clipboard"}
                </Button>
              </div>
              <p className="flex items-start gap-2 text-xs font-semibold text-amber-100/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                This key can only be used once to activate a single desktop computer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
