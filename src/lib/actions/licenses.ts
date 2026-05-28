"use server";

import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { normalizeHardwareFingerprint } from "@/lib/license-token";
import { revalidatePath } from "next/cache";

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function serializeLicense(registration: {
  id: string;
  farmId: string;
  deviceName: string | null;
  licenseKey: string | null;
  status: string;
  hardwareId: string | null;
  licenseExpiresAt: Date | null;
  registeredAt: Date;
}) {
  return {
    id: registration.id,
    farmId: registration.farmId,
    deviceName: registration.deviceName,
    licenseKey: registration.licenseKey,
    status: registration.status,
    hardwareId: registration.hardwareId,
    licenseExpiresAt: registration.licenseExpiresAt?.toISOString() ?? null,
    registeredAt: registration.registeredAt.toISOString(),
  };
}

export type DesktopLicenseRow = ReturnType<typeof serializeLicense>;

export type ActivateDesktopTrialResult =
  | {
      success: true;
      license: DesktopLicenseRow;
      expiresAt: string;
    }
  | {
      success: false;
      error: string;
      errorCode?: string;
    };

export async function activateFreeDesktopTrial(input: {
  hardwareId: string;
}): Promise<ActivateDesktopTrialResult> {
  try {
    const { userId, activeFarmId } = await getAuthContext();

    if (!activeFarmId) {
      return { success: false, error: "No active farm selected", errorCode: "NO_ACTIVE_FARM" };
    }

    if (!input.hardwareId || input.hardwareId.trim().length < 6) {
      return { success: false, error: "Enter a valid Desktop Hardware ID", errorCode: "INVALID_HARDWARE_ID" };
    }

    const hardwareId = normalizeHardwareFingerprint(input.hardwareId);

    const existing = await prisma.deviceRegistration.findFirst({
      where: { hardwareId },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: "This device has already consumed an evaluation license.",
        errorCode: "TRIAL_ALREADY_CONSUMED",
      };
    }

    const expiresAt = addDays(new Date(), 30);
    const registration = await prisma.deviceRegistration.create({
      data: {
        farmId: activeFarmId,
        userId,
        hardwareId,
        deviceId: hardwareId,
        deviceName: "HatchLog Desktop Trial",
        deviceType: "Desktop",
        status: "CLOUD_TRIAL",
        licenseExpiresAt: expiresAt,
        isActive: true,
      },
      select: {
        id: true,
        farmId: true,
        deviceName: true,
        licenseKey: true,
        status: true,
        hardwareId: true,
        licenseExpiresAt: true,
        registeredAt: true,
      },
    });

    revalidatePath("/dashboard/settings/desktop-licenses");
    revalidatePath("/admin/payments");

    return {
      success: true,
      license: serializeLicense(registration),
      expiresAt: expiresAt.toISOString(),
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return {
        success: false,
        error: "This device has already consumed an evaluation license.",
        errorCode: "TRIAL_ALREADY_CONSUMED",
      };
    }

    console.error("[activateFreeDesktopTrial]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not activate desktop trial",
    };
  }
}

export async function purchaseDesktopLicenseBundle(terminals: number) {
  try {
    const { userId, activeFarmId } = await getAuthContext();

    if (!activeFarmId) {
      throw new Error("No active farm selected");
    }

    // 1. Verify Farm Status
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { masterLicenseStatus: true }
    });

    if (!farm) {
      throw new Error("Farm not found");
    }

    if (farm.masterLicenseStatus === "PAID_AND_ACTIVE") {
      throw new Error("Farm already has an active license bundle.");
    }

    // 2. Perform Transaction
    await prisma.$transaction(async (tx) => {
      // Update Farm
      await tx.farm.update({
        where: { id: activeFarmId },
        data: { masterLicenseStatus: "PAID_AND_ACTIVE" }
      });

      // Generate keys
      const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();

      const deviceRegistrations = [];
      for (let i = 0; i < terminals; i++) {
        const uniqueLicenseKey = `PMS-${segment()}-${segment()}-${segment()}`;
        deviceRegistrations.push({
          farmId: activeFarmId,
          userId: userId,
          licenseKey: uniqueLicenseKey,
          deviceName: `Terminal ${i + 1}`,
          status: "CLOUD_TRIAL",
          hardwareId: null, // Left empty until claimed
        });
      }

      await tx.deviceRegistration.createMany({
        data: deviceRegistrations
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}

export async function getDesktopLicenses() {
  const { activeFarmId } = await getAuthContext();

  if (!activeFarmId) {
    throw new Error("No active farm selected");
  }

  const licenses = await prisma.deviceRegistration.findMany({
    where: { farmId: activeFarmId },
    select: {
      id: true,
      farmId: true,
      deviceName: true,
      licenseKey: true,
      status: true,
      hardwareId: true,
      licenseExpiresAt: true,
      registeredAt: true,
    },
    orderBy: {
      registeredAt: "asc"
    }
  });

  const isPaid = licenses.some((license) => license.status === "ACTIVE");

  return { isPaid, licenses: licenses.map(serializeLicense) };
}
