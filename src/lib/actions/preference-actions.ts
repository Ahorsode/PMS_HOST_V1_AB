"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-utils";

export async function updateFarmSettings(data: {
  eggRecordReminderTime?: string;
  feedRecordReminderTime?: string;
  currency?: string;
  growthTargetStandard?: number;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

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
      notes: data.notes
    },
  });

  revalidatePath(`/dashboard/livestock/${data.livestockId}`);
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
      notes: data.notes
    },
  });

  revalidatePath(`/dashboard/livestock/${data.livestockId}`);
  return schedule;
}

export async function getFarmSettings() {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) return null;

  return prisma.farmSettings.findUnique({
    where: { farmId: activeFarmId },
  });
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

  const [eggs, expenses, orders, sales] = await Promise.all([
    prisma.eggProduction.aggregate({
      where: { farmId: activeFarmId, logDate: { gte: thirtyDaysAgo } },
      _sum: { eggsCollected: true }
    }),
    prisma.expense.aggregate({
      where: { farmId: activeFarmId, expenseDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true }
    }),
    prisma.order.aggregate({
      where: { farmId: activeFarmId, orderDate: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true }
    }),
    prisma.sale.aggregate({
      where: { farmId: activeFarmId, saleDate: { gte: thirtyDaysAgo } },
      _sum: { totalAmount: true }
    })
  ]);

  const totalRevenue = (Number(orders._sum.totalAmount) || 0) + (Number(sales._sum.totalAmount) || 0);

  return {
    eggs: eggs._sum.eggsCollected || 0,
    expenses: Number(expenses._sum.amount) || 0,
    revenue: totalRevenue
  };
}
