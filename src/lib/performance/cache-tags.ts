import { revalidateTag } from "next/cache";

export const farmCacheTags = {
  dashboard: (farmId: string) => `farm:${farmId}:dashboard`,
  analytics: (farmId: string) => `farm:${farmId}:analytics`,
  reports: (farmId: string) => `farm:${farmId}:reports`,
};

export function revalidateFarmPerformanceCaches(farmId: string) {
  revalidateTag(farmCacheTags.dashboard(farmId));
  revalidateTag(farmCacheTags.analytics(farmId));
  revalidateTag(farmCacheTags.reports(farmId));
}

