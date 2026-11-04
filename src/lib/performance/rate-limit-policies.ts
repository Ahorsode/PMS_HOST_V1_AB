// Rate limit policy names and their built-in limits. Client-safe so the admin
// System settings page can show them; admins can override limit and window.

export type RateLimitPolicy = {
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  sensitivity: "public" | "authenticated" | "financial" | "admin";
};

export const RATE_LIMIT_POLICY_NAMES = [
  "auth.signup",
  "auth.signin",
  "admin.login",
  "farm.onboarding",
  "farm.profile",
  "team.invite",
  "team.permissions",
  "finance.write",
  "inventory.write",
  "production.write",
  "feed.write",
  "sales.write",
  "orders.write",
  "license.activate",
  "audit.restore",
  "billing.checkout",
  "account.export",
] as const;

export type RateLimitPolicyName = (typeof RATE_LIMIT_POLICY_NAMES)[number];

export const RATE_LIMIT_POLICIES: Record<RateLimitPolicyName, RateLimitPolicy> = {
  "auth.signup": { limit: 8, window: "1 m", sensitivity: "public" },
  "auth.signin": { limit: 10, window: "15 m", sensitivity: "public" },
  "admin.login": { limit: 5, window: "15 m", sensitivity: "admin" },
  "farm.onboarding": { limit: 6, window: "1 m", sensitivity: "authenticated" },
  "farm.profile": { limit: 10, window: "1 m", sensitivity: "authenticated" },
  "team.invite": { limit: 10, window: "1 m", sensitivity: "authenticated" },
  "team.permissions": { limit: 20, window: "1 m", sensitivity: "admin" },
  "finance.write": { limit: 12, window: "1 m", sensitivity: "financial" },
  "inventory.write": { limit: 20, window: "1 m", sensitivity: "authenticated" },
  "production.write": { limit: 24, window: "1 m", sensitivity: "authenticated" },
  "feed.write": { limit: 20, window: "1 m", sensitivity: "authenticated" },
  "sales.write": { limit: 18, window: "1 m", sensitivity: "financial" },
  "orders.write": { limit: 18, window: "1 m", sensitivity: "financial" },
  "license.activate": { limit: 10, window: "1 m", sensitivity: "public" },
  "audit.restore": { limit: 8, window: "1 m", sensitivity: "admin" },
  "billing.checkout": { limit: 10, window: "10 m", sensitivity: "financial" },
  "account.export": { limit: 3, window: "10 m", sensitivity: "authenticated" },
};

export const RATE_LIMIT_POLICY_LABELS: Record<RateLimitPolicyName, string> = {
  "auth.signup": "Sign-ups",
  "auth.signin": "Farm logins",
  "admin.login": "Admin logins",
  "farm.onboarding": "Farm setup",
  "farm.profile": "Farm profile edits",
  "team.invite": "Staff invites",
  "team.permissions": "Staff permission changes",
  "finance.write": "Finance entries",
  "inventory.write": "Inventory entries",
  "production.write": "Production logging",
  "feed.write": "Feed entries",
  "sales.write": "Sales",
  "orders.write": "Orders",
  "license.activate": "Desktop license activation",
  "audit.restore": "Restoring deleted records",
  "billing.checkout": "Paystack checkouts",
  "account.export": "Account data exports",
};

/** "15 m" -> 15 minutes, "1 h" -> 60. */
export function windowToMinutes(window: RateLimitPolicy["window"]) {
  const [amount, unit] = window.split(" ") as [string, "s" | "m" | "h" | "d"];
  const minutes = { s: 1 / 60, m: 1, h: 60, d: 1440 }[unit];
  return Math.max(1, Math.round(Number(amount) * minutes));
}
