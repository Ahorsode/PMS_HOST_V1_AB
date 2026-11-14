"use server";

import prisma, { readForFarm } from "@/lib/db";
import { getFarmRecord } from "@/lib/farm-record";
import { getAppSettings } from "@/lib/settings/app-settings";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-utils";

export async function updateFarmSettings(data: {
  eggRecordReminderTime?: string;
  feedRecordReminderTime?: string;
  growthTargetStandard?: number;
  defaultEggUnit?: string;
  allowEggUnitChange?: boolean;
  defaultEggSortMode?: string;
  allowEggSortModeChange?: boolean;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  // The currency follows the farm's country (setFarmCountry), never this form.
  delete (data as { currency?: unknown }).currency;

  const settings = await prisma.farmSettings.upsert({
    where: { farmId: activeFarmId },
    update: data,
    create: {
      farmId: activeFarmId,
      ...data,
    },
  });

  revalidatePath("/dashboard/settings");
  return settings;
}

export async function updateReorderLevel(inventoryId: string, reorderLevel: number) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const updated = await prisma.inventory.update({
    where: { id: inventoryId, farmId: activeFarmId },
    data: { reorderLevel },
  });

  revalidatePath("/dashboard/inventory");
  return updated;
}

export async function createVaccinationSchedule(data: {
  livestockId: string;
  vaccineName: string;
  scheduledDate: Date;
  notes?: string;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const schedule = await prisma.vaccinationSchedule.create({
    data: {
      batchId: data.livestockId,
      vaccineName: data.vaccineName,
      scheduledDate: data.scheduledDate,
      notes: data.notes,
      farmId: activeFarmId,
    },
  });

  revalidatePath(`/dashboard/livestock/${data.livestockId}`);
  revalidatePath(`/dashboard/flocks/${data.livestockId}`);
  revalidatePath(`/dashboard/health`);
  return schedule;
}

export async function createMedicationSchedule(data: {
  livestockId: string;
  medicationName: string;
  scheduledDate: Date;
  notes?: string;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const schedule = await prisma.medicationSchedule.create({
    data: {
      batchId: data.livestockId,
      medicationName: data.medicationName,
      scheduledDate: data.scheduledDate,
      notes: data.notes,
      farmId: activeFarmId,
    },
  });

  revalidatePath(`/dashboard/livestock/${data.livestockId}`);
  revalidatePath(`/dashboard/flocks/${data.livestockId}`);
  revalidatePath(`/dashboard/health`);
  return schedule;
}

export async function getFarmSettings() {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) return null;

  // The settings row comes with the farm record, which a page render has
  // usually loaded already (plan access and currency use it too).
  return (await getFarmRecord(activeFarmId))?.settings ?? null;
}

export async function getSalesSettings() {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) return null;

  // Every farm has a row after its first visit, so read it first and only
  // create one (with the admin defaults) when it is missing.
  const existing = await readForFarm(activeFarmId, (db) => db.salesSettings.findUnique({ where: { farmId: activeFarmId } }));
  if (existing) return existing;

  const { salesSettings } = await getAppSettings('farm-defaults');
  return prisma.salesSettings.upsert({
    where: { farmId: activeFarmId },
    update: {},
    create: { farmId: activeFarmId, ...salesSettings },
  });
}

export async function updateSalesSettings(data: {
  allowBatchOverride?: boolean;
  allowWorkerDiscounts?: boolean;
  defaultDiscountType?: string;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const settings = await prisma.salesSettings.upsert({
    where: { farmId: activeFarmId },
    update: data,
    create: {
      farmId: activeFarmId,
      ...data,
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/sales");
  return settings;
}
export async function getGrowthStandards(type?: any) {
  return await prisma.growthStandards.findMany({
    where: type ? { livestockType: type } : {}
  });
}

export async function getMonthlyProductionSummary() {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) return null;

  const thirtyDaysAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);

  const [eggs, expenses, orders, sales] = await readForFarm(activeFarmId, (db) => Promise.all([
    db.eggProduction.aggregate({
      where: { farmId: activeFarmId, logDate: { gte: thirtyDaysAgo } },
      _sum: { eggsCollected: true }
    }),
    db.expense.aggregate({
      where: { farmId: activeFarmId, expenseDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true }
    }),
    db.order.aggregate({
      where: { farmId: activeFarmId, orderDate: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true }
    }),
    db.sale.aggregate({
      where: { farmId: activeFarmId, saleDate: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true }
    })
  ]));

  const totalRevenue = (Number(orders._sum.totalAmount) || 0) + (Number(sales._sum.totalAmount) || 0);

  return {
    eggs: eggs._sum.eggsCollected || 0,
    expenses: Number(expenses._sum.amount) || 0,
    revenue: totalRevenue
  };
}
