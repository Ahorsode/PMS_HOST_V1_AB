"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Syringe,
  Pill,
  Plus,
  Trash2,
  CalendarClock,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Boxes,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";
import { formatLivestockType } from "@/lib/utils/growth-utils";
import {
  createHealthSchedule,
  updateHealthScheduleStatus,
  deleteHealthSchedule,
  type HealthScheduleType,
} from "@/lib/actions/health-actions";

const CUSTOM = "__custom__";

const VACCINE_PRESETS = [
  "Newcastle Disease (ND)",
  "Infectious Bronchitis (IB)",
  "Gumboro (IBD)",
  "Marek's Disease",
  "Fowl Pox",
  "Fowl Cholera",
  "Avian Influenza (AI)",
  "Infectious Coryza",
  "ND + IB Combo",
  "Deworming",
];

const STATUS_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

interface Batch {
  id: string;
  batchName?: string | null;
  type?: string | null;
}

interface MedicineOption {
  id: string;
  itemName: string;
  stockLevel: number;
  unit: string;
}

interface ScheduleRecord {
  id: string;
  scheduledDate: string;
  status: string;
  notes?: string | null;
  vaccineName?: string;
  medicationName?: string;
  batch?: { id: string; batchName?: string | null; type?: string | null } | null;
}

interface Props {
  vaccinations: ScheduleRecord[];
  medications: ScheduleRecord[];
  activeBatches: Batch[];
  medicineInventory: MedicineOption[];
  canEdit: boolean;
}

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

