"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-utils";
import { checkWorkerPermissions } from "@/lib/actions/staff-actions";

export type HealthScheduleType = "VACCINATION" | "MEDICATION";
export type HealthUsageType = "ONE_TIME" | "QUANTITY";

const VALID_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"] as const;
type HealthStatus = (typeof VALID_STATUSES)[number];

// Inventory categories that count as health stock, split by kind so the
// vaccine form and the medication form each source from the right shelf.
const VACCINE_CATEGORIES = ["VACCINE", "VACCINATION", "VACCINES"];
const MEDICINE_CATEGORIES = [
  "MEDICINE",
  "MEDICATION",
  "MEDICATIONS",
  "VETERINARY",
  "HEALTH",
];
const ALL_HEALTH_CATEGORIES = [...VACCINE_CATEGORIES, ...MEDICINE_CATEGORIES];

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export interface HealthInventoryOption {
  id: string;
  itemName: string;
  stockLevel: number;
  unit: string;
}

/**
 * Return the farm's health stock split into vaccines and medications so each
 * side of the schedule form sources its options from real on-hand inventory
 * rather than a hard-coded list. Out-of-stock items are still returned (a
 * schedule may be planned ahead); the UI flags them.
 */
export async function getHealthInventory(): Promise<{
  vaccine: HealthInventoryOption[];
  medicine: HealthInventoryOption[];
}> {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) return { vaccine: [], medicine: [] };

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const items = await tx.inventory.findMany({
        where: {
          farmId: activeFarmId,
          isDeleted: false,
          category: { in: ALL_HEALTH_CATEGORIES },
        },
        select: { id: true, itemName: true, stockLevel: true, unit: true, category: true },
        orderBy: { itemName: "asc" },
      });

      const vaccine: HealthInventoryOption[] = [];
      const medicine: HealthInventoryOption[] = [];
      for (const item of items) {
        const option: HealthInventoryOption = {
          id: item.id,
          itemName: item.itemName,
          stockLevel: Number(item.stockLevel),
          unit: item.unit,
        };
        if (VACCINE_CATEGORIES.includes(String(item.category).toUpperCase())) {
          vaccine.push(option);
        } else {
          medicine.push(option);
        }
      }
      return { vaccine, medicine };
    }
  );
}

/**
 * Fetch every vaccination and medication schedule for the active farm,
 * along with their owning batch so the UI can label them.
 */
export async function getHealthSchedules() {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) {
    return { vaccinations: [], medications: [] };
  }

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const [vaccinations, medications] = await Promise.all([
        tx.vaccinationSchedule.findMany({
          where: { farmId: activeFarmId },
          include: { batch: { select: { id: true, batchName: true, type: true } } },
          orderBy: { scheduledDate: "asc" },
        }),
        tx.medicationSchedule.findMany({
          where: { farmId: activeFarmId },
          include: { batch: { select: { id: true, batchName: true, type: true } } },
          orderBy: { scheduledDate: "asc" },
        }),
      ]);

      return serialize({ vaccinations, medications });
    }
  );
}

export interface HealthScheduleInput {
  type: HealthScheduleType;
  batchId: string;
  name: string;
  /** When true and the name is not already on a shelf, register it as inventory. */
  isNewItem?: boolean;
  scheduledDate: string | Date;
  status?: string;
  usageType?: HealthUsageType;
  quantity?: number;
  unit?: string;
  notes?: string;
}

