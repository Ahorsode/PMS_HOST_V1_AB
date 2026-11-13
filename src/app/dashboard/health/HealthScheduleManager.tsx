"use client";

import React, { useMemo, useState, useTransition, useEffect } from "react";
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
  ListPlus,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";
import { formatLivestockType } from "@/lib/utils/growth-utils";
import {
  createHealthSchedulesBulk,
  registerHealthInventoryItem,
  updateHealthScheduleStatus,
  deleteHealthSchedule,
  type HealthScheduleType,
  type HealthUsageType,
  type HealthScheduleInput,
} from "@/lib/actions/health-actions";
import { QUICK_ICON, quickButtonClass } from '@/components/ui/quick-action';

const CUSTOM = "__custom__";

const STATUS_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const UNIT_OPTIONS = [
  "dose",
  "doses",
  "ml",
  "L",
  "bottle",
  "vial",
  "sachet",
  "tablet",
  "capsule",
  "g",
  "kg",
  "bag",
  "unit",
].map((u) => ({ label: u, value: u }));

interface Batch {
  id: string;
  batchName?: string | null;
  type?: string | null;
}

interface InventoryOption {
  id: string;
  itemName: string;
  stockLevel: number;
  unit: string;
  usageType?: string | null;
}

interface ScheduleRecord {
  id: string;
  scheduledDate: string;
  status: string;
  notes?: string | null;
  quantity?: number | string | null;
  usageType?: string | null;
  unit?: string | null;
  vaccineName?: string;
  medicationName?: string;
  batch?: { id: string; batchName?: string | null; type?: string | null } | null;
}

// A pending row the user has staged but not yet saved.
interface DraftEntry extends HealthScheduleInput {
  _key: string;
  batchLabel: string;
}

interface Props {
  vaccinations: ScheduleRecord[];
  medications: ScheduleRecord[];
  activeBatches: Batch[];
  vaccineInventory: InventoryOption[];
  medicineInventory: InventoryOption[];
  canEdit: boolean;
}

function todayInputValue() {
  return new Date().toISOString().split("T")[0];
}

function normalizeUsage(value?: string | null): HealthUsageType {
  return value === "ONE_TIME" || value === "QUANTITY" ? value : "QUANTITY";
}