export function HealthScheduleManager({
  vaccinations,
  medications,
  activeBatches,
  medicineInventory,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<HealthScheduleType>("VACCINATION");
  const [batchId, setBatchId] = useState<string>("");
  const [namePreset, setNamePreset] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(todayInputValue());
  const [status, setStatus] = useState<string>("PENDING");
  const [notes, setNotes] = useState<string>("");

  const isVaccine = type === "VACCINATION";

  const batchOptions = useMemo(
    () => [
      { label: "Select a batch…", value: "" },
      ...activeBatches.map((b, i) => ({
        label: `${b.batchName || `Unit ${i + 1}`}${b.type ? ` · ${formatLivestockType(b.type)}` : ""}`,
        value: b.id,
      })),
    ],
    [activeBatches]
  );

  const nameOptions = useMemo(() => {
    if (isVaccine) {
      return [
        { label: "Select a vaccine…", value: "" },
        ...VACCINE_PRESETS.map((p) => ({ label: p, value: p })),
        { label: "➕ Add new (type your own)", value: CUSTOM },
      ];
    }
    // Medication options come from the farm's own Medicine inventory stock.
    return [
      { label: "Select from inventory…", value: "" },
      ...medicineInventory.map((m) => ({
        label:
          m.stockLevel > 0
            ? `${m.itemName} — ${m.stockLevel} ${m.unit} in stock`
            : `${m.itemName} — out of stock`,
        value: m.itemName,
      })),
      { label: "➕ Add new (not in inventory)", value: CUSTOM },
    ];
  }, [isVaccine, medicineInventory]);

  const resolvedName = namePreset === CUSTOM ? customName.trim() : namePreset;
  const canSubmit =
    canEdit && !!batchId && !!resolvedName && !!scheduledDate && !isPending;

  function switchType(next: HealthScheduleType) {
    setType(next);
    // Names differ per type — reset the name selection to avoid mismatches.
    setNamePreset("");
    setCustomName("");
  }

  function resetForm() {
    setBatchId("");
    setNamePreset("");
    setCustomName("");
    setScheduledDate(todayInputValue());
    setStatus("PENDING");
    setNotes("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await createHealthSchedule({
          type,
          batchId,
          name: resolvedName,
          scheduledDate,
          status,
          notes: notes.trim() || undefined,
        });
        resetForm();
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to save schedule");
      }
    });
  }

  function handleStatusChange(
    recordType: HealthScheduleType,
    id: string,
    nextStatus: string
  ) {
    setError(null);
    startTransition(async () => {
      try {
        await updateHealthScheduleStatus({ type: recordType, id, status: nextStatus });
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to update status");
      }
    });
  }

  function handleDelete(recordType: HealthScheduleType, id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteHealthSchedule({ type: recordType, id });
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to delete schedule");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* New schedule form */}
      {canEdit ? (
        <Card className="border border-gray-800 bg-[#111827]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white uppercase tracking-normal italic">
                New Health Schedule
              </h3>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => switchType("VACCINATION")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all",
                  isVaccine
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                )}
              >
                <Syringe className="w-4 h-4" /> Vaccination
              </button>
              <button
                type="button"
                onClick={() => switchType("MEDICATION")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-bold uppercase tracking-widest transition-all",
                  !isVaccine
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                )}
              >
                <Pill className="w-4 h-4" /> Medication
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Batch"
                  options={batchOptions}
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  required
                />
                <Select
                  label={isVaccine ? "Vaccine" : "Medication"}
                  options={nameOptions}
                  value={namePreset}
                  onChange={(e) => setNamePreset(e.target.value)}
                  required
                />
              </div>

              {!isVaccine && (
                <p className="-mt-1 flex items-center gap-1.5 text-xs text-white/50 italic">
                  <Boxes className="w-3.5 h-3.5 text-sky-400/70" />
                  {medicineInventory.length > 0
                    ? "Medications are sourced from your Inventory › Medicine stock."
                    : "No medicine in inventory yet — add stock under Inventory, or use “Add new”."}
                </p>
              )}

              {namePreset === CUSTOM && (
                <Input
                  label={isVaccine ? "New Vaccine Name" : "New Medication Name"}
                  placeholder={isVaccine ? "e.g. Newcastle Lasota" : "e.g. Florfenicol"}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                  required
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Scheduled Date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>

              <Input
                label="Notes (optional)"
                placeholder="Dosage, route, vet instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {error && (
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" isLoading={isPending} disabled={!canSubmit}>
                  <Plus className="w-4 h-4" /> Add Schedule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-[#1F2937]/50 rounded-lg border border-dashed border-gray-700 p-5 text-center text-sm italic text-gray-500">
          You have read-only access to health schedules.
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleList
          title="Vaccination Schedule"
          icon={<Syringe className="w-4 h-4 text-amber-400" />}
          accent="amber"
          type="VACCINATION"
          records={vaccinations}
          canEdit={canEdit}
          isPending={isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
        <ScheduleList
          title="Medication Schedule"
          icon={<Pill className="w-4 h-4 text-sky-400" />}
          accent="sky"
          type="MEDICATION"
          records={medications}
          canEdit={canEdit}
          isPending={isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

function ScheduleList({
  title,
  icon,
  accent,
  type,
  records,
  canEdit,
  isPending,
  onStatusChange,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  accent: "amber" | "sky";
  type: HealthScheduleType;
  records: ScheduleRecord[];
  canEdit: boolean;
  isPending: boolean;
  onStatusChange: (t: HealthScheduleType, id: string, status: string) => void;
  onDelete: (t: HealthScheduleType, id: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-[#111827] rounded-xl shadow-xl border border-gray-800 overflow-hidden">
      <div
        className={cn(
          "px-5 py-4 border-b border-gray-800 flex items-center gap-2",
          accent === "amber" ? "bg-amber-950/30" : "bg-sky-950/30"
        )}
      >
        {icon}
        <h3
          className={cn(
            "font-bold uppercase tracking-wide text-sm",
            accent === "amber" ? "text-amber-400" : "text-sky-400"
          )}
        >
          {title}
        </h3>
        <span className="ml-auto text-xs font-bold text-white/40">
          {records.length}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="py-16 text-center text-white/50 text-sm italic">
          No {accent === "amber" ? "vaccinations" : "medications"} scheduled yet.
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {records.map((rec) => {
            const name = rec.vaccineName ?? rec.medicationName ?? "—";
            const date = new Date(rec.scheduledDate);
            const isPast = date < today;
            const isDone = rec.status === "COMPLETED";
            const isCancelled = rec.status === "CANCELLED";

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-[#1F2937] transition-colors"
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : isCancelled ? (
                  <XCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <Circle
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isPast ? "text-red-400" : accent === "amber" ? "text-amber-400" : "text-sky-400"
                    )}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-bold truncate",
                      isCancelled ? "text-gray-500 line-through" : "text-white"
                    )}
                  >
                    {name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                    <span className="font-medium truncate">
                      {rec.batch?.batchName || "Unknown batch"}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {formatDate(date)}
                    </span>
                    {isPast && !isDone && !isCancelled && (
                      <span className="text-red-400 font-bold">· Overdue</span>
                    )}
                  </div>
                  {rec.notes && (
                    <p className="text-xs text-white/40 italic mt-1 truncate">
                      {rec.notes}
                    </p>
                  )}
                </div>

                {canEdit ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={rec.status}
                      disabled={isPending}
                      onChange={(e) => onStatusChange(type, rec.id, e.target.value)}
                      className="h-9 rounded-md border border-white/10 bg-white/10 px-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-[#064e3b]">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(type, rec.id)}
                      className="p-2 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                      aria-label="Delete schedule"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase border flex-shrink-0",
                      isDone
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : isCancelled
                        ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}
                  >
                    {rec.status}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
