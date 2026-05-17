'use server';

import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/auth-utils';

export async function getFarmLicenseStatus() {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' };
  }

  try {
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { master_license_status: true }
    });

    const devices = await prisma.deviceRegistration.findMany({
      where: { farmId: activeFarmId },
      orderBy: { registeredAt: 'desc' }
    });

    return {
      success: true,
      licenseStatus: farm?.master_license_status || 'UNPAID',
      devices: devices.map(d => ({
        id: d.id,
        deviceName: d.deviceName || 'Unnamed Terminal',
        licenseKey: d.licenseKey,
        status: d.status,
        hardwareId: d.hardwareId || null
      }))
    };
  } catch (error) {
    console.error('Error fetching license status:', error);
    return { success: false, error: 'Failed to fetch license settings' };
  }
}

export async function purchaseDesktopLicense() {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' };
  }

  try {
    // 1. Atomic update of FarmProfile table master_license_status
    await prisma.farm.update({
      where: { id: activeFarmId },
      data: { master_license_status: 'PAID_AND_ACTIVE' }
    });

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error('Error upgrading farm license status:', error);
    return { success: false, error: 'Payment processing failed. Try again.' };
  }
}

export async function generateDeviceLicenses(seats: number) {
  const { userId, activeFarmId } = await getAuthContext();
  if (!activeFarmId) {
    return { success: false, error: 'No active farm selected' };
  }

  if (!seats || seats <= 0 || seats > 100) {
    return { success: false, error: 'Please enter a valid seat count between 1 and 100' };
  }

  try {
    // Strict isolation & verification: check active farm is PAID_AND_ACTIVE
    const farm = await prisma.farm.findUnique({
      where: { id: activeFarmId },
      select: { master_license_status: true }
    });

    if (farm?.master_license_status !== 'PAID_AND_ACTIVE') {
      return { success: false, error: 'Your farm profile does not have an active desktop license bundle.' };
    }

    // Key Matrix Loop Generator with Anti-Collision Check
    const generatedKeys: string[] = [];
    const queries = [];

    for (let i = 0; i < seats; i++) {
      let uniqueKey = '';
      let isUnique = false;
      let retries = 0;

      // Loop to guarantee absolute zero-collision
      while (!isUnique && retries < 10) {
        const segment1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const segment3 = Math.random().toString(36).substring(2, 6).toUpperCase();
        uniqueKey = `PMS-${segment1}-${segment2}-${segment3}`;

        // Cross-platform duplication check
        const existing = await prisma.deviceRegistration.findUnique({
          where: { licenseKey: uniqueKey }
        });

        if (!existing && !generatedKeys.includes(uniqueKey)) {
          isUnique = true;
          generatedKeys.push(uniqueKey);
        }
        retries++;
      }

      if (!isUnique) {
        throw new Error('Key generation failed due to token name collision.');
      }

      // Add to transaction batch
      queries.push(
        prisma.deviceRegistration.create({
          data: {
            farmId: activeFarmId,
            userId: userId || undefined,
            licenseKey: uniqueKey,
            status: 'PENDING',
            deviceName: `Terminal ${i + 1}`,
            hardwareId: null
          }
        })
      );
    }

    // Execute atomic prisma transaction batch write
    await prisma.$transaction(queries);

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error) {
    console.error('Error generating device licenses:', error);
    return { success: false, error: 'Failed to complete setup & generate keys.' };
  }
}
