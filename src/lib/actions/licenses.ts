"use server";

import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";

function serializeLicense(registration: {
  id: string;
  farmId: string;
  status: string;
  hardwareId: string | null;
  licenseExpiresAt: Date | null;
  lastSync: Date | null;
}) {
  return {
    id: registration.id,
    farmId: registration.farmId,
    status: registration.status,
    hardwareId: registration.hardwareId,
    licenseExpiresAt: registration.licenseExpiresAt?.toISOString() ?? null,
    lastSync: registration.lastSync?.toISOString() ?? null,
  };
}

export type DesktopLicenseRow = ReturnType<typeof serializeLicense>;

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
      status: true,
      hardwareId: true,
      licenseExpiresAt: true,
      lastSync: true,
    },
    orderBy: {
      lastSync: "desc"
    }
  });

  const isPaid = licenses.some((license) => license.status === "ACTIVE");

  return { isPaid, licenses: licenses.map(serializeLicense) };
}
