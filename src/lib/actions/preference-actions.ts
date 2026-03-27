"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-utils";

export async function updateFarmSettings(data: {
  eggRecordReminderTime?: string;
  feedRecordReminderTime?: string;
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

export async function updateReorderLevel(inventoryId: number, reorderLevel: number) {
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
  batchId: number;
  vaccineName: string;
  scheduledDate: Date;
  notes?: string;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const schedule = await prisma.vaccinationSchedule.create({
    data,
  });

  revalidatePath(`/dashboard/batches/${data.batchId}`);
  return schedule;
}

export async function createMedicationSchedule(data: {
  batchId: number;
  medicationName: string;
  scheduledDate: Date;
  notes?: string;
}) {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const schedule = await prisma.medicationSchedule.create({
    data,
  });

  revalidatePath(`/dashboard/batches/${data.batchId}`);
  return schedule;
}

export async function getFarmSettings() {
  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId) return null;

  return prisma.farmSettings.findUnique({
    where: { farmId: activeFarmId },
  });
}
