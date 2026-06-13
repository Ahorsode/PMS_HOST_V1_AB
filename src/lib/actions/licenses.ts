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