export function HealthScheduleManager({
  vaccinations,
  medications,
  activeBatches,
  vaccineInventory,
  medicineInventory,
  canEdit,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingInventorySelection, setPendingInventorySelection] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<HealthScheduleType>("VACCINATION");
  const [batchId, setBatchId] = useState<string>("");
  const [namePreset, setNamePreset] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  // Usage type the user picks ONLY when defining a brand-new item.
  const [newUsageType, setNewUsageType] = useState<HealthUsageType>("ONE_TIME");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("dose");
  const [scheduledDate, setScheduledDate] = useState<string>(todayInputValue());
  const [status, setStatus] = useState<string>("PENDING");
  const [notes, setNotes] = useState<string>("");

  // Staged rows for "add multiple at once".
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);

  const isVaccine = type === "VACCINATION";
  const inventory = isVaccine ? vaccineInventory : medicineInventory;

  const inventoryNameSet = useMemo(
    () => new Set(inventory.map((i) => i.itemName.toLowerCase())),
    [inventory]
  );

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

  // Vaccines AND medications both come strictly from the farm's own inventory
  // stock — no hardcoded preset list. "Add new" defines a brand-new item.
  const nameOptions = useMemo(() => {
    return [
      { label: "Select from inventory…", value: "" },
      ...inventory.map((m) => ({
        label:
          m.stockLevel > 0
            ? `${m.itemName} — ${m.stockLevel} ${m.unit} in stock`
            : `${m.itemName} — out of stock`,
        value: m.itemName,
      })),
      { label: "+ Add new (type your own)", value: CUSTOM },
    ];
  }, [inventory]);

  const isAddingNew = namePreset === CUSTOM;
  const resolvedName = isAddingNew ? customName.trim() : namePreset;
  const selectedItem = isAddingNew
    ? undefined
    : inventory.find((i) => i.itemName === namePreset);

  const isNewItem =
    isAddingNew &&
    !!resolvedName &&
    !inventoryNameSet.has(resolvedName.toLowerCase());

  // When adding new, the user chooses the usage. When an existing item is
  // selected, the usage is whatever was set when that item was created.
  const effectiveUsageType: HealthUsageType = isAddingNew
    ? newUsageType
    : normalizeUsage(selectedItem?.usageType);
  const showQuantity = effectiveUsageType === "QUANTITY";

  const batchLabel =
    batchOptions.find((o) => o.value === batchId)?.label ?? "Unknown batch";

  const quantityOk = !showQuantity || Number(quantity) > 0;
  const currentEntryValid =
    !!batchId && !!resolvedName && !!scheduledDate && quantityOk;

  const totalToSave = drafts.length + (currentEntryValid ? 1 : 0);
  const canSave = canEdit && totalToSave > 0 && !isPending && !isSavingItem;
  const canSaveToInventory =
    canEdit &&
    isAddingNew &&
    !!resolvedName &&
    isNewItem &&
    quantityOk &&
    !isPending &&
    !isSavingItem;

  useEffect(() => {
    if (!pendingInventorySelection) return;
    const match = inventory.find(
      (item) => item.itemName.toLowerCase() === pendingInventorySelection.toLowerCase()
    );
    if (!match) return;
    setNamePreset(match.itemName);
    setCustomName("");
    setPendingInventorySelection(null);
  }, [inventory, pendingInventorySelection]);

  function switchType(next: HealthScheduleType) {
    setType(next);
    setNamePreset("");
    setCustomName("");
    setNewUsageType("ONE_TIME");
    setQuantity("");
    setUnit("dose");
  }

  // Selecting a name resolves its usage + unit from inventory (existing item)
  // or resets to defaults for a brand-new item.
  function handleNameChange(value: string) {
    setNamePreset(value);
    setQuantity("");
    if (value === CUSTOM) {
      setNewUsageType("ONE_TIME");
      setUnit("dose");
      return;
    }
    const match = inventory.find((i) => i.itemName === value);
    if (match?.unit) setUnit(match.unit);
  }

  function clearItemFields() {
    setNamePreset("");
    setCustomName("");
    setNewUsageType("ONE_TIME");
    setQuantity("");
    setUnit("dose");
    setNotes("");
  }

  function buildCurrentEntry(): DraftEntry | null {
    if (!currentEntryValid) return null;
    return {
      _key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      batchId,
      batchLabel,
      name: resolvedName,
      isNewItem,
      scheduledDate,
      status,
      usageType: effectiveUsageType,
      quantity: showQuantity ? Number(quantity) : 1,
      unit: showQuantity
        ? unit || selectedItem?.unit || "unit"
        : selectedItem?.unit || "dose",
      notes: notes.trim() || undefined,
    };
  }

  function handleAddToList() {
    setError(null);
    setSuccessMsg(null);
    const entry = buildCurrentEntry();
    if (!entry) {
      setError("Fill in the batch, name, date and quantity first.");
      return;
    }
    setDrafts((prev) => [...prev, entry]);
    clearItemFields();
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d._key !== key));
  }

  function handleSaveToInventory() {
    if (!canSaveToInventory) return;
    setError(null);
    setSuccessMsg(null);
    setIsSavingItem(true);

    startTransition(async () => {
      try {
        const result = await registerHealthInventoryItem({
          type,
          name: resolvedName,
          usageType: effectiveUsageType,
          quantity: showQuantity ? Number(quantity) : undefined,
          unit: unit || selectedItem?.unit || "dose",
        });

        if (!result.success) {
          setError(result.error || "Failed to add item to inventory");
          return;
        }

        setSuccessMsg(result.message || `"${resolvedName}" saved to inventory.`);
        setPendingInventorySelection(result.itemName || resolvedName);
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to add item to inventory");
      } finally {
        setIsSavingItem(false);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    setSuccessMsg(null);

    const all = [...drafts];
    const current = buildCurrentEntry();
    if (current) all.push(current);
    if (all.length === 0) {
      setError("Add at least one vaccine or medication.");
      return;
    }

    const payload: HealthScheduleInput[] = all.map((d) => ({
      type: d.type,
      batchId: d.batchId,
      name: d.name,
      isNewItem: d.isNewItem,
      scheduledDate: d.scheduledDate,
      status: d.status,
      usageType: d.usageType,
      quantity: d.quantity,
      unit: d.unit,
      notes: d.notes,
    }));

    startTransition(async () => {
      try {
        await createHealthSchedulesBulk(payload);
        setDrafts([]);
        setBatchId("");
        clearItemFields();
        setScheduledDate(todayInputValue());
        setStatus("PENDING");
        router.refresh();
      } catch (err: any) {
        setError(err?.message || "Failed to save schedules");
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
        <Card className="border border-fg/[0.08] bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-fg-3" />
              <h3 className="text-lg font-medium text-fg tracking-normal">
                New health schedule
              </h3>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => switchType("VACCINATION")}
                aria-pressed={isVaccine}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm transition-colors",
                  isVaccine
                    ? "bg-yolk/15 text-yolk border-yolk font-semibold shadow-sm"
                    : "bg-fg/5 text-fg-2 border-fg/10 font-medium hover:bg-fg/10 hover:text-fg"
                )}
              >
                <Syringe className="w-4 h-4" /> Vaccination
              </button>
              <button
                type="button"
                onClick={() => switchType("MEDICATION")}
                aria-pressed={!isVaccine}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm transition-colors",
                  !isVaccine
                    ? "bg-steel/15 text-steel border-steel font-semibold shadow-sm"
                    : "bg-fg/5 text-fg-2 border-fg/10 font-medium hover:bg-fg/10 hover:text-fg"
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
                />
                <Select
                  label={isVaccine ? "Vaccine" : "Medication"}
                  options={nameOptions}
                  value={namePreset}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              <p className="-mt-1 flex items-center gap-1.5 text-xs text-fg/50">
                <Boxes className="w-3.5 h-3.5 text-fg-2" />
                {inventory.length > 0
                  ? `${isVaccine ? "Vaccines" : "Medications"} are sourced from your Inventory stock.`
                  : `No ${isVaccine ? "vaccine" : "medicine"} in inventory yet — use “Add new”, or stock it under Inventory first.`}
              </p>

              {isAddingNew && (
                <Input
                  label={isVaccine ? "New vaccine name" : "New medication name"}
                  placeholder={isVaccine ? "e.g. Newcastle Lasota" : "e.g. Florfenicol"}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  autoFocus
                />
              )}

              {/* Usage type — ONLY shown when adding a brand-new item. */}
              {isAddingNew && (
                <div>
                  <label className="text-xs font-medium text-fg/70 block mb-2">
                    Usage (set once for this new item)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUsageType("ONE_TIME")}
                      className={cn(
                        "flex-1 px-3 py-2.5 rounded-lg border-2 text-xs transition-colors",
                        newUsageType === "ONE_TIME"
                          ? "bg-accent/15 text-accent border-accent font-semibold shadow-sm"
                          : "bg-fg/5 text-fg-2 border-fg/10 font-medium hover:bg-fg/10 hover:text-fg"
                      )}
                    >
                      One-time use
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUsageType("QUANTITY")}
                      className={cn(
                        "flex-1 px-3 py-2.5 rounded-lg border-2 text-xs transition-colors",
                        newUsageType === "QUANTITY"
                          ? "bg-accent/15 text-accent border-accent font-semibold shadow-sm"
                          : "bg-fg/5 text-fg-2 border-fg/10 font-medium hover:bg-fg/10 hover:text-fg"
                      )}
                    >
                      Set quantity
                    </button>
                  </div>
                </div>
              )}

              {isNewItem && resolvedName && (
                <p className="-mt-1 flex items-center gap-1.5 text-xs text-fg">
                  <Sparkles className="w-3.5 h-3.5" />
                  Save “{resolvedName}” to inventory first, then select it here — or pick a batch
                  and use Add schedule to save the item and schedule together.
                </p>
              )}

              {/* For an EXISTING item, show its locked usage type (read-only). */}
              {!isAddingNew && selectedItem && (
                <p className="-mt-1 flex items-center gap-1.5 text-xs text-fg/50">
                  <Zap className="w-3.5 h-3.5 text-fg-3" />
                  {showQuantity
                    ? `Quantity-tracked item (in ${selectedItem.unit}).`
                    : "One-time use item — no quantity needed."}
                </p>
              )}

              {/* Quantity inputs — shown whenever the resolved usage is QUANTITY. */}
              {showQuantity && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Quantity"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 250"
                    value={quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || Number(v) >= 0) setQuantity(v);
                    }}
                  />
                  {isAddingNew ? (
                    <Select
                      label="Unit"
                      options={UNIT_OPTIONS}
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  ) : (
                    <Input label="Unit" value={selectedItem?.unit || unit} disabled />
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Scheduled date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
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

              {/* Staged list for multi-add */}
              {drafts.length > 0 && (
                <div className="rounded-lg border border-fg/10 bg-fg/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-fg/60">
                    Staged to save ({drafts.length})
                  </p>
                  {drafts.map((d) => (
                    <div
                      key={d._key}
                      className="flex items-center gap-2 text-xs bg-fg/[0.04] rounded-md px-3 py-2"
                    >
                      {d.type === "VACCINATION" ? (
                        <Syringe className="w-3.5 h-3.5 text-fg-3 shrink-0" />
                      ) : (
                        <Pill className="w-3.5 h-3.5 text-fg-2 shrink-0" />
                      )}
                      <span className="font-medium text-fg truncate">{d.name}</span>
                      <span className="text-fg/40">·</span>
                      <span className="text-fg/60 truncate">{d.batchLabel}</span>
                      <span className="text-fg/40">·</span>
                      <span className="text-fg/60">
                        {d.usageType === "QUANTITY"
                          ? `${d.quantity} ${d.unit}`
                          : "One-time"}
                      </span>
                      {d.isNewItem && (
                        <span className="text-fg">· new</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeDraft(d._key)}
                        className="ml-auto text-neg hover:text-neg"
                        aria-label="Remove staged item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-xs text-neg font-medium">
                  {error}
                </p>
              )}

              {successMsg && (
                <p className="text-xs text-fg font-medium">
                  {successMsg}
                </p>
              )}

              {isAddingNew && resolvedName && (
                <div className="rounded-lg border border-fg/[0.08] bg-fg/[0.04] p-3">
                  <p className="text-xs font-medium text-fg mb-2">
                    Step 1 — stock this item
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveToInventory}
                    disabled={!canSaveToInventory}
                    isLoading={isSavingItem}
                    loadingText="Saving…"
                    className="w-full sm:w-auto border-fg/[0.08] text-fg hover:bg-fg/[0.04]"
                  >
                    <Boxes className="w-4 h-4" />
                    Save “{resolvedName}” to inventory
                  </Button>
                  <p className="mt-2 text-xs text-fg/50">
                    No batch required. After saving, it appears in the {isVaccine ? "Vaccine" : "Medication"} dropdown above.
                  </p>
                </div>
              )}

              <p className="flex items-center gap-1.5 text-xs text-fg/40">
                <ListPlus className="w-3.5 h-3.5" />
                Step 2 — Select a batch, then Add schedule (or stage several with “Add another”).
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddToList}
                  disabled={!currentEntryValid || isPending}
                >
                  <ListPlus className="w-4 h-4" /> Add another
                </Button>
                <Button type="submit" isLoading={isPending} disabled={!canSave}>
                  <Plus className="w-4 h-4" />
                  {totalToSave > 1 ? `Save ${totalToSave} schedules` : "Add schedule"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card/50 rounded-lg border border-dashed border-fg/[0.08] p-5 text-center text-sm text-fg-3">
          You have read-only access to health schedules.
        </div>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleList
          title="Vaccination schedule"
          icon={<Syringe className="w-4 h-4 text-fg-3" />}
          accent="amber"
          type="VACCINATION"
          records={vaccinations}
          canEdit={canEdit}
          isPending={isPending}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
        <ScheduleList
          title="Medication schedule"
          icon={<Pill className="w-4 h-4 text-fg-2" />}
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

function usageLabel(rec: ScheduleRecord): string | null {
  const qty = rec.quantity != null ? Number(rec.quantity) : null;
  if (rec.usageType === "QUANTITY" && qty && qty > 0) {
    return `${qty} ${rec.unit || "units"}`;
  }
  if (rec.usageType === "ONE_TIME") return "One-time";
  return null;
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
    <div className="bg-card rounded-xl border border-fg/[0.08] overflow-hidden">
      <div
        className={cn(
          "px-5 py-4 border-b border-fg/[0.08] flex items-center gap-2",
          accent === "amber" ? "bg-fg/[0.04]" : "bg-fg/[0.06]"
        )}
      >
        {icon}
        <h3
          className={cn(
            "font-medium text-sm",
            "text-fg"
          )}
        >
          {title}
        </h3>
        <span className="ml-auto text-xs font-medium text-fg/40">
          {records.length}
        </span>
      </div>

      {records.length === 0 ? (
        <div className="py-16 text-center text-fg/50 text-sm">
          No {accent === "amber" ? "vaccinations" : "medications"} scheduled yet.
        </div>
      ) : (
        <div className="divide-y divide-fg/[0.06]">
          {records.map((rec) => {
            const name = rec.vaccineName ?? rec.medicationName ?? "—";
            const date = new Date(rec.scheduledDate);
            const isPast = date < today;
            const isDone = rec.status === "COMPLETED";
            const isCancelled = rec.status === "CANCELLED";
            const usage = usageLabel(rec);

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-fg/[0.03] transition-colors"
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-fg-3 flex-shrink-0" />
                ) : isCancelled ? (
                  <XCircle className="w-4 h-4 text-fg-3 flex-shrink-0" />
                ) : (
                  <Circle
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isPast ? "text-neg" : accent === "amber" ? "text-yolk" : "text-fg-2"
                    )}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm font-medium truncate",
                        isCancelled ? "text-fg-3 line-through" : "text-fg"
                      )}
                    >
                      {name}
                    </p>
                    {usage && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-fg/10 text-fg/60 border border-fg/10 flex-shrink-0">
                        {usage}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-fg/60 mt-0.5">
                    <span className="font-medium truncate">
                      {rec.batch?.batchName || "Unknown batch"}
                    </span>
                    <span className="text-fg/20">·</span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {formatDate(date)}
                    </span>
                    {isPast && !isDone && !isCancelled && (
                      <span className="text-neg font-medium">· Overdue</span>
                    )}
                  </div>
                  {rec.notes && (
                    <p className="text-xs text-fg/40 mt-1 truncate">
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
                      className="h-9 rounded-md border border-fg/10 bg-fg/10 px-2 text-xs text-fg font-medium focus:outline-none focus:ring-2 focus:ring-fg/10 cursor-pointer disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-card">
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => onDelete(type, rec.id)}
                      className={quickButtonClass('delete')}
                      aria-label="Delete schedule"
                      title="Delete"
                    >
                      {isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 {...QUICK_ICON} />
                      )}
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium border flex-shrink-0",
                      isDone
                        ? "bg-fg/[0.04] text-fg border-fg/[0.08]"
                        : isCancelled
                        ? "bg-gray-500/10 text-fg-3 border-fg/[0.08]"
                        : "bg-fg/[0.04] text-yolk border-fg/[0.08]"
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
