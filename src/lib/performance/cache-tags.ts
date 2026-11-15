import { revalidateTag } from "next/cache";

export const farmCacheTags = {
  dashboard: (farmId: string) => `farm:${farmId}:dashboard`,
  analytics: (farmId: string) => `farm:${farmId}:analytics`,
  reports: (farmId: string) => `farm:${farmId}:reports`,
  inventory: (farmId: string) => `farm:${farmId}:inventory`,
  sales: (farmId: string) => `farm:${farmId}:sales`,
  customers: (farmId: string) => `farm:${farmId}:customers`,
  suppliers: (farmId: string) => `farm:${farmId}:suppliers`,
  feed: (farmId: string) => `farm:${farmId}:feed`,
  feedStatic: (farmId: string) => `farm:${farmId}:feed:static`,
  feedDynamic: (farmId: string) => `farm:${farmId}:feed:dynamic`,
};

/**
 * Expires a cache tag now, so the next read after a save gets fresh data.
 * The "max" profile used before only marked the tag stale: the next read
 * still got the old copy once while it refreshed in the background, so a
 * page opened right after saving could miss the change.
 */
export function expireTag(tag: string) {
  revalidateTag(tag, { expire: 0 });
}

/** Clears every cached view of one farm's data; called after any write to it. */
export function revalidateFarmPerformanceCaches(farmId: string) {
  expireTag(farmCacheTags.dashboard(farmId));
  expireTag(farmCacheTags.analytics(farmId));
  expireTag(farmCacheTags.reports(farmId));
  expireTag(farmCacheTags.inventory(farmId));
  expireTag(farmCacheTags.sales(farmId));
  expireTag(farmCacheTags.customers(farmId));
  expireTag(farmCacheTags.suppliers(farmId));
  // The feed page caches batches, formulations, feed stock and logs.
  expireTag(farmCacheTags.feed(farmId));
  expireTag(farmCacheTags.feedStatic(farmId));
  expireTag(farmCacheTags.feedDynamic(farmId));
}

