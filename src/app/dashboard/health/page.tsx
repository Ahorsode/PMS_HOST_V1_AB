import React from "react";
import { redirect } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { getHealthSchedules, getHealthInventory } from "@/lib/actions/health-actions";
import { getAllBatches } from "@/lib/actions/dashboard-actions";
import { checkWorkerPermissions } from "@/lib/actions/staff-actions";
import { HealthScheduleManager } from "./HealthScheduleManager";
import { getAuthContext } from "@/lib/auth-utils";
import { checkFeature } from "@/lib/subscription-utils";
import { PlanFeatureLocked } from "@/components/billing/PlanFeatureLocked";

export default async function HealthPage() {
  const hasAccess = await checkWorkerPermissions("health", "view");
  const canEdit = await checkWorkerPermissions("health", "edit");

  if (!hasAccess) {
    redirect("/dashboard/unauthorized");
  }

  const { activeFarmId } = await getAuthContext();
  if (!activeFarmId || !(await checkFeature(activeFarmId, "HEALTH"))) {
    return (
      <PlanFeatureLocked
        feature="HEALTH"
        title="Health"
        accent="Schedules"
        description="Vaccination and medication planning keeps every batch's health schedule in one place."
      />
    );
  }

  const [{ vaccinations, medications }, batches, { vaccine, medicine }] =
    await Promise.all([
      getHealthSchedules(),
      getAllBatches(),
      getHealthInventory(),
    ]);

  const activeBatches = JSON.parse(
    JSON.stringify(batches.filter((b: any) => b.status === "active"))
  );

  const pendingCount =
    vaccinations.filter((v: any) => v.status === "PENDING").length +
    medications.filter((m: any) => m.status === "PENDING").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-0 md:px-3 pt-2 pb-7 md:py-7">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-page p-6 rounded-xl border border-fg/[0.08] gap-4">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-fg">Vaccination and medication</h1>
          <p className="mt-2 text-sm text-fg-2">Plan and track vaccine and medication schedules across your active batches</p>
        </div>
        <div className="bg-card px-5 py-3 rounded-xl border border-fg/[0.08] text-center">
          <p className="text-xs font-medium text-fg">
            Pending
          </p>
          <p className="text-3xl font-medium text-fg">{pendingCount}</p>
        </div>
      </div>

      <HealthScheduleManager
        vaccinations={vaccinations}
        medications={medications}
        activeBatches={activeBatches}
        vaccineInventory={vaccine}
        medicineInventory={medicine}
        canEdit={canEdit}
      />
    </div>
  );
}
