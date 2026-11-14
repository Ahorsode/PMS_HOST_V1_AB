"use client";

import React, { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Syringe,
  Pill,
  Trash2,
  CalendarClock,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  Boxes,
  ListPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Button,
  DateInput,
  Form,
  FormActions,
  FormError,
  FormNote,
  FormRow,
  FormSection,
  Input,
  Segmented,
  Select,
  fieldStyles,
} from "@/components/ui/form";
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
  { label: "Done", value: "COMPLETED" },
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
          <CardContent className="p-5">
            <h3 className="mb-5 text-lg font-semibold leading-6 text-fg">New health schedule</h3>

            <Form onSubmit={handleSubmit}>
              <Segmented
                label="What are you scheduling"
                value={type}
                onChange={switchType}
                options={[
                  { value: "VACCINATION", label: "Vaccine", icon: <Syringe className="h-4 w-4" strokeWidth={1.75} /> },
                  { value: "MEDICATION", label: "Medicine", icon: <Pill className="h-4 w-4" strokeWidth={1.75} /> },
                ]}
              />

              <FormSection title={isVaccine ? "Which vaccine, for which flock" : "Which medicine, for which flock"}>
                <FormRow>
                  <Select
                    label="Flock"
                    options={batchOptions}
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                  />
                  <Select
                    label={isVaccine ? "Vaccine" : "Medicine"}
                    options={nameOptions}
                    value={namePreset}
                    onChange={(e) => handleNameChange(e.target.value)}
                    hint={
                      !isAddingNew && selectedItem
                        ? showQuantity
                          ? `Measured in ${selectedItem.unit} each time it is used.`
                          : "Used once, with no amount to measure."
                        : inventory.length > 0
                          ? "These come from your stock."
                          : `No ${isVaccine ? "vaccine" : "medicine"} in stock yet. Choose "Add new".`
                    }
                  />
                </FormRow>

                {isAddingNew && (
                  <>
                    <Input
                      label={isVaccine ? "Name of the new vaccine" : "Name of the new medicine"}
                      placeholder={isVaccine ? "e.g. Newcastle Lasota" : "e.g. Florfenicol"}
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      autoFocus
                    />
                    {/* Usage type — ONLY shown when adding a brand-new item. */}
                    <Segmented
                      label="How is it used"
                      hint="Set once for this new item."
                      value={newUsageType}
                      onChange={setNewUsageType}
                      options={[
                        { value: "ONE_TIME", label: "Used once" },
                        { value: "QUANTITY", label: "Measured amount" },
                      ]}
                    />
                  </>
                )}

                {isAddingNew && resolvedName && (
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveToInventory}
                      disabled={!canSaveToInventory}
                      isLoading={isSavingItem}
                      loadingText="Saving"
                      className="w-full sm:w-auto"
                    >
                      <Boxes className="h-4 w-4 shrink-0 text-fg-2" strokeWidth={1.75} />
                      <span className="truncate">Save “{resolvedName}” to stock</span>
                    </Button>
                    <p className={fieldStyles.hint}>
                      Save it to stock and pick it from the list, or choose a flock and add the schedule to save both together.
                    </p>
                  </div>
                )}
              </FormSection>

              {/* Quantity inputs — shown whenever the resolved usage is QUANTITY. */}
              {showQuantity && (
                <FormSection title="How much">
                  <FormRow alwaysInline>
                    <Input
                      label="Amount"
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
                        label="Measured in"
                        options={UNIT_OPTIONS}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                    ) : (
                      <Input label="Measured in" value={selectedItem?.unit || unit} disabled />
                    )}
                  </FormRow>
                </FormSection>
              )}

              <FormSection title="When">
                <FormRow>
                  <DateInput
                    label="Date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                  <Segmented label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
                </FormRow>
                <Input
                  label="Notes"
                  optional
                  placeholder="e.g. In drinking water, 1 ml per bird"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormSection>

              {/* Staged list for multi-add */}
              {drafts.length > 0 && (
                <FormSection title="Ready to save" aside={<span className="tabular-nums">{drafts.length}</span>}>
                  <ul className="divide-y divide-fg/[0.06] rounded-xl border border-fg/[0.08] bg-tile">
                    {drafts.map((d) => (
                      <li key={d._key} className="flex min-h-12 items-center gap-2.5 py-1 pl-3.5 pr-1 text-sm">
                        {d.type === "VACCINATION" ? (
                          <Syringe className="h-4 w-4 shrink-0 text-fg-3" strokeWidth={1.5} />
                        ) : (
                          <Pill className="h-4 w-4 shrink-0 text-fg-3" strokeWidth={1.5} />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-fg">
                            {d.name}
                            {d.isNewItem ? <span className="font-normal text-fg-3"> (new)</span> : null}
                          </span>
                          <span className="block truncate text-[13px] text-fg-3">
                            {d.batchLabel} · {d.usageType === "QUANTITY" ? `${d.quantity} ${d.unit}` : "Used once"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDraft(d._key)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-neg-solid/10 hover:text-neg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:h-10 md:w-10"
                          aria-label={`Remove ${d.name}`}
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </FormSection>
              )}

              <FormError>{error}</FormError>
              {successMsg ? <FormNote tone="success">{successMsg}</FormNote> : null}

              <FormActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddToList}
                  disabled={!currentEntryValid || isPending}
                >
                  <ListPlus className="h-4 w-4 text-fg-2" strokeWidth={1.75} /> Add another
                </Button>
                <Button type="submit" variant="accent" isLoading={isPending} loadingText="Saving" disabled={!canSave}>
                  {totalToSave > 1 ? `Save ${totalToSave} schedules` : "Add schedule"}
                </Button>
              </FormActions>
            </Form>
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
                      aria-label="Status"
                      className="h-11 cursor-pointer rounded-lg border border-fg/[0.14] bg-page px-2.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 md:h-10"
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
