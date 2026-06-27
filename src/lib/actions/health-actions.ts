"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-utils";

export type HealthScheduleType = "VACCINATION" | "MEDICATION";

const VALID_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"] as const;
type HealthStatus = (typeof VALID_STATUSES)[number];

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

/**
 * Create a vaccination OR medication schedule. The same form drives both,
 * so we branch on `type` and write to the matching table with the active farm.
 */
export async function createHealthSchedule(data: {
  type: HealthScheduleType;
  batchId: string;
  name: string;
  scheduledDate: string | Date;
  status?: string;
  notes?: string;
}) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) throw new Error("No active farm found");

  const name = data.name?.trim();
  if (!data.batchId) throw new Error("A batch is required");
  if (!name) throw new Error("A name is required");
  if (!data.scheduledDate) throw new Error("A scheduled date is required");

  const status: HealthStatus = VALID_STATUSES.includes(data.status as HealthStatus)
    ? (data.status as HealthStatus)
    : "PENDING";
  const scheduledDate = new Date(data.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error("Invalid scheduled date");
  }

  return await (prisma as any).$withFarmContext(
    userId,
    activeFarmId,
    async (tx: any) => {
      // Make sure the batch actually belongs to this farm before writing.
      const batch = await tx.livestock.findFirst({
        where: { id: data.batchId, farmId: activeFarmId },
        select: { id: true },
      });
      if (!batch) throw new Error("Selected batch was not found on this farm");

      let record;
      if (data.type === "VACCINATION") {
        record = await tx.vaccinationSchedule.create({
          data: {
            batchId: data.batchId,
            vaccineName: name,
            scheduledDate,
            status,
            notes: data.notes?.trim() || null,
            farmId: activeFarmId,
          },
        });
      } else {
        record = await tx.medicationSchedule.create({
          data: {
            batchId: data.batchId,
            medicationName: name,
            scheduledDate,
            status,
            notes: data.notes?.trim() || null,
            farmId: activeFarmId,
          },
        });
      }

      revalidatePath("/dashboard/health");
      revalidatePath(`/dashboard/flocks/${data.batchId}`);
      return serialize(record);
    }
  );
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
