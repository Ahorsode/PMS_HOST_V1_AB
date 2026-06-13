"use server";

import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

import { SubscriptionTier } from "@prisma/client";

export async function upgradeFarmSubscription(tier: SubscriptionTier) {
  const { userId, activeFarmId } = await getAuthContext();

  if (!activeFarmId) {
    return { success: false, error: "No active farm selected" };
  }

  try {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);

    await prisma.$transaction(async (tx) => {
      await tx.farm.update({
        where: { id: activeFarmId },
        data: { subscriptionTier: tier },
      });

      await tx.deviceRegistration.updateMany({
        where: { farmId: activeFarmId },
        data: {
          status: "ACTIVE",
          licenseExpiresAt: periodEnd,
          lastPaymentAt: now,
          isActive: true,
        },
      });

      await tx.subscriptionEvent.create({
        data: {
          farmId: activeFarmId,
          userId,
          eventType: "PAYMENT_SUCCEEDED",
          metadata: { tier, periodEnd: periodEnd.toISOString() },
        },
      });
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/desktop-licenses");

    return { success: true };
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    return { success: false, error: "Failed to process upgrade" };
  }
}
