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
    // In Dev Mode, we just update the tier directly.
    // In production, this would be preceded by a successful payment verification.
    await prisma.farm.update({
      where: { id: activeFarmId },
      data: { 
        subscriptionTier: tier,
      }
    });

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/settings");
    
    return { success: true };
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    return { success: false, error: "Failed to process upgrade" };
  }
}