function normalizeEntry(entry: HealthScheduleInput) {
  const name = entry.name?.trim();
  if (!entry.batchId) throw new Error("A batch is required");
  if (!name) throw new Error("A name is required");
  if (!entry.scheduledDate) throw new Error("A scheduled date is required");

  const scheduledDate = new Date(entry.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error("Invalid scheduled date");
  }

  const status: HealthStatus = VALID_STATUSES.includes(entry.status as HealthStatus)
    ? (entry.status as HealthStatus)
    : "PENDING";

  const usageType: HealthUsageType =
    entry.usageType === "QUANTITY" ? "QUANTITY" : "ONE_TIME";
  const unit = entry.unit?.trim() || (usageType === "ONE_TIME" ? "dose" : null);

  let quantity: number | null;
  if (usageType === "ONE_TIME") {
    quantity = 1;
  } else {
    quantity = Number(entry.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Enter a valid quantity for "${name}"`);
    }
  }

  return {
    type: entry.type,
    batchId: entry.batchId,
    name,
    isNewItem: !!entry.isNewItem,
    scheduledDate,
    status,
    usageType,
    quantity,
    unit,
    notes: entry.notes?.trim() || null,
  };
}

/**
 * Create one OR many vaccination/medication schedules in a single submission.
 * Custom ("add new") entries are registered as inventory stock with a null
 * cost so a finance user gets prompted to price them later.
 */
export async function createHealthSchedulesBulk(entries: HealthScheduleInput[]) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const canEdit = await checkWorkerPermissions("mortality", "edit");
  if (!canEdit) throw new Error("Unauthorized: missing health edit permission");

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Add at least one vaccine or medication");
  }

  const normalized = entries.map(normalizeEntry);

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      // Validate every referenced batch belongs to this farm up front.
      const batchIds = Array.from(new Set(normalized.map((e) => e.batchId)));
      const ownedBatches = await tx.livestock.findMany({
        where: { id: { in: batchIds }, farmId: activeFarmId },
        select: { id: true },
      });
      const ownedSet = new Set(ownedBatches.map((b: any) => b.id));
      for (const id of batchIds) {
        if (!ownedSet.has(id)) {
          throw new Error("A selected batch was not found on this farm");
        }
      }

      const touchedBatchIds = new Set<string>();

      for (const e of normalized) {
        touchedBatchIds.add(e.batchId);

        // Register a brand-new (custom) item as inventory stock so it shows up
        // for next time and surfaces in the finance "needs a cost" prompt.
        if (e.isNewItem) {
          const category = e.type === "VACCINATION" ? "VACCINE" : "MEDICINE";
          const existing = await tx.inventory.findFirst({
            where: {
              farmId: activeFarmId,
              isDeleted: false,
              category: { in: ALL_HEALTH_CATEGORIES },
              itemName: { equals: e.name, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (!existing) {
            await tx.inventory.create({
              data: {
                itemName: e.name,
                stockLevel: e.quantity ?? 0,
                unit: e.unit || "dose",
                category,
                costPerUnit: null, // finance is prompted to fill this in
                userId,
                farmId: activeFarmId,
              },
            });
          }
        }

        if (e.type === "VACCINATION") {
          await tx.vaccinationSchedule.create({
            data: {
              batchId: e.batchId,
              vaccineName: e.name,
              scheduledDate: e.scheduledDate,
              status: e.status,
              notes: e.notes,
              quantity: e.quantity,
              usageType: e.usageType,
              unit: e.unit,
              farmId: activeFarmId,
            },
          });
        } else {
          await tx.medicationSchedule.create({
            data: {
              batchId: e.batchId,
              medicationName: e.name,
              scheduledDate: e.scheduledDate,
              status: e.status,
              notes: e.notes,
              quantity: e.quantity,
              usageType: e.usageType,
              unit: e.unit,
              farmId: activeFarmId,
            },
          });
        }
      }

      revalidatePath("/dashboard/health");
      revalidatePath("/dashboard/inventory");
      revalidatePath("/dashboard/finance");
      for (const id of touchedBatchIds) {
        revalidatePath(`/dashboard/flocks/${id}`);
      }

      return { success: true, created: normalized.length };
    }
  );
}

/** Backwards-compatible single-entry create (delegates to the bulk path). */
export async function createHealthSchedule(data: HealthScheduleInput) {
  return createHealthSchedulesBulk([data]);
}

/** Toggle the lifecycle status of a schedule (PENDING / COMPLETED / CANCELLED). */
export async function updateHealthScheduleStatus(data: {
  type: HealthScheduleType;
  id: string;
  status: string;
}) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const status: HealthStatus = VALID_STATUSES.includes(data.status as HealthStatus)
    ? (data.status as HealthStatus)
    : "PENDING";

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const model =
        data.type === "VACCINATION"
          ? tx.vaccinationSchedule
          : tx.medicationSchedule;

      const result = await model.updateMany({
        where: { id: data.id, farmId: activeFarmId },
        data: { status },
      });
      if (result.count === 0) throw new Error("Schedule not found");

      revalidatePath("/dashboard/health");
      return { success: true };
    }
  );
}

/** Permanently remove a schedule from the active farm. */
export async function deleteHealthSchedule(data: {
  type: HealthScheduleType;
  id: string;
}) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const model =
        data.type === "VACCINATION"
          ? tx.vaccinationSchedule
          : tx.medicationSchedule;

      const result = await model.deleteMany({
        where: { id: data.id, farmId: activeFarmId },
      });
      if (result.count === 0) throw new Error("Schedule not found");

      revalidatePath("/dashboard/health");
      return { success: true };
    }
  );
}

export interface MissingCostHealthItem {
  id: string;
  itemName: string;
  unit: string;
  stockLevel: number;
  kind: "VACCINE" | "MEDICATION";
}

/**
 * Health stock that has no unit cost yet — typically items a worker added from
 * the health screen. Finance users are prompted to price these.
 */
export async function getHealthItemsMissingCost(): Promise<MissingCostHealthItem[]> {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) return [];

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const items = await tx.inventory.findMany({
        where: {
          farmId: activeFarmId,
          isDeleted: false,
          category: { in: ALL_HEALTH_CATEGORIES },
          costPerUnit: null,
        },
        select: { id: true, itemName: true, unit: true, stockLevel: true, category: true },
        orderBy: { itemName: "asc" },
      });

      return items.map((item: any) => ({
        id: item.id,
        itemName: item.itemName,
        unit: item.unit,
        stockLevel: Number(item.stockLevel),
        kind: VACCINE_CATEGORIES.includes(String(item.category).toUpperCase())
          ? "VACCINE"
          : "MEDICATION",
      }));
    }
  );
}

/**
 * Record the cost of a health stock item. Logs the purchase as an expense so
 * P&L stays accurate, then clears it from the finance prompt.
 */
export async function setHealthItemCost(data: {
  inventoryId: string;
  costPerUnit: number;
}) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) return { success: false, error: "No active farm found" };

  const canEdit = await checkWorkerPermissions("finance", "edit");
  if (!canEdit) {
    return { success: false, error: "Unauthorized: missing finance edit permission" };
  }

  const cost = Number(data.costPerUnit);
  if (!Number.isFinite(cost) || cost < 0) {
    return { success: false, error: "Enter a valid cost" };
  }

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      const item = await tx.inventory.findFirst({
        where: {
          id: data.inventoryId,
          farmId: activeFarmId,
          isDeleted: false,
          category: { in: ALL_HEALTH_CATEGORIES },
        },
        select: { id: true, itemName: true, stockLevel: true, unit: true },
      });
      if (!item) return { success: false, error: "Item not found" };

      await tx.inventory.update({
        where: { id: item.id },
        data: { costPerUnit: cost },
      });

      const stock = Number(item.stockLevel) || 0;
      const total = cost * stock;
      if (total > 0) {
        await tx.expense.create({
          data: {
            farmId: activeFarmId,
            userId,
            amount: total,
            category: "MEDICATION",
            description: `Health stock cost: ${item.itemName} (${stock} ${item.unit})`,
          },
        });
      }

      revalidatePath("/dashboard/finance");
      revalidatePath("/dashboard/inventory");
      return { success: true };
    }
  );
}
